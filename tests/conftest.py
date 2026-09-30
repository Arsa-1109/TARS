# tests/conftest.py
"""
Pytest configuration and test isolation fixtures for TARS.
Guarantees that all test suites execute in an air-gapped, isolated temporary
SQLite database and never write to or pollute tars_local.db or .tars/vault.db.
"""
import os
import shutil
import tempfile
import pytest

# 1. Establish isolated temporary test workspace directory before any apps.api imports
TEST_TMP_DIR = tempfile.mkdtemp(prefix="tars_test_isolation_")
TEST_DB_FILE = os.path.join(TEST_TMP_DIR, "isolated_test_tars.db")
TEST_VAULT_FILE = os.path.join(TEST_TMP_DIR, "isolated_vault.db")
TEST_ACTION_HUB_FILE = os.path.join(TEST_TMP_DIR, "isolated_action_hub.sqlite3")

os.environ["TARS_IS_TEST"] = "1"
os.environ["TARS_TESTING"] = "1"
os.environ["TARS_DB_PATH"] = TEST_DB_FILE
os.environ["TARS_VAULT_PATH"] = TEST_VAULT_FILE
os.environ["TARS_ACTION_HUB_DB"] = TEST_ACTION_HUB_FILE
os.environ["TARS_DATA_DIR"] = TEST_TMP_DIR

from apps.api.core.db import db

CANONICAL_USER_IDS = (
    "usr-alex",
    "usr-elena",
    "usr-marcus",
    "usr-sarah",
    "usr-chloe",
    "usr-liam",
)


@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Initialises the isolated test database schema and seeds canonical personas."""
    db.close_connection()
    db.initialize()
    yield
    db.close_connection()
    # Clean up isolated test files
    shutil.rmtree(TEST_TMP_DIR, ignore_errors=True)


@pytest.fixture(autouse=True)
def isolate_test_state():
    """
    Per-test isolation:
    Preserves canonical seed users and purges leftover test records between tests.
    """
    yield
    try:
        conn = db.get_connection()
        cur = conn.cursor()
        
        placeholders = ', '.join(['?'] * len(CANONICAL_USER_IDS))
        cur.execute(
            f"DELETE FROM users WHERE id NOT IN ({placeholders})",
            CANONICAL_USER_IDS,
        )
        
        # Purge test sessions
        cur.execute("DELETE FROM sessions")
        
        # Purge test company profiles
        cur.execute("DELETE FROM company_profile")
        
        conn.commit()
    except Exception as e:
        try:
            conn.rollback()
        except Exception:
            pass
