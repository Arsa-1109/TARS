#!/usr/bin/env bash
# scripts/install_hooks.sh - Installs TARS tracked Git hooks
git config core.hooksPath scripts/hooks
chmod +x scripts/hooks/pre-push
echo "✅ [TARS Sentinel] Git hooks path configured to scripts/hooks"
