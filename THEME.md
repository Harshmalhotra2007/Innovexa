# Innovexa Enterprise Theme Guidelines

## Color Palette: Deep Indigo / Navy + Teal Accent (Professional Enterprise Neutral)

- **Primary (brand/accent)**: `#1D4ED8` / `#2A3EB1` (Deep Indigo / Industry Standard Productivity Blue)
- **Secondary Accent**: `#0F9D8C` (Teal / Emerald - Reserved for Success & Completed Signals)
- **Semantic Status Colors**:
  - Green: `#22C55E` $\rightarrow$ On-Time / Completed
  - Amber: `#F59E0B` $\rightarrow$ Approaching Deadline / Pending
  - Red: `#EF4444` $\rightarrow$ Overdue / Escalated
- **Neutrals**:
  - Text Primary: `#0F172A` (Slate Dark - `#0F172A`)
  - Text Secondary: `#64748B` (Slate Muted - `#64748B`)
  - Text Faint: `#94A3B8` (Slate Faint - `#94A3B8`)
  - Main Canvas Background: `#F8FAFC` (Off-white / Slate-50)
  - Card & Panel Background: `#FFFFFF` (Pure White Card / Panel)
  - Secondary Panel Surface: `#F1F5F9` (Slate-100)
  - Borders: `#E2E8F0` (Slate-200)

## Component Mapping (Dynamic CSS Variables)

- **Cards & Panels**: `bg-[var(--panel)] border border-[var(--border)] text-[var(--text)] shadow-sm`
- **Primary Buttons**: `bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white`
- **Secondary / Alt Buttons**: `bg-[var(--panel-alt)] text-[var(--text-dim)] hover:text-[var(--text)] border border-[var(--border)]`
- **Success Badges**: `bg-[var(--teal)]/12 text-[var(--teal)] border border-[var(--teal)]/30`
- **Warning Badges**: `bg-[var(--amber)]/12 text-[var(--amber)] border border-[var(--amber)]/30`
- **Error / Overdue Badges**: `bg-[var(--red)]/12 text-[var(--red)] border border-[var(--red)]/30`

## Typography

- **Headings**: Sans-serif / Display, bold, tracking-tight, `text-[var(--text)]`
- **Body**: `text-[var(--text-dim)]` with `leading-relaxed`
- **Mono / System Data**: `font-mono text-xs text-[var(--primary)]` or `text-[var(--teal)]`
