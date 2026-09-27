# apps/api/ingestion/__init__.py
"""
Track 3: Ingestion & Knowledge Graph Architecture Package (TARS v2.0.0)
Exposes canonical v2 engines and backward-compatible aliases for cross-track consumers.
"""
# Canonical v2 Singletons & Classes
from apps.api.ingestion.markitdown_parser import markitdown_parser, MarkitdownParser
from apps.api.ingestion.whisper_transcriber import whisper_transcriber, WhisperTranscriber, WhisperTask
from apps.api.ingestion.spec_extractor import spec_extractor, VoiceToSpecExtractor
from apps.api.ingestion.xml_framer import xml_framer, XMLFramer
XMLBoundarySanitizer = XMLFramer
from apps.api.ingestion.kuzu_sync import kuzu_sync, KuzuGraphEngine
from apps.api.ingestion.drop_watcher import drop_watcher, AmbientDropWatcher, DropFileHandler
from apps.api.ingestion.action_hub import action_hub_repo, ActionHubRepository
from apps.api.ingestion.routes import router, sse_manager, SSEEventManager

# Backward-Compatible Legacy Aliases (v1 compatibility)
try:
    from apps.api.ingestion.doc_ingester import DocumentIngester, doc_ingester
except ImportError:
    DocumentIngester = MarkitdownParser
    doc_ingester = markitdown_parser

try:
    from apps.api.ingestion.whisper_worker import WhisperWorker, whisper_worker
except ImportError:
    WhisperWorker = WhisperTranscriber
    whisper_worker = whisper_transcriber

try:
    from apps.api.ingestion.voice_to_spec import voice_to_spec
except ImportError:
    voice_to_spec = spec_extractor

__all__ = [
    # Canonical v2
    "markitdown_parser",
    "MarkitdownParser",
    "whisper_transcriber",
    "WhisperTranscriber",
    "WhisperTask",
    "spec_extractor",
    "VoiceToSpecExtractor",
    "xml_framer",
    "XMLBoundarySanitizer",
    "kuzu_sync",
    "KuzuGraphEngine",
    "drop_watcher",
    "AmbientDropWatcher",
    "DropFileHandler",
    "action_hub_repo",
    "ActionHubRepository",
    "router",
    "sse_manager",
    "SSEEventManager",
    # Legacy aliases
    "DocumentIngester",
    "doc_ingester",
    "WhisperWorker",
    "whisper_worker",
    "voice_to_spec",
]
