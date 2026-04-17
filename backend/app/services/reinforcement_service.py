"""
Reinforcement Service
=====================
Translates detected gaps into concrete action tasks.
Bridges detection → execution.
"""
import json
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional

from sqlalchemy.orm import Session
from loguru import logger

from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate

from app.config import settings
from app.models.canonical_entity import CanonicalEntity
from app.models.gap_issue import GapIssue, GapType, GapSeverity, GapStatus
from app.models.reinforcement_task import ReinforcementTask, TaskImpact, TaskStatus


# Hardcoded gap-to-action patterns (LLM enhances these)
GAP_ACTION_TEMPLATES: Dict[str, List[Dict[str, str]]] = {
    GapType.CATEGORY_MISMATCH.value: [
        {"action_type": "update_homepage_copy", "title": "Update homepage to reinforce primary category", "impact": "high"},
        {"action_type": "align_meta_tags", "title": "Align title tags and meta descriptions with category", "impact": "high"},
        {"action_type": "add_category_content", "title": "Add category-reinforcing content to key pages", "impact": "medium"},
    ],
    GapType.SERVICE_DRIFT.value: [
        {"action_type": "add_service_page", "title": "Create dedicated pages for missing services", "impact": "high"},
        {"action_type": "update_service_descriptions", "title": "Update service descriptions on existing pages", "impact": "medium"},
        {"action_type": "remove_stale_services", "title": "Remove or archive outdated service references", "impact": "low"},
    ],
    GapType.VERTICAL_ABSENCE.value: [
        {"action_type": "add_vertical_page", "title": "Create industry-specific landing pages", "impact": "high"},
        {"action_type": "add_vertical_faqs", "title": "Add industry-specific FAQ sections", "impact": "medium"},
        {"action_type": "add_case_studies", "title": "Add vertical-specific case studies or testimonials", "impact": "medium"},
    ],
    GapType.MISSING_FAQ.value: [
        {"action_type": "create_faq_page", "title": "Create a dedicated FAQ page", "impact": "high"},
        {"action_type": "add_faq_schema", "title": "Add FAQ schema markup (FAQPage structured data)", "impact": "high"},
        {"action_type": "add_category_questions", "title": "Add category-specific Q&A sections", "impact": "medium"},
    ],
    GapType.WEAK_GEO_BINDING.value: [
        {"action_type": "add_location_to_titles", "title": "Add primary location to page title tags", "impact": "high"},
        {"action_type": "add_local_schema", "title": "Add LocalBusiness schema.org markup", "impact": "high"},
        {"action_type": "create_location_page", "title": "Create a location/service-area page", "impact": "medium"},
        {"action_type": "bind_service_to_location", "title": "Add location context to service descriptions", "impact": "medium"},
    ],
    GapType.INCONSISTENT_VOCABULARY.value: [
        {"action_type": "standardize_terms", "title": "Standardize terminology across all pages", "impact": "medium"},
        {"action_type": "update_headings", "title": "Update headings to use canonical terms", "impact": "medium"},
    ],
}


