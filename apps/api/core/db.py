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
            conn = sqlite3.connect(target_path, check_same_thread=False)
            conn.row_factory = sqlite3.Row
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
        # Ensure WAL mode for safe concurrency
        conn.execute('PRAGMA journal_mode=WAL;')

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
                vector_ref TEXT
            )
        ''')
        
        # Audit Log table
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
                created_at INTEGER NOT NULL
            )
        ''')

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

        # Safe schema migrations for demo-tagging and data isolation
        cursor.execute("PRAGMA table_info(documents)")
        doc_cols = [row[1] for row in cursor.fetchall()]
        if "is_demo" not in doc_cols:
            cursor.execute("ALTER TABLE documents ADD COLUMN is_demo INTEGER DEFAULT 0")

        cursor.execute("PRAGMA table_info(action_items)")
        act_cols = [row[1] for row in cursor.fetchall()]
        if "is_demo" not in act_cols:
            cursor.execute("ALTER TABLE action_items ADD COLUMN is_demo INTEGER DEFAULT 0")

        cursor.execute("PRAGMA table_info(memories)")
        mem_cols = [row[1] for row in cursor.fetchall()]
        if "is_demo" not in mem_cols:
            cursor.execute("ALTER TABLE memories ADD COLUMN is_demo INTEGER DEFAULT 0")

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

        # Seed default demo personas if table is empty
        default_personas = [
            ("usr-aryan", "Aryan", "aryan@tars.local", "FOUNDER", "Executive", "EXECUTIVE_ONLY"),
            ("usr-elena", "Elena Rostova", "elena@tars.local", "ENGINEER", "Engineering", "ALL_TEAM"),
            ("usr-marcus", "Marcus Vance", "marcus@tars.local", "PRODUCT", "Product", "ALL_TEAM"),
            ("usr-sarah", "Sarah Vance", "sarah@tars.local", "SALES", "Sales & Growth", "ALL_TEAM"),
            ("usr-maya", "Maya Lin", "maya@tars.local", "NEW_HIRE", "Engineering", "ALL_TEAM"),
        ]
        import time as _t
        now_ts = int(_t.time())
        for u_id, u_name, u_email, u_role, u_dept, u_clr in default_personas:
            cursor.execute('''
                INSERT OR IGNORE INTO users (id, name, email, role, department, clearance, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (u_id, u_name, u_email, u_role, u_dept, u_clr, now_ts))
        
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
                for u_id, u_name, u_email, u_role, u_dept, u_clr in default_personas:
                    vault_conn.execute('''
                        INSERT OR IGNORE INTO users (id, name, email, role, department, clearance, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    ''', (u_id, u_name, u_email, u_role, u_dept, u_clr, now_ts))
                vault_conn.commit()
                vault_conn.close()
        except Exception as vault_err:
            print(f"Notice: Non-fatal vault.db initialisation note: {vault_err}")

db = LocalDB()
db.initialize()

