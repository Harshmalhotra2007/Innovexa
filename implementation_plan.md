# Implementation Plan - Innovexa Ops Console UX & UI Enhancement (Preview Branch: `ui-enhancement`)

Transform the **Innovexa Ops Console** into an intuitive, high-performance meeting intelligence platform on the dedicated preview branch `ui-enhancement`. This plan enforces cognitive ease, progressive disclosure, role-based views, real-time audio waveform synchronization, and structured meeting dashboard analytics.

## User Review Required

> [!IMPORTANT]
> **Preview Isolation Guarantee**: All modifications are strictly executed on git branch `ui-enhancement` and deployed to Vercel preview environments. The production deployment at `https://innovexa-murex.vercel.app` remains completely untouched.

> [!TIP]
> **Tactical Theme Enforcement**: Dark theme palette `#0D1315` (bg), `#182124` (panels), `#E8A33D` (amber accent), `#49B9AE` (teal success), and `#E2666A` (red warning) will be systematically maintained across all newly created sidebar layouts, timeline trackers, and metrics cards.

---

## Open Questions

- *None*. All specifications, color palettes, component contracts, and structural layout directives are fully defined.

---

## Proposed Changes

### 1. Global Navigation & Persistent Sidebar Component

#### [NEW] [Sidebar.tsx](file:///c:/Code/Hackathon/src/components/Sidebar.tsx)
- Persistent left sidebar with branded header, active navigation indicators, and direct links to:
  - **Dashboard** (`/`)
  - **My Meetings** (`/meetings`)
  - **AI Tasks** (`/tasks`)
  - **Analytics & Insights** (`/analytics`)
  - **Settings** (`/settings`)
- User role toggle badge (Organizer vs Participant mode).

#### [NEW] [AppLayout.tsx](file:///c:/Code/Hackathon/src/components/AppLayout.tsx)
- Wrapper layout component introducing the fixed left sidebar and responsive top navigation header.

#### [MODIFY] [layout.tsx](file:///c:/Code/Hackathon/src/app/layout.tsx)
- Wrap root layout in `AppLayout` so every route inherits the persistent sidebar navigation and role-based context.

---

### 2. Core Meeting View Overhaul (`AIAgentPanel.tsx`)

#### [MODIFY] [AIAgentPanel.tsx](file:///c:/Code/Hackathon/src/components/AIAgentPanel.tsx)
- **Unified Action Flow**: Primary "Launch AI Meeting Engine" button with an "Advanced Options" expandable drawer housing Tab Audio Capture and Quality Profile selectors.
- **Vertical Status Timeline**: Chronological progress tracker showing `DISPATCHED` → `ADMITTED` → `RECORDING` → `TRANSCRIBING` → `INSIGHTS READY` with icons and timestamps.
- **Synced Transcript & Audio Waveform Player**:
  - Interactive waveform canvas visualizer giving real-time audio movement feedback during recording.
  - Interactive transcript clicking seeks audio player to the exact timestamp segment.
- **Card-Based Architecture**: Titled executive containers for Controls & Status, Live Diarized Captions, Executive AI Rationale, and Automated Action Items.

---

### 3. Dashboard Summary & Meeting Management Pages

#### [MODIFY] [page.tsx](file:///c:/Code/Hackathon/src/app/page.tsx)
- Transform home dashboard into a metric summary dashboard:
  - Metrics Cards: "Meetings This Week", "Open Action Items", "Upcoming Meetings", "AI Accuracy Rate".
  - Recent Activity Feed & Quick Dispatch Widget.

#### [MODIFY] [meetings/page.tsx](file:///c:/Code/Hackathon/src/app/meetings/page.tsx)
- Revamped Meeting List table with status badges, date & time, AI summary preview snippet, and direct "View Insights" button.
- Friendly smart empty state with "Schedule Your First AI-Powered Meeting" CTA.

#### [NEW] [settings/page.tsx](file:///c:/Code/Hackathon/src/app/settings/page.tsx)
- Settings page for configuring default audio quality profiles, webhook endpoints, and role preferences.

---

### 4. Selector Health Check Endpoint

#### [NEW] [selectors/route.ts](file:///c:/Code/Hackathon/src/app/api/health/selectors/route.ts)
- Automated API route to test Playwright Google Meet DOM selectors (`QYrYVd`, `CQYiBc`, `button[aria-label*="Leave"]`) and return diagnostic health reports.

---

## Verification Plan

### Automated Tests
- Run Jest test suite to ensure 100% test passage across all API routes, bot methods, and audio validators:
  ```bash
  npm test
  ```
- Run Next.js production build to verify zero TypeScript or syntax errors:
  ```bash
  npx next build
  ```

### Manual Verification
- Test persistent sidebar navigation across all pages (`/`, `/meetings`, `/tasks`, `/analytics`, `/settings`).
- Test "Launch AI Meeting Engine" unified action flow and "Advanced Options" toggle.
- Verify vertical status timeline progression.
- Test transcript segment timestamp seeking in `<AudioPlayer>`.
- Test Google Meet selector health check endpoint `/api/health/selectors`.
