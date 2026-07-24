# Routes — Tab-Based Navigation (No Router)

`react-router-dom` (^6.26.0) is a listed dependency but is **not used anywhere** in the codebase — confirmed by grep, zero imports. All navigation is `useState` tab switching across three nested levels. There are no URLs per screen; the whole app is a single page.

## Level 0 — App.jsx state machine

| State | Component | Condition |
|---|---|---|
| Loading | `LoadingScreen` | `!initialized` (auth store still resolving tokens) |
| Auth | `AuthPage` | `initialized && !user` |
| Setup | `SetupPage` | `user` exists but no `pareja` row found (`usePareja()` returned nothing) |
| Dashboard | `DashboardPage` | `user` + `pareja` both exist |

## Level 1 — DashboardPage `tab` state (from `useAppStore`)

Source: `src/modules/dashboard/DashboardPage.jsx`, `renderTab()` switch:

```jsx
const renderTab = () => {
  switch (tab) {
    case 'inicio':      return <InicioPage onNavegar={handleNavegar} />
    case 'finanzas':    return <FinanzasPage subTab={finanzasSubTab} />
    case 'personas':    return <PersonasHubPage />
    case 'negocio':     return <NegocioHubPage />
    case 'calendario':  return <CalendarioPage />
    case 'mas':         return <MasPage />
    default:            return <InicioPage onNavegar={handleNavegar} />
  }
}
```

