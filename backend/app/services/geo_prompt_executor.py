"""
GEO Prompt Execution Service
=============================

Executes GEO analysis prompts using LangChain against real business data.
Temperature ≤0.3 for deterministic outputs. Validates against JSON schemas.
"""

import json
import time
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session
from loguru import logger

from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from langchain.output_parsers import PydanticOutputParser
from pydantic import BaseModel, ValidationError

from app.models.geo_prompt import GeoPrompt, GeoPromptResult, ExecutionStatus
from app.models.business_profile import BusinessProfile
from app.models.website_content import WebsiteContent
from app.models.google_review import GoogleReview
from app.models.brand_mention import BrandMention


class GeoPromptExecutorService:
    """Execute GEO prompts using LangChain with real business data."""
    
    def __init__(self, db: Session, openai_api_key: str):
        """Initialize executor with database session and OpenAI API key."""
        self.db = db
        self.openai_api_key = openai_api_key
        # Initialize LangChain LLM with temperature ≤0.3
        self.llm = ChatOpenAI(
            model="gpt-4",
            temperature=0.2,
            openai_api_key=openai_api_key,
            max_tokens=1000
        )
    
    def assemble_business_context(self, business_profile_id: str) -> Dict[str, Any]:
        """
        Assemble complete business context from all data sources.
        
        Returns:
            Dict with website_content, google_reviews, brand_mentions, business_metadata
        """
        # Get business profile
        business = self.db.query(BusinessProfile).filter(
            BusinessProfile.id == business_profile_id
        ).first()
        
        if not business:
            raise ValueError(f"Business profile {business_profile_id} not found")
        
        # Get website content
        website_pages = self.db.query(WebsiteContent).filter(
            WebsiteContent.business_profile_id == business_profile_id
        ).all()
        
        # Get Google reviews
        google_reviews = self.db.query(GoogleReview).filter(
            GoogleReview.business_profile_id == business_profile_id
        ).all()
        
        # Get brand mentions
        brand_mentions = self.db.query(BrandMention).filter(
            BrandMention.business_profile_id == business_profile_id
        ).all()
        
        context = {
            "business_metadata": {
                "id": str(business.id),
                "name": business.business_name,
                "category": business.category,
                "website_url": business.website_url,
                "description": business.description
            },
            "website_content": [
                {
                    "page_id": str(page.id),
                    "url": page.url,
                    "title": page.page_title,
                    "content": page.text_content[:2000] if page.text_content else "",  # Limit to 2000 chars per page
                    "meta_description": page.meta_description
                }
                for page in website_pages[:10]  # Limit to 10 pages
            ],
            "google_reviews": [
                {
                    "review_id": str(review.id),
                    "rating": review.rating,
                    "text": review.text_content,
                    "reviewer_name": review.reviewer_name,
                    "sentiment": review.sentiment.value if review.sentiment else None,
                    "created_at": review.review_date.isoformat() if review.review_date else None
                }
                for review in google_reviews[:50]  # Limit to 50 reviews
            ],
            "brand_mentions": [
                {
                    "mention_id": str(mention.id),
                    "source_url": mention.source_url,
                    "source_domain": mention.source_domain,
                    "page_title": mention.page_title,
                    "snippet": mention.extracted_snippet,
                    "mention_type": mention.mention_type.value if mention.mention_type else None,
                    "sentiment": mention.sentiment.value if mention.sentiment else None
                }
                for mention in brand_mentions[:30]  # Limit to 30 mentions
            ]
        }
        
        logger.info(f"Assembled context for {business.business_name}: "
                   f"{len(context['website_content'])} pages, "
                   f"{len(context['google_reviews'])} reviews, "
                   f"{len(context['brand_mentions'])} mentions")
        
        return context
    
    def format_context_for_prompt(self, context: Dict[str, Any], prompt_category: str) -> str:
        """
        Format business context into a structured string for the prompt.
        Only include relevant data based on prompt category.
        """
        formatted = []
        
        # Always include business metadata
        formatted.append("=== BUSINESS INFORMATION ===")
        formatted.append(f"Name: {context['business_metadata']['name']}")
        formatted.append(f"Category: {context['business_metadata']['category']}")
        formatted.append(f"Website: {context['business_metadata']['website_url']}")
        if context['business_metadata']['description']:
            formatted.append(f"Description: {context['business_metadata']['description']}")
        formatted.append("")
        
        # Include website content for most categories
        if context['website_content'] and prompt_category in [
            'entity_definition', 'category_visibility', 'local_discovery'
        ]:
            formatted.append("=== WEBSITE CONTENT ===")
            for page in context['website_content'][:5]:
                formatted.append(f"Page: {page['url']}")
                formatted.append(f"Title: {page['title']}")
                if page['content']:
                    formatted.append(f"Content: {page['content'][:500]}...")
                formatted.append("")
        
        # Include reviews for trust/review analysis
        if context['google_reviews'] and prompt_category in ['trust_reviews', 'comparison_alternatives']:
            formatted.append("=== GOOGLE REVIEWS ===")
            for review in context['google_reviews'][:20]:
                formatted.append(f"Rating: {review['rating']}/5")
                formatted.append(f"Text: {review['text']}")
                formatted.append(f"Sentiment: {review['sentiment']}")
                formatted.append("")
        
        # Include brand mentions for visibility and comparison
        if context['brand_mentions'] and prompt_category in [
            'category_visibility', 'comparison_alternatives', 'local_discovery'
        ]:
            formatted.append("=== BRAND MENTIONS ===")
            for mention in context['brand_mentions'][:15]:
                formatted.append(f"Source: {mention['source_url']}")
                formatted.append(f"Title: {mention['page_title']}")
                formatted.append(f"Snippet: {mention['snippet']}")
                formatted.append(f"Type: {mention['mention_type']}")
                formatted.append("")
        
        return "\n".join(formatted)
    
    def validate_json_output(self, output: str, expected_schema: Dict[str, Any]) -> Tuple[bool, Optional[Dict], Optional[str]]:
        """
        Validate LLM output against expected JSON schema.
        
        Returns:
            (is_valid, parsed_json, error_message)
        """
        try:
            # Try to parse as JSON
            parsed = json.loads(output)
            
            # Basic schema validation (check required fields)
            if "required" in expected_schema:
                for field in expected_schema["required"]:
                    if field not in parsed:
                        return False, None, f"Missing required field: {field}"
            
            return True, parsed, None
            
        except json.JSONDecodeError as e:
            return False, None, f"Invalid JSON: {str(e)}"
        except Exception as e:
            return False, None, f"Validation error: {str(e)}"
    
    def extract_citations(self, structured_response: Dict[str, Any], context: Dict[str, Any]) -> List[Dict[str, str]]:
        """
        Extract citation information from the structured response.
        Match source_url references back to actual data sources.
        """
        citations = []
        
        def find_citations_recursive(obj, path=""):
            """Recursively search for source_url or source references."""
            if isinstance(obj, dict):
                if "source_url" in obj and obj["source_url"]:
                    citations.append({
                        "type": "website",
                        "url": obj["source_url"],
                        "path": path
                    })
                if "review_id" in obj and obj["review_id"]:
                    citations.append({
                        "type": "review",
                        "id": obj["review_id"],
                        "path": path
                    })
                if "mention_id" in obj and obj["mention_id"]:
                    citations.append({
                        "type": "mention",
                        "id": obj["mention_id"],
                        "path": path
                    })
                for key, value in obj.items():
                    find_citations_recursive(value, f"{path}.{key}" if path else key)
            elif isinstance(obj, list):
                for i, item in enumerate(obj):
                    find_citations_recursive(item, f"{path}[{i}]")
        
        find_citations_recursive(structured_response)
        
        # Remove duplicates
        seen = set()
        unique_citations = []
        for citation in citations:
            key = f"{citation['type']}:{citation.get('url') or citation.get('id')}"
            if key not in seen:
                seen.add(key)
                unique_citations.append(citation)
        
        return unique_citations
    
    def execute_single_prompt(
        self,
        prompt: GeoPrompt,
        business_profile_id: str,
        user_id: str,
        context: Dict[str, Any],
        max_retries: int = 1
    ) -> GeoPromptResult:
        """
        Execute a single GEO prompt using LangChain.
        
        Args:
            prompt: The GeoPrompt to execute
            business_profile_id: Target business
            user_id: User executing the prompt
            context: Pre-assembled business context
            max_retries: Number of retries on validation failure
            
        Returns:
            GeoPromptResult with execution details
        """
        start_time = time.time()
        
        # Create result record with PENDING status
        result = GeoPromptResult(
            id=str(uuid.uuid4()),
            prompt_id=prompt.id,
            business_profile_id=business_profile_id,
            user_id=user_id,
            execution_status=ExecutionStatus.PENDING,
            execution_timestamp=datetime.utcnow(),
            model_name="gpt-4",
            model_version="gpt-4-0613",
            retry_count=0,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        try:
            # Update to IN_PROGRESS
            result.execution_status = ExecutionStatus.IN_PROGRESS
            self.db.add(result)
            self.db.commit()
            
            logger.info(f"Executing prompt: {prompt.prompt_id} ({prompt.title})")
            
            # Format context based on prompt category
            formatted_context = self.format_context_for_prompt(context, prompt.category.value)
            
            # Build LangChain prompt
            prompt_template = ChatPromptTemplate.from_messages([
                ("system", prompt.system_message or "You are a business analyst providing factual analysis."),
                ("user", f"{prompt.prompt_text}\n\n### BUSINESS DATA ###\n{formatted_context}")
            ])
            
            # Execute with retry logic
            raw_response = None
            structured_response = None
            validation_error = None
            
            for attempt in range(max_retries + 1):
                try:
                    # Create LangChain chain
                    chain = prompt_template | self.llm
                    
                    # Execute
                    response = chain.invoke({})
                    raw_response = response.content
                    
                    logger.debug(f"LLM Response (attempt {attempt + 1}): {raw_response[:200]}...")
                    
                    # Validate JSON output
                    is_valid, parsed_json, error_msg = self.validate_json_output(
                        raw_response,
                        prompt.expected_output_schema
                    )
                    
                    if is_valid:
                        structured_response = parsed_json
                        validation_error = None
                        break
                    else:
                        validation_error = error_msg
                        result.retry_count = attempt + 1
                        logger.warning(f"Validation failed (attempt {attempt + 1}): {error_msg}")
                        
                        if attempt < max_retries:
                            logger.info(f"Retrying prompt {prompt.prompt_id}...")
                            time.sleep(1)  # Brief delay before retry
                
                except Exception as e:
                    logger.error(f"Execution error (attempt {attempt + 1}): {str(e)}")
                    validation_error = str(e)
                    if attempt < max_retries:
                        time.sleep(1)
            
            # Calculate execution time
            execution_duration = int((time.time() - start_time) * 1000)
            
            # Determine final status
            if structured_response:
                result.execution_status = ExecutionStatus.COMPLETED
                result.raw_response = raw_response
                result.structured_response = structured_response
                
                # Extract citations
                result.cited_sources = self.extract_citations(structured_response, context)
                
                # Simple confidence score based on completeness
                result.confidence_score = self.calculate_confidence_score(structured_response, prompt.expected_output_schema)
                
                result.validation_passed = "true"
                result.validation_errors = None
                
                logger.success(f"✓ Prompt {prompt.prompt_id} completed successfully")
            else:
                result.execution_status = ExecutionStatus.FAILED
                result.raw_response = raw_response
                result.error_message = validation_error or "Failed to generate valid output"
                result.validation_passed = "false"
                result.validation_errors = {"error": validation_error}
                
                logger.error(f"✗ Prompt {prompt.prompt_id} failed: {validation_error}")
            
            result.execution_duration_ms = execution_duration
            result.updated_at = datetime.utcnow()
            
            self.db.commit()
            
            return result
            
        except Exception as e:
            logger.error(f"Fatal error executing prompt {prompt.prompt_id}: {str(e)}")
            result.execution_status = ExecutionStatus.FAILED
            result.error_message = str(e)
            result.execution_duration_ms = int((time.time() - start_time) * 1000)
            self.db.commit()
            return result
    
    def calculate_confidence_score(self, structured_response: Dict[str, Any], expected_schema: Dict[str, Any]) -> float:
        """
        Calculate confidence score (0.0-1.0) based on response completeness.
        """
        if not structured_response:
            return 0.0
        
        # Count filled fields vs required fields
        required_fields = expected_schema.get("required", [])
        if not required_fields:
            return 0.9  # Default high confidence if no specific requirements
        
        filled_count = sum(1 for field in required_fields if field in structured_response and structured_response[field])
        total_count = len(required_fields)
        
        base_score = filled_count / total_count if total_count > 0 else 0.5
        
        # Adjust based on data richness
        total_chars = len(json.dumps(structured_response))
        if total_chars > 500:
            base_score = min(base_score + 0.1, 1.0)
        
        return round(base_score, 3)
    
    def execute_all_prompts(
        self,
        business_profile_id: str,
        user_id: str,
        category_filter: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Execute all active GEO prompts for a business.
        
        Args:
            business_profile_id: Target business
            user_id: User executing the prompts
            category_filter: Optional category to filter prompts
            
        Returns:
            Execution summary with stats
        """
        start_time = time.time()
        
        logger.info(f"Starting GEO prompt execution for business {business_profile_id}")
        
        # Assemble business context once
        context = self.assemble_business_context(business_profile_id)
        
        # Load prompts
        query = self.db.query(GeoPrompt).filter(
            GeoPrompt.is_active == "true"
        )
        
        if category_filter:
            query = query.filter(GeoPrompt.category == category_filter)
        
        prompts = query.order_by(
            GeoPrompt.category,
            GeoPrompt.execution_order
        ).all()
        
        logger.info(f"Found {len(prompts)} prompts to execute")
        
        # Execute each prompt
        results = []
        succeeded = 0
        failed = 0
        
        for i, prompt in enumerate(prompts, 1):
            logger.info(f"[{i}/{len(prompts)}] Executing {prompt.prompt_id}...")
            
            result = self.execute_single_prompt(
                prompt=prompt,
                business_profile_id=business_profile_id,
                user_id=user_id,
                context=context
            )
            
            results.append(result)
            
            if result.execution_status == ExecutionStatus.COMPLETED:
                succeeded += 1
            else:
                failed += 1
        
        total_duration = int((time.time() - start_time) * 1000)
        
        summary = {
            "total": len(prompts),
            "succeeded": succeeded,
            "failed": failed,
            "duration_ms": total_duration,
            "results": [
                {
                    "prompt_id": r.prompt.prompt_id,
                    "status": r.execution_status.value,
                    "duration_ms": r.execution_duration_ms
                }
                for r in results
            ]
        }
        
        logger.success(f"Execution complete: {succeeded} succeeded, {failed} failed in {total_duration}ms")
        
        return summary
