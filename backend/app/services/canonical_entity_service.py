"""
Canonical Entity Service
========================
Builds the CanonicalEntity — the backbone of the intelligence engine.
Synthesizes data from prompt results into a single structured view of the business.
"""
import json
import uuid
from collections import Counter
from datetime import datetime
from typing import Dict, Any, Optional, List

from sqlalchemy.orm import Session
from loguru import logger

from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate

from app.config import settings
from app.models.canonical_entity import CanonicalEntity
from app.models.geo_prompt import GeoPromptResult, ExecutionStatus
from app.models.business_profile import BusinessProfile
from app.models.website_content import WebsiteContent


class CanonicalEntityService:
    """Builds and manages the canonical entity representation."""

    def __init__(self, db: Session):
        self.db = db
        if settings.GROQ_API_KEY:
            self.llm = ChatGroq(
                model=settings.GROQ_MODEL,
                temperature=0.15,
                groq_api_key=settings.GROQ_API_KEY,
                max_tokens=2000,
            )
        else:
            self.llm = None

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def get_canonical_entity(self, business_profile_id: str) -> Optional[CanonicalEntity]:
        """Return latest canonical entity or None."""
        return (
            self.db.query(CanonicalEntity)
            .filter(CanonicalEntity.business_profile_id == business_profile_id)
            .first()
        )

    def build_canonical_entity(self, business_profile_id: str) -> CanonicalEntity:
        """
        Build (or rebuild) the canonical entity from completed prompt results.

        1. Load business profile + completed prompt results
        2. Extract structured data from specific prompts
        3. Use LLM to synthesize into a clean entity
        4. Normalize vocabulary
        5. Upsert into DB
        """
        logger.info(f"Building canonical entity for business {business_profile_id}")

        business = self.db.query(BusinessProfile).filter(
            BusinessProfile.id == business_profile_id
        ).first()
        if not business:
            raise ValueError(f"Business profile {business_profile_id} not found")

        # Gather completed prompt results keyed by prompt_id
        prompt_results = self._load_prompt_results(business_profile_id)
        if not prompt_results:
            raise ValueError("No completed prompt results. Run GEO prompts first.")

        # Extract signals from each relevant prompt
        signals = self._extract_signals(prompt_results, business)

        # Synthesize via LLM (or fallback to direct extraction)
        entity_data = self._synthesize(signals, business)

        # Normalize vocabulary
        approved_terms, vocab_clusters = self._normalize_vocabulary(entity_data)

        # Upsert
        existing = self.get_canonical_entity(business_profile_id)
        if existing:
            existing.primary_category = entity_data.get("primary_category", business.category)
            existing.secondary_categories = entity_data.get("secondary_categories", [])
            existing.services = entity_data.get("services", [])
            existing.positioning_statement = entity_data.get("positioning_statement", "")
            existing.icp = entity_data.get("icp", {})
            existing.geo_scope = entity_data.get("geo_scope", {})
            existing.approved_terms = approved_terms
            existing.vocabulary_clusters = vocab_clusters
            existing.raw_signals = signals
            existing.version = (existing.version or 0) + 1
            existing.computed_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(existing)
            logger.info(f"Updated canonical entity v{existing.version} for {business.name}")
            return existing

        entity = CanonicalEntity(
            id=str(uuid.uuid4()),
            business_profile_id=business_profile_id,
            primary_category=entity_data.get("primary_category", business.category),
            secondary_categories=entity_data.get("secondary_categories", []),
            services=entity_data.get("services", []),
            positioning_statement=entity_data.get("positioning_statement", ""),
            icp=entity_data.get("icp", {}),
            geo_scope=entity_data.get("geo_scope", {}),
            approved_terms=approved_terms,
            vocabulary_clusters=vocab_clusters,
            raw_signals=signals,
            version=1,
            computed_at=datetime.utcnow(),
        )
        self.db.add(entity)
        self.db.commit()
        self.db.refresh(entity)
        logger.info(f"Created canonical entity v1 for {business.name}")
        return entity

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _load_prompt_results(self, business_profile_id: str) -> Dict[str, Any]:
        """Load completed prompt results keyed by the GeoPrompt.prompt_id (e.g. 'entity_def_001')."""
        from app.models.geo_prompt import GeoPrompt

        rows = (
            self.db.query(GeoPromptResult)
            .filter(
                GeoPromptResult.business_profile_id == business_profile_id,
                GeoPromptResult.execution_status == ExecutionStatus.COMPLETED,
            )
            .all()
        )

        keyed: Dict[str, Any] = {}
        for r in rows:
            prompt = self.db.query(GeoPrompt).filter(GeoPrompt.id == r.prompt_id).first()
            if prompt and r.structured_response:
                keyed[prompt.prompt_id] = r.structured_response
        return keyed

    def _extract_signals(self, prompt_results: Dict[str, Any], business: BusinessProfile) -> Dict[str, Any]:
        """Extract relevant signals from prompt results for synthesis."""
        signals: Dict[str, Any] = {}

        # entity_def_001 → core identity
        if "entity_def_001" in prompt_results:
            signals["core_identity"] = prompt_results["entity_def_001"]

        # entity_def_002 → service portfolio
        if "entity_def_002" in prompt_results:
            signals["service_portfolio"] = prompt_results["entity_def_002"]

        # entity_def_003 → target audience segments → ICP
        if "entity_def_003" in prompt_results:
            signals["audience"] = prompt_results["entity_def_003"]

        # entity_def_004 → brand personality & vocabulary
        if "entity_def_004" in prompt_results:
            signals["brand_personality"] = prompt_results["entity_def_004"]

        # entity_def_005 → NAP
        if "entity_def_005" in prompt_results:
            signals["nap"] = prompt_results["entity_def_005"]

        # cat_vis_001 → primary + secondary categories
        if "cat_vis_001" in prompt_results:
            signals["categories"] = prompt_results["cat_vis_001"]

        # cat_vis_002 → keywords, topics, expertise
        if "cat_vis_002" in prompt_results:
            signals["keywords"] = prompt_results["cat_vis_002"]

        # local_disc_001 → service area, geography
        if "local_disc_001" in prompt_results:
            signals["local_discovery"] = prompt_results["local_disc_001"]

        # Fallback metadata
        signals["business_metadata"] = {
            "name": business.name,
            "category": business.category,
            "primary_location": business.primary_location,
            "website": business.website,
            "brand_voice": business.brand_voice,
            "main_goal": business.main_goal,
        }

        return signals

    def _synthesize(self, signals: Dict[str, Any], business: BusinessProfile) -> Dict[str, Any]:
        """Use LLM to merge signals into a clean canonical entity, or fall back to direct extraction."""
        if not self.llm:
            return self._direct_extraction(signals, business)

        prompt_template = ChatPromptTemplate.from_messages([
            ("system", (
                "You are a business intelligence analyst. Given raw analysis signals from multiple prompts, "
                "synthesize them into a single clean canonical entity. Return ONLY valid JSON."
            )),
            ("human", """Merge the following analysis signals into one canonical business entity.

Raw signals:
{signals_json}

Return JSON with exactly these keys:
- "primary_category": string (the single best category)
- "secondary_categories": string[] (2-5 related categories)
- "services": array of {{"name": str, "description": str, "confidence": 0.0-1.0}}
- "positioning_statement": string (one clear sentence)
- "icp": {{"segments": [], "industries": [], "pain_points": []}}
- "geo_scope": {{"primary_location": str, "service_areas": [], "radius_km": number or null}}

Only include information supported by the signals. Do not invent data.""")
        ])

        try:
            chain = prompt_template | self.llm
            result = chain.invoke({"signals_json": json.dumps(signals, default=str)[:6000]})
            text = result.content if hasattr(result, "content") else str(result)
            parsed = self._parse_json(text)
            if parsed:
                return parsed
        except Exception as e:
            logger.warning(f"LLM synthesis failed, falling back to direct extraction: {e}")

        return self._direct_extraction(signals, business)

    def _direct_extraction(self, signals: Dict[str, Any], business: BusinessProfile) -> Dict[str, Any]:
        """Fallback: extract entity fields directly from signals without LLM."""
        entity: Dict[str, Any] = {
            "primary_category": business.category,
            "secondary_categories": [],
            "services": [],
            "positioning_statement": business.brand_voice or "",
            "icp": {"segments": [], "industries": [], "pain_points": []},
            "geo_scope": {
                "primary_location": business.primary_location,
                "service_areas": [],
                "radius_km": None,
            },
        }

        # Categories from cat_vis_001
        cats = signals.get("categories", {})
        if isinstance(cats, dict):
            if "primary_category" in cats:
                val = cats["primary_category"]
                entity["primary_category"] = val.get("text", val) if isinstance(val, dict) else str(val)
            if "secondary_categories" in cats:
                sec = cats["secondary_categories"]
                if isinstance(sec, list):
                    entity["secondary_categories"] = [
                        (s.get("text", s) if isinstance(s, dict) else str(s)) for s in sec
                    ]

        # Services from entity_def_002
        svc = signals.get("service_portfolio", {})
        if isinstance(svc, dict) and "services" in svc:
            raw_services = svc["services"]
            if isinstance(raw_services, list):
                for s in raw_services:
                    if isinstance(s, dict):
                        entity["services"].append({
                            "name": s.get("name") or s.get("text", ""),
                            "description": s.get("description", ""),
                            "confidence": 0.8,
                        })
                    elif isinstance(s, str):
                        entity["services"].append({"name": s, "description": "", "confidence": 0.7})

        # ICP from entity_def_003
        aud = signals.get("audience", {})
        if isinstance(aud, dict):
            for key in ("segments", "customer_segments"):
                if key in aud and isinstance(aud[key], list):
                    entity["icp"]["segments"] = [
                        (a.get("text", a) if isinstance(a, dict) else str(a)) for a in aud[key]
                    ]
                    break
            if "industries" in aud and isinstance(aud["industries"], list):
                entity["icp"]["industries"] = [
                    (a.get("text", a) if isinstance(a, dict) else str(a)) for a in aud["industries"]
                ]

        # Geo from local_disc_001
        geo = signals.get("local_discovery", {})
        if isinstance(geo, dict):
            if "service_areas" in geo and isinstance(geo["service_areas"], list):
                entity["geo_scope"]["service_areas"] = [
                    (a.get("text", a) if isinstance(a, dict) else str(a)) for a in geo["service_areas"]
                ]

        # Positioning from core identity
        core = signals.get("core_identity", {})
        if isinstance(core, dict):
            mission = core.get("mission")
            if isinstance(mission, dict):
                entity["positioning_statement"] = mission.get("text", entity["positioning_statement"])
            elif isinstance(mission, str):
                entity["positioning_statement"] = mission

        return entity

    def _normalize_vocabulary(self, entity_data: Dict[str, Any]):
        """Deduplicate terms, cluster synonyms, return approved_terms + clusters."""
        raw_terms: List[str] = []

        # Collect terms from services
        for svc in entity_data.get("services", []):
            if isinstance(svc, dict) and svc.get("name"):
                raw_terms.append(svc["name"].lower().strip())

        # Collect from categories
        if entity_data.get("primary_category"):
            raw_terms.append(entity_data["primary_category"].lower().strip())
        for c in entity_data.get("secondary_categories", []):
            if isinstance(c, str):
                raw_terms.append(c.lower().strip())

        # Collect from ICP segments
        icp = entity_data.get("icp", {})
        if isinstance(icp, dict):
            for seg in icp.get("segments", []):
                if isinstance(seg, str):
                    raw_terms.append(seg.lower().strip())

        # Deduplicate & count
        counter = Counter(raw_terms)
        approved = sorted(set(raw_terms))

        # Simple clustering: group terms sharing ≥50% of words
        clusters: List[Dict] = []
        used = set()
        for term in approved:
            if term in used:
                continue
            words = set(term.split())
            group = [term]
            for other in approved:
                if other != term and other not in used:
                    owords = set(other.split())
                    overlap = words & owords
                    if overlap and len(overlap) / max(len(words), len(owords)) >= 0.5:
                        group.append(other)
            canonical = max(group, key=lambda t: counter[t])
            clusters.append({
                "label": canonical,
                "canonical": canonical,
                "variants": group,
                "frequency": sum(counter[t] for t in group),
            })
            used.update(group)

        return approved, clusters

    def _parse_json(self, text: str) -> Optional[Dict]:
        """Parse JSON from LLM response (handles markdown wrapping)."""
        import re
        if not text:
            return None
        # Try code block extraction
        m = re.search(r'```(?:json)?\s*\n?([\s\S]*?)\n?```', text)
        if m:
            text = m.group(1)
        text = text.strip()
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            # Try json_repair
            try:
                import json_repair
                return json_repair.loads(text)
            except Exception:
                return None
