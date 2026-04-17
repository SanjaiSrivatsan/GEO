"""
Reasoning Decoder Service
=========================
The moat layer. For every non-mention:
  - Analyze missing reinforcement signals
  - Map root cause
  - Suggest reinforcement class
Also computes drift between entity versions and simulation runs.
"""
import json
import uuid
from datetime import datetime
from decimal import Decimal
from typing import List, Dict, Any, Optional

from sqlalchemy.orm import Session
from loguru import logger

from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate

from app.config import settings
from app.models.reasoning_analysis import ReasoningAnalysis, ReinforcementClass
from app.models.simulation_run import SimulationRun
from app.models.canonical_entity import CanonicalEntity
from app.models.business_profile import BusinessProfile


REINFORCEMENT_CLASSES = [e.value for e in ReinforcementClass]


class ReasoningDecoderService:
    """Analyzes non-mentions and computes drift."""

    def __init__(self, db: Session):
        self.db = db
        if settings.GROQ_API_KEY:
            self.llm = ChatGroq(
                model=settings.GROQ_MODEL,
                temperature=0.2,
                groq_api_key=settings.GROQ_API_KEY,
                max_tokens=1200,
            )
        else:
            self.llm = None

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def get_analyses(self, business_profile_id: str) -> List[ReasoningAnalysis]:
        """Get stored reasoning analyses for a business."""
        return (
            self.db.query(ReasoningAnalysis)
            .filter(ReasoningAnalysis.business_profile_id == business_profile_id)
            .order_by(ReasoningAnalysis.analyzed_at.desc())
            .all()
        )

    def analyze_non_mentions(
        self, business_profile_id: str, simulation_run_id: str,
    ) -> List[Dict[str, Any]]:
        """
        For each prompt where the business was NOT mentioned in a simulation run,
        analyze the root cause and classify into a reinforcement class.
        """
        logger.info(f"Analyzing non-mentions for run {simulation_run_id}")

        run = self.db.query(SimulationRun).filter(SimulationRun.id == simulation_run_id).first()
        if not run:
            raise ValueError(f"Simulation run {simulation_run_id} not found")

        entity = (
            self.db.query(CanonicalEntity)
            .filter(CanonicalEntity.business_profile_id == business_profile_id)
            .first()
        )

        business = self.db.query(BusinessProfile).filter(
            BusinessProfile.id == business_profile_id
        ).first()
        if not business:
            raise ValueError(f"Business profile {business_profile_id} not found")

        # Find non-mentioned prompts from the snapshot
        snapshot = run.prompt_results_snapshot or []
        non_mentions = [r for r in snapshot if not r.get("mentioned", True)]

        if not non_mentions:
            logger.info("No non-mentions found in this simulation run")
            return []

        # Clear old analyses for this run
        self.db.query(ReasoningAnalysis).filter(
            ReasoningAnalysis.simulation_run_id == simulation_run_id,
        ).delete(synchronize_session="fetch")
        self.db.flush()

        analyses = []
        for nm in non_mentions:
            analysis = self._analyze_single(nm, entity, business, simulation_run_id)
            if analysis:
                self.db.add(analysis)
                analyses.append(analysis)

        self.db.commit()
        logger.info(f"Created {len(analyses)} reasoning analyses for run {simulation_run_id}")
        return [a.to_dict() for a in analyses]

    def compute_drift(self, business_profile_id: str) -> Dict[str, Any]:
        """
        Compute drift between entity versions and simulation runs.
        Returns a drift report with alerts.
        """
        # Get simulation runs (last 2+)
        runs = (
            self.db.query(SimulationRun)
            .filter(SimulationRun.business_profile_id == business_profile_id)
            .order_by(SimulationRun.created_at.desc())
            .limit(5)
            .all()
        )

        entity = (
            self.db.query(CanonicalEntity)
            .filter(CanonicalEntity.business_profile_id == business_profile_id)
            .first()
        )

        report: Dict[str, Any] = {
            "has_drift": False,
            "alerts": [],
            "entity_version": entity.version if entity else None,
            "simulation_runs_compared": len(runs),
            "mention_rate_trend": [],
            "confidence_trend": [],
        }

        if len(runs) < 2:
            report["alerts"].append({
                "type": "info",
                "message": "Need at least 2 simulation runs to detect drift.",
            })
            return report

        # Compare most recent runs
        latest = runs[0]
        previous = runs[1]

        latest_rate = (latest.mentioned_count / latest.total_prompts * 100) if latest.total_prompts else 0
        prev_rate = (previous.mentioned_count / previous.total_prompts * 100) if previous.total_prompts else 0
        rate_delta = latest_rate - prev_rate

        latest_conf = float(latest.avg_confidence) if latest.avg_confidence else 0
        prev_conf = float(previous.avg_confidence) if previous.avg_confidence else 0
        conf_delta = latest_conf - prev_conf

        report["mention_rate_trend"] = [
            {"run_id": r.id, "rate": (r.mentioned_count / r.total_prompts * 100) if r.total_prompts else 0,
             "date": r.created_at.isoformat() if r.created_at else None}
            for r in reversed(runs)
        ]
        report["confidence_trend"] = [
            {"run_id": r.id, "confidence": float(r.avg_confidence) if r.avg_confidence else 0,
             "date": r.created_at.isoformat() if r.created_at else None}
            for r in reversed(runs)
        ]

        # Detect significant changes
        if abs(rate_delta) > 10:
            report["has_drift"] = True
            direction = "improved" if rate_delta > 0 else "declined"
            report["alerts"].append({
                "type": "warning" if rate_delta < 0 else "success",
                "message": f"Mention rate {direction} by {abs(rate_delta):.1f}% ({prev_rate:.1f}% → {latest_rate:.1f}%)",
                "delta": rate_delta,
            })

        if abs(conf_delta) > 0.1:
            report["has_drift"] = True
            direction = "improved" if conf_delta > 0 else "declined"
            report["alerts"].append({
                "type": "warning" if conf_delta < 0 else "success",
                "message": f"Average confidence {direction} by {abs(conf_delta):.3f} ({prev_conf:.3f} → {latest_conf:.3f})",
                "delta": conf_delta,
            })

        # Check for new non-mentions (prompts that were mentioned before but not now)
        latest_snapshot = {r["prompt_id"]: r for r in (latest.prompt_results_snapshot or [])}
        prev_snapshot = {r["prompt_id"]: r for r in (previous.prompt_results_snapshot or [])}

        new_non_mentions = []
        recovered_mentions = []
        for pid, prev_r in prev_snapshot.items():
            lat_r = latest_snapshot.get(pid)
            if lat_r:
                if prev_r.get("mentioned") and not lat_r.get("mentioned"):
                    new_non_mentions.append(pid)
                elif not prev_r.get("mentioned") and lat_r.get("mentioned"):
                    recovered_mentions.append(pid)

        if new_non_mentions:
            report["has_drift"] = True
            report["alerts"].append({
                "type": "warning",
                "message": f"{len(new_non_mentions)} prompts lost mentions: {', '.join(new_non_mentions[:5])}",
                "prompts": new_non_mentions,
            })

        if recovered_mentions:
            report["alerts"].append({
                "type": "success",
                "message": f"{len(recovered_mentions)} prompts gained mentions: {', '.join(recovered_mentions[:5])}",
                "prompts": recovered_mentions,
            })

        if not report["alerts"]:
            report["alerts"].append({
                "type": "info",
                "message": "No significant drift detected between runs.",
            })

        return report

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _analyze_single(
        self, non_mention: Dict[str, Any], entity: Optional[CanonicalEntity],
        business: BusinessProfile, simulation_run_id: str,
    ) -> Optional[ReasoningAnalysis]:
        """Analyze a single non-mention using LLM or heuristic fallback."""
        prompt_id = non_mention.get("prompt_id", "unknown")

        if self.llm and entity:
            analysis_data = self._llm_analyze(non_mention, entity, business)
        else:
            analysis_data = self._heuristic_analyze(non_mention, entity, business)

        if not analysis_data:
            return None

        # Map reinforcement class
        rc_str = analysis_data.get("reinforcement_class", "content_gap")
        try:
            rc = ReinforcementClass(rc_str)
        except ValueError:
            rc = ReinforcementClass.CONTENT_GAP

        return ReasoningAnalysis(
            id=str(uuid.uuid4()),
            business_profile_id=str(business.id),
            simulation_run_id=simulation_run_id,
            prompt_id=prompt_id,
            root_cause=analysis_data.get("root_cause", "Unable to determine root cause"),
            missing_signals=analysis_data.get("missing_signals", []),
            reinforcement_class=rc,
            suggested_actions=analysis_data.get("suggested_actions", []),
            confidence=Decimal(str(round(analysis_data.get("confidence", 0.5), 3))),
            analyzed_at=datetime.utcnow(),
        )

    def _llm_analyze(
        self, non_mention: Dict[str, Any], entity: CanonicalEntity, business: BusinessProfile,
    ) -> Optional[Dict[str, Any]]:
        """Use LLM to analyze why the business was not mentioned."""
        prompt = ChatPromptTemplate.from_messages([
            ("system", (
                "You are an AI visibility analyst. Analyze why a business was not mentioned "
                "in response to a prompt. Return ONLY valid JSON."
            )),
            ("human", """A business was NOT mentioned when an AI was asked the following question.

Business: {business_name} ({category})
Location: {location}
Services: {services}

Prompt that was asked: {prompt_title} (category: {prompt_category})

Analyze why this business was not mentioned and classify the root cause.

Return JSON with:
- "root_cause": string (1-2 sentence explanation)
- "missing_signals": array of {{"signal_type": str, "description": str, "severity": "high"|"medium"|"low"}}
- "reinforcement_class": one of {classes}
- "suggested_actions": array of strings (2-4 concrete actions)
- "confidence": float 0.0-1.0"""),
        ])

        try:
            chain = prompt | self.llm
            result = chain.invoke({
                "business_name": business.name,
                "category": entity.primary_category,
                "location": (entity.geo_scope or {}).get("primary_location", business.primary_location),
                "services": ", ".join(
                    s.get("name", "") if isinstance(s, dict) else str(s)
                    for s in (entity.services or [])[:5]
                ),
                "prompt_title": non_mention.get("title", non_mention.get("prompt_id", "")),
                "prompt_category": non_mention.get("category", ""),
                "classes": json.dumps(REINFORCEMENT_CLASSES),
            })
            text = result.content if hasattr(result, "content") else str(result)
            return self._parse_json(text)
        except Exception as e:
            logger.warning(f"LLM analysis failed for {non_mention.get('prompt_id')}: {e}")
            return self._heuristic_analyze(non_mention, entity, business)

    def _heuristic_analyze(
        self, non_mention: Dict[str, Any], entity: Optional[CanonicalEntity], business: BusinessProfile,
    ) -> Dict[str, Any]:
        """Fallback heuristic analysis without LLM."""
        category = non_mention.get("category", "")
        prompt_id = non_mention.get("prompt_id", "")

        # Map prompt category to likely reinforcement class
        category_map = {
            "entity_definition": "content_gap",
            "category_visibility": "relevance_gap",
            "trust_reviews": "authority_gap",
            "comparison_alternatives": "visibility_gap",
            "local_discovery": "geographic_gap",
        }
        rc = category_map.get(category, "content_gap")

        return {
            "root_cause": f"Business lacks sufficient signals in the '{category}' domain for prompt '{prompt_id}'.",
            "missing_signals": [
                {"signal_type": category or "general", "description": "Insufficient content or web signals", "severity": "medium"},
            ],
            "reinforcement_class": rc,
            "suggested_actions": [
                "Increase web presence and content for this topic area",
                "Add more structured data and schema markup",
                "Get more mentions from authoritative sources",
            ],
            "confidence": 0.4,
        }

    def _parse_json(self, text: str) -> Optional[Dict]:
        """Parse JSON from LLM response."""
        import re
        if not text:
            return None
        m = re.search(r'```(?:json)?\s*\n?([\s\S]*?)\n?```', text)
        if m:
            text = m.group(1)
        text = text.strip()
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            try:
                import json_repair
                return json_repair.loads(text)
            except Exception:
                return None
