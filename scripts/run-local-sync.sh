#!/usr/bin/env bash
# MATRIX Local Sync Launcher for 24/7 Laptop Operation
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
echo "🚀 تشغيل MATRIX Git-Backed Sync Daemon..."
echo "📁 المسار: $SCRIPT_DIR"

python3 "$SCRIPT_DIR/continuous_sync.py" "$SCRIPT_DIR"
