import asyncio
from typing import TypeVar, Callable, Awaitable
from functools import wraps

T = TypeVar('T')

class ResourceGovernor:
    def __init__(self, max_concurrent_inference=1, max_concurrent_search=4):
        self.inference_semaphore = asyncio.Semaphore(max_concurrent_inference)
        self.search_semaphore = asyncio.Semaphore(max_concurrent_search)

governor = ResourceGovernor()

def with_inference_lock(func: Callable[..., Awaitable[T]]) -> Callable[..., Awaitable[T]]:
    @wraps(func)
    async def wrapper(*args, **kwargs):
        async with governor.inference_semaphore:
            return await func(*args, **kwargs)
    return wrapper

def with_search_lock(func: Callable[..., Awaitable[T]]) -> Callable[..., Awaitable[T]]:
    @wraps(func)
    async def wrapper(*args, **kwargs):
        async with governor.search_semaphore:
            return await func(*args, **kwargs)
    return wrapper
