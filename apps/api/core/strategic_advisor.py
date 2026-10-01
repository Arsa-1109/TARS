# apps/api/core/strategic_advisor.py
"""
Strategic Growth & Optimization Radar Service.
Proactively analyzes company data (ADRs, financial runway, cash burn, and onboarding documents)
using local ML (qwen3:8b via Ollama) in zero-egress mode to generate high-leverage growth vectors.
Strictly partitioned by multi-tenant boundary (company_name and organisation_id).
"""
import os
import json
import time
import uuid
import logging
from typing import List, Dict, Any, Optional, Tuple

from apps.api.core.db import db
from apps.api.core.company import company_repo
from apps.api.core.ollama_client import ollama_client

logger = logging.getLogger("tars.core.strategic_advisor")

DEFAULT_AETHERFLOW_RECOMMENDATIONS = [
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
        "status": "ACTIVE",
        "company_name": "AetherFlow",
        "organisation_id": "CMP-GENESIS-01"
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
        "status": "ACTIVE",
        "company_name": "AetherFlow",
        "organisation_id": "CMP-GENESIS-01"
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
        "status": "ACTIVE",
        "company_name": "AetherFlow",
        "organisation_id": "CMP-GENESIS-01"
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
        "status": "ACTIVE",
        "company_name": "AetherFlow",
        "organisation_id": "CMP-GENESIS-01"
    }
]

DEFAULT_VERDANT_RECOMMENDATIONS = [
    {
        "id": "REC-VERDANT-001",
        "title": "Consolidate Cold-Chain Logistics Routes Across Regional Distributors",
        "category": "RUNWAY",
        "priority": "HIGH",
        "rationale": "Verdant's premium botanical beverages require continuous +2C to +6C cold-chain logistics. Consolidating reefer shipping corridors across Maharashtra and Bangalore distributors reduces distribution burn by $18,000/mo while safeguarding product efficacy.",
        "estimated_impact": "+$18K/mo Savings & +2.4 Months Extended Runway",
        "actionable_steps": [
            "Renegotiate master reefer freight SLAs across prime western distribution corridors",
            "Implement automated batch dispatch schedule linked to production shelf-life stability",
            "Establish regional cold-storage transit hubs for Nature's Mart delivery"
        ],
        "supporting_citations": ["Verdant_Company_Operations_Handbook.md", "verdant_financial_runway_q4.csv"],
        "sim_prompt": "What if we consolidate cold-chain logistics to reduce distribution overhead by 25%?",
        "sim_burn_delta": -18000.0,
        "sim_timeline_shift": 0,
        "status": "ACTIVE",
        "company_name": "Verdant",
        "organisation_id": "CMP-F357B89B"
    },
    {
        "id": "REC-VERDANT-002",
        "title": "Expand FSSAI Multi-State Distribution Certification for Retail Superstores",
        "category": "REVENUE",
        "priority": "HIGH",
        "rationale": "Nature's Mart agreement requires certified batch stability across 60 prime locations in Mumbai and Bangalore. Accelerating state-level FSSAI approvals unlocks nationwide retail distribution.",
        "estimated_impact": "+$200K Annual Revenue & Prime Shelf Placement",
        "actionable_steps": [
            "Submit central FSSAI registration endorsement for interstate retail expansion",
            "Bundle NABL-accredited batch stability certificates with shipping manifests",
            "Finalize distribution terms with Nature's Mart Category Council"
        ],
        "supporting_citations": ["FSSAI_Compliance_and_Batch_Stability_Report.pdf", "Retail_Distribution_Agreement_OrganicSuperstores.docx"],
        "sim_prompt": "What if nationwide FSSAI certification accelerates Nature's Mart rollout by 30 days?",
        "sim_burn_delta": -12000.0,
        "sim_timeline_shift": 30,
        "status": "ACTIVE",
        "company_name": "Verdant",
        "organisation_id": "CMP-F357B89B"
    },
    {
        "id": "REC-VERDANT-003",
        "title": "Optimize In-Line Nitrogen Dosing to Protect Raw Adaptogen Bioactivity",
        "category": "ARCHITECTURE",
        "priority": "MEDIUM",
        "rationale": "Clinical bioactivity of withanolides and gingerols degrades when dissolved oxygen exceeds 0.5 ppm. Upgrading in-line liquid nitrogen dosing during glass bottling ensures 180-day ambient barrier integrity.",
        "estimated_impact": "+20% Batch Shelf-Life Stability & Zero Oxidation Spoilage",
        "actionable_steps": [
            "Calibrate cryogenic liquid nitrogen injection sensors on bottling line 2",
            "Incorporate automated oxygen dissolved PPM logging into batch QA records",
            "Establish automated rejection threshold for bottles with DO > 0.5 ppm"
        ],
        "supporting_citations": ["Verdant_Company_Operations_Handbook.md", "FSSAI_Compliance_and_Batch_Stability_Report.pdf"],
        "sim_prompt": "What if optimized nitrogen dosing eliminates customer spoilage returns?",
        "sim_burn_delta": -4500.0,
        "sim_timeline_shift": 7,
        "status": "ACTIVE",
        "company_name": "Verdant",
        "organisation_id": "CMP-F357B89B"
    }
]

