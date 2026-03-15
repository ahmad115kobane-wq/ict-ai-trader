#!/bin/bash
# start.sh - Server startup script
# Starts Xvfb, installs MT5 if needed, then starts Node.js server

set -e

echo "=== Starting ICT AI Trader Server ==="

# 1. Start Xvfb (virtual display for Wine)
echo "🖥️ Starting Xvfb..."
Xvfb :99 -screen 0 800x600x16 -ac &
export DISPLAY=:99
sleep 1
echo "✅ Xvfb running on :99"

# 2. Check if MT5 is installed
MT5_BASE="${MT5_BASE_DIR:-/opt/mt5/base}"
MT5_WINE="${WINEPREFIX:-/opt/mt5/wineprefix}"

if [ ! -f "$MT5_BASE/terminal64.exe" ]; then
    echo "📥 MT5 not found. Installing..."
    
    mkdir -p "$MT5_BASE" "$MT5_WINE"
    export WINEPREFIX="$MT5_WINE"
    export WINEDEBUG=-all
    
    # Initialize Wine prefix
    echo "🍷 Initializing Wine..."
    wineboot --init 2>/dev/null || true
    sleep 3
    
    # Download MT5 installer
    echo "📥 Downloading MT5 installer..."
    wget -q --show-progress -O /tmp/mt5setup.exe \
        "https://download.mql5.com/cdn/web/metaquotes.software.corp/mt5/mt5setup.exe" || {
        echo "❌ Failed to download MT5 installer"
        echo "Starting server without MT5..."
        exec node dist/index.js
    }
    
    # Run MT5 installer via Wine
    echo "⚙️ Running MT5 installer (this takes 1-2 minutes)..."
    wine /tmp/mt5setup.exe /auto &
    INSTALLER_PID=$!
    
    # Wait for terminal64.exe to appear
    WAITED=0
    MAX_WAIT=180
    while [ $WAITED -lt $MAX_WAIT ]; do
        sleep 5
        WAITED=$((WAITED + 5))
        
        # Check common install locations
        MT5_FOUND=""
        for CHECK_PATH in \
            "$MT5_WINE/drive_c/Program Files/MetaTrader 5/terminal64.exe" \
            "$MT5_WINE/drive_c/Program Files (x86)/MetaTrader 5/terminal64.exe" \
            "$MT5_WINE/drive_c/users/root/AppData/Roaming/MetaQuotes/Terminal/*/terminal64.exe"; do
            if ls $CHECK_PATH 1>/dev/null 2>&1; then
                MT5_FOUND=$(dirname "$(ls $CHECK_PATH 2>/dev/null | head -1)")
                break
            fi
        done
        
        if [ -n "$MT5_FOUND" ]; then
            echo "✅ MT5 found at: $MT5_FOUND"
            break
        fi
        
        echo "  ⏳ Waiting for MT5 install... ${WAITED}/${MAX_WAIT}s"
    done
    
    # Kill installer
    kill $INSTALLER_PID 2>/dev/null || true
    sleep 2
    
    # Copy MT5 files to base directory
    if [ -n "$MT5_FOUND" ]; then
        cp -r "$MT5_FOUND"/* "$MT5_BASE/" 2>/dev/null || true
        echo "✅ MT5 installed to $MT5_BASE"
        ls -la "$MT5_BASE/terminal64.exe" 2>/dev/null
    else
        echo "⚠️ MT5 installation timed out after ${MAX_WAIT}s"
        echo "  Checking Wine drive_c for any MT5 files..."
        find "$MT5_WINE/drive_c" -name "terminal64.exe" 2>/dev/null || echo "  No terminal64.exe found"
        find "$MT5_WINE/drive_c" -name "terminal.exe" 2>/dev/null || echo "  No terminal.exe found"
        echo "  Server will start without MT5 support"
    fi
    
    # Cleanup
    rm -f /tmp/mt5setup.exe
else
    echo "✅ MT5 already installed at $MT5_BASE"
fi

# 3. Start Node.js server
echo "🚀 Starting Node.js server..."
exec node dist/index.js
