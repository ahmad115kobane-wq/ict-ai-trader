# Use official Node.js image
FROM node:20-slim

# Install Chromium, Wine, Xvfb, 7zip and dependencies
RUN dpkg --add-architecture i386 && \
    apt-get update && apt-get install -y \
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
    wine \
    wine64 \
    wine32 \
    xvfb \
    wget \
    ca-certificates \
    p7zip-full \
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

# Download MT5 and extract with 7z (NSIS installer extraction - no Wine needed at build)
RUN wget -q -O /tmp/mt5setup.exe "https://download.mql5.com/cdn/web/metaquotes.software.corp/mt5/mt5setup.exe" && \
    echo "=== Extracting MT5 installer with 7z ===" && \
    mkdir -p /tmp/mt5extract && \
    7z x /tmp/mt5setup.exe -o/tmp/mt5extract -y > /dev/null 2>&1 || true && \
    echo "=== Contents of extracted archive ===" && \
    find /tmp/mt5extract -maxdepth 3 -type f | head -30 && \
    echo "=== Looking for terminal64.exe ===" && \
    TERM_FILE=$(find /tmp/mt5extract -name "terminal64.exe" -type f 2>/dev/null | head -1) && \
    if [ -n "$TERM_FILE" ]; then \
      TERM_DIR=$(dirname "$TERM_FILE") && \
      cp -r "$TERM_DIR"/* /opt/mt5/base/ 2>/dev/null || true && \
      echo "✅ MT5 extracted via 7z to /opt/mt5/base/"; \
    else \
      echo "⚠️ 7z extraction: terminal64.exe not in top level, searching deeper..." && \
      find /tmp/mt5extract -name "*.exe" -type f 2>/dev/null | head -20 && \
      cp -r /tmp/mt5extract/* /opt/mt5/base/ 2>/dev/null || true && \
      echo "Copied all extracted files to /opt/mt5/base/"; \
    fi && \
    ls -la /opt/mt5/base/ | head -20 && \
    rm -rf /tmp/mt5setup.exe /tmp/mt5extract && \
    echo "=== MT5 base dir final contents ===" && \
    ls /opt/mt5/base/ 2>/dev/null | head -20

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
