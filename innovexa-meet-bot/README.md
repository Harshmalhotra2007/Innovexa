# Innovexa Google Meet Bot Service

A headless (container-virtualized) Google Meet assistant that autonomously joins Google Meet sessions, broadcasts a consent disclaimer message, captures call audio via PulseAudio null-sink loopback to 16kHz mono WAV, and triggers the downstream n8n analysis pipeline.

---

## 🚀 How to Run Locally

### Prerequisites
- Docker & Docker Compose
- Environment file `.env` containing your database and pipeline credentials.

### Starting the Service
Run the service using the provided Compose file:
```bash
docker-compose up --build -d
```
The service will boot:
1. An isolated Xvfb display (`:99`) inside the container.
2. A DBus session.
3. A PulseAudio daemon mapping a `module-null-sink` (`MeetSink`).
4. The Node.js meeting bot service listening on port `3000`.

### Triggering the Bot (REST API)
To instruct the bot to join a meeting session manually, dispatch a HTTP POST request:
```bash
curl -X POST http://localhost:3000/bot/join \
  -H "Content-Type: application/json" \
  -d '{
    "meetingUrl": "https://meet.google.com/abc-defg-hij",
    "botName": "Innovexa Notetaker",
    "metadata": {
      "meetingTitle": "Architecture Sync"
    }
  }'
```

---

## 🔄 Integration with n8n / Whisper Pipeline

1. **Webhook Trigger**: Upon completion of a meeting call, the recorded audio is handed off via a Multipart POST request to the configured `N8N_WEBHOOK_URL` (defaults to `http://n8n:5678/webhook/innovexa-meeting`).
2. **Metadata Payload**: The handoff contains the binary audio stream and a `metadata` JSON field mapping the session context:
   ```json
   {
     "meetingUrl": "https://meet.google.com/abc-defg-hij",
     "meetingTitle": "Architecture Sync",
     "startTime": "2026-08-25T14:40:00.000Z",
     "botName": "Innovexa Notetaker"
   }
   ```
3. **n8n Workflow Execution**: n8n parses the incoming request, stores the WAV file on disk/S3, and calls Whisper (transcription) → pyannote (diarization) → LLM decision extractor.

---

## ⚠️ Known Limitations & Anti-Automation Mitigations

- **Google Meet DOM Updates**: Google Meet updates its selectors frequently. To prevent breakage, selectors are text-content based (e.g. `button:has-text("Ask to join")`) rather than static CSS classes.
- **Host Admittance**: The bot must be manually admitted by the call host. The script incorporates a 5-minute timeout; if admittance is not granted, the bot exits gracefully to release container resources.
- **Google Account Authentication**: If Google Meet requires sign-in, provide `GOOGLE_EMAIL` and `GOOGLE_PASSWORD` env parameters to trigger the automated OAuth login flow.

---

## ⚖️ Hackathon Trade-Offs (Divergence from Production-Grade)

For the hackathon judges, flag these items as intentional design trade-offs:
1. **Single Mixed Audio Capture**: The PulseAudio setup records the mixed output stream. In high-scale production, capturing per-participant audio (e.g., via a WebRTC media server bridge or Chrome extension API) avoids pyannote diarization noise, but this PulseAudio null-sink approach was selected because it is 100% self-hosted, robust, and took hours instead of weeks.
2. **Guest Admittance Wait**: The bot relies on the host clicking "Admit". In a production environment, calendar integrations should be set up so the bot joins as an authenticated organizational user, allowing it to bypass the lobby automatically.
3. **No Dynamic CAPTCHA Solver**: If Google flags the login attempt as suspicious, it may trigger a CAPTCHA. In production, persistent browser profiles/session caching (`playwright` user data dirs) must be used to keep cookies fresh and minimize auth friction.
