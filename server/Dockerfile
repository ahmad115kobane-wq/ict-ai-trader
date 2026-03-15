# ============================================================
# Stage 1: Install MT5 using Ubuntu with wine32 support
# ============================================================
FROM ubuntu:22.04 AS mt5-installer

ENV DEBIAN_FRONTEND=noninteractive

RUN dpkg --add-architecture i386 && \
    apt-get update && \
    apt-get install -y --no-install-recommends \
    wine wine32 wine64 xvfb wget ca-certificates && \
    rm -rf /var/lib/apt/lists/*

ENV WINEPREFIX=/root/.wine
ENV WINEDEBUG=-all
ENV DISPLAY=:99

RUN mkdir -p /opt/mt5/base && \
    Xvfb :99 -screen 0 800x600x16 -ac & \
    sleep 2 && \
    echo "=== Initializing Wine ===" && \
    wineboot --init 2>/dev/null; \
    sleep 5 && \
    echo "=== Downloading MT5 ===" && \
    wget -q -O /tmp/mt5setup.exe \
      "https://download.mql5.com/cdn/web/metaquotes.software.corp/mt5/mt5setup.exe" && \
    echo "=== Running MT5 installer ===" && \
    wine /tmp/mt5setup.exe /auto 2>/dev/null & \
    WAITED=0; \
    while [ $WAITED -lt 180 ]; do \
      sleep 10; \
      WAITED=$((WAITED + 10)); \
      echo "  Waiting... ${WAITED}s"; \
      if [ -f "/root/.wine/drive_c/Program Files/MetaTrader 5/terminal64.exe" ]; then \
        echo "  ✅ terminal64.exe found!"; \
        break; \
      fi; \
    done && \
    pkill -f mt5setup 2>/dev/null || true && \
    sleep 2 && \
    if [ -d "/root/.wine/drive_c/Program Files/MetaTrader 5" ]; then \
      cp -r "/root/.wine/drive_c/Program Files/MetaTrader 5"/* /opt/mt5/base/ && \
      echo "✅ MT5 copied to /opt/mt5/base/"; \
      ls -la /opt/mt5/base/terminal64.exe; \
    else \
      echo "❌ MT5 installation failed"; \
      find /root/.wine/drive_c -name "*.exe" 2>/dev/null | head -20; \
    fi && \
    pkill -f Xvfb 2>/dev/null || true && \
    rm -f /tmp/mt5setup.exe

# ============================================================
# Stage 2: Production image
# ============================================================
FROM node:20-slim

# 1) Install npm deps FIRST (before system packages that might conflict)
WORKDIR /app
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm ci --include=dev

# 2) Copy source code and build
COPY server/ ./
RUN npm run build
RUN chmod +x start.sh

# 3) Install system packages (Chromium, Xvfb) - with --no-install-recommends
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    chromium-sandbox \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libx11-6 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libxshmfence1 \
    xdg-utils \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

# 3b) Install Wine64 + all X11 libs Wine needs for its graphics driver (winex11.drv)
RUN apt-get update && apt-get install -y \
    wine64 \
    libwine \
    libxrender1 \
    libxcursor1 \
    libxi6 \
    libxinerama1 \
    libxxf86vm1 \
    libfreetype6 \
    libfontconfig1 \
    libgl1 \
    libglu1-mesa \
    libosmesa6 \
    && rm -rf /var/lib/apt/lists/* \
    && echo "=== Wine64 verification ===" \
    && which wine64 && wine64 --version \
    && echo "=== X11 driver check ===" \
    && find /usr -name "winex11*" 2>/dev/null | head -5 || echo "winex11 driver not found"

# 4) Copy MT5 base files from stage 1
COPY --from=mt5-installer /opt/mt5/base /opt/mt5/base
RUN mkdir -p /opt/mt5/instances /opt/mt5/wineprefix

# MT5 + Wine environment
ENV WINEPREFIX=/opt/mt5/wineprefix
ENV WINEDEBUG=-all
ENV DISPLAY=:99
ENV MT5_BASE_DIR=/opt/mt5/base
ENV MT5_INSTANCES_DIR=/opt/mt5/instances
ENV MT5_MAX_INSTANCES=20
ENV MT5_IDLE_TIMEOUT=3600000

# Set Puppeteer to use system Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Expose port
EXPOSE 3001

# Start via startup script (Xvfb + Node.js)
CMD ["bash", "start.sh"]
