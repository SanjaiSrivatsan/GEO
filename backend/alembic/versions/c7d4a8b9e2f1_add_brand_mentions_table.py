"""add_brand_mentions_table

Revision ID: c7d4a8b9e2f1
Revises: 89aa519ee418
Create Date: 2026-01-27 10:22:30.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c7d4a8b9e2f1'
down_revision: Union[str, Sequence[str], None] = '89aa519ee418'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create enum types
    op.execute("DROP TYPE IF EXISTS mentiontype CASCADE")
    op.execute("DROP TYPE IF EXISTS mentionstatus CASCADE")
    op.execute("DROP TYPE IF EXISTS sentimenttype CASCADE")
    
    op.execute("CREATE TYPE mentiontype AS ENUM ('directory', 'review', 'article', 'blog', 'comparison', 'social', 'other')")
    op.execute("CREATE TYPE mentionstatus AS ENUM ('discovered', 'processed', 'ignored')")
    op.execute("CREATE TYPE sentimenttype AS ENUM ('positive', 'neutral', 'negative', 'unknown')")
    
    # Create brand_mentions table
    op.execute("""
        CREATE TABLE brand_mentions (
            id VARCHAR(36) PRIMARY KEY,
            business_profile_id VARCHAR(36) NOT NULL REFERENCES business_profiles(id),
            user_id VARCHAR(36) NOT NULL REFERENCES users(id),
            source_url TEXT NOT NULL,
            source_domain VARCHAR(255) NOT NULL,
            canonical_url TEXT,
            page_title TEXT,
            extracted_snippet TEXT,
            full_text TEXT,
            mention_type mentiontype NOT NULL DEFAULT 'other',
            sentiment sentimenttype NOT NULL DEFAULT 'unknown',
            status mentionstatus NOT NULL DEFAULT 'discovered',
            search_query VARCHAR(500),
            search_position VARCHAR(10),
            discovery_method VARCHAR(100),
            discovered_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
            processed_at TIMESTAMP WITHOUT TIME ZONE,
            created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
            updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
        )
    """)
    
    # Create indexes
    op.create_index('ix_brand_mentions_business_profile_id', 'brand_mentions', ['business_profile_id'])
    op.create_index('ix_brand_mentions_user_id', 'brand_mentions', ['user_id'])
    op.create_index('ix_brand_mentions_source_domain', 'brand_mentions', ['source_domain'])
    op.create_index('ix_brand_mentions_mention_type', 'brand_mentions', ['mention_type'])
    op.create_index('ix_brand_mentions_sentiment', 'brand_mentions', ['sentiment'])
    op.create_index('ix_brand_mentions_status', 'brand_mentions', ['status'])
    op.create_index('ix_brand_mentions_discovered_at', 'brand_mentions', ['discovered_at'])


def downgrade() -> None:
    """Downgrade schema."""
    # Drop indexes
    op.drop_index('ix_brand_mentions_discovered_at', 'brand_mentions')
    op.drop_index('ix_brand_mentions_status', 'brand_mentions')
    op.drop_index('ix_brand_mentions_sentiment', 'brand_mentions')
    op.drop_index('ix_brand_mentions_mention_type', 'brand_mentions')
    op.drop_index('ix_brand_mentions_source_domain', 'brand_mentions')
    op.drop_index('ix_brand_mentions_user_id', 'brand_mentions')
    op.drop_index('ix_brand_mentions_business_profile_id', 'brand_mentions')
    
    # Drop table
    op.drop_table('brand_mentions')
    
    # Drop enum types
    op.execute("DROP TYPE IF EXISTS sentimenttype CASCADE")
    op.execute("DROP TYPE IF EXISTS mentionstatus CASCADE")
    op.execute("DROP TYPE IF EXISTS mentiontype CASCADE")
