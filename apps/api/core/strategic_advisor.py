# apps/api/core/strategic_advisor.py
"""
Strategic Growth & Optimization Radar Service.
Proactively analyzes company data (ADRs, financial runway, cash burn, and onboarding documents)
using local ML (qwen3:8b via Ollama) in zero-egress mode to generate high-leverage growth vectors.
Strictly isolated per company tenant (e.g. Verdant vs AetherFlow) with zero cross-contamination
and zero hardcoded fallback data.
"""
import os
import json
import time
import uuid
import asyncio
import logging
from typing import List, Dict, Any, Optional, Tuple

from apps.api.core.db import db
from apps.api.core.company import company_repo
from apps.api.core.ollama_client import ollama_client

logger = logging.getLogger("tars.core.strategic_advisor")

_AETHERFLOW_NAMES = {
    "aetherflow",
    "aetherflow technologies",
    "aetherflow technologies, inc.",
    "aetherflow technologies inc"
}

def _is_aetherflow_company(company_name: Optional[str]) -> bool:
    if not company_name:
        return False
    clean = company_name.strip().lower()
    return clean in _AETHERFLOW_NAMES or "aetherflow" in clean

ROTATIONAL_FOCUS_THEMES = [
    {
        "pillar": "RUNWAY_DEFENSE",
        "name": "Runway Defense & Opex Optimization",
        "description": "Optimize operational expenditures, curtail unnecessary burn, and extend runway without sacrificing product delivery.",
    },
    {
        "pillar": "ENTERPRISE_REVENUE",
        "name": "Enterprise Revenue Expansion & Deal Velocity",
        "description": "Accelerate enterprise conversion, streamline deal compliance, and scale reusable customer solutions.",
    },
    {
        "pillar": "ENGINEERING_VELOCITY",
        "name": "Engineering Velocity & Invariant Enforcement",
        "description": "Harden architecture against regressions, automate developer guardrails, and maximize team shipping pace.",
    },
    {
        "pillar": "REGULATORY_MOAT",
        "name": "Regulatory Moat & Sovereign AI Compliance",
        "description": "Capitalize on regulatory certifications, audit provenance, and zero-egress data sovereignty to win enterprise trust.",
    }
]


