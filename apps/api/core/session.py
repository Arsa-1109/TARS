import time
from typing import Optional
from pydantic import BaseModel
from apps.api.core.db import db

class SessionData(BaseModel):
    session_id: str
    tars_user: str
    tars_role: str
    created_at: int

class SessionManager:
    def create_session(self, session_id: str, tars_user: str, tars_role: str) -> SessionData:
        conn = db.get_connection()
        cursor = conn.cursor()
        created_at = int(time.time())
        cursor.execute('''
            INSERT OR REPLACE INTO sessions (session_id, tars_user, tars_role, created_at)
            VALUES (?, ?, ?, ?)
        ''', (session_id, tars_user, tars_role, created_at))
        conn.commit()
        return SessionData(
            session_id=session_id,
            tars_user=tars_user,
            tars_role=tars_role,
            created_at=created_at
        )

    def get_session(self, session_id: str) -> Optional[SessionData]:
        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM sessions WHERE session_id = ?', (session_id,))
        row = cursor.fetchone()
        if row:
            return SessionData(**dict(row))
        return None

session_manager = SessionManager()
