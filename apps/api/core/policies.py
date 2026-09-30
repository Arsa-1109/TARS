# apps/api/core/policies.py
"""
Deterministic Policy Engine (Points 13 & 14)
Extends deterministic architectural invariant philosophy to organisational governance.
Policies are machine-readable, declarative, and evaluated deterministically.
An LLM can explain policy results but cannot grant permissions or override policies.
"""

import json
import logging
import sqlite3
import time
from typing import Dict, Any, List, Optional
from apps.api.core.db import db
from apps.api.schemas.core_contracts import PolicyRule, PolicyDecision
from apps.api.core.errors import TARSException

logger = logging.getLogger("tars.core.policies")

RISK_LEVEL_ORDER = {
    "LOW": 1,
    "MEDIUM": 2,
    "HIGH": 3,
    "CRITICAL": 4,
}


DEFAULT_POLICIES = [
    PolicyRule(
        id="POL-DEPLOY-STAGING",
        action_type="DEPLOY_STAGING",
        description="Automated deployments to staging environment",
        allowed_roles=["FOUNDER", "CHIEF_ARCHITECT", "ENGINEER", "LEAD", "DEVOPS"],
        required_clearance="ALL_TEAM",
        max_risk="HIGH",
        requires_human=False,
        allowed_tools=["deploy_container", "run_migration"],
        conditions={"environment": "staging"},
        organisation_id="CMP-GENESIS-01",
    ),
    PolicyRule(
        id="POL-DEPLOY-PROD",
        action_type="DEPLOY_PROD",
        description="Production release deployments requiring executive approval",
        allowed_roles=["FOUNDER", "CHIEF_ARCHITECT", "LEAD"],
        required_clearance="ALL_TEAM",
        max_risk="CRITICAL",
        requires_human=True,
        allowed_tools=["deploy_container", "switch_traffic"],
        conditions={"environment": "production"},
        organisation_id="CMP-GENESIS-01",
    ),
    PolicyRule(
        id="POL-DEPLOY-SERVICE",
        action_type="DEPLOY_SERVICE",
        description="Generic service deployment pipeline",
        allowed_roles=["FOUNDER", "CHIEF_ARCHITECT", "ENGINEER", "LEAD"],
        required_clearance="ALL_TEAM",
        max_risk="HIGH",
        requires_human=False,
        allowed_tools=["deploy_container"],
        conditions={},
        organisation_id="CMP-GENESIS-01",
    ),
    PolicyRule(
        id="POL-DB-MIGRATE",
        action_type="DB_MIGRATION",
        description="Database schema migrations and ALTER operations",
        allowed_roles=["CHIEF_ARCHITECT", "FOUNDER"],
        required_clearance="ALL_TEAM",
        max_risk="CRITICAL",
        requires_human=True,
        allowed_tools=["apply_sql_migration"],
        conditions={},
        organisation_id="CMP-GENESIS-01",
    ),
    PolicyRule(
        id="POL-DB-MIGRATE-LEGACY",
        action_type="DATABASE_MIGRATION",
        description="Database schema migrations and ALTER operations",
        allowed_roles=["CHIEF_ARCHITECT", "FOUNDER"],
        required_clearance="ALL_TEAM",
        max_risk="CRITICAL",
        requires_human=True,
        allowed_tools=["apply_sql_migration"],
        conditions={},
        organisation_id="CMP-GENESIS-01",
    ),
    PolicyRule(
        id="POL-EMAIL-EXTERNAL",
        action_type="SEND_EMAIL",
        description="Outbound customer communications",
        allowed_roles=["FOUNDER", "SALES"],
        required_clearance="ALL_TEAM",
        max_risk="LOW",
        requires_human=True,
        allowed_tools=["send_mail_via_smtp"],
        conditions={},
        organisation_id="CMP-GENESIS-01",
    ),
    PolicyRule(
        id="POL-DEFAULT-GENERIC",
        action_type="GENERIC",
        description="Generic internal tasks",
        allowed_roles=["FOUNDER", "CHIEF_ARCHITECT", "ENGINEER", "PRODUCT", "SALES", "LEAD"],
        required_clearance="ALL_TEAM",
        max_risk="MEDIUM",
        requires_human=False,
        allowed_tools=[],
        conditions={},
        organisation_id="CMP-GENESIS-01",
    ),
]


