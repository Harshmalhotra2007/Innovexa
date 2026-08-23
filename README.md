# MeetIQ Ops Console — Intelligent Meeting, Decision & Action System

MeetIQ Ops Console is an intelligent organizational memory and action-tracking platform. It converts raw meeting speech transcripts into formal decisions, task assignees, and target completion deadlines, backed by semantic vector memory and automated manager escalation workflows.

---

## 🔑 Login & Access Credentials

Navigate to `/login` to access the system:

| Role | Username | Password | Access |
|---|---|---|---|
| **Organizer** | `organizer` | `admin123` | Full creation, SLA audit, editing |
| **Participant** | `participant` | `user123` | Read-only view |

---

## ⚡ Core Features

1. **Auth System (`/login`)**: SHA-256 password hashing via Web Crypto API, `sessionStorage` persistence, 15-min inactivity timeout.
2. **Meeting Ingestion & Deletion (`/meetings`)**: Multi-speaker transcript diarization, AI structured extraction of decisions/tasks, and **Meeting Deletion** (cascade delete of tasks/decisions) with role check and Cyberpunk confirmation modal.
3. **Task SLA Board & Assignment (`/tasks`)**: Status tracking (`Pending`, `In_Progress`, `Completed`, `Overdue`, `Escalated`) with automated manager escalation and **Task Assignment** to active team members via a dropdown.
4. **Semantic Knowledge Engine (`/knowledge`)**: Cosine-similarity vector search over past decisions and transcript memory.
5. **Analytics & ROI Dashboard (`/analytics`)**: Real-time closure rates, decision-to-action lag (computed from DB), and department productivity charts.
6. **Robust Testing Setup (`npm run test`)**: Comprehensive unit and integration test suite targeting deletion, assignment, and authorization gates.

---

## 🛠️ Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Synchronize Prisma SQLite Database
npx prisma db push

# 3. Start development server
npm run dev
```

Visit `http://localhost:3000` in your browser.

---

## 🏗️ Architecture

```
src/
├── app/
│   ├── api/
│   │   ├── meetings/      # GET list, POST create with AI extraction
│   │   ├── meetings/[id]/ # GET detail, DELETE meeting & cascade associations
│   │   ├── tasks/         # GET (filterable), PATCH update status
│   │   ├── tasks/[id]/assign/ # PATCH assign task to user
│   │   ├── users/         # GET all registered users
│   │   ├── analytics/     # GET real-time metrics (no hardcoded data)
│   │   ├── search/        # GET semantic vector search
│   │   └── cron/escalate/ # POST/GET trigger SLA escalation engine
│   ├── analytics/         # Analytics & ROI dashboard page
│   ├── knowledge/         # Semantic search page
│   ├── login/             # Login page
│   ├── meetings/          # Meetings list & ingestion form
│   ├── tasks/             # SLA task board
│   └── page.tsx           # Dashboard (reads session from sessionStorage)
├── components/
│   ├── AuthGuard.tsx      # 15-min inactivity session guard
│   └── Navigation.tsx     # Top nav + SLA audit trigger
├── lib/
│   ├── ai-engine.ts       # Local NLP + optional LLM transcript extraction
│   ├── db.ts              # Prisma singleton client
│   ├── escalation-engine.ts # SLA deadline enforcement & notification
│   ├── seed-data.ts       # Initial demo data (runs once via instrumentation)
│   └── vector-search.ts   # Cosine similarity semantic search
└── instrumentation.ts     # Next.js startup hook — seeds DB exactly once
```

### 4. Database Setup & Migrations (PostgreSQL)

This project requires **PostgreSQL**.
1. Copy `.env.local` or setup your `.env`:
   ```bash
   cp .env.example .env
   ```
2. Add your database credentials in `.env`:
   ```env
   DATABASE_URL="postgres://user:password@host:port/dbname?pgbouncer=true&sslmode=require"
   DIRECT_URL="postgres://user:password@host:port/dbname?sslmode=require"
   ```
3. Generate the Prisma Client and run migrations:
   ```bash
   npx prisma generate
   npx prisma migrate dev --name postgres_init
   ```
*(Note: Do not use `db push` for production Postgres schemas).*

## 🧹 Cleanup Notes (August 2026)

The following changes were made to optimize the codebase:

### Schema Changes
- **Removed `Meeting.audioUrl`** — field was never written or read (no audio upload UI exists)
- **Removed `Task.ownerId` and `Task.owner` relation** — `ownerName`/`ownerEmail` are used exclusively; the User relation was set only in seed data and never queried at runtime
- **Removed `User.tasksOwned` reverse relation** — cascade of the above

### Performance Improvements
- **`ensureSeedData()` moved to `instrumentation.ts`** — Previously called on every API request, adding a `SELECT COUNT(*) FROM Department` round-trip to all 5 routes on every call. Now runs exactly once at server startup.
- **Analytics: removed hardcoded fake data** — `avgDecisionLagDays` is now computed from real `Task.createdAt` vs `Meeting.date` values. Trend data is now aggregated from real monthly task/decision records (no more fake May/Jun/Jul rows).

### Code Cleanup
- Removed 2 `console.log()` debug statements from `seed-data.ts`
- Removed unused npm packages: `clsx`, `tailwind-merge` (never imported)
- Removed unused lucide-react imports across frontend pages
- Removed dead `participantsRaw` form field in Meetings page (value collected but never sent to API)
- Fixed Dashboard session: reads from `sessionStorage` instead of hardcoded `"Priya"`
- Replaced `any` types in tasks API route with `Prisma.TaskWhereInput` / `Prisma.TaskUpdateInput`
- Deleted stale root files: `WhatsApp Image...jpeg`, `simplified_implementation_plan.md`, `login.md`

### Removed Dependencies
| Package | Reason |
|---|---|
| `clsx` | Zero imports in codebase |
| `tailwind-merge` | Zero imports in codebase |
