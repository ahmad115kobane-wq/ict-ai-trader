#!/bin/bash
# start.sh - Server startup script
set +e

echo "=========================================="
echo "=== ICT AI Trader Server Startup ==="
echo "=========================================="

# Wine environment (prefix initialized at build time)
export WINEPREFIX="${WINEPREFIX:-/opt/mt5/wineprefix}"
export WINEARCH="${WINEARCH:-win64}"
export WINEDEBUG=-all

# ---- 1. Start Xvfb ----
echo ""
echo "--- Step 1: Starting Xvfb ---"
mkdir -p /tmp/.X11-unix
Xvfb :99 -screen 0 1024x768x24 -ac +extension GLX +render -noreset &
XVFB_PID=$!
sleep 2
export DISPLAY=:99

if kill -0 $XVFB_PID 2>/dev/null; then
    echo "✅ Xvfb running (PID: $XVFB_PID)"
else
    echo "❌ Xvfb FAILED to start!"
fi

if [ -S "/tmp/.X11-unix/X99" ]; then
    echo "✅ X11 socket exists"
else
    echo "❌ X11 socket NOT found!"
    ls -la /tmp/.X11-unix/ 2>/dev/null || true
fi

# ---- 2. Wine status ----
echo ""
echo "--- Step 2: Wine check ---"
WINE_BIN=$(which wine 2>/dev/null || which wine64 2>/dev/null || echo "NOT_FOUND")
echo "  Wine: $WINE_BIN ($($WINE_BIN --version 2>/dev/null || echo 'unknown'))"
echo "  WINEPREFIX: $WINEPREFIX"
echo "  WINEARCH: $WINEARCH"
echo "  DISPLAY: $DISPLAY"

# Wine prefix check - reinit only if missing
if [ -f "$WINEPREFIX/system.reg" ]; then
    echo "✅ Wine prefix ready"
else
    echo "🍷 Wine prefix missing, reinitializing..."
    mkdir -p "$WINEPREFIX"
    WINEDEBUG=-all $WINE_BIN wineboot --init 2>/dev/null || true
    sleep 5
    if [ -f "$WINEPREFIX/system.reg" ]; then
        echo "✅ Wine prefix initialized"
    else
        echo "❌ Wine prefix initialization failed"
    fi
fi

# Quick X11 test
echo ""
echo "--- Step 3: Wine X11 test ---"
WINEDEBUG=+err WINE_TEST=$($WINE_BIN cmd /c "echo Wine_X11_OK" 2>&1 || true)
if echo "$WINE_TEST" | grep -q "Wine_X11_OK"; then
    echo "✅ Wine X11 PASSED"
elif echo "$WINE_TEST" | grep -q "nodrv_CreateWindow"; then
    echo "❌ Wine X11 FAILED - nodrv_CreateWindow"
    echo "$WINE_TEST" | grep -i "err\|drv\|x11" | tail -5
else
    echo "⚠️ Wine X11 unclear"
    echo "$WINE_TEST" | tail -5
fi

# ---- 4. MT5 status ----
echo ""
echo "--- Step 4: MT5 ---"
MT5_BASE="${MT5_BASE_DIR:-/opt/mt5/base}"
if [ -f "$MT5_BASE/terminal64.exe" ]; then
    echo "✅ MT5 installed ($(stat -c%s "$MT5_BASE/terminal64.exe" 2>/dev/null || echo '?') bytes)"
else
    echo "⚠️ MT5 NOT found at $MT5_BASE"
fi

# ---- 5. Start Node.js ----
echo ""
echo "--- Step 5: Starting Node.js ---"
echo "🚀 Starting server..."
exec node dist/index.js
