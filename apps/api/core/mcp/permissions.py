from typing import Optional
from .schemas import ToolMetadata, RiskLevel

class PermissionManager:
    def __init__(self, explicit_allowed_tools: list[str] = None):
        self.explicit_allowed_tools = explicit_allowed_tools or [
            "git.status", "git.diff", "git.log", "filesystem.read"
        ]
        # Sensitive tools that require executive / founder clearance
        self.executive_only_tools = {
            "equity.read", "equity.write", "captable.export", "financials.read_unredacted",
            "system.reset", "filesystem.delete", "database.drop"
        }

    def resolve_actor_clearance(self, actor: str) -> tuple[str, str]:
        """
        Resolves actor string (session ID, user ID, username, or role)
        to (role, clearance). Defaults to ('ENGINEER', 'ALL_TEAM').
        """
        if not actor:
            return "ENGINEER", "ALL_TEAM"

        actor_upper = actor.upper().strip()
        if actor_upper in ("FOUNDER", "CHIEF_ARCHITECT", "EXECUTIVE", "EXECUTIVE_ONLY"):
            return "FOUNDER", "EXECUTIVE_ONLY"

        # Check in session manager if session ID
        try:
            from apps.api.core.session import session_manager
            sess = session_manager.get_session(actor)
            if sess:
                role = sess.tars_role.upper()
                if role in ("FOUNDER", "CHIEF_ARCHITECT", "EXECUTIVE"):
                    return role, "EXECUTIVE_ONLY"
                return role, "ALL_TEAM"
        except Exception:
            pass

        # Check in SQLite users table
        try:
            from apps.api.core.db import db
            conn = db.get_connection()
            cursor = conn.cursor()
            cursor.execute(
                "SELECT role, clearance FROM users WHERE id = ? OR name = ? OR email = ?",
                (actor, actor, actor)
            )
            row = cursor.fetchone()
            if row:
                return row["role"].upper(), row["clearance"].upper()
        except Exception:
            pass

        return "ENGINEER", "ALL_TEAM"

    def check_permission(self, tool: ToolMetadata, actor: str) -> bool:
        """
        Enforces dual-layer RBAC on MCP tool invocation:
        - Founder / Executive clearance can access all registered tools.
        - Non-founders (e.g. Chloe, ALL_TEAM) are blocked from executive-only tools
          and high-risk destructive filesystem/git mutations without executive authorization.
        """
        role, clearance = self.resolve_actor_clearance(actor)
        is_exec = (clearance == "EXECUTIVE_ONLY" or role in ("FOUNDER", "CHIEF_ARCHITECT", "EXECUTIVE"))

        if is_exec:
            return True

        # Non-founder checks: deny executive-only tools (equity, captable, financials)
        if tool.name in self.executive_only_tools:
            return False

        return True

    def requires_approval(self, tool: ToolMetadata) -> bool:
        if tool.risk == RiskLevel.HIGH:
            return True
        if tool.risk == RiskLevel.MEDIUM:
            return True
        # LOW risk
        if tool.name in self.explicit_allowed_tools:
            return False
        return tool.requires_approval

permission_manager = PermissionManager(explicit_allowed_tools=[
    "git.status", "git.diff", "git.log", "filesystem.read"
])
