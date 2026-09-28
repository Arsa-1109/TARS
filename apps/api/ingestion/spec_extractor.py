# apps/api/ingestion/spec_extractor.py
"""
Track 3: Sub-Second Voice-to-Spec Extractor (Patch P-08 & Patch P-06)
Targets the Frontier Compound SLM cascade (qwen3:1.7b @ 120+ t/s, fallback qwen2.5:1.5b)
to extract 4 structured outputs in <600ms:
1. Executive Summary & Sentiment (POSITIVE, NEUTRAL, NEGATIVE, ESCALATION)
2. Unfiltered Customer Pain Points
3. Requested Features
4. Explicit Verbal Commitments
Enforces XML boundary framing (<untrusted_external_data>) and synchronizes
extracted entities to the embedded Kùzu graph database.
"""
import json
import logging
import re
import time
import uuid
from typing import Dict, Any, List, Optional
import httpx

from apps.api.schemas.contracts import VoiceToSpecResponse
from apps.api.ingestion.xml_framer import xml_framer
from apps.api.ingestion.kuzu_sync import kuzu_sync

logger = logging.getLogger("tars.ingestion.spec_extractor")

OLLAMA_API_URL = "http://localhost:11434/api/generate"


class VoiceToSpecExtractor:
    """
    Sub-second Voice-to-Spec Extractor utilizing qwen3:1.7b and XML prompt framing.
    """

    def __init__(
        self,
        ollama_url: str = OLLAMA_API_URL,
        primary_model: str = "qwen3:1.7b",
        fallback_model: str = "qwen2.5:1.5b",
    ):
        self.ollama_url = ollama_url
        self.primary_model = primary_model
        self.fallback_model = fallback_model

    def extract_spec(
        self,
        transcript: str,
        call_id: Optional[str] = None,
        client_name: str = "Enterprise Client",
        audio_duration: float = 180.0,
        audio_path: str = "",
        sync_to_graph: bool = True,
    ) -> VoiceToSpecResponse:
        """
        Extracts structured 4-part spec from transcript and synchronizes to Kùzu graph.
        """
        start_time = time.perf_counter()
        call_id = call_id or f"CALL-{uuid.uuid4().hex[:8].upper()}"

        # 1. Attempt extraction via Local SLM (Ollama)
        spec_dict = self._extract_with_slm(transcript, client_name)

        # 2. Extract heuristics and backfill any missing keys
        heuristics_dict = self._extract_with_heuristics(transcript, client_name)
        if not spec_dict:
            spec_dict = heuristics_dict
        else:
            for key in ["pain_points", "feature_requests", "commitments"]:
                if not spec_dict.get(key) and heuristics_dict.get(key):
                    spec_dict[key] = heuristics_dict[key]

        elapsed_ms = (time.perf_counter() - start_time) * 1000
        logger.info(f"Voice-to-Spec extraction for {call_id} completed in {elapsed_ms:.1f}ms")

        def _to_str_list(val: Any) -> List[str]:
            if not val:
                return []
            if isinstance(val, str):
                return [val]
            if isinstance(val, list):
                res = []
                for item in val:
                    if isinstance(item, str):
                        res.append(item)
                    elif isinstance(item, dict):
                        text = item.get("text") or item.get("description") or item.get("commitment") or item.get("detail") or " - ".join(str(v) for v in item.values())
                        res.append(str(text))
                    else:
                        res.append(str(item))
                return res
            return [str(val)]

        # 3. Assemble contract-frozen response
        response = VoiceToSpecResponse(
            call_id=call_id,
            client_name=client_name,
            sentiment=str(spec_dict.get("sentiment", "NEUTRAL")).upper(),
            summary=str(spec_dict.get("summary", "Call summary pending.")),
            pain_points=_to_str_list(spec_dict.get("pain_points")),
            feature_requests=_to_str_list(spec_dict.get("feature_requests")),
            commitments=_to_str_list(spec_dict.get("commitments")),
            audio_duration_seconds=audio_duration,
        )

        # 4. Sync entities into Kùzu Graph Engine (.tars/graph.kuzu)
        if sync_to_graph:
            try:
                kuzu_sync.sync_client_call(
                    call_id=call_id,
                    client_name=client_name,
                    sentiment=response.sentiment,
                    audio_path=audio_path or f"vault/audio/{call_id}.wav",
                    transcript_summary=response.summary,
                    date=int(time.time()),
                )

                # Link commitments as ActionItems in the graph
                for idx, commitment in enumerate(response.commitments):
                    action_id = f"ACT-{call_id}-{idx + 1}"
                    kuzu_sync.sync_action_item(
                        item_id=action_id,
                        description=commitment,
                        owner="Sales / Product",
                        status="OPEN",
                        source_type="CLIENT_CALL",
                        source_id=call_id,
                        timestamp_offset=f"00:{idx * 30:02d}",
                    )
            except Exception as graph_err:
                logger.warning(f"Error syncing call {call_id} to Kùzu graph: {graph_err}")

        return response

    def _extract_with_slm(self, transcript: str, client_name: str) -> Optional[Dict[str, Any]]:
        """
        Dispatches extraction to qwen3:1.7b using XML prompt framing (Patch P-06 & P-08).
        """
        system_instruction = (
            f"You are the TARS Voice-to-Spec Ingestion Specialist. Analyze customer transcripts for {client_name}.\n"
            "Return STRICTLY valid JSON with these exact keys:\n"
            "- sentiment: 'POSITIVE', 'NEUTRAL', 'NEGATIVE', or 'ESCALATION'\n"
            "- summary: A concise 2-sentence executive summary of the meeting\n"
            "- pain_points: Array of customer friction points and complaints\n"
            "- feature_requests: Array of explicit feature requests or technical demands\n"
            "- commitments: Array of explicit promises or deadlines given by our team to the client"
        )

        # Apply Patch P-06 XML Boundary Framing
        prompt = xml_framer.build_safe_prompt(
            system_instruction=system_instruction,
            untrusted_payload=transcript,
            task_directive="Extract the 4 structured outputs in JSON format now:",
            source="client_call_audio_transcript",
        )

        # Quick probe to see if local Ollama port is open
        try:
            with httpx.Client(timeout=0.3) as client:
                probe = client.get("http://localhost:11434/")
                if probe.status_code not in (200, 404):
                    return None
        except Exception:
            return None

        # Try primary model (qwen3:1.7b), then fallback (qwen2.5:1.5b)
        models_to_try = [self.primary_model, self.fallback_model, "qwen2.5:8b", "llama3.2:1b"]

        for model_name in models_to_try:
            try:
                with httpx.Client(timeout=2.0) as client:
                    res = client.post(
                        self.ollama_url,
                        json={
                            "model": model_name,
                            "prompt": prompt,
                            "format": "json",
                            "stream": False,
                            "options": {
                                "temperature": 0.1,
                                "num_predict": 350,
                            },
                        },
                    )
                    if res.status_code == 200:
                        raw_json_str = res.json().get("response", "{}")
                        return json.loads(raw_json_str)
            except Exception as e:
                logger.debug(f"Ollama inference with model '{model_name}' skipped: {e}")

        return None

    def _extract_with_heuristics(self, transcript: str, client_name: str) -> Dict[str, Any]:
        """
        Deterministic, offline heuristic extractor.
        Guarantees sub-50ms execution in complete air-gap mode (E_net = 0.00 KB).
        """
        lines = [line.strip() for line in re.split(r"[.\n]+", transcript) if line.strip()]

        pain_points: List[str] = []
        feature_requests: List[str] = []
        commitments: List[str] = []

        pain_keywords = ["issue", "problem", "broken", "slow", "friction", "pain", "hard", "bug", "crash", "blocker", "drop-off"]
        feature_keywords = ["need", "want", "require", "feature", "support", "integrate", "add", "can you", "request", "saml", "export"]
        commitment_keywords = ["will", "promise", "committed", "shipping", "deliver", "by next", "schedule", "guarantee", "send you"]

        for line in lines:
            line_lower = line.lower()
            if any(k in line_lower for k in pain_keywords):
                pain_points.append(line)
            if any(k in line_lower for k in feature_keywords):
                feature_requests.append(line)
            if any(k in line_lower for k in commitment_keywords):
                commitments.append(line)

        # Determine sentiment
        sentiment = "NEUTRAL"
        if len(pain_points) > 2 or any(k in transcript.lower() for k in ["unacceptable", "furious", "cancel", "escalate"]):
            sentiment = "ESCALATION" if "escalate" in transcript.lower() else "NEGATIVE"
        elif len(commitments) > 0 and len(pain_points) == 0:
            sentiment = "POSITIVE"

        summary = (
            f"Meeting with {client_name} regarding key technical deliverables. "
            f"Identified {len(pain_points)} customer pain points and {len(feature_requests)} requested features."
        )

        return {
            "sentiment": sentiment,
            "summary": summary,
            "pain_points": pain_points[:5] if pain_points else ["No major friction points reported."],
            "feature_requests": feature_requests[:5] if feature_requests else ["Standard workflow maintenance."],
            "commitments": commitments[:5] if commitments else ["Follow-up notes to be sent via email."],
        }


# Global singleton instance
spec_extractor = VoiceToSpecExtractor()
