# scripts/airplane_mode_test.ps1 - Stage verification script for Windows PowerShell

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "✈️  TARS AIRPLANE-MODE OFFLINE STAGE VERIFICATION TEST" -ForegroundColor Cyan
Write-Host "Target: 100% Air-Gapped | 0.00 KB Cloud Egress | Sub-50ms AST Invariant Gate" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan

Write-Host "`n[1/3] Running Unit Test Suite..." -ForegroundColor Yellow
python -m pytest -v tests/test_cortex.py
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Pytest suite failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`n[2/3] Verifying 4 Killer Rules Interception..." -ForegroundColor Yellow
python tars_cli.py demo
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 4 Killer Rules demo failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`n[3/3] Verifying Pre-Commit Sentinel Execution..." -ForegroundColor Yellow
python scripts/pre_commit.py
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Pre-commit hook execution failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`n================================================================================" -ForegroundColor Green
Write-Host "✔ ALL STAGE VERIFICATION GATES PASSED (100% Offline / Zero Cloud Egress)" -ForegroundColor Green
Write-Host "================================================================================" -ForegroundColor Green
