# apps/api/core/strategic_advisor.py
"""
Strategic Growth & Optimization Radar Service.
Proactively analyzes company data (ADRs, financial runway, cash burn, and onboarding documents)
using local ML (qwen3:8b via Ollama) in zero-egress mode to generate high-leverage growth vectors.
"""
import os
import json
import time
import uuid
import logging
from typing import List, Dict, Any, Optional

from apps.api.core.db import db
from apps.api.core.company import company_repo
from apps.api.core.ollama_client import ollama_client

logger = logging.getLogger("tars.core.strategic_advisor")

DEFAULT_RECOMMENDATIONS = [
    {
        "id": "REC-STRAT-001",
        "title": "Standardize BDR-018 SAML Exception into Reusable Enterprise SSO Tier",
        "category": "REVENUE",
        "priority": "HIGH",
        "rationale": "Acme Corp's enterprise deal extended runway by +28 days (BDR-018). However, keeping SAML as a bespoke one-off creates technical debt that risks violating BDR-014. Standardizing it as a reusable configuration tier unlocks $250k+ in uncontracted pipeline from enterprise leads without branching code.",
        "estimated_impact": "+$250K Pipeline & +28 Days Runway",
        "actionable_steps": [
            "Refactor Acme SAML implementation into a decoupled plugin adapter",
            "Implement config-driven SAML metadata endpoints instead of bespoke client logic",
            "Ratify updated ADR establishing multi-tenant SSO as a standard product tier"
        ],
        "supporting_citations": ["BDR-018", "BDR-014", "MSA_Draft_AcmeCorp.docx"],
        "sim_prompt": "What if we productize multi-tenant SAML SSO to close 3 pending enterprise prospects?",
        "sim_burn_delta": -8000.0,
        "sim_timeline_shift": 14,
        "status": "ACTIVE"
    },
    {
        "id": "REC-STRAT-002",
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
        "sim_timeline_shift": 5,
        "status": "ACTIVE"
    },
    {
        "id": "REC-STRAT-003",
        "title": "Transition High-Cardinality Telemetry to Sovereign Local WAL Buffer",
        "category": "RUNWAY",
        "priority": "MEDIUM",
        "rationale": "Current liquid cash balance is $666,000 with 18 months runway remaining. External cloud telemetry egress is consuming unnecessary infra spend. Moving telemetry buffering to local SQLite WAL cuts recurring infra cost by $4,200/mo.",
        "estimated_impact": "+1.1 Months Extended Runway ($50K/yr savings)",
        "actionable_steps": [
            "Direct high-frequency event ingestion to local buffered SQLite WAL",
            "Batch summarize historical telemetry using local qwen3:1.7b extraction",
            "Eliminate third-party observability egress bandwidth"
        ],
        "supporting_citations": ["aetherflow_onboarding_context.md", "financials.csv"],
        "sim_prompt": "What if we eliminate external telemetry egress and reduce monthly burn by $4,200?",
        "sim_burn_delta": -4200.0,
        "sim_timeline_shift": 0,
        "status": "ACTIVE"
    },
    {
        "id": "REC-STRAT-004",
        "title": "Automate Enterprise Compliance Audit Trail for Pre-Sales Acceleration",
        "category": "VELOCITY",
        "priority": "MEDIUM",
        "rationale": "Sales lead cycle currently spends 18 days responding to enterprise security questionnaires. Leveraging TARS's immutable ADR ledger and sovereign knowledge graph to auto-answer vendor security assessments will cut sales cycle time by 60%.",
        "estimated_impact": "60% Faster Enterprise Close Rate",
        "actionable_steps": [
            "Expose SOC2 & security policy ledger nodes to automated questionnaire exporter",
            "Link ratified ADRs directly to vendor risk assessment templates",
            "Equip sales team with 1-click verified security questionnaire generator"
        ],
        "supporting_citations": ["Company_Handbook.md", "aetherflow_onboarding_context.md"],
        "sim_prompt": "What if sales closing velocity increases by 2x via instant security questionnaire verification?",
        "sim_burn_delta": -12000.0,
        "sim_timeline_shift": -18,
        "status": "ACTIVE"
    }
]


