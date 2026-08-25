# Innovexa Ops Console — Intelligent Meeting, Decision & Action System

[![Vercel Deployment](https://img.shields.io/badge/Vercel-Deployed-success?logo=vercel&style=flat-square)](https://innovexa-murex.vercel.app)
[![Jest Test Suite](https://img.shields.io/badge/Jest%20Tests-Passing-success?logo=jest&style=flat-square)](https://github.com/Harshmalhotra2007/Innovexa.git)

Innovexa Ops Console is an intelligent organizational memory and action-tracking platform. It converts raw meeting speech transcripts into formal decisions, task assignees, and target completion deadlines, backed by semantic vector memory and automated manager escalation workflows.

> [!TIP]
> **Live Demo**: Access the deployed website directly at **[https://innovexa-murex.vercel.app](https://innovexa-murex.vercel.app)**.

---

## 🔑 Login & Access Credentials

Access the console at `/login` or through default navigation. Authenticated sessions are hashed using Web Crypto SHA-256 and stored in `sessionStorage` with a 15-minute inactivity session timeout:

| Role | Username | Password | Permissions & Access Scope |
|---|---|---|---|
| **Organizer** | `organizer` | `admin123` | Full creation, meeting deletion, task assignment, status updates, SLA audit trigger |
| **Participant** | `participant` | `user123` | Read-only access across dashboard, meeting records, task board, knowledge search, and analytics |

---

## ⚡ Tech Stack & PostgreSQL Architecture

- **Frontend & App Framework**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- **Design System & Aesthetic**: Innovexa Ops Console dark theme (`#0D1315` background, `#182124` panels, `#E8A33D` amber, `#49B9AE` teal, `#E2666A` red, `Space Grotesk` headers, `IBM Plex Mono` code, `Inter` body)
- **Database & ORM**: PostgreSQL (v15+) managed via Prisma ORM (v5.22+)
- **PostgreSQL Features**:
  - **Native Enums**: `Role` (`Member`, `Admin`, `Organizer`), `TaskStatus` (`Pending`, `In_Progress`, `Completed`, `Overdue`, `Escalated`), `TaskPriority` (`Low`, `Medium`, `High`, `Critical`)
  - **Native Arrays**: `tags String[]` on `Decision` model for zero-overhead array queries
  - **B-Tree Indexing**: `@@index([date])`, `@@index([status])`, `@@index([department])`, `@@index([deadline])`, `@@index([meetingId])` for sub-50ms query latency
  - **Connection Pooling**: Supported via `pgbouncer=true` parameter in `DATABASE_URL`
- **Data Visualization**: Recharts (LineChart, BarChart, AreaChart, PieChart with responsive containers)
- **Security & Hashing**: Web Crypto SHA-256 password hashing, `AuthGuard` inactivity tracker, `x-user-role` RBAC header validation

---

## 🛠️ Prerequisites & Local Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **PostgreSQL**: v15.0 or higher (Local installation or cloud provider like Neon.tech)
- **npm**: v9.0.0 or higher

### Step-by-Step Installation

```bash
# 1. Clone the repository
git clone https://github.com/Harshmalhotra2007/Innovexa.git
cd Innovexa

# 2. Install dependencies
npm install

# 3. Configure Environment Variables
cp .env.example .env
```

Set your `.env` configuration:
```env
# Connection pooling URL for serverless application runtime
DATABASE_URL="postgres://user:password@host:port/dbname?pgbouncer=true&sslmode=require"

# Direct connection URL used by Prisma CLI during migrations
DIRECT_URL="postgres://user:password@host:port/dbname?sslmode=require"
```

```bash
# 4. Generate Prisma Client & Run Database Migrations
npx prisma generate
npx prisma migrate dev --name init

# 5. Start Development Server
npm run dev
```

Visit `http://localhost:3000` in your browser.

---

## ⚡ Performance Optimizations & Benchmarks

- **Code Splitting & Lazy Loading**: Dynamic imports for Recharts and heavy UI modules to optimize First Load JS (<98 kB shared JS bundle).
- **Static & Dynamic Route Partitioning**: API routes configured with `export const dynamic = "force-dynamic"` to guarantee zero static build bailouts.
- **Server Startup Instrumentation**: Seed data initialization (`ensureSeedData()`) executed exactly once at server boot via Next.js `instrumentation.ts` hook.
- **Lighthouse Performance Targets**:
  - **Performance Score**: 90+
  - **Accessibility**: 100
  - **Largest Contentful Paint (LCP)**: < 1.0s
  - **Cumulative Layout Shift (CLS)**: 0.00

---

## 🚀 Deployment Instructions

### Vercel Deployment (Recommended)
```bash
# Deploy to Vercel production
npx vercel --prod
```
Ensure `DATABASE_URL` and `DIRECT_URL` environment variables are set in the Vercel Project Settings.

### Docker Deployment
```bash
# Build and launch multi-container application with PostgreSQL 15
docker-compose up -d --build
```

---

## 📄 Documentation Sitemap

- [API Reference](file:///c:/Code/Hackathon/API.md) — Endpoints, request/response payloads, and status codes
- [Database Guide](file:///c:/Code/Hackathon/DATABASE.md) — Schema ER diagram, PostgreSQL enums, indexes, and backup instructions
- [Deployment Guide](file:///c:/Code/Hackathon/DEPLOYMENT.md) — Docker, Vercel, Heroku, and CI/CD setup
- [Contributing Guidelines](file:///c:/Code/Hackathon/CONTRIBUTING.md) — Design system, code style, and PR requirements
- [Release Changelog](file:///c:/Code/Hackathon/CHANGELOG.md) — Latest releases, breaking changes, and migrations
- [User Guide](file:///c:/Code/Hackathon/USER_GUIDE.md) — Step-by-step user guide and keyboard shortcuts
- [Architecture Overview](file:///c:/Code/Hackathon/ARCHITECTURE.md) — System architecture diagram and data lifecycles
- [Performance Benchmarks](file:///c:/Code/Hackathon/PERFORMANCE.md) — Lighthouse scores and database profiling

---

## 🤖 Operation Ghost Caller (Headless Google Meet Bot)

The `innovexa-meet-bot` service provides automated Google Meet joining, PulseAudio null-sink 16kHz mono WAV recording, in-chat consent disclaimers, and multipart n8n pipeline handoffs.

### Known Limitations
- **Manual Admission**: Google Meet host must admit the bot if guest access requires host approval.
- **CAPTCHAs**: Extreme anti-bot security policies may require headful browser mode for manual solving.
- **Anonymous Join**: Guest join functionality operates when Google Meet room policies permit unauthenticated guests.
- **Audio Mixing**: Captures single mixed system audio stream (16kHz mono WAV) via PulseAudio null-sink monitor.

### Demo Script
1. **Trigger Bot**: Send a `POST` request to `http://localhost:3000/bot/join` with `{ "meetingUrl": "https://meet.google.com/..." }`.
2. **Admit Bot**: Host accepts the bot ("Innovexa Notetaker") into the Google Meet call.
3. **Observe Consent Disclaimer**: The bot posts `"This meeting is being recorded and transcribed by Innovexa. Reply STOP to object."` into the call chat.
4. **Handoff Verification**: Upon call completion, the 16kHz mono WAV file and meeting metadata are sent automatically to `N8N_WEBHOOK_URL`.


