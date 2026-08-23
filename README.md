# MeetIQ Ops Console - Intelligent Meeting, Decision & Action System (PU PS 6)

MeetIQ Ops Console is an intelligent organizational memory and action-tracking platform built for **PU PS 6**. It converts raw meeting speech transcripts into formal decisions, task assignees, and target completion deadlines, backed by semantic vector memory and automated manager escalation workflows.

---

## 🔑 Login & Access Credentials

Navigate to `/login` to access the system:

- **Organizer Account**:
  - **Username**: `organizer`
  - **Password**: `admin123`
  - **Access**: Full creation, editing, SLA manager audit, and deletion capabilities.

- **Participant Account**:
  - **Username**: `participant`
  - **Password**: `user123`
  - **Access**: Read-only view across dashboard, meeting records, decision memory, and task board.

---

## ⚡ Core Features

1. **Simple Login & Auth System**:
   - SHA-256 password hashing via Web Crypto API.
   - `sessionStorage` session persistence.
   - 15-minute inactivity session timeout.
   - Dedicated LOGOUT button.

2. **Meeting Ingestion & Diarization (`/meetings`)**:
   - Multi-speaker transcript diarization.
   - Built-in **Engineering** and **Product** sample presets.
   - AI structured extraction using Pydantic JSON schemas.

3. **Task SLA & Manager Escalation Board (`/tasks`)**:
   - Status tracking (`Pending`, `In Progress`, `Completed`, `Overdue`, `Escalated`).
   - SLA deadline countdown timers & automated manager escalation for overdue items.

4. **Semantic Memory Engine (`/knowledge`)**:
   - Vector similarity cosine search over past decision context and transcripts.

5. **Analytics & ROI Dashboard (`/analytics`)**:
   - Closure rates, decision-to-action lag, and department productivity charts.

---

## 🛠️ Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Synchronize Prisma SQLite Database
npx prisma db push

# 3. Start Production Server
npm run build
npm run start
```

Visit `http://localhost:3000` in your browser.
