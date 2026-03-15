#!/bin/bash
# start.sh - Server startup script
# Starts Xvfb, initializes Wine, then starts Node.js server.
# MT5 is pre-installed via Docker multi-stage build.

echo "=== Starting ICT AI Trader Server ==="

# 1. Start Xvfb (virtual display for Wine/MT5)
echo "🖥️ Starting Xvfb..."
Xvfb :99 -screen 0 800x600x16 -ac &
export DISPLAY=:99
sleep 1
echo "✅ Xvfb running on :99"

# 2. Initialize Wine prefix (required before running any .exe)
WINE_PFX="${WINEPREFIX:-/opt/mt5/wineprefix}"
export WINEPREFIX="$WINE_PFX"
export WINEDEBUG=-all

if [ ! -f "$WINE_PFX/system.reg" ]; then
    echo "🍷 Initializing Wine prefix at $WINE_PFX..."
    mkdir -p "$WINE_PFX"
    wineboot --init 2>/dev/null || wine64 wineboot --init 2>/dev/null || true
    sleep 3
    echo "✅ Wine prefix initialized"
else
    echo "✅ Wine prefix already initialized at $WINE_PFX"
fi

# 3. Check MT5 status
MT5_BASE="${MT5_BASE_DIR:-/opt/mt5/base}"
if [ -f "$MT5_BASE/terminal64.exe" ]; then
    echo "✅ MT5 base installed at $MT5_BASE"
else
    echo "⚠️ MT5 base NOT found at $MT5_BASE"
    echo "   Contents: $(ls $MT5_BASE 2>/dev/null || echo 'empty')"
fi

# 4. Check wine binary
echo "🍷 Wine binary: $(which wine64 2>/dev/null || which wine 2>/dev/null || echo 'NOT FOUND')"

# 5. Start Node.js server
echo "🚀 Starting Node.js server..."
exec node dist/index.js
