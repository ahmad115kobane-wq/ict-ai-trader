#!/bin/bash
# start.sh - Server startup script
# Starts Xvfb then Node.js server. MT5 is pre-installed via Docker multi-stage build.

echo "=== Starting ICT AI Trader Server ==="

# 1. Start Xvfb (virtual display for Wine/MT5)
echo "🖥️ Starting Xvfb..."
Xvfb :99 -screen 0 800x600x16 -ac &
export DISPLAY=:99
sleep 1
echo "✅ Xvfb running on :99"

# 2. Check MT5 status
MT5_BASE="${MT5_BASE_DIR:-/opt/mt5/base}"
if [ -f "$MT5_BASE/terminal64.exe" ]; then
    echo "✅ MT5 base installed at $MT5_BASE"
else
    echo "⚠️ MT5 base NOT found at $MT5_BASE"
    echo "   Contents: $(ls $MT5_BASE 2>/dev/null || echo 'empty')"
fi

# 3. Start Node.js server
echo "🚀 Starting Node.js server..."
exec node dist/index.js
