# MeetIQ Ops Console — User & Operational Guide

A complete step-by-step operational guide for team leaders, department managers, and participants using the MeetIQ Ops Console.

---

## 🔑 1. Logging In & Understanding Roles

Navigate to `http://localhost:3000/login` in your web browser.

### Credentials Summary

| Role | Username | Password | Operational Capabilities |
|---|---|---|---|
| **Organizer** | `organizer` | `admin123` | **Full Admin Access**: Ingest meetings, delete meetings, re-assign tasks, update deadlines, trigger SLA escalation audit |
| **Participant** | `participant` | `user123` | **Read-Only Access**: View dashboard, review meeting transcripts, inspect task board, perform semantic search, view analytics charts |

### Session Management & Timeout
- Sessions are stored securely in browser `sessionStorage`.
- **Inactivity Timeout**: If no keyboard or mouse activity is detected for **15 minutes**, your session will automatically expire and redirect you to `/login`.
- **Logging Out**: Click the **LOGOUT** button in the top navigation bar at any time to end your session.

---

## 📹 2. Meeting Ingestion & Diarized Memory (`/meetings`)

### How to Ingest a New Meeting Transcript
1. Click **Meetings** in the top navigation menu.
2. In the **Ingest New Meeting** form:
   - Enter **Meeting Title** (e.g. `Q3 Architecture & Security Review`).
   - Select **Target Department** (e.g. `Engineering`).
   - Provide **Agenda** and **Key Objectives**.
   - Paste raw transcript text (format: `Speaker Name: Speech text...`).
3. Click **INGEST & EXTRACT WITH AI**.
4. The system will process the transcript, diarize speakers, create decision records, and generate task action items with deadlines.

### Viewing Diarized Meeting Records
Click on any meeting card to open its detailed transcript view (`/meetings/[id]`). Review categorized discussion points, highlighted decisions, and allocated tasks.

### Deleting a Meeting (Organizer Only)
1. Navigate to `/meetings`.
2. Locate the meeting card you wish to remove.
3. Click the red **DELETE** button.
4. A **Cyberpunk Confirmation Modal** will appear detailing cascading deletions (segments, decisions, tasks).
5. Click **CONFIRM DELETION**.

---

## 📋 3. Task SLA Board & Task Assignment (`/tasks`)

### Filtering Action Items
Use the top filter bar on `/tasks` to filter tasks by:
- **Department**: `All`, `Engineering`, `Product & UI/UX`, `Operations & Logistics`, `Cybersecurity & Governance`
- **Status**: `All`, `Pending`, `In_Progress`, `Completed`, `Overdue`, `Escalated`

### Assigning a Task to a Team Member (Organizer Only)
1. On the `/tasks` board, locate the action item card.
2. Click the **Assignee Dropdown** selector on the task card.
3. Select a registered user from the team directory list (e.g., `Alex Mercer`, `Sarah Jenkins`).
4. The system sends a `PATCH /api/tasks/:id/assign` request and updates the owner name and email instantly.

### Updating Task Status & Deadlines
- Click status badges (`Pending` ➔ `In_Progress` ➔ `Completed`) to record progress.
- Tasks that exceed their target deadline will be highlighted in **Red (`#E2666A`)** as `Overdue`.
- Tasks overdue by more than 24 hours will automatically trigger **Level 2 Manager Escalation**.

---

## 🔍 4. Semantic Knowledge Engine (`/knowledge`)

1. Click **Knowledge Base** in top navigation.
2. Enter natural language queries into the search bar (e.g. `"PostgreSQL database migration decisions"`).
3. Use the department selector to scope your search.
4. The cosine-similarity vector search engine will rank and present relevant historical decisions, transcript segments, and action items with similarity confidence scores.

---

## 📊 5. Analytics & ROI Dashboard (`/analytics`)

Navigate to `/analytics` to review real-time organizational performance:
- **Decision-to-Action Lag**: Real-time calculated average delay (in days) between meeting decision creation and task execution.
- **SLA Closure Rate**: Percentage of completed vs overdue/escalated tasks across the enterprise.
- **Department Workload Matrix**: Comparative metrics detailing task volume and completion rates by department.
- **Monthly Productivity Trends**: Interactive Recharts visualization tracking task creation vs completion over time.

---

## ❓ 6. Frequently Asked Questions (FAQs)

### Q: Why is the Delete button disabled on meetings?
**A**: You are currently logged in as a **Participant** (Read-Only). Log out and log back in as an **Organizer** (`organizer` / `admin123`) to unlock deletion and assignment permissions.

### Q: How does the SLA Escalation Engine work?
**A**: The engine runs automatically (or can be triggered via `Audit SLA` in top nav). It evaluates all pending tasks against their deadline timestamp:
- **Level 1 Overdue**: Triggered when `deadline < now` and `escalationLevel == 0`. Marks task as `Overdue` and generates a warning notification.
- **Level 2 Manager Escalation**: Triggered when `hoursOverdue >= 24` and `escalationLevel <= 1`. Marks task as `Escalated` and alerts the Department Head.

### Q: How do I change environment variables for production?
**A**: Edit your `.env` file to point `DATABASE_URL` to your production PostgreSQL database instance.
