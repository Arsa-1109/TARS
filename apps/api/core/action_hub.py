import uuid
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from apps.api.core.db import db
from apps.api.schemas.contracts import ActionItemDTO

class ActionHubRepository:
    def create(self, item: ActionItemDTO) -> ActionItemDTO:
        conn = db.get_connection()
        cursor = conn.cursor()
        if not item.id:
            item.id = str(uuid.uuid4())
        
        cursor.execute('''
            INSERT INTO action_items (id, description, owner, deadline, status, source_type, source_id, source_offset)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (item.id, item.description, item.owner, item.deadline, item.status, item.source_type, item.source_id, item.source_offset))
        conn.commit()
        return item

    def get(self, item_id: str) -> Optional[ActionItemDTO]:
        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM action_items WHERE id = ?', (item_id,))
        row = cursor.fetchone()
        if row:
            return ActionItemDTO(**dict(row))
        return None

    def list_all(self) -> List[ActionItemDTO]:
        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM action_items')
        rows = cursor.fetchall()
        return [ActionItemDTO(**dict(row)) for row in rows]

    def update(self, item_id: str, updates: Dict[str, Any]) -> Optional[ActionItemDTO]:
        conn = db.get_connection()
        cursor = conn.cursor()
        
        set_clauses = []
        values = []
        for k, v in updates.items():
            set_clauses.append(f"{k} = ?")
            values.append(v)
            
        if not set_clauses:
            return self.get(item_id)
            
        values.append(item_id)
        query = f"UPDATE action_items SET {', '.join(set_clauses)} WHERE id = ?"
        
        cursor.execute(query, tuple(values))
        conn.commit()
        
        return self.get(item_id)

    def delete(self, item_id: str) -> bool:
        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute('DELETE FROM action_items WHERE id = ?', (item_id,))
        conn.commit()
        return cursor.rowcount > 0

action_hub_repo = ActionHubRepository()