| Tab id | Component | Entry file | Summary | Reachable from |
|---|---|---|---|---|
| `inicio` | `InicioPage` | `src/modules/inicio/InicioPage.jsx` | Home dashboard: greeting, total patrimonio card, 4-card grid (Mi patrimonio / Pareja / Negocio / Personas), alerts (upcoming card payments), recent activity list | BottomNav, Sidebar, default |
| `finanzas` | `FinanzasPage` | `src/modules/finanzas/FinanzasPage.jsx` | Hub with its own SubNav — see Level 2 below | BottomNav, Sidebar |
| `personas` | `PersonasHubPage` | `src/modules/personas-hub/PersonasHubPage.jsx` | Hub with its own SubNav — see Level 2 below | Sidebar only (mobile: only via `InicioPage`'s "Personas" card calling `onNavegar('personas')`, which sets this same `tab` state — no direct BottomNav button) |
| `negocio` | `NegocioHubPage` | `src/modules/negocio-hub/NegocioHubPage.jsx` | Hub with its own SubNav — see Level 2 below | BottomNav, Sidebar |
| `calendario` | `CalendarioPage` | `src/modules/calendario/CalendarioPage.jsx` | Month/week calendar of quincenas, card cut/payment dates, subscription due dates | BottomNav, Sidebar |
| `mas` | `MasPage` | `src/modules/mas/MasPage.jsx` | Account info, theme picker (4 themes), logout, app version | **Sidebar only** — no mobile entry point exists (a `LogOut` icon button on `InicioPage`'s header does logout directly, bypassing this page entirely on mobile) |

`onNavegar(tab, subTab?)` (passed to `InicioPage`) is a thin wrapper: if navigating to `'finanzas'` with a `subTab`, it first seeds `finanzasSubTab` state, then calls `setTab`.

`onAccion(accionId)` (passed to both `BottomNav` and `Sidebar`) opens one of 3 global modals regardless of which tab is active: `gasto`/`ingreso` → `FormTransaccion`, `transferencia` → `FormTransferencia`, `suscripcion` → `FormSuscripcionGlobal`.

## Level 2 — Hub pages' own sub-tab state (local `useState`, not lifted to `appStore`)

### FinanzasPage (`src/modules/finanzas/FinanzasPage.jsx`)
Local `tab` state, initialized from the `subTab` prop (default `'resumen'`). Rendered inside a `SubNav` with `titulo="Finanzas"`.

```jsx
const TABS = [
  { id: 'resumen',       label: 'Resumen',       emoji: '📊' },
  { id: 'cuentas',       label: 'Cuentas',       emoji: '🏦' },
  { id: 'tarjetas',      label: 'Tarjetas',      emoji: '💳' },
  { id: 'movimientos',   label: 'Movimientos',   emoji: '↕️' },
  { id: 'presupuestos',  label: 'Presupuestos',  emoji: '🎯' },
  { id: 'metas',         label: 'Metas',         emoji: '⭐' },
  { id: 'suscripciones', label: 'Suscripciones', emoji: '🔄' },
  { id: 'recurrentes',   label: 'Recurrentes',   emoji: '🔁' },
  { id: 'personas',      label: 'Personas',      emoji: '👥' },
  { id: 'reportes',      label: 'Reportes',      emoji: '📈' },
]

case 'resumen':       return <DashboardPersonal txMesData={...} txHistoricoData={...} nombres={nombres} />
case 'cuentas':       return <AccountsPage />
case 'tarjetas':      return <CardsPage />
case 'movimientos':   return <TransactionsPage />
case 'presupuestos':  return <PresupuestosPage />
case 'metas':         return <MetasPage />
case 'suscripciones': return <SuscripcionesPage />
case 'recurrentes':   return <RecurrentesPage />
case 'personas':      return <PersonasHubPage />   {/* duplicate entry point into the same hub as Level-1 'personas' */}
case 'reportes':      return <ReportesPage />
```

| Sub-tab | Component | 1-line summary |
|---|---|---|
| `resumen` | `DashboardPersonal` | Pareja/P1/P2 sub-tabs, patrimonio + flujo metric cards with sparklines, income-vs-expense chart, budgets widget, category pie chart, recent transactions |
| `cuentas` | `AccountsPage` | Bank accounts + apartados (virtual sub-envelopes), filterable by person/negocio, FAB to add |
| `tarjetas` | `CardsPage` | Credit cards, cut/payment dates, balances |
| `movimientos` | `TransactionsPage` | Toggle between transactions list and transfers list, filters (tipo/contexto/persona/mes), search, FAB |
| `presupuestos` | `PresupuestosPage` | Budget cards with roll-over math, excedido/en regla split, tabs by tipo (diario/semanal/mensual) |
| `metas` | `MetasPage` | Savings goals with contribution tracking |
| `suscripciones` | `SuscripcionesPage` | Recurring subscriptions with alerts |
| `recurrentes` | `RecurrentesPage` | Recurring transactions (auto-registered) |
| `personas` | `PersonasHubPage` | Same hub as Level-1 `personas` tab (external debts/credits) |
| `reportes` | `ReportesPage` | Personal/Negocio report sub-tabs, Excel export |

### NegocioHubPage (`src/modules/negocio-hub/NegocioHubPage.jsx`)
Local `tab` state, default `'resumen'`. Rendered inside a `SubNav` with `titulo="Negocio"`.

```jsx
const TABS = [
  { id: 'resumen',      label: 'Resumen',      emoji: '📊' },
  { id: 'ventas',       label: 'Ventas',       emoji: '💰' },
  { id: 'inventario',   label: 'Inventario',   emoji: '📦' },
  { id: 'clientes',     label: 'Clientes',     emoji: '👤' },
  { id: 'presupuesto',  label: 'Presupuesto',  emoji: '🎯' },
  { id: 'compras',      label: 'Compras',      emoji: '🛒' },
]

case 'resumen':     return <DashboardNegocio />
case 'ventas':      return <VentasPage />
case 'inventario':  return <InventarioPage />
case 'clientes':    return <ClientesPage />
case 'presupuesto': return <PresupuestoNegocioPage />
case 'compras':     return <ComprasPage />
```

| Sub-tab | Component | 1-line summary |
|---|---|---|
| `resumen` | `DashboardNegocio` | Business capital, utilidad, gastos summary |
| `ventas` | `VentasPage` | Pokémon card sales list, stats (num ventas/ingresos/ganancia), detail bottom sheet with items + margin breakdown, FAB |
| `inventario` | `InventarioPage` | Two views toggled by local state: lote list (stock/sold/cost totals) → tap a lote to see `VistaLote` (its individual cards, sell/edit/delete/Excel import). Has its own nested "Proveedores" sub-view (`ProveedoresPage`) toggled by a button, not a tab. FAB adds a new lote. |
| `clientes` | `ClientesPage` | Customers with wishlist + purchase history |
| `presupuesto` | `PresupuestoNegocioPage` | Business budget by category |
| `compras` | `ComprasPage` | Buyee purchase-lot tracking with shipping status |

### PersonasHubPage (`src/modules/personas-hub/PersonasHubPage.jsx`)
Local `tab` state, default `'todas'`. Rendered inside a `SubNav` with `titulo="Personas"`.

```jsx
const TABS = [
  { id: 'todas',       label: 'Todas',      emoji: '👥' },
  { id: 'me_deben',    label: 'Me deben',   emoji: '💚' },
  { id: 'debo',        label: 'Debo',       emoji: '🔴' },
]

tab === 'todas' ? <PersonasPage /> : <ListaPersonasFiltrada filtro={tab} />
```

| Sub-tab | Component | 1-line summary |
|---|---|---|
| `todas` | `PersonasPage` | Full personas list/CRUD (external debts/credits with people outside the couple) |
| `me_deben` | `ListaPersonasFiltrada filtro="me_deben"` (inline component in `PersonasHubPage.jsx`) | Filtered list, `saldo > 0`, with a por-cobrar/por-pagar summary card |
| `debo` | `ListaPersonasFiltrada filtro="debo"` | Filtered list, `saldo < 0` |

## Deep-link note
None of this state survives a page reload except via `appStore`'s `tab` field, and even that is explicitly **not** persisted to localStorage (see `theme.md` for the store's persist config) — sub-tab state (`finanzasSubTab` in `DashboardPage`, and each hub's own local `tab`) is always lost on reload, resetting to `'resumen'`/`'todas'`/default. There is no way to deep-link to a specific sub-tab via URL since there are no URLs.
