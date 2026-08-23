# MeetIQ Ops Console — Intelligent Meeting, Decision & Action System

MeetIQ Ops Console is a cyberpunk-themed, high-performance meeting management and action-tracking platform designed to transform unstructured meeting audio and transcripts into structured organizational memory, formal decisions, and target SLA action items. Powered by a Next.js 14 App Router core, PostgreSQL with Prisma ORM, real-time task assignment, cosine-similarity semantic vector search, and automated SLA escalation workflows, MeetIQ eliminates operational drift and guarantees accountability across engineering and leadership teams.

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
- **Design System & Aesthetic**: MeetIQ Ops Console dark theme (`#0D1315` background, `#182124` panels, `#E8A33D` amber, `#49B9AE` teal, `#E2666A` red, `Space Grotesk` headers, `IBM Plex Mono` code, `Inter` body)
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
