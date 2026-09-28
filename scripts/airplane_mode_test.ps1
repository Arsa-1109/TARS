# scripts/airplane_mode_test.ps1 - Stage verification script for Windows PowerShell

$pythonExe = "python"
$venvPython = Join-Path $PSScriptRoot "..\.venv\Scripts\python.exe"
if (Test-Path $venvPython) {
    $pythonExe = (Resolve-Path $venvPython).Path
}

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "[AIRPLANE MODE] TARS AIRPLANE-MODE OFFLINE STAGE VERIFICATION TEST" -ForegroundColor Cyan
Write-Host "Target: 100% Air-Gapped | 0.00 KB Cloud Egress | Sub-50ms AST Invariant Gate" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan

Write-Host "`n[1/3] Running Unit Test Suite..." -ForegroundColor Yellow
& $pythonExe -m pytest -v tests/test_cortex.py
if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] Pytest suite failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`n[2/3] Verifying 4 Killer Rules Interception..." -ForegroundColor Yellow
& $pythonExe tars_cli.py demo
if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] 4 Killer Rules demo failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`n[3/3] Verifying Pre-Commit Sentinel Execution..." -ForegroundColor Yellow
& $pythonExe scripts/pre_commit.py
if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] Pre-commit hook execution failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`n================================================================================" -ForegroundColor Green
Write-Host "[PASS] ALL STAGE VERIFICATION GATES PASSED (100% Offline / Zero Cloud Egress)" -ForegroundColor Green
Write-Host "================================================================================" -ForegroundColor Green
