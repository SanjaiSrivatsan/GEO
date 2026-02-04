"""add_geo_prompt_tables

Revision ID: d8e5f9a3b4c2
Revises: c7d4a8b9e2f1
Create Date: 2026-01-27 10:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd8e5f9a3b4c2'
down_revision: Union[str, Sequence[str], None] = 'c7d4a8b9e2f1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Drop old geo_prompts table if it exists (from previous schema)
    op.execute("DROP TABLE IF EXISTS geo_prompts CASCADE")
    
    # Create enum types
    op.execute("DROP TYPE IF EXISTS promptcategory CASCADE")
    op.execute("DROP TYPE IF EXISTS executionstatus CASCADE")
    op.execute("DROP TYPE IF EXISTS prompttype CASCADE")
    
    op.execute("""
        CREATE TYPE promptcategory AS ENUM (
            'entity_definition',
            'category_visibility',
            'comparison_alternatives',
            'trust_reviews',
            'local_discovery'
        )
    """)
    
    op.execute("""
        CREATE TYPE executionstatus AS ENUM (
            'pending',
            'in_progress',
            'completed',
            'failed',
            'retrying'
        )
    """)
    
    # Create geo_prompts table
    op.execute("""
        CREATE TABLE geo_prompts (
            id VARCHAR(36) PRIMARY KEY,
            prompt_id VARCHAR(100) UNIQUE NOT NULL,
            version VARCHAR(20) NOT NULL DEFAULT '1.0',
            category promptcategory NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            prompt_text TEXT NOT NULL,
            system_message TEXT,
            temperature NUMERIC(3,2) NOT NULL DEFAULT 0.2,
            max_tokens INTEGER DEFAULT 500,
            expected_output_schema JSON NOT NULL,
            scoring_weight NUMERIC(3,2) NOT NULL DEFAULT 1.0,
            is_active VARCHAR(10) NOT NULL DEFAULT 'true',
            execution_order INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
            updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
        )
    """)
    
    # Create geo_prompt_results table
    op.execute("""
        CREATE TABLE geo_prompt_results (
            id VARCHAR(36) PRIMARY KEY,
            prompt_id VARCHAR(36) NOT NULL REFERENCES geo_prompts(id),
            business_profile_id VARCHAR(36) NOT NULL REFERENCES business_profiles(id),
            user_id VARCHAR(36) NOT NULL REFERENCES users(id),
            execution_status executionstatus NOT NULL DEFAULT 'pending',
            execution_timestamp TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
            execution_duration_ms INTEGER,
            model_name VARCHAR(100),
            model_version VARCHAR(50),
            raw_response TEXT,
            structured_response JSON,
            confidence_score NUMERIC(4,3),
            validation_passed VARCHAR(10) DEFAULT 'true',
            validation_errors JSON,
            cited_sources JSON,
            error_message TEXT,
            retry_count INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
            updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
        )
    """)
    
    # Create indexes
    op.create_index('ix_geo_prompts_prompt_id', 'geo_prompts', ['prompt_id'])
    op.create_index('ix_geo_prompts_category', 'geo_prompts', ['category'])
    
    op.create_index('ix_geo_prompt_results_prompt_id', 'geo_prompt_results', ['prompt_id'])
    op.create_index('ix_geo_prompt_results_business_profile_id', 'geo_prompt_results', ['business_profile_id'])
    op.create_index('ix_geo_prompt_results_user_id', 'geo_prompt_results', ['user_id'])
    op.create_index('ix_geo_prompt_results_execution_status', 'geo_prompt_results', ['execution_status'])
    op.create_index('ix_geo_prompt_results_execution_timestamp', 'geo_prompt_results', ['execution_timestamp'])


def downgrade() -> None:
    """Downgrade schema."""
    # Drop indexes
    op.drop_index('ix_geo_prompt_results_execution_timestamp', 'geo_prompt_results')
    op.drop_index('ix_geo_prompt_results_execution_status', 'geo_prompt_results')
    op.drop_index('ix_geo_prompt_results_user_id', 'geo_prompt_results')
    op.drop_index('ix_geo_prompt_results_business_profile_id', 'geo_prompt_results')
    op.drop_index('ix_geo_prompt_results_prompt_id', 'geo_prompt_results')
    op.drop_index('ix_geo_prompts_category', 'geo_prompts')
    op.drop_index('ix_geo_prompts_prompt_id', 'geo_prompts')
    
    # Drop tables
    op.drop_table('geo_prompt_results')
    op.drop_table('geo_prompts')
    
    # Drop enum types
    op.execute("DROP TYPE IF EXISTS executionstatus CASCADE")
    op.execute("DROP TYPE IF EXISTS promptcategory CASCADE")
