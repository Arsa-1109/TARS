"""
End-to-End Production Readiness & Multi-Tenant Startup Appliance Verification Suite
===================================================================================
Verifies that a brand-new startup tenant ("Orbital Dynamics, Inc.") operates end-to-end
across Genesis onboarding, server-authoritative RBAC/session protection, hybrid search
(with real semantic embedding similarity and zero AetherFlow leakage), Knowledge RAG chat,
Think Tank /teach, Contradiction Check, Counterfactual Simulation, and Live AST Invariant scanning.
"""

import os
import uuid
import pytest
from fastapi.testclient import TestClient

from apps.api.main import app
from apps.api.core.db import db


@pytest.fixture
def client():
    return TestClient(app)


class TestStartupProductionReadinessE2E:
    """Verifies a non-AetherFlow startup lifecycle from Genesis to Cortex & Knowledge."""

    def test_full_startup_lifecycle_and_tenant_isolation(self, client: TestClient):
        suffix = uuid.uuid4().hex[:6]
        company_name = f"Orbital Dynamics {suffix}, Inc."
        founder_email = f"elena.{suffix}@orbitaldynamics.io"

        # 1. Genesis Bloom for a brand-new startup
        genesis_payload = {
            "company_name": company_name,
            "industry": "Aerospace & Autonomous Telemetry",
            "stage": "Seed",
            "team_size": "15-25",
            "runway_months": 24,
            "one_liner": "Deterministic low-latency satellite command telemetry pipelines.",
            "core_thesis": "Zero-cloud sovereign orbital command link infrastructure.",
            "tech_stack": "Rust, Python, FastAPI, PostgreSQL",
            "enterprise_policy": "REJECT_CUSTOM_FORKS",
            "pricing_model": "USAGE_BASED",
            "load_sample_assets": False,
        }
        bloom_res = client.post("/api/core/genesis/bloom", json=genesis_payload)
        assert bloom_res.status_code == 200, bloom_res.text
        bloom_data = bloom_res.json()
        assert bloom_data["status"] in ("BLOOMED", "PARTIALLY_BLOOMED")
        company_id = bloom_data["company_profile"]["id"]
        assert company_id != "CMP-GENESIS-01"

        # Register Founder user for Orbital Dynamics
        founder_res = client.post(
            "/api/core/users",
            json={
                "name": "Elena Rostova",
                "email": founder_email,
                "role": "FOUNDER",
                "department": "Engineering",
                "clearance": "EXECUTIVE_ONLY",
                "company_id": company_id,
                "company_name": company_name,
            },
        )
        assert founder_res.status_code == 200, founder_res.text
        founder_id = founder_res.json()["id"]

        # 2. Verify privilege escalation / cross-tenant overwrite protection on POST /api/core/users
        spoof_res = client.post(
            "/api/core/users",
            json={
                "name": "Spoofed Attacker",
                "email": founder_email,
                "role": "NEW_HIRE",
                "department": "Engineering",
                "clearance": "ALL_TEAM",
                "company_id": "CMP-ATTACKER-99",
                "company_name": "Attacker Corp",
            },
        )
        assert spoof_res.status_code == 200, spoof_res.text
        spoof_user = spoof_res.json()
        # Must preserve Elena's FOUNDER role, EXECUTIVE_ONLY clearance, and original company_id
        assert spoof_user["role"] == "FOUNDER"
        assert spoof_user["clearance"] == "EXECUTIVE_ONLY"
        assert spoof_user["company_id"] == company_id
        assert spoof_user["company_name"] == company_name

        # Create an engineer user in Orbital Dynamics
        dev_email = f"marcus.{suffix}@orbitaldynamics.io"
        dev_res = client.post(
            "/api/core/users",
            json={
                "name": "Marcus Chen",
                "email": dev_email,
                "role": "ENGINEER",
                "department": "Engineering",
                "clearance": "ALL_TEAM",
                "company_id": company_id,
                "company_name": company_name,
            },
        )
        assert dev_res.status_code == 200, dev_res.text
        dev_id = dev_res.json()["id"]

        # 3. Verify Admin Clearance Enforcement on Ingestion QoS Control
        # Developer session must be rejected (403)
        qos_denied = client.post(
            "/api/ingestion/qos/pause",
            headers={"X-Session-Id": dev_id},
        )
        assert qos_denied.status_code == 403

        # Founder session must be allowed (200)
        qos_allowed = client.post(
            "/api/ingestion/qos/pause",
            headers={"X-Session-Id": founder_id},
        )
        assert qos_allowed.status_code == 200
        client.post("/api/ingestion/qos/resume", headers={"X-Session-Id": founder_id})

        # 4. Ingest a tenant-specific memory and verify Hybrid Search (Channels 1, 2, 3) + Zero AetherFlow Leakage
        conn = db.get_connection()
        cursor = conn.cursor()
        mem_id = f"MEM-ORBITAL-{suffix}"
        cursor.execute(
            """
            INSERT INTO memories (id, record_type, title, content, clearance, source, timestamp, is_demo, organisation_id)
            VALUES (?, 'DOCUMENT', ?, ?, 'ALL_TEAM', 'orbital_telemetry_spec.md', 1765000000.0, 0, ?)
            """,
            (
                mem_id,
                "Orbital Ka-Band Uplink Frame Encryption Protocol",
                "All satellite command frames must use ChaCha20-Poly1305 authenticated encryption with hardware HSM key rotation every 12 hours.",
                company_id,
            ),
        )
        conn.commit()

        tenant_headers = {
            "X-Company-Name": company_name,
            "X-Organisation-ID": company_id,
            "X-Session-Id": founder_id,
            "X-User-Id": founder_id,
        }

        search_res = client.post(
            "/api/core/search",
            json={
                "query": "ChaCha20-Poly1305 satellite command frame encryption",
                "user_role": "FOUNDER",
                "user_department": "Flight Systems",
            },
            headers=tenant_headers,
        )
        assert search_res.status_code == 200, search_res.text
        search_data = search_res.json()
        citations = search_data.get("citations") or search_data.get("evidence") or []
        evidence_ids = [item.get("id") or item.get("doc_id") for item in citations]
        assert mem_id in evidence_ids

        # Assert zero AetherFlow / golden-demo leakage
        leaked_ids = {"MEM-CAP-TABLE-SEED", "DEC-014", "DEC-001", "DEC-002", "DEC-003"}
        assert not leaked_ids.intersection(set(evidence_ids))
        for item in citations:
            assert "aetherflow" not in (str(item.get("title", "")) + " " + str(item.get("snippet", ""))).lower()

        # 5. Think Tank /teach: Create a tenant-scoped institutional decision
        teach_res = client.post(
            "/api/core/teach",
            json={
                "content": "We are standardizing on PostgreSQL TimescaleDB for orbital pass telemetry archiving and deprecating InfluxDB.",
                "department": "Flight Systems",
                "author": "Elena Rostova",
            },
            headers=tenant_headers,
        )
        assert teach_res.status_code == 200, teach_res.text
        teach_data = teach_res.json()
        taught_decision_id = teach_data.get("decision_id") or teach_data.get("memory_id") or teach_data.get("id")
        assert taught_decision_id is not None

        # Verify tenant decisions list includes the taught decision and excludes AetherFlow DEC-014
        decs_res = client.get(
            "/api/cortex/decisions",
            params={"company_name": company_name},
            headers=tenant_headers,
        )
        assert decs_res.status_code == 200
        decs_payload = decs_res.json()
        decs_list = decs_payload if isinstance(decs_payload, list) else decs_payload.get("decisions", [])
        tenant_dec_ids = [d["id"] for d in decs_list]
        if str(taught_decision_id).startswith("DEC-"):
            assert taught_decision_id in tenant_dec_ids
        assert "DEC-014" not in tenant_dec_ids

        # 6. Contradiction Check & Counterfactual Simulation scoped to Orbital Dynamics
        contra_res = client.post(
            "/api/cortex/contradiction-check",
            json={
                "proposal": "We will build a bespoke custom SAML SSO fork for a single customer",
                "category": "ALL",
                "company_name": company_name,
            },
            headers=tenant_headers,
        )
        assert contra_res.status_code == 200, contra_res.text
        contra_data = contra_res.json()
        assert contra_data.get("conflicting_decision_id") != "DEC-014"

        sim_res = client.post(
            "/api/cortex/simulate",
            json={"proposal": "Migrate telemetry database storage and auth pipeline"},
            headers=tenant_headers,
        )
        assert sim_res.status_code == 200
        sim_data = sim_res.json()
        assert "affected_code_modules" in sim_data
        assert len(sim_data["affected_code_modules"]) >= 1
        # Must not leak Acme Corp commitment
        for promise in sim_data.get("affected_client_promises", []):
            assert "acme corp" not in promise.lower()

        # 7. Knowledge RAG Chat Session scoped to Orbital Dynamics
        chat_sess_res = client.post(
            "/api/core/chat/sessions",
            json={"user_id": founder_id, "title": "Orbital Telemetry Review"},
            headers=tenant_headers,
        )
        assert chat_sess_res.status_code == 200
        chat_session_id = chat_sess_res.json()["id"]

        msg_res = client.post(
            f"/api/core/chats/{chat_session_id}/messages?user_id={founder_id}",
            json={
                "content": "What encryption protocol is mandated for our Ka-Band satellite command frames?",
                "user_id": founder_id,
                "user_role": "FOUNDER",
                "user_name": "Elena Rostova",
                "clearance": "EXECUTIVE_ONLY",
            },
            headers=tenant_headers,
        )
        assert msg_res.status_code == 200, msg_res.text
        msg_data = msg_res.json()
        ai_msg = msg_data.get("assistant_message") or msg_data.get("ai_message") or msg_data
        ai_content = str(ai_msg.get("content", ""))
        assert "aetherflow" not in ai_content.lower()

        # 8. Live AST Invariants & Pre-commit Simulation
        inv_res = client.get("/api/cortex/invariants")
        assert inv_res.status_code == 200
        inv_payload = inv_res.json()
        invariants = inv_payload if isinstance(inv_payload, list) else inv_payload.get("invariants", [])
        assert len(invariants) >= 5

        precommit_res = client.get("/api/cortex/invariants/simulator/INV-017")
        assert precommit_res.status_code == 200
        precommit_data = precommit_res.json()
        assert precommit_data["rule_id"] == "INV-017"
        assert isinstance(precommit_data["execution_time_ms"], (int, float))
        assert precommit_data["execution_time_ms"] > 0
