# scripts/install_hook.ps1 - Installs TARS pre-commit git hook on Windows

$hookDir = ".git\hooks"
$hookFile = "$hookDir\pre-commit"

if (-not (Test-Path $hookDir)) {
    Write-Host "Error: .git directory not found. Please run this from the project root." -ForegroundColor Red
    exit 1
}

$content = "#!/usr/bin/env bash`nif [ -f .venv/Scripts/python.exe ]; then`n    .venv/Scripts/python.exe scripts/pre_commit.py`nelif [ -f .venv/bin/python ]; then`n    .venv/bin/python scripts/pre_commit.py`nelse`n    python scripts/pre_commit.py`nfi"

Set-Content -Path $hookFile -Value $content -NoNewline
Write-Host "[OK] TARS Pre-Commit Git Hook installed successfully to $hookFile" -ForegroundColor Green
