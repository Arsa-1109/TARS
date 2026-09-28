import asyncio
import time
from typing import TypeVar, Callable, Awaitable, Any
from functools import wraps

T = TypeVar('T')

class Priority:
    INVARIANT = 1    # Priority 1: developer/Git invariant checks
    INTERACTIVE = 2  # Priority 2: interactive web requests
    BACKGROUND = 3   # Priority 3: background ingestion

class PriorityGovernor:
    def __init__(self, max_concurrent=1):
        self.max_concurrent = max_concurrent
        self._queue = asyncio.PriorityQueue()
        self._active = 0
        self._lock = asyncio.Lock()
        
    async def acquire(self, priority: int = Priority.INTERACTIVE):
        event = asyncio.Event()
        # use timestamp to maintain FIFO within same priority
        item = (priority, time.monotonic(), event)
        await self._queue.put(item)
        await self._try_release()
        try:
            await event.wait()
        except asyncio.CancelledError:
            async with self._lock:
                if event.is_set():
                    self._active = max(0, self._active - 1)
            await self._try_release()
            raise

    async def release(self):
        async with self._lock:
            self._active = max(0, self._active - 1)
        await self._try_release()

    async def _try_release(self):
        async with self._lock:
            while self._active < self.max_concurrent and not self._queue.empty():
                self._active += 1
                _, _, next_event = self._queue.get_nowait()
                next_event.set()

governor = PriorityGovernor(max_concurrent=1) # E.g. for Ollama inference
search_governor = PriorityGovernor(max_concurrent=4) # E.g. for local SQLite search

def with_qos(priority: int = Priority.INTERACTIVE):
    def decorator(func: Callable[..., Awaitable[T]]) -> Callable[..., Awaitable[T]]:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            await governor.acquire(priority)
            try:
                return await func(*args, **kwargs)
            finally:
                await governor.release()
        return wrapper
    return decorator
