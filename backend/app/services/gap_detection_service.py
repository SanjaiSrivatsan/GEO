"""
Gap Detection Service
=====================
Detects conflicts and gaps in how a business is represented.
6 detectors run against CanonicalEntity + WebsiteContent + Mentions.
Pure structured output — no UI logic.
"""
import json
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional

from sqlalchemy.orm import Session
from loguru import logger

from app.models.canonical_entity import CanonicalEntity
from app.models.gap_issue import GapIssue, GapType, GapSeverity, GapStatus
from app.models.business_profile import BusinessProfile
from app.models.website_content import WebsiteContent
from app.models.brand_mention import BrandMention


class GapDetectionService:
    """Detects gaps and conflicts in business representation."""

    def __init__(self, db: Session):
        self.db = db

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def get_gap_issues(
        self,
        business_profile_id: str,
        severity: Optional[str] = None,
        gap_type: Optional[str] = None,
        status: Optional[str] = None,
    ) -> List[GapIssue]:
        """Return stored gap issues with optional filters."""
        q = self.db.query(GapIssue).filter(
            GapIssue.business_profile_id == business_profile_id
        )
        if severity:
            q = q.filter(GapIssue.severity == severity)
        if gap_type:
            q = q.filter(GapIssue.gap_type == gap_type)
        if status:
            q = q.filter(GapIssue.status == status)
        return q.order_by(GapIssue.severity).all()

    def detect_all_gaps(self, business_profile_id: str) -> List[Dict[str, Any]]:
        """
        Run all 6 detectors. Clears old ACTIVE issues and re-detects fresh.
        Returns list of gap issue dicts sorted by severity.
        """
        logger.info(f"Running gap detection for business {business_profile_id}")

        # Load prerequisites
        entity = (
            self.db.query(CanonicalEntity)
            .filter(CanonicalEntity.business_profile_id == business_profile_id)
            .first()
        )
        if not entity:
            raise ValueError("Canonical entity not built yet. Build it first.")

        business = self.db.query(BusinessProfile).filter(
            BusinessProfile.id == business_profile_id
        ).first()
        if not business:
            raise ValueError(f"Business profile {business_profile_id} not found")

        pages = (
            self.db.query(WebsiteContent)
            .filter(WebsiteContent.business_profile_id == business_profile_id)
            .all()
        )

        mentions = (
            self.db.query(BrandMention)
            .filter(BrandMention.business_profile_id == business_profile_id)
            .all()
        )

        # Clear old ACTIVE issues for this business
        self.db.query(GapIssue).filter(
            GapIssue.business_profile_id == business_profile_id,
            GapIssue.status == GapStatus.ACTIVE,
        ).delete(synchronize_session="fetch")
        self.db.flush()

        # Run all 6 detectors
        issues: List[GapIssue] = []
        detectors = [
            self._detect_category_mismatch,
            self._detect_service_drift,
            self._detect_vertical_absence,
            self._detect_missing_faq,
            self._detect_weak_geo_binding,
            self._detect_vocabulary_inconsistency,
        ]

        for detector in detectors:
            try:
                found = detector(entity, business, pages, mentions)
                issues.extend(found)
            except Exception as e:
                logger.error(f"Detector {detector.__name__} failed: {e}")

        # Store all issues
        for issue in issues:
            self.db.add(issue)
        self.db.commit()

        # Sort by severity order: critical, high, medium, low
        severity_order = {
            GapSeverity.CRITICAL: 0,
            GapSeverity.HIGH: 1,
            GapSeverity.MEDIUM: 2,
            GapSeverity.LOW: 3,
        }
        issues.sort(key=lambda i: severity_order.get(i.severity, 4))

        logger.info(f"Detected {len(issues)} gap issues for {business.name}")
        return [self._issue_to_dict(i) for i in issues]

    # ------------------------------------------------------------------
    # Detectors
    # ------------------------------------------------------------------

    def _detect_category_mismatch(
        self, entity: CanonicalEntity, business: BusinessProfile,
        pages: List[WebsiteContent], mentions: List[BrandMention],
    ) -> List[GapIssue]:
        """Compare canonical category vs what website actually says."""
        issues = []
        primary_cat = (entity.primary_category or "").lower()
        user_cat = (business.category or "").lower()

        if not primary_cat:
            return issues

        # Check if homepage / about page reinforces the category
        homepage_text = ""
        for p in pages:
            pt = (p.page_type or "").lower()
            if pt in ("homepage", "about"):
                homepage_text += " " + (p.cleaned_text or "") + " " + (p.title or "")

        homepage_lower = homepage_text.lower()
        cat_words = set(primary_cat.split())

        # Category must appear in homepage/about content
        cat_found = primary_cat in homepage_lower or all(w in homepage_lower for w in cat_words)

        if not cat_found and homepage_text.strip():
            # Category not mentioned anywhere on key pages
            issues.append(self._create_issue(
                business_profile_id=business.id,
                canonical_entity_id=entity.id,
                gap_type=GapType.CATEGORY_MISMATCH,
                severity=GapSeverity.CRITICAL if user_cat != primary_cat else GapSeverity.HIGH,
                title=f"Category '{entity.primary_category}' not reinforced on website",
                description=(
                    f"The canonical category '{entity.primary_category}' does not appear in the "
                    f"homepage or about page content. AI models may not associate the business "
                    f"with this category."
                ),
                evidence={
                    "canonical_category": entity.primary_category,
                    "user_category": business.category,
                    "pages_checked": ["homepage", "about"],
                    "category_found_in_content": False,
                },
                affected_dimensions=["accuracy", "presence"],
            ))

        # Check if user category vs canonical category diverge
        if user_cat and primary_cat and user_cat != primary_cat:
            # Check if they're even related
            user_words = set(user_cat.split())
            overlap = cat_words & user_words
            if not overlap:
                issues.append(self._create_issue(
                    business_profile_id=business.id,
                    canonical_entity_id=entity.id,
                    gap_type=GapType.CATEGORY_MISMATCH,
                    severity=GapSeverity.HIGH,
                    title=f"User-set category '{business.category}' differs from AI-inferred category",
                    description=(
                        f"The user specified '{business.category}' but AI analysis determined "
                        f"'{entity.primary_category}'. This mismatch can confuse AI models."
                    ),
                    evidence={
                        "user_category": business.category,
                        "ai_inferred_category": entity.primary_category,
                        "overlap_words": list(overlap),
                    },
                    affected_dimensions=["accuracy"],
                ))

        return issues

    def _detect_service_drift(
        self, entity: CanonicalEntity, business: BusinessProfile,
        pages: List[WebsiteContent], mentions: List[BrandMention],
    ) -> List[GapIssue]:
        """Compare canonical services vs services found on website."""
        issues = []
        canonical_services = entity.services or []
        if not canonical_services:
            return issues

        # Build corpus of all page text
        all_text = " ".join(
            ((p.cleaned_text or "") + " " + (p.title or "") + " " + self._parse_tags(p.h1_tags) + " " + self._parse_tags(p.h2_tags)).lower()
            for p in pages
        )

        if not all_text.strip():
            return issues

        # Check which canonical services appear in website content
        found_services = []
        missing_services = []
        for svc in canonical_services:
            name = svc.get("name", "") if isinstance(svc, dict) else str(svc)
            name_lower = name.lower().strip()
            if not name_lower:
                continue
            # Check for service name or its key words
            name_words = set(name_lower.split())
            if name_lower in all_text or (len(name_words) > 1 and all(w in all_text for w in name_words)):
                found_services.append(name)
            else:
                missing_services.append(name)

        if missing_services:
            drift_pct = len(missing_services) / len(canonical_services) * 100
            severity = GapSeverity.HIGH if drift_pct > 30 else GapSeverity.MEDIUM
            issues.append(self._create_issue(
                business_profile_id=business.id,
                canonical_entity_id=entity.id,
                gap_type=GapType.SERVICE_DRIFT,
                severity=severity,
                title=f"{len(missing_services)} of {len(canonical_services)} services not found on website",
                description=(
                    f"The following services are in the canonical entity but not evidenced "
                    f"on the website: {', '.join(missing_services[:5])}. "
                    f"Service drift is {drift_pct:.0f}%."
                ),
                evidence={
                    "canonical_services": [s.get("name", s) if isinstance(s, dict) else s for s in canonical_services],
                    "found_on_website": found_services,
                    "missing_from_website": missing_services,
                    "drift_percentage": round(drift_pct, 1),
                },
                affected_dimensions=["accuracy", "presence"],
            ))

        return issues

    def _detect_vertical_absence(
        self, entity: CanonicalEntity, business: BusinessProfile,
        pages: List[WebsiteContent], mentions: List[BrandMention],
    ) -> List[GapIssue]:
        """Check if website has content for ICP verticals/industries."""
        issues = []
        icp = entity.icp or {}
        industries = icp.get("industries", [])
        if not industries:
            return issues

        all_text = " ".join((p.cleaned_text or "").lower() for p in pages)
        if not all_text.strip():
            return issues

        missing_verticals = []
        for ind in industries:
            ind_str = ind.lower().strip() if isinstance(ind, str) else str(ind).lower().strip()
            if ind_str and ind_str not in all_text:
                missing_verticals.append(ind_str)

        if missing_verticals and len(missing_verticals) == len(industries):
            issues.append(self._create_issue(
                business_profile_id=business.id,
                canonical_entity_id=entity.id,
                gap_type=GapType.VERTICAL_ABSENCE,
                severity=GapSeverity.HIGH,
                title="No industry-specific content found on website",
                description=(
                    f"The ICP targets industries ({', '.join(industries[:5])}) but the website "
                    f"has no content addressing these verticals. Industry-specific pages "
                    f"significantly boost AI visibility."
                ),
                evidence={
                    "target_industries": industries,
                    "missing_verticals": missing_verticals,
                    "pages_checked": len(pages),
                },
                affected_dimensions=["presence", "trust"],
            ))
        elif missing_verticals:
            issues.append(self._create_issue(
                business_profile_id=business.id,
                canonical_entity_id=entity.id,
                gap_type=GapType.VERTICAL_ABSENCE,
                severity=GapSeverity.MEDIUM,
                title=f"{len(missing_verticals)} target verticals missing from website",
                description=(
                    f"Some ICP industries are not referenced on the website: "
                    f"{', '.join(missing_verticals[:5])}."
                ),
                evidence={
                    "target_industries": industries,
                    "missing_verticals": missing_verticals,
                    "found_verticals": [i for i in industries if i not in missing_verticals],
                },
                affected_dimensions=["presence"],
            ))

        return issues

    def _detect_missing_faq(
        self, entity: CanonicalEntity, business: BusinessProfile,
        pages: List[WebsiteContent], mentions: List[BrandMention],
    ) -> List[GapIssue]:
        """Check if website has FAQ page or FAQ-structured content."""
        issues = []

        has_faq_page = any(
            (p.page_type or "").lower() == "faq" for p in pages
        )

        # Also check for FAQ-like h2 headers (questions)
        has_faq_content = False
        for p in pages:
            h2s = self._parse_tags(p.h2_tags)
            if h2s:
                questions = [h for h in h2s.split(",") if "?" in h]
                if len(questions) >= 3:
                    has_faq_content = True
                    break

        if not has_faq_page and not has_faq_content:
            issues.append(self._create_issue(
                business_profile_id=business.id,
                canonical_entity_id=entity.id,
                gap_type=GapType.MISSING_FAQ,
                severity=GapSeverity.MEDIUM,
                title="No FAQ page or FAQ-structured content detected",
                description=(
                    "The website has no dedicated FAQ page and no pages with question-answer "
                    "structured content. FAQs with schema markup significantly improve AI "
                    "model understanding and featured snippet eligibility."
                ),
                evidence={
                    "has_faq_page": False,
                    "has_faq_content": False,
                    "pages_checked": len(pages),
                    "page_types_found": list(set((p.page_type or "unknown") for p in pages)),
                },
                affected_dimensions=["presence", "accuracy"],
            ))

        return issues

    def _detect_weak_geo_binding(
        self, entity: CanonicalEntity, business: BusinessProfile,
        pages: List[WebsiteContent], mentions: List[BrandMention],
    ) -> List[GapIssue]:
        """Check if primary location appears in key pages and schema markup."""
        issues = []
        location = (business.primary_location or "").lower().strip()
        if not location:
            return issues

        # Split location into meaningful parts (city, state, etc.)
        location_parts = [p.strip() for p in location.replace(",", " ").split() if len(p.strip()) > 2]

        # Check homepage specifically
        homepage_has_location = False
        title_has_location = False
        schema_has_location = False

        for p in pages:
            pt = (p.page_type or "").lower()
            text_lower = (p.cleaned_text or "").lower()
            title_lower = (p.title or "").lower()

            # Check if any significant location part appears
            loc_in_text = any(part in text_lower for part in location_parts)
            loc_in_title = any(part in title_lower for part in location_parts)

            if pt == "homepage":
                homepage_has_location = loc_in_text
                title_has_location = loc_in_title

            # Check schema markup for LocalBusiness / geo info
            if p.schema_markup:
                try:
                    schema_str = p.schema_markup if isinstance(p.schema_markup, str) else json.dumps(p.schema_markup)
                    schema_lower = schema_str.lower()
                    if "localbusiness" in schema_lower or "geo" in schema_lower or "address" in schema_lower:
                        schema_has_location = True
                except (json.JSONDecodeError, TypeError):
                    pass

        if not homepage_has_location and pages:
            issues.append(self._create_issue(
                business_profile_id=business.id,
                canonical_entity_id=entity.id,
                gap_type=GapType.WEAK_GEO_BINDING,
                severity=GapSeverity.HIGH,
                title=f"Location '{business.primary_location}' missing from homepage content",
                description=(
                    f"The primary location '{business.primary_location}' does not appear in "
                    f"the homepage content. This weakens local AI visibility significantly."
                ),
                evidence={
                    "primary_location": business.primary_location,
                    "homepage_has_location": False,
                    "title_has_location": title_has_location,
                    "schema_has_location": schema_has_location,
                    "location_parts_checked": location_parts,
                },
                affected_dimensions=["presence", "accuracy"],
            ))

        if not schema_has_location and pages:
            issues.append(self._create_issue(
                business_profile_id=business.id,
                canonical_entity_id=entity.id,
                gap_type=GapType.WEAK_GEO_BINDING,
                severity=GapSeverity.MEDIUM,
                title="No LocalBusiness schema markup detected",
                description=(
                    "No LocalBusiness or geographic schema.org markup found on the website. "
                    "Schema markup helps AI models understand location context."
                ),
                evidence={
                    "schema_has_location": False,
                    "pages_with_schema": sum(1 for p in pages if p.schema_markup),
                },
                affected_dimensions=["accuracy"],
            ))

        return issues

    def _detect_vocabulary_inconsistency(
        self, entity: CanonicalEntity, business: BusinessProfile,
        pages: List[WebsiteContent], mentions: List[BrandMention],
    ) -> List[GapIssue]:
        """Check if website uses inconsistent vocabulary vs canonical approved terms."""
        issues = []
        approved = entity.approved_terms or []
        clusters = entity.vocabulary_clusters or []
        if not clusters:
            return issues

        # Build per-page vocabulary usage
        inconsistent_pages = []
        for p in pages:
            text_lower = (p.cleaned_text or "").lower()
            if not text_lower:
                continue
            for cluster in clusters:
                canonical_term = cluster.get("canonical", "")
                variants = cluster.get("variants", [])
                non_canonical_used = []
                for v in variants:
                    if v != canonical_term and v in text_lower:
                        non_canonical_used.append(v)
                if non_canonical_used and canonical_term not in text_lower:
                    inconsistent_pages.append({
                        "page": p.url,
                        "canonical_term": canonical_term,
                        "non_canonical_used": non_canonical_used,
                    })

        if inconsistent_pages:
            severity = GapSeverity.MEDIUM if len(inconsistent_pages) > 3 else GapSeverity.LOW
            issues.append(self._create_issue(
                business_profile_id=business.id,
                canonical_entity_id=entity.id,
                gap_type=GapType.INCONSISTENT_VOCABULARY,
                severity=severity,
                title=f"Inconsistent vocabulary on {len(inconsistent_pages)} pages",
                description=(
                    "Some pages use non-canonical term variants instead of the approved "
                    "terminology. Consistent vocabulary helps AI models build stronger "
                    "entity associations."
                ),
                evidence={
                    "inconsistent_pages": inconsistent_pages[:10],
                    "approved_terms": approved[:20],
                    "total_clusters": len(clusters),
                },
                affected_dimensions=["accuracy"],
            ))

        return issues

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _create_issue(self, **kwargs) -> GapIssue:
        """Create a GapIssue instance with defaults."""
        return GapIssue(
            id=str(uuid.uuid4()),
            status=GapStatus.ACTIVE,
            detected_at=datetime.utcnow(),
            **kwargs,
        )

    def _parse_tags(self, tags_field) -> str:
        """Parse h1/h2 tags from the stored format (JSON string or plain text)."""
        if not tags_field:
            return ""
        if isinstance(tags_field, list):
            return ", ".join(str(t) for t in tags_field)
        try:
            parsed = json.loads(tags_field)
            if isinstance(parsed, list):
                return ", ".join(str(t) for t in parsed)
        except (json.JSONDecodeError, TypeError):
            pass
        return str(tags_field)

    def _issue_to_dict(self, issue: GapIssue) -> Dict[str, Any]:
        """Convert GapIssue to dict for API response."""
        return {
            "id": issue.id,
            "business_profile_id": issue.business_profile_id,
            "canonical_entity_id": issue.canonical_entity_id,
            "gap_type": issue.gap_type.value if issue.gap_type else None,
            "severity": issue.severity.value if issue.severity else None,
            "status": issue.status.value if issue.status else None,
            "title": issue.title,
            "description": issue.description,
            "evidence": issue.evidence or {},
            "affected_dimensions": issue.affected_dimensions or [],
            "detected_at": issue.detected_at.isoformat() if issue.detected_at else None,
            "resolved_at": issue.resolved_at.isoformat() if issue.resolved_at else None,
        }
