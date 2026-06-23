# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** RecoverAi
**Source:** Google Slides deck + ui-ux-pro-max 60-30-10 rule
**Category:** Fintech / Revenue Recovery Command Center

---

## Color Distribution (60-30-10)

| Budget | Role | Hex | CSS Variable |
|--------|------|-----|--------------|
| 60% | Base background | `#000000` | `--background` |
| 60% | Elevated strip | `#05070A` | `--background-elevated` |
| 30% | Card surface | `#0A0E17` | `--card` |
| 30% | Muted fill | `#111827` | `--muted` |
| 30% | Body text | `#94A3B8` | `--muted-foreground` |
| 30% | Headings | `#FFFFFF` | `--foreground` |
| 30% | Hairline border | `rgba(255,255,255,0.06)` | `--border` |
| ~4% | Brand cyan | `#00D2FF` | `--primary` / `--brand-cyan` |
| ~3% | Semantic blue | `#008CFF` | `--brand-blue` |
| ~3% | Semantic purple | `#7B61FF` | `--brand-purple` |
| Functional | Error only | `#EF4444` | `--destructive` |

**Do not use:** gold (`#CA8A04`, `#F59E0B`), glass blur, purple/gold gradients.

### Accent usage

- **Cyan:** Recover**Ai** wordmark, LIVE badge, call button, focus rings, live/online states
- **Blue:** Transcript panel rail, caller intent block, connecting status
- **Purple:** Mission Control rail, AI transcript bubbles, opportunity score block

---

## Typography

- **UI Font:** Inter (400, 500, 600, 700)
- **Data Font:** IBM Plex Mono (400, 500)
- **Wordmark:** Inter 700 uppercase — "Recover" white + "Ai" cyan
- **Labels:** `.label-caps` — 10px, uppercase, 0.12em tracking

---

## Components

### Panel surface

```css
.panel-surface {
  background: #0A0E17;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 0.25rem;
}
```

### Colored rails (deck card left-borders)

- `.panel-rail-cyan` — `#00D2FF`
- `.panel-rail-blue` — `#008CFF`
- `.panel-rail-purple` — `#7B61FF`

### Brand underline (header)

- `.brand-underline` — 40px × 3px cyan bar under wordmark

### Brand mark (wolf mascot)

- **Asset:** `/logo/whitewolf-headset.png` (favicon: `/logo/favicon.png`)
- **Component:** `BrandLogo` with `size="header"` or `size="avatar"`
- **Treatment:** Transparent PNG, trimmed with no white matte fringe; render directly on dark surfaces
- **Delivery:** `next/image` with `unoptimized` so alpha is preserved (avoid `/_next/image` flattening)
- **Allowed placements:** Header lockup, browser favicon, iPhone call avatar
- **Do not:** Replace the Recover/**Ai** text wordmark; use as full-panel decoration or background watermark

---

## Anti-Patterns

- Gold or amber accents
- Glassmorphism / backdrop-blur cards
- Serif display fonts on dashboard
- Pulse animation on static placeholders
- Green for live states (use cyan)
- Emojis as icons

---

## Pre-Delivery Checklist

- [ ] 60-30-10 color budget respected
- [ ] Cyan/blue/purple accents only on small elements
- [ ] LIVE badge = cyan dot + label text
- [ ] Inter font throughout
- [ ] 4.5:1 contrast on `#94A3B8` over `#0A0E17`
- [ ] `prefers-reduced-motion` respected
- [ ] Lucide icons only
