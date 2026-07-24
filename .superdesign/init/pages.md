# Pages — Component Dependency Trees

Aliases resolved per `vite.config.js` (`@modules`, `@shared`, `@ui`, `@lib`, `@store`). node_modules imports (react, lucide-react, date-fns, @tanstack/react-query, recharts, etc.) are omitted from the tree — only local/aliased project files are traced. Files whose own internals weren't re-read this pass (mostly `Form*.jsx` modal components and hook files) are still listed as leaf dependencies since they ARE real `--context-file` candidates — just not expanded further here.

---

## DashboardPage (Authenticated App Shell)
Entry: `src/modules/dashboard/DashboardPage.jsx`
Dependencies:
- `src/shared/store/appStore.js`
- `src/shared/components/layout/BottomNav.jsx`
  - `src/shared/lib/utils.js` (cn)
  - `src/shared/store/appStore.js`
- `src/shared/components/layout/Sidebar.jsx`
  - `src/shared/lib/utils.js` (cn)
- `src/modules/inicio/InicioPage.jsx` (see below)
- `src/modules/finanzas/FinanzasPage.jsx` (see below)
- `src/modules/personas-hub/PersonasHubPage.jsx` (see below)
- `src/modules/negocio-hub/NegocioHubPage.jsx`
- `src/modules/mas/MasPage.jsx`
  - `src/shared/store/authStore.js`
  - `src/shared/store/appStore.js`
- `src/modules/calendario/CalendarioPage.jsx` (see below)
- `src/modules/transactions/components/FormTransaccion.jsx` (not expanded — form modal)
- `src/modules/accounts/components/FormTransferencia.jsx` (not expanded — form modal)
- `src/modules/suscripciones/SuscripcionesPage.jsx` (exports `FormSuscripcionGlobal`, not expanded)

---

## InicioPage (Home)
Entry: `src/modules/inicio/InicioPage.jsx`
Dependencies:
- `src/shared/store/authStore.js`
- `src/shared/store/appStore.js`
- `src/modules/accounts/hooks/useCuentas.js`
- `src/modules/cards/hooks/useTarjetas.js`
- `src/modules/accounts/hooks/useApartados.js` (`useTodosLosApartados`)
- `src/modules/personas/hooks/usePersonas.js`
- `src/modules/dashboard/hooks/useDashboard.js` (`useDashboardData`)
- `src/shared/lib/utils.js` (fmt, cn)
- (inline) `EspacioCard` — local component, not extracted to a shared file

---

## FinanzasPage + DashboardPersonal (Resumen sub-view)
Entry: `src/modules/finanzas/FinanzasPage.jsx`
Dependencies:
- `src/shared/components/layout/SubNav.jsx`
- `src/modules/dashboard/components/DashboardPersonal.jsx`
  - `src/modules/accounts/hooks/useCuentas.js`
  - `src/modules/cards/hooks/useTarjetas.js`
  - `src/modules/dashboard/hooks/useDashboard.js` (`buildSparklineData`)
  - `src/modules/dashboard/components/GraficaFlujo.jsx` (Recharts bar chart — not expanded)
  - `src/modules/dashboard/components/GraficaCategorias.jsx` (Recharts pie chart — not expanded)
  - `src/modules/dashboard/components/UltimosMovimientos.jsx` (not expanded)
  - `src/modules/dashboard/components/Sparkline.jsx` (Recharts line — not expanded)
  - `src/modules/dashboard/components/PresupuestosWidget.jsx` (not expanded)
  - `src/shared/lib/utils.js` (fmt, cn)
  - (inline) `MetricaCard`, `IngresosGastosCard`, `VistaPareja`, `VistaPersona` — all local to this file
- `src/modules/accounts/AccountsPage.jsx` (see below)
- `src/modules/cards/CardsPage.jsx` (not expanded — same family as AccountsPage)
- `src/modules/transactions/TransactionsPage.jsx` (see below)
- `src/modules/presupuestos/PresupuestosPage.jsx` (see below)
- `src/modules/metas/MetasPage.jsx` (not expanded)
- `src/modules/reportes/ReportesPage.jsx` (not expanded)
- `src/modules/suscripciones/SuscripcionesPage.jsx` (not expanded)
- `src/modules/recurrentes/RecurrentesPage.jsx` (not expanded)
- `src/modules/personas-hub/PersonasHubPage.jsx` (see below)
- `src/modules/dashboard/hooks/useDashboard.js` (`useDashboardData`)
- `src/shared/store/appStore.js`

---

## AccountsPage (Finanzas → Cuentas)
Entry: `src/modules/accounts/AccountsPage.jsx`
Dependencies:
- `src/modules/accounts/hooks/useCuentas.js` (`useCuentas`, `useEliminarCuenta`)
- `src/modules/accounts/hooks/useApartados.js` (`useTodosLosApartados`)
- `src/shared/store/appStore.js`
- `src/shared/components/ui/Toast.jsx` (`useToast`)
- `src/shared/components/ui/Field.jsx` (`EmptyState`)
- `src/shared/components/ui/Modal.jsx`
- `src/modules/accounts/components/CuentaCard.jsx` (not expanded)
- `src/modules/accounts/components/CuentaCardCompact.jsx` (not expanded)
- `src/modules/accounts/components/ApartadoNegocioRef.jsx` (not expanded)
- `src/modules/accounts/components/FormCuenta.jsx` (not expanded — modal form)
- `src/modules/accounts/components/FormApartado.jsx` (not expanded — modal form)
- `src/modules/accounts/components/FormTransferencia.jsx` (not expanded — modal form)
- `src/shared/lib/utils.js` (fmt, cn)

