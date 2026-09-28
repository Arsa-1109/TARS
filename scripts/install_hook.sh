#!/usr/bin/env bash
# scripts/install_hook.sh - Installs TARS pre-commit git hook

HOOK_DIR=".git/hooks"
HOOK_FILE="$HOOK_DIR/pre-commit"

if [ ! -d "$HOOK_DIR" ]; then
  echo "Error: .git directory not found. Please run this from the project root."
  exit 1
fi

cat << 'EOF' > "$HOOK_FILE"
#!/usr/bin/env bash
if [ -f ".venv/Scripts/python.exe" ]; then
  .venv/Scripts/python.exe scripts/pre_commit.py
elif [ -f ".venv/bin/python" ]; then
  .venv/bin/python scripts/pre_commit.py
else
  python scripts/pre_commit.py
fi
EOF

chmod +x "$HOOK_FILE"
echo "✔ TARS Pre-Commit Git Hook installed successfully to $HOOK_FILE"
