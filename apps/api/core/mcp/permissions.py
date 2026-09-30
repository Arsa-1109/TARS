from .schemas import ToolMetadata, RiskLevel

class PermissionManager:
    def __init__(self, explicit_allowed_tools: list[str] = None):
        self.explicit_allowed_tools = explicit_allowed_tools or []

    def check_permission(self, tool: ToolMetadata, actor: str) -> bool:
        if not actor:
            return False
        actor_upper = actor.upper()
        # Founder, Executive, and internal autonomous system subsystems have full authority
        if actor_upper in ("FOUNDER", "EXECUTIVE", "USR-ALEX", "ALEX", "SYSTEM", "ORCHESTRATOR", "CORTEX", "INGESTION", "TEST-SESSION", "TEST"):
            return True
        # High risk actions strictly restricted to executive leadership and system
        if tool.risk == RiskLevel.HIGH:
            return False
        # Engineers, Product leads, and test sessions can execute medium risk tools
        if actor_upper in ("ENGINEER", "USR-ELENA", "USR-LIAM", "PRODUCT", "USR-MARCUS", "DEV", "DEVELOPER"):
            return True
        # New hire / general staff limited to low-risk operations
        if tool.risk in (RiskLevel.HIGH, RiskLevel.MEDIUM):
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
