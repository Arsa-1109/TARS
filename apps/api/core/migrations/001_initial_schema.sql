-- apps/api/core/migrations/001_initial_schema.sql
-- Baseline relational schema with foreign keys and integrity constraints (Items 105, 107)

CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS company_profile (
    id TEXT PRIMARY KEY,
    company_name TEXT NOT NULL,
    website TEXT,
    industry TEXT NOT NULL,
    stage TEXT NOT NULL,
    team_size TEXT NOT NULL,
    runway_months INTEGER CHECK (runway_months IS NULL OR runway_months >= 0),
    liquid_cash REAL DEFAULT 0.0,
    monthly_burn REAL DEFAULT 0.0,
    one_liner TEXT NOT NULL,
    core_thesis TEXT,
    icp TEXT,
    tech_stack TEXT,
    enterprise_policy TEXT DEFAULT 'REJECT_CUSTOM_FORKS',
    pricing_model TEXT DEFAULT 'USAGE_BASED',
    tars_tone TEXT DEFAULT 'CONCISE_EXECUTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('FOUNDER', 'CHIEF_ARCHITECT', 'EXECUTIVE', 'ENGINEER', 'PRODUCT', 'SALES', 'NEW_HIRE', 'GUEST', 'ALL_TEAM')),
    department TEXT NOT NULL,
    clearance TEXT NOT NULL CHECK (clearance IN ('ALL_TEAM', 'CONFIDENTIAL', 'EXECUTIVE_ONLY', 'EXECUTIVE')),
    created_at INTEGER NOT NULL,
    company_id TEXT,
    company_name TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
    session_id TEXT PRIMARY KEY,
    tars_user TEXT NOT NULL,
    tars_role TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER,
    revoked_at INTEGER,
    user_id TEXT,
    organisation_id TEXT
);

CREATE TABLE IF NOT EXISTS documents (
    doc_id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_hash TEXT UNIQUE NOT NULL,
    department TEXT NOT NULL,
    clearance TEXT NOT NULL DEFAULT 'ALL_TEAM' CHECK (clearance IN ('ALL_TEAM', 'CONFIDENTIAL', 'EXECUTIVE_ONLY', 'EXECUTIVE')),
    format TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL CHECK (file_size_bytes >= 0),
    page_count INTEGER NOT NULL DEFAULT 1 CHECK (page_count >= 0),
    table_count INTEGER NOT NULL DEFAULT 0,
    character_count INTEGER NOT NULL DEFAULT 0,
    chunk_count INTEGER NOT NULL DEFAULT 1,
    content TEXT NOT NULL,
    preview TEXT,
    ingested_at INTEGER NOT NULL,
    is_demo INTEGER DEFAULT 0,
    organisation_id TEXT DEFAULT 'CMP-GENESIS-01'
);

CREATE TABLE IF NOT EXISTS memories (
    id TEXT PRIMARY KEY,
    record_type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    source TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    tags TEXT,
    related_ids TEXT,
    vector_ref TEXT,
    clearance TEXT NOT NULL DEFAULT 'ALL_TEAM' CHECK (clearance IN ('ALL_TEAM', 'CONFIDENTIAL', 'EXECUTIVE_ONLY', 'EXECUTIVE')),
    is_demo INTEGER DEFAULT 0,
    organisation_id TEXT DEFAULT 'CMP-GENESIS-01'
);

CREATE INDEX IF NOT EXISTS idx_memories_clearance ON memories(clearance);
CREATE INDEX IF NOT EXISTS idx_memories_timestamp ON memories(timestamp DESC);

CREATE TABLE IF NOT EXISTS action_items (
    id TEXT PRIMARY KEY,
    title TEXT,
    description TEXT NOT NULL,
    owner TEXT NOT NULL,
    assignee TEXT,
    department TEXT DEFAULT 'General',
    priority TEXT DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    deadline INTEGER,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('DETECTED', 'PROPOSED', 'REVIEW_REQUIRED', 'APPROVED', 'REJECTED', 'QUEUED', 'EXECUTING', 'COMPLETED', 'FAILED', 'ROLLED_BACK', 'OPEN', 'IN_PROGRESS', 'DONE', 'PENDING')),
    source_type TEXT NOT NULL,
    source_id TEXT NOT NULL,
    source_offset TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    expires_at INTEGER,
    policy_version TEXT,
    approval_scope TEXT,
    is_demo INTEGER DEFAULT 0,
    organisation_id TEXT DEFAULT 'CMP-GENESIS-01'
);

CREATE INDEX IF NOT EXISTS idx_action_status ON action_items(status);
CREATE INDEX IF NOT EXISTS idx_action_owner ON action_items(owner);

CREATE TABLE IF NOT EXISTS chat_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    chat_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    citations TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON chat_messages(chat_id, created_at ASC);

CREATE TABLE IF NOT EXISTS thinktank_channels (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    topic TEXT,
    organisation_id TEXT DEFAULT 'CMP-GENESIS-01',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS thinktank_messages (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    sender TEXT NOT NULL,
    sender_role TEXT DEFAULT 'ENGINEER',
    sender_type TEXT DEFAULT 'USER',
    text TEXT NOT NULL,
    provenance TEXT,
    is_ai INTEGER DEFAULT 0,
    is_edited INTEGER DEFAULT 0,
    is_deleted INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_thinktank_channel ON thinktank_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_thinktank_created ON thinktank_messages(created_at);

CREATE TABLE IF NOT EXISTS interaction_logs (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    user_id TEXT,
    user_name TEXT,
    user_role TEXT,
    clearance TEXT,
    event_type TEXT NOT NULL,
    query TEXT,
    response TEXT,
    citations TEXT,
    latency_ms REAL DEFAULT 0.0,
    token_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mcp_audit (
    id TEXT PRIMARY KEY,
    tool_name TEXT NOT NULL,
    arguments TEXT NOT NULL,
    actor TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    approval_state TEXT NOT NULL,
    result TEXT,
    error TEXT
);

CREATE TABLE IF NOT EXISTS ingested_files_ledger (
    file_hash TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    organisation_id TEXT NOT NULL DEFAULT 'CMP-GENESIS-01',
    status TEXT NOT NULL DEFAULT 'INDEXED',
    ingested_at INTEGER NOT NULL
);
