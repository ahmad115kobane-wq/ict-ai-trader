#!/bin/bash
# start.sh - Server startup script
# Uses xvfb-run to guarantee a working X display for Wine/MT5

echo "=== Starting ICT AI Trader Server ==="

# Wine environment
export WINEPREFIX="${WINEPREFIX:-/opt/mt5/wineprefix}"
export WINEDEBUG=-all

# Initialize Wine prefix if needed
if [ ! -f "$WINEPREFIX/system.reg" ]; then
    echo "🍷 Initializing Wine prefix..."
    mkdir -p "$WINEPREFIX"
    # Need a temporary display for wineboot
    Xvfb :98 -screen 0 800x600x16 -ac &
    XPID=$!
    sleep 1
    DISPLAY=:98 wineboot --init 2>/dev/null || true
    sleep 3
    kill $XPID 2>/dev/null || true
    echo "✅ Wine prefix initialized"
else
    echo "✅ Wine prefix already exists"
fi

# Check MT5 status
MT5_BASE="${MT5_BASE_DIR:-/opt/mt5/base}"
if [ -f "$MT5_BASE/terminal64.exe" ]; then
    echo "✅ MT5 base installed at $MT5_BASE"
else
    echo "⚠️ MT5 base NOT found at $MT5_BASE"
fi

# Check wine binary
WINE_BIN=$(which wine 2>/dev/null || which wine64 2>/dev/null || echo "NOT FOUND")
echo "🍷 Wine binary: $WINE_BIN"

# Start Node.js via xvfb-run (guarantees DISPLAY is set and Xvfb is running)
echo "🚀 Starting Node.js server with xvfb-run..."
exec xvfb-run --auto-servernum --server-args="-screen 0 1024x768x24 -ac" node dist/index.js
