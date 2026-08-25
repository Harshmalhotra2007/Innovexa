FROM mcr.microsoft.com/playwright/node:v1.44.0-jammy

ENV DEBIAN_FRONTEND=noninteractive

# Install audio utilities, xvfb, and ffmpeg
RUN apt-get update && apt-get install -y --no-install-recommends \
    pulseaudio \
    pulseaudio-utils \
    dbus-x11 \
    xvfb \
    alsa-utils \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Setup entrypoint script
RUN chmod +x entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
