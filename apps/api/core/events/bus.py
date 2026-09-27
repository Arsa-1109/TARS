from typing import Callable, Dict, List
from .models import Event, EventType

EventHandler = Callable[[Event], None]

class EventBus:
    def __init__(self):
        self._handlers: Dict[EventType, List[EventHandler]] = {
            EventType.INVARIANT_BREACH: [],
            EventType.ACTION_ITEM_CREATED: [],
            EventType.DOCUMENT_INGESTED: [],
            EventType.DECISION_CREATED: []
        }

    def subscribe(self, event_type: EventType, handler: EventHandler):
        if event_type in self._handlers:
            self._handlers[event_type].append(handler)
        else:
            self._handlers[event_type] = [handler]

    def publish(self, event: Event):
        handlers = self._handlers.get(event.event_type, [])
        for handler in handlers:
            handler(event)

# Global local event bus
local_bus = EventBus()
