# Contributing to Innovexa Ops Console

Thank you for contributing to Innovexa! Follow these guidelines to ensure consistency, security, performance, and code quality.

---

## 🛠️ Local Environment & Prerequisites

1. **Node.js**: v18.0.0 or higher
2. **PostgreSQL**: v15.0 or higher
3. **Git**: Standard branch workflow (`feature/your-feature-name` or `fix/issue-description`)

```bash
# Fork & clone repository
git clone https://github.com/Harshmalhotra2007/Innovexa.git
cd Innovexa

# Install dependencies
npm install

# Setup local database environment
cp .env.example .env
npx prisma generate
npx prisma db push

# Start development server
npm run dev
```

---

## 🎨 Cyberpunk Visual Design System & Aesthetics

All UI components must adhere strictly to the **Innovexa Ops Console Dark Palette**:

| Element / Utility | Hex Color | Tailwind Class | Purpose |
|---|---|---|---|
| **Background** | `#131324` | `bg-[#131324]` | Console canvas |
| **Panel Surface** | `#1e1e36` | `bg-[#1e1e36]` | Cards, containers, modals |
| **Panel Border** | `#2d2345` | `border-[#2d2345]` | Subtle structural dividers |
| **Primary Amber Accent** | `#9f55ff` | `text-[#9f55ff]`, `bg-[#9f55ff]` | Buttons, active tabs, warnings |
| **Teal Secondary Accent**| `#00ffff` | `text-[#00ffff]` | Status indicators, metrics |
| **Red Alert Accent** | `#ff007f` | `text-[#ff007f]` | Overdue/escalated task badges |
| **Muted Text** | `#5B6A6E` | `text-[#5B6A6E]` | Labels, timestamps, mono metadata |

### Typography Guidelines
- **Headers & Display Titles**: `Space Grotesk`, `font-display`
- **Monospace Badges & Technical Indicators**: `IBM Plex Mono`, `font-mono`
- **Body & Form Inputs**: `Inter`, `font-sans`

---

## 📐 Code Style & Conventions

- **TypeScript**: Strict mode enabled (`tsconfig.json`). Avoid using `any` unless explicitly required for external library compatibility.
- **Component Architecture**: Client components must include `"use client";` at top. Wrap `useSearchParams()` hooks inside React `<Suspense>` boundaries to prevent SSR pre-rendering bailouts.
- **Asset Formats**: All static images must use modern compressed WebP or AVIF formats.
- **Iconography**: Use `lucide-react` icons exclusively.

---

## 🧪 Testing & Verification Requirements

Before submitting a Pull Request:

1. **Automated Test Suite**: Run `npm run test` to verify all deletion, assignment, and RBAC authentication tests pass cleanly.
2. **Build Validation**: Execute `npx next build` locally to confirm 0 TypeScript or Next.js build errors.
3. **Lighthouse Audit**: Ensure the PR maintains a **90+ Lighthouse Performance Score** and **100 Accessibility Score**.

```bash
# Execute local test suite
npm run test

# Execute build verification
npx next build
```

