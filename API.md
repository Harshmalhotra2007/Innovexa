# Innovexa Ops Console — API Specification

Detailed REST & Real-Time API reference for the Innovexa Ops Console platform.

---

## 🔒 Authentication & RBAC Authorization

Innovexa uses role-based header authorization. Protected endpoints (such as `POST /api/ai-agent/join`, `DELETE /api/meetings/:id`, and `PATCH /api/tasks/:id/assign`) inspect the `x-user-role` header.

### Session & Password Security
- **Algorithm**: Web Crypto API SHA-256 password hashing.
- **Roles**:
  - `organizer`: Password `admin123` (SHA-256: `240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9`) — Full Edit, AI Agent Trigger, & SLA Admin access.
  - `participant`: Password `user123` (SHA-256: `e606e38b0d8c19b24cf0ee3808183162ea7cd63ff7912dbb22b5e803286b4446`) — Read-only access.
- **Session Persistence**: Client-side `sessionStorage` (`userRole`, `username`, `lastActivity`).
- **Session Timeout**: 15-minute inactivity session expiration enforced via `AuthGuard`.

---

## 🤖 AI Meeting Agent Endpoints

### 12. Trigger AI Meeting Agent (Organizer Only)
- **URL**: `/api/ai-agent/join`
- **Method**: `POST`
- **Headers**:
  - `x-user-role`: `organizer` (Required. Requests with other values return `403 Forbidden`).
  - `Content-Type`: `application/json`
- **Request Body**:
  ```json
  {
    "meetingId": "c4b3a210-9876-4321-8765-123456789abc",
    "apiKey": "optional-openai-key"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "id": "agent-uuid-1234",
    "meetingId": "c4b3a210-9876-4321-8765-123456789abc",
    "status": "joining",
    "joinedAt": "2026-08-24T19:20:00.000Z",
    "recordingUrl": "https://storage.innovexa.com/recordings/c4b3a210-9876-4321-8765-123456789abc.mp3",
    "transcript": null,
    "summary": null
  }
  ```

---

### 13. Get AI Agent Status
- **URL**: `/api/ai-agent/status/:meetingId`
- **Method**: `GET`
- **Response (200 OK)**:
  ```json
  {
    "id": "agent-uuid-1234",
    "meetingId": "c4b3a210-9876-4321-8765-123456789abc",
    "status": "completed",
    "recordingUrl": "https://storage.innovexa.com/recordings/c4b3a210-9876-4321-8765-123456789abc.mp3",
    "transcript": [
      {
        "speaker": "Dr. Vikram Seth",
        "text": "Welcome team. Let's initiate the AI Meeting Agent protocol.",
        "timestamp": "00:00:02"
      }
    ],
    "summary": "Executive AI Summary for 'Q3 Architecture Alignment': Adopted encrypted storage and SSE real-time streaming."
  }
  ```

---

### 14. Get AI Agent Transcript
- **URL**: `/api/ai-agent/:meetingId/transcript`
- **Method**: `GET`
- **Response (200 OK)**:
  ```json
  [
    {
      "speaker": "Dr. Vikram Seth",
      "text": "Welcome team. Let's initiate the AI Meeting Agent protocol.",
      "timestamp": "00:00:02"
    },
    {
      "speaker": "Alex Mercer",
      "text": "Audio streams are encrypted and processed via Whisper ASR.",
      "timestamp": "00:00:15"
    }
  ]
  ```

---

### 15. Real-Time Stream (Server-Sent Events)
- **URL**: `/api/ai-agent/:meetingId/updates`
- **Method**: `GET`
- **Headers**: `Accept: text/event-stream`
- **Stream Output**:
  ```http
  HTTP/1.1 200 OK
  Content-Type: text/event-stream
  Cache-Control: no-cache
  Connection: keep-alive

  data: {"meetingId":"c4b3a210","status":"recording"}

  data: {"meetingId":"c4b3a210","status":"transcribing","transcript":[{"speaker":"Alex Mercer","text":"Audio stream active."}]}
  ```

---

## 📡 Core Platform Endpoints

