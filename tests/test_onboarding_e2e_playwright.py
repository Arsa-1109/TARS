# tests/test_onboarding_e2e_playwright.py
"""
Playwright End-to-End Test Suite for Dynamic Onboarding Flight-Plans.
Verifies the complete Founder Studio and New Hire workflow:
1. Founder launches Onboarding Workspace and clicks "Configure Flight-Plan".
2. Founder adds a custom milestone task ("Review zero-cloud-egress network verification") and clicks "Save & Publish".
3. Role switches to New Hire (NEW_HIRE).
4. New Hire view loads the published flight plan with the newly added task.
5. New Hire checks off the task, triggering real-time progress update.
6. Page reloads, and task check state remains persisted in SQLite.
All architectural comments written in British English.
"""
import os
import sys
import time
import json
import socket
import threading
import pytest
from pathlib import Path

# Ensure project root in sys.path
root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

import uvicorn
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from playwright.sync_api import sync_playwright

from apps.api.main import app as tars_backend_app


def find_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]


@pytest.fixture(scope="module")
def app_server():
    """Spins up a sovereign composite server mounting both backend APIs and compiled frontend."""
    # Ensure AetherFlow is bloomed so Genesis wizard doesn't open
    from apps.api.core.company import company_repo
    company_repo.bloom_genesis({
        "company_name": "AetherFlow Technologies, Inc.",
        "website": "https://aetherflow.ai",
        "industry": "Developer Tools / Sovereign AI",
        "stage": "Seed",
        "team_size": "12 FTE",
        "runway_months": 9,
        "one_liner": "Privacy-preserving sovereign institutional memory and codebase invariant operating system.",
        "core_thesis": "Early-stage startups die of institutional context decay, code invariant breaches, and unvetted cloud AI leaks.",
        "icp": "Regulated Enterprises, Defense Contractors, and Fast-Growing Startups",
        "tech_stack": "Python, TypeScript, FastAPI, React 19, SQLite WAL, Kùzu Graph, Tree-sitter",
        "enterprise_policy": "REJECT_CUSTOM_FORKS",
        "pricing_model": "USAGE_BASED",
        "tars_tone": "CONCISE_EXECUTIVE",
    })

    port = find_free_port()
    dist_dir = os.path.abspath(os.path.join(root_dir, "apps", "web", "dist"))

    # Mount compiled static frontend onto backend app directly (routes already prefixed with /api)
    try:
        tars_backend_app.mount("/", StaticFiles(directory=dist_dir, html=True), name="frontend")
    except Exception:
        pass

    server_config = uvicorn.Config(
        tars_backend_app,
        host="127.0.0.1",
        port=port,
        log_level="error",
    )
    server = uvicorn.Server(server_config)

    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()

    # Wait for server to accept connections
    base_url = f"http://127.0.0.1:{port}"
    max_wait = 10
    start_time = time.time()
    ready = False
    while time.time() - start_time < max_wait:
        try:
            with socket.create_connection(('127.0.0.1', port), timeout=0.5):
                ready = True
                break
        except (OSError, ConnectionRefusedError):
            time.sleep(0.1)

    if not ready:
        pytest.fail(f"Could not connect to composite app server on {base_url} within {max_wait}s")

    yield base_url
    server.should_exit = True


