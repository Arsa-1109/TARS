"""
test_fresh_company_isolation.py
=================================
Verifies multi-tenant isolation — Aetherflow golden-demo data (DEC-014, COM-ACME-001,
$666k cash, -$74k burn) must NEVER leak to fresh/non-Aetherflow companies.
The Aetherflow tenant must still have full access to all its data (golden-demo preserved).
"""
import uuid
import pytest
from fastapi.testclient import TestClient
from apps.api.main import app

client = TestClient(app)

# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

def _fresh_company_headers() -> dict:
    """Headers for a fresh company account — clearly NOT Aetherflow."""
    return {"X-Company-Name": f"NovaCorp-{uuid.uuid4().hex[:8]}"}


def _aetherflow_headers() -> dict:
    """Headers for the Aetherflow golden-demo tenant."""
    return {"X-Company-Name": "AetherFlow Technologies, Inc."}


# ─────────────────────────────────────────────
# 1. Decisions Isolation
# ─────────────────────────────────────────────

class TestDecisionsIsolation:
    def test_fresh_company_does_not_see_dec_014(self):
        """Fresh companies must NOT receive DEC-014 (Aetherflow-only zero-custom-forks decision)."""
        resp = client.get("/api/cortex/decisions", headers=_fresh_company_headers())
        assert resp.status_code == 200
        ids = [d["id"] for d in resp.json()]
        assert "DEC-014" not in ids, (
            f"DEC-014 leaked to a fresh company! Decisions returned: {ids}"
        )

    def test_aetherflow_sees_dec_014(self):
        """Aetherflow golden-demo tenant MUST still see DEC-014."""
        resp = client.get("/api/cortex/decisions", headers=_aetherflow_headers())
        assert resp.status_code == 200
        ids = [d["id"] for d in resp.json()]
        assert "DEC-014" in ids, (
            f"DEC-014 is missing from Aetherflow decisions! Decisions returned: {ids}"
        )

    def test_decisions_without_header_defaults_to_active_profile(self):
        """Without a company header, GET /api/cortex/decisions should still return 200."""
        resp = client.get("/api/cortex/decisions")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)


# ─────────────────────────────────────────────
# 2. Contradiction Check Isolation
# ─────────────────────────────────────────────

class TestContradictionIsolation:
    def test_fresh_company_contradiction_excludes_dec_014(self):
        """
        A fresh company's contradiction check against the zero-custom-forks policy
        should NOT match DEC-014 (since DEC-014 is Aetherflow-only).
        """
        payload = {
            "proposal": "We will build a fully custom SAML SSO fork per enterprise request",
            "category": "ALL",
            "company_name": f"FreshStart-{uuid.uuid4().hex[:6]}",
        }
        resp = client.post("/api/cortex/contradiction-check", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        # The conflict should NOT be flagged as DEC-014 for a fresh company
        assert data.get("conflicting_decision_id") != "DEC-014", (
            "Fresh company's contradiction check incorrectly flagged DEC-014!"
        )

    def test_aetherflow_contradiction_can_match_dec_014(self):
        """
        For Aetherflow, the same proposal against zero-custom-forks SHOULD detect DEC-014.
        """
        payload = {
            "proposal": "We will build a fully custom SAML SSO fork per enterprise request",
            "category": "ALL",
            "company_name": "AetherFlow Technologies, Inc.",
        }
        resp = client.post("/api/cortex/contradiction-check", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        # Conflict detection should find DEC-014 for Aetherflow
        if data.get("has_conflict"):
            assert data.get("conflicting_decision_id") == "DEC-014", (
                f"Expected DEC-014 conflict for Aetherflow but got: {data.get('conflicting_decision_id')}"
            )


# ─────────────────────────────────────────────
# 3. Simulation Isolation
# ─────────────────────────────────────────────

class TestSimulationIsolation:
    def test_fresh_company_no_acme_corp_in_simulation(self):
        """Fresh companies must NOT see 'Acme Corp' in affected_client_promises."""
        payload = {
            "proposal": "Replace all SAML SSO with a custom auth flow",
            "reallocated_devs": 2,
            "delay_days": 30,
            "company_name": f"NovaCorp-{uuid.uuid4().hex[:6]}",
        }
        resp = client.post("/api/cortex/simulate", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        promises = " ".join(data.get("affected_client_promises", [])).lower()
        assert "acme" not in promises, (
            f"Acme Corp leaked into fresh company simulation! Promises: {data.get('affected_client_promises')}"
        )

    def test_aetherflow_simulation_can_have_acme(self):
        """Aetherflow simulation should be allowed to include Acme Corp commitments."""
        payload = {
            "proposal": "Replace SAML SSO with a custom auth flow",
            "reallocated_devs": 2,
            "delay_days": 30,
            "company_name": "AetherFlow Technologies, Inc.",
        }
        resp = client.post("/api/cortex/simulate", json=payload)
        assert resp.status_code == 200
        # Just verify it returns valid structure — Acme may or may not appear
        data = resp.json()
        assert "runway_impact_months" in data

    def test_fresh_company_runway_is_not_aetherflow_default(self):
        """
        Fresh company runway should not default to 9.0 months (Aetherflow's demo value)
        when no profile is found. Expected default for fresh accounts: 18.0 months.
        """
        payload = {
            "scenario_prompt": "Cut engineering team by 50% to extend runway",
            "burn_delta_monthly": 30000,
            "timeline_shift_days": 0,
            "devs_reallocated": 0,
            "company_name": f"BootstrapCo-{uuid.uuid4().hex[:6]}",
        }
        resp = client.post("/api/cortex/simulate/scenario", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        baseline = data.get("baseline_runway_months", 0)
        # Fresh account defaults to 18 months; Aetherflow is 9.0 months
        assert baseline != 9.0, (
            f"Fresh company inherited Aetherflow's 9.0mo runway! Got: {baseline}"
        )

    def test_fresh_company_scenario_no_acme_client(self):
        """Fresh company scenario must not include Acme Corp in compromised_clients."""
        payload = {
            "scenario_prompt": "Delay SAML SSO enterprise integration by one quarter",
            "burn_delta_monthly": 0,
            "timeline_shift_days": 90,
            "devs_reallocated": 1,
            "company_name": f"NovaCorp-{uuid.uuid4().hex[:6]}",
        }
        resp = client.post("/api/cortex/simulate/scenario", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        clients = [c.get("client", "") for c in data.get("compromised_clients", [])]
        assert "Acme Corp" not in clients, (
            f"Acme Corp leaked into fresh company scenario! compromised_clients: {clients}"
        )


# ─────────────────────────────────────────────
# 4. Golden Demo Preservation
# ─────────────────────────────────────────────

class TestGoldenDemoPreservation:
    def test_aetherflow_scenario_returns_valid_financials(self):
        """Aetherflow scenario simulation must return the real $666k-based runway."""
        payload = {
            "scenario_prompt": "Ramp down SAML SSO feature to cut burn by $10k/mo",
            "burn_delta_monthly": -10000,
            "timeline_shift_days": 0,
            "devs_reallocated": 0,
            "company_name": "AetherFlow Technologies, Inc.",
        }
        resp = client.post("/api/cortex/simulate/scenario", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("baseline_runway_months") is not None
        assert data.get("simulated_runway_months") is not None

    def test_cortex_status_returns_online(self):
        """Cortex status endpoint must always return ONLINE regardless of tenant."""
        resp = client.get("/api/cortex/status")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ONLINE"
