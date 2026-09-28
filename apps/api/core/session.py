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
            # Update user details if re-registering
            eff_company_id = company_id if company_id else (existing["company_id"] if "company_id" in existing.keys() else None)
            eff_company_name = company_name if company_name else (existing["company_name"] if "company_name" in existing.keys() else None)
            cursor.execute('''
                UPDATE users SET name = ?, role = ?, department = ?, clearance = ?, company_id = ?, company_name = ? WHERE email = ?
            ''', (clean_name, role, department, clearance, eff_company_id, eff_company_name, clean_email))
            conn.commit()
            return UserDTO(
                id=existing["id"],
                name=clean_name,
                email=clean_email,
                role=role,
                department=department,
                clearance=clearance,
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

    def list_users(self) -> List[UserDTO]:
        conn = db.get_connection()
        cursor = conn.cursor()
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
