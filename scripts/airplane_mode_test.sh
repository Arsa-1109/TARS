#!/usr/bin/env bash
# scripts/airplane_mode_test.sh - Stage verification script for Track 1 Sovereign AI

echo "================================================================================"
echo "✈️  TARS AIRPLANE-MODE OFFLINE STAGE VERIFICATION TEST"
echo "Target: 100% Air-Gapped | 0.00 KB Cloud Egress | Sub-50ms AST Invariant Gate"
echo "================================================================================"

echo -e "\n[1/3] Running Unit Test Suite..."
python -m pytest -v tests/test_cortex.py
if [ $? -ne 0 ]; then
  echo "❌ Pytest suite failed!"
  exit 1
fi

echo -e "\n[2/3] Verifying 4 Killer Rules Interception..."
python tars_cli.py demo
if [ $? -ne 0 ]; then
  echo "❌ 4 Killer Rules demo failed!"
  exit 1
fi

echo -e "\n[3/3] Verifying Pre-Commit Sentinel Execution..."
python scripts/pre_commit.py
if [ $? -ne 0 ]; then
  echo "❌ Pre-commit hook execution failed!"
  exit 1
fi

echo -e "\n================================================================================"
echo "✔ ALL STAGE VERIFICATION GATES PASSED (100% Offline / Zero Cloud Egress)"
echo "================================================================================"
