# Innovexa Ops Console — Complete API Specification

Comprehensive REST, Real-Time (SSE/WebSocket), and Webhook API reference for the **Innovexa** Meeting Intelligence & SLA Governance Platform.

---

## 🔒 Authentication & Role-Based Access Control (RBAC)

Innovexa enforces role-based access control across sensitive endpoints via the `x-user-role` header or session tokens.

### Roles & Permissions Matrix
| Role | Capabilities | Protected Endpoints Allowed |
|---|---|---|
| `organizer` | Full admin privileges: schedule meetings, trigger AI bot joins, delete records, reassign tasks, trigger manual SLA audits & emails. | All platform routes |
| `participant` | Read-only access: view meeting transcripts, action items, task review boards, search knowledge base. | Read endpoints only |

### Default Credentials (SHA-256 Hashed via Web Crypto API)
- **Organizer**: `admin123` (Hash: `240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9`)
- **Participant**: `user123` (Hash: `e606e38b0d8c19b24cf0ee3808183162ea7cd63ff7912dbb22b5e803286b4446`)

---

## Table of Contents
1. [Meetings Management API](#1-meetings-management-api)
2. [LiveKit WebRTC & Live Audio Streaming API](#2-livekit-webrtc--live-audio-streaming-api)
3. [AI Meeting Agent API](#3-ai-meeting-agent-api)
4. [Tasks & SLA Governance API](#4-tasks--sla-governance-api)
5. [Notifications & Alerting API](#5-notifications--alerting-api)
6. [Decisions, Citations & Contradictions API](#6-decisions-citations--contradictions-api)
7. [Knowledge Base, Search & RAG Q&A API](#7-knowledge-base-search--rag-qa-api)
8. [Analytics & Directory API](#8-analytics--directory-api)
9. [Automated Cron Jobs](#9-automated-cron-jobs)
10. [Webhooks API](#10-webhooks-api)

---

## 1. Meetings Management API

### 1.1 Ingest & Create Meeting
- **Route**: `POST /api/meetings`
- **Description**: Creates a new meeting record, persists discussion segments, generates decisions, and creates action items.
- **Request Body**:
  ```json
  {
    "title": "Q3 Architecture Alignment",
    "date": "2026-08-29T10:00:00.000Z",
    "department": "Engineering",
    "meetUrl": "https://meet.google.com/abc-defg-hij",
    "segments": [
      {
        "speaker": "Dr. Vikram Seth",
        "text": "We need to deploy automated SLA escalation rules by Friday.",
        "startTime": 12.5,
        "endTime": 18.0,
        "order": 1
      }
    ]
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "id": "cm0a1b2c3d4e5f6g7h8i9j0k",
    "title": "Q3 Architecture Alignment",
    "date": "2026-08-29T10:00:00.000Z",
    "department": "Engineering",
    "status": "Scheduled"
  }
  ```

### 1.2 List All Meetings
- **Route**: `GET /api/meetings`
- **Query Parameters**:
  - `department` *(optional)*: Filter by department string.
  - `status` *(optional)*: Filter by `Scheduled`, `Live`, `Completed`.
- **Response (200 OK)**:
  ```json
  [
    {
      "id": "cm0a1b2c3d4e5f6g7h8i9j0k",
      "title": "Q3 Architecture Alignment",
      "date": "2026-08-29T10:00:00.000Z",
      "department": "Engineering",
      "status": "Completed",
      "tasks": [{ "id": "task-1", "title": "Deploy SLA rules", "status": "Pending" }],
      "decisions": [{ "id": "dec-1", "decision": "Adopt Next.js 16" }]
    }
  ]
  ```

### 1.3 Get Meeting Details
- **Route**: `GET /api/meetings/:id`
- **Response (200 OK)**: Full meeting object including segments, decisions, tasks, action items, and recording metadata.

### 1.4 Delete Meeting (Organizer Only)
- **Route**: `DELETE /api/meetings/:id`
- **Headers**: `x-user-role: organizer`
- **Response (200 OK)**:
  ```json
  { "message": "Meeting deleted successfully" }
  ```

### 1.5 Schedule Meeting with Conflict Resolution
- **Route**: `POST /api/meetings/schedule`
- **Request Body**:
  ```json
  {
    "title": "Security Review",
    "date": "2026-08-30",
    "time": "14:00",
    "duration": 45,
    "department": "Security",
    "participants": ["sec-lead@innovexa.com"]
  }
  ```
- **Response (200 OK / 409 Conflict)**: Returns confirmed schedule slot or conflicting slot alternatives.

### 1.6 Query Available Calendar Slots
- **Route**: `GET /api/meetings/available-slots?date=2026-08-30`
- **Response (200 OK)**:
  ```json
  {
    "date": "2026-08-30",
    "availableSlots": ["09:00", "10:30", "14:00", "16:00"]
  }
  ```

### 1.7 Extract Action Items with LLM
- **Route**: `POST /api/meetings/:id/extract-action-items`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "extractedCount": 3,
    "tasks": [
      {
        "id": "task-abc-123",
        "title": "Migrate DB connection pool to serverless",
        "ownerName": "Alex Mercer",
        "priority": "High",
        "deadline": "2026-09-02T00:00:00.000Z"
      }
    ]
  }
  ```

### 1.8 Dispatch Meeting Invites
- **Route**: `POST /api/meetings/:id/invite`
- **Request Body**:
  ```json
  {
    "emails": ["engineer@innovexa.com"],
    "role": "participant"
  }
  ```
- **Response (200 OK)**:
  ```json
  { "success": true, "sentCount": 1, "recipients": ["engineer@innovexa.com"] }
  ```

---

## 2. LiveKit WebRTC & Live Audio Streaming API

### 2.1 Generate LiveKit Access Token
- **Route**: `GET /api/livekit/token`
- **Query Parameters**:
  - `room` *(required)*: Target LiveKit room name.
  - `username` *(optional)*: Participant display name.
- **Response (200 OK)**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "wsUrl": "wss://innovexa-livekit.example.com"
  }
  ```

### 2.2 LiveKit Room Management
- **Route**: `POST /api/livekit/room`
- **Description**: Creates or manages active room session state.

### 2.3 Live Whisper Speech-to-Text Transcription
- **Route**: `POST /api/whisper/transcribe`
- **Headers**: `Content-Type: multipart/form-data`
- **Form Data**:
  - `file`: Audio WebM / WAV blob
  - `language`: `en` *(default)*
  - `prompt`: Optional meeting domain vocabulary hints
- **Response (200 OK)**:
  ```json
  {
    "text": "We are locking the Q3 release schedule today.",
    "duration": 4.12,
    "language": "en"
  }
  ```

### 2.4 Live Audio Stream Chunk Ingestion
- **Route**: `POST /api/recordings/stream-chunk`
- **Headers**: `Content-Type: multipart/form-data`
- **Form Data**: `audio` blob, `meetingId`, `chunkIndex`, `isFinal`
- **Response (200 OK)**: Returns incremental transcription slice and speaker label.

### 2.5 Audio Recording Upload
- **Route**: `POST /api/recordings/upload`
- **Headers**: `x-user-role: organizer`
- **Request**: Multipart `audio` binary blob with `meetingId` and `duration`.
- **Response (201 Created)**: Returns uploaded recording ID and CDN/S3 URL.

---

## 3. AI Meeting Agent API

### 3.1 Dispatch AI Meeting Agent
- **Route**: `POST /api/ai-agent/join`
- **Headers**: `x-user-role: organizer`
- **Request Body**:
  ```json
  {
    "meetingId": "cm0a1b2c3d4e5f6g7h8i9j0k",
    "apiKey": "optional-groq-or-openai-key"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "id": "agent-uuid-1234",
    "meetingId": "cm0a1b2c3d4e5f6g7h8i9j0k",
    "status": "joining",
    "joinedAt": "2026-08-29T10:00:00.000Z"
  }
  ```

### 3.2 AI Agent Status & Summary
- **Route**: `GET /api/ai-agent/status/:meetingId`
- **Response (200 OK)**:
  ```json
  {
    "id": "agent-uuid-1234",
    "meetingId": "cm0a1b2c3d4e5f6g7h8i9j0k",
    "status": "completed",
    "transcript": [
      { "speaker": "Dr. Vikram Seth", "text": "Initiating meeting protocol.", "timestamp": "00:00:02" }
    ],
    "summary": "Executive summary: Agreed to establish automated 24-hour SLA escalation thresholds."
  }
  ```

### 3.3 Server-Sent Events (SSE) Live Stream
- **Route**: `GET /api/ai-agent/:meetingId/updates`
- **Headers**: `Accept: text/event-stream`
- **Event Stream Output**:
  ```text
  data: {"id":"agent-123","status":"recording","liveSpeaker":"Alex Mercer","chunkText":"Deploying update..."}
  ```

### 3.4 Disconnect AI Agent
- **Route**: `POST /api/ai-agent/leave`
- **Request Body**: `{ "meetingId": "cm0a1b2c3d4e5f6g7h8i9j0k" }`
- **Response (200 OK)**: `{ "success": true, "status": "completed" }`

---

## 4. Tasks & SLA Governance API

### 4.1 Fetch SLA Task Action Board
- **Route**: `GET /api/tasks`
- **Query Parameters**:
  - `department` *(optional)*: `Engineering`, `Operations`, `Security`, `Product`, `Executive`.
  - `status` *(optional)*: `Pending`, `In Progress`, `Completed`, `Overdue`, `Escalated`.
  - `cursor` *(optional)*: Pagination cursor.
  - `limit` *(optional)*: Default `50`.
- **Response (200 OK)**:
  ```json
  [
    {
      "id": "task-123",
      "title": "Configure automated SLA reminder loop",
      "ownerName": "Alex Mercer",
      "department": "Engineering",
      "priority": "High",
      "status": "In Progress",
      "deadline": "2026-08-31T18:00:00.000Z",
      "escalationLevel": 0,
      "meeting": { "id": "m-1", "title": "Sprint Planning" }
    }
  ]
  ```

### 4.2 Create Task
- **Route**: `POST /api/tasks`
- **Request Body**:
  ```json
  {
    "title": "Review firewall rules",
    "ownerName": "Security Lead",
    "department": "Security",
    "priority": "High",
    "deadline": "2026-08-31T00:00:00.000Z"
  }
  ```
- **Response (200 OK)**: Returns created task object and enqueues SLA tracking.

### 4.3 Update Task Status / Priority / Deadline
- **Route**: `PATCH /api/tasks`
- **Request Body**:
  ```json
  {
    "taskId": "task-123",
    "status": "Completed"
  }
  ```
- **Response (200 OK)**: Returns updated task record.

### 4.4 Reassign Task (Organizer Only)
- **Route**: `PATCH /api/tasks/:id/assign`
- **Headers**: `x-user-role: organizer`
- **Request Body**:
  ```json
  {
    "assignee": "Sarah Connor",
    "assigneeId": "user-uuid-456"
  }
  ```
- **Response (200 OK)**: `{ "id": "task-123", "ownerName": "Sarah Connor" }`

### 4.5 Dispatch SLA Alert Email (Manual / Triggered)
- **Route**: `POST /api/tasks/send-sla-email`
- **Request Body**:
  ```json
  {
    "taskId": "task-123"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "recipient": "alexmercer@innovexa.com",
    "alertType": "DEADLINE_APPROACHING",
    "messageId": "msg_172498234_abc"
  }
  ```

### 4.6 Delete Task
- **Route**: `DELETE /api/tasks?taskId=task-123`
- **Response (200 OK)**: `{ "success": true, "message": "Task deleted successfully" }`

---

## 5. Notifications & Alerting API

### 5.1 List Notifications & Audit Logs
- **Route**: `GET /api/notifications`
- **Query Parameters**:
  - `unreadOnly` *(optional)*: `true` / `false`
  - `limit` *(optional)*: Default `20`
- **Response (200 OK)**:
  ```json
  {
    "notifications": [
      {
        "id": "notif-1",
        "recipient": "dev@innovexa.com",
        "type": "Escalation",
        "subject": "⚠️ SLA Escalation: Task Overdue > 24 Hours",
        "body": "Task 'Deploy AI Engine' has exceeded the resolution threshold.",
        "read": false,
        "sentAt": "2026-08-29T18:30:00.000Z",
        "taskId": "task-123"
      }
    ],
    "unreadCount": 1
  }
  ```

### 5.2 Mark Notification as Read
- **Route**: `PATCH /api/notifications`
- **Request Body**:
  - Single: `{ "notificationId": "notif-1" }`
  - All: `{ "markAllRead": true }`
- **Response (200 OK)**: `{ "success": true }`

---

## 6. Decisions, Citations & Contradictions API

### 6.1 Decisions Log
- **Route**: `GET /api/decisions?department=Engineering`
- **Response (200 OK)**: Returns list of ratified decisions, rationales, and approving stakeholders.

### 6.2 AI Citations with Source Timecodes
- **Route**: `GET /api/citations?meetingId=cm0a1b2c3d4e5f6g7h8i9j0k`
- **Response (200 OK)**:
  ```json
  [
    {
      "claim": "Agreed on AES-256 for audio storage",
      "speaker": "Security Lead",
      "timestamp": "00:14:32",
      "confidence": 0.96
    }
  ]
  ```

### 6.3 Cross-Meeting Contradiction Detector
- **Route**: `GET /api/contradictions`
- **Response (200 OK)**: Highlights conflicting decisions or inconsistent deadlines detected across historical meetings.

---

## 7. Knowledge Base, Search & RAG Q&A API

### 7.1 Semantic Search
- **Route**: `GET /api/search?q=security+architecture&department=Security&limit=6`
- **Response (200 OK)**:
  ```json
  {
    "query": "security architecture",
    "count": 3,
    "results": [
      {
        "id": "seg-1",
        "meetingId": "m-1",
        "meetingTitle": "Security Architecture Sync",
        "speaker": "Alex Mercer",
        "text": "All meeting audio blobs are encrypted with AES-256 before storage.",
        "date": "2026-08-28T14:00:00.000Z",
        "similarityScore": 0.94
      }
    ]
  }
  ```

### 7.2 RAG Knowledge Q&A Synthesis
- **Route**: `POST /api/search/qa`
- **Request Body**:
  ```json
  {
    "question": "What is our policy on audio recording encryption?",
    "department": "Security"
  }
  ```
- **Response (200 OK)**: Returns AI synthesized answer accompanied by verbatim meeting citation segments.

### 7.3 Topic Clustering Intelligence
- **Route**: `GET /api/topic-clusters`
- **Response (200 OK)**: Returns recurring organizational discussion clusters and trend velocity.

---

## 8. Analytics & Directory API

### 8.1 Executive ROI & SLA Metrics
- **Route**: `GET /api/analytics`
- **Response (200 OK)**:
  ```json
  {
    "totalMeetings": 48,
    "totalHoursSaved": 142.5,
    "actionItemCompletionRate": 92.4,
    "slaCompliancePct": 98.1,
    "escalatedTasksCount": 2,
    "departmentBreakdown": { "Engineering": 24, "Security": 12, "Operations": 12 }
  }
  ```

### 8.2 User Directory
- **Route**: `GET /api/users`
- **Response (200 OK)**: Returns directory list of registered organization members and assigned roles.

---

## 9. Automated Cron Jobs

All cron endpoints require standard Vercel `CRON_SECRET` authorization via `Authorization: Bearer <CRON_SECRET>` or query parameter.

### 9.1 SLA Monitor & Deadline Escalation Cycle
- **Route**: `GET /api/cron/sla-monitor`
- **Vercel Schedule**: `0 0 * * *` *(Midnight UTC)*
- **Operations**:
  1. Identifies tasks due in < 24h → Dispatches `DEADLINE_APPROACHING` alerts.
  2. Identifies overdue tasks → Triggers Level 1 escalation notifications.
  3. Identifies tasks overdue > 24h → Triggers Level 2 manager escalation.
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "summary": {
      "approachingCount": 4,
      "overdueCount": 1,
      "escalatedCount": 1,
      "notificationsCreated": 6,
      "emailsSent": 6,
      "durationMs": 142
    }
  }
  ```

### 9.2 Meeting Scheduler Auto-Dispatcher
- **Route**: `GET /api/cron/meeting-scheduler`
- **Vercel Schedule**: `0 12 * * *` *(Noon UTC)*
- **Description**: Evaluates upcoming calendar meetings and dispatches automated prep briefings.

---

## 10. Webhooks API

### 10.1 LiveKit Webhook Receiver
- **Route**: `POST /api/webhooks/livekit`
- **Description**: Receives room events (`room_started`, `participant_joined`, `egress_ended`).

### 10.2 Recording Complete Webhook
- **Route**: `POST /api/webhooks/recording-complete`
- **Description**: Triggers automated downstream ASR transcription and LLM summary pipeline upon media file write completion.

### 10.3 n8n Calendar Webhook
- **Route**: `POST /api/webhooks/n8n-calendar`
- **Description**: Receives automated calendar synchronization events from external n8n workflows.

---

*Last Updated: August 2026 | Innovexa Engineering Division*
