# MeetIQ Ops Console — Changelog

All notable changes to the MeetIQ Ops Console platform are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [v1.2.0] — 2026-08-23 (Latest Production Release)

### 🚀 Added
- **PostgreSQL Database Provider Integration**: Replaced local SQLite datasource with production PostgreSQL (v15+), adding connection pooling support (`pgbouncer=true`).
- **PostgreSQL Native Enums**: Introduced schema-enforced enums for `Role` (`Member`, `Admin`, `Organizer`), `TaskStatus` (`Pending`, `In_Progress`, `Completed`, `Overdue`, `Escalated`), and `TaskPriority` (`Low`, `Medium`, `High`, `Critical`).
- **Native Array Columns (`String[]`)**: Migrated `Decision.tags` to PostgreSQL string arrays for faster tag matching.
- **B-Tree Database Indexing**: Added composite indexes to `Meeting` (`date`, `department`) and `Task` (`status`, `department`, `deadline`, `meetingId`).
- **Meeting Deletion API (`DELETE /api/meetings/:id`)**: Implemented cascading deletion of meeting records, speech segments, decisions, and associated tasks with `organizer` role authentication.
- **Task Assignment System (`PATCH /api/tasks/:id/assign`)**: Added user assignment dropdown modal and API endpoint to reassign task ownership to registered team members.
- **SHA-256 Web Crypto Authentication (`/login`)**: Client-side password hashing, `sessionStorage` persistence, and 15-minute inactivity session expiration (`AuthGuard`).
- **Recharts Analytics Dashboard (`/analytics`)**: Real-time decision lag metrics, closure rate calculation, department task breakdowns, and responsive area/line/bar charts.
- **Automated SLA Escalation Engine (`/api/cron/escalate`)**: Audits active action items against target deadline timestamps, setting Level 1 overdue status and Level 2 manager escalations.

### ⚠️ Breaking Changes
- **Database Datasource Update**: Migrated datasource provider in `prisma/schema.prisma` to `postgresql`. Existing SQLite database instances require `npx prisma migrate dev` or `npx prisma db push`.
- **RBAC Header Requirement**: `DELETE /api/meetings/:id` and `PATCH /api/tasks/:id/assign` now enforce the `x-user-role: organizer` request header. Unauthorized calls return `403 Forbidden`.

### 🧹 Removed & Deprecated
- **Removed `Meeting.audioUrl`**: Deleted unused schema field to optimize record overhead.
- **Removed `Task.ownerId` relation**: Replaced relation with direct `ownerName` / `ownerEmail` mapping and `assigneeId` foreign key.
- **Purged Legacy Prototype Files**: Deleted `prisma/dev.db`, legacy PDF assets, and prototype scripts.
- **Pruned Unused Dependencies**: Uninstalled unused testing libraries (`@testing-library/react`, `jest-environment-jsdom`, `clsx`, `tailwind-merge`), reducing 127 transitive packages from `node_modules`.

---

## [v1.1.0] — 2026-08-15

### 🚀 Added
- **Multi-Speaker Transcript Extraction**: Automated AI segment categorization (`discussion`, `decision`, `action_item`).
- **Cosine-Similarity Semantic Vector Engine**: Natural language vector search across historical decision records.
- **Cyberpunk UI System**: Integrated dark theme ops console styling.

---

## [v1.0.0] — 2026-08-01

### 🚀 Initial Release
- Core meeting ingestion, basic task tracking, and department seed data initialization.
