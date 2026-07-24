# Extractable Components — Menu for Superdesign DraftComponent Extraction

Full source for everything below lives in `components.md` (Basic) and `layouts.md` (Layout) — this file is metadata only, no code.

## Layout Components (appear on most/all pages)

### BottomNav
- Source: `src/shared/components/layout/BottomNav.jsx`
- Category: layout
- Description: Fixed mobile bottom tab bar (max-width 430px) with 4 tabs + central circular "+" quick-action button that opens a 2×2 action grid
- Extractable props: `active` (string tab id, e.g. `"inicio"`), — the action menu's own open/closed state is internal, not extractable
- Hardcoded: tab list (Inicio/Finanzas/Calendario/Negocio — 4 items, fixed), action list (Gasto/Ingreso/Transferencia/Suscripción — 4 items, fixed), all icons (lucide-react: Home, Wallet, Store, CalendarDays, Plus, X, TrendingDown, TrendingUp, ArrowLeftRight, CreditCard), all colors/classes
- Note: only visible below `1024px` (hidden via `.bottom-nav { display: none }` at the desktop breakpoint)

### Sidebar
- Source: `src/shared/components/layout/Sidebar.jsx`
- Category: layout
- Description: Desktop-only (≥1024px) left nav — brand header, "Nuevo" quick-action dropdown, 6-item vertical nav list
- Extractable props: `active` (string tab id)
- Hardcoded: nav list (Inicio/Finanzas/Personas/Calendario/Negocio/Más — 6 items, fixed), action list (same 4 as BottomNav), brand text "Nuestro Patrimonio" + 💑 emoji mark, all icons, all colors/classes
- Note: `Sidebar` exposes 2 tabs (`personas`, `mas`) that `BottomNav` does not — they are the same underlying `DashboardPage` tab values, just unreachable on mobile

### SubNav
- Source: `src/shared/components/layout/SubNav.jsx`
- Category: layout
- Description: Horizontal scrollable sub-tab strip with optional bold title, used by all 3 hub pages (Finanzas/Negocio/Personas)
- Extractable props: `tabs` (array of `{id, label, emoji?}` — content, not really a "prop" in the DraftComponent sense but IS the per-instance variation), `active` (string tab id), `titulo` (string, optional page title)
- Hardcoded: the pill-shaped tab button styling, gap/padding scale

### Top Header pattern
- Source: not a component — it's the `.top-header` CSS class (`src/index.css`) applied ad hoc per page, sometimes with `flex-col items-stretch !h-auto pb-3` override for multi-row headers (see `AccountsPage`, `TransactionsPage`, `InventarioPage`'s `VistaLote`, `VentasPage`, `CalendarioPage`, `PresupuestosPage`)
- Category: layout (pattern, not a component)
- Description: Fixed-height header bar (`--header-height: 60px` + safe-area-top), single-row by default (title + optional action button), or multi-row when the class override is applied (stats row, filter chips, search box, etc.)
- Extractable props: N/A — not a React component, would need to be extracted as a new reusable `PageHeader` component if Superdesign wants to draft variants of it
- Hardcoded: per-page content varies completely; only the outer shell (height, background, border, safe-area padding) is shared

### FAB (Floating Action Button) pattern
- Source: not a component — the `.fab` CSS class applied to a raw `<button className="fab"><Plus size={24} /></button>` on ~9 pages (Accounts, Transactions, Inventario, Ventas, Presupuestos, and others per `pages.md`)
- Category: layout (pattern, not a component)
- Description: Circular primary-action button, bottom-right. Mobile: `position: fixed`, anchored to raw viewport edge above the bottom nav. Desktop (≥1024px): `position: absolute`, anchored to the `.dashboard-content` column's own edge instead (added this session so it doesn't float disconnected from the centered content column on wide screens)
- Extractable props: N/A — always the same `Plus` icon in practice; onClick handler varies per page

---

## Basic Components (used across many pages)

