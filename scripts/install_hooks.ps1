# scripts/install_hooks.ps1 - Installs TARS tracked Git hooks
git config core.hooksPath scripts/hooks
Write-Host "✅ [TARS Sentinel] Git hooks path configured to scripts/hooks" -ForegroundColor Green
