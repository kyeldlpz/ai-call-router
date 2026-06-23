# Dashboard Page Overrides

> **PROJECT:** RecoverAi
> **Source:** Google Slides deck alignment
> **Page Type:** Operations dashboard / voice intake

> Rules here **override** `design-system/recoverai/MASTER.md`.

---

## Layout

- **Grid:** 3-6-3 (phone | transcript hero | mission control)
- **Max width:** 1600px centered
- **Mobile order:** transcript first, phone second, mission control third

---

## Page-specific color rails

| Panel | Rail class |
|-------|------------|
| Transcript (hero) | `.panel-rail-blue` |
| Mission Control | `.panel-rail-purple` |
| Intent block | `.panel-rail-blue` |
| Opportunity score | `.panel-rail-purple` |
| Agent handoff | `.panel-rail-cyan` |
| AI transcript bubble | `.panel-rail-purple` |

---

## Header / Footer

- **Header:** Recover (white) + Ai (cyan), cyan underline, uppercase subtitle
- **Footer:** "Voice Intake" left, "Git Push Force" right (matches deck)

---

## Typography overrides

- No serif on this page
- Panel titles: uppercase, semibold

---

## Status colors

| State | Color |
|-------|-------|
| Active / Live / Online | Cyan `#00D2FF` |
| Connecting | Blue `#008CFF` |
| Idle / Offline | Gray `#475569` |
| Error | Red `#EF4444` |

---

## Avoid on this page

- Gold call buttons
- Green live indicators
- "Hackathon Demo" footer copy
- Backend wiring placeholder text
