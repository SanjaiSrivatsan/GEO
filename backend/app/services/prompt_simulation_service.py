"""
Prompt Simulation Service
=========================
Runs batch prompt simulations with mention detection.
Extends the existing GeoPromptExecutorService with simulation tracking.
"""
import json
import time
import uuid
from datetime import datetime
from decimal import Decimal
from typing import List, Dict, Any, Optional

from sqlalchemy.orm import Session
from loguru import logger

from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate

from app.config import settings
from app.models.simulation_run import SimulationRun
from app.models.geo_prompt import GeoPrompt, GeoPromptResult, ExecutionStatus
from app.models.business_profile import BusinessProfile
from app.services.geo_prompt_executor import GeoPromptExecutorService


class PromptSimulationService:
    """Runs prompt simulations with mention detection and tracking."""

    def __init__(self, db: Session):
        self.db = db
        self.executor = None
        if settings.GROQ_API_KEY:
            self.executor = GeoPromptExecutorService(db, settings.GROQ_API_KEY)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def get_simulation_runs(self, business_profile_id: str) -> List[SimulationRun]:
        """Get all simulation runs for a business, newest first."""
        return (
            self.db.query(SimulationRun)
            .filter(SimulationRun.business_profile_id == business_profile_id)
            .order_by(SimulationRun.created_at.desc())
            .all()
        )

    def get_simulation_run(self, run_id: str) -> Optional[SimulationRun]:
        """Get a single simulation run by ID."""
        return self.db.query(SimulationRun).filter(SimulationRun.id == run_id).first()

    def run_simulation(
        self,
        business_profile_id: str,
        user_id: str,
        prompt_ids: Optional[List[str]] = None,
        config: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Run a prompt simulation with mention detection.

        1. Load prompts (all or selected)
        2. Execute each prompt
        3. Check if business name appears in response
        4. Track per-prompt results
        5. Store simulation run record
        """
        if not self.executor:
            raise ValueError("GROQ_API_KEY not configured. Cannot run simulation.")

        business = self.db.query(BusinessProfile).filter(
            BusinessProfile.id == business_profile_id
        ).first()
        if not business:
            raise ValueError(f"Business profile {business_profile_id} not found")

        logger.info(f"Starting simulation for {business.name}")
        start_time = time.time()

        # Determine run type
        run_type = "full"
        if prompt_ids:
            run_type = "selective"

        # Create run record
        run = SimulationRun(
            id=str(uuid.uuid4()),
            business_profile_id=business_profile_id,
            user_id=user_id,
            run_type=run_type,
            config_overrides=config,
        )

        # Load prompts
        prompts = self._load_prompts(prompt_ids)
        if not prompts:
            raise ValueError("No active prompts found for simulation.")

        # Assemble business context
        context = self.executor.assemble_business_context(business_profile_id)
        business_name = business.name.lower()

        # Execute and track
        results_snapshot = []
        mentioned_count = 0
        not_mentioned_count = 0
        total_confidence = 0.0
        confidence_count = 0

        for prompt in prompts:
            prompt_start = time.time()
            result = self._execute_and_detect(prompt, context, business_name)
            prompt_duration = int((time.time() - prompt_start) * 1000)

            result["duration_ms"] = prompt_duration
            results_snapshot.append(result)

            if result["mentioned"]:
                mentioned_count += 1
            else:
                not_mentioned_count += 1

            if result["confidence"] is not None:
                total_confidence += result["confidence"]
                confidence_count += 1

        # Finalize run
        total_duration = int((time.time() - start_time) * 1000)
        avg_confidence = total_confidence / confidence_count if confidence_count > 0 else 0.0

        run.total_prompts = len(prompts)
        run.mentioned_count = mentioned_count
        run.not_mentioned_count = not_mentioned_count
        run.avg_confidence = Decimal(str(round(avg_confidence, 3)))
        run.total_duration_ms = total_duration
        run.prompt_results_snapshot = results_snapshot
        run.completed_at = datetime.utcnow()

        self.db.add(run)
        self.db.commit()
        self.db.refresh(run)

        logger.info(
            f"Simulation complete for {business.name}: "
            f"{mentioned_count}/{len(prompts)} mentioned, "
            f"avg confidence {avg_confidence:.3f}"
        )

        return run.to_dict()

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _load_prompts(self, prompt_ids: Optional[List[str]] = None) -> List[GeoPrompt]:
        """Load prompts for simulation."""
        q = self.db.query(GeoPrompt).filter(GeoPrompt.is_active == "true")
        if prompt_ids:
            q = q.filter(GeoPrompt.prompt_id.in_(prompt_ids))
        return q.order_by(GeoPrompt.execution_order).all()

    def _execute_and_detect(
        self, prompt: GeoPrompt, context: Dict[str, Any], business_name: str,
    ) -> Dict[str, Any]:
        """Execute a single prompt and detect if the business is mentioned."""
        result = {
            "prompt_id": prompt.prompt_id,
            "title": prompt.title,
            "category": prompt.category.value if prompt.category else "",
            "mentioned": False,
            "confidence": None,
            "mention_context": None,
            "duration_ms": 0,
            "status": "failed",
        }

        try:
            # Format context for this prompt's category
            category_str = prompt.category.value if prompt.category else "entity_definition"
            formatted_context = self.executor.format_context_for_prompt(context, category_str)

            # Build a simulation-specific prompt that asks the LLM to recommend businesses
            sim_prompt = ChatPromptTemplate.from_messages([
                ("system", (
                    "You are an AI assistant helping users find businesses. "
                    "Based on the available information, recommend relevant businesses. "
                    "Be specific and name actual businesses when you have evidence."
                )),
                ("human", (
                    "Context about available businesses:\n{context}\n\n"
                    "User question: {question}\n\n"
                    "Please provide a helpful recommendation. Name specific businesses "
                    "if you have evidence they are relevant."
                )),
            ])

            chain = sim_prompt | self.executor.llm
            llm_result = chain.invoke({
                "context": formatted_context[:4000],
                "question": prompt.prompt_text,
            })

            response_text = llm_result.content if hasattr(llm_result, "content") else str(llm_result)

            # Detect mention
            response_lower = response_text.lower()
            mentioned = business_name in response_lower

            # Also check partial name matches (e.g., "Sanjai's Bakery" → "sanjai")
            name_parts = [p for p in business_name.split() if len(p) > 3]
            if not mentioned and name_parts:
                mentioned = any(part in response_lower for part in name_parts)

            # Calculate confidence from existing prompt results
            existing_result = (
                self.db.query(GeoPromptResult)
                .filter(
                    GeoPromptResult.business_profile_id == context["business_metadata"]["id"],
                    GeoPromptResult.execution_status == ExecutionStatus.COMPLETED,
                )
                .join(GeoPrompt, GeoPromptResult.prompt_id == GeoPrompt.id)
                .filter(GeoPrompt.prompt_id == prompt.prompt_id)
                .first()
            )
            confidence = float(existing_result.confidence_score) if existing_result and existing_result.confidence_score else 0.5

            result["mentioned"] = mentioned
            result["confidence"] = confidence
            result["mention_context"] = response_text[:500] if mentioned else None
            result["status"] = "completed"

        except Exception as e:
            logger.error(f"Simulation prompt {prompt.prompt_id} failed: {e}")
            result["status"] = "failed"

        return result
