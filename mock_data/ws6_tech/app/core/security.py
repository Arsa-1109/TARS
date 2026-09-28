"""
AetherFlow Security Core (VIOLATES INV-008)
Demonstrates hardcoded fallback cryptographic secret vulnerability.

Trigger Condition for TARS Tree-sitter Invariant Engine:
Tree-sitter rule: INV-008 (Hardcoded fallback secret string in production code)
"""

import os
import jwt
from datetime import datetime, timedelta
from typing import Dict, Any

# [FATAL VIOLATION - INV-008] Hardcoded default secret string!
# If JWT_SECRET environment variable is missing in staging or production,
# the application silently signs tokens using this publicly known string,
# allowing attackers to forge arbitrary administrative JWT tokens!
JWT_SECRET_KEY = os.getenv("JWT_SECRET", "aetherflow-dev-secret-unsafe-fallback-key-2026")
JWT_ALGORITHM = "HS256"

def create_access_token(data: Dict[str, Any], expires_delta: timedelta = timedelta(hours=8)) -> str:
    """Creates signed JWT token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + expires_delta
    to_encode.update({"exp": expire, "iss": "aetherflow-auth"})
    
    # Signs token with potentially compromised fallback key
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt
