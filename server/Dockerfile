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

# Initialize Wine prefix (headless)
ENV WINEPREFIX=/opt/mt5/wineprefix
ENV WINEDEBUG=-all
ENV DISPLAY=:99

# MT5 environment variables
ENV MT5_BASE_DIR=/opt/mt5/base
ENV MT5_INSTANCES_DIR=/opt/mt5/instances
ENV MT5_MAX_INSTANCES=20
ENV MT5_IDLE_TIMEOUT=3600000

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
