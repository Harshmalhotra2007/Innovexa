# Innovexa Ops Console — Intelligent Meeting, Decision & Action System

Innovexa Ops Console is a cyberpunk-themed, high-performance meeting management and action-tracking platform designed to transform unstructured meeting audio and transcripts into structured organizational memory, formal decisions, and target SLA action items. Powered by an autonomous **AI Meeting Agent**, Next.js 14 App Router core, PostgreSQL with Prisma ORM, real-time task assignment, cosine-similarity semantic vector search, and automated SLA escalation workflows, Innovexa eliminates operational drift and guarantees accountability across engineering and leadership teams.

---

## 🤖 AI Meeting Agent

Innovexa features an autonomous **AI Meeting Agent** that connects to scheduled meetings (via Zoom/Google Meet APIs or browser automation), captures audio, streams real-time Whisper ASR captions, and generates executive GPT-4 summaries:

- **State Transitions**: `idle` ➔ `joining` ➔ `recording` ➔ `transcribing` ➔ `summarizing` ➔ `completed`
- **Real-Time Streaming**: Server-Sent Events (SSE) route emitting live diarized captions
- **Cyberpunk Purple Visual Console**: `#1A1A2E` dark theme with neon cyan (`#00FFFF`), neon purple (`#B026FF`), and pulsing recording indicators (`#FF00AA`)
- **Security & Privacy**: Restricted trigger rights (`organizer` only) and 30-day encrypted storage retention disclaimer

---

## 🔑 Login & Access Credentials

Access the console at `/login` or through default navigation. Authenticated sessions are hashed using Web Crypto SHA-256 and stored in `sessionStorage` with a 15-minute inactivity session timeout:

| Role | Username | Password | Permissions & Access Scope |
|---|---|---|---|
| **Organizer** | `organizer` | `admin123` | Full creation, AI Agent trigger, meeting deletion, task assignment, status updates, SLA audit trigger |
| **Participant** | `participant` | `user123` | Read-only access across dashboard, AI Agent panel, meeting records, task board, knowledge search, and analytics |

---

## ⚡ Tech Stack & PostgreSQL Architecture

- **Frontend & App Framework**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- **Design System & Aesthetic**: Innovexa Ops Console Cyberpunk Dark Theme (`#0D1315` background, `#1A1A2E` AI panel, `#B026FF` neon purple, `#E8A33D` amber, `#49B9AE` teal, `#E2666A` red, `Space Grotesk`, `IBM Plex Mono`)
- **Database & ORM**: PostgreSQL (v15+) managed via Prisma ORM (v5.22+)
- **AI Engine & Speech Recognition**: OpenAI Whisper ASR & GPT-4 Executive Summarizer with fallback offline NLP diarization engine
- **Real-Time Communication**: Server-Sent Events (SSE) `text/event-stream`
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

# AI & Platform Integrations
OPENAI_API_KEY="your-openai-key"
ZOOM_API_KEY="your-zoom-key"
ZOOM_API_SECRET="your-zoom-secret"
REDIS_URL="redis://localhost:6379"
```

```bash
# 4. Generate Prisma Client & Run Database Migrations
npx prisma generate
npx prisma db push

# 5. Execute Test Suite
npm run test

# 6. Start Development Server
npm run dev
```

Visit `http://localhost:3000` in your browser.

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
