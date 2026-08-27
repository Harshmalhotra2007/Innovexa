# Innovexa Ops Console Theme Specification (Tactical Steel Dark Slate)

## Color Palette Tokens

- **Primary Canvas Background (`--bg`)**: `#0D1416` (Deep Obsidian Charcoal)
- **Raised Panel Background (`--bg-raised` / `--panel`)**: `#141C1F` (Tactical Steel Panel)
- **Secondary Panel Background (`--panel-alt`)**: `#182124` (Subtle Card Surface)
- **Primary Borders (`--border`)**: `#212B2E` (Steel Grid Border)
- **Soft Borders (`--border-soft`)**: `#2B383C` (Subtle Dividers)
- **Primary Accent (`--primary`)**: `#1D4ED8` (Royal Blue / Primary Action)
- **Primary Hover (`--primary-hover`)**: `#2557E0` (Interactive Hover Accent)
- **Teal / Resolved (`--teal`)**: `#49B9AE` (Active Indicators & Success)
- **Amber / Warning (`--amber`)**: `#E8A33D` (Attention Badges & Timers)
- **Red / Breach (`--red`)**: `#E2666A` (Alert Badges & Errors)
- **Text Primary (`--text`)**: `#E7EEEF` (Bright Crisp Text)
- **Text Muted (`--text-dim`)**: `#9A99A0` (Secondary Information)
- **Text Faint (`--text-faint`)**: `#5B6A6E` (Faint Metadata)

## Component Mapping Rules

- **Console Panels & Containers**: `bg-[var(--panel)] border border-[var(--border)] text-[var(--text)]`
- **Sub-panels & Controls**: `bg-[var(--panel-alt)] border border-[var(--border-soft)]`
- **Primary Buttons**: `bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white`
- **Secondary Buttons**: `bg-[var(--panel-alt)] text-[var(--text-dim)] hover:text-[var(--text)] border border-[var(--border)]`
- **Success / Status Pills**: `bg-[var(--teal)]/15 text-[var(--teal)] border border-[var(--teal)]/30`
- **Warning Pills**: `bg-[var(--amber)]/15 text-[var(--amber)] border border-[var(--amber)]/30`
- **Alert Pills**: `bg-[var(--red)]/15 text-[var(--red)] border border-[var(--red)]/30`

## Typography Guidelines

- **Display & Headings**: `font-display text-[var(--text)] uppercase tracking-wider`
- **Body & Content**: `font-sans text-[var(--text-dim)] leading-relaxed`
- **Monospace / System Data**: `font-mono text-xs text-[var(--teal)]` or `text-[var(--amber)]`
