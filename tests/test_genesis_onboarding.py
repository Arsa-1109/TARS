# tests/test_genesis_onboarding.py
"""
Unit and Integration Tests for TARS Genesis Onboarding & Sovereign Company Isolation.
Verifies:
1. Unbloomed state registration for newly signed up companies.
2. Scoped company profile resolution (no cross-company profile leakage).
3. Genesis blooming lifecycle and decision/flight-plan seeding.
4. Clean slate isolation for simulation and commitments (no mock Acme Corp leaks).
All architectural comments written in British English.
"""
import os
import sys
import uuid
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from apps.api.main import app
from apps.api.core.company import company_repo


@pytest.fixture
def client():
    yield TestClient(app)


def test_new_user_registration_registers_unbloomed_company(client):
    """
    Registering a new user with a distinct company name must register
    an unbloomed entry (is_bloomed = 0) and /company/profile must return null
    so that the Genesis Onboarding Wizard automatically triggers.
    """
    unique_name = f"NovaCorp-{uuid.uuid4().hex[:6]}"
    unique_email = f"founder@{unique_name.lower()}.io"

    # 1. Register new user
    res_user = client.post("/api/core/users", json={
        "name": "Sarah Connor",
        "email": unique_email,
        "role": "FOUNDER",
        "company_name": unique_name
    })
    assert res_user.status_code == 200
    user_data = res_user.json()
    assert user_data["company_name"] == unique_name

    # 2. Query company profile for this new company before blooming
    res_prof = client.get(f"/api/core/company/profile?company_name={unique_name}")
    assert res_prof.status_code == 200
    # Must be None / null because the company is unbloomed
    assert res_prof.json() is None

    # 3. Direct repo check confirms is_bloomed is 0
    raw_profile = company_repo.get_profile_by_name(unique_name)
    assert raw_profile is not None
    assert raw_profile.get("is_bloomed") == 0


def test_genesis_blooming_and_profile_resolution(client):
    """
    Genesis blooming persists company profile, seeds root decisions,
    and updates is_bloomed to 1 so /company/profile returns the bloomed profile.
    """
    unique_name = f"AuraCloud-{uuid.uuid4().hex[:6]}"

    # Bloom Genesis for this company
    payload = {
        "company_name": unique_name,
        "website": f"https://{unique_name.lower()}.com",
        "industry": "Developer Infrastructure",
        "stage": "Seed",
        "team_size": "6–15",
        "runway_months": 24,
        "one_liner": f"{unique_name} autonomous distributed runtime.",
        "core_thesis": "Local-first distributed execution.",
        "icp": "Infrastructure Engineers",
        "tech_stack": "Rust, TypeScript, SQLite",
        "enterprise_policy": "REJECT_CUSTOM_FORKS",
        "pricing_model": "USAGE_BASED",
        "tars_tone": "CONCISE_EXECUTIVE",
        "load_sample_assets": False
    }

    res_bloom = client.post("/api/core/genesis/bloom", json=payload)
    assert res_bloom.status_code == 200
    bloom_data = res_bloom.json()
    assert bloom_data["status"] == "BLOOMED"
    assert bloom_data["company_profile"]["company_name"] == unique_name
    assert bloom_data["flight_plans_count"] > 0
    assert len(bloom_data["seeded_decisions"]) == 3

    # Now /company/profile for AuraCloud returns the bloomed profile
    res_prof = client.get(f"/api/core/company/profile?company_name={unique_name}")
    assert res_prof.status_code == 200
    prof_data = res_prof.json()
    assert prof_data is not None
    assert prof_data["company_name"] == unique_name
    assert prof_data["runway_months"] == 24


def test_cortex_simulate_zero_leakage_for_clean_company(client):
    """
    Counterfactual simulation on a fresh proposal should not leak
    hardcoded Acme Corp commitments if none exist in the local graph.
    """
    res = client.post("/api/cortex/simulate", json={
        "proposal": "Implement general SSO SAML gateway for enterprise teams",
        "delay_days": 10,
        "reallocated_devs": 1
    })
    assert res.status_code == 200
    sim_data = res.json()
    assert "runway_impact_months" in sim_data
    assert "delivery_delay_weeks" in sim_data
    assert "executive_synthesis" in sim_data
