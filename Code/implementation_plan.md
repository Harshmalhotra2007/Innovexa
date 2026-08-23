# Implementation Plan - PU PS 6: Intelligent Meeting, Decision & Action Tracking System

Develop a full-stack, intelligent organizational memory and action-tracking platform based on the **PU PS 6** specification. The application automatically converts raw meeting recordings/transcripts into structured decisions, actionable tasks with assignees and deadlines, semantic searchable memory, department dashboards, and automated deadline escalation workflows.

---

## Technical Architecture Overview

```
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                      Next.js 14 Web Application (App Router)                │
 │  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────────────────┐  │
 │  │ Meeting Admin &  │  │ Centralized Task │  │ Searchable Knowledge Base │  │
 │  │ Audio Upload     │  │ & Escalation     │  │ & Semantic Vector Search  │  │
 │  └─────────┬────────┘  └────────┬─────────┘  └─────────────┬─────────────┘  │
 │            │                    │                          │                │
 └────────────┼────────────────────┼──────────────────────────┼────────────────┘
              ▼                    ▼                          ▼
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                             Backend REST APIs                               │
 │  - /api/meetings (CRUD, Audio Upload, Transcription Engine)                 │
 │  - /api/extract (LLM Extraction Engine for Decisions, Tasks & Metadata)     │
 │  - /api/tasks (Status Updates, Assignments, Escalations)                    │
 │  - /api/search (Semantic Vector Search & Graph Relations)                   │
 │  - /api/analytics (Productivity Metrics, Closure Rates, Department Data)    │
 │  - /api/cron/escalate (Automated Escalation & Reminder Scheduler)           │
 └────────────┬───────────────────────────────────────────────┬────────────────┘
              ▼                                               ▼
 ┌─────────────────────────────┐               ┌───────────────────────────────┐
 │   SQLite DB (Prisma DB)     │               │ Vector Embeddings Index       │
 │   - Meetings & Agendas      │               │ - Decision Semantic Index     │
 │   - Tasks & Escalation Log  │               │ - Transcript Segment Vectors  │
 │   - Department Profiles     │               │ - Sentence-transformers Embed │
 └─────────────────────────────┘               └───────────────────────────────┘
```

---

## User Review Required

> [!IMPORTANT]
> **API Key Flexibility**: The AI extraction pipeline will support LLM providers (Gemini / Groq / OpenAI) with configurable API keys via UI settings, plus an intelligent built-in rule-based & fallback mock parser so the demo works seamlessly even without an external API key.

> [!NOTE]
> **Audio Processing**: For meeting capture, we will provide live microphone recording, sample audio presets, audio file upload (MP3/WAV/M4A), and raw transcript paste mode for testing versatility.

---

## Open Questions

> [!NOTE]
> None at this stage. All requirements from the PU PS 6 specification are covered.

---

## Proposed Changes

### Full-Stack Next.js Project Architecture

#### [NEW] [package.json](file:///c:/Code/Hackathon/package.json)
- Next.js 14, React 18, Tailwind CSS, Lucide Icons, Recharts, Prisma/SQLite, Vector Similarity search utilities.

#### [NEW] [prisma/schema.prisma](file:///c:/Code/Hackathon/prisma/schema.prisma)
- Database models:
  - `User` & `Department`
  - `Meeting` (title, date, duration, status, audioUrl, transcript, agenda)
  - `MeetingSegment` (speaker, timestamp, text, classification: discussion|decision|action|info)
  - `Decision` (meetingId, title, context, rationale, department, tags)
  - `Task` (meetingId, title, ownerId, department, deadline, priority, status, escalationLevel, escalatedAt)
  - `Notification` (userId, title, message, status, sentAt, channel)

#### [NEW] [src/lib/db.ts](file:///c:/Code/Hackathon/src/lib/db.ts)
- Database initialization and Prisma client connection setup.

#### [NEW] [src/lib/ai-engine.ts](file:///c:/Code/Hackathon/src/lib/ai-engine.ts)
- LLM prompt orchestration and structured JSON extraction engine using Pydantic-like schemas.
- Parses transcripts into logical segments, extracts decisions, action items, assignees, deadlines, and priorities.

#### [NEW] [src/lib/vector-search.ts](file:///c:/Code/Hackathon/src/lib/vector-search.ts)
- Semantic vector similarity engine for indexed decision search and cross-meeting knowledge discovery.

#### [NEW] [src/lib/escalation-engine.ts](file:///c:/Code/Hackathon/src/lib/escalation-engine.ts)
- Automated SLA & overdue task monitoring.
- Triggers step 1 reminder (Upcoming/Due) and step 2 escalation to department manager for overdue tasks.

#### [NEW] [src/app/page.tsx](file:///c:/Code/Hackathon/src/app/page.tsx)
- Main dashboard overview showing meeting stats, quick actions, high-priority overdue tasks, department productivity summary, and recent decisions.

#### [NEW] [src/app/meetings/page.tsx](file:///c:/Code/Hackathon/src/app/meetings/page.tsx) & [src/app/meetings/[id]/page.tsx](file:///c:/Code/Hackathon/src/app/meetings/[id]/page.tsx)
- Meeting Administration interface: schedule meetings, upload audio/transcript, manage agenda, view live diarized transcript with interactive segment tagging (Discussion vs Decision vs Action Item).

#### [NEW] [src/app/tasks/page.tsx](file:///c:/Code/Hackathon/src/app/tasks/page.tsx)
- Centralized Task & Action Item Tracking Board (Kanban & List views).
- Status updates, SLA countdowns, priority filter, assignee filter, manual escalation trigger button.

#### [NEW] [src/app/knowledge/page.tsx](file:///c:/Code/Hackathon/src/app/knowledge/page.tsx)
- Semantic Knowledge Base & Decision Memory: Natural language search engine over decisions and meeting records with interactive knowledge graph relation preview.

#### [NEW] [src/app/analytics/page.tsx](file:///c:/Code/Hackathon/src/app/analytics/page.tsx)
- Meeting Effectiveness Analytics & Department Dashboards using Recharts:
  - Task closure rate (% on-time vs delayed)
  - Decision-to-action lag distribution
  - Department participation & workload breakdown
  - Meeting ROI & productivity index

#### [NEW] [src/app/api/...](file:///c:/Code/Hackathon/src/app/api/meetings/route.ts)
- API endpoints for Meetings, Task CRUD, AI Extraction, Vector Search, Analytics data, and Escalation triggers.

---

## Verification Plan

### Automated Tests
- Build verification with `npm run build`.
- API endpoint integration tests for task creation, extraction, and search query.

### Manual Verification
1. **Meeting Administration**: Create a new meeting, upload/paste a transcript, run intelligent extraction.
2. **Extraction Engine**: Verify automatic classification into discussion, decisions, and action items with assignees and target deadlines.
3. **Task Tracking & Escalation**: View task board, simulate overdue tasks, and verify escalation logic to department managers.
4. **Knowledge Search**: Query semantic knowledge base for past decisions and trace back to original meeting context.
5. **Analytics**: Inspect department dashboards and productivity charts.
