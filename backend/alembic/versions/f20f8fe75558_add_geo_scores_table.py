"""add_geo_scores_table

Revision ID: f20f8fe75558
Revises: d8e5f9a3b4c2
Create Date: 2026-01-28 08:58:26.904634

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f20f8fe75558'
down_revision: Union[str, Sequence[str], None] = 'd8e5f9a3b4c2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Drop old geo_scores table if it exists (from old schema)
    op.execute("DROP TABLE IF EXISTS geo_scores CASCADE")
    
    # Create geo_scores table for GEO scoring engine
    op.execute("""
        CREATE TABLE geo_scores (
            id VARCHAR(36) PRIMARY KEY,
            business_profile_id VARCHAR(36) NOT NULL,
            user_id VARCHAR(36) NOT NULL,
            
            -- Score components (0-100 scale)
            presence_score NUMERIC(5,2) NOT NULL DEFAULT 0.00,
            accuracy_score NUMERIC(5,2) NOT NULL DEFAULT 0.00,
            trust_score NUMERIC(5,2) NOT NULL DEFAULT 0.00,
            hallucination_penalty NUMERIC(5,2) NOT NULL DEFAULT 0.00,
            
            -- Final GEO score
            final_geo_score NUMERIC(5,2) NOT NULL DEFAULT 0.00,
            
            -- Detailed breakdowns (JSON)
            presence_breakdown JSON,
            accuracy_breakdown JSON,
            trust_breakdown JSON,
            hallucination_breakdown JSON,
            
            -- Computation metadata
            prompt_results_count INTEGER NOT NULL DEFAULT 0,
            computation_method VARCHAR(50) DEFAULT 'v1.0',
            computed_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
            
            -- Audit fields
            created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
            updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
            
            -- Foreign keys
            CONSTRAINT fk_geo_scores_business FOREIGN KEY (business_profile_id) 
                REFERENCES business_profiles(id) ON DELETE CASCADE,
            CONSTRAINT fk_geo_scores_user FOREIGN KEY (user_id) 
                REFERENCES users(id) ON DELETE CASCADE,
                
            -- Constraints
            CONSTRAINT check_presence_score CHECK (presence_score >= 0 AND presence_score <= 100),
            CONSTRAINT check_accuracy_score CHECK (accuracy_score >= 0 AND accuracy_score <= 100),
            CONSTRAINT check_trust_score CHECK (trust_score >= 0 AND trust_score <= 100),
            CONSTRAINT check_hallucination_penalty CHECK (hallucination_penalty >= -10 AND hallucination_penalty <= 0),
            CONSTRAINT check_final_geo_score CHECK (final_geo_score >= 0 AND final_geo_score <= 100)
        )
    """)
    
    # Create indexes
    op.execute("CREATE INDEX idx_geo_scores_business ON geo_scores(business_profile_id)")
    op.execute("CREATE INDEX idx_geo_scores_user ON geo_scores(user_id)")
    op.execute("CREATE INDEX idx_geo_scores_computed_at ON geo_scores(computed_at DESC)")


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DROP TABLE IF EXISTS geo_scores CASCADE")
