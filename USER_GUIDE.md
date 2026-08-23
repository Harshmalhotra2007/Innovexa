# Innovexa Ops Console - User Guide

Welcome to the **Innovexa Ops Console**! This guide describes how to navigate and manage the intelligent organizational memory, action-tracking, and SLA monitoring system.

---

## 🔑 1. Getting Started & Logging In

Navigate to `/login` to access the console. The system contains two pre-configured accounts:

| Role | Username | Password | Privileges |
|---|---|---|---|
| **Organizer** | `organizer` | `admin123` | Full access: create/delete meetings, assign/update tasks. |
| **Participant** | `participant` | `user123` | Read-only access: view dashboard, meeting details, and search database. |

### Inactivity Guard
The console features an automatic security timeout. If there is no mouse or keyboard activity for **15 minutes**, your session will be invalidated, and you will be returned to the login screen.

---

## 📋 2. Dashboard Operations (`/`)

The main dashboard provides a central overview of meeting activity and task completion status:
- **Productivity Charts**: Track tasks by status (`Pending`, `In Progress`, `Completed`, `Overdue`, `Escalated`).
- **Quick Links**: Easily view high-priority overdue action items.
- **Filtering**: Filters all data metrics by department (Engineering, Product, Operations, Security) using the top selector dropdown.

---

## 📅 3. Meeting Administration (`/meetings`)

Organizers can manage the organizational transcript ingestion from here:
1. **Ingest Transcript**: Fill in the title, date, department, and paste a raw conversation transcript. You can also click the "Use sample transcript" link to auto-fill mock data.
2. **Submit**: Click the submit button. The local NLP engine will automatically classify paragraphs into Discussion vs Decisions vs Action Items and redirect you to the meeting detail page.
3. **Purge Meeting**: If you are logged in as an **Organizer**, you will see a red `DELETE MEETING` button next to meetings. Clicking it triggers a cascade delete warning. If confirmed, the meeting, its transcripts, decisions, and tasks are permanently deleted from the database.

---

## ⚡ 4. Action Items & SLA Board (`/tasks`)

Action items are tracked against deadline timestamps to ensure execution:
- **Completing a Task**: Click the checkbox next to any task to toggle its status between `Pending` and `Completed`.
- **Task Assignment (Organizer Only)**: Click the dropdown selector next to a task to assign it to a registered team member. This updates their assignment link and updates fallback names.
- **SLA Countdown**: Deadlines dynamically calculate and display:
  - Green (`xd left`): Safe deadline.
  - Orange (`due today` / `1d left`): Approaching deadline.
  - Red (`xd overdue`): Task deadline breached.
- **Escalation**: Overdue items trigger automated escalation warnings and notify department managers.

---

## 🔍 5. Knowledge Engine & Vector Search (`/knowledge`)

The Knowledge Engine runs a semantic natural language search over all logged decisions and transcript segment records:
- **Keystroke Debounce**: The search bar triggers auto-search queries as you type. Call requests are throttled with a **300ms debounce** to maintain fast rendering.
- **Sample Queries**: Click any query badge (e.g., "ChromaDB vs Qdrant") to instantly load vector similarities.
- **Context Traceability**: Click the `Trace Context` link on any result to open the original meeting detail and inspect the surrounding conversation segment.