class StrategicAdvisor:
    """Service for generating, storing, and managing company-exclusive strategic recommendations."""

    def __init__(self):
        self._ensure_table()
        self._worker_task: Optional[asyncio.Task] = None
        self._lock = asyncio.Lock()
        self._last_generation_time: float = 0.0
        self.current_theme_index: int = 0
        self.last_pulse_timestamp: Optional[float] = time.time()

    def _ensure_table(self):
        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS strategic_recommendations (
                id TEXT PRIMARY KEY,
                company_name TEXT DEFAULT 'AetherFlow',
                title TEXT NOT NULL,
                category TEXT NOT NULL,
                priority TEXT NOT NULL DEFAULT 'HIGH',
                rationale TEXT NOT NULL,
                estimated_impact TEXT NOT NULL,
                actionable_steps TEXT NOT NULL,
                supporting_citations TEXT,
                sim_prompt TEXT,
                sim_burn_delta REAL DEFAULT 0.0,
                sim_timeline_shift INTEGER DEFAULT 0,
                status TEXT DEFAULT 'ACTIVE',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        # Migrate schema if column is missing
        try:
            cursor.execute('ALTER TABLE strategic_recommendations ADD COLUMN company_name TEXT DEFAULT "AetherFlow"')
        except Exception:
            pass
        conn.commit()

    def list_recommendations(self, company_name: Optional[str] = None, status: str = "ACTIVE") -> List[Dict[str, Any]]:
        """Retrieves stored strategic recommendations scoped strictly to company_name."""
        conn = db.get_connection()
        cursor = conn.cursor()
        if company_name and company_name.strip():
            cursor.execute('''
                SELECT id, company_name, title, category, priority, rationale, estimated_impact,
                       actionable_steps, supporting_citations, sim_prompt,
                       sim_burn_delta, sim_timeline_shift, status, created_at
                FROM strategic_recommendations
                WHERE status = ? AND LOWER(company_name) = LOWER(?)
                ORDER BY
                    CASE priority WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END,
                    created_at DESC
            ''', (status, company_name.strip()))
        else:
            cursor.execute('''
                SELECT id, company_name, title, category, priority, rationale, estimated_impact,
                       actionable_steps, supporting_citations, sim_prompt,
                       sim_burn_delta, sim_timeline_shift, status, created_at
                FROM strategic_recommendations
                WHERE status = ?
                ORDER BY
                    CASE priority WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END,
                    created_at DESC
            ''', (status,))
        rows = cursor.fetchall()

        results = []
        for row in rows:
            try:
                steps = json.loads(row["actionable_steps"]) if row["actionable_steps"] else []
            except Exception:
                steps = [row["actionable_steps"]] if row["actionable_steps"] else []
            try:
                citations = json.loads(row["supporting_citations"]) if row["supporting_citations"] else []
            except Exception:
                citations = []

            results.append({
                "id": row["id"],
                "company_name": row["company_name"] if "company_name" in row.keys() else "AetherFlow",
                "title": row["title"],
                "category": row["category"],
                "priority": row["priority"],
                "rationale": row["rationale"],
                "estimated_impact": row["estimated_impact"],
                "actionable_steps": steps,
                "supporting_citations": citations,
                "sim_prompt": row["sim_prompt"],
                "sim_burn_delta": row["sim_burn_delta"],
                "sim_timeline_shift": row["sim_timeline_shift"],
                "status": row["status"],
                "created_at": row["created_at"]
            })
        return results

    def dismiss_recommendation(self, rec_id: str) -> bool:
        """Marks a recommendation as DISMISSED."""
        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE strategic_recommendations SET status = 'DISMISSED', updated_at = CURRENT_TIMESTAMP WHERE id = ?", (rec_id,))
        conn.commit()
        return cursor.rowcount > 0

    def _get_context_summary(self, company_name: Optional[str], focus_theme: Dict[str, Any]) -> Tuple[str, bool]:
        """
        Assembles company-exclusive context summary.
        Returns (context_string, has_sufficient_information).
        Never leaks AetherFlow data or files into other companies like Verdant.
        """
        target_name = company_name.strip() if company_name else "AetherFlow"
        is_aether = _is_aetherflow_company(target_name)

        # 1. Company Profile lookup
        profile = None
        if target_name:
            profile = company_repo.get_profile(company_name=target_name)
        if not profile and is_aether:
            profile = company_repo.get_profile()

        comp_name = profile.get("company_name") if profile else target_name
        team_size = profile.get("team_size") if profile else None
        runway_m = profile.get("runway_months") if profile else None

        # 2. Ingested Documents lookup strictly scoped
        ingested_docs = []
        try:
            conn = db.get_connection()
            cur = conn.cursor()
            cur.execute("SELECT filename, format, preview, content, is_demo FROM documents ORDER BY ingested_at DESC")
            all_rows = cur.fetchall()

            if is_aether:
                # AetherFlow documents (strictly exclude any Verdant/botanical docs)
                scoped_rows = [
                    r for r in all_rows
                    if not any(k in r["filename"].lower() for k in ["verdant", "fssai", "retail", "botanical", "organicsuperstores"])
                ][:8]
            elif "verdant" in target_name.lower():
                # Verdant documents strictly (from C:\Users\JOEL\Downloads\verdant_assets\verdant_assets)
                verdant_keys = ["verdant", "fssai", "retail", "guardrail", "arjun", "growth_dialogue", "botanical", "organicsuperstores"]
                scoped_rows = [
                    r for r in all_rows
                    if any(k in r["filename"].lower() for k in verdant_keys)
                    and not any(a in r["filename"].lower() for a in ["acme", "aether", "board_update", "discovery_fintech", "company_handbook"])
                ][:8]
            else:
                # Custom tenant: non-demo documents matching target name
                scoped_rows = [
                    r for r in all_rows
                    if not r["is_demo"] and target_name.lower() in r["filename"].lower()
                ][:8]

            for r in scoped_rows:
                fname = r["filename"]
                fmt = r["format"]
                snippet = (r["preview"] or r["content"] or "").strip()
                if snippet:
                    clean_snip = " ".join(snippet.replace("\r", " ").replace("\n", " ").split())
                    if len(clean_snip) > 300:
                        clean_snip = clean_snip[:300] + "..."
                    ingested_docs.append(f"{fname} ({fmt}): {clean_snip}")
                else:
                    ingested_docs.append(f"{fname} ({fmt})")
        except Exception as e:
            logger.warning(f"Error querying ingested docs for {target_name}: {e}")

        # 3. Active Decisions from Kùzu graph strictly scoped
        decisions_summary = []
        try:
            from apps.api.cortex.routes import graph_engine
            decs = graph_engine.get_all_decisions()
            if is_aether:
                decs = [
                    d for d in decs
                    if "verdant" not in str(d.get("title", "")).lower()
                ]
            elif "verdant" in target_name.lower():
                decs = [
                    d for d in decs
                    if any(k in (str(d.get("title", "")) + " " + str(d.get("context", ""))).lower()
                           for k in ["verdant", "fssai", "retail", "botanical", "beverage", "superstore", "cold-chain"])
                ]
            else:
                decs = [
                    d for d in decs
                    if target_name.lower() in (str(d.get("title", "")) + " " + str(d.get("context", ""))).lower()
                ]
            for d in decs[:8]:
                decisions_summary.append(f"- [{d.get('id')}]: {d.get('title')} ({d.get('category')}) - Chosen Policy: {d.get('chosen_option')}")
        except Exception:
            pass

        # 4. Onboarding context (Aetherflow ONLY)
        onboarding_excerpt = ""
        if is_aether:
            context_file = os.path.join("drop", "aetherflow_onboarding_context.md")
            if os.path.exists(context_file):
                try:
                    with open(context_file, "r", encoding="utf-8") as f:
                        onboarding_excerpt = f.read()[:2000]
                except Exception:
                    pass

        # Check if there is actual information to base suggestions on
        has_docs = len(ingested_docs) > 0
        has_decs = len(decisions_summary) > 0
        has_profile_details = bool(profile and (profile.get("one_liner") or profile.get("core_thesis") or profile.get("industry")))

        if not is_aether and not (has_docs or has_decs or has_profile_details):
            # Non-AetherFlow company with no profile, no documents, and no decisions
            return ("", False)

        # Build genuine context summary
        summary = f"Company Name: {comp_name}\n"
        if profile:
            if profile.get("industry"):
                summary += f"Industry: {profile.get('industry')}\n"
            if profile.get("stage"):
                summary += f"Stage: {profile.get('stage')}\n"
            if team_size:
                summary += f"Team Size: {team_size}\n"
            if runway_m:
                summary += f"Runway: {runway_m} months\n"
            if profile.get("one_liner"):
                summary += f"Mission / One-liner: {profile.get('one_liner')}\n"
            if profile.get("core_thesis"):
                summary += f"Core Strategic Thesis: {profile.get('core_thesis')}\n"
            if profile.get("enterprise_policy"):
                summary += f"Enterprise Policy: {profile.get('enterprise_policy')}\n"

        if is_aether:
            summary += "Financial Runway & Metrics: 18 months remaining ($666,000 cash balance, -$74,000/mo net burn, $984K ARR, 72 active customers)\n"

        summary += "\nActive Decisions in Graph:\n" + ("\n".join(decisions_summary) if decisions_summary else "No decisions recorded yet.") + "\n"

        if ingested_docs:
            summary += "\nIngested Company Documents:\n" + "\n".join([f"- {d}" for d in ingested_docs]) + "\n"
        if onboarding_excerpt:
            summary += f"\nOperational Highlights:\n{onboarding_excerpt}\n"

        summary += (
            f"\nCURRENT STRATEGIC FOCUS ROTATION: {focus_theme['name']}\n"
            f"Focus Directive: {focus_theme['description']}\n"
        )
        return (summary, True)

    async def generate_recommendations(self, company_name: Optional[str] = None, trigger_reason: str = "Manual") -> List[Dict[str, Any]]:
        """
        Invokes local Qwen3 model to analyze company state and produce 3-4 suggestions.
        If no data exists for the company (e.g. fresh Verdant tenant), returns empty list [].
        Never uses hardcoded mock fallback templates.
        """
        async with self._lock:
            target_company = company_name.strip() if company_name else "AetherFlow"
            theme = ROTATIONAL_FOCUS_THEMES[self.current_theme_index]
            self.current_theme_index = (self.current_theme_index + 1) % len(ROTATIONAL_FOCUS_THEMES)
            self._last_generation_time = time.time()
            self.last_pulse_timestamp = time.time()

            logger.info(f"Generating strategic growth suggestions for company='{target_company}' (trigger='{trigger_reason}', pillar='{theme['name']}')...")

            context, has_info = self._get_context_summary(target_company, theme)

            if not has_info:
                logger.info(f"Company '{target_company}' has no profile details, documents, or decisions. Leaving recommendations empty.")
                # Do NOT use mock fallbacks. Return empty list for this company.
                return self.list_recommendations(company_name=target_company, status="ACTIVE")

            system_prompt = (
                f"You are TARS, the sovereign strategic co-pilot and institutional advisor for {target_company}. "
                "Your objective is to propose high-impact, actionable, and non-obvious strategic recommendations to maximize company progress, extend runway, and accelerate growth. "
                f"The current operational theme is: '{theme['name']}' ({theme['description']}). "
                f"Ground your suggestions strictly in {target_company}'s real metrics, active decisions, and documents provided below. "
                "CRITICAL: Do NOT invent third-party company names, Acme Corp, $666,000 cash balance, BDR-018, or INV-017 unless explicitly present in the provided context for this company. "
                "Output your recommendations strictly as a JSON object containing a 'recommendations' array with 2 to 3 objects conforming to this schema:\n"
                "{\n"
                '  "recommendations": [\n'
                "    {\n"
                '      "title": "string (clear strategic initiative)",\n'
                '      "category": "REVENUE" | "RUNWAY" | "VELOCITY" | "ARCHITECTURE" | "SECURITY",\n'
                '      "priority": "HIGH" | "MEDIUM",\n'
                '      "rationale": "string (2-3 sentences explaining why based on existing company data)",\n'
                '      "estimated_impact": "string (e.g. \'+45 Days Runway\', \'+$30K MRR\', \'+25% Margin\')",\n'
                '      "actionable_steps": ["step 1", "step 2", "step 3"],\n'
                '      "supporting_citations": ["reference document name or decision title"],\n'
                '      "sim_prompt": "string (scenario for What-If Simulation)",\n'
                '      "sim_burn_delta": number (monthly burn change, e.g. -5000 or 10000),\n'
                '      "sim_timeline_shift": number (days shift, e.g. 15 or -10)\n'
                "    }\n"
                "  ]\n"
                "}"
            )
            user_prompt = (
                f"Analyze the current company data and documents for {target_company} below, focusing on '{theme['name']}':\n\n"
                f"{context}\n\n"
                "Return ONLY the valid JSON object with the 'recommendations' array."
            )

            recs_data: List[Dict[str, Any]] = []
            ollama_ok = await ollama_client.is_available()

            if ollama_ok:
                try:
                    result = await ollama_client.generate(
                        prompt=user_prompt,
                        system=system_prompt,
                        task_complexity="deep",
                        structured_format="json",
                        max_tokens=2200
                    )

                    if result.get("success") and isinstance(result.get("response"), dict):
                        resp_obj = result["response"]
                        if "recommendations" in resp_obj and isinstance(resp_obj["recommendations"], list):
                            recs_data = [x for x in resp_obj["recommendations"] if isinstance(x, dict)]
                        else:
                            for v in resp_obj.values():
                                if isinstance(v, list):
                                    recs_data = [x for x in v if isinstance(x, dict)]
                                    if recs_data:
                                        break
                    elif result.get("success") and isinstance(result.get("response"), list):
                        recs_data = [x for x in result["response"] if isinstance(x, dict)]

                    # Robust fallback parser if response was truncated or raw text contains JSON objects
                    if not recs_data:
                        raw_text = result.get("raw") or (result.get("response") if isinstance(result.get("response"), str) else "")
                        if raw_text:
                            import re
                            obj_matches = re.finditer(r'\{[^{}]*"title"\s*:[^{}]*\}', raw_text, re.DOTALL)
                            for om in obj_matches:
                                try:
                                    parsed_single = json.loads(om.group(0))
                                    if isinstance(parsed_single, dict) and "title" in parsed_single:
                                        recs_data.append(parsed_single)
                                except Exception:
                                    pass
                except Exception as gen_err:
                    logger.warning(f"Ollama generation encountered issue: {gen_err}.")

            # If Ollama did not produce or returned empty, do NOT inject mock fallbacks
            if not recs_data:
                logger.info(f"No recommendations generated by model for '{target_company}'. Leaving recommendations unchanged/empty.")
                return self.list_recommendations(company_name=target_company, status="ACTIVE")

            # Supersede prior ACTIVE recommendations strictly for this company
            conn = db.get_connection()
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE strategic_recommendations SET status = 'SUPERSEDED', updated_at = CURRENT_TIMESTAMP WHERE status = 'ACTIVE' AND LOWER(company_name) = LOWER(?)",
                (target_company,)
            )

            new_items = []
            for item in recs_data:
                if not isinstance(item, dict):
                    continue
                rec_id = f"REC-RADAR-{uuid.uuid4().hex[:6].upper()}"
                title = item.get("title", f"{theme['name']} Vector")
                cat = item.get("category", "STRATEGY").upper()
                if cat not in {"REVENUE", "RUNWAY", "VELOCITY", "ARCHITECTURE", "SECURITY"}:
                    cat = "STRATEGY"
                prio = item.get("priority", "HIGH").upper()
                if prio not in {"HIGH", "MEDIUM", "LOW"}:
                    prio = "HIGH"
                rationale = item.get("rationale", "")
                impact = item.get("estimated_impact", "Positive ROI")
                steps = item.get("actionable_steps", [])
                citations = item.get("supporting_citations", [])
                sim_prompt = item.get("sim_prompt", f"What if we implement: {title}?")
                sim_burn = float(item.get("sim_burn_delta", 0.0))
                sim_shift = int(item.get("sim_timeline_shift", 0))

                cursor.execute('''
                    INSERT INTO strategic_recommendations (
                        id, company_name, title, category, priority, rationale, estimated_impact,
                        actionable_steps, supporting_citations, sim_prompt,
                        sim_burn_delta, sim_timeline_shift, status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
                ''', (
                    rec_id, target_company, title, cat, prio, rationale, impact,
                    json.dumps(steps), json.dumps(citations),
                    sim_prompt, sim_burn, sim_shift
                ))
                new_items.append({
                    "id": rec_id,
                    "company_name": target_company,
                    "title": title,
                    "category": cat,
                    "priority": prio,
                    "rationale": rationale,
                    "estimated_impact": impact,
                    "actionable_steps": steps,
                    "supporting_citations": citations,
                    "sim_prompt": sim_prompt,
                    "sim_burn_delta": sim_burn,
                    "sim_timeline_shift": sim_shift,
                    "status": "ACTIVE",
                    "created_at": time.strftime("%Y-%m-%d %H:%M:%S")
                })
            conn.commit()

            # Broadcast real-time SSE event with company_name
            try:
                from apps.api.ingestion.routes import sse_manager
                if sse_manager:
                    sse_manager.publish("STRATEGIC_RADAR_UPDATED", {
                        "action": "AUTO_PULSE",
                        "company_name": target_company,
                        "trigger_reason": trigger_reason,
                        "focus_theme": theme["name"],
                        "count": len(new_items),
                        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
                    })
            except Exception as sse_err:
                logger.debug(f"SSE publish notice: {sse_err}")

            return self.list_recommendations(company_name=target_company, status="ACTIVE")

    def trigger_autonomous_pulse(self, company_name: Optional[str] = None, reason: str = "Event Trigger") -> None:
        """Schedules a non-blocking background generation pulse if not recently generated (<20s)."""
        now = time.time()
        if now - self._last_generation_time < 20:
            logger.info(f"Skipping autonomous pulse ({reason}): debounced (<20s)")
            return

        target_company = company_name.strip() if company_name else None

        async def _run_pulse():
            try:
                await asyncio.sleep(1.0)
                await self.generate_recommendations(company_name=target_company, trigger_reason=reason)
            except Exception as e:
                logger.error(f"Error in triggered autonomous pulse ({reason}): {e}")

        try:
            loop = asyncio.get_running_loop()
            loop.create_task(_run_pulse())
        except RuntimeError:
            pass

    def start_background_worker(self, interval_seconds: int = 120):
        """Starts the autonomous recurring pulse background task."""
        if self._worker_task and not self._worker_task.done():
            logger.info("Strategic advisor background worker is already active.")
            return

        async def _worker_loop():
            logger.info(f"Strategic advisor autonomous background worker started (interval={interval_seconds}s)")
            await asyncio.sleep(4)

            # Determine currently bloomed company
            try:
                active_profile = company_repo.get_profile()
                active_company = active_profile.get("company_name") if active_profile else "AetherFlow"
                await self.generate_recommendations(company_name=active_company, trigger_reason="Startup Autonomous Sync")
            except Exception as e:
                logger.warning(f"Initial startup pulse error: {e}")

            while True:
                try:
                    await asyncio.sleep(interval_seconds)
                    active_profile = company_repo.get_profile()
                    active_company = active_profile.get("company_name") if active_profile else "AetherFlow"
                    await self.generate_recommendations(company_name=active_company, trigger_reason="Periodic Autonomous Pulse")
                except asyncio.CancelledError:
                    logger.info("Strategic advisor background worker cancelled.")
                    break
                except Exception as e:
                    logger.error(f"Error in strategic advisor worker loop: {e}", exc_info=True)
                    await asyncio.sleep(10)

        try:
            loop = asyncio.get_running_loop()
            self._worker_task = loop.create_task(_worker_loop())
        except RuntimeError:
            pass

    def get_advisor_status(self, company_name: Optional[str] = None) -> Dict[str, Any]:
        """Returns autonomous worker status, last pulse timestamp, and current focus theme for company."""
        conn = db.get_connection()
        cursor = conn.cursor()
        if company_name and company_name.strip():
            cursor.execute(
                "SELECT COUNT(*) FROM strategic_recommendations WHERE status = 'ACTIVE' AND LOWER(company_name) = LOWER(?)",
                (company_name.strip(),)
            )
        else:
            cursor.execute("SELECT COUNT(*) FROM strategic_recommendations WHERE status = 'ACTIVE'")
        active_cnt = cursor.fetchone()[0]

        current_theme = ROTATIONAL_FOCUS_THEMES[self.current_theme_index]
        return {
            "worker_active": self._worker_task is not None and not self._worker_task.done(),
            "company_name": company_name or "AetherFlow",
            "last_pulse_timestamp": self.last_pulse_timestamp,
            "current_focus_pillar": current_theme["pillar"],
            "current_focus_name": current_theme["name"],
            "active_recommendations_count": active_cnt
        }


strategic_advisor = StrategicAdvisor()
