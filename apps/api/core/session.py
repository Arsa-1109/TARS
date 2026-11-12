import time
import uuid
import re
from typing import Optional, List
from pydantic import BaseModel
from apps.api.core.db import db
from apps.api.schemas.contracts import UserCreateDTO, UserDTO

class SessionData(BaseModel):
    session_id: str
    tars_user: str
    tars_role: str
    created_at: int
    expires_at: Optional[int] = None
    revoked_at: Optional[int] = None
    user_id: Optional[str] = None
    organisation_id: Optional[str] = None

class SessionManager:
    DEFAULT_SESSION_TTL_SECONDS = 7 * 86400  # 7 days

    def create_session(
        self,
        session_id: str,
        tars_user: str,
        tars_role: str,
        expires_at: Optional[int] = None,
        user_id: Optional[str] = None,
        organisation_id: Optional[str] = None
    ) -> SessionData:
        conn = db.get_connection()
        cursor = conn.cursor()
        created_at = int(time.time())
        exp = expires_at or (created_at + self.DEFAULT_SESSION_TTL_SECONDS)
        uid = user_id or tars_user
        cursor.execute('''
            INSERT OR REPLACE INTO sessions (session_id, tars_user, tars_role, created_at, expires_at, revoked_at, user_id, organisation_id)
            VALUES (?, ?, ?, ?, ?, NULL, ?, ?)
        ''', (session_id, tars_user, tars_role, created_at, exp, uid, organisation_id))
        conn.commit()
        return SessionData(
            session_id=session_id,
            tars_user=tars_user,
            tars_role=tars_role,
            created_at=created_at,
            expires_at=exp,
            revoked_at=None,
            user_id=uid,
            organisation_id=organisation_id
        )

    def revoke_session(self, session_id: str) -> bool:
        """Revokes a session explicitly upon logout (Item 108)."""
        conn = db.get_connection()
        cursor = conn.cursor()
        now = int(time.time())
        cursor.execute("UPDATE sessions SET revoked_at = ? WHERE session_id = ?", (now, session_id))
        conn.commit()
        return cursor.rowcount > 0

    def get_session(self, session_id: str) -> Optional[SessionData]:
        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM sessions WHERE session_id = ?', (session_id,))
        row = cursor.fetchone()
        if not row:
            return None
        row_dict = dict(row)
        now = int(time.time())
        # Check revocation
        if row_dict.get("revoked_at") is not None:
            return None
        # Check expiration
        exp = row_dict.get("expires_at")
        if exp is not None and exp < now:
            return None
        return SessionData(**row_dict)

