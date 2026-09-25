from .git_tools import register_git_tools
from .filesystem_tools import register_filesystem_tools
from .memory_tools import register_memory_tools

def register_all_builtin_tools():
    register_git_tools()
    register_filesystem_tools()
    register_memory_tools()
