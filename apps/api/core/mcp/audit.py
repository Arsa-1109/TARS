import time
import uuid
from typing import Optional
from apps.api.core.db import db
from apps.api.schemas.contracts import ToolAuditRecord
from .schemas import RiskLevel

class AuditLogger:
    def log(self, tool_name: str, arguments: dict, actor: str, approval_state: str, result: Optional[str] = None, error: Optional[str] = None) -> str:
        record_id = str(uuid.uuid4())
        record = ToolAuditRecord(
            id=record_id,
            tool_name=tool_name,
            arguments=arguments,
            actor=actor,
            timestamp=int(time.time()),
            approval_state=approval_state,
            result=result,
            error=error
        )
        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO mcp_audit (id, tool_name, arguments, actor, timestamp, approval_state, result, error)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (record.id, record.tool_name, str(record.arguments), record.actor, record.timestamp, record.approval_state, record.result, record.error))
        conn.commit()
        return record_id

audit_logger = AuditLogger()
