# ============================================================
# Stage 1: Install MT5 using Ubuntu with Wine
# ============================================================
FROM ubuntu:22.04 AS mt5-installer

ENV DEBIAN_FRONTEND=noninteractive

RUN dpkg --add-architecture i386 && \
    apt-get update && \
    apt-get install -y wine wine32 wine64 xvfb wget ca-certificates && \
    rm -rf /var/lib/apt/lists/*

ENV WINEPREFIX=/opt/mt5/wineprefix
ENV WINEDEBUG=-all
ENV DISPLAY=:99

RUN mkdir -p /opt/mt5/base /opt/mt5/wineprefix && \
    Xvfb :99 -screen 0 800x600x16 -ac & \
    sleep 2 && \
    wineboot --init 2>/dev/null; \
    sleep 5 && \
    wget -q -O /tmp/mt5setup.exe \
      "https://download.mql5.com/cdn/web/metaquotes.software.corp/mt5/mt5setup.exe" && \
    wine /tmp/mt5setup.exe /auto 2>/dev/null & \
    WAITED=0; \
    while [ $WAITED -lt 180 ]; do \
      sleep 10; \
      WAITED=$((WAITED + 10)); \
      echo "  Waiting... ${WAITED}s"; \
      if [ -f "/opt/mt5/wineprefix/drive_c/Program Files/MetaTrader 5/terminal64.exe" ]; then \
        echo "  ✅ terminal64.exe found!"; \
        break; \
      fi; \
    done && \
    pkill -f mt5setup 2>/dev/null || true && \
    sleep 2 && \
    if [ -d "/opt/mt5/wineprefix/drive_c/Program Files/MetaTrader 5" ]; then \
      cp -r "/opt/mt5/wineprefix/drive_c/Program Files/MetaTrader 5"/* /opt/mt5/base/ && \
      echo "✅ MT5 copied to /opt/mt5/base/"; \
    else \
      echo "❌ MT5 installation failed"; \
    fi && \
    pkill -f Xvfb 2>/dev/null || true && \
    rm -f /tmp/mt5setup.exe

# ============================================================
# Stage 2: Ubuntu production image with Node.js + Wine
# ============================================================
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# 1) Install Node.js 20 from nodesource
RUN apt-get update && \
    apt-get install -y curl ca-certificates gnupg && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# 2) Install Wine, Xvfb, Chromium and dependencies
RUN dpkg --add-architecture i386 && \
    apt-get update && \
    apt-get install -y \
    wine wine32 wine64 \
    xvfb \
    chromium-browser \
    fonts-liberation \
    wget \
    && rm -rf /var/lib/apt/lists/*

# 3) Copy MT5 base files from stage 1 (NOT the wine prefix - it must match stage 2 Wine)
COPY --from=mt5-installer /opt/mt5/base /opt/mt5/base
RUN mkdir -p /opt/mt5/instances /opt/mt5/wineprefix

# MT5 + Wine environment
ENV WINEPREFIX=/opt/mt5/wineprefix
ENV WINEARCH=win64
ENV WINEDEBUG=-all
ENV DISPLAY=:99
ENV MT5_BASE_DIR=/opt/mt5/base
ENV MT5_INSTANCES_DIR=/opt/mt5/instances
ENV MT5_MAX_INSTANCES=20
ENV MT5_IDLE_TIMEOUT=3600000

# 3b) Initialize Wine prefix at build time + verify X11 works
RUN echo "=== Initializing Wine prefix ===" && \
    Xvfb :99 -screen 0 1024x768x24 -ac &  \
    sleep 2 && \
    WINEDEBUG=-all wineboot --init 2>/dev/null || true && \
    sleep 5 && \
    echo "=== Verifying Wine X11 ===" && \
    WINEDEBUG=+err wine cmd /c "echo Wine_X11_OK" 2>&1 | tail -5 && \
    echo "=== Wine X11 driver check ===" && \
    find /usr -name "winex11*" -type f 2>/dev/null | head -5 && \
    echo "=== Wine prefix files ===" && \
    ls -la /opt/mt5/wineprefix/*.reg 2>/dev/null | head -5 && \
    pkill -f Xvfb 2>/dev/null || true && \
    echo "=== Wine prefix initialized ==="

# Set Puppeteer to use Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# 4) Install app dependencies
WORKDIR /app
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm ci --include=dev

# 5) Copy source code and build
COPY server/ ./
RUN npm run build
RUN chmod +x start.sh

# Expose port
EXPOSE 3001

# Start via startup script (Xvfb + Node.js)
CMD ["bash", "start.sh"]