class UserManager:
    """Manages persistent custom users and RBAC clearances within the Sovereign SQLite store."""

    ALLOWED_ROLES = {"FOUNDER", "ENGINEER", "PRODUCT", "SALES", "NEW_HIRE"}
    ROLE_DEFAULTS = {
        "FOUNDER": {"dept": "Executive", "clr": "EXECUTIVE_ONLY"},
        "ENGINEER": {"dept": "Engineering", "clr": "ALL_TEAM"},
        "PRODUCT": {"dept": "Product", "clr": "ALL_TEAM"},
        "SALES": {"dept": "Sales & Growth", "clr": "ALL_TEAM"},
        "NEW_HIRE": {"dept": "Engineering", "clr": "ALL_TEAM"},
    }

    def create_user(self, payload: UserCreateDTO) -> UserDTO:
        clean_name = payload.name.strip()
        clean_email = payload.email.strip().lower()
        role = payload.role.strip().upper()

        if not clean_name:
            raise ValueError("User name must not be blank.")
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", clean_email):
            raise ValueError(f"Invalid email address format: {payload.email}")
        if role not in self.ALLOWED_ROLES:
            raise ValueError(f"Invalid role '{role}'. Allowed roles: {', '.join(sorted(self.ALLOWED_ROLES))}")

        role_info = self.ROLE_DEFAULTS.get(role, {"dept": "Engineering", "clr": "ALL_TEAM"})
        department = payload.department.strip() if payload.department and payload.department.strip() else role_info["dept"]
        clearance = payload.clearance.strip() if payload.clearance and payload.clearance.strip() else role_info["clr"]

        # Security check: Non-founder roles cannot claim EXECUTIVE_ONLY clearance unless specified
        if role != "FOUNDER" and clearance == "EXECUTIVE_ONLY" and not payload.clearance:
            clearance = "ALL_TEAM"

        company_name = payload.company_name.strip() if payload.company_name and payload.company_name.strip() else None
        company_id = payload.company_id.strip() if payload.company_id and payload.company_id.strip() else None

        if company_name:
            from apps.api.core.company import CompanyProfileRepository
            comp_repo = CompanyProfileRepository()
            existing_comp = comp_repo.get_profile_by_name(company_name)
            if existing_comp:
                company_id = existing_comp["id"]
            else:
                new_id = company_id or f"CMP-{uuid.uuid4().hex[:8].upper()}"
                comp = comp_repo.register_initial_company(
                    company_id=new_id,
                    company_name=company_name
                )
                company_id = comp.get("id", new_id)

        conn = db.get_connection()
        cursor = conn.cursor()

        # Check existing user by email
        cursor.execute("SELECT * FROM users WHERE email = ?", (clean_email,))
        existing = cursor.fetchone()
        if existing:
            existing_keys = existing.keys()
            existing_role = existing["role"] if "role" in existing_keys and existing["role"] else role
            existing_clearance = existing["clearance"] if "clearance" in existing_keys and existing["clearance"] else clearance
            existing_company_id = existing["company_id"] if "company_id" in existing_keys else None
            existing_company_name = existing["company_name"] if "company_name" in existing_keys else None

            # Security invariant: prevent unauthenticated privilege escalation or cross-tenant takeover
            # If the user already belongs to a tenant, do not overwrite their role, clearance, or tenant from a different company payload
            same_tenant = (
                not existing_company_id
                or not company_id
                or str(existing_company_id).strip() == str(company_id).strip()
            )
            eff_company_id = existing_company_id if existing_company_id else company_id
            eff_company_name = existing_company_name if existing_company_name else company_name

            clearance_rank = {"PUBLIC": 0, "ALL_TEAM": 1, "INTERNAL": 1, "CONFIDENTIAL": 2, "DEPT_RESTRICTED": 2, "EXECUTIVE_ONLY": 3}
            role_rank = {"NEW_HIRE": 0, "INTERN": 0, "SALES": 1, "PRODUCT": 1, "ENGINEER": 1, "DEVELOPER": 1, "PRODUCT_MANAGER": 2, "PM": 2, "HR": 2, "DEVOPS": 2, "ARCHITECT": 3, "CHIEF_ARCHITECT": 3, "EXECUTIVE": 4, "ADMIN": 4, "FOUNDER": 5}

            if same_tenant and not existing_company_id:
                eff_role = role
                eff_clearance = clearance
            else:
                # Preserve existing role and clearance against unauthenticated overwrite/escalation
                eff_role = existing_role if role_rank.get(str(existing_role).upper(), 1) >= role_rank.get(str(role).upper(), 1) else existing_role
                eff_clearance = existing_clearance if clearance_rank.get(str(existing_clearance).upper(), 1) >= clearance_rank.get(str(clearance).upper(), 1) else existing_clearance

            eff_name = clean_name if same_tenant else existing["name"]
            eff_dept = department if same_tenant else existing["department"]

            cursor.execute('''
                UPDATE users SET name = ?, role = ?, department = ?, clearance = ?, company_id = ?, company_name = ? WHERE email = ?
            ''', (eff_name, eff_role, eff_dept, eff_clearance, eff_company_id, eff_company_name, clean_email))
            conn.commit()
            try:
                session_manager.create_session(existing["id"], eff_name, eff_role)
            except Exception:
                pass
            return UserDTO(
                id=existing["id"],
                name=eff_name,
                email=clean_email,
                role=eff_role,
                department=eff_dept,
                clearance=eff_clearance,
                created_at=existing["created_at"],
                company_id=eff_company_id,
                company_name=eff_company_name,
            )

        user_id = f"usr-{uuid.uuid4().hex[:8]}"
        created_at = int(time.time())
        cursor.execute('''
            INSERT INTO users (id, name, email, role, department, clearance, created_at, company_id, company_name)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (user_id, clean_name, clean_email, role, department, clearance, created_at, company_id, company_name))
        conn.commit()

        return UserDTO(
            id=user_id,
            name=clean_name,
            email=clean_email,
            role=role,
            department=department,
            clearance=clearance,
            created_at=created_at,
            company_id=company_id,
            company_name=company_name,
        )

    def list_users(self, company_id: Optional[str] = None, company_name: Optional[str] = None) -> List[UserDTO]:
        conn = db.get_connection()
        cursor = conn.cursor()
        if company_id and company_id.strip():
            cursor.execute("SELECT * FROM users WHERE company_id = ? ORDER BY created_at ASC", (company_id.strip(),))
        elif company_name and company_name.strip():
            cursor.execute("SELECT * FROM users WHERE LOWER(company_name) = LOWER(?) ORDER BY created_at ASC", (company_name.strip(),))
        else:
            cursor.execute("SELECT * FROM users ORDER BY created_at ASC")
        rows = cursor.fetchall()
        return [UserDTO(**dict(r)) for r in rows]

    def get_user_by_id(self, user_id: str) -> Optional[UserDTO]:
        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        if row:
            return UserDTO(**dict(row))
        return None

session_manager = SessionManager()
user_manager = UserManager()
