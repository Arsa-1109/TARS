"""
AetherFlow Audit Log Model (VIOLATES INV-014)
Demonstrates unindexed foreign key on a high-write table.

Trigger Condition for TARS Tree-sitter Invariant Engine:
Tree-sitter rule: INV-014 (Unindexed foreign key on high-write relational table)
"""

from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime

Base = declarative_base()

class AuditLog(Base):
    """
    Audit log table recording security events and code scan executions.
    This table receives thousands of write events per hour.
    
    CRITICAL PERFORMANCE FLAW (INV-014):
    'tenant_id' and 'actor_user_id' are ForeignKeys but HAVE NO INDEX (index=False by default)!
    When an enterprise compliance officer queries:
        SELECT * FROM audit_logs WHERE tenant_id = 'acme-corp' ORDER BY created_at DESC;
    the database must execute a full table scan over millions of rows, spiking database CPU to 100%.
    """
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True)
    
    # [FATAL VIOLATION - INV-014] ForeignKey without index=True on a high-write table!
    tenant_id = Column(String(36), ForeignKey("tenants.id"), nullable=False)
    
    # [FATAL VIOLATION - INV-014] ForeignKey without index=True!
    actor_user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    
    action_type = Column(String(64), nullable=False)  # e.g. "AST_SCAN_VIOLATION", "USER_LOGIN"
    resource_id = Column(String(128), nullable=True)
    details_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