### Input / PasswordInput / AmountInput / Select / ColorPicker
- Source: `src/shared/components/ui/Field.jsx`
- Category: basic
- Description: Form field primitives — text, password (show/hide), currency amount (auto-formats), native select with chevron, color swatch picker
- Extractable props: `label`, `error`, `value`/`onChange`, `placeholder`; `AmountInput` additionally has `prefix` (default `"$"`); `Select` additionally has `options`
- Hardcoded: the shared `.input`/`.label` CSS classes (border, radius, focus ring color via `var(--accent)`), 16px font-size (iOS zoom prevention)

### EmptyState
- Source: `src/shared/components/ui/Field.jsx`
- Category: basic
- Description: The single most reused pattern in the app — appears on essentially every list/empty page (Cuentas, Transacciones, Inventario, Ventas, Presupuestos, Personas, etc.)
- Extractable props: `emoji` (default `📭`), `title`, `description`, `action` (a rendered node — usually a `btn-primary` button)
- Hardcoded: layout (centered column, `py-12 px-6`), typography scale

### ProgressBar
- Source: `src/shared/components/ui/Field.jsx`
- Category: basic
- Description: Thin rounded progress/budget bar
- Extractable props: `value`, `max` (defaults 0/100), `color` (defaults to `var(--accent)`)
- Hardcoded: height (`h-1.5`), track color (`bg-surface-500`)

### Modal
- Source: `src/shared/components/ui/Modal.jsx`
- Category: basic
- Description: Universal form container — bottom sheet on mobile, centered dialog at `sm:` (640px)+. Used for every Form* component in the app.
- Extractable props: `open` (boolean), `title` (string, optional)
- Hardcoded: backdrop blur/opacity, max-width (`sm:max-w-md`), corner radius, drag-handle bar (mobile only)

### Toast (ToastItem)
- Source: `src/shared/components/ui/Toast.jsx`
- Category: basic
- Description: Notification pill, 4 semantic variants (success/error/warning/info), auto-dismiss
- Extractable props: `type` (`success`|`error`|`warning`|`info`), `msg` (string)
- Hardcoded: icon per type (lucide-react CheckCircle/XCircle/AlertCircle/Info), color per type, stack position (top-center, safe-area aware), max 4 stacked

### Spinner
- Source: `src/shared/components/ui/Spinner.jsx`
- Category: basic
- Description: Inline loading indicator, 3 sizes
- Extractable props: `size` (`sm`|`md`|`lg`, default `md`)
- Hardcoded: spin animation, white border-top on transparent ring

### Card grid stat tile pattern
- Source: not a component — an inline pattern repeated across `InicioPage` (`EspacioCard`), `DashboardPersonal` (`MetricaCard`), `PresupuestosPage` (`PresupuestoCard`), `VentasPage`'s stats row, `InventarioPage`'s stats row, etc. — each page defines its own local variant rather than sharing one component
- Category: basic (pattern, candidate for real extraction/consolidation — currently duplicated ~5+ times with near-identical `.card p-4` + emoji/icon + label + big mono value shape)
- Extractable props (if consolidated): `emoji`/`icon`, `label`, `value`, `positive`/`estado`, `onClick`
- Hardcoded per current instance: exact copy, exact color logic (ok/warn/bad thresholds differ slightly per usage)

---

## Gaps / not cataloged
- Form components (`FormCuenta`, `FormTransaccion`, `FormVenta`, `FormLote`, `FormProducto`, `FormPresupuesto`, `FormApartado`, `FormTransferencia`, `FormSuscripcionGlobal`, etc.) were not read this pass — they're real, numerous (one per data entity), and each is its own bespoke form inside a `Modal`. Not cataloged as "extractable" since they're inherently page/entity-specific, not shared UI primitives.
- Chart components (`GraficaFlujo`, `GraficaCategorias`, `Sparkline` in `src/modules/dashboard/components/`) are Recharts wrappers, not read this pass — likely extractable as a "chart" category if Superdesign needs data-viz drafts, but out of scope for this init pass (see `pages.md` gap note).
