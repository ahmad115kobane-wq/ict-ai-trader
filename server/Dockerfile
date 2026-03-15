# Use official Node.js image
FROM node:20-slim

# Install Chromium, Wine, Xvfb and dependencies
RUN apt-get update && apt-get install -y \
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
    wine64 \
    xvfb \
    wget \
    ca-certificates \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Create MT5 directories
RUN mkdir -p /opt/mt5/base /opt/mt5/instances /opt/mt5/wineprefix

# MT5 + Wine environment
ENV WINEPREFIX=/opt/mt5/wineprefix
ENV WINEDEBUG=-all
ENV DISPLAY=:99
ENV MT5_BASE_DIR=/opt/mt5/base
ENV MT5_INSTANCES_DIR=/opt/mt5/instances
ENV MT5_MAX_INSTANCES=20
ENV MT5_IDLE_TIMEOUT=3600000

# Download and install MT5 via Wine during build
RUN Xvfb :99 -screen 0 800x600x16 -ac & \
    sleep 2 && \
    wineboot --init 2>/dev/null && \
    sleep 3 && \
    wget -q -O /tmp/mt5setup.exe "https://download.mql5.com/cdn/web/metaquotes.software.corp/mt5/mt5setup.exe" && \
    echo "Running MT5 installer..." && \
    timeout 180 wine /tmp/mt5setup.exe /auto 2>/dev/null & \
    MT5_PID=$! && \
    WAITED=0 && \
    while [ $WAITED -lt 150 ]; do \
      sleep 10; \
      WAITED=$((WAITED + 10)); \
      echo "  Waiting for MT5 install... ${WAITED}s"; \
      if [ -f "$WINEPREFIX/drive_c/Program Files/MetaTrader 5/terminal64.exe" ]; then \
        echo "  MT5 files found!"; \
        break; \
      fi; \
    done && \
    kill $MT5_PID 2>/dev/null || true && \
    sleep 2 && \
    if [ -d "$WINEPREFIX/drive_c/Program Files/MetaTrader 5" ]; then \
      cp -r "$WINEPREFIX/drive_c/Program Files/MetaTrader 5"/* /opt/mt5/base/ 2>/dev/null || true; \
      echo "✅ MT5 installed to /opt/mt5/base/"; \
      ls -la /opt/mt5/base/terminal64.exe 2>/dev/null || echo "⚠️ terminal64.exe not found"; \
    else \
      echo "⚠️ MT5 auto-install incomplete - manual setup may be needed"; \
    fi && \
    pkill -f Xvfb 2>/dev/null || true && \
    rm -f /tmp/mt5setup.exe

# Set working directory
WORKDIR /app

# Copy package files
COPY server/package*.json ./server/

# Install dependencies
WORKDIR /app/server
RUN npm ci --include=dev

# Copy source code
COPY server/ ./

# Build TypeScript
RUN npm run build

# Set Puppeteer to use system Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Expose port
EXPOSE 3001

# Start Xvfb + server
CMD Xvfb :99 -screen 0 800x600x16 -ac & sleep 1 && node dist/index.js
