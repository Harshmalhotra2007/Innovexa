FROM node:20-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium

# Install system dependencies: Chromium browser, audio utilities, xvfb, and ffmpeg
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    pulseaudio \
    pulseaudio-utils \
    dbus-x11 \
    xvfb \
    alsa-utils \
    ffmpeg \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Setup entrypoint script
RUN chmod +x entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
