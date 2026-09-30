from typing import Dict, Any, Optional
import json
from .registry import registry
from .permissions import permission_manager
from .audit import audit_logger
from .schemas import ExecutionResult

class MCPExecutor:
    async def execute(self, tool_name: str, arguments: Dict[str, Any], session_id: str, approval_granted: bool = False) -> ExecutionResult:
        # 0. Ensure builtin tools registered
        if not registry.list_tools():
            from .builtin import register_all_builtin_tools
            register_all_builtin_tools()

        # 1. Registry lookup
        tool = registry.get_tool(tool_name)
        if not tool:
            return self._fail(tool_name, arguments, session_id, "REJECTED_UNKNOWN_TOOL", "Tool does not exist.")

        # 2. Schema validation
        required_keys = tool.input_schema.get("required", [])
        for key in required_keys:
            if key not in arguments:
                return self._fail(tool_name, arguments, session_id, "REJECTED_INVALID_SCHEMA", f"Missing required argument: {key}")

        # 3. Permission evaluation
        if not permission_manager.check_permission(tool, session_id):
            return self._fail(tool_name, arguments, session_id, "REJECTED_PERMISSION_DENIED", "Permission denied.")

        # 4. Approval check
        requires_appr = permission_manager.requires_approval(tool)
        if requires_appr and not approval_granted:
            return self._fail(tool_name, arguments, session_id, "REJECTED_APPROVAL_MISSING", "Approval required but missing.")

        # 5. Execution
        handler = registry.get_handler(tool_name)
        try:
            result = await handler(arguments)
            # 6. Audit
            audit_logger.log(
                tool_name=tool_name,
                arguments=arguments,
                actor=session_id,
                approval_state="GRANTED" if requires_appr else "AUTO",
                result=json.dumps(result.data) if result.success else None,
                error=result.error if not result.success else None
            )
            return result
        except Exception as e:
            return self._fail(tool_name, arguments, session_id, "EXECUTION_ERROR", str(e))

    def _fail(self, tool_name: str, arguments: dict, session_id: str, state: str, error: str) -> ExecutionResult:
        audit_logger.log(
            tool_name=tool_name,
            arguments=arguments,
            actor=session_id,
            approval_state=state,
            result=None,
            error=error
        )
        return ExecutionResult(success=False, error=error)

executor = MCPExecutor()
