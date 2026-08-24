# Innovexa Ops Console — Changelog

All notable changes to the Innovexa Ops Console platform are documented in this file.

---

## [2.0.0] - 2026-08-24

### Changed
- Rebranded from Innovexa to Innovexa across all code and documentation.

### Added
- **Meeting Audio Recording**: Browser-based recording using the MediaRecorder API, with pause/resume support, live duration timers, and a visual pulsing waveform container.
- **Audio Upload Queue**: Support drag-and-drop file ingestion, local file selections, and a cyberpunk upload progress bar.
- **AWS S3 / Supabase Integration**: Multi-provider storage client logic with local disk fallback options.
- **Custom Playback Player**: Glowing border media controls and recording metadata displays.
- **Client-side Downsampling**: Audio downsampler/compressor reducing file sizes by ≥30% prior to uploading.
- **Prisma Schema Update**: Created `Recording` PostgreSQL model with cascade-on-delete indexing.

## [v1.3.0] — 2026-08-24 (AI Agent Release)

### 🤖 AI Meeting Agent
- **`AIAgent` Prisma Model**: Added 1-to-1 database relation to `Meeting` tracking agent status (`idle`, `joining`, `recording`, `transcribing`, `summarizing`, `completed`), `recordingUrl`, `transcript` JSON, and `summary`.
- **AI Agent API Routes**:
  - `POST /api/ai-agent/join`: Triggers virtual participant to join meeting room (`organizer` role required).
  - `GET /api/ai-agent/status/:meetingId`: Returns agent status and summary.
  - `GET /api/ai-agent/:meetingId/transcript`: Returns diarized transcript array.
  - `GET /api/ai-agent/:meetingId/updates`: Server-Sent Events (SSE) `text/event-stream` for real-time live captions.
- **Cyberpunk Purple Console UI (`<AIAgentPanel>`)**: `#1A1A2E` dark theme with neon cyan (`#00FFFF`), neon purple (`#B026FF`), pulsing recording indicators (`#FF00AA`), live stream caption feed, and privacy disclaimer banner.
- **Automated Test Suite**: Added `AI Agent Endpoints & Security` unit tests (`tests/api.test.ts`) covering joining, status transitions, role authorization gates, and transcript parsing.

---

## [v1.2.0] — 2026-08-23

### 🚀 Added
- **PostgreSQL Migration**: Production PostgreSQL schema with native enums (`Role`, `TaskStatus`, `TaskPriority`), `String[]` tags, and composite B-Tree indexes.
- **Meeting Deletion API (`DELETE /api/meetings/:id`)**: Cascading deletion of meetings, segments, decisions, and tasks.
- **Task Assignment Dropdown (`PATCH /api/tasks/:id/assign`)**: Assign tasks to registered team members.
- **SHA-256 Web Crypto Authentication (`/login`)**: Client-side password hashing and 15-minute inactivity session guard.
