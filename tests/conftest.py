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

import uuid

from pathlib import Path

# 1. Establish isolated temporary test workspace directory before any apps.api imports
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEMP_PARENT = os.path.join(REPO_ROOT, "tmp_test")
tempfile.tempdir = TEMP_PARENT

def _safe_mkdtemp(suffix="", prefix="tmp", dir=None):
    base = dir or TEMP_PARENT
    os.makedirs(base, exist_ok=True)
    d = os.path.join(base, f"{prefix}_{uuid.uuid4().hex[:8]}{suffix}")
    os.makedirs(d, exist_ok=True)
    return d

tempfile.mkdtemp = _safe_mkdtemp

TEST_TMP_DIR = os.path.join(TEMP_PARENT, f"tars_test_isolation_{uuid.uuid4().hex[:8]}")
os.makedirs(TEST_TMP_DIR, exist_ok=True)
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


@pytest.fixture
def tmp_path():
    p = Path(TEMP_PARENT) / f"tp_{uuid.uuid4().hex[:8]}"
    p.mkdir(parents=True, exist_ok=True)
    yield p
    shutil.rmtree(p, ignore_errors=True)


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
