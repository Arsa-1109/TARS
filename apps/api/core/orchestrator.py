import json
from typing import Dict, Any, Optional
from pydantic import BaseModel
from apps.api.core.events.models import Event, ActionProposal
from apps.api.core.search import search_service
from apps.api.core.ollama_client import ollama_client
from apps.api.core.mcp.executor import executor
from apps.api.core.mcp.schemas import ExecutionResult

class OrchestrationResult(BaseModel):
    event_id: str
    proposal: Optional[ActionProposal] = None
    execution_result: Optional[ExecutionResult] = None
    status: str
    error: Optional[str] = None

class TarsOrchestrator:
    async def process_event(self, event: Event) -> OrchestrationResult:
        try:
            # 1. Retrieve Memory
            query = f"{event.event_type} {json.dumps(event.payload)}"
            citations = await search_service.search(query, limit=3)
            context = "\n".join([f"[{c.doc_title}]: {c.snippet}" for c in citations])

            # 2. Assemble Prompt
            prompt = (
                f"Event Type: {event.event_type}\n"
                f"Payload: {json.dumps(event.payload)}\n"
                f"Memory Context:\n{context}\n\n"
                "Propose an action in JSON matching the ActionProposal schema."
            )

            # 3. Call Local Ollama
            response = await ollama_client.generate(prompt, structured_format="json")
            if not response.get("success"):
                return OrchestrationResult(event_id=event.event_id, status="OLLAMA_ERROR", error=response.get("error"))
            
            # 4. Parse Action Proposal
            proposal_data = response.get("response", {})
            try:
                proposal = ActionProposal(**proposal_data)
            except Exception as e:
                return OrchestrationResult(event_id=event.event_id, status="INVALID_PROPOSAL", error=str(e))

            # 5. MCP Execution
            # The executor internally handles permissions and audit logging
            exec_result = await executor.execute(
                tool_name=proposal.tool_name,
                arguments=proposal.tool_arguments,
                session_id=event.source,
                approval_granted=True if not proposal.requires_approval else False 
                # For testing, we assume approval is false unless it doesn't require it
            )

            return OrchestrationResult(
                event_id=event.event_id,
                proposal=proposal,
                execution_result=exec_result,
                status="EXECUTED" if exec_result.success else "EXECUTION_DENIED_OR_FAILED"
            )

        except Exception as e:
            return OrchestrationResult(event_id=event.event_id, status="SYSTEM_ERROR", error=str(e))

orchestrator = TarsOrchestrator()
