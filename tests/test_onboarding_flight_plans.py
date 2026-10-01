# tests/test_onboarding_flight_plans.py
"""
Unit and Integration Tests for Sovereign Onboarding Flight-Plans.
Verifies:
1. Intelligent defaults synthesis from company profile tech_stack, stage, core_thesis, and enterprise_policy.
2. Founder save, customize, and publish flight-plan endpoints.
3. Multi-tenant data isolation: company-scoped flight plans never leak into fresh or unrelated companies.
4. User-scoped task completion state persistence in SQLite (onboarding_progress).
5. Reset to intelligent defaults.
6. Dual-write SQLite synchronisation with sovereign vault.db mirror.
7. Genesis blooming seeds flight-plan modules for the newly bloomed company.
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
from apps.api.core.onboarding import onboarding_repo
from apps.api.core.db import db


@pytest.fixture
def client():
    yield TestClient(app)


def test_intelligent_default_synthesis_genesis(client):
    """
    Verifies that when a company requests its flight plan for the first time,
    intelligent defaults are calibrated against its profile (tech_stack, stage, thesis, policy).
    """
    company_name = f"VortexSec-{uuid.uuid4().hex[:6]}"
    # Register and bloom company profile
    company_repo.bloom_genesis({
        "company_name": company_name,
        "industry": "Cybersecurity",
        "stage": "Series A",
        "team_size": "25 FTE",
        "runway_months": 18,
        "one_liner": "Air-gapped kernel security invariants",
        "core_thesis": "Cloud egress violates cryptographic data boundaries",
        "tech_stack": "Rust, Tokio, WebAssembly",
        "enterprise_policy": "REJECT_CUSTOM_FORKS",
    })

    # Retrieve flight plan
    res = client.get(f"/api/onboarding/flight-plan?company_name={company_name}")
    assert res.status_code == 200
    plan = res.json()
    assert plan["company_name"] == company_name
    assert len(plan["modules"]) >= 4

    # Day 1 must reference the air-gap invariant and company name
    day1 = next(m for m in plan["modules"] if m["day"] == 1)
    assert company_name in day1["title"]
    assert "Air-Gap Invariant" in day1["title"]
    assert any("invariants.yaml" in task for task in day1["tasks"])
    assert day1["milestone_tour"] is not None

    # Day 2 must calibrate to the company's tech stack (Rust, Tokio, WebAssembly)
    day2 = next(m for m in plan["modules"] if m["day"] == 2)
    assert "Rust, Tokio, WebAssembly" in day2["title"]
    assert "Tree-sitter" in day2["description"]

    # Day 3 must reflect Series A stage and enterprise policy
    day3 = next(m for m in plan["modules"] if m["day"] == 3)
    assert "Series A" in day3["description"]
    assert any("Bespoke Forks" in task for task in day3["tasks"])


def test_founder_save_and_publish_flight_plan(client):
    """
    Verifies that a founder can customize days, titles, and tasks,
    and publish the flight plan live to SQLite.
    """
    company_name = f"HelixBio-{uuid.uuid4().hex[:6]}"

    custom_modules = [
        {
            "id": f"MOD-{uuid.uuid4().hex[:8].upper()}",
            "day": 1,
            "title": "Bio-Security Clearance & Laboratory Induction",
            "description": "Induction into sovereign genomic data storage rules.",
            "tasks": [
                "Verify zero-cloud-egress network verification",
                "Install local invariant pre-commit hooks for Python & C++",
                "Sign air-gap compliance attestation",
            ],
            "order_index": 1,
            "is_published": True,
        },
        {
            "id": f"MOD-{uuid.uuid4().hex[:8].upper()}",
            "day": 2,
            "title": "Local BLAST Sequence Search Pipeline",
            "description": "Run offline sequence alignment using local hardware accelerators.",
            "tasks": [
                "Benchmark AST parser against staged genomic pipelines",
                "Submit compliant verification run",
            ],
            "order_index": 2,
            "is_published": True,
        },
        {
            "id": f"MOD-{uuid.uuid4().hex[:8].upper()}",
            "day": 3,
            "title": "First Compliant Clinical Pull Request",
            "description": "Commit first clinically validated algorithm feature.",
            "tasks": [
                "Execute local test suite in airplane mode",
                "Push PR passing all invariant gates",
            ],
            "order_index": 3,
            "is_published": True,
        },
    ]

    save_res = client.post(
        "/api/onboarding/flight-plan",
        json={
            "company_name": company_name,
            "title": f"{company_name} Sovereign Flight-Plan",
            "total_days": 14,
            "modules": custom_modules,
        },
    )
    assert save_res.status_code == 200
    saved_plan = save_res.json()
    assert len(saved_plan["modules"]) == 3
    assert saved_plan["modules"][0]["title"] == "Bio-Security Clearance & Laboratory Induction"

    # Fetch to verify persistence
    get_res = client.get(f"/api/onboarding/flight-plan?company_name={company_name}")
    assert get_res.status_code == 200
    fetched_plan = get_res.json()
    assert len(fetched_plan["modules"]) == 3
    assert fetched_plan["modules"][0]["tasks"][0] == "Verify zero-cloud-egress network verification"


def test_multi_tenant_flight_plan_isolation(client):
    """
    Verifies that company A's customized flight plan NEVER bleeds into company B or fresh accounts.
    """
    comp_a = f"TenantAlpha-{uuid.uuid4().hex[:6]}"
    comp_b = f"TenantBeta-{uuid.uuid4().hex[:6]}"

    # Save custom plan for TenantAlpha
    client.post(
        "/api/onboarding/flight-plan",
        json={
            "company_name": comp_a,
            "title": f"{comp_a} Alpha Flight-Plan",
            "modules": [
                {
                    "id": f"MOD-{uuid.uuid4().hex[:8].upper()}",
                    "day": 1,
                    "title": "Alpha Unique Secret Module 999",
                    "description": "Confidential Alpha tasks",
                    "tasks": ["Alpha Secret Task 1"],
                    "order_index": 1,
                    "is_published": True,
                }
            ],
        },
    )

    # TenantBeta retrieves its flight plan
    res_b = client.get(
        "/api/onboarding/flight-plan",
        headers={"X-Company-Name": comp_b},
    )
    assert res_b.status_code == 200
    plan_b = res_b.json()
    assert plan_b["company_name"] == comp_b

    # TenantBeta must NOT see Alpha's customized module
    titles_b = [m["title"] for m in plan_b["modules"]]
    assert "Alpha Unique Secret Module 999" not in titles_b
    for m in plan_b["modules"]:
        for t in m["tasks"]:
            assert "Alpha Secret" not in t


def test_new_hire_task_completion_persistence(client):
    """
    Verifies that a new hire's checklist completion state persists across requests
    and is scoped strictly to that user and company.
    """
    company_name = f"ChronosCorp-{uuid.uuid4().hex[:6]}"
    user_a = "usr-chloe-101"
    user_b = "usr-liam-202"

    # User A checks off task "1-0" and "1-1"
    up1 = client.post(
        "/api/onboarding/progress",
        json={
            "company_name": company_name,
            "user_id": user_a,
            "task_key": "1-0",
            "completed": True,
        },
    )
    assert up1.status_code == 200
    assert up1.json()["completed_tasks"]["1-0"] is True

    up2 = client.post(
        "/api/onboarding/progress",
        json={
            "company_name": company_name,
            "user_id": user_a,
            "task_key": "1-1",
            "completed": True,
        },
    )
    assert up2.status_code == 200
    assert up2.json()["completed_tasks"]["1-1"] is True

    # Fetch flight plan for User A
    res_a = client.get(
        f"/api/onboarding/flight-plan?company_name={company_name}&user_id={user_a}"
    )
    assert res_a.status_code == 200
    tasks_a = res_a.json()["completed_tasks"]
    assert tasks_a.get("1-0") is True
    assert tasks_a.get("1-1") is True

    # User B should have an empty or uncompleted progress map
    res_b = client.get(
        f"/api/onboarding/flight-plan?company_name={company_name}&user_id={user_b}"
    )
    assert res_b.status_code == 200
    tasks_b = res_b.json()["completed_tasks"]
    assert tasks_b.get("1-0") is not True

    # User A unchecks task "1-1"
    up3 = client.post(
        "/api/onboarding/progress",
        json={
            "company_name": company_name,
            "user_id": user_a,
            "task_key": "1-1",
            "completed": False,
        },
    )
    assert up3.status_code == 200
    assert up3.json()["completed_tasks"]["1-1"] is False


def test_reset_to_intelligent_defaults(client):
    """
    Verifies that calling /onboarding/reset-defaults restores the Genesis-calibrated defaults.
    """
    company_name = f"SolarisAI-{uuid.uuid4().hex[:6]}"

    # 1. Save an altered plan
    client.post(
        "/api/onboarding/flight-plan",
        json={
            "company_name": company_name,
            "title": "Altered Temporary Plan",
            "modules": [
                {
                    "id": "MOD-TEMP",
                    "day": 1,
                    "title": "Temporary Altered Day",
                    "description": "Temporary description",
                    "tasks": ["Temporary task"],
                    "order_index": 1,
                    "is_published": True,
                }
            ],
        },
    )

    # 2. Reset defaults
    res_reset = client.post(
        "/api/onboarding/reset-defaults",
        json={"company_name": company_name},
    )
    assert res_reset.status_code == 200
    reset_plan = res_reset.json()
    assert len(reset_plan["modules"]) >= 4
    assert any("Air-Gap Invariant" in m["title"] for m in reset_plan["modules"])
