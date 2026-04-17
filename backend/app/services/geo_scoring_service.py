"""
GEO Scoring Service - Step 16
Deterministic, explainable scoring engine that converts LangChain prompt results into normalized metrics.

This is PURE COMPUTATION - NO LangChain, NO AI.
All scores are reproducible and can be verified through exact formulas.

Formula: GEO_SCORE = (Presence × 0.35) + (Accuracy × 0.35) + (Trust × 0.20) + HallucinationPenalty
"""

from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import Dict, Tuple, Optional, List
from decimal import Decimal, ROUND_HALF_UP
import json
from datetime import datetime
import uuid
from loguru import logger

from app.models import GeoScore, GeoPromptResult, ExecutionStatus, BusinessProfile


def _to_str(value) -> str:
    """Safely coerce LLM response field to a string.
    
    The LLM sometimes returns dicts like {"text": "KFC", "source_url": "..."}  
    instead of plain strings. This helper extracts the 'text' field,
    or joins list elements, or converts to str.
    """
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, dict):
        # Try common keys first
        for key in ("text", "value", "name", "display_name"):
            if key in value and isinstance(value[key], str):
                return value[key].strip()
        # Fallback: first string value in the dict
        for v in value.values():
            if isinstance(v, str) and v.strip():
                return v.strip()
        return str(value)
    if isinstance(value, (list, tuple)):
        parts = [_to_str(item) for item in value if item]
        return ", ".join(parts)
    return str(value).strip()


