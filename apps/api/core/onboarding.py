# apps/api/core/onboarding.py
"""
Sovereign Company-Scoped New Hire Onboarding Flight-Plan Repository.
Manages persistent onboarding modules, Genesis-calibrated intelligent defaults,
and user-scoped task progress in SQLite WAL storage (tars_local.db and .tars/vault.db).
All architectural comments written in British English.
"""
import os
import sqlite3
import json
import uuid
import time
from typing import Optional, Dict, Any, List

from apps.api.core.db import db
from apps.api.schemas.contracts import (
    OnboardingMilestoneTour,
    OnboardingModuleDTO,
    OnboardingFlightPlanDTO,
    OnboardingFlightPlanCreate,
    OnboardingProgressUpdateDTO,
)


class OnboardingRepository:
    """
    Data access layer for sovereign company flight plans and new hire progress.
    Ensures absolute multi-tenant data isolation and dual-write synchronisation
    with the sovereign vault database.
    """

    def _sync_to_vault(self, query: str, params: tuple):
        """Safely synchronises a write query to .tars/vault.db if present."""
        try:
            if os.getenv("TARS_IS_TEST") == "1" or os.getenv("TARS_TESTING") == "1" or os.getenv("PYTEST_CURRENT_TEST"):
                vault_path = os.getenv("TARS_VAULT_PATH")
                if not vault_path:
                    return
            else:
                vault_dir = os.path.join(os.getcwd(), ".tars")
                vault_path = os.getenv("TARS_VAULT_PATH", os.path.join(vault_dir, "vault.db"))

            if vault_path and os.path.exists(os.path.dirname(os.path.abspath(vault_path))):
                if os.path.abspath(vault_path) != os.path.abspath(db.db_path):
                    with sqlite3.connect(vault_path, timeout=10.0) as v_conn:
                        v_conn.execute(query, params)
                        v_conn.commit()
        except Exception as err:
            # Vault sync notes are non-blocking to prevent offline halts
            print(f"Notice: Vault synchronization note: {err}")

    def generate_intelligent_defaults(
        self, company_name: str, company_profile: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Dynamically synthesises intelligent, context-aware onboarding modules
        calibrated to the company's tech stack, stage, core thesis, and enterprise policy.
        """
        prof = company_profile or {}
        c_name = prof.get("company_name") or company_name or "Sovereign Startup"
        tech_stack = prof.get("tech_stack") or "Python, TypeScript, SQLite WAL"
        stage = prof.get("stage") or "Seed"
        core_thesis = prof.get("core_thesis") or "Preserve sovereign institutional memory and eliminate context decay"
        raw_policy = prof.get("enterprise_policy") or "REJECT_CUSTOM_FORKS"
        policy_label = "Strict Rejection of Bespoke Forks" if "REJECT" in raw_policy.upper() else "Governed Customisation Framework"
        icp = prof.get("icp") or "Regulated Enterprises and High-Velocity Engineering Teams"
        runway = prof.get("runway_months") or 9

        return [
            {
                "id": f"MOD-{uuid.uuid4().hex[:8].upper()}",
                "day": 1,
                "title": f"Sovereignty & The Air-Gap Invariant ({c_name})",
                "description": f"Understand why {c_name} enforces zero cloud egress ($E_{{net}} = 0.00\\text{{ KB}}$) and how local on-premise execution protects company IP.",
                "tasks": [
                    f"Inspect {c_name} institutional identity and core thesis in Knowledge Base",
                    "Verify .tars/invariants.yaml and install local pre-commit AST guards",
                    "Run airplane-mode verification script in local terminal with 0.00 KB egress",
                ],
                "milestone_tour": {
                    "title": f"Founding Thesis: Why Startups Die of Context Decay",
                    "audio_duration": "3m 45s",
                    "speaker": f"Founder ({c_name})",
                },
                "order_index": 1,
                "is_published": 1,
            },
            {
                "id": f"MOD-{uuid.uuid4().hex[:8].upper()}",
                "day": 2,
                "title": f"Deterministic AST Enforcement & {tech_stack}",
                "description": f"Learn how Tree-sitter parses staged Git diffs in <50ms to enforce {c_name}'s architectural standards before commits land in main.",
                "tasks": [
                    f"Review architectural invariants in Architecture Workspace for {tech_stack}",
                    "Test local AST query runner against staged diffs in <50ms",
                    "Inspect living MADR generator output in docs/adr/",
                ],
                "milestone_tour": None,
                "order_index": 2,
                "is_published": 1,
            },
            {
                "id": f"MOD-{uuid.uuid4().hex[:8].upper()}",
                "day": 3,
                "title": "Institutional Memory & Strategic Policies",
                "description": f"Explore the sovereign graph connecting ADR decisions, customer commitments, and code entities for {c_name} ({stage} stage).",
                "tasks": [
                    f"Review policy decisions regarding {policy_label}",
                    f"Trace customer commitments into the Unified Action Hub targeting {icp}",
                    f"Ask the Socratic Mentor about architectural boundaries and cash runway ({runway} months)",
                ],
                "milestone_tour": None,
                "order_index": 3,
                "is_published": 1,
            },
            {
                "id": f"MOD-{uuid.uuid4().hex[:8].upper()}",
                "day": 4,
                "title": "First Compliant Pull Request",
                "description": f"Author and commit your first feature passing all invariant gates for {c_name}.",
                "tasks": [
                    "Implement new service component adhering to Hexagonal architecture",
                    "Verify sub-50ms pre-commit hook execution without regressions",
                    "Submit PR with automated institutional executive summary",
                ],
                "milestone_tour": None,
                "order_index": 4,
                "is_published": 1,
            },
        ]

    def seed_genesis_defaults(self, company_name: str, profile: Dict[str, Any]) -> int:
        """
        Seeds intelligent defaults during Genesis Blooming if no flight plan exists.
        Returns the number of modules seeded.
        """
        if not company_name or not company_name.strip():
            return 0

        clean_name = company_name.strip()
        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT COUNT(*) FROM onboarding_modules WHERE LOWER(company_name) = LOWER(?)",
            (clean_name,)
        )
        if cursor.fetchone()[0] > 0:
            return 0

        modules = self.generate_intelligent_defaults(clean_name, profile)
        company_id = profile.get("id") or f"CMP-{uuid.uuid4().hex[:6].upper()}"

        for mod in modules:
            m_id = mod["id"]
            m_day = mod["day"]
            m_title = mod["title"]
            m_desc = mod["description"]
            m_tasks = json.dumps(mod["tasks"])
            m_tour = json.dumps(mod["milestone_tour"]) if mod.get("milestone_tour") else None
            m_order = mod.get("order_index", m_day)
            m_pub = mod.get("is_published", 1)

            cursor.execute('''
                INSERT INTO onboarding_modules (id, company_name, company_id, day, title, description, tasks, milestone_tour, order_index, is_published, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ''', (m_id, clean_name, company_id, m_day, m_title, m_desc, m_tasks, m_tour, m_order, m_pub))

            self._sync_to_vault('''
                INSERT OR REPLACE INTO onboarding_modules (id, company_name, company_id, day, title, description, tasks, milestone_tour, order_index, is_published, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ''', (m_id, clean_name, company_id, m_day, m_title, m_desc, m_tasks, m_tour, m_order, m_pub))

        conn.commit()
        return len(modules)

    def get_flight_plan(
        self,
        company_name: str,
        company_id: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> OnboardingFlightPlanDTO:
        """
        Retrieves the company's published flight plan along with user task progress.
        If no modules exist, automatically synthesises and stores intelligent defaults.
        """
        clean_name = (company_name or "Sovereign Startup").strip()
        conn = db.get_connection()
        cursor = conn.cursor()

        cursor.execute(
            "SELECT * FROM onboarding_modules WHERE LOWER(company_name) = LOWER(?) ORDER BY order_index ASC, day ASC",
            (clean_name,)
        )
        rows = cursor.fetchall()

        if not rows:
            # Query company profile to build calibrated defaults
            from apps.api.core.company import company_repo
            profile = company_repo.get_profile(company_name=clean_name) or company_repo.get_profile(company_id=company_id)
            self.seed_genesis_defaults(clean_name, profile or {"company_name": clean_name})

            cursor.execute(
                "SELECT * FROM onboarding_modules WHERE LOWER(company_name) = LOWER(?) ORDER BY order_index ASC, day ASC",
                (clean_name,)
            )
            rows = cursor.fetchall()

        # Load completed tasks for user
        completed_tasks: Dict[str, bool] = {}
        if user_id:
            cursor.execute(
                "SELECT task_key, completed FROM onboarding_progress WHERE LOWER(company_name) = LOWER(?) AND user_id = ?",
                (clean_name, user_id.strip())
            )
            for p_row in cursor.fetchall():
                completed_tasks[p_row["task_key"]] = bool(p_row["completed"])

        modules_dto: List[OnboardingModuleDTO] = []
        for r in rows:
            raw_tasks = json.loads(r["tasks"]) if r["tasks"] else []
            raw_tour = json.loads(r["milestone_tour"]) if r["milestone_tour"] else None
            tour_dto = OnboardingMilestoneTour(**raw_tour) if raw_tour else None

            # Calculate completion status
            day = r["day"]
            all_done = len(raw_tasks) > 0 and all(completed_tasks.get(f"{day}-{idx}", False) for idx in range(len(raw_tasks)))
            status = "COMPLETED" if all_done else "CURRENT" if day == 1 else "UPCOMING"

            modules_dto.append(
                OnboardingModuleDTO(
                    id=r["id"],
                    company_name=r["company_name"],
                    company_id=r["company_id"],
                    day=r["day"],
                    title=r["title"],
                    description=r["description"],
                    tasks=raw_tasks,
                    milestone_tour=tour_dto,
                    order_index=r["order_index"],
                    is_published=bool(r["is_published"]),
                    status=status,
                )
            )

        total_days = max([m.day for m in modules_dto], default=14)
        if total_days < 14:
            total_days = 14

        return OnboardingFlightPlanDTO(
            company_name=clean_name,
            company_id=company_id,
            title=f"{clean_name} Flight-Plan",
            total_days=total_days,
            current_day=1,
            modules=modules_dto,
            completed_tasks=completed_tasks,
            is_published=True,
            updated_at=rows[-1]["updated_at"] if rows else None,
        )

    def save_flight_plan(self, plan: OnboardingFlightPlanCreate) -> OnboardingFlightPlanDTO:
        """
        Atomically saves or updates the complete flight plan for a sovereign company.
        Preserves existing user progress where task indices/keys match.
        """
        clean_name = plan.company_name.strip()
        conn = db.get_connection()
        cursor = conn.cursor()

        # Delete existing modules for this company to allow full declarative reordering/editing
        cursor.execute("DELETE FROM onboarding_modules WHERE LOWER(company_name) = LOWER(?)", (clean_name,))
        self._sync_to_vault("DELETE FROM onboarding_modules WHERE LOWER(company_name) = LOWER(?)", (clean_name,))

        saved_modules: List[OnboardingModuleDTO] = []
        for idx, mod in enumerate(plan.modules):
            m_id = mod.id if mod.id and mod.id.startswith("MOD-") else f"MOD-{uuid.uuid4().hex[:8].upper()}"
            m_day = mod.day or (idx + 1)
            m_tasks_json = json.dumps(mod.tasks)
            m_tour_json = json.dumps(mod.milestone_tour.model_dump()) if mod.milestone_tour else None
            m_order = mod.order_index if mod.order_index is not None else idx + 1
            m_pub = 1 if mod.is_published else 0

            cursor.execute('''
                INSERT INTO onboarding_modules (id, company_name, company_id, day, title, description, tasks, milestone_tour, order_index, is_published, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ''', (m_id, clean_name, plan.company_id, m_day, mod.title, mod.description, m_tasks_json, m_tour_json, m_order, m_pub))

            self._sync_to_vault('''
                INSERT OR REPLACE INTO onboarding_modules (id, company_name, company_id, day, title, description, tasks, milestone_tour, order_index, is_published, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ''', (m_id, clean_name, plan.company_id, m_day, mod.title, mod.description, m_tasks_json, m_tour_json, m_order, m_pub))

            saved_modules.append(
                OnboardingModuleDTO(
                    id=m_id,
                    company_name=clean_name,
                    company_id=plan.company_id,
                    day=m_day,
                    title=mod.title,
                    description=mod.description,
                    tasks=mod.tasks,
                    milestone_tour=mod.milestone_tour,
                    order_index=m_order,
                    is_published=bool(m_pub),
                    status=mod.status,
                )
            )

        conn.commit()

        total_days = plan.total_days or max([m.day for m in saved_modules], default=14)
        if total_days < 14:
            total_days = 14

        return OnboardingFlightPlanDTO(
            company_name=clean_name,
            company_id=plan.company_id,
            title=plan.title or f"{clean_name} Flight-Plan",
            total_days=total_days,
            current_day=1,
            modules=saved_modules,
            completed_tasks={},
            is_published=True,
            updated_at=time.strftime("%Y-%m-%d %H:%M:%S"),
        )

    def update_progress(
        self,
        company_name: str,
        task_key: str,
        completed: bool,
        user_id: Optional[str] = None,
    ) -> Dict[str, bool]:
        """
        Upserts a user's task completion state in onboarding_progress.
        Returns the full mapping of completed task keys for this user and company.
        """
        clean_name = company_name.strip()
        uid = (user_id or "usr-default").strip()
        rec_id = f"PRG-{uuid.uuid4().hex[:10].upper()}"

        conn = db.get_connection()
        cursor = conn.cursor()

        cursor.execute('''
            INSERT INTO onboarding_progress (id, company_name, user_id, task_key, completed, updated_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(company_name, user_id, task_key)
            DO UPDATE SET completed = excluded.completed, updated_at = CURRENT_TIMESTAMP
        ''', (rec_id, clean_name, uid, task_key, 1 if completed else 0))

        self._sync_to_vault('''
            INSERT INTO onboarding_progress (id, company_name, user_id, task_key, completed, updated_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(company_name, user_id, task_key)
            DO UPDATE SET completed = excluded.completed, updated_at = CURRENT_TIMESTAMP
        ''', (rec_id, clean_name, uid, task_key, 1 if completed else 0))

        conn.commit()

        # Fetch and return all completed tasks for this user
        cursor.execute(
            "SELECT task_key, completed FROM onboarding_progress WHERE LOWER(company_name) = LOWER(?) AND user_id = ?",
            (clean_name, uid)
        )
        completed_tasks: Dict[str, bool] = {}
        for r in cursor.fetchall():
            completed_tasks[r["task_key"]] = bool(r["completed"])

        return completed_tasks

    def reset_to_defaults(
        self, company_name: str, company_id: Optional[str] = None
    ) -> OnboardingFlightPlanDTO:
        """
        Resets a company's flight plan modules back to intelligent Genesis-calibrated defaults.
        """
        clean_name = company_name.strip()
        conn = db.get_connection()
        cursor = conn.cursor()

        cursor.execute("DELETE FROM onboarding_modules WHERE LOWER(company_name) = LOWER(?)", (clean_name,))
        self._sync_to_vault("DELETE FROM onboarding_modules WHERE LOWER(company_name) = LOWER(?)", (clean_name,))
        conn.commit()

        # Query profile to regenerate
        from apps.api.core.company import company_repo
        profile = company_repo.get_profile(company_name=clean_name) or company_repo.get_profile(company_id=company_id)
        self.seed_genesis_defaults(clean_name, profile or {"company_name": clean_name})

        return self.get_flight_plan(clean_name, company_id=company_id)


onboarding_repo = OnboardingRepository()
