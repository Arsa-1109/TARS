# apps/api/core/strategic_advisor.py
"""
Strategic Growth & Optimization Radar Service.
Proactively analyzes company data (ADRs, financial runway, cash burn, and onboarding documents)
using local ML (qwen3:8b via Ollama) in zero-egress mode to generate high-leverage growth vectors.
Runs an autonomous background worker and event-driven pulses to continuously stream fresh suggestions.
"""
import os
import json
import time
import uuid
import asyncio
import logging
from typing import List, Dict, Any, Optional

from apps.api.core.db import db
from apps.api.core.company import company_repo
from apps.api.core.ollama_client import ollama_client

logger = logging.getLogger("tars.core.strategic_advisor")

ROTATIONAL_FOCUS_THEMES = [
    {
        "pillar": "RUNWAY_DEFENSE",
        "name": "Runway Defense & Opex Optimization",
        "description": "Aggressively protect $666K cash reserves, curtail -$74K/mo net burn, and optimize infrastructure spend with zero loss in team velocity.",
        "fallback_template": [
            {
                "title": "Migrate High-Throughput Ingestion to Local WAL Buffer to Eliminate Egress Costs",
                "category": "RUNWAY",
                "priority": "HIGH",
                "rationale": "External cloud telemetry and log shipping currently consume unnecessary infrastructure budget while company net burn is -$74,000/mo. Shifting buffering to local SQLite WAL with batch compaction extends runway by +1.4 months.",
                "estimated_impact": "+1.4 Months Runway ($4,500/mo Cloud Savings)",
                "actionable_steps": [
                    "Direct high-frequency event ingestion into local buffered SQLite WAL",
                    "Batch-summarize historical telemetry locally using sovereign SLM",
                    "Deprecate third-party SaaS log egress pipelines"
                ],
                "supporting_citations": ["financials.csv", "aetherflow_onboarding_context.md"],
                "sim_prompt": "What if we eliminate third-party telemetry egress to reduce monthly burn by $4,500?",
                "sim_burn_delta": -4500.0,
                "sim_timeline_shift": 0
            },
            {
                "title": "Consolidate Dual Database Operations to Lower FTE Maintenance Overhead",
                "category": "RUNWAY",
                "priority": "MEDIUM",
                "rationale": "With a 12 FTE team, splitting engineering cycles across multiple disparate database runtimes adds cognitive load and slows product shipping. Consolidating read paths through Kùzu graph and SQLite unified indexes frees up 20% engineering capacity.",
                "estimated_impact": "+20% Engineering Capacity (Equivalent to +$15K/mo Dev Value)",
                "actionable_steps": [
                    "Audit query patterns across Kùzu graph engine and relational SQLite tables",
                    "Establish clear query routing contracts in core repository layers",
                    "Automate cross-database integrity verification in CI"
                ],
                "supporting_citations": ["INV-017", "System_Architecture_Whitepaper.pdf"],
                "sim_prompt": "What if unified database contracts reduce weekly maintenance on-call by 12 hours?",
                "sim_burn_delta": -2000.0,
                "sim_timeline_shift": -5
            },
            {
                "title": "Renegotiate Cloud Vendor Tiers Ahead of Series A Milestone",
                "category": "RUNWAY",
                "priority": "MEDIUM",
                "rationale": "Current liquid reserves stand at $666,000 with 18 months of runway. Locking in prepaid compute credits for sovereign LLM hardware before Q4 expands reserve buffer past the 20-month mark.",
                "estimated_impact": "+2.2 Months Extended Runway",
                "actionable_steps": [
                    "Compile trailing 6-month GPU and compute consumption profile",
                    "Submit startup tier credit grant applications with verified usage logs",
                    "Cap peak burst instances with automated local CPU/GPU fallback policies"
                ],
                "supporting_citations": ["financials.csv", "Company_Handbook.md"],
                "sim_prompt": "What if we secure $30,000 in startup cloud compute grants for the upcoming two quarters?",
                "sim_burn_delta": -3500.0,
                "sim_timeline_shift": 0
            }
        ]
    },
    {
        "pillar": "ENTERPRISE_REVENUE",
        "name": "Enterprise Revenue Expansion & Deal Velocity",
        "description": "Unlock high-ACV enterprise pipeline, productize the BDR-018 SAML exception without branching code (honoring BDR-014), and compress sales cycle latency.",
        "fallback_template": [
            {
                "title": "Productize Multi-Tenant SAML/OIDC SSO Tier Without Bespoke Code Forks",
                "category": "REVENUE",
                "priority": "HIGH",
                "rationale": "Acme Corp enterprise deal validated customer willingness to pay for enterprise SSO (BDR-018, +28 days runway). Productizing it as a clean configuration plugin satisfies BDR-014 invariant while unlocking $250k+ in uncontracted enterprise pipeline.",
                "estimated_impact": "+$250K Pipeline & +35 Days Runway",
                "actionable_steps": [
                    "Refactor Acme SAML adapter into a pluggable multi-tenant SSO provider",
                    "Implement standard SAML 2.0 metadata endpoints in core authentication gateway",
                    "Ratify updated ADR establishing SAML/OIDC as a standard enterprise license add-on"
                ],
                "supporting_citations": ["BDR-018", "BDR-014", "MSA_Draft_AcmeCorp.docx"],
                "sim_prompt": "What if productized SAML SSO closes 3 pending enterprise prospects within 45 days?",
                "sim_burn_delta": -12000.0,
                "sim_timeline_shift": 14
            },
            {
                "title": "Automate Enterprise Security Questionnaire Resolution via Sovereign Graph",
                "category": "VELOCITY",
                "priority": "HIGH",
                "rationale": "Enterprise sales cycles are currently stalled for an average of 18 days during vendor risk and compliance audits. Exposing TARS's immutable ADR ledger to auto-fill security questionnaires cuts sales cycle time by 65%.",
                "estimated_impact": "65% Faster Enterprise Deal Velocity",
                "actionable_steps": [
                    "Index SOC2, FSSAI, and architectural security invariants into graph queries",
                    "Expose instant 1-click vendor security questionnaire responses via Think Tank",
                    "Equip founders Alex Vance and team with verifiable compliance export bundles"
                ],
                "supporting_citations": ["Company_Handbook.md", "FSSAI_Compliance_and_Batch_Stability_Report.pdf"],
                "sim_prompt": "What if enterprise questionnaire turnaround drops from 18 days to 24 hours?",
                "sim_burn_delta": -8000.0,
                "sim_timeline_shift": -18
            },
            {
                "title": "Launch Sovereign On-Prem Air-Gapped Deployment Package for Tier-1 Customers",
                "category": "REVENUE",
                "priority": "MEDIUM",
                "rationale": "Strict regulatory customers in defense, healthcare, and finance demand zero cloud egress. Leveraging TARS's 100% offline local model stack creates a distinct sovereign moat commanding 2x contract pricing.",
                "estimated_impact": "+$180K Annual Contract Value (ACV)",
                "actionable_steps": [
                    "Bundle TARS Core, Ollama, and SQLite into a single air-gapped Docker Compose package",
                    "Validate offline license verification and local encryption keys",
                    "Publish air-gapped deployment architecture whitepaper for enterprise procurement"
                ],
                "supporting_citations": ["System_Architecture_Whitepaper.pdf", "aetherflow_onboarding_context.md"],
                "sim_prompt": "What if air-gapped sovereignty unlocks two $90K ARR defense contractor agreements?",
                "sim_burn_delta": -15000.0,
                "sim_timeline_shift": 21
            }
        ]
    },
    {
        "pillar": "ENGINEERING_VELOCITY",
        "name": "Engineering Velocity & Invariant Enforcement",
        "description": "Harden system architecture against deadlocks, enforce INV-017 transactional outbox patterns, and eliminate sprint drag.",
        "fallback_template": [
            {
                "title": "Enforce Transactional Outbox Pattern to Eliminate DB Lock Contention",
                "category": "ARCHITECTURE",
                "priority": "HIGH",
                "rationale": "Architecture Invariant INV-017 strictly forbids outbound HTTP calls inside DB transaction blocks. With current -$74k/mo burn and 12 FTEs, production outages or database thread lockups directly threaten sprint velocity and enterprise customer retention.",
                "estimated_impact": "+35% Backend Throughput & Zero DB Deadlocks",
                "actionable_steps": [
                    "Audit async webhooks and audit trail logging in core gateway routes",
                    "Queue external outbound notifications via SQLite WAL outbox table",
                    "Automate CI verification of AST rule INV-017 on all PR merges"
                ],
                "supporting_citations": ["INV-017", "System_Architecture_Whitepaper.pdf"],
                "sim_prompt": "What if webhook latency causes database connection pool starvation during peak traffic?",
                "sim_burn_delta": 0.0,
                "sim_timeline_shift": 5
            },
            {
                "title": "Implement Continuous AST Guardrails for Architecture Decision Enforcement",
                "category": "VELOCITY",
                "priority": "HIGH",
                "rationale": "Manual PR code review for architectural boundary violations drains senior engineering bandwidth. Automating static AST checks in git pre-commit hooks ensures zero invariant drift and protects sprint output.",
                "estimated_impact": "+15 Hours/Week Senior Engineering Time Saved",
                "actionable_steps": [
                    "Integrate AST linter verifying no direct DB access outside repository layers",
                    "Hook MADR decision invariant tags directly into GitHub Actions / local pre-commit",
                    "Generate instant architectural violation warnings directly in IDE"
                ],
                "supporting_citations": ["INV-017", "Company_Handbook.md"],
                "sim_prompt": "What if automated AST gates eliminate 100% of architectural regression reviews?",
                "sim_burn_delta": 0.0,
                "sim_timeline_shift": -7
            },
            {
                "title": "Decouple Realtime SSE Broadcast Channels to Prevent Client Connection Lag",
                "category": "ARCHITECTURE",
                "priority": "MEDIUM",
                "rationale": "As browser sessions scale across the LAN, holding long-lived SSE queues on a single thread risks message queue buildup. Isolating event topics into distinct memory channels guarantees sub-10ms UI reactivity.",
                "estimated_impact": "<10ms Real-time Event Latency Across All Workspaces",
                "actionable_steps": [
                    "Partition SSEEventManager queues by event topic domain",
                    "Implement non-blocking event drops for disconnected background tabs",
                    "Add connection health telemetry to frontend status monitors"
                ],
                "supporting_citations": ["System_Architecture_Whitepaper.pdf"],
                "sim_prompt": "What if SSE event fan-out stays under 5ms even during concurrent multi-user sessions?",
                "sim_burn_delta": 0.0,
                "sim_timeline_shift": 0
            }
        ]
    },
    {
        "pillar": "REGULATORY_MOAT",
        "name": "Regulatory Moat & Sovereign AI Compliance",
        "description": "Capitalize on strict regulatory clearances (FSSAI 11524999000342, SOC2, batch stability certs) to lock out non-compliant competitors.",
        "fallback_template": [
            {
                "title": "Operationalize Central FSSAI & Batch Stability Metadata in Pre-Sales Collateral",
                "category": "SECURITY",
                "priority": "HIGH",
                "rationale": "The recent FSSAI certification (Central Reg #11524999000342) and certified 180-day batch stability (VB-2026-B089) represent an insurmountable barrier to entry for early-stage competitors lacking regulatory clearance.",
                "estimated_impact": "+40% Conversion on Regulated Enterprise Accounts",
                "actionable_steps": [
                    "Embed verified FSSAI credentials directly into automated enterprise trust packets",
                    "Configure TARS instant verification for batch stability testing queries",
                    "Highlight certified 180-day stability metrics in vendor RFP responses"
                ],
                "supporting_citations": ["FSSAI_Compliance_and_Batch_Stability_Report.pdf", "MSA_Draft_AcmeCorp.docx"],
                "sim_prompt": "What if verified FSSAI certification closes 2 pending pharmaceutical/food-tech contracts?",
                "sim_burn_delta": -10000.0,
                "sim_timeline_shift": 10
            },
            {
                "title": "Implement Zero-Egress Cryptographic Watermarking on Ingested IP Documents",
                "category": "SECURITY",
                "priority": "HIGH",
                "rationale": "Enterprise clients require strict assurances that proprietary design documents and contracts never leave the local LAN. Introducing verifiable local SHA-256 integrity trees certifies sovereign custody.",
                "estimated_impact": "100% Verifiable Data Sovereignty & Audit Compliance",
                "actionable_steps": [
                    "Compute SHA-256 hash tree on document drop and record to SQLite ledger",
                    "Sign extraction manifests locally using internal ed25519 corporate key",
                    "Provide exportable zero-egress audit certificate for client legal teams"
                ],
                "supporting_citations": ["FSSAI_Compliance_and_Batch_Stability_Report.pdf", "Company_Handbook.md"],
                "sim_prompt": "What if zero-egress cryptographic verification removes legal review blockers?",
                "sim_burn_delta": -3000.0,
                "sim_timeline_shift": -14
            },
            {
                "title": "Establish Immutable MADR Audit Trail as Formal ISO/SOC2 Evidence System",
                "category": "SECURITY",
                "priority": "MEDIUM",
                "rationale": "Traditional compliance audits require months of manual policy collection. TARS's automated MADR writer and Kùzu graph history allow instant export of complete decision provenance.",
                "estimated_impact": "$40K Annual Audit Prep Savings & 3-Week Faster Accreditation",
                "actionable_steps": [
                    "Build 1-click SOC2 / ISO compliance evidence bundle exporter",
                    "Map ratified MADR records directly to SOC2 Trust Services Criteria",
                    "Automate continuous compliance gap detection against active decisions"
                ],
                "supporting_citations": ["Company_Handbook.md", "System_Architecture_Whitepaper.pdf"],
                "sim_prompt": "What if SOC2 audit readiness is reduced to an instant 1-click artifact export?",
                "sim_burn_delta": -5000.0,
                "sim_timeline_shift": -21
            }
        ]
    }
]