class GeoScoringService:
    """Deterministic scoring service - converts prompt results into explainable metrics"""
    
    COMPUTATION_METHOD = "v1.0"
    
    # Score dimension weights
    PRESENCE_WEIGHT = Decimal("0.35")
    ACCURACY_WEIGHT = Decimal("0.35")
    TRUST_WEIGHT = Decimal("0.20")
    
    # Hallucination penalty range
    MAX_HALLUCINATION_PENALTY = Decimal("-10.00")
    
    def __init__(self, db: Session):
        self.db = db
    
    def compute_geo_score(
        self,
        business_profile_id: str,
        user_id: str
    ) -> GeoScore:
        """
        Main scoring orchestrator - computes all dimensions and final GEO score.
        
        Steps:
        1. Load all completed prompt results for the business
        2. Compute presence score (35%)
        3. Compute accuracy score (35%)
        4. Compute trust score (20%)
        5. Compute hallucination penalty (up to -10)
        6. Calculate final score using weighted formula
        7. Store in database with full breakdowns
        
        Returns:
            GeoScore object with all dimensions and breakdowns
        """
        logger.info(f"Computing GEO score for business_profile_id={business_profile_id}")
        
        # Load all completed prompt results
        results = self.db.query(GeoPromptResult).filter(
            and_(
                GeoPromptResult.business_profile_id == business_profile_id,
                GeoPromptResult.execution_status == ExecutionStatus.COMPLETED
            )
        ).all()
        
        if not results:
            raise ValueError(f"No completed prompt results found for business_profile_id={business_profile_id}")
        
        logger.info(f"Found {len(results)} completed prompt results")
        
        # Compute each dimension
        presence_score, presence_breakdown = self._compute_presence_score(results, business_profile_id)
        accuracy_score, accuracy_breakdown = self._compute_accuracy_score(results)
        trust_score, trust_breakdown = self._compute_trust_score(results)
        hallucination_penalty, hallucination_breakdown = self._compute_hallucination_penalty(results)
        
        # Calculate final GEO score using weighted formula
        final_score = self._calculate_final_score(
            presence_score,
            accuracy_score,
            trust_score,
            hallucination_penalty
        )
        
        logger.info(
            f"Computed scores - Presence: {presence_score}, Accuracy: {accuracy_score}, "
            f"Trust: {trust_score}, Penalty: {hallucination_penalty}, Final: {final_score}"
        )
        
        # Check if score already exists for this business
        existing_score = self.db.query(GeoScore).filter(
            GeoScore.business_profile_id == business_profile_id
        ).first()
        
        if existing_score:
            # Update existing score
            existing_score.presence_score = presence_score
            existing_score.accuracy_score = accuracy_score
            existing_score.trust_score = trust_score
            existing_score.hallucination_penalty = hallucination_penalty
            existing_score.final_geo_score = final_score
            existing_score.presence_breakdown = presence_breakdown
            existing_score.accuracy_breakdown = accuracy_breakdown
            existing_score.trust_breakdown = trust_breakdown
            existing_score.hallucination_breakdown = hallucination_breakdown
            existing_score.prompt_results_count = len(results)
            existing_score.computation_method = self.COMPUTATION_METHOD
            existing_score.computed_at = datetime.utcnow()
            existing_score.updated_at = datetime.utcnow()
            
            self.db.commit()
            self.db.refresh(existing_score)
            
            logger.info(f"Updated existing GeoScore id={existing_score.id}")
            return existing_score
        else:
            # Create new score
            geo_score = GeoScore(
                id=str(uuid.uuid4()),
                business_profile_id=business_profile_id,
                user_id=user_id,
                presence_score=presence_score,
                accuracy_score=accuracy_score,
                trust_score=trust_score,
                hallucination_penalty=hallucination_penalty,
                final_geo_score=final_score,
                presence_breakdown=presence_breakdown,
                accuracy_breakdown=accuracy_breakdown,
                trust_breakdown=trust_breakdown,
                hallucination_breakdown=hallucination_breakdown,
                prompt_results_count=len(results),
                computation_method=self.COMPUTATION_METHOD,
                computed_at=datetime.utcnow()
            )
            
            self.db.add(geo_score)
            self.db.commit()
            self.db.refresh(geo_score)
            
            logger.info(f"Created new GeoScore id={geo_score.id}")
            return geo_score
    
    def _compute_presence_score(
        self,
        results: List[GeoPromptResult],
        business_profile_id: str
    ) -> Tuple[Decimal, Dict]:
        """
        Presence Score (35% weight) - Brand visibility and citation frequency
        
        Components:
        - Brand mentions count (40%)
        - Directory presence (40%)
        - Local citations (20%)
        
        Formula: score = (mentions_score × 0.4) + (directory_score × 0.4) + (citation_score × 0.2)
        
        Returns:
            (score, breakdown_dict)
        """
        # Find relevant prompt results
        entity_def_results = [r for r in results if r.prompt.prompt_id.startswith("entity_def")]
        local_disc_results = [r for r in results if r.prompt.prompt_id.startswith("local_disc")]
        
        # ---- Use REAL brand_mentions DB table for mentions + directory counts ----
        from app.services.mention_discovery_service import MentionDiscoveryService
        db_mention_counts = MentionDiscoveryService.get_mention_counts_for_scoring(
            self.db, business_profile_id
        )
        
        # 1. Brand mentions count (from actual discovered mentions in DB)
        mentions_count = db_mention_counts.get("total_mentions", 0)
        
        # Normalize: 0 mentions = 0, 10+ mentions = 100
        mentions_score = min(Decimal("100.00"), Decimal(str(mentions_count * 10)))
        
        # 2. Directory presence (from actual discovered directory-type mentions)
        directory_count = db_mention_counts.get("directory_count", 0)
        directories = []  # Detailed list populated from LLM if available
        for result in local_disc_results:
            if result.structured_response:
                if isinstance(result.structured_response, dict):
                    directories_found = result.structured_response.get("directories", [])
                    if isinstance(directories_found, list):
                        directories.extend(directories_found)
        
        # Normalize: 0 directories = 0, 5+ directories = 100
        directory_score = min(Decimal("100.00"), Decimal(str(directory_count * 20)))
        
        # 3. Local citations (from LLM prompt results)
        citation_count = 0
        for result in local_disc_results:
            if result.cited_sources:
                citation_count += len(result.cited_sources)
        # Also count citations from entity definition prompts
        for result in entity_def_results:
            if result.cited_sources:
                citation_count += len(result.cited_sources)
        
        # Normalize: 0 citations = 0, 15+ citations = 100
        citation_score = min(Decimal("100.00"), Decimal(str(citation_count * 100 / 15)).quantize(Decimal("0.01")))
        
        # Calculate weighted presence score
        presence_score = (
            (mentions_score * Decimal("0.4")) +
            (directory_score * Decimal("0.4")) +
            (citation_score * Decimal("0.2"))
        ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        
        breakdown = {
            "mentions_count": mentions_count,
            "mentions_score": float(mentions_score),
            "mentions_weight": 0.4,
            "directory_count": directory_count,
            "directory_score": float(directory_score),
            "directory_weight": 0.4,
            "directories": directories[:10],  # Sample of directories
            "citation_count": citation_count,
            "citation_score": float(citation_score),
            "citation_weight": 0.2,
            "final_presence_score": float(presence_score),
            "formula": "(mentions_score × 0.4) + (directory_score × 0.4) + (citation_score × 0.2)"
        }
        
        logger.info(
            f"Presence score computed: {presence_score} "
            f"(mentions={mentions_count}, directories={directory_count}, citations={citation_count})"
        )
        
        return presence_score, breakdown
    
    def _compute_accuracy_score(
        self,
        results: List[GeoPromptResult]
    ) -> Tuple[Decimal, Dict]:
        """
        Accuracy Score (35% weight) - NAP consistency and category alignment
        
        Components:
        - NAP consistency across sources (50%)
        - Category alignment (30%)
        - Service description accuracy (20%)
        
        Formula: score = base_accuracy × (1 - contradiction_penalty)
        
        Returns:
            (score, breakdown_dict)
        """
        entity_def_results = [r for r in results if r.prompt.prompt_id.startswith("entity_def")]
        category_vis_results = [r for r in results if r.prompt.prompt_id.startswith("category_vis")]
        
        # 1. NAP Consistency (Name, Address, Phone)
        nap_variants = {
            "names": set(),
            "addresses": set(),
            "phones": set()
        }
        
        for result in entity_def_results:
            if result.structured_response and isinstance(result.structured_response, dict):
                name = result.structured_response.get("business_name")
                address = result.structured_response.get("address")
                phone = result.structured_response.get("phone")
                
                if name:
                    nap_variants["names"].add(_to_str(name).lower())
                if address:
                    nap_variants["addresses"].add(_to_str(address).lower())
                if phone:
                    # Normalize phone: remove spaces, dashes, parentheses
                    phone_str = _to_str(phone)
                    normalized_phone = "".join(c for c in phone_str if c.isdigit())
                    if normalized_phone:
                        nap_variants["phones"].add(normalized_phone)
        
        # Count unique variants (ideally 1 for each)
        name_variants = len(nap_variants["names"])
        address_variants = len(nap_variants["addresses"])
        phone_variants = len(nap_variants["phones"])
        
        # Perfect consistency = 1 variant each = 100 score
        # 2 variants = 80 score, 3+ variants = 60 score
        nap_scores = []
        for count in [name_variants, address_variants, phone_variants]:
            if count <= 1:
                nap_scores.append(Decimal("100.00"))
            elif count == 2:
                nap_scores.append(Decimal("80.00"))
            else:
                nap_scores.append(Decimal("60.00"))
        
        nap_consistency_score = sum(nap_scores) / Decimal("3.0")
        
        # 2. Category Alignment
        category_mentions = []
        for result in category_vis_results:
            if result.structured_response and isinstance(result.structured_response, dict):
                category = result.structured_response.get("category")
                if category:
                    category_mentions.append(_to_str(category).lower())
        
        # Check if categories are consistent
        unique_categories = len(set(category_mentions))
        if unique_categories <= 1:
            category_alignment_score = Decimal("100.00")
        elif unique_categories == 2:
            category_alignment_score = Decimal("85.00")
        else:
            category_alignment_score = Decimal("70.00")
        
        # 3. Service Description Accuracy (check for contradictions)
        service_descriptions = []
        for result in entity_def_results:
            if result.structured_response and isinstance(result.structured_response, dict):
                services = result.structured_response.get("services", [])
                if isinstance(services, list):
                    service_descriptions.extend(services)
        
        # Simple check: more services mentioned = higher confidence in accuracy
        service_count = len(service_descriptions)
        service_accuracy_score = min(Decimal("100.00"), Decimal(str(service_count * 20)))
        
        # Calculate base accuracy (weighted average)
        base_accuracy = (
            (nap_consistency_score * Decimal("0.5")) +
            (category_alignment_score * Decimal("0.3")) +
            (service_accuracy_score * Decimal("0.2"))
        )
        
        # Check for contradictions (penalty)
        contradiction_count = 0
        if name_variants > 2:
            contradiction_count += 1
        if address_variants > 2:
            contradiction_count += 1
        if unique_categories > 2:
            contradiction_count += 1
        
        contradiction_penalty = Decimal(str(contradiction_count * 0.1))  # 10% penalty per contradiction
        
        # Final accuracy score
        accuracy_score = (base_accuracy * (Decimal("1.0") - contradiction_penalty)).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        
        breakdown = {
            "nap_consistency_score": float(nap_consistency_score),
            "name_variants": name_variants,
            "address_variants": address_variants,
            "phone_variants": phone_variants,
            "category_alignment_score": float(category_alignment_score),
            "unique_categories": unique_categories,
            "service_accuracy_score": float(service_accuracy_score),
            "service_count": service_count,
            "base_accuracy": float(base_accuracy),
            "contradiction_count": contradiction_count,
            "contradiction_penalty": float(contradiction_penalty),
            "final_accuracy_score": float(accuracy_score),
            "formula": "base_accuracy × (1 - contradiction_penalty)"
        }
        
        logger.info(
            f"Accuracy score computed: {accuracy_score} "
            f"(NAP={name_variants}/{address_variants}/{phone_variants}, categories={unique_categories})"
        )
        
        return accuracy_score, breakdown
    
    def _compute_trust_score(
        self,
        results: List[GeoPromptResult]
    ) -> Tuple[Decimal, Dict]:
        """
        Trust Score (20% weight) - Review sentiment, volume, and trust signals
        
        Components:
        - Review sentiment (50%)
        - Review volume (30%)
        - Trust signals: certifications, response rate (20%)
        
        Formula: score = (sentiment × 0.5) + (volume × 0.3) + (signals × 0.2)
        
        Returns:
            (score, breakdown_dict)
        """
        trust_review_results = [r for r in results if r.prompt.prompt_id.startswith("trust_rev")]
        
        # 1. Review Sentiment
        sentiment_score = Decimal("50.00")  # Default neutral
        sentiment_data = {}
        
        for result in trust_review_results:
            if result.prompt.prompt_id == "trust_rev_001":  # Sentiment analysis prompt
                if result.structured_response and isinstance(result.structured_response, dict):
                    sentiment_data = result.structured_response
                    # Look for sentiment score (should be 0-100)
                    if "sentiment_score" in sentiment_data:
                        try:
                            sentiment_score = Decimal(str(sentiment_data["sentiment_score"]))
                        except Exception:
                            pass
                    elif "overall_sentiment" in sentiment_data:
                        # Convert text sentiment to score
                        sentiment_text = _to_str(sentiment_data["overall_sentiment"]).lower()
                        if "positive" in sentiment_text:
                            sentiment_score = Decimal("80.00")
                        elif "negative" in sentiment_text:
                            sentiment_score = Decimal("30.00")
                        else:
                            sentiment_score = Decimal("50.00")
        
        # 2. Review Volume
        review_count = 0
        for result in trust_review_results:
            if result.cited_sources:
                # Count review citations
                for source in result.cited_sources:
                    if source.get("review_id"):
                        review_count += 1
        
        # Normalize: 0 reviews = 0, 50+ reviews = 100
        volume_score = min(Decimal("100.00"), Decimal(str(review_count * 2)))
        
        # 3. Trust Signals (certifications, response rate, etc.)
        trust_signals = []
        response_rate = Decimal("0.00")
        
        for result in trust_review_results:
            if result.prompt.prompt_id == "trust_rev_004":  # Trust credentials prompt
                if result.structured_response and isinstance(result.structured_response, dict):
                    certs = result.structured_response.get("certifications", [])
                    if isinstance(certs, list):
                        trust_signals.extend(certs)
            
            if result.prompt.prompt_id == "trust_rev_005":  # Response behavior prompt
                if result.structured_response and isinstance(result.structured_response, dict):
                    try:
                        response_rate = Decimal(str(result.structured_response.get("response_rate", 0)))
                    except Exception:
                        response_rate = Decimal("0.00")
        
        # Calculate trust signals score
        signal_count = len(trust_signals)
        signal_score = min(Decimal("100.00"), Decimal(str(signal_count * 25)))  # 4 signals = 100
        
        # Add response rate bonus (response_rate is 0-100)
        signal_score = (signal_score + response_rate) / Decimal("2.0")
        
        # Calculate weighted trust score
        trust_score = (
            (sentiment_score * Decimal("0.5")) +
            (volume_score * Decimal("0.3")) +
            (signal_score * Decimal("0.2"))
        ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        
        breakdown = {
            "sentiment_score": float(sentiment_score),
            "sentiment_weight": 0.5,
            "sentiment_data": sentiment_data,
            "review_count": review_count,
            "volume_score": float(volume_score),
            "volume_weight": 0.3,
            "trust_signals": trust_signals,
            "signal_count": signal_count,
            "signal_score": float(signal_score),
            "signal_weight": 0.2,
            "response_rate": float(response_rate),
            "final_trust_score": float(trust_score),
            "formula": "(sentiment × 0.5) + (volume × 0.3) + (signals × 0.2)"
        }
        
        logger.info(
            f"Trust score computed: {trust_score} "
            f"(sentiment={sentiment_score}, reviews={review_count}, signals={signal_count})"
        )
        
        return trust_score, breakdown
    
    def _compute_hallucination_penalty(
        self,
        results: List[GeoPromptResult]
    ) -> Tuple[Decimal, Dict]:
        """
        Hallucination Penalty (up to -10 points) - Penalize unverified claims
        
        Penalties:
        - Uncited claims: -3 per result without citations
        - Low confidence: -2 per result with confidence < 0.5
        - Contradictions: -5 per major contradiction detected
        
        Formula: penalty = -min(10, (uncited × 3) + (low_conf × 2) + (contradictions × 5))
        
        Returns:
            (penalty, breakdown_dict) where penalty is -10 to 0
        """
        uncited_count = 0
        low_confidence_count = 0
        contradiction_count = 0
        
        uncited_prompts = []
        low_confidence_prompts = []
        
        # 1. Check for uncited claims
        for result in results:
            has_citations = result.cited_sources and len(result.cited_sources) > 0
            
            if not has_citations:
                uncited_count += 1
                uncited_prompts.append({
                    "prompt_id": result.prompt.prompt_id,
                    "prompt_title": result.prompt.title
                })
        
        # 2. Check for low confidence scores
        for result in results:
            if result.confidence_score is not None and result.confidence_score < 0.5:
                low_confidence_count += 1
                low_confidence_prompts.append({
                    "prompt_id": result.prompt.prompt_id,
                    "prompt_title": result.prompt.title,
                    "confidence": float(result.confidence_score)
                })
        
        # 3. Check for contradictions (simplified - check NAP variants from accuracy computation)
        # This would ideally be more sophisticated in production
        entity_def_results = [r for r in results if r.prompt.prompt_id.startswith("entity_def")]
        
        names = set()
        for result in entity_def_results:
            if result.structured_response and isinstance(result.structured_response, dict):
                name = result.structured_response.get("business_name")
                if name:
                    names.add(_to_str(name).lower())
        
        if len(names) > 2:
            contradiction_count += 1
        
        # Calculate penalty
        penalty_points = (
            (uncited_count * 3) +
            (low_confidence_count * 2) +
            (contradiction_count * 5)
        )
        
        penalty = max(
            self.MAX_HALLUCINATION_PENALTY,
            Decimal(str(-min(10, penalty_points)))
        ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        
        breakdown = {
            "uncited_count": uncited_count,
            "uncited_penalty_per": 3,
            "uncited_prompts": uncited_prompts[:5],  # Sample
            "low_confidence_count": low_confidence_count,
            "low_confidence_penalty_per": 2,
            "low_confidence_prompts": low_confidence_prompts[:5],  # Sample
            "contradiction_count": contradiction_count,
            "contradiction_penalty_per": 5,
            "total_penalty_points": penalty_points,
            "final_penalty": float(penalty),
            "formula": "-min(10, (uncited × 3) + (low_conf × 2) + (contradictions × 5))"
        }
        
        logger.info(
            f"Hallucination penalty computed: {penalty} "
            f"(uncited={uncited_count}, low_conf={low_confidence_count}, contradictions={contradiction_count})"
        )
        
        return penalty, breakdown
    
    def _calculate_final_score(
        self,
        presence_score: Decimal,
        accuracy_score: Decimal,
        trust_score: Decimal,
        hallucination_penalty: Decimal
    ) -> Decimal:
        """
        Calculate final GEO score using weighted formula.
        
        Formula: GEO_SCORE = (Presence × 0.35) + (Accuracy × 0.35) + (Trust × 0.20) + HallucinationPenalty
        
        Returns:
            Decimal score (0-100 range)
        """
        final_score = (
            (presence_score * self.PRESENCE_WEIGHT) +
            (accuracy_score * self.ACCURACY_WEIGHT) +
            (trust_score * self.TRUST_WEIGHT) +
            hallucination_penalty
        ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        
        # Ensure score is within valid range (0-100)
        final_score = max(Decimal("0.00"), min(Decimal("100.00"), final_score))
        
        return final_score
    
    def get_geo_score(
        self,
        business_profile_id: str
    ) -> Optional[GeoScore]:
        """
        Retrieve the latest GEO score for a business.
        
        Returns:
            GeoScore object or None if not found
        """
        return self.db.query(GeoScore).filter(
            GeoScore.business_profile_id == business_profile_id
        ).order_by(GeoScore.computed_at.desc()).first()
    
    def get_score_explanation(
        self,
        geo_score: GeoScore
    ) -> Dict:
        """
        Generate a human-readable explanation of the score calculation.
        
        Returns:
            Dictionary with formula breakdown and explanation
        """
        return {
            "final_geo_score": float(geo_score.final_geo_score),
            "formula": "GEO_SCORE = (Presence × 0.35) + (Accuracy × 0.35) + (Trust × 0.20) + HallucinationPenalty",
            "calculation": {
                "presence": {
                    "score": float(geo_score.presence_score),
                    "weight": 0.35,
                    "contribution": float(geo_score.presence_score * Decimal("0.35"))
                },
                "accuracy": {
                    "score": float(geo_score.accuracy_score),
                    "weight": 0.35,
                    "contribution": float(geo_score.accuracy_score * Decimal("0.35"))
                },
                "trust": {
                    "score": float(geo_score.trust_score),
                    "weight": 0.20,
                    "contribution": float(geo_score.trust_score * Decimal("0.20"))
                },
                "hallucination_penalty": {
                    "penalty": float(geo_score.hallucination_penalty),
                    "range": "-10 to 0",
                    "contribution": float(geo_score.hallucination_penalty)
                }
            },
            "total_calculation": (
                f"{float(geo_score.presence_score)} × 0.35 + "
                f"{float(geo_score.accuracy_score)} × 0.35 + "
                f"{float(geo_score.trust_score)} × 0.20 + "
                f"{float(geo_score.hallucination_penalty)} = "
                f"{float(geo_score.final_geo_score)}"
            ),
            "computation_metadata": {
                "method": geo_score.computation_method,
                "prompt_results_used": geo_score.prompt_results_count,
                "computed_at": geo_score.computed_at.isoformat() if geo_score.computed_at else None
            }
        }
