# Innovexa Ops Console — API Specification

Detailed REST API reference for the Innovexa Ops Console platform.

---

## 🔒 Authentication & RBAC Authorization

Innovexa uses role-based header authorization. Protected endpoints (such as `DELETE /api/meetings/:id` and `PATCH /api/tasks/:id/assign`) inspect the `x-user-role` header.

### Session & Password Security
- **Algorithm**: Web Crypto API SHA-256 password hashing.
- **Roles**:
  - `organizer`: Password `admin123` (SHA-256: `240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9`) — Full Edit & SLA Admin access.
  - `participant`: Password `user123` (SHA-256: `e606e38b0d8c19b24cf0ee3808183162ea7cd63ff7912dbb22b5e803286b4446`) — Read-only access.
- **Session Persistence**: Client-side `sessionStorage` (`userRole`, `username`, `lastActivity`).
- **Session Timeout**: 15-minute inactivity session expiration enforced via `AuthGuard`.

---

## ⚡ Rate Limiting & Common Headers

- **Rate Limit**: 100 requests per minute per IP address.
- **Content-Type**: `application/json`
- **RBAC Header**: `x-user-role: organizer | participant`

---

## 📡 API Endpoints

### 1. Ingest Meeting & Extract Action Items
- **URL**: `/api/meetings`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "title": "Q3 Infrastructure & Security Alignment",
    "department": "Engineering",
    "agenda": "Review database migration to PostgreSQL and setup connection pooling.",
    "objectives": "Migrate schema; Enable pgbouncer; Audit SLA escalation engine",
    "transcript": "Vikram Seth: We need to finalize the PostgreSQL schema migration today. Alex Mercer: I will execute prisma migrate dev by Friday.",
    "apiKey": "optional-gemini-or-openai-api-key"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "meetingId": "c4b3a210-9876-4321-8765-123456789abc"
  }
  ```

---

### 2. Get All Meetings
- **URL**: `/api/meetings`
- **Method**: `GET`
- **Response (200 OK)**:
  ```json
  [
    {
      "id": "c4b3a210-9876-4321-8765-123456789abc",
      "title": "Q3 Infrastructure & Security Alignment",
      "date": "2026-08-23T14:00:00.000Z",
      "durationMins": 45,
      "department": "Engineering",
      "agenda": "Review database migration to PostgreSQL",
      "status": "Processed",
      "segments": [
        {
          "id": "seg-1",
          "speaker": "Vikram Seth",
          "timestamp": "00:00",
          "text": "We need to finalize the PostgreSQL schema migration today.",
          "type": "decision",
          "order": 1
        }
      ],
      "decisions": [
        {
          "id": "dec-1",
          "title": "Adopt PostgreSQL 15 as primary database provider",
          "context": "SQLite migration to PostgreSQL",
          "department": "Engineering",
          "tags": ["PostgreSQL", "Database"]
        }
      ],
      "tasks": [
        {
          "id": "task-1",
          "title": "Execute prisma migrate dev on production pool",
          "ownerName": "Alex Mercer",
          "ownerEmail": "alex.mercer@company.org",
          "department": "Engineering",
          "priority": "High",
          "status": "Pending",
          "deadline": "2026-08-26T14:00:00.000Z"
        }
      ]
    }
  ]
  ```

---

### 3. Get Meeting Details
- **URL**: `/api/meetings/:id`
- **Method**: `GET`
- **Response (200 OK)**: Detailed JSON record matching the meeting schema with ordered segments and associated decisions.

---

### 4. Delete Meeting (Organizer Only)
- **URL**: `/api/meetings/:id`
- **Method**: `DELETE`
- **Headers**: `x-user-role: organizer`
- **Response (200 OK)**:
  ```json
  {
    "message": "Meeting deleted successfully"
  }
  ```
- **Response (403 Forbidden)**:
  ```json
  {
    "error": "Forbidden: Requester must be an organizer"
  }
  ```

---

### 5. Fetch Task SLA Board
- **URL**: `/api/tasks`
- **Method**: `GET`
- **Query Parameters**:
  - `department`: Filter by department name (e.g. `Engineering` or `All`)
  - `status`: Filter by status (`Pending`, `In_Progress`, `Completed`, `Overdue`, `Escalated`, `All`)
- **Response (200 OK)**: Array of task records with meeting metadata and notification history.

---

### 6. Update Task Status & Deadline
- **URL**: `/api/tasks`
- **Method**: `PATCH`
- **Request Body**:
  ```json
  {
    "taskId": "task-1",
    "status": "Completed",
    "priority": "High",
    "deadline": "2026-08-27T18:00:00.000Z"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "task": { "id": "task-1", "status": "Completed" }
  }
  ```

---

### 7. Assign Task (Organizer Only)
- **URL**: `/api/tasks/:id/assign`
- **Method**: `PATCH`
- **Headers**: `x-user-role: organizer`
- **Request Body**:
  ```json
  {
    "assigneeId": "user-uuid-1234"
  }
  ```
- **Response (200 OK)**: Updated task object with new `ownerName` and `ownerEmail`.

---

### 8. Get Registered User Directory
- **URL**: `/api/users`
- **Method**: `GET`
- **Response (200 OK)**:
  ```json
  [
    {
      "id": "user-uuid-1234",
      "name": "Alex Mercer",
      "email": "alex.mercer@company.org",
      "role": "Admin",
      "departmentId": "dept-eng"
    }
  ]
  ```

---

### 9. Get Productivity Analytics & ROI Metrics
- **URL**: `/api/analytics`
- **Method**: `GET`
- **Response (200 OK)**: Real-time decision lag metrics, closure rates, department breakdowns, and trend data.

---

### 10. Semantic Vector Search
- **URL**: `/api/search?q=database+migration&department=Engineering`
- **Method**: `GET`
- **Response (200 OK)**: Cosine-similarity ranked search results matching decisions, transcripts, and action items.

---

### 11. Audit & Trigger SLA Escalation Engine
- **URL**: `/api/cron/escalate`
- **Method**: `POST` or `GET`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "summary": {
      "checkedCount": 12,
      "newOverdueCount": 1,
      "newEscalatedCount": 1,
      "notificationsCreated": 2
    }
  }
  ```

---

## 🛑 HTTP Status Codes

| Code | Status | Description |
|---|---|---|
| `200` | `OK` | Request succeeded |
| `400` | `Bad Request` | Missing required parameters or payload invalid |
| `401` | `Unauthorized` | Unauthenticated session |
| `403` | `Forbidden` | Requester lacks `organizer` privileges |
| `404` | `Not Found` | Resource ID does not exist |
| `429` | `Too Many Requests` | Exceeded rate limit (100 req/min/IP) |
| `500` | `Internal Server Error` | Server database or runtime exception |

