# apps/api/ingestion/drop_watcher.py
"""
Track 3: Ambient Drop Folder Watcher (SDD Section 4.3)
Monitors `./drop/` or SMB network share using watchdog for spontaneous document and audio capture.
Computes SHA-256 hashes to guarantee zero-duplicate ingestion.
Automatically queues audio to WhisperWorker and document files to the DocIngester pipeline.
"""
import hashlib
import logging
import os
import threading
import time
from typing import Dict, Any, List, Optional, Callable

logger = logging.getLogger("tars.ingestion.watcher")

# Safe watchdog import
_WATCHDOG_AVAILABLE = False
try:
    from watchdog.observers import Observer
    from watchdog.events import FileSystemEventHandler
    _WATCHDOG_AVAILABLE = True
except ImportError:
    _WATCHDOG_AVAILABLE = False

from apps.api.ingestion.whisper_worker import whisper_worker
from apps.api.ingestion.doc_ingester import doc_ingester

DEFAULT_DROP_DIR = os.path.abspath(os.path.join(os.getcwd(), "drop"))
AUDIO_EXTENSIONS = {".wav", ".mp3", ".m4a", ".flac", ".ogg", ".aac", ".wma"}
DOC_EXTENSIONS = {".pdf", ".txt", ".md", ".docx", ".csv", ".json"}


class DropFileHandler:
    """Handles newly arrived files in the ambient drop folder with SHA-256 deduplication."""
    def __init__(self, on_event_callback: Optional[Callable[[Dict[str, Any]], None]] = None):
        self.on_event_callback = on_event_callback
        self.processed_hashes: Dict[str, Dict[str, Any]] = {}
        self.processed_files: Dict[str, Dict[str, Any]] = {}

    @staticmethod
    def compute_sha256(file_path: str) -> str:
        hasher = hashlib.sha256()
        with open(file_path, "rb") as f:
            while chunk := f.read(65536):
                hasher.update(chunk)
        return hasher.hexdigest()

    def process_file(self, file_path: str) -> Optional[Dict[str, Any]]:
        if not os.path.exists(file_path):
            return None

        filename = os.path.basename(file_path)
        if filename.startswith(".") or filename.endswith(".tmp") or filename.endswith(".part"):
            return None

        # Debounce: Ensure file is fully written before reading
        self._wait_for_write_complete(file_path)

        try:
            file_hash = self.compute_sha256(file_path)
        except Exception as e:
            logger.warning(f"Could not compute hash for {filename}: {e}")
            return None

        # Deduplication Guard (SDD 4.3)
        if file_hash in self.processed_hashes:
            logger.info(f"Duplicate file skipped ({filename}, SHA-256: {file_hash[:8]})")
            return self.processed_hashes[file_hash]

        ext = os.path.splitext(filename)[1].lower()
        file_size = os.path.getsize(file_path)

        record: Dict[str, Any] = {
            "path": file_path,
            "filename": filename,
            "file_hash": file_hash,
            "size_bytes": file_size,
            "detected_at": time.time(),
            "status": "DETECTED",
            "type": "UNKNOWN",
        }

        if ext in AUDIO_EXTENSIONS:
            record["type"] = "AUDIO"
            record["status"] = "QUEUED_FOR_TRANSCRIPTION"
            task_id = whisper_worker.enqueue(file_path, client_name=f"Drop: {filename}")
            record["task_id"] = task_id
            logger.info(f"Queued audio drop file '{filename}' as task {task_id}")
            self._notify({"event": "AUDIO_QUEUED", "filename": filename, "task_id": task_id, "hash": file_hash})

        elif ext in DOC_EXTENSIONS:
            record["type"] = "DOCUMENT"
            try:
                doc_record = doc_ingester.ingest_document(file_path)
                record["status"] = "INGESTED"
                record["doc_id"] = doc_record["doc_id"]
                logger.info(f"Ingested document '{filename}' as {doc_record['doc_id']}")
                self._notify({"event": "DOCUMENT_INGESTED", "filename": filename, "doc_id": doc_record["doc_id"], "hash": file_hash})
            except Exception as doc_err:
                record["status"] = "EXTRACTION_FAILED"
                record["error"] = str(doc_err)

        self.processed_hashes[file_hash] = record
        self.processed_files[file_path] = record
        return record

    def _notify(self, event_data: Dict[str, Any]):
        if self.on_event_callback:
            try:
                self.on_event_callback(event_data)
            except Exception as e:
                logger.error(f"Error in drop notification callback: {e}")

    def _wait_for_write_complete(self, file_path: str, timeout: float = 3.0):
        """Wait until file size stabilizes (prevents reading mid-copy)."""
        start = time.time()
        last_size = -1
        while time.time() - start < timeout:
            try:
                curr_size = os.path.getsize(file_path)
                if curr_size == last_size and curr_size > 0:
                    break
                last_size = curr_size
            except OSError:
                pass
            time.sleep(0.3)


