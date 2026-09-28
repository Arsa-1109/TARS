import os
import sys
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

SCREENSHOTS_DIR = Path("C:/Users/arsal/Desktop/Codes/TARS/docs/screenshots")
SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)

BASE_URL = "http://127.0.0.1:3000"

def capture_all():
    print(f"Starting high-resolution LIGHT MODE screenshot capture to {SCREENSHOTS_DIR}...", flush=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1440, "height": 900},
            device_scale_factor=2,
            color_scheme="light"
        )
        page = context.new_page()

        # ----------------------------------------------------------------------
        # 1. HERO LANDING PAGE (hero_landing.png)
        # ----------------------------------------------------------------------
        print("1. Capturing hero_landing.png (Light Mode Apple-grade landing)...", flush=True)
        page.goto(BASE_URL)
        page.evaluate("""() => {
            localStorage.clear();
            localStorage.setItem('tars_theme', 'light');
            localStorage.setItem('tars_genesis_completed', 'true');
            document.documentElement.classList.remove('dark');
        }""")
        page.reload()
        page.wait_for_selector("h1", timeout=10000)
        page.wait_for_timeout(1000)
        hero_path = str(SCREENSHOTS_DIR / "hero_landing.png")
        page.screenshot(path=hero_path)
        print(f"   [OK] Captured {hero_path}", flush=True)

        # ----------------------------------------------------------------------
        # Login to App Cockpit as Founder (Light Mode)
        # ----------------------------------------------------------------------
        print("Logging in to App Cockpit in Light Mode...", flush=True)
        page.evaluate("""() => {
            localStorage.setItem('tars_is_authenticated', 'true');
            localStorage.setItem('tars_current_role', 'FOUNDER');
            localStorage.setItem('tars_current_domain', 'executive');
            localStorage.setItem('tars_theme', 'light');
            localStorage.setItem('tars_genesis_completed', 'true');
            document.documentElement.classList.remove('dark');
        }""")
        page.reload()
        page.wait_for_selector("header", timeout=10000)
        page.wait_for_timeout(1200)

        # ----------------------------------------------------------------------
        # 2. WORKSPACE 1: KNOWLEDGE BASE (workspace1_knowledge.png)
        # ----------------------------------------------------------------------
        print("2. Capturing workspace1_knowledge.png...", flush=True)
        # Click Knowledge tab in TopBar
        page.locator("header button:has-text('Knowledge')").first.click()
        page.wait_for_timeout(800)
        
        # Click the first quick query button for instant rich answer & citations
        quick_btn = page.locator("button:has-text('What is our policy')").first
        if quick_btn.count() > 0:
            quick_btn.click()
            page.wait_for_timeout(2000)
        else:
            search_box = page.locator("input[placeholder*='Search']").first
            if search_box.count() > 0:
                search_box.fill("What is our policy on enterprise customisations?")
                page.keyboard.press("Enter")
                page.wait_for_timeout(2000)
        
        ws1_path = str(SCREENSHOTS_DIR / "workspace1_knowledge.png")
        page.screenshot(path=ws1_path)
        print(f"   [OK] Captured {ws1_path}", flush=True)

        # ----------------------------------------------------------------------
        # 3. WORKSPACE 2: CALL STUDIO (workspace2_call_studio.png)
        # ----------------------------------------------------------------------
        print("3. Capturing workspace2_call_studio.png...", flush=True)
        page.locator("header button:has-text('Calls')").first.click()
        page.wait_for_timeout(1000)
        
        # Select first call to ensure waveform & voice-to-spec cards are displayed
        call_item = page.locator("text=Acme Corp, text=CALL-2026").first
        if call_item.count() > 0:
            call_item.click()
            page.wait_for_timeout(600)

        ws2_path = str(SCREENSHOTS_DIR / "workspace2_call_studio.png")
        page.screenshot(path=ws2_path)
        print(f"   [OK] Captured {ws2_path}", flush=True)

        # ----------------------------------------------------------------------
        # 4. WORKSPACE 4: THINK TANK (workspace4_think_tank.png)
        # ----------------------------------------------------------------------
        print("4. Capturing workspace4_think_tank.png...", flush=True)
        page.locator("header button:has-text('Discussions')").first.click()
        page.wait_for_timeout(1000)
        
        # Click "Split" view button
        split_btn = page.locator("button:has-text('Split')").first
        if split_btn.count() > 0:
            split_btn.click()
            page.wait_for_timeout(800)

        ws4_path = str(SCREENSHOTS_DIR / "workspace4_think_tank.png")
        page.screenshot(path=ws4_path)
        print(f"   [OK] Captured {ws4_path}", flush=True)

        # ----------------------------------------------------------------------
        # 5. WORKSPACE 5: DECISIONS & WHAT-IF SIMULATION (workspace5_decisions_simulation.png)
        # ----------------------------------------------------------------------
        print("5. Capturing workspace5_decisions_simulation.png...", flush=True)
        page.locator("header button:has-text('Decisions')").first.click()
        page.wait_for_timeout(1000)
        
        # Open What-If Simulation drawer
        sim_btn = page.locator("button:has-text('What-If Simulation')").first
        if sim_btn.count() > 0:
            sim_btn.click()
            page.wait_for_timeout(2500)

        ws5_path = str(SCREENSHOTS_DIR / "workspace5_decisions_simulation.png")
        page.screenshot(path=ws5_path)
        print(f"   [OK] Captured {ws5_path}", flush=True)

        # Close simulation drawer if open before next step
        close_drawer_btn = page.locator("button[aria-label='Close drawer'], button:has-text('Done')").first
        if close_drawer_btn.count() > 0:
            close_drawer_btn.click()
            page.wait_for_timeout(500)

        # ----------------------------------------------------------------------
        # 6. WORKSPACE 6: ARCHITECTURE SENTINEL (workspace6_architecture_sentinel.png)
        # ----------------------------------------------------------------------
        print("6. Capturing workspace6_architecture_sentinel.png...", flush=True)
        page.locator("header button:has-text('Architecture')").first.click()
        page.wait_for_timeout(1000)
        
        # Click INV-017 violation card to show AST diff & <50ms badge
        inv17_card = page.locator("div:has-text('INV-017')").first
        if inv17_card.count() > 0:
            inv17_card.click()
            page.wait_for_timeout(800)

        ws6_path = str(SCREENSHOTS_DIR / "workspace6_architecture_sentinel.png")
        page.screenshot(path=ws6_path)
        print(f"   [OK] Captured {ws6_path}", flush=True)

        # ----------------------------------------------------------------------
        # 7. CURSOR MCP EXPORTER MODAL (cursor_mcp_modal.png)
        # ----------------------------------------------------------------------
        print("7. Capturing cursor_mcp_modal.png...", flush=True)
        mcp_btn = page.locator("button:has-text('Export Cursor MCP')").first
        if mcp_btn.count() > 0:
            mcp_btn.click()
            page.wait_for_timeout(1000)
        
        mcp_path = str(SCREENSHOTS_DIR / "cursor_mcp_modal.png")
        page.screenshot(path=mcp_path)
        print(f"   [OK] Captured {mcp_path}", flush=True)

        browser.close()
        print("All 7 screenshots captured with perfection!", flush=True)

if __name__ == "__main__":
    capture_all()