# Backward compatibility alias
DEFAULT_RECOMMENDATIONS = DEFAULT_AETHERFLOW_RECOMMENDATIONS


class StrategicAdvisor:
    """Service for generating, storing, and managing strategic company recommendations with strict multi-tenant isolation."""

    def __init__(self):
        self._ensure_table()
        self._ensure_seed_data()

    def _normalize_tenant(self, identifier: Optional[str]) -> Tuple[str, str]:
        """
        Resolves canonical (company_name, organisation_id) pair.
        Prevents cross-tenant contamination between AetherFlow and other tenants like Verdant.
        """
        if not identifier or not str(identifier).strip():
            # Check if active profile exists in database
            active_profile = company_repo.get_profile()
            if active_profile:
                name = active_profile.get("company_name", "")
                cid = active_profile.get("id", "CMP-GENESIS-01")
                if "verdant" in name.lower() or "cmp-f357b89b" in cid.lower():
                    return "Verdant", "CMP-F357B89B"
                if "acme" in name.lower() or "cmp-6231f24f" in cid.lower():
                    return "Acme", "CMP-6231F24F"
                if "aetherflow" in name.lower() or "cmp-genesis-01" in cid.lower():
                    return "AetherFlow", "CMP-GENESIS-01"
                return name, cid
            return "AetherFlow", "CMP-GENESIS-01"

        clean = str(identifier).strip()
        lower = clean.lower()

        if "aetherflow" in lower or lower == "cmp-genesis-01" or lower == "sovereign startup":
            return "AetherFlow", "CMP-GENESIS-01"
        if "verdant" in lower or lower == "cmp-f357b89b":
            return "Verdant", "CMP-F357B89B"
        if "acme" in lower or lower == "cmp-6231f24f":
            return "Acme", "CMP-6231F24F"

        # Check repository lookup
        prof = company_repo.get_profile(company_name=clean) or company_repo.get_profile(company_id=clean)
        if prof:
            return prof.get("company_name", clean), prof.get("id", f"CMP-{uuid.uuid5(uuid.NAMESPACE_DNS, lower).hex[:8].upper()}")

        return clean, f"CMP-{uuid.uuid5(uuid.NAMESPACE_DNS, lower).hex[:8].upper()}"

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
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                company_name TEXT DEFAULT 'AetherFlow',
                organisation_id TEXT DEFAULT 'CMP-GENESIS-01'
            )
        ''')
        # Migrate schema if columns were not present in previous database version
        try:
            cursor.execute("ALTER TABLE strategic_recommendations ADD COLUMN company_name TEXT DEFAULT 'AetherFlow'")
        except Exception:
            pass
        try:
            cursor.execute("ALTER TABLE strategic_recommendations ADD COLUMN organisation_id TEXT DEFAULT 'CMP-GENESIS-01'")
        except Exception:
            pass

        # Backfill organisation_id based on company_name if missing
        try:
            cursor.execute("UPDATE strategic_recommendations SET organisation_id = 'CMP-F357B89B' WHERE LOWER(company_name) = 'verdant' AND (organisation_id IS NULL OR organisation_id = 'CMP-GENESIS-01')")
            cursor.execute("UPDATE strategic_recommendations SET organisation_id = 'CMP-GENESIS-01' WHERE (LOWER(company_name) = 'aetherflow' OR company_name IS NULL) AND organisation_id IS NULL")
        except Exception:
            pass

        # Add indexes for high-performance tenant filtering
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_strategic_recs_company ON strategic_recommendations (company_name, status)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_strategic_recs_org ON strategic_recommendations (organisation_id, status)")
        conn.commit()

    def _ensure_seed_data(self):
        """Seeds initial grounded recommendations per tenant if table is empty."""
        conn = db.get_connection()
        cursor = conn.cursor()

        # 1. AetherFlow seed check
        cursor.execute("SELECT COUNT(*) FROM strategic_recommendations WHERE status = 'ACTIVE' AND (LOWER(company_name) = 'aetherflow' OR organisation_id = 'CMP-GENESIS-01')")
        aetherflow_count = cursor.fetchone()[0]
        if aetherflow_count == 0:
            for rec in DEFAULT_AETHERFLOW_RECOMMENDATIONS:
                cursor.execute('''
                    INSERT OR REPLACE INTO strategic_recommendations (
                        id, title, category, priority, rationale, estimated_impact,
                        actionable_steps, supporting_citations, sim_prompt,
                        sim_burn_delta, sim_timeline_shift, status, company_name, organisation_id
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                    rec.get("status", "ACTIVE"),
                    "AetherFlow",
                    "CMP-GENESIS-01"
                ))

        # 2. Verdant seed check
        cursor.execute("SELECT COUNT(*) FROM strategic_recommendations WHERE status = 'ACTIVE' AND (LOWER(company_name) = 'verdant' OR organisation_id = 'CMP-F357B89B')")
        verdant_count = cursor.fetchone()[0]
        if verdant_count == 0:
            for rec in DEFAULT_VERDANT_RECOMMENDATIONS:
                cursor.execute('''
                    INSERT OR REPLACE INTO strategic_recommendations (
                        id, title, category, priority, rationale, estimated_impact,
                        actionable_steps, supporting_citations, sim_prompt,
                        sim_burn_delta, sim_timeline_shift, status, company_name, organisation_id
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                    rec.get("status", "ACTIVE"),
                    "Verdant",
                    "CMP-F357B89B"
                ))

        conn.commit()

    def _get_fallback_recommendations(self, company_name: str, org_id: str) -> List[Dict[str, Any]]:
        """Generates domain-appropriate fallback advice for a tenant if no custom records exist."""
        norm_comp, _ = self._normalize_tenant(company_name)
        if norm_comp == "AetherFlow":
            return DEFAULT_AETHERFLOW_RECOMMENDATIONS
        if norm_comp == "Verdant":
            return DEFAULT_VERDANT_RECOMMENDATIONS

        # General domain fallback based on profile
        prof = company_repo.get_profile(company_name=company_name) or company_repo.get_profile(company_id=org_id) or {}
        industry = prof.get("industry", "Technology")
        runway = prof.get("runway_months", 18)

        return [
            {
                "id": f"REC-AUTO-{uuid.uuid4().hex[:6].upper()}",
                "title": f"Rationalize Unit Economics and Core Infrastructure Spend for {company_name}",
                "category": "RUNWAY",
                "priority": "HIGH",
                "rationale": f"Operating in the {industry} sector with an estimated {runway}-month runway, {company_name} can maximize capital efficiency by auditing variable hosting, compute, and third-party SaaS contracts.",
                "estimated_impact": f"+15% Runway Extension for {company_name}",
                "actionable_steps": [
                    "Conduct line-item audit of top five monthly operating cost drivers",
                    "Migrate high-frequency batch telemetry to sovereign local buffers",
                    "Renegotiate vendor billing cycles to quarterly or annual discount terms"
                ],
                "supporting_citations": [f"{company_name}_Profile", "Operating_Runway_Overview"],
                "sim_prompt": f"What if {company_name} reduces variable operational overhead by 15%?",
                "sim_burn_delta": -5000.0,
                "sim_timeline_shift": 0,
                "status": "ACTIVE",
                "company_name": company_name,
                "organisation_id": org_id
            },
            {
                "id": f"REC-AUTO-{uuid.uuid4().hex[:6].upper()}",
                "title": f"Establish Standardized Customer Proof-of-Concept & Onboarding Pipeline",
                "category": "REVENUE",
                "priority": "HIGH",
                "rationale": f"Accelerating deal velocity in {industry} requires minimizing bespoke integration requests and packaging standard product tiers for enterprise procurement.",
                "estimated_impact": "+25% Pipeline Conversion Velocity",
                "actionable_steps": [
                    "Formalize standardized evaluation criteria into self-service onboarding",
                    "Package turnkey deployment collateral for technical decision makers",
                    "Enforce strict policy against uncontracted custom branches"
                ],
                "supporting_citations": [f"{company_name}_Governance", "Sales_Velocity_Playbook"],
                "sim_prompt": f"What if onboarding cycle time is halved through standardized customer onboarding?",
                "sim_burn_delta": -8000.0,
                "sim_timeline_shift": 14,
                "status": "ACTIVE",
                "company_name": company_name,
                "organisation_id": org_id
            }
        ]

    def list_recommendations(
        self,
        status: str = "ACTIVE",
        company_name: Optional[str] = None,
        organisation_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Retrieves stored strategic recommendations scoped strictly to the specified tenant."""
        target_comp, target_org = self._normalize_tenant(organisation_id or company_name)

        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT id, title, category, priority, rationale, estimated_impact,
                   actionable_steps, supporting_citations, sim_prompt,
                   sim_burn_delta, sim_timeline_shift, status, created_at,
                   company_name, organisation_id
            FROM strategic_recommendations
            WHERE status = ?
              AND (
                  LOWER(company_name) = LOWER(?)
                  OR LOWER(company_name) LIKE LOWER(?)
                  OR organisation_id = ?
              )
            ORDER BY
                CASE priority WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END,
                created_at DESC
        ''', (status, target_comp, f"%{target_comp}%", target_org))
        rows = cursor.fetchall()

        # If no active recommendations exist for this tenant, seed domain-appropriate fallbacks
        if not rows and status == "ACTIVE":
            fallbacks = self._get_fallback_recommendations(target_comp, target_org)
            for rec in fallbacks:
                cursor.execute('''
                    INSERT OR REPLACE INTO strategic_recommendations (
                        id, title, category, priority, rationale, estimated_impact,
                        actionable_steps, supporting_citations, sim_prompt,
                        sim_burn_delta, sim_timeline_shift, status, company_name, organisation_id
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                    rec.get("status", "ACTIVE"),
                    target_comp,
                    target_org
                ))
            conn.commit()

            cursor.execute('''
                SELECT id, title, category, priority, rationale, estimated_impact,
                       actionable_steps, supporting_citations, sim_prompt,
                       sim_burn_delta, sim_timeline_shift, status, created_at,
                       company_name, organisation_id
                FROM strategic_recommendations
                WHERE status = ?
                  AND (
                      LOWER(company_name) = LOWER(?)
                      OR LOWER(company_name) LIKE LOWER(?)
                      OR organisation_id = ?
                  )
                ORDER BY
                    CASE priority WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END,
                    created_at DESC
            ''', (status, target_comp, f"%{target_comp}%", target_org))
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
                "created_at": row["created_at"],
                "company_name": row["company_name"] if "company_name" in row.keys() else target_comp,
                "organisation_id": row["organisation_id"] if "organisation_id" in row.keys() else target_org
            })
        return results

    def dismiss_recommendation(self, rec_id: str, company_name: Optional[str] = None) -> bool:
        """Marks a recommendation as DISMISSED, optionally validating tenant ownership."""
        conn = db.get_connection()
        cursor = conn.cursor()
        if company_name:
            target_comp, target_org = self._normalize_tenant(company_name)
            cursor.execute('''
                UPDATE strategic_recommendations
                SET status = 'DISMISSED', updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND (LOWER(company_name) = LOWER(?) OR organisation_id = ?)
            ''', (rec_id, target_comp, target_org))
        else:
            cursor.execute(
                "UPDATE strategic_recommendations SET status = 'DISMISSED', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (rec_id,)
            )
        conn.commit()
        return cursor.rowcount > 0

    def _get_context_summary(self, company_name: Optional[str] = None) -> str:
        """Assembles tenant-isolated context summary strictly matching the target company."""
        target_comp, target_org = self._normalize_tenant(company_name)

        if target_comp == "AetherFlow":
            onboarding_excerpt = ""
            context_file = os.path.join("drop", "aetherflow_onboarding_context.md")
            if os.path.exists(context_file):
                try:
                    with open(context_file, "r", encoding="utf-8") as f:
                        onboarding_excerpt = f.read()[:3000]
                except Exception:
                    pass

            summary = (
                "Company: AetherFlow Technologies, Inc.\n"
                "Industry: B2B SaaS (Enterprise Streaming & Sovereign Data Infrastructure)\n"
                "Team Size: 12 FTE\n"
                "Financial Runway: 18 months remaining ($666,000 liquid cash balance, -$74,000/mo net burn)\n"
                "Key Metrics: $82,000 MRR ($984K ARR), 72 active customers\n"
                "Active ADR Ledger Policies:\n"
                "- [DEC-014]: Zero enterprise customisations before Q4 - Strictly reject bespoke forks\n"
                "- [BDR-018]: Acme Corp SAML SSO Exception (+28 days runway)\n"
                "- [INV-017]: Transactional Outbox Pattern to eliminate DB lock contention\n"
            )
            if onboarding_excerpt:
                summary += f"\nCompany Context Excerpt:\n{onboarding_excerpt}\n"
            return summary

        if target_comp == "Verdant":
            verdant_excerpt = ""
            for v_path in [
                os.path.join("drop", "Verdant_Company_Operations_Handbook.md"),
                os.path.join("verdant_assets", "Verdant_Company_Operations_Handbook.md")
            ]:
                if os.path.exists(v_path):
                    try:
                        with open(v_path, "r", encoding="utf-8") as f:
                            verdant_excerpt = f.read()[:3000]
                        break
                    except Exception:
                        pass

            summary = (
                "Company: Verdant Botanicals, Inc.\n"
                "Industry: D2C / Premium Organic Functional Beverages\n"
                "Team Size: 8 FTE\n"
                "Financial Runway: 13 months remaining ($180,000 cash balance, -$22,000/mo net burn)\n"
                "Key Metrics: 60 prime Nature's Mart supermarkets rollout in Mumbai and Bangalore\n"
                "Active Compliance & Operational Invariants:\n"
                "- FSSAI Central Registration #11524999000342 - Batch stability shelf life 180 days under +2C to +6C cold-chain\n"
                "- Mandatory continuous cold-holding and in-line liquid nitrogen dosing during glass bottling\n"
                "- Master distribution agreements requiring verified Certificate of Analysis with each shipment\n"
            )
            if verdant_excerpt:
                summary += f"\nCompany Operations Excerpt:\n{verdant_excerpt}\n"
            return summary

        # Arbitrary company profile from database
        company = company_repo.get_profile(company_name=target_comp) or company_repo.get_profile(company_id=target_org) or {}
        comp_name = company.get("company_name", target_comp)
        industry = company.get("industry", "Technology")
        team_size = company.get("team_size", "1-5")
        runway_m = company.get("runway_months", 18)
        one_liner = company.get("one_liner", "")
        core_thesis = company.get("core_thesis", "")

        return (
            f"Company: {comp_name}\n"
            f"Industry: {industry}\n"
            f"Team Size: {team_size}\n"
            f"Runway: {runway_m} months\n"
            f"One Liner: {one_liner}\n"
            f"Core Thesis: {core_thesis}\n"
        )

    async def generate_recommendations(self, company_name: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Invokes local Qwen3 model to analyze target company state and produce
        3-4 high-impact strategic optimization suggestions strictly scoped to the tenant.
        """
        target_comp, target_org = self._normalize_tenant(company_name)
        context = self._get_context_summary(target_comp)

        system_prompt = (
            f"You are TARS, the sovereign strategic co-pilot and institutional advisor for {target_comp}. "
            f"Your objective is to propose high-impact, actionable, and non-obvious strategic recommendations to maximize company progress, extend runway, and accelerate velocity. "
            f"Ground your suggestions strictly in {target_comp}'s domain, financial runway, and operational facts. "
            f"CRITICAL MULTI-TENANT RULE: You must NEVER include facts, citations, or initiatives from other companies or unrelated industries (e.g. do not mix software infrastructure with beverage retail or vice versa). "
            "Output your recommendations strictly as a JSON array of objects conforming to this schema:\n"
            "[\n"
            "  {\n"
            "    \"title\": \"string (clear strategic initiative)\",\n"
            "    \"category\": \"REVENUE\" | \"RUNWAY\" | \"VELOCITY\" | \"ARCHITECTURE\" | \"SECURITY\",\n"
            "    \"priority\": \"HIGH\" | \"MEDIUM\",\n"
            "    \"rationale\": \"string (2-3 sentences explaining why based on existing data)\",\n"
            "    \"estimated_impact\": \"string (e.g. '+45 Days Runway', '+$30K MRR', '+25% Eng Velocity')\",\n"
            "    \"actionable_steps\": [\"step 1\", \"step 2\", \"step 3\"],\n"
            "    \"supporting_citations\": [\"reference document or decision name\"],\n"
            "    \"sim_prompt\": \"string (scenario for What-If Simulation)\",\n"
            "    \"sim_burn_delta\": number (monthly burn change, e.g. -5000 or 10000),\n"
            "    \"sim_timeline_shift\": number (days shift, e.g. 15 or -10)\n"
            "  }\n"
            "]"
        )
        user_prompt = (
            f"Analyze the current company data below for {target_comp} and generate 3 to 4 distinct strategic growth & optimization suggestions:\n\n"
            f"{context}\n\n"
            "Return ONLY the valid JSON array."
        )

        try:
            logger.info("Requesting strategic growth suggestions from local Qwen3 model for tenant: %s", target_comp)
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
                for v in result["response"].values():
                    if isinstance(v, list):
                        recs_data = v
                        break

            if recs_data:
                conn = db.get_connection()
                cursor = conn.cursor()

                # Mark previous active recommendations for this specific tenant as SUPERSEDED
                cursor.execute('''
                    UPDATE strategic_recommendations
                    SET status = 'SUPERSEDED', updated_at = CURRENT_TIMESTAMP
                    WHERE status = 'ACTIVE' AND (LOWER(company_name) = LOWER(?) OR organisation_id = ?)
                ''', (target_comp, target_org))

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
                    citations = item.get("supporting_citations", [f"{target_comp}_Context"])
                    sim_prompt = item.get("sim_prompt", f"What if we implement: {title}?")
                    sim_burn = float(item.get("sim_burn_delta", 0.0))
                    sim_shift = int(item.get("sim_timeline_shift", 0))

                    cursor.execute('''
                        INSERT INTO strategic_recommendations (
                            id, title, category, priority, rationale, estimated_impact,
                            actionable_steps, supporting_citations, sim_prompt,
                            sim_burn_delta, sim_timeline_shift, status, company_name, organisation_id
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
                    ''', (
                        rec_id, title, cat, prio, rationale, impact,
                        json.dumps(steps), json.dumps(citations),
                        sim_prompt, sim_burn, sim_shift,
                        target_comp, target_org
                    ))

                conn.commit()
                return self.list_recommendations(status="ACTIVE", company_name=target_comp)

        except Exception as e:
            logger.error("Error generating strategic recommendations for %s: %s", target_comp, e, exc_info=True)

        # Fallback to current stored recommendations for this tenant
        return self.list_recommendations(status="ACTIVE", company_name=target_comp)


strategic_advisor = StrategicAdvisor()
