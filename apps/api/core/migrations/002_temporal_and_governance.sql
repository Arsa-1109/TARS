-- apps/api/core/migrations/002_temporal_and_governance.sql
-- Temporal reasoning, cryptographic audit chains, and background job durability (Items 145, 149, 150)

CREATE TABLE IF NOT EXISTS action_receipts (
    receipt_id TEXT PRIMARY KEY,
    action_id TEXT NOT NULL,
    actor TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'COMPLETED',
    executed_at INTEGER NOT NULL DEFAULT 0,
    duration_ms INTEGER DEFAULT 0,
    parameters_hash TEXT NOT NULL DEFAULT '',
    result_summary TEXT,
    rollback_payload TEXT,
    audit_block_id TEXT,
    organisation_id TEXT NOT NULL DEFAULT 'CMP-GENESIS-01',
    tool TEXT DEFAULT '',
    payload_hash TEXT DEFAULT '',
    timestamp TEXT DEFAULT '',
    policy_version TEXT DEFAULT '',
    rollback_hook TEXT,
    chain_hash TEXT DEFAULT '',
    prev_chain_hash TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_receipts_action_id ON action_receipts(action_id);
CREATE INDEX IF NOT EXISTS idx_action_receipts_org ON action_receipts(organisation_id);
CREATE INDEX IF NOT EXISTS idx_receipts_chain_hash ON action_receipts(chain_hash);

CREATE TABLE IF NOT EXISTS durable_jobs (
    job_id TEXT PRIMARY KEY,
    job_type TEXT NOT NULL,
    payload TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'RETRYING')),
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    idempotency_key TEXT UNIQUE,
    error TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_durable_jobs_status ON durable_jobs(status);
