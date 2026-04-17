"""add_intelligence_engine_tables

Revision ID: a1b2c3d4e5f6
Revises: f20f8fe75558
Create Date: 2026-03-07

Creates 5 tables for the Intelligence Engine:
- canonical_entities  (Module 1)
- gap_issues          (Module 2)
- reinforcement_tasks (Module 3)
- simulation_runs     (Module 4)
- reasoning_analyses  (Module 5)
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'f20f8fe75558'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- canonical_entities ---
    op.execute("""
        CREATE TABLE IF NOT EXISTS canonical_entities (
            id VARCHAR(36) PRIMARY KEY,
            business_profile_id VARCHAR(36) NOT NULL UNIQUE,
            primary_category VARCHAR(255) NOT NULL,
            secondary_categories JSON DEFAULT '[]',
            services JSON DEFAULT '[]',
            positioning_statement TEXT,
            icp JSON DEFAULT '{}',
            geo_scope JSON DEFAULT '{}',
            approved_terms JSON DEFAULT '[]',
            vocabulary_clusters JSON DEFAULT '[]',
            raw_signals JSON DEFAULT '{}',
            version INTEGER NOT NULL DEFAULT 1,
            computed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            CONSTRAINT fk_ce_business FOREIGN KEY (business_profile_id)
                REFERENCES business_profiles(id) ON DELETE CASCADE
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_ce_business ON canonical_entities(business_profile_id)")

    # --- gap_issues ---
    op.execute("DROP TYPE IF EXISTS gaptype CASCADE")
    op.execute("""
        CREATE TYPE gaptype AS ENUM (
            'category_mismatch','service_drift','vertical_absence',
            'missing_faq','weak_geo_binding','inconsistent_vocabulary'
        )
    """)
    op.execute("DROP TYPE IF EXISTS gapseverity CASCADE")
    op.execute("CREATE TYPE gapseverity AS ENUM ('critical','high','medium','low')")
    op.execute("DROP TYPE IF EXISTS gapstatus CASCADE")
    op.execute("CREATE TYPE gapstatus AS ENUM ('active','resolved','dismissed')")

    op.execute("""
        CREATE TABLE IF NOT EXISTS gap_issues (
            id VARCHAR(36) PRIMARY KEY,
            business_profile_id VARCHAR(36) NOT NULL,
            canonical_entity_id VARCHAR(36) NOT NULL,
            gap_type gaptype NOT NULL,
            severity gapseverity NOT NULL,
            status gapstatus NOT NULL DEFAULT 'active',
            title VARCHAR(500) NOT NULL,
            description TEXT NOT NULL,
            evidence JSON DEFAULT '{}',
            affected_dimensions JSON DEFAULT '[]',
            detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            resolved_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            CONSTRAINT fk_gi_business FOREIGN KEY (business_profile_id)
                REFERENCES business_profiles(id) ON DELETE CASCADE,
            CONSTRAINT fk_gi_entity FOREIGN KEY (canonical_entity_id)
                REFERENCES canonical_entities(id) ON DELETE CASCADE
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_gi_business ON gap_issues(business_profile_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_gi_entity ON gap_issues(canonical_entity_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_gi_type ON gap_issues(gap_type)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_gi_severity ON gap_issues(severity)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_gi_status ON gap_issues(status)")

    # --- reinforcement_tasks ---
    op.execute("DROP TYPE IF EXISTS taskimpact CASCADE")
    op.execute("CREATE TYPE taskimpact AS ENUM ('high','medium','low')")
    op.execute("DROP TYPE IF EXISTS taskstatus CASCADE")
    op.execute("CREATE TYPE taskstatus AS ENUM ('pending','in_progress','completed','skipped')")

    op.execute("""
        CREATE TABLE IF NOT EXISTS reinforcement_tasks (
            id VARCHAR(36) PRIMARY KEY,
            gap_issue_id VARCHAR(36) NOT NULL,
            business_profile_id VARCHAR(36) NOT NULL,
            action_type VARCHAR(100) NOT NULL,
            title VARCHAR(500) NOT NULL,
            description TEXT NOT NULL,
            implementation_hint TEXT,
            impact taskimpact NOT NULL DEFAULT 'medium',
            priority_order INTEGER NOT NULL DEFAULT 0,
            status taskstatus NOT NULL DEFAULT 'pending',
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            CONSTRAINT fk_rt_gap FOREIGN KEY (gap_issue_id)
                REFERENCES gap_issues(id) ON DELETE CASCADE,
            CONSTRAINT fk_rt_business FOREIGN KEY (business_profile_id)
                REFERENCES business_profiles(id) ON DELETE CASCADE
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_rt_gap ON reinforcement_tasks(gap_issue_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_rt_business ON reinforcement_tasks(business_profile_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_rt_status ON reinforcement_tasks(status)")

    # --- simulation_runs ---
    op.execute("""
        CREATE TABLE IF NOT EXISTS simulation_runs (
            id VARCHAR(36) PRIMARY KEY,
            business_profile_id VARCHAR(36) NOT NULL,
            user_id VARCHAR(36) NOT NULL,
            run_type VARCHAR(20) NOT NULL DEFAULT 'full',
            config_overrides JSON,
            total_prompts INTEGER NOT NULL DEFAULT 0,
            mentioned_count INTEGER NOT NULL DEFAULT 0,
            not_mentioned_count INTEGER NOT NULL DEFAULT 0,
            avg_confidence NUMERIC(4,3),
            total_duration_ms INTEGER NOT NULL DEFAULT 0,
            prompt_results_snapshot JSON DEFAULT '[]',
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            completed_at TIMESTAMP WITH TIME ZONE,
            CONSTRAINT fk_sr_business FOREIGN KEY (business_profile_id)
                REFERENCES business_profiles(id) ON DELETE CASCADE,
            CONSTRAINT fk_sr_user FOREIGN KEY (user_id)
                REFERENCES users(id) ON DELETE CASCADE
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_sr_business ON simulation_runs(business_profile_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_sr_user ON simulation_runs(user_id)")

    # --- reasoning_analyses ---
    op.execute("DROP TYPE IF EXISTS reinforcementclass CASCADE")
    op.execute("""
        CREATE TYPE reinforcementclass AS ENUM (
            'authority_gap','relevance_gap','visibility_gap','content_gap','geographic_gap'
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS reasoning_analyses (
            id VARCHAR(36) PRIMARY KEY,
            business_profile_id VARCHAR(36) NOT NULL,
            simulation_run_id VARCHAR(36) NOT NULL,
            prompt_id VARCHAR(100) NOT NULL,
            root_cause TEXT NOT NULL,
            missing_signals JSON DEFAULT '[]',
            reinforcement_class reinforcementclass NOT NULL,
            suggested_actions JSON DEFAULT '[]',
            confidence NUMERIC(4,3),
            analyzed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            CONSTRAINT fk_ra_business FOREIGN KEY (business_profile_id)
                REFERENCES business_profiles(id) ON DELETE CASCADE,
            CONSTRAINT fk_ra_sim FOREIGN KEY (simulation_run_id)
                REFERENCES simulation_runs(id) ON DELETE CASCADE
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_ra_business ON reasoning_analyses(business_profile_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_ra_sim ON reasoning_analyses(simulation_run_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_ra_prompt ON reasoning_analyses(prompt_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_ra_class ON reasoning_analyses(reinforcement_class)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS reasoning_analyses CASCADE")
    op.execute("DROP TABLE IF EXISTS simulation_runs CASCADE")
    op.execute("DROP TABLE IF EXISTS reinforcement_tasks CASCADE")
    op.execute("DROP TABLE IF EXISTS gap_issues CASCADE")
    op.execute("DROP TABLE IF EXISTS canonical_entities CASCADE")
    op.execute("DROP TYPE IF EXISTS reinforcementclass CASCADE")
    op.execute("DROP TYPE IF EXISTS taskstatus CASCADE")
    op.execute("DROP TYPE IF EXISTS taskimpact CASCADE")
    op.execute("DROP TYPE IF EXISTS gapstatus CASCADE")
    op.execute("DROP TYPE IF EXISTS gapseverity CASCADE")
    op.execute("DROP TYPE IF EXISTS gaptype CASCADE")