if _WATCHDOG_AVAILABLE:
    class _WatchdogBridge(FileSystemEventHandler):
        def __init__(self, handler: DropFileHandler):
            self.handler = handler

        def on_created(self, event):
            if not event.is_directory:
                self.handler.process_file(event.src_path)


class AmbientDropWatcher:
    def __init__(self, drop_dir: str = DEFAULT_DROP_DIR):
        self.drop_dir = os.path.abspath(drop_dir)
        self.recent_events: List[Dict[str, Any]] = []
        self.handler = DropFileHandler(on_event_callback=self._record_event)
        self._observer: Optional[Any] = None
        self._poll_thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self.is_running = False

    def _record_event(self, event_data: Dict[str, Any]):
        event_data["timestamp"] = time.time()
        self.recent_events.append(event_data)
        if len(self.recent_events) > 100:
            self.recent_events.pop(0)

    def start(self):
        if self.is_running:
            return

        os.makedirs(self.drop_dir, exist_ok=True)
        self._stop_event.clear()

        if _WATCHDOG_AVAILABLE:
            try:
                bridge = _WatchdogBridge(self.handler)
                self._observer = Observer()
                self._observer.schedule(bridge, self.drop_dir, recursive=False)
                self._observer.start()
                self.is_running = True
                logger.info(f"Ambient watchdog observer started for '{self.drop_dir}'")
                return
            except Exception as e:
                logger.warning(f"Failed to initialize Watchdog Observer ({e}), falling back to Polling.")

        # Polling fallback
        self._poll_thread = threading.Thread(target=self._poll_loop, daemon=True, name="DropPollingThread")
        self._poll_thread.start()
        self.is_running = True
        logger.info(f"Ambient polling watcher started for '{self.drop_dir}'")

    def stop(self):
        self._stop_event.set()
        if self._observer:
            self._observer.stop()
            self._observer.join(timeout=1.0)
            self._observer = None
        if self._poll_thread and self._poll_thread.is_alive():
            self._poll_thread.join(timeout=1.0)
            self._poll_thread = None
        self.is_running = False
        logger.info("Ambient drop watcher stopped.")

    def _poll_loop(self):
        seen_files = set()
        while not self._stop_event.is_set():
            try:
                if os.path.exists(self.drop_dir):
                    current_files = set(os.listdir(self.drop_dir))
                    new_files = current_files - seen_files
                    for name in new_files:
                        full_path = os.path.join(self.drop_dir, name)
                        if os.path.isfile(full_path):
                            self.handler.process_file(full_path)
                    seen_files = current_files
            except Exception as err:
                logger.error(f"Error in drop poll loop: {err}")
            time.sleep(1.0)

    def scan_existing(self):
        """Immediately ingest any existing files present in the drop directory."""
        if not os.path.exists(self.drop_dir):
            return
        for name in os.listdir(self.drop_dir):
            full_path = os.path.join(self.drop_dir, name)
            if os.path.isfile(full_path) and not name.startswith("."):
                self.handler.process_file(full_path)

    def get_status(self) -> Dict[str, Any]:
        return {
            "drop_directory": self.drop_dir,
            "is_running": self.is_running,
            "watchdog_available": _WATCHDOG_AVAILABLE,
            "unique_hashes_count": len(self.handler.processed_hashes),
            "processed_file_count": len(self.handler.processed_files),
            "recent_events": self.recent_events[-10:],
        }


# Global singleton watcher instance
drop_watcher = AmbientDropWatcher()