class ReinforcementService:
    """Generates reinforcement action plans from detected gaps."""

    def __init__(self, db: Session):
        self.db = db
        if settings.GROQ_API_KEY:
            self.llm = ChatGroq(
                model=settings.GROQ_MODEL,
                temperature=0.2,
                groq_api_key=settings.GROQ_API_KEY,
                max_tokens=1500,
            )
        else:
            self.llm = None

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def get_tasks(
        self,
        business_profile_id: str,
        status_filter: Optional[str] = None,
        impact_filter: Optional[str] = None,
    ) -> List[ReinforcementTask]:
        """Get stored reinforcement tasks with optional filters."""
        q = self.db.query(ReinforcementTask).filter(
            ReinforcementTask.business_profile_id == business_profile_id
        )
        if status_filter:
            q = q.filter(ReinforcementTask.status == status_filter)
        if impact_filter:
            q = q.filter(ReinforcementTask.impact == impact_filter)
        return q.order_by(ReinforcementTask.priority_order).all()

    def update_task_status(self, task_id: str, new_status: str) -> ReinforcementTask:
        """Update a task's status."""
        task = self.db.query(ReinforcementTask).filter(ReinforcementTask.id == task_id).first()
        if not task:
            raise ValueError(f"Task {task_id} not found")
        task.status = TaskStatus(new_status)
        self.db.commit()
        self.db.refresh(task)
        return task

    def generate_reinforcement_plan(self, business_profile_id: str) -> List[Dict[str, Any]]:
        """
        Generate reinforcement tasks for all ACTIVE gaps.
        1. Load canonical entity + active gap issues
        2. For each gap, generate structured action tasks
        3. Priority order: CRITICAL gaps → HIGH impact first
        4. Store tasks in DB
        """
        logger.info(f"Generating reinforcement plan for {business_profile_id}")

        entity = (
            self.db.query(CanonicalEntity)
            .filter(CanonicalEntity.business_profile_id == business_profile_id)
            .first()
        )
        if not entity:
            raise ValueError("Canonical entity not built yet.")

        gaps = (
            self.db.query(GapIssue)
            .filter(
                GapIssue.business_profile_id == business_profile_id,
                GapIssue.status == GapStatus.ACTIVE,
            )
            .all()
        )
        if not gaps:
            raise ValueError("No active gaps found. Run gap detection first.")

        # Clear existing PENDING tasks for this business (keep completed/in-progress)
        self.db.query(ReinforcementTask).filter(
            ReinforcementTask.business_profile_id == business_profile_id,
            ReinforcementTask.status == TaskStatus.PENDING,
        ).delete(synchronize_session="fetch")
        self.db.flush()

        all_tasks: List[ReinforcementTask] = []
        priority = 0

        # Sort gaps by severity (critical first)
        severity_order = {
            GapSeverity.CRITICAL: 0, GapSeverity.HIGH: 1,
            GapSeverity.MEDIUM: 2, GapSeverity.LOW: 3,
        }
        gaps.sort(key=lambda g: severity_order.get(g.severity, 4))

        for gap in gaps:
            tasks = self._generate_tasks_for_gap(gap, entity, priority)
            all_tasks.extend(tasks)
            priority += len(tasks)

        for task in all_tasks:
            self.db.add(task)
        self.db.commit()

        logger.info(f"Generated {len(all_tasks)} reinforcement tasks for {business_profile_id}")
        return [self._task_to_dict(t) for t in all_tasks]

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _generate_tasks_for_gap(
        self, gap: GapIssue, entity: CanonicalEntity, base_priority: int,
    ) -> List[ReinforcementTask]:
        """Generate tasks for a single gap using templates + optional LLM enhancement."""
        gap_type_val = gap.gap_type.value if isinstance(gap.gap_type, GapType) else str(gap.gap_type)
        templates = GAP_ACTION_TEMPLATES.get(gap_type_val, [])

        # Try LLM enhancement for richer implementation hints
        hints = self._llm_enhance(gap, entity) if self.llm else {}

        tasks = []
        for idx, tmpl in enumerate(templates):
            impact_str = tmpl.get("impact", "medium")
            try:
                impact = TaskImpact(impact_str)
            except ValueError:
                impact = TaskImpact.MEDIUM

            hint = hints.get(tmpl["action_type"], "")
            if not hint:
                hint = self._default_hint(tmpl["action_type"], gap, entity)

            task = ReinforcementTask(
                id=str(uuid.uuid4()),
                gap_issue_id=gap.id,
                business_profile_id=gap.business_profile_id,
                action_type=tmpl["action_type"],
                title=tmpl["title"],
                description=f"Action to address: {gap.title}",
                implementation_hint=hint,
                impact=impact,
                priority_order=base_priority + idx,
                status=TaskStatus.PENDING,
            )
            tasks.append(task)

        return tasks

    def _llm_enhance(self, gap: GapIssue, entity: CanonicalEntity) -> Dict[str, str]:
        """Use LLM to generate implementation hints for each action type."""
        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a web optimization expert. Return ONLY valid JSON."),
            ("human", """Given this gap issue and business context, provide specific implementation hints.

Gap: {gap_title}
Description: {gap_description}
Evidence: {evidence}
Business Category: {category}
Business Location: {location}

Return JSON mapping action_type → implementation_hint (1-2 sentences each):
{action_types}"""),
        ])

        gap_type_val = gap.gap_type.value if isinstance(gap.gap_type, GapType) else str(gap.gap_type)
        templates = GAP_ACTION_TEMPLATES.get(gap_type_val, [])
        action_types = json.dumps([t["action_type"] for t in templates])

        try:
            chain = prompt | self.llm
            result = chain.invoke({
                "gap_title": gap.title,
                "gap_description": gap.description,
                "evidence": json.dumps(gap.evidence or {}, default=str)[:1000],
                "category": entity.primary_category,
                "location": (entity.geo_scope or {}).get("primary_location", ""),
                "action_types": action_types,
            })
            text = result.content if hasattr(result, "content") else str(result)
            return self._parse_json(text) or {}
        except Exception as e:
            logger.warning(f"LLM enhancement failed: {e}")
            return {}

    def _default_hint(self, action_type: str, gap: GapIssue, entity: CanonicalEntity) -> str:
        """Fallback hints when LLM is unavailable."""
        hints = {
            "update_homepage_copy": f"Update the homepage to clearly mention '{entity.primary_category}' in the first paragraph and H1 heading.",
            "align_meta_tags": f"Set title tag to include '{entity.primary_category}' and location. Update meta description similarly.",
            "add_service_page": "Create a dedicated page for each missing service with detailed descriptions and relevant keywords.",
            "create_faq_page": "Create a /faq page with at least 10 common questions. Add FAQPage schema markup.",
            "add_faq_schema": "Add JSON-LD FAQPage schema markup to the FAQ page for rich snippet eligibility.",
            "add_local_schema": "Add JSON-LD LocalBusiness schema with name, address, phone, geo coordinates, and opening hours.",
            "add_location_to_titles": f"Include '{(entity.geo_scope or {}).get('primary_location', 'your city')}' in the title tag of key pages.",
            "standardize_terms": "Audit all pages and replace variant terms with the canonical approved terminology.",
        }
        return hints.get(action_type, f"Take action to address: {gap.title}")

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

    def _task_to_dict(self, task: ReinforcementTask) -> Dict[str, Any]:
        """Convert ReinforcementTask to dict."""
        return {
            "id": task.id,
            "gap_issue_id": task.gap_issue_id,
            "business_profile_id": task.business_profile_id,
            "action_type": task.action_type,
            "title": task.title,
            "description": task.description,
            "implementation_hint": task.implementation_hint,
            "impact": task.impact.value if task.impact else None,
            "priority_order": task.priority_order,
            "status": task.status.value if task.status else None,
            "created_at": task.created_at.isoformat() if task.created_at else None,
        }
