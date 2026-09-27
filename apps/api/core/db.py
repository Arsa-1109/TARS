import sqlite3
import json
import os
import threading
from typing import Optional, List, Dict, Any

DB_PATH = os.getenv("TARS_DB_PATH", "tars_local.db")

class LocalDB:
    def __init__(self):
        self.local = threading.local()

    def get_connection(self):
        if not hasattr(self.local, "conn"):
            # Ensure database directory exists
            os.makedirs(os.path.dirname(os.path.abspath(DB_PATH)), exist_ok=True)
            self.local.conn = sqlite3.connect(DB_PATH, check_same_thread=False)
            self.local.conn.row_factory = sqlite3.Row
            # Try loading sqlite-vec extension if available
            try:
                import sqlite_vec
                self.local.conn.enable_load_extension(True)
                sqlite_vec.load(self.local.conn)
                self.local.conn.enable_load_extension(False)
            except ImportError:
                print("sqlite_vec module not found. Using simple fallback search.")
            except Exception as e:
                print(f"Warning: sqlite-vec could not be loaded: {e}")
        return self.local.conn

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
        
        conn.commit()

db = LocalDB()
db.initialize()