### 1. Ingest Meeting & Extract Action Items (`POST /api/meetings`)
### 2. Get All Meetings (`GET /api/meetings`)
### 3. Get Meeting Details (`GET /api/meetings/:id`)
### 4. Delete Meeting (`DELETE /api/meetings/:id`) [Organizer Only]
### 5. Fetch Task SLA Board (`GET /api/tasks`)
### 6. Update Task Status (`PATCH /api/tasks`)
### 7. Assign Task (`PATCH /api/tasks/:id/assign`) [Organizer Only]
### 8. Get Registered Directory (`GET /api/users`)
### 9. Get ROI Metrics (`GET /api/analytics`)
### 10. Semantic Search (`GET /api/search`)
### 11. Trigger SLA Escalation (`POST /api/cron/escalate`)
### 12. Upload Meeting Audio Recording (`POST /recordings/upload`) [Organizer Only]
- **Headers**:
  - `x-user-role`: `organizer`
- **Request (Multipart Form-Data)**:
  - `audio`: File (binary blob)
  - `meetingId`: String (UUID)
  - `duration`: String (optional, in seconds)
- **Request (JSON)**:
  ```json
  {
    "meetingId": "c4b3a210-9876-4321-8765-123456789abc",
    "audioBlob": "dGVzdC1hdWRpby1kYXRh...",
    "format": "audio/mp3",
    "duration": 30
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "id": "rec-uuid-123",
    "meetingId": "c4b3a210-9876-4321-8765-123456789abc",
    "url": "/recordings/c4b3a210/1787492.mp3",
    "duration": 30,
    "size": 128400,
    "format": "audio/mp3",
    "uploadedAt": "2026-08-24T19:25:00.000Z"
  }
  ```

### 13. Get Audio Recordings for Meeting (`GET /recordings/meeting/:meetingId`)
- **Response (200 OK)**:
  ```json
  [
    {
      "id": "rec-uuid-123",
      "meetingId": "c4b3a210-9876-4321-8765-123456789abc",
      "url": "/recordings/c4b3a210/1787492.mp3",
      "duration": 30,
      "size": 128400,
      "format": "audio/mp3",
      "uploadedAt": "2026-08-24T19:25:00.000Z"
    }
  ]
  ```

---

### 14. Trigger AI Agent Join (`POST /api/ai-agent/join`) [Organizer Only]
- **Headers**:
  - `x-user-role`: `organizer`
- **Request Body**:
  ```json
  {
    "meetingId": "c4b3a210-9876-4321-8765-123456789abc",
    "apiKey": "optional-gemini-or-openai-api-key"
  }
  ```
- **Response (210 Created / 201 Created)**:
  ```json
  {
    "id": "agent-uuid-123",
    "meetingId": "c4b3a210-9876-4321-8765-123456789abc",
    "status": "joining",
    "joinedAt": "2026-08-24T20:15:00.000Z",
    "recordingUrl": "https://storage.innovexa.com/recordings/c4b3a210-9876-4321-8765-123456789abc.mp3",
    "transcript": null,
    "summary": null,
    "createdAt": "2026-08-24T20:15:00.000Z",
    "updatedAt": "2026-08-24T20:15:00.000Z"
  }
  ```

### 15. Get AI Agent Status (`GET /api/ai-agent/status/:meetingId`)
- **Response (200 OK)**:
  ```json
  {
    "id": "agent-uuid-123",
    "meetingId": "c4b3a210-9876-4321-8765-123456789abc",
    "status": "completed",
    "joinedAt": "2026-08-24T20:15:00.000Z",
    "recordingUrl": "https://storage.innovexa.com/recordings/c4b3a210-9876-4321-8765-123456789abc.mp3",
    "transcript": [
      {
        "speaker": "Alice",
        "text": "Hello",
        "timestamp": "00:00:01"
      }
    ],
    "summary": "Sample executive summary...",
    "createdAt": "2026-08-24T20:15:00.000Z",
    "updatedAt": "2026-08-24T20:17:00.000Z"
  }
  ```

### 16. Get AI Agent Transcript (`GET /api/ai-agent/:meetingId/transcript`)
- **Response (200 OK)**:
  ```json
  [
    {
      "speaker": "Alice",
      "text": "Hello",
      "timestamp": "00:00:01"
    }
  ]
  ```

### 17. Real-Time Stream updates (`GET /api/ai-agent/:meetingId/updates`)
- **Type**: Server-Sent Events (`text/event-stream`)
- **Response (200 OK)**:
  ```text
  data: {"id":"agent-uuid-123","meetingId":"c4b3a210-9876-4321-8765-123456789abc","status":"recording",...}
  ```


