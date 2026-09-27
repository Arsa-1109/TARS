from typing import Dict, Callable, Awaitable, Any, Optional
from .schemas import ToolMetadata, ExecutionResult

class ToolRegistry:
    def __init__(self):
        self._tools: Dict[str, ToolMetadata] = {}
        self._handlers: Dict[str, Callable[[Dict[str, Any]], Awaitable[ExecutionResult]]] = {}

    def register(self, metadata: ToolMetadata, handler: Callable[[Dict[str, Any]], Awaitable[ExecutionResult]]):
        self._tools[metadata.name] = metadata
        self._handlers[metadata.name] = handler

    def get_tool(self, name: str) -> Optional[ToolMetadata]:
        return self._tools.get(name)

    def get_handler(self, name: str) -> Optional[Callable[[Dict[str, Any]], Awaitable[ExecutionResult]]]:
        return self._handlers.get(name)

    def list_tools(self) -> list[ToolMetadata]:
        return list(self._tools.values())

registry = ToolRegistry()
