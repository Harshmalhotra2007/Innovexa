# Changelog

All notable changes to the MeetIQ Ops Console project will be documented in this file.

---

## [1.2.0] - 2026-08-24

### Added
- **Cascade Deletion of Meetings**: Permitted organizers to completely delete a meeting record, automatically cascade-purging all associated tasks and decisions. Added a Cyberpunk-styled warning dialog prior to execution.
- **Dynamic Task Assignment**: Added database models and PATCH API endpoint (`/api/tasks/[id]/assign`) allowing organizers to select team members from a dropdown. Re-assigning dynamically updates the task assignee and updates legacy owner details automatically.
- **Registered User Lookup**: Created GET endpoint (`/api/users`) to retrieve registered team members ordered alphabetically for dropdown population.
- **Automated API Testing**: Added a comprehensive Jest unit testing suite covering authorization checks, cascading deletions, and reassignments with Next.js mocks.

### Optimized (Performance & Architecture)
- **PostgreSQL Database Migration**: Migrated the schema from SQLite to PostgreSQL with native DB features:
  - Native Postgres Enums for `Role`, `TaskStatus`, and `TaskPriority`.
  - Native String Arrays (`String[]`) for decision tags instead of stringified JSON objects.
  - Added B-Tree composite indexes: `Task(status, department)`, `Task(assigneeId, deadline)` and `Meeting(date, department)`.
- **Edge API Caching**: Implemented Vercel Edge caching using Next.js `unstable_cache` with tag-based revalidation (`revalidateTag`) to save database query cycles.
- **Code Splitting & Dynamic Imports**: Extracted heavy Recharts rendering elements into a separate Client Component, dynamically imported on `/analytics` with `ssr: false` to reduce the initial load bundle footprint.
- **Search Input Debouncing**: Throttled search submissions on the Knowledge Engine interface using a 300ms timer debounce.
- **Next.js Font Optimization**: Self-hosted and auto-preloaded Inter, Space Grotesk, and IBM Plex Mono fonts natively using `next/font/google`.

### Removed
- SQLite Database file (`prisma/dev.db`).
- Legacy JSX prototypes and instructions inside `Code/` folder.
- Unused devDependencies: `@testing-library/react`, `@testing-library/jest-dom`, and `jest-environment-jsdom` (removing 127 node packages in total).
- Old build cache assets (`tsconfig.tsbuildinfo`).