class PolicyEngine:
    """Deterministic, rules-based policy engine."""

    def __init__(self):
        self._ensure_seed_policies()

    def _ensure_seed_policies(self):
        """Seeds default deterministic policies into database."""
        try:
            conn = db.get_connection()
            cursor = conn.cursor()
            now_ts = int(time.time())
            for pol in DEFAULT_POLICIES:
                cursor.execute("""
                    INSERT OR REPLACE INTO action_policies (
                        id, action_type, description, allowed_roles, required_clearance,
                        max_risk, requires_human, allowed_tools, conditions, organisation_id,
                        is_active, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """, (
                    pol.id,
                    pol.action_type,
                    pol.description,
                    json.dumps(pol.allowed_roles),
                    pol.required_clearance,
                    pol.max_risk,
                    1 if pol.requires_human else 0,
                    json.dumps(pol.allowed_tools),
                    json.dumps(pol.conditions),
                    pol.organisation_id,
                    1 if pol.is_active else 0,
                    now_ts,
                    now_ts,
                ))
            conn.commit()
        except Exception as e:
            logger.debug(f"Notice: seeding policies non-fatal note: {e}")

    def get_policy(self, policy_id: str) -> Optional[PolicyRule]:
        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM action_policies WHERE id = ?;", (policy_id,))
        row = cursor.fetchone()
        if not row:
            return None
        return self._row_to_policy(row)

    def list_policies(self, organisation_id: str = "CMP-GENESIS-01") -> List[PolicyRule]:
        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM action_policies
            WHERE (organisation_id = ? OR organisation_id = 'CMP-GENESIS-01' OR organisation_id IS NULL)
              AND is_active = 1
            ORDER BY created_at ASC;
        """, (organisation_id,))
        return [self._row_to_policy(r) for r in cursor.fetchall()]

    def create_or_update_policy(self, policy: PolicyRule) -> PolicyRule:
        now_ts = int(time.time())
        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO action_policies (
                id, action_type, description, allowed_roles, required_clearance,
                max_risk, requires_human, allowed_tools, conditions, organisation_id,
                is_active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                action_type = excluded.action_type,
                description = excluded.description,
                allowed_roles = excluded.allowed_roles,
                required_clearance = excluded.required_clearance,
                max_risk = excluded.max_risk,
                requires_human = excluded.requires_human,
                allowed_tools = excluded.allowed_tools,
                conditions = excluded.conditions,
                organisation_id = excluded.organisation_id,
                is_active = excluded.is_active,
                updated_at = excluded.updated_at;
        """, (
            policy.id,
            policy.action_type,
            policy.description,
            json.dumps(policy.allowed_roles),
            policy.required_clearance,
            policy.max_risk,
            1 if policy.requires_human else 0,
            json.dumps(policy.allowed_tools),
            json.dumps(policy.conditions),
            policy.organisation_id,
            1 if policy.is_active else 0,
            now_ts,
            now_ts,
        ))
        conn.commit()
        return policy

    def delete_policy(self, policy_id: str) -> bool:
        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM action_policies WHERE id = ?;", (policy_id,))
        conn.commit()
        return cursor.rowcount > 0

    def evaluate(
        self,
        action_type: str,
        risk_level: str = "LOW",
        actor_role: str = "ENGINEER",
        actor_clearance: str = "ALL_TEAM",
        parameters: Optional[Dict[str, Any]] = None,
        tool: Optional[str] = None,
        organisation_id: str = "CMP-GENESIS-01",
    ) -> PolicyDecision:
        """
        Deterministically evaluates policy rules for an action.
        Deny-by-default architecture: if no policy authorizes the action, execution is denied.
        """
        parameters = parameters or {}
        policies = self.list_policies(organisation_id)

        matching_policies = [
            p for p in policies
            if p.action_type.upper() in (action_type.upper(), "*")
        ]

        if not matching_policies:
            matching_policies = [
                p for p in DEFAULT_POLICIES
                if p.action_type.upper() in (action_type.upper(), "*")
            ]

        if not matching_policies:
            return PolicyDecision(
                is_allowed=False,
                requires_human=True,
                denial_reasons=[f"NO_MATCHING_POLICY: No active policy found for action_type='{action_type}'"],
            )

        denial_reasons = []
        action_risk_score = RISK_LEVEL_ORDER.get(risk_level.upper(), 2)

        for pol in matching_policies:
            pol_denials = []

            # 1. Role validation
            allowed_roles_norm = [r.upper() for r in pol.allowed_roles]
            if actor_role.upper() not in allowed_roles_norm and "*" not in allowed_roles_norm:
                pol_denials.append(
                    f"ROLE_NOT_AUTHORIZED: Role '{actor_role}' is not in allowed roles {pol.allowed_roles}"
                )

            # 2. Clearance validation
            if pol.required_clearance in ("EXECUTIVE", "EXECUTIVE_ONLY"):
                if actor_clearance not in ("EXECUTIVE", "EXECUTIVE_ONLY"):
                    pol_denials.append(
                        f"INSUFFICIENT_CLEARANCE: Action requires '{pol.required_clearance}' clearance; actor has '{actor_clearance}'"
                    )

            # 3. Risk threshold validation
            max_risk_score = RISK_LEVEL_ORDER.get(pol.max_risk.upper(), 2)
            if action_risk_score > max_risk_score:
                pol_denials.append(
                    f"RISK_EXCEEDS_THRESHOLD: Action risk '{risk_level}' exceeds policy ceiling '{pol.max_risk}'"
                )

            # 4. Tool allowance check
            if tool and pol.allowed_tools:
                if tool not in pol.allowed_tools and "*" not in pol.allowed_tools:
                    pol_denials.append(
                        f"TOOL_NOT_PERMITTED: Tool '{tool}' not allowed by policy {pol.id}"
                    )

            # 5. Parameter condition check
            for cond_key, cond_val in pol.conditions.items():
                if cond_key in parameters and parameters.get(cond_key) != cond_val:
                    pol_denials.append(
                        f"CONDITION_NOT_MET: Parameter '{cond_key}'={parameters.get(cond_key)} does not match required value '{cond_val}'"
                    )

            # If this policy passed with 0 denials, authorization succeeds
            if not pol_denials:
                return PolicyDecision(
                    is_allowed=True,
                    requires_human=pol.requires_human,
                    matching_policy_id=pol.id,
                    denial_reasons=[],
                )
            else:
                denial_reasons.extend(pol_denials)

        return PolicyDecision(
            is_allowed=False,
            requires_human=True,
            matching_policy_id=matching_policies[0].id,
            denial_reasons=denial_reasons,
        )

    def _row_to_policy(self, row: sqlite3.Row) -> PolicyRule:
        d = dict(row)
        return PolicyRule(
            id=d["id"],
            action_type=d["action_type"],
            description=d.get("description"),
            allowed_roles=json.loads(d.get("allowed_roles") or "[]"),
            required_clearance=d.get("required_clearance") or "ALL_TEAM",
            max_risk=d.get("max_risk") or "MEDIUM",
            requires_human=bool(d.get("requires_human", 1)),
            allowed_tools=json.loads(d.get("allowed_tools") or "[]"),
            conditions=json.loads(d.get("conditions") or "{}"),
            organisation_id=d.get("organisation_id") or "CMP-GENESIS-01",
            is_active=bool(d.get("is_active", 1)),
        )


policy_engine = PolicyEngine()