class StrategicAdvisor:
    """Service for generating, storing, and managing strategic company recommendations."""

    def __init__(self):
        self._ensure_table()
        self._ensure_seed_data()

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
            for rec in DEFAULT_RECOMMENDATIONS:
                cursor.execute('''
                    INSERT OR REPLACE INTO strategic_recommendations (
                        id, title, category, priority, rationale, estimated_impact,
                        actionable_steps, supporting_citations, sim_prompt,
                        sim_burn_delta, sim_timeline_shift, status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    rec["id"],
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
                    rec.get("status", "ACTIVE")
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

    def _get_context_summary(self) -> str:
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
                    onboarding_excerpt = f.read()[:3000]
            except Exception:
                pass

        # Load active decisions summary
        from apps.api.cortex.routes import graph_engine
        decisions_summary = []
        try:
            decs = graph_engine.get_all_decisions()
            for d in decs[:10]:
                decisions_summary.append(f"- [{d.get('id')}]: {d.get('title')} ({d.get('category')}) - Policy: {d.get('chosen_option')}")
        except Exception:
            decisions_summary.append("- [DEC-014]: Zero enterprise customisations before Q4 - Strictly reject bespoke forks")
            decisions_summary.append("- [BDR-018]: Acme Corp SAML SSO Exception (+28 days runway)")

        summary = (
            f"Company: {comp_name}\n"
            f"Team Size: {team_size}\n"
            f"Financial Runway: {runway_m} months remaining ($666,000 cash balance, -$74,000/mo net burn)\n"
            f"Key Metrics: $82,000 MRR ($984K ARR), 72 active customers\n"
            f"Active ADR Ledger Policies:\n" + "\n".join(decisions_summary) + "\n"
        )
        if onboarding_excerpt:
            summary += f"\nCompany Context Excerpt:\n{onboarding_excerpt}\n"
        return summary

    async def generate_recommendations(self) -> List[Dict[str, Any]]:
        """
        Invokes local Qwen3 model to analyze current company state and produce
        3-4 high-impact strategic optimization suggestions.
        """
        context = self._get_context_summary()
        system_prompt = (
            "You are TARS, the sovereign strategic co-pilot and institutional advisor for AetherFlow Technologies. "
            "Your objective is to propose high-impact, actionable, and non-obvious strategic recommendations to maximize company progress, extend runway, and accelerate engineering velocity. "
            "Ground your suggestions strictly in the company's real metrics: $666,000 cash balance, -$74,000/mo net burn, 18mo runway, BDR-014 (zero custom forks), and BDR-018 (SAML exception). "
            "Output your recommendations strictly as a JSON array of objects conforming to this schema:\n"
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
            f"Analyze the current company data below and generate 3 to 4 distinct strategic growth & optimization suggestions:\n\n"
            f"{context}\n\n"
            "Return ONLY the valid JSON array."
        )

        try:
            logger.info("Requesting strategic growth suggestions from local Qwen3 model...")
            result = await ollama_client.generate(
                prompt=user_prompt,
                system=system_prompt,
                task_complexity="deep",
                structured_format="json",
                max_tokens=1500
            )

            recs_data = []
            if result.get("success") and isinstance(result.get("response"), list):
                recs_data = result["response"]
            elif result.get("success") and isinstance(result.get("response"), dict):
                # If wrapped in an object like {"recommendations": [...]}
                for v in result["response"].values():
                    if isinstance(v, list):
                        recs_data = v
                        break

            if recs_data:
                conn = db.get_connection()
                cursor = conn.cursor()
                new_items = []
                for item in recs_data:
                    rec_id = f"REC-{uuid.uuid4().hex[:6].upper()}"
                    title = item.get("title", "Strategic Initiative")
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
                return self.list_recommendations()

        except Exception as e:
            logger.error(f"Error generating strategic recommendations: {e}", exc_info=True)

        # Fallback to current stored recommendations
        return self.list_recommendations()


strategic_advisor = StrategicAdvisor()
