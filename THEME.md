# Innovexa Theme Guidelines

## Color Palette: Indigo & Slate Light Theme

- Primary Canvas Background: `#F8FAFC` (Off-White Canvas / Slate-50)
- Panel & Container Background: `#FFFFFF` (Pure White Card / Panel)
- Primary Accent: `#1D4ED8` (Deep Indigo)
- Success / Positive: `#0F9D8C` (Teal)
- Warnings / Alert: `#EF4444` (Red)
- Text Primary: `#0F172A` (Slate Dark / Slate-900)
- Text Secondary: `#64748B` (Slate Muted / Slate-500)
- Text Faint: `#94A3B8` (Slate Faint / Slate-400)

## Component Mapping (Dynamic CSS Variables)

- Agent Cards & Panels: `bg-[var(--panel)] border-[var(--border)] text-[var(--text)]`
- Status Indicators: `bg-[var(--teal)]` for success/resolved, `bg-[var(--amber)]` for warning/pending, `bg-[var(--red)]` for breach/overdue
- Buttons: `bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white`
- Alt Buttons / Tabs: `bg-[var(--panel-alt)] text-[var(--text-dim)] border-[var(--border)]`
- Charts/Graphs (Recharts): `stroke-[var(--teal)] fill-[var(--teal)]/20`

## Typography

- Headings: Sans-serif, bold, tracking-tight, `text-[var(--text)]`
- Body: `text-[var(--text-dim)]` with `leading-relaxed`
- Mono/Data: `font-mono text-[var(--primary)]` or `text-[var(--teal)]`