def test_onboarding_flight_plans_e2e(app_server):
    """Executes full end-to-end user journey across Founder and New Hire roles."""
    with sync_playwright() as p:
        try:
            browser = p.chromium.launch(headless=True)
        except Exception:
            browser = p.chromium.launch(headless=True, channel="chrome")
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()

        # Step 1: Initialize Founder session in localStorage
        page.goto(app_server)
        page.evaluate("""() => {
            const profile = {
                id: 'usr-alex',
                name: 'Alex Vance',
                role: 'FOUNDER',
                department: 'Executive',
                clearance: 'EXECUTIVE_ONLY',
                company_name: 'AetherFlow Technologies, Inc.',
                company_id: 'CMP-GENESIS-01'
            };
            localStorage.setItem('tars_is_authenticated', 'true');
            localStorage.setItem('tars_onboarding_completed', 'true');
            localStorage.setItem('tars_genesis_completed', 'true');
            localStorage.setItem('tars_genesis_completed_aetherflow_technologies,_inc.', 'true');
            localStorage.setItem('tars_current_role', 'FOUNDER');
            localStorage.setItem('tars_current_user_profile', JSON.stringify(profile));
            localStorage.setItem('tars_session_storage', JSON.stringify({
                state: {
                    isAuthenticated: true,
                    onboardingCompleted: true,
                    currentRole: 'FOUNDER',
                    profile: profile,
                    activeDomain: 'executive'
                },
                profile: profile,
                role: 'FOUNDER'
            }));
        }""")

        # Step 2: Reload and navigate to Onboarding Workspace
        page.goto(app_server)
        page.wait_for_selector("header", timeout=8000)
        time.sleep(0.5)

        # Click Onboarding tab in top navigation
        onboarding_nav = page.locator("button:has-text('Onboarding')").first
        onboarding_nav.wait_for(state="visible", timeout=8000)
        onboarding_nav.click(force=True)

        # Step 3: Verify Founder controls
        page.wait_for_selector("text=Onboarding Hub", timeout=8000)
        configure_btn = page.locator("button:has-text('Configure Flight-Plan')")
        configure_btn.wait_for(state="visible", timeout=8000)
        assert configure_btn.is_visible(), "Configure Flight-Plan button must be visible for FOUNDER"

        # Step 4: Open Founder Flight-Plan Studio
        configure_btn.click(force=True)
        page.wait_for_selector("text=Founder Flight-Plan Studio", timeout=8000)

        # Add custom task
        task_input = page.locator("input[placeholder='Add milestone task...']")
        task_input.wait_for(state="visible", timeout=5000)
        task_input.fill("Review zero-cloud-egress network verification")

        add_task_btn = page.locator("button:has-text('Add')").last
        add_task_btn.click(force=True)

        # Verify task is shown in studio list
        page.wait_for_selector("input[value='Review zero-cloud-egress network verification']", timeout=5000)

        # Save and publish
        save_btn = page.locator("button:has-text('Save & Publish')")
        save_btn.click(force=True)

        # Wait for toast confirmation
        page.wait_for_selector("text=published live", timeout=8000)
        time.sleep(1.0)

        # Step 5: Switch role to New Hire (Chloe Dubois)
        page.evaluate("""() => {
            const profile = {
                id: 'usr-chloe',
                name: 'Chloe Dubois',
                role: 'NEW_HIRE',
                department: 'Engineering',
                clearance: 'ALL_TEAM',
                company_name: 'AetherFlow Technologies, Inc.',
                company_id: 'CMP-GENESIS-01'
            };
            localStorage.setItem('tars_current_role', 'NEW_HIRE');
            localStorage.setItem('tars_genesis_completed', 'true');
            localStorage.setItem('tars_genesis_completed_aetherflow_technologies,_inc.', 'true');
            localStorage.setItem('tars_current_user_profile', JSON.stringify(profile));
            localStorage.setItem('tars_session_storage', JSON.stringify({
                state: {
                    isAuthenticated: true,
                    onboardingCompleted: true,
                    currentRole: 'NEW_HIRE',
                    profile: profile,
                    activeDomain: 'executive'
                },
                profile: profile,
                role: 'NEW_HIRE'
            }));
        }""")
        page.reload()
        page.wait_for_selector("header", timeout=8000)
        time.sleep(0.5)

        # Navigate to Onboarding workspace as New Hire
        onboarding_nav = page.locator("button:has-text('Onboarding')").first
        onboarding_nav.wait_for(state="visible", timeout=8000)
        onboarding_nav.click(force=True)
        page.wait_for_selector("text=Onboarding Hub", timeout=8000)

        # Configure button must NOT be visible for NEW_HIRE
        configure_btn_nh = page.locator("button:has-text('Configure Flight-Plan')")
        assert not configure_btn_nh.is_visible(), "Configure Flight-Plan must NOT be visible for NEW_HIRE"

        # Verify the newly added task appears in New Hire checklist
        new_task_item = page.locator("text=Review zero-cloud-egress network verification")
        assert new_task_item.is_visible(), "Custom task must appear in New Hire view"

        # Step 6: Toggle checklist item and verify real-time tracking
        checkbox_label = page.locator("label:has-text('Review zero-cloud-egress network verification')")
        checkbox_label.click()
        time.sleep(1.0)

        # Step 7: Reload page to verify persistence across sessions in SQLite
        page.reload()
        page.wait_for_selector("header", timeout=8000)
        time.sleep(0.5)

        # Navigate back to Onboarding workspace
        onboarding_nav = page.locator("button:has-text('Onboarding')").first
        onboarding_nav.wait_for(state="visible", timeout=8000)
        onboarding_nav.click(force=True)
        page.wait_for_selector("text=Onboarding Hub", timeout=8000)

        # The task should still be checked (line-through styling or check icon)
        persisted_task_label = page.locator("label:has-text('Review zero-cloud-egress network verification')")
        persisted_task_label.wait_for(state="visible", timeout=5000)
        task_span = persisted_task_label.locator("span")
        class_attr = task_span.get_attribute("class") or ""
        assert "line-through" in class_attr, "Task must remain checked and struck-through after page reload"

        browser.close()