class StrategicAdvisor:
    """Service for generating, storing, and managing strategic company recommendations."""

    def __init__(self):
        self._ensure_table()
        self._ensure_seed_data()
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
        conn.commit()

    def _ensure_seed_data(self):
        """Seeds initial grounded recommendations if table is empty."""
        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM strategic_recommendations WHERE status = 'ACTIVE'")
        count = cursor.fetchone()[0]
        if count == 0:
            initial_set = ROTATIONAL_FOCUS_THEMES[0]["fallback_template"]
            for rec in initial_set:
                rec_id = f"REC-INIT-{uuid.uuid4().hex[:6].upper()}"
                cursor.execute('''
                    INSERT OR REPLACE INTO strategic_recommendations (
                        id, title, category, priority, rationale, estimated_impact,
                        actionable_steps, supporting_citations, sim_prompt,
                        sim_burn_delta, sim_timeline_shift, status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    rec_id,
                    rec["title"],
                    rec["category"],
                    rec["priority"],
                    rec["rationale"],
                    rec["estimated_impact"],
                    json.dumps(rec["actionable_steps"]),
                    json.dumps(rec["supporting_citations"]),
                    rec.get("sim_prompt", ""),
                    rec.get("sim_burn_delta", 0.0),
                    rec.get("sim_timeline_shift", 0),
                    "ACTIVE"
                ))
            conn.commit()

    def list_recommendations(self, status: str = "ACTIVE") -> List[Dict[str, Any]]:
        """Retrieves stored strategic recommendations."""
        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT id, title, category, priority, rationale, estimated_impact,
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

    def _get_context_summary(self, focus_theme: Dict[str, Any]) -> str:
        """Assembles rich context summary from company profile, documents, and active ADRs."""
        company = company_repo.get_profile() or {}
        comp_name = company.get("company_name", "AetherFlow Technologies, Inc.")
        team_size = company.get("team_size", "12 FTE")
        runway_m = company.get("runway_months", 18)
        
        # Load onboarding context if available
        onboarding_excerpt = ""
        context_file = os.path.join("drop", "aetherflow_onboarding_context.md")
        if os.path.exists(context_file):
            try:
                with open(context_file, "r", encoding="utf-8") as f:
                    onboarding_excerpt = f.read()[:2000]
            except Exception:
                pass

        # Load ingested document titles from SQLite
        ingested_docs = []
        try:
            conn = db.get_connection()
            cur = conn.cursor()
            cur.execute("SELECT filename, doc_type FROM documents ORDER BY created_at DESC LIMIT 6")
            rows = cur.fetchall()
            for r in rows:
                ingested_docs.append(f"{r['filename']} ({r['doc_type']})")
        except Exception:
            pass

        # Load active decisions summary from Kùzu graph
        decisions_summary = []
        try:
            from apps.api.cortex.routes import graph_engine
            decs = graph_engine.get_all_decisions()
            for d in decs[:8]:
                decisions_summary.append(f"- [{d.get('id')}]: {d.get('title')} ({d.get('category')}) - Chosen Policy: {d.get('chosen_option')}")
        except Exception:
            decisions_summary.append("- [DEC-014]: Zero enterprise customisations before Q4 - Strictly reject bespoke forks")
            decisions_summary.append("- [BDR-018]: Acme Corp SAML SSO Exception (+28 days runway)")

        summary = (
            f"Company: {comp_name}\n"
            f"Team Size: {team_size}\n"
            f"Financial Runway: {runway_m} months remaining ($666,000 cash balance, -$74,000/mo net burn)\n"
            f"Key Metrics: $82,000 MRR ($984K ARR), 72 active customers\n"
            f"Active Decisions & Invariants in Graph:\n" + ("\n".join(decisions_summary) if decisions_summary else "No decisions yet") + "\n"
        )
        if ingested_docs:
            summary += f"\nRecently Ingested Internal Documents:\n" + "\n".join([f"- {d}" for d in ingested_docs]) + "\n"
        if onboarding_excerpt:
            summary += f"\nOperational Context Highlights:\n{onboarding_excerpt}\n"
            
        summary += (
            f"\nCURRENT STRATEGIC FOCUS ROTATION: {focus_theme['name']}\n"
            f"Focus Directive: {focus_theme['description']}\n"
        )
        return summary

    async def generate_recommendations(self, trigger_reason: str = "Manual") -> List[Dict[str, Any]]:
        """
        Invokes local Qwen3 model to analyze current company state and produce
        3-4 high-impact strategic optimization suggestions.
        Rotates focus themes across pulses and broadcasts updates via SSE.
        """
        async with self._lock:
            # Pick current rotational focus theme and advance index
            theme = ROTATIONAL_FOCUS_THEMES[self.current_theme_index]
            self.current_theme_index = (self.current_theme_index + 1) % len(ROTATIONAL_FOCUS_THEMES)
            self._last_generation_time = time.time()
            self.last_pulse_timestamp = time.time()

            logger.info(f"Generating strategic growth suggestions (trigger='{trigger_reason}', pillar='{theme['name']}')...")

            context = self._get_context_summary(theme)
            system_prompt = (
                "You are TARS, the sovereign strategic co-pilot and institutional advisor for AetherFlow Technologies. "
                "Your objective is to propose high-impact, actionable, and non-obvious strategic recommendations to maximize company progress, extend runway, and accelerate engineering velocity. "
                f"The current operational theme is: '{theme['name']}' ({theme['description']}). "
                "Ground your suggestions strictly in the company's real metrics: $666,000 cash balance, -$74,000/mo net burn, 18mo runway, BDR-014 (zero custom forks), and active graph decisions. "
                "Output your recommendations strictly as a JSON array of 3 to 4 objects conforming to this schema:\n"
                "[\n"
                "  {\n"
                "    \"title\": \"string (clear strategic initiative)\",\n"
                "    \"category\": \"REVENUE\" | \"RUNWAY\" | \"VELOCITY\" | \"ARCHITECTURE\" | \"SECURITY\",\n"
                "    \"priority\": \"HIGH\" | \"MEDIUM\",\n"
                "    \"rationale\": \"string (2-3 sentences explaining why based on existing data)\",\n"
                "    \"estimated_impact\": \"string (e.g. '+45 Days Runway', '+$30K MRR', '+25% Eng Velocity')\",\n"
                "    \"actionable_steps\": [\"step 1\", \"step 2\", \"step 3\"],\n"
                "    \"supporting_citations\": [\"reference ADR or doc name\"],\n"
                "    \"sim_prompt\": \"string (scenario for What-If Simulation)\",\n"
                "    \"sim_burn_delta\": number (monthly burn change, e.g. -5000 or 10000),\n"
                "    \"sim_timeline_shift\": number (days shift, e.g. 15 or -10)\n"
                "  }\n"
                "]"
            )
            user_prompt = (
                f"Analyze the current company data and graph decisions below, focusing on '{theme['name']}':\n\n"
                f"{context}\n\n"
                "Return ONLY the valid JSON array."
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
                        max_tokens=1600
                    )

                    if result.get("success") and isinstance(result.get("response"), list):
                        recs_data = [x for x in result["response"] if isinstance(x, dict)]
                    elif result.get("success") and isinstance(result.get("response"), dict):
                        for v in result["response"].values():
                            if isinstance(v, list):
                                recs_data = [x for x in v if isinstance(x, dict)]
                                if recs_data:
                                    break
                except Exception as gen_err:
                    logger.warning(f"Ollama generation encountered issue: {gen_err}. Employing theme synthesis fallback.")

            # If Ollama did not produce or returned empty, use the rich grounded fallback template for this theme
            if not recs_data:
                logger.info(f"Using grounded theme template for '{theme['name']}'")
                recs_data = theme["fallback_template"]

            # Supersede prior ACTIVE recommendations so radar always reflects the latest strategic pulse
            conn = db.get_connection()
            cursor = conn.cursor()
            cursor.execute("UPDATE strategic_recommendations SET status = 'SUPERSEDED', updated_at = CURRENT_TIMESTAMP WHERE status = 'ACTIVE'")

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
                citations = item.get("supporting_citations", ["BDR-018", "aetherflow_onboarding_context.md"])
                sim_prompt = item.get("sim_prompt", f"What if we implement: {title}?")
                sim_burn = float(item.get("sim_burn_delta", 0.0))
                sim_shift = int(item.get("sim_timeline_shift", 0))

                cursor.execute('''
                    INSERT INTO strategic_recommendations (
                        id, title, category, priority, rationale, estimated_impact,
                        actionable_steps, supporting_citations, sim_prompt,
                        sim_burn_delta, sim_timeline_shift, status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
                ''', (
                    rec_id, title, cat, prio, rationale, impact,
                    json.dumps(steps), json.dumps(citations),
                    sim_prompt, sim_burn, sim_shift
                ))
                new_items.append({
                    "id": rec_id,
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

            # Broadcast real-time SSE event to all connected workspaces
            try:
                from apps.api.ingestion.routes import sse_manager
                if sse_manager:
                    sse_manager.publish("STRATEGIC_RADAR_UPDATED", {
                        "action": "AUTO_PULSE",
                        "trigger_reason": trigger_reason,
                        "focus_theme": theme["name"],
                        "count": len(new_items),
                        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
                    })
            except Exception as sse_err:
                logger.debug(f"SSE publish notice: {sse_err}")

            return self.list_recommendations(status="ACTIVE")

    def trigger_autonomous_pulse(self, reason: str = "Event Trigger") -> None:
        """Schedules a non-blocking background generation pulse if not recently generated (<20s)."""
        now = time.time()
        if now - self._last_generation_time < 20:
            logger.info(f"Skipping autonomous pulse ({reason}): debounced (<20s)")
            return

        async def _run_pulse():
            try:
                await asyncio.sleep(1.0)
                await self.generate_recommendations(trigger_reason=reason)
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
            # Initial brief delay to allow FastAPI startup to settle
            await asyncio.sleep(4)
            try:
                await self.generate_recommendations(trigger_reason="Startup Autonomous Sync")
            except Exception as e:
                logger.warning(f"Initial startup pulse error: {e}")

            while True:
                try:
                    await asyncio.sleep(interval_seconds)
                    logger.info("Executing periodic autonomous strategic radar pulse...")
                    await self.generate_recommendations(trigger_reason="Periodic Autonomous Pulse")
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

    def get_advisor_status(self) -> Dict[str, Any]:
        """Returns autonomous worker status, last pulse timestamp, and current focus theme."""
        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM strategic_recommendations WHERE status = 'ACTIVE'")
        active_cnt = cursor.fetchone()[0]

        current_theme = ROTATIONAL_FOCUS_THEMES[self.current_theme_index]
        return {
            "worker_active": self._worker_task is not None and not self._worker_task.done(),
            "last_pulse_timestamp": self.last_pulse_timestamp,
            "current_focus_pillar": current_theme["pillar"],
            "current_focus_name": current_theme["name"],
            "active_recommendations_count": active_cnt
        }


strategic_advisor = StrategicAdvisor()
