import sqlite3
import json
import os
import threading
from typing import Optional, List, Dict, Any

def get_db_path() -> str:
    return os.getenv("TARS_DB_PATH", "tars_local.db")

DB_PATH = get_db_path()

class LocalDB:
    def __init__(self):
        self.local = threading.local()

    @property
    def db_path(self) -> str:
        return get_db_path()

    def get_connection(self):
        target_path = self.db_path
        conn = getattr(self.local, "conn", None)
        conn_path = getattr(self.local, "conn_path", None)

        if conn is None or conn_path != target_path:
            if conn is not None:
                try:
                    conn.close()
                except Exception:
                    pass
            db_dir = os.path.dirname(os.path.abspath(target_path))
            if db_dir:
                os.makedirs(db_dir, exist_ok=True)
            conn = sqlite3.connect(target_path, check_same_thread=False, timeout=60.0)
            conn.row_factory = sqlite3.Row
            try:
                conn.execute('PRAGMA journal_mode=WAL;')
                conn.execute('PRAGMA busy_timeout=60000;')
                conn.execute('PRAGMA foreign_keys = ON;')
            except Exception:
                pass
            self.local.conn = conn
            self.local.conn_path = target_path
            # Try loading sqlite-vec extension if available
            try:
                import sqlite_vec
                conn.enable_load_extension(True)
                sqlite_vec.load(conn)
                conn.enable_load_extension(False)
            except ImportError:
                pass
            except Exception as e:
                print(f"Warning: sqlite-vec could not be loaded: {e}")
        return self.local.conn

    def close_connection(self):
        conn = getattr(self.local, "conn", None)
        if conn is not None:
            try:
                conn.close()
            except Exception:
                pass
            self.local.conn = None
            self.local.conn_path = None

    def initialize(self):
        conn = self.get_connection()
        # Ensure WAL mode for safe concurrency and foreign keys (Item 107)
        conn.execute('PRAGMA journal_mode=WAL;')
        conn.execute('PRAGMA foreign_keys = ON;')

        # Run formal ordered migrations (Item 105)
        try:
            from apps.api.core.migration_runner import migration_runner
            migration_runner.run_migrations(conn)
        except Exception as mig_err:
            print(f"Notice: Migration runner execution: {mig_err}")

        cursor = conn.cursor()
        
        # Memory table
        cursor.execute('''
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
                clearance TEXT NOT NULL DEFAULT 'ALL_TEAM'
            )
        ''')
        
        # Chat Sessions table (Persistent Company Knowledge Chatbot)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS chat_sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                title TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_deleted INTEGER DEFAULT 0
            )
        ''')
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id, updated_at DESC);")

        # Chat Messages table (Persistent Company Knowledge Chatbot)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS chat_messages (
                id TEXT PRIMARY KEY,
                chat_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                citations TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_deleted INTEGER DEFAULT 0
            )
        ''')
        cursor.execute("PRAGMA table_info(chat_messages)")
        msg_cols = [row[1] for row in cursor.fetchall()]
        if "chat_id" not in msg_cols:
            if "channel_id" in msg_cols:
                # Non-destructive column addition and backfill without dropping data (Item 106)
                cursor.execute("ALTER TABLE chat_messages ADD COLUMN chat_id TEXT")
                cursor.execute("UPDATE chat_messages SET chat_id = channel_id WHERE chat_id IS NULL")
            else:
                cursor.execute("ALTER TABLE chat_messages ADD COLUMN chat_id TEXT")
        if "role" not in msg_cols:
            cursor.execute("ALTER TABLE chat_messages ADD COLUMN role TEXT")
        if "citations" not in msg_cols:
            cursor.execute("ALTER TABLE chat_messages ADD COLUMN citations TEXT")
        if "is_deleted" not in msg_cols:
            cursor.execute("ALTER TABLE chat_messages ADD COLUMN is_deleted INTEGER DEFAULT 0")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON chat_messages(chat_id, created_at ASC);")
        
        # Audit Log table (Legacy compatibility)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS mcp_audit (
                id TEXT PRIMARY KEY,
                tool_name TEXT NOT NULL,
                arguments TEXT NOT NULL,
                actor TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                approval_state TEXT NOT NULL,
                result TEXT,
                error TEXT
            )
        ''')

        # Action Receipts table (Item 150: Cryptographic hash-chained receipts)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS action_receipts (
                receipt_id TEXT PRIMARY KEY,
                action_id TEXT,
                actor TEXT NOT NULL,
                tool TEXT NOT NULL,
                payload_hash TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                policy_version TEXT NOT NULL,
                rollback_hook TEXT,
                chain_hash TEXT NOT NULL,
                prev_chain_hash TEXT
            )
        ''')
        cursor.execute("PRAGMA table_info(action_receipts);")
        rcpt_cols = [row[1] for row in cursor.fetchall()]
        if "prev_chain_hash" not in rcpt_cols:
            try:
                cursor.execute("ALTER TABLE action_receipts ADD COLUMN prev_chain_hash TEXT;")
            except Exception:
                pass
        
        # Tamper-Evident Chained SHA-256 Audit Ledger
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS audit_ledger (
                sequence_id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_id TEXT UNIQUE NOT NULL,
                timestamp INTEGER NOT NULL,
                actor TEXT NOT NULL,
                organisation_id TEXT NOT NULL,
                action TEXT NOT NULL,
                source TEXT NOT NULL,
                input_hash TEXT NOT NULL,
                result_hash TEXT NOT NULL,
                previous_hash TEXT NOT NULL,
                event_hash TEXT NOT NULL,
                is_valid INTEGER DEFAULT 1
            )
        ''')
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_org_seq ON audit_ledger(organisation_id, sequence_id);")
        
        # Action Hub table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS action_items (
                id TEXT PRIMARY KEY,
                description TEXT NOT NULL,
                owner TEXT NOT NULL,
                deadline INTEGER,
                status TEXT NOT NULL,
                source_type TEXT NOT NULL,
                source_id TEXT NOT NULL,
                source_offset TEXT NOT NULL
            )
        ''')

        # Session table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sessions (
                session_id TEXT PRIMARY KEY,
                tars_user TEXT NOT NULL,
                tars_role TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                expires_at INTEGER,
                revoked_at INTEGER,
                user_id TEXT,
                organisation_id TEXT
            )
        ''')
        for col, col_type in [("expires_at", "INTEGER"), ("revoked_at", "INTEGER"), ("user_id", "TEXT"), ("organisation_id", "TEXT")]:
            try:
                cursor.execute(f"ALTER TABLE sessions ADD COLUMN {col} {col_type};")
            except Exception:
                pass

        # Users table (Custom User Registry)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                role TEXT NOT NULL,
                department TEXT NOT NULL,
                clearance TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                company_id TEXT,
                company_name TEXT
            )
        ''')

        # Safe schema migration for existing SQLite databases
        cursor.execute("PRAGMA table_info(users)")
        existing_cols = [row[1] for row in cursor.fetchall()]
        if "company_id" not in existing_cols:
            cursor.execute("ALTER TABLE users ADD COLUMN company_id TEXT")
        if "company_name" not in existing_cols:
            cursor.execute("ALTER TABLE users ADD COLUMN company_name TEXT")


        # Documents table (Persistent Ingestion Lake Catalog)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS documents (
                doc_id TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                file_path TEXT NOT NULL,
                file_hash TEXT UNIQUE NOT NULL,
                department TEXT NOT NULL,
                clearance TEXT NOT NULL,
                format TEXT NOT NULL,
                file_size_bytes INTEGER NOT NULL,
                page_count INTEGER NOT NULL,
                table_count INTEGER NOT NULL,
                character_count INTEGER NOT NULL,
                chunk_count INTEGER NOT NULL,
                content TEXT NOT NULL,
                preview TEXT,
                ingested_at INTEGER NOT NULL,
                is_demo INTEGER DEFAULT 0
            )
        ''')

        # Ingestion Deduplication Ledger (Item 82)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS ingested_files_ledger (
                file_hash TEXT PRIMARY KEY,
                file_path TEXT,
                filename TEXT,
                file_size_bytes INTEGER,
                status TEXT,
                detected_at REAL,
                organisation_id TEXT
            )
        ''')

        # Call & Transcription Task Lifecycles (Item 85)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS call_lifecycles (
                task_id TEXT PRIMARY KEY,
                call_id TEXT NOT NULL,
                company_id TEXT,
                file_id TEXT,
                file_path TEXT,
                client_name TEXT,
                status TEXT NOT NULL,
                created_at REAL NOT NULL,
                started_at REAL,
                completed_at REAL,
                duration REAL,
                transcript TEXT,
                error TEXT,
                spec_result TEXT
            )
        ''')

        # Safe schema migrations for demo-tagging, multi-tenancy, and bi-temporal lifecycle
        cursor.execute("PRAGMA table_info(documents)")
        doc_cols = [row[1] for row in cursor.fetchall()]
        if "is_demo" not in doc_cols:
            cursor.execute("ALTER TABLE documents ADD COLUMN is_demo INTEGER DEFAULT 0")
        if "organisation_id" not in doc_cols:
            cursor.execute("ALTER TABLE documents ADD COLUMN organisation_id TEXT NOT NULL DEFAULT 'CMP-GENESIS-01'")
        if "effective_from" not in doc_cols:
            cursor.execute("ALTER TABLE documents ADD COLUMN effective_from INTEGER NOT NULL DEFAULT 0")
        if "effective_to" not in doc_cols:
            cursor.execute("ALTER TABLE documents ADD COLUMN effective_to INTEGER DEFAULT NULL")
        if "superseded_by" not in doc_cols:
            cursor.execute("ALTER TABLE documents ADD COLUMN superseded_by TEXT DEFAULT NULL")
        if "superseded_at" not in doc_cols:
            cursor.execute("ALTER TABLE documents ADD COLUMN superseded_at INTEGER DEFAULT NULL")
        if "source_timestamp" not in doc_cols:
            cursor.execute("ALTER TABLE documents ADD COLUMN source_timestamp INTEGER NOT NULL DEFAULT 0")
        if "confidence_state" not in doc_cols:
            cursor.execute("ALTER TABLE documents ADD COLUMN confidence_state TEXT NOT NULL DEFAULT 'CONFIRMED'")
        if "source_mode" not in doc_cols:
            cursor.execute("ALTER TABLE documents ADD COLUMN source_mode TEXT NOT NULL DEFAULT 'LIVE'")
        if "is_authoritative" not in doc_cols:
            cursor.execute("ALTER TABLE documents ADD COLUMN is_authoritative INTEGER NOT NULL DEFAULT 1")
        if "version" not in doc_cols:
            cursor.execute("ALTER TABLE documents ADD COLUMN version INTEGER NOT NULL DEFAULT 1")
        if "parent_doc_id" not in doc_cols:
            cursor.execute("ALTER TABLE documents ADD COLUMN parent_doc_id TEXT DEFAULT NULL")
        if "version_hash" not in doc_cols:
            cursor.execute("ALTER TABLE documents ADD COLUMN version_hash TEXT DEFAULT NULL")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_documents_bitemporal ON documents(organisation_id, effective_from, effective_to);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_documents_version ON documents(parent_doc_id, version);")

        # Institutional Glossary & Entity Index (Point 22 & 49)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS institutional_glossary (
                term TEXT NOT NULL,
                category TEXT NOT NULL, -- PERSON, COMPANY, DECISION, POLICY, COMMITMENT, TECHNOLOGY, RISK
                definition TEXT NOT NULL,
                canonical_ref TEXT,
                organisation_id TEXT NOT NULL DEFAULT 'CMP-GENESIS-01',
                clearance TEXT NOT NULL DEFAULT 'ALL_TEAM',
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                PRIMARY KEY (term, organisation_id)
            )
        ''')
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_glossary_cat ON institutional_glossary(organisation_id, category);")

        cursor.execute("PRAGMA table_info(action_items)")
        act_cols = [row[1] for row in cursor.fetchall()]
        if "is_demo" not in act_cols:
            cursor.execute("ALTER TABLE action_items ADD COLUMN is_demo INTEGER DEFAULT 0")
        if "organisation_id" not in act_cols:
            cursor.execute("ALTER TABLE action_items ADD COLUMN organisation_id TEXT NOT NULL DEFAULT 'CMP-GENESIS-01'")
        if "lifecycle_status" not in act_cols:
            cursor.execute("ALTER TABLE action_items ADD COLUMN lifecycle_status TEXT NOT NULL DEFAULT 'OPEN'")
        if "effective_from" not in act_cols:
            cursor.execute("ALTER TABLE action_items ADD COLUMN effective_from INTEGER NOT NULL DEFAULT 0")
        if "effective_to" not in act_cols:
            cursor.execute("ALTER TABLE action_items ADD COLUMN effective_to INTEGER DEFAULT NULL")
        if "superseded_by" not in act_cols:
            cursor.execute("ALTER TABLE action_items ADD COLUMN superseded_by TEXT DEFAULT NULL")
        if "source_mode" not in act_cols:
            cursor.execute("ALTER TABLE action_items ADD COLUMN source_mode TEXT NOT NULL DEFAULT 'LIVE'")
        if "is_authoritative" not in act_cols:
            cursor.execute("ALTER TABLE action_items ADD COLUMN is_authoritative INTEGER NOT NULL DEFAULT 1")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_action_items_lifecycle ON action_items(organisation_id, lifecycle_status);")

        cursor.execute("PRAGMA table_info(memories)")
        mem_cols = [row[1] for row in cursor.fetchall()]
        if "clearance" not in mem_cols:
            cursor.execute("ALTER TABLE memories ADD COLUMN clearance TEXT NOT NULL DEFAULT 'ALL_TEAM'")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_memories_clearance ON memories(clearance);")
        if "is_demo" not in mem_cols:
            cursor.execute("ALTER TABLE memories ADD COLUMN is_demo INTEGER DEFAULT 0")
        if "organisation_id" not in mem_cols:
            cursor.execute("ALTER TABLE memories ADD COLUMN organisation_id TEXT NOT NULL DEFAULT 'CMP-GENESIS-01'")
        if "effective_from" not in mem_cols:
            cursor.execute("ALTER TABLE memories ADD COLUMN effective_from INTEGER NOT NULL DEFAULT 0")
        if "effective_to" not in mem_cols:
            cursor.execute("ALTER TABLE memories ADD COLUMN effective_to INTEGER DEFAULT NULL")
        if "superseded_by" not in mem_cols:
            cursor.execute("ALTER TABLE memories ADD COLUMN superseded_by TEXT DEFAULT NULL")
        if "superseded_at" not in mem_cols:
            cursor.execute("ALTER TABLE memories ADD COLUMN superseded_at INTEGER DEFAULT NULL")
        if "source_timestamp" not in mem_cols:
            cursor.execute("ALTER TABLE memories ADD COLUMN source_timestamp INTEGER NOT NULL DEFAULT 0")
        if "confidence_state" not in mem_cols:
            cursor.execute("ALTER TABLE memories ADD COLUMN confidence_state TEXT NOT NULL DEFAULT 'CONFIRMED'")
        if "source_mode" not in mem_cols:
            cursor.execute("ALTER TABLE memories ADD COLUMN source_mode TEXT NOT NULL DEFAULT 'LIVE'")
        if "is_authoritative" not in mem_cols:
            cursor.execute("ALTER TABLE memories ADD COLUMN is_authoritative INTEGER NOT NULL DEFAULT 1")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_memories_bitemporal ON memories(organisation_id, effective_from, effective_to);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_memories_confidence ON memories(confidence_state);")

        # Think Tank Channels table (Workspace 4 Chat Persistence)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS thinktank_channels (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                topic TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_deleted INTEGER DEFAULT 0
            )
        ''')

        # Think Tank Messages table (Workspace 4 Chat CRUD)
        cursor.execute('''
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
            )
        ''')
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_thinktank_channel ON thinktank_messages(channel_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_thinktank_created ON thinktank_messages(created_at)")

        # Interaction Logs table (Hermes-Style Safe Telemetry & Learning)
        cursor.execute('''
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Mark cap table rows as EXECUTIVE_ONLY
        cursor.execute("UPDATE documents SET clearance = 'EXECUTIVE_ONLY' WHERE filename LIKE '%cap_table%' OR filename LIKE '%equity%';")
        cursor.execute("UPDATE memories SET clearance = 'EXECUTIVE_ONLY' WHERE title LIKE '%cap_table%' OR title LIKE '%equity%' OR source LIKE '%cap_table%';")

        # Company Profile table (Genesis Onboarding Institutional Memory)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS company_profile (
                id TEXT PRIMARY KEY,
                company_name TEXT NOT NULL,
                website TEXT,
                industry TEXT NOT NULL,
                stage TEXT NOT NULL,
                team_size TEXT NOT NULL,
                runway_months INTEGER,
                one_liner TEXT NOT NULL,
                core_thesis TEXT,
                icp TEXT,
                tech_stack TEXT,
                enterprise_policy TEXT DEFAULT 'REJECT_CUSTOM_FORKS',
                pricing_model TEXT DEFAULT 'USAGE_BASED',
                tars_tone TEXT DEFAULT 'CONCISE_EXECUTIVE',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Onboarding Modules table (Company-Scoped Dynamic Flight-Plans)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS onboarding_modules (
                id TEXT PRIMARY KEY,
                company_name TEXT NOT NULL,
                company_id TEXT,
                day INTEGER NOT NULL,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                tasks TEXT NOT NULL,
                milestone_tour TEXT,
                order_index INTEGER NOT NULL DEFAULT 0,
                is_published INTEGER NOT NULL DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_onboarding_modules_company ON onboarding_modules(company_name, day);")

        # Onboarding Progress table (User-Scoped Task Completion State)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS onboarding_progress (
                id TEXT PRIMARY KEY,
                company_name TEXT NOT NULL,
                user_id TEXT NOT NULL,
                task_key TEXT NOT NULL,
                completed INTEGER NOT NULL DEFAULT 1,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(company_name, user_id, task_key)
            )
        ''')
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_onboarding_progress_lookup ON onboarding_progress(company_name, user_id);")

        # Seed default demo personas if table is empty
        default_personas = [
            ("usr-alex", "Alex Vance", "alex@aetherflow.ai", "FOUNDER", "Executive", "EXECUTIVE_ONLY"),
            ("usr-elena", "Dr. Elena Rostova", "elena@aetherflow.ai", "ENGINEER", "Engineering", "ALL_TEAM"),
            ("usr-marcus", "Marcus Chen", "marcus@aetherflow.ai", "PRODUCT", "Product", "ALL_TEAM"),
            ("usr-sarah", "Sarah Jenkins", "sarah@aetherflow.ai", "SALES", "Sales & Growth", "ALL_TEAM"),
            ("usr-chloe", "Chloe Dubois", "chloe@aetherflow.ai", "NEW_HIRE", "Engineering", "ALL_TEAM"),
            ("usr-liam", "Liam Patel", "liam@aetherflow.ai", "ENGINEER", "Engineering", "ALL_TEAM"),
        ]
        import time as _t
        now_ts = int(_t.time())
        for u_id, u_name, u_email, u_role, u_dept, u_clr in default_personas:
            cursor.execute('''
                INSERT OR IGNORE INTO users (id, name, email, role, department, clearance, created_at, company_id, company_name)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (u_id, u_name, u_email, u_role, u_dept, u_clr, now_ts, "CMP-GENESIS-01", "AetherFlow Technologies, Inc."))

        # Isolate legacy demo users to Aetherflow
        cursor.execute("UPDATE users SET company_id = 'CMP-GENESIS-01', company_name = 'AetherFlow Technologies, Inc.' WHERE (company_id IS NULL OR company_id = '') AND id LIKE 'usr-%'")

        # Seed default Think Tank channels
        default_channels = [
            ("general", "#general", "Company strategic alignment & cross-functional topics"),
            ("strategy", "#strategy", "Fundraising, board discussions, and runway projections"),
            ("architecture", "#architecture", "Core invariants, database schema evolutions, and refactors"),
        ]
        for ch_id, ch_name, ch_topic in default_channels:
            cursor.execute('''
                INSERT OR IGNORE INTO thinktank_channels (id, name, topic)
                VALUES (?, ?, ?)
            ''', (ch_id, ch_name, ch_topic))

        # Seed default welcome message if thinktank_messages is empty
        cursor.execute("SELECT COUNT(*) FROM thinktank_messages")
        if cursor.fetchone()[0] == 0:
            cursor.execute('''
                INSERT INTO thinktank_messages (id, channel_id, sender, sender_role, sender_type, text, provenance, is_ai)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                "msg-welcome",
                "general",
                "TARS (@TARS)",
                "ASSISTANT",
                "AI",
                "Welcome to Think Tank. Use this workspace to debate strategic changes, roadmap adjustments, and architectural shifts. TARS monitors threads in real-time to alert on policy contradictions and client commitments.",
                "TARS Institutional Kernel",
                1
            ))

        # Seed unredacted Cap Table memory with EXECUTIVE_ONLY clearance and is_demo=1
        cursor.execute('''
            INSERT OR IGNORE INTO memories (id, record_type, title, content, source, timestamp, tags, clearance, is_demo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            "MEM-CAP-TABLE-SEED",
            "DOCUMENT",
            "AetherFlow Cap Table & Founder Equity Allocation (Series Seed Unredacted)",
            "Confidential Cap Table Series Seed Unredacted: Total Authorized Shares: 10,000,000. Alex Vance (Founder & CEO): 4,500,000 shares (45.0% founder equity). Dr. Elena Rostova (Co-Founder & CTO): 3,000,000 shares (30.0% equity). Seed Investor Syndicate: 1,500,000 shares (15.0% preferred stock). Unallocated Employee Stock Option Pool (ESOP): 1,000,000 shares (10.0%). Valuation: $15M post-money valuation at $1.50 per share. Restricted Founder and Executive Clearance Only.",
            "CAP_TABLE_UNREDACTED",
            now_ts,
            "equity,cap_table,shares,executive,valuation",
            "EXECUTIVE_ONLY",
            1
        ))
        cursor.execute("UPDATE memories SET is_demo = 1 WHERE id = 'MEM-CAP-TABLE-SEED' OR title LIKE '%AetherFlow%';")

        # ==========================================
        # PHASE 3: GOVERNED ACTION HUB TABLES (Points 11, 12, 90-94)
        # ==========================================
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS action_items (
                id TEXT PRIMARY KEY,
                title TEXT,
                description TEXT NOT NULL,
                action_type TEXT NOT NULL DEFAULT 'GENERIC',
                owner TEXT NOT NULL DEFAULT 'Unassigned',
                assignee TEXT,
                department TEXT DEFAULT 'General',
                priority TEXT NOT NULL DEFAULT 'MEDIUM',
                deadline INTEGER,
                status TEXT NOT NULL DEFAULT 'PROPOSED',
                source_type TEXT NOT NULL DEFAULT 'CALL',
                source_id TEXT NOT NULL DEFAULT '',
                source_offset TEXT,
                source TEXT NOT NULL DEFAULT 'HUMAN',
                reason TEXT,
                evidence_ref TEXT,
                tool TEXT,
                parameters TEXT,
                risk_level TEXT NOT NULL DEFAULT 'LOW',
                approver_id TEXT,
                approved_at INTEGER,
                execution_time_ms INTEGER,
                rollback_handler TEXT,
                audit_block_id TEXT,
                organisation_id TEXT NOT NULL DEFAULT 'CMP-GENESIS-01',
                lifecycle_status TEXT DEFAULT 'OPEN',
                effective_from INTEGER,
                effective_to INTEGER,
                confidence_state TEXT NOT NULL DEFAULT 'CONFIRMED',
                source_mode TEXT NOT NULL DEFAULT 'LIVE',
                is_authoritative INTEGER NOT NULL DEFAULT 1,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            );
        ''')
        cursor.execute("PRAGMA table_info(action_items);")
        act_cols = [r[1] for r in cursor.fetchall()]
        if "title" not in act_cols:
            cursor.execute("ALTER TABLE action_items ADD COLUMN title TEXT")
        if "action_type" not in act_cols:
            cursor.execute("ALTER TABLE action_items ADD COLUMN action_type TEXT NOT NULL DEFAULT 'GENERIC'")
        if "assignee" not in act_cols:
            cursor.execute("ALTER TABLE action_items ADD COLUMN assignee TEXT")
        if "department" not in act_cols:
            cursor.execute("ALTER TABLE action_items ADD COLUMN department TEXT DEFAULT 'General'")
        if "priority" not in act_cols:
            cursor.execute("ALTER TABLE action_items ADD COLUMN priority TEXT NOT NULL DEFAULT 'MEDIUM'")
        if "source" not in act_cols:
            cursor.execute("ALTER TABLE action_items ADD COLUMN source TEXT NOT NULL DEFAULT 'HUMAN'")
        if "reason" not in act_cols:
            cursor.execute("ALTER TABLE action_items ADD COLUMN reason TEXT")
        if "evidence_ref" not in act_cols:
            cursor.execute("ALTER TABLE action_items ADD COLUMN evidence_ref TEXT")
        if "tool" not in act_cols:
            cursor.execute("ALTER TABLE action_items ADD COLUMN tool TEXT")
        if "parameters" not in act_cols:
            cursor.execute("ALTER TABLE action_items ADD COLUMN parameters TEXT")
        if "risk_level" not in act_cols:
            cursor.execute("ALTER TABLE action_items ADD COLUMN risk_level TEXT NOT NULL DEFAULT 'LOW'")
        if "approver_id" not in act_cols:
            cursor.execute("ALTER TABLE action_items ADD COLUMN approver_id TEXT")
        if "approved_at" not in act_cols:
            cursor.execute("ALTER TABLE action_items ADD COLUMN approved_at INTEGER")
        if "execution_time_ms" not in act_cols:
            cursor.execute("ALTER TABLE action_items ADD COLUMN execution_time_ms INTEGER")
        if "rollback_handler" not in act_cols:
            cursor.execute("ALTER TABLE action_items ADD COLUMN rollback_handler TEXT")
        if "audit_block_id" not in act_cols:
            cursor.execute("ALTER TABLE action_items ADD COLUMN audit_block_id TEXT")
        if "organisation_id" not in act_cols:
            cursor.execute("ALTER TABLE action_items ADD COLUMN organisation_id TEXT NOT NULL DEFAULT 'CMP-GENESIS-01'")
        if "lifecycle_status" not in act_cols:
            cursor.execute("ALTER TABLE action_items ADD COLUMN lifecycle_status TEXT DEFAULT 'OPEN'")
        if "effective_from" not in act_cols:
            cursor.execute("ALTER TABLE action_items ADD COLUMN effective_from INTEGER")
        if "effective_to" not in act_cols:
            cursor.execute("ALTER TABLE action_items ADD COLUMN effective_to INTEGER")
        if "confidence_state" not in act_cols:
            cursor.execute("ALTER TABLE action_items ADD COLUMN confidence_state TEXT NOT NULL DEFAULT 'CONFIRMED'")
        if "source_mode" not in act_cols:
            cursor.execute("ALTER TABLE action_items ADD COLUMN source_mode TEXT NOT NULL DEFAULT 'LIVE'")
        if "is_authoritative" not in act_cols:
            cursor.execute("ALTER TABLE action_items ADD COLUMN is_authoritative INTEGER NOT NULL DEFAULT 1")
        if "created_at" not in act_cols:
            cursor.execute("ALTER TABLE action_items ADD COLUMN created_at INTEGER NOT NULL DEFAULT 0")
        if "updated_at" not in act_cols:
            cursor.execute("ALTER TABLE action_items ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0")

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_action_items_status ON action_items(status);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_action_items_org ON action_items(organisation_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_action_items_owner ON action_items(owner);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_action_items_created ON action_items(created_at DESC);")

        # Action Execution Receipts Table (Points 4, 145-160)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS action_receipts (
                receipt_id TEXT PRIMARY KEY,
                action_id TEXT NOT NULL,
                status TEXT NOT NULL,
                actor TEXT NOT NULL,
                executed_at INTEGER NOT NULL,
                duration_ms INTEGER DEFAULT 0,
                parameters_hash TEXT NOT NULL,
                result_summary TEXT,
                rollback_payload TEXT,
                audit_block_id TEXT,
                organisation_id TEXT NOT NULL DEFAULT 'CMP-GENESIS-01'
            );
        ''')
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_action_receipts_action ON action_receipts(action_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_action_receipts_org ON action_receipts(organisation_id);")

        # Declarative Policy Rules Table (Points 13, 14)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS action_policies (
                id TEXT PRIMARY KEY,
                action_type TEXT NOT NULL,
                description TEXT,
                allowed_roles TEXT NOT NULL,
                required_clearance TEXT NOT NULL DEFAULT 'ALL_TEAM',
                max_risk TEXT NOT NULL DEFAULT 'MEDIUM',
                requires_human INTEGER NOT NULL DEFAULT 1,
                allowed_tools TEXT,
                conditions TEXT,
                organisation_id TEXT NOT NULL DEFAULT 'CMP-GENESIS-01',
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            );
        ''')
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_action_policies_type ON action_policies(action_type, organisation_id);")

        conn.commit()

        # Guarantee synchronisation with sovereign vault database (.tars/vault.db)
        try:
            if os.getenv("TARS_IS_TEST") == "1" or os.getenv("TARS_TESTING") == "1" or os.getenv("PYTEST_CURRENT_TEST"):
                vault_path = os.getenv("TARS_VAULT_PATH")
                if not vault_path:
                    return
            else:
                vault_dir = os.path.join(os.getcwd(), ".tars")
                os.makedirs(vault_dir, exist_ok=True)
                vault_path = os.getenv("TARS_VAULT_PATH", os.path.join(vault_dir, "vault.db"))

            if os.path.abspath(vault_path) != os.path.abspath(self.db_path):
                vault_conn = sqlite3.connect(vault_path)
                vault_conn.execute('''
                    CREATE TABLE IF NOT EXISTS users (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        email TEXT UNIQUE NOT NULL,
                        role TEXT NOT NULL,
                        department TEXT NOT NULL,
                        clearance TEXT NOT NULL,
                        created_at INTEGER NOT NULL,
                        company_id TEXT,
                        company_name TEXT
                    )
                ''')
                v_cursor = vault_conn.cursor()
                v_cursor.execute("PRAGMA table_info(users)")
                v_cols = [row[1] for row in v_cursor.fetchall()]
                if "company_id" not in v_cols:
                    vault_conn.execute("ALTER TABLE users ADD COLUMN company_id TEXT")
                if "company_name" not in v_cols:
                    vault_conn.execute("ALTER TABLE users ADD COLUMN company_name TEXT")

                vault_conn.execute('''
                    CREATE TABLE IF NOT EXISTS documents (
                        doc_id TEXT PRIMARY KEY,
                        filename TEXT NOT NULL,
                        file_path TEXT NOT NULL,
                        file_hash TEXT UNIQUE NOT NULL,
                        department TEXT NOT NULL,
                        clearance TEXT NOT NULL,
                        format TEXT NOT NULL,
                        file_size_bytes INTEGER NOT NULL,
                        page_count INTEGER NOT NULL,
                        table_count INTEGER NOT NULL,
                        character_count INTEGER NOT NULL,
                        chunk_count INTEGER NOT NULL,
                        content TEXT NOT NULL,
                        preview TEXT,
                        ingested_at INTEGER NOT NULL,
                        is_demo INTEGER DEFAULT 0
                    )
                ''')
                v_cursor.execute("PRAGMA table_info(documents)")
                v_doc_cols = [row[1] for row in v_cursor.fetchall()]
                if "is_demo" not in v_doc_cols:
                    vault_conn.execute("ALTER TABLE documents ADD COLUMN is_demo INTEGER DEFAULT 0")
                vault_conn.execute('''
                    CREATE TABLE IF NOT EXISTS company_profile (
                        id TEXT PRIMARY KEY,
                        company_name TEXT NOT NULL,
                        website TEXT,
                        industry TEXT NOT NULL,
                        stage TEXT NOT NULL,
                        team_size TEXT NOT NULL,
                        runway_months INTEGER,
                        one_liner TEXT NOT NULL,
                        core_thesis TEXT,
                        icp TEXT,
                        tech_stack TEXT,
                        enterprise_policy TEXT DEFAULT 'REJECT_CUSTOM_FORKS',
                        pricing_model TEXT DEFAULT 'USAGE_BASED',
                        tars_tone TEXT DEFAULT 'CONCISE_EXECUTIVE',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                ''')
                vault_conn.execute('''
                    CREATE TABLE IF NOT EXISTS onboarding_modules (
                        id TEXT PRIMARY KEY,
                        company_name TEXT NOT NULL,
                        company_id TEXT,
                        day INTEGER NOT NULL,
                        title TEXT NOT NULL,
                        description TEXT NOT NULL,
                        tasks TEXT NOT NULL,
                        milestone_tour TEXT,
                        order_index INTEGER NOT NULL DEFAULT 0,
                        is_published INTEGER NOT NULL DEFAULT 1,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                ''')
                vault_conn.execute("CREATE INDEX IF NOT EXISTS idx_vault_onboarding_modules_company ON onboarding_modules(company_name, day);")
                vault_conn.execute('''
                    CREATE TABLE IF NOT EXISTS onboarding_progress (
                        id TEXT PRIMARY KEY,
                        company_name TEXT NOT NULL,
                        user_id TEXT NOT NULL,
                        task_key TEXT NOT NULL,
                        completed INTEGER NOT NULL DEFAULT 1,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(company_name, user_id, task_key)
                    )
                ''')
                vault_conn.execute("CREATE INDEX IF NOT EXISTS idx_vault_onboarding_progress_lookup ON onboarding_progress(company_name, user_id);")
                for u_id, u_name, u_email, u_role, u_dept, u_clr in default_personas:
                    vault_conn.execute('''
                        INSERT OR IGNORE INTO users (id, name, email, role, department, clearance, created_at, company_id, company_name)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (u_id, u_name, u_email, u_role, u_dept, u_clr, now_ts, "CMP-GENESIS-01", "AetherFlow Technologies, Inc."))
                vault_conn.execute("UPDATE users SET company_id = 'CMP-GENESIS-01', company_name = 'AetherFlow Technologies, Inc.' WHERE (company_id IS NULL OR company_id = '') AND id LIKE 'usr-%'")
                vault_conn.commit()
                vault_conn.close()
        except Exception as vault_err:
            print(f"Notice: Non-fatal vault.db initialisation note: {vault_err}")

db = LocalDB()
db.initialize()