---

## TransactionsPage (Finanzas → Movimientos)
Entry: `src/modules/transactions/TransactionsPage.jsx`
Dependencies:
- `src/modules/transactions/hooks/useTransacciones.js` (`useTransacciones`, `useEliminarTransaccion`)
- `src/modules/transactions/hooks/useTransferenciasList.js`
- `src/modules/accounts/hooks/useTransferencias.js` (`useEliminarTransferencia`)
- `src/modules/accounts/hooks/useCuentas.js`
- `src/modules/cards/hooks/useTarjetas.js`
- `src/shared/store/appStore.js`
- `src/shared/components/ui/Toast.jsx` (`useToast`)
- `src/shared/components/ui/Field.jsx` (`EmptyState`)
- `src/modules/transactions/components/FormTransaccion.jsx` (not expanded — modal form)
- `src/modules/transactions/components/TransferRow.jsx` (not expanded)
- `src/shared/lib/utils.js` (fmt, fmtDate, currentMonth, cn, CAT_GASTO, CAT_INGRESO, CAT_NEGOCIO_GASTO)
- (inline) `TxRow`, `MonthPicker` — local to this file

---

## InventarioPage (Negocio → Inventario)
Entry: `src/modules/inventario/InventarioPage.jsx`
Dependencies:
- `src/modules/inventario/hooks/useInventario.js` (`useLotes`, `useProductos`, `useEliminarProducto`, `useVenderProducto`, `calcularCostoReal`, `calcularMargen`)
- `src/shared/components/ui/Toast.jsx` (`useToast`)
- `src/shared/components/ui/Field.jsx` (`EmptyState`)
- `src/modules/inventario/components/FormLote.jsx` (not expanded — modal form)
- `src/modules/inventario/components/FormProducto.jsx` (not expanded — modal form)
- `src/modules/inventario/components/ImportarExcel.jsx` (not expanded — xlsx import flow)
- `src/modules/inventario/components/ProveedoresPage.jsx` (not expanded — nested sub-view, toggled by local state not a tab)
- `src/shared/lib/utils.js` (fmt, cn)
- (inline) `VistaLote` — local to this file, itself a full sub-page (per-lote card list with sell/edit/delete)

---

## VentasPage (Negocio → Ventas)
Entry: `src/modules/ventas/VentasPage.jsx`
Dependencies:
- `src/modules/ventas/hooks/useVentas.js` (`useVentas`, `useVentaItems`, `useCancelarVenta`, `METODOS_COBRO`)
- `src/modules/clientes/hooks/useClientes.js` (`useClientes`)
- `src/shared/components/ui/Toast.jsx` (`useToast`)
- `src/shared/components/ui/Field.jsx` (`EmptyState`)
- `src/modules/ventas/components/FormVenta.jsx` (not expanded — modal form, multi-card sale entry)
- `src/shared/lib/utils.js` (fmt, cn, fmtDate)
- (inline) `DetalleVenta` — local bottom-sheet component with its own `useVentaItems`/`useCancelarVenta` calls

---

## CalendarioPage
Entry: `src/modules/calendario/CalendarioPage.jsx`
Dependencies:
- `src/modules/cards/hooks/useTarjetas.js`
- `src/modules/suscripciones/hooks/useSuscripciones.js`
- `src/shared/lib/utils.js` (quincenasDelMes, periodoTarjeta, fmt, cn)
- (inline) `VistaMensual`, `VistaSemanal`, `DetalleDia`, `generarEventos` — all local to this file, no external chart/calendar library (hand-rolled grid using `date-fns`)

---

## NegocioHubPage
Entry: `src/modules/negocio-hub/NegocioHubPage.jsx`
Dependencies:
- `src/shared/components/layout/SubNav.jsx`
- `src/modules/dashboard/components/DashboardNegocio.jsx` (not expanded)
- `src/modules/inventario/InventarioPage.jsx` (see above)
- `src/modules/ventas/VentasPage.jsx` (see above)
- `src/modules/clientes/ClientesPage.jsx` (not expanded)
- `src/modules/negocio-hub/PresupuestoNegocioPage.jsx` (not expanded)
- `src/modules/compras/ComprasPage.jsx` (not expanded)

---

## PresupuestosPage (Finanzas → Presupuestos)
Entry: `src/modules/presupuestos/PresupuestosPage.jsx`
Dependencies:
- `src/modules/presupuestos/hooks/usePresupuestos.js` (`usePresupuestos`, `useEliminarPresupuesto`, `calcularDisponible`, `calcularDesglose`, `labelPeriodo`)
- `src/modules/transactions/hooks/useTransacciones.js` (`useTransacciones`)
- `src/shared/store/appStore.js`
- `src/shared/components/ui/Toast.jsx` (`useToast`)
- `src/shared/components/ui/Field.jsx` (`EmptyState`)
- `src/modules/presupuestos/components/FormPresupuesto.jsx` (not expanded — modal form)
- `src/shared/lib/utils.js` (fmt, cn)
- (inline) `PresupuestoCard` — local to this file, includes its own roll-over progress-bar visualization

---

## Skipped from the top-10 priority list (per instruction — trivial/lower priority)
`SetupPage` (5-step wizard, one-time onboarding flow — not a "main" page), `AuthPage` (login/register), `MasPage` (settings, already fully expanded in `layouts.md`/`routes.md`), `PersonasHubPage`'s and `ReportesPage`'s trees were not separately expanded beyond what's already captured in `routes.md`/`layouts.md` — flagged as a gap below.
