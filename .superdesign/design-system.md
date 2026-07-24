# Design System — Nuestro Patrimonio

## Product context
Private finance app for one couple (Ale & Ruli). Two domains: (1) shared personal
finances — accounts, cards, transactions, budgets, goals, subscriptions; (2) a
Pokémon-card resale business — inventory, purchases (Buyee lots), sales, clients.
Not a SaaS product — no onboarding funnel, no marketing chrome, no light theme.

Mobile-first (iPhone 430px) is done and stays untouched. This design system
targets ONLY the desktop/web experience (≥1024px), which currently just
stretches the mobile layout into a centered 900px column with a sidebar bolted
on — it reads as "a phone, but wider," not a real desktop app. The redesign
target is the desktop shell (Sidebar + main content area) and how the existing
page content (starting with the Inicio/home page) inhabits that wider space,
with a stronger typographic hierarchy.

## Branding & styling

**Dark-mode only.** No light theme anywhere.

### Colors
Grayscale surfaces (fixed, not theme-dependent):
- `surface-950` #09090E — darkest, page background on wide screens
- `surface-900` #0F0F14 — app background, headers, nav
- `surface-800` #15151C — cards
- `surface-700` #1C1C26 — inputs, nested elements
- `surface-600` #24242F — hover states
- `surface-500` #2E2E3D, `surface-400` #3A3A4D — rarely used, lightest ramp steps

Accent (theme-switchable via `[data-theme]` on `<html>`, pick ONE per draft —
default to violet unless told otherwise):
- `violet` (default): #7C6EFA / light #A89BFC / muted rgba(124,110,250,.12)
- `emerald`: #10B981 / #34D399 / rgba(16,185,129,.12)
- `rose`: #F43F5E / #FB7185 / rgba(244,63,94,.12)
- `amber`: #F59E0B / #FCD34D / rgba(245,158,11,.12)

Semantic (fixed across themes):
- `ok` #22C55E (green — income, positive, on-track)
- `bad` #EF4444 (red — expense, negative, error, debt)
- `warn` #F59E0B (amber — alerts, pending)
- `info` #3B82F6 (blue — informational)

### Typography
- Sans (UI text, labels, headings): **Inter**
- Mono (ALL money amounts, no exceptions): **JetBrains Mono**
- Current hierarchy is flat — this is one of the two things to fix. Establish
  a real scale: hero numbers (patrimonio total) should be dramatically larger
  and heavier than section titles; section titles clearly heavier than card
  labels; card labels clearly heavier/smaller than secondary/meta text
  (dates, counts). Money in list rows can stay modest, but a "hero" money
  figure (e.g. total patrimonio) should anchor the page visually.

### Spacing / shape
- Cards: `rounded-2xl` (16px), `bg-surface-800`, `border border-white/[0.06]`
- Buttons/inputs: `rounded-xl` (12px)
- Standard card padding `p-4`; compact/dense contexts `p-3`
- Borders throughout are low-contrast white-alpha (`white/[0.06]` to
  `white/[0.10]`), never a solid gray border color

### Components (existing, reuse — do not redesign these primitives)
- `.card` / `.card-interactive` — base surface, interactive variant adds
  `active:scale-[0.98]` tap feedback
- `.btn-primary` (solid accent), `.btn-ghost` (translucent white), `.btn-danger`
  (red), `.btn-outline` (bordered)
- `.input` — surface-700 bg, 16px font (iOS zoom prevention, irrelevant on
  desktop but harmless to keep), focus ring in accent color
- `.badge-ok/warn/bad/accent/muted` — small pill badges
- `.money-pos` (green mono), `.money-neg` (red mono), `.money` (white mono)
- `EmptyState` — emoji + title + description + optional action, used on every
  empty list
- Stat-tile pattern (`EspacioCard` on Inicio, `MetricaCard` elsewhere): emoji
  top-left, small arrow/badge top-right, title, subtitle, big mono value —
  repeated ~5x across the app with near-identical shape, fair game to
  formalize into one consistent tile in the new layout

### Layout (current, being redesigned)
- `Sidebar` (desktop, ≥1024px): fixed 256px left column, brand mark, "Nuevo"
  quick-action button, 6-item nav (Inicio/Finanzas/Personas/Calendario/
  Negocio/Más)
- `.dashboard-content`: currently `max-width: 900px`, centered — THIS is the
  "stretched phone" complaint; a real desktop layout should use the available
  width intentionally (e.g. wider content area, multi-column grids for stat
  tiles instead of a 2-col mobile grid, room for secondary/supporting panels)
  rather than capping at a narrow centered column
- `SubNav` — horizontal pill tab strip used by hub pages (Finanzas/Negocio/
  Personas), safe-area aware (irrelevant on desktop but harmless)

## Motion
- Standard transitions: 150ms ease, `active:scale-[0.97]` / `[0.98]` tap
  feedback on interactive elements (mouse: hover states instead/in addition)
- Entrances: `fade-in` (250ms), `slide-up` (300ms, cubic-bezier ease-out),
  `scale-in` (200ms) — used for modals/menus/toasts
- Keep motion subtle and fast; this is a financial app, not a marketing site

## Project requirements for this redesign
- Desktop/web viewport ONLY (≥1024px). Do not design or worry about mobile —
  it is a separately maintained, already-good layout that must not change.
- Reuse the existing dark palette, both surface grays and accent violet —
  do not introduce new colors, gradients, or fonts.
- Fix: (1) layout reads as a stretched phone (narrow centered column) →
  make it feel like an intentional desktop app using the available width.
  (2) flat typographic hierarchy → introduce real scale/weight contrast
  between hero numbers, section titles, card titles, and meta text.
- Keep all existing content/data on the Inicio page (greeting, patrimonio
  total + monthly flow, accesos rápidos quick-action tiles, 4 espacio cards
  — Mi patrimonio / Pareja / Negocio / Personas —, alertas, actividad
  reciente) — this is a restructure of layout and hierarchy, not a content
  rewrite.
