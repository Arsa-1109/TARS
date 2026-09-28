"""
AetherFlow User Repository (VIOLATES INV-021)
Demonstrates multi-tenant isolation failure by omitting tenant_id filters.

Trigger Condition for TARS Tree-sitter Invariant Engine:
Tree-sitter rule: INV-021 (Missing tenant_id in multi-tenant repository query)
"""

from typing import List, Optional, Dict, Any
from app.db.session import get_db_session

class UserRepository:
    def __init__(self):
        self.db = get_db_session()

    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves user record by email.
        
        CRITICAL VULNERABILITY (INV-021):
        In a multi-tenant B2B system, two separate enterprise tenants might have users
        with the same contractor email (e.g. 'contractor@external-agency.com').
        Querying strictly by 'email' without scoping to 'tenant_id' can return the wrong
        tenant's user record, leading to catastrophic cross-tenant authorization leaks!
        """
        # [FATAL VIOLATION - INV-021] Missing 'AND tenant_id = :tenant_id'
        query = "SELECT id, email, role, full_name, created_at FROM users WHERE email = :email"
        result = self.db.query(query, email=email).fetchone()
        return dict(result) if result else None

    def list_all_active_members(self) -> List[Dict[str, Any]]:
        """
        Lists active users.
        
        CRITICAL VULNERABILITY (INV-021):
        Dumps users across ALL enterprise tenants without tenant isolation!
        """
        # [FATAL VIOLATION - INV-021] Completely unpartitioned query
        query = "SELECT id, email, role FROM users WHERE status = 'ACTIVE' LIMIT 100"
        return [dict(r) for r in self.db.query(query).fetchall()]
