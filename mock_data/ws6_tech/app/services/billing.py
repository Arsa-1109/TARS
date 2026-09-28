"""
AetherFlow Billing Service (UNREPAIRED - VIOLATES INV-017)
Demonstrates the dangerous anti-pattern of executing external network calls
(Stripe API) inside an open database transaction block.

Trigger Condition for TARS Tree-sitter Invariant Engine:
Tree-sitter rule: INV-017 (Network call inside db.transaction block)
"""

import time
import requests
from typing import Dict, Any
from app.db.session import get_db_session

class BillingService:
    def __init__(self, stripe_api_key: str):
        self.api_key = stripe_api_key
        self.base_url = "https://api.stripe.com/v1"

    def process_subscription_upgrade(self, tenant_id: str, user_id: str, plan_id: str, amount_cents: int) -> Dict[str, Any]:
        """
        Upgrades customer tier and charges card.
        
        CRITICAL VULNERABILITY (INV-017):
        The requests.post() network call to Stripe happens INSIDE the 'with db.transaction()' block.
        If Stripe takes 3.5 seconds to respond or times out, the database row lock on 'tenants'
        is held open, starving the connection pool and causing site-wide latency spikes.
        """
        db = get_db_session()
        
        # BEGIN DATABASE TRANSACTION
        with db.transaction():
            # 1. Update internal tenant record (acquires row lock)
            tenant = db.query("SELECT * FROM tenants WHERE id = :id FOR UPDATE", id=tenant_id).fetchone()
            if not tenant:
                raise ValueError(f"Tenant {tenant_id} not found")
            
            # 2. Update local subscription state
            db.execute(
                "UPDATE tenants SET current_plan = :plan, status = 'PENDING_PAYMENT' WHERE id = :id",
                plan=plan_id, id=tenant_id
            )
            
            # 3. [FATAL VIOLATION - INV-017] External network call inside active transaction!
            headers = {"Authorization": f"Bearer {self.api_key}"}
            payload = {
                "customer": tenant["stripe_customer_id"],
                "amount": amount_cents,
                "currency": "usd",
                "description": f"AetherFlow Upgrade to {plan_id}"
            }
            
            # Any HTTP timeout or network latency blocks the DB transaction
            response = requests.post(f"{self.base_url}/charges", headers=headers, json=payload, timeout=10.0)
            
            if response.status_code != 200:
                raise RuntimeError(f"Stripe payment failed: {response.text}")
            
            charge_data = response.json()
            
            # 4. Finalize database state
            db.execute(
                "UPDATE tenants SET status = 'ACTIVE', last_payment_id = :ch_id WHERE id = :id",
                ch_id=charge_data["id"], id=tenant_id
            )
            
            return {
                "status": "SUCCESS",
                "charge_id": charge_data["id"],
                "tenant_id": tenant_id,
                "plan": plan_id
            }
