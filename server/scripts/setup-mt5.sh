#!/bin/bash
# setup-mt5.sh
# تثبيت Wine و MT5 على Linux (Debian/Ubuntu)
# يُشغَّل مرة واحدة على السيرفر

set -e

echo "============================================"
echo "  MT5 Setup Script for Linux (Wine)"
echo "============================================"

# ===================== المتغيرات =====================
MT5_BASE_DIR="${MT5_BASE_DIR:-/opt/mt5/base}"
MT5_INSTANCES_DIR="${MT5_INSTANCES_DIR:-/opt/mt5/instances}"
WINE_PREFIX="${WINE_PREFIX:-/opt/mt5/wineprefix}"
MT5_INSTALLER_URL="https://download.mql5.com/cdn/web/metaquotes.software.corp/mt5/mt5setup.exe"

# ===================== تثبيت Wine =====================
install_wine() {
    echo ""
    echo "📦 Installing Wine..."
    
    # Enable 32-bit architecture (needed for some Wine components)
    dpkg --add-architecture i386 2>/dev/null || true
    
    apt-get update -qq
    apt-get install -y --no-install-recommends \
        wine64 \
        xvfb \
        wget \
        ca-certificates \
        cabextract
    
    # Clean up
    rm -rf /var/lib/apt/lists/*
    
    echo "✅ Wine installed: $(wine64 --version 2>/dev/null || echo 'unknown')"
}

# ===================== إعداد Xvfb =====================
setup_xvfb() {
    echo ""
    echo "🖥️ Setting up Xvfb (Virtual Display)..."
    
    # Start Xvfb if not running
    if ! pgrep -x Xvfb > /dev/null; then
        Xvfb :99 -screen 0 800x600x16 -ac &
        export DISPLAY=:99
        echo "✅ Xvfb started on display :99"
    else
        echo "✅ Xvfb already running"
    fi
}

# ===================== إعداد Wine Prefix =====================
setup_wine_prefix() {
    echo ""
    echo "🍷 Setting up Wine prefix..."
    
    export WINEPREFIX="$WINE_PREFIX"
    export WINEDEBUG="-all"
    export DISPLAY=:99
    
    mkdir -p "$WINE_PREFIX"
    
    # Initialize Wine prefix (creates necessary directories)
    wineboot --init 2>/dev/null || true
    
    echo "✅ Wine prefix ready: $WINE_PREFIX"
}

# ===================== تحميل MT5 =====================
download_mt5() {
    echo ""
    echo "📥 Downloading MetaTrader 5..."
    
    mkdir -p "$MT5_BASE_DIR"
    local installer="/tmp/mt5setup.exe"
    
    if [ -f "$installer" ]; then
        echo "  Installer already exists, skipping download"
    else
        wget -q --show-progress -O "$installer" "$MT5_INSTALLER_URL"
    fi
    
    echo "✅ MT5 installer downloaded"
}

# ===================== تثبيت MT5 (Portable) =====================
install_mt5() {
    echo ""
    echo "⚙️ Installing MT5 in portable mode..."
    
    export WINEPREFIX="$WINE_PREFIX"
    export WINEDEBUG="-all"
    export DISPLAY=:99
    
    local installer="/tmp/mt5setup.exe"
    
    # Run installer silently
    # MT5 installer extracts to Program Files by default
    # We'll run it and then copy the files
    wine "$installer" /auto 2>/dev/null &
    local pid=$!
    
    echo "  Waiting for installation (up to 120 seconds)..."
    local waited=0
    while [ $waited -lt 120 ]; do
        sleep 5
        waited=$((waited + 5))
        
        # Check if terminal64.exe exists in the Wine prefix
        local mt5_path="$WINE_PREFIX/drive_c/Program Files/MetaTrader 5"
        if [ -f "$mt5_path/terminal64.exe" ]; then
            echo "  MT5 files found!"
            break
        fi
        echo "  Still installing... ($waited seconds)"
    done
    
    # Kill installer if still running
    kill $pid 2>/dev/null || true
    
    # Copy MT5 files to our base directory
    local mt5_path="$WINE_PREFIX/drive_c/Program Files/MetaTrader 5"
    if [ -f "$mt5_path/terminal64.exe" ]; then
        cp -r "$mt5_path"/* "$MT5_BASE_DIR/" 2>/dev/null || true
        echo "✅ MT5 installed to: $MT5_BASE_DIR"
    else
        echo "❌ MT5 installation failed - terminal64.exe not found"
        echo "   You can manually copy MT5 files to: $MT5_BASE_DIR"
        echo "   Required files: terminal64.exe and all DLLs"
        exit 1
    fi
}

# ===================== إنشاء المجلدات =====================
create_directories() {
    echo ""
    echo "📂 Creating directories..."
    
    mkdir -p "$MT5_BASE_DIR"
    mkdir -p "$MT5_INSTANCES_DIR"
    mkdir -p "$WINE_PREFIX"
    
    echo "  Base: $MT5_BASE_DIR"
    echo "  Instances: $MT5_INSTANCES_DIR"
    echo "  Wine: $WINE_PREFIX"
    echo "✅ Directories ready"
}

# ===================== التحقق =====================
verify_installation() {
    echo ""
    echo "🔍 Verifying installation..."
    
    local ok=true
    
    if command -v wine64 &> /dev/null; then
        echo "  ✅ Wine: $(wine64 --version 2>/dev/null)"
    else
        echo "  ❌ Wine not found"
        ok=false
    fi
    
    if command -v Xvfb &> /dev/null; then
        echo "  ✅ Xvfb available"
    else
        echo "  ❌ Xvfb not found"
        ok=false
    fi
    
    if [ -f "$MT5_BASE_DIR/terminal64.exe" ]; then
        echo "  ✅ MT5 terminal64.exe found"
        local size=$(du -sh "$MT5_BASE_DIR" | cut -f1)
        echo "  📊 MT5 base size: $size"
    else
        echo "  ❌ MT5 terminal64.exe NOT found"
        echo "     Copy MT5 files manually to: $MT5_BASE_DIR"
        ok=false
    fi
    
    if [ "$ok" = true ]; then
        echo ""
        echo "============================================"
        echo "  ✅ MT5 Setup Complete!"
        echo "============================================"
        echo ""
        echo "  Base dir:      $MT5_BASE_DIR"
        echo "  Instances dir: $MT5_INSTANCES_DIR"
        echo "  Wine prefix:   $WINE_PREFIX"
        echo ""
        echo "  Set these environment variables:"
        echo "    MT5_BASE_DIR=$MT5_BASE_DIR"
        echo "    MT5_INSTANCES_DIR=$MT5_INSTANCES_DIR"
        echo "    WINE_PREFIX=$WINE_PREFIX"
        echo "    DISPLAY=:99"
        echo ""
    else
        echo ""
        echo "⚠️ Setup incomplete - fix issues above"
    fi
}

# ===================== Main =====================
main() {
    create_directories
    install_wine
    setup_xvfb
    setup_wine_prefix
    download_mt5
    install_mt5
    verify_installation
}

# Run
main "$@"
