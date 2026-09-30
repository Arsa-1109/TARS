# apps/api/core/errors.py
"""
TARS Core Invariant Foundation: Canonical Machine-Readable Error Models
Eliminates plausible fake-success fallbacks and standardizes RFC-compliant
error responses across all endpoints.
"""
from typing import Optional, Dict, Any
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field


class ErrorDetail(BaseModel):
    code: str = Field(..., description="Canonical machine-readable error code")
    message: str = Field(..., description="Human-readable explanation of error condition")
    component: str = Field(..., description="Subsystem originating the failure: ollama, retrieval, ingestion, kuzu, audit, rbac")
    retryable: bool = Field(default=False, description="Whether client should attempt retry")
    request_id: Optional[str] = Field(default=None, description="Correlated TARS request identifier")
    details: Dict[str, Any] = Field(default_factory=dict, description="Diagnostic payload without secrets")


class ErrorResponseEnvelope(BaseModel):
    error: ErrorDetail


class TARSException(HTTPException):
    """
    Authoritative exception class for all sovereign TARS services.
    Guarantees machine-readable failure modes rather than ambiguous HTTP statuses.
    """
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 500,
        component: str = "core",
        retryable: bool = False,
        details: Optional[Dict[str, Any]] = None,
        request_id: Optional[str] = None,
    ):
        self.error_detail = ErrorDetail(
            code=code,
            message=message,
            component=component,
            retryable=retryable,
            request_id=request_id,
            details=details or {},
        )
        self.code = code
        self.details = details or {}
        self.component = component
        super().__init__(status_code=status_code, detail=self.error_detail.model_dump())


# Standardized Domain Error Codes
class ErrorCodes:
    INFERENCE_UNAVAILABLE = "INFERENCE_UNAVAILABLE"
    NO_EVIDENCE = "NO_EVIDENCE"
    UNAUTHORIZED_CLEARANCE = "UNAUTHORIZED_CLEARANCE"
    TENANT_MISMATCH = "TENANT_MISMATCH"
    INGESTION_TRANSACTION_FAILED = "INGESTION_TRANSACTION_FAILED"
    AUDIT_INTEGRITY_FAILURE = "AUDIT_INTEGRITY_FAILURE"
    INVALID_LIFECYCLE_TRANSITION = "INVALID_LIFECYCLE_TRANSITION"
    ZERO_EGRESS_VIOLATION = "ZERO_EGRESS_VIOLATION"


async def tars_exception_handler(request: Request, exc: TARSException) -> JSONResponse:
    """FastAPI exception handler ensuring consistent error envelope with request correlation."""
    payload = exc.error_detail.model_dump()
    if not payload.get("request_id"):
        payload["request_id"] = getattr(request.state, "request_id", None)
    return JSONResponse(status_code=exc.status_code, content={"error": payload})
