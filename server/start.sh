#!/bin/bash
# start.sh - Server startup script with full diagnostics
set +e  # Don't exit on errors - diagnostics may fail but server should still start

echo "=========================================="
echo "=== ICT AI Trader Server Startup ==="
echo "=========================================="

# Wine environment
export WINEPREFIX="${WINEPREFIX:-/opt/mt5/wineprefix}"
export WINEDEBUG=-all

# ---- 1. Start Xvfb ----
echo ""
echo "--- Step 1: Starting Xvfb ---"
mkdir -p /tmp/.X11-unix
Xvfb :99 -screen 0 1024x768x24 -ac +extension GLX +render -noreset &
XVFB_PID=$!
sleep 2
export DISPLAY=:99

# Verify Xvfb
if kill -0 $XVFB_PID 2>/dev/null; then
    echo "✅ Xvfb running (PID: $XVFB_PID)"
else
    echo "❌ Xvfb FAILED to start!"
fi

if [ -S "/tmp/.X11-unix/X99" ]; then
    echo "✅ X11 socket exists: /tmp/.X11-unix/X99"
else
    echo "❌ X11 socket NOT found!"
    ls -la /tmp/.X11-unix/ 2>/dev/null || echo "  /tmp/.X11-unix/ does not exist"
fi

echo "  DISPLAY=$DISPLAY"

# ---- 2. Check Wine ----
echo ""
echo "--- Step 2: Wine diagnostics ---"
WINE_BIN=$(which wine 2>/dev/null || which wine64 2>/dev/null || echo "NOT_FOUND")
echo "  Wine binary: $WINE_BIN"
echo "  Wine version: $($WINE_BIN --version 2>/dev/null || echo 'unknown')"
echo "  WINEPREFIX: $WINEPREFIX"

# Check Wine X11 driver
echo "  Wine X11 driver locations:"
find /usr -name "winex11*" -type f 2>/dev/null | while read f; do echo "    $f"; done
find /opt -name "winex11*" -type f 2>/dev/null | while read f; do echo "    $f"; done

# Check Wine prefix
if [ -f "$WINEPREFIX/system.reg" ]; then
    echo "✅ Wine prefix initialized"
else
    echo "🍷 Initializing Wine prefix..."
    mkdir -p "$WINEPREFIX"
    $WINE_BIN wineboot --init 2>/dev/null || true
    sleep 3
    echo "✅ Wine prefix initialized"
fi

# ---- 3. Test Wine X11 connectivity ----
echo ""
echo "--- Step 3: Wine X11 test ---"
export WINEDEBUG=+err
WINE_TEST_OUTPUT=$($WINE_BIN cmd /c "echo Wine_X11_OK" 2>&1 || true)
WINE_TEST_EXIT=$?
export WINEDEBUG=-all

if echo "$WINE_TEST_OUTPUT" | grep -q "Wine_X11_OK"; then
    echo "✅ Wine X11 test PASSED"
elif echo "$WINE_TEST_OUTPUT" | grep -q "nodrv_CreateWindow"; then
    echo "❌ Wine X11 test FAILED - no display driver!"
    echo "  Wine output (last 10 lines):"
    echo "$WINE_TEST_OUTPUT" | tail -10
else
    echo "⚠️ Wine X11 test unclear (exit: $WINE_TEST_EXIT)"
    echo "  Wine output (last 10 lines):"
    echo "$WINE_TEST_OUTPUT" | tail -10
fi

# ---- 4. Check MT5 ----
echo ""
echo "--- Step 4: MT5 status ---"
MT5_BASE="${MT5_BASE_DIR:-/opt/mt5/base}"
if [ -f "$MT5_BASE/terminal64.exe" ]; then
    echo "✅ MT5 base installed at $MT5_BASE"
    echo "  terminal64.exe size: $(stat -c%s "$MT5_BASE/terminal64.exe" 2>/dev/null || echo 'unknown') bytes"
else
    echo "⚠️ MT5 base NOT found at $MT5_BASE"
    echo "  Contents: $(ls $MT5_BASE 2>/dev/null || echo 'empty')"
fi

# ---- 5. Start Node.js ----
echo ""
echo "--- Step 5: Starting Node.js ---"
echo "🚀 Starting Node.js server..."
exec node dist/index.js
