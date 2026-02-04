"""
Seed GEO Prompts Database Script
=================================

Seeds the geo_prompts table with the 22 prompts from the prompt library.
Idempotent: Checks if prompt_id exists before inserting.

Usage:
    python -m app.scripts.seed_geo_prompts
"""

import sys
import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from loguru import logger

from app.core.database import SessionLocal
from app.models.geo_prompt import GeoPrompt, PromptCategory
from app.data.prompt_library import ALL_PROMPTS

def seed_prompts(db: Session) -> dict:
    """Seed prompts into database."""
    stats = {
        "inserted": 0,
        "skipped": 0,
        "errors": []
    }
    
    for prompt_data in ALL_PROMPTS:
        try:
            # Check if prompt already exists
            existing = db.query(GeoPrompt).filter(
                GeoPrompt.prompt_id == prompt_data["prompt_id"]
            ).first()
            
            if existing:
                logger.info(f"Skipping existing prompt: {prompt_data['prompt_id']}")
                stats["skipped"] += 1
                continue
            
            # Create new prompt
            prompt = GeoPrompt(
                id=str(uuid.uuid4()),
                prompt_id=prompt_data["prompt_id"],
                version=prompt_data["version"],
                category=prompt_data["category"],  # Already a string, will be converted to enum by SQLAlchemy
                title=prompt_data["title"],
                description=prompt_data.get("description"),
                prompt_text=prompt_data["prompt_text"],
                system_message=prompt_data.get("system_message"),
                temperature=prompt_data["temperature"],
                max_tokens=prompt_data.get("max_tokens", 500),
                expected_output_schema=prompt_data["expected_output_schema"],
                scoring_weight=prompt_data["scoring_weight"],
                is_active="true",
                execution_order=prompt_data["execution_order"],
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            
            db.add(prompt)
            logger.success(f"Inserted prompt: {prompt_data['prompt_id']} - {prompt_data['title']}")
            stats["inserted"] += 1
            
        except Exception as e:
            logger.error(f"Error inserting prompt {prompt_data['prompt_id']}: {str(e)}")
            stats["errors"].append({
                "prompt_id": prompt_data["prompt_id"],
                "error": str(e)
            })
    
    # Commit all changes
    try:
        db.commit()
        logger.success("All prompts committed to database")
    except Exception as e:
        db.rollback()
        logger.error(f"Error committing prompts: {str(e)}")
        stats["errors"].append({"commit_error": str(e)})
    
    return stats

def main():
    """Main seeding function."""
    logger.info("Starting GEO Prompts seeding...")
    logger.info(f"Total prompts to seed: {len(ALL_PROMPTS)}")
    
    db = SessionLocal()
    try:
        stats = seed_prompts(db)
        
        logger.info("\n" + "="*60)
        logger.info("SEEDING COMPLETE")
        logger.info("="*60)
        logger.info(f"Inserted: {stats['inserted']}")
        logger.info(f"Skipped (already exist): {stats['skipped']}")
        logger.info(f"Errors: {len(stats['errors'])}")
        
        if stats["errors"]:
            logger.warning("\nErrors encountered:")
            for error in stats["errors"]:
                logger.warning(f"  {error}")
        
        if stats["inserted"] > 0:
            logger.success(f"\n✓ Successfully seeded {stats['inserted']} new prompts!")
        
        if stats["errors"]:
            sys.exit(1)
        else:
            sys.exit(0)
            
    except Exception as e:
        logger.error(f"Fatal error during seeding: {str(e)}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    main()
