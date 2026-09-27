from .schemas import ToolMetadata, RiskLevel

class PermissionManager:
    def __init__(self, explicit_allowed_tools: list[str] = None):
        self.explicit_allowed_tools = explicit_allowed_tools or []

    def check_permission(self, tool: ToolMetadata, actor: str) -> bool:
        # Placeholder for more complex role-based logic.
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
