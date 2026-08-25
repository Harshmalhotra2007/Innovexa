#!/bin/bash
set -e

# Remove any stale lock files from previous runs
rm -f /tmp/.X99-lock /tmp/.X11-unix/X99

echo "[Entrypoint] Starting Xvfb on display :99..."
Xvfb :99 -screen 0 1280x720x24 -ac +extension GLX +render -noreset &
export DISPLAY=:99

echo "[Entrypoint] Starting D-Bus session..."
eval $(dbus-launch --sh-syntax)

echo "[Entrypoint] Starting PulseAudio daemon..."
mkdir -p /root/.config/pulse
mkdir -p /var/run/pulse
echo "default-server = unix:/tmp/pulse-socket/pulse-socket" > /root/.config/pulse/client.conf

# Start PulseAudio in system mode inside Docker container
pulseaudio -D --exit-idle-time=-1 --system --disallow-exit --disallow-module-loading=0 || pulseaudio --start --exit-idle-time=-1 || true

# Wait for PulseAudio server to load
sleep 2

echo "[Entrypoint] Creating virtual null-sink MeetSink..."
pactl load-module module-null-sink sink_name=MeetSink sink_properties=device.description=MeetSink || true
pactl set-default-sink MeetSink || true

echo "[Entrypoint] Exporting PulseAudio environment variables..."
export PULSE_SERVER="unix:/tmp/pulse-socket/pulse-socket"
export PULSE_SINK="MeetSink"

echo "[Entrypoint] System Audio Configuration Status:"
pactl info || echo "[Entrypoint] PulseAudio ready."

echo "[Entrypoint] Starting Node server..."
exec node server.js
