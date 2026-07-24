# Layouts — App Shell, Navigation, Root Routing

This app has **no router** (react-router-dom is installed but unused — see `routes.md`). Layout is a hand-rolled tab-based SPA. There are two coexisting navigation UIs that are pure CSS breakpoint siblings of each other — both always mounted, one hidden via CSS depending on viewport width:

- **`BottomNav`** — mobile, always present, hidden at `≥1024px` (`.bottom-nav { display: none }` in the desktop media query).
- **`Sidebar`** — desktop only, `hidden lg:flex` (Tailwind `lg` = `1024px`), added in the most recent session alongside the desktop shell.

The switch between them is driven entirely by `src/index.css`, gated with `@media (min-width: 1024px)` AND `body:has(.dashboard-shell)` — so it only ever activates once `DashboardPage` (the authenticated shell) is mounted; the login/setup screens always keep the original centered "phone frame" look (max-width 430px) regardless of viewport width.

---

## App.jsx (root routing)
- File: `src/App.jsx`
- Top-level state machine, no router: `LoadingScreen` → `AuthPage` (no session) → `SetupPage` (session but no `pareja` row yet) → `DashboardPage` (session + pareja). Applies the color theme as `data-theme` on `<html>`. Listens for a global `np:logout` event (dispatched by the API client on unrecoverable 401) to force logout.

```jsx
// src/App.jsx
import { useEffect } from 'react'
import { useAuthStore } from '@store/authStore'
import { useAppStore } from '@store/appStore'
import { usePareja } from '@modules/couple/hooks/usePareja'
import AuthPage from '@modules/auth/AuthPage'
import SetupPage from '@modules/couple/SetupPage'
import DashboardPage from '@modules/dashboard/DashboardPage'
import LoadingScreen from '@ui/LoadingScreen'

export default function App() {
  const { user, initialized, init, logout } = useAuthStore()
  const { tema } = useAppStore()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', tema)
  }, [tema])

  useEffect(() => { init() }, [])

  useEffect(() => {
    const handler = () => logout()
    window.addEventListener('np:logout', handler)
    return () => window.removeEventListener('np:logout', handler)
  }, [logout])

  if (!initialized) return <LoadingScreen />
  if (!user)        return <AuthPage />

  return <AuthedApp />
}

// Componente separado: solo se monta cuando hay user autenticado.
// El shell de navegación (BottomNav + tabs) vive DENTRO de DashboardPage,
// este componente solo decide: setup wizard vs dashboard.
function AuthedApp() {
  const { data: pareja, isPending, isError, isFetched } = usePareja()
  const setSetupCompleto = useAppStore((s) => s.setSetupCompleto)
  const setNombres = useAppStore((s) => s.setNombres)
  const setTema = useAppStore((s) => s.setTema)

  useEffect(() => {
    if (!pareja) return
    setSetupCompleto(true)
    setNombres({ p1: pareja.nombre1, p2: pareja.nombre2 })
    if (pareja.tema) setTema(pareja.tema)
  }, [pareja?.id, pareja?.nombre1, pareja?.nombre2, pareja?.tema])

  if (isPending) return <LoadingScreen msg="Cargando tu pareja…" />
  if (isFetched && !pareja && !isError) return <SetupPage />
  if (!pareja) return <LoadingScreen msg="Verificando tu cuenta…" />

  return <DashboardPage />
}
```

---

## DashboardPage (authenticated app shell)
- File: `src/modules/dashboard/DashboardPage.jsx`
- The root shell once logged in. Holds `tab` state (from `appStore`, persisted-ish across the session but not to localStorage per se — see `theme.md`/store notes), renders the active top-level page, and mounts both `Sidebar` (desktop) and `BottomNav` (mobile) side by side. Also owns 3 global modals reachable from either nav's "+"/"Nuevo" action: `FormTransaccion` (gasto/ingreso), `FormTransferencia`, `FormSuscripcionGlobal`.
- **Desktop layout note (most recent session)**: the outer div is `.dashboard-shell` (flex row ≥1024px, column below), containing `Sidebar` + a `.dashboard-content` wrapper (max-width 900px, centered, `position: relative` so the `.fab` class can anchor `position: absolute` to it instead of the raw viewport edge on desktop).

```jsx
// src/modules/dashboard/DashboardPage.jsx
import { useState } from 'react'
import { useAppStore } from '@store/appStore'
import BottomNav from '@shared/components/layout/BottomNav'
import Sidebar from '@shared/components/layout/Sidebar'
import InicioPage       from '@modules/inicio/InicioPage'
import FinanzasPage     from '@modules/finanzas/FinanzasPage'
import PersonasHubPage  from '@modules/personas-hub/PersonasHubPage'
import NegocioHubPage   from '@modules/negocio-hub/NegocioHubPage'
import MasPage          from '@modules/mas/MasPage'
import CalendarioPage   from '@modules/calendario/CalendarioPage'
import FormTransaccion  from '@modules/transactions/components/FormTransaccion'
import FormTransferencia from '@modules/accounts/components/FormTransferencia'
import { FormSuscripcionGlobal } from '@modules/suscripciones/SuscripcionesPage'

export default function DashboardPage() {
  const { tab, setTab } = useAppStore()
  const [finanzasSubTab, setFinanzasSubTab] = useState('resumen')
  const [formOpen, setFormOpen]         = useState(false)
  const [formTipo, setFormTipo]         = useState('gasto')
  const [transfOpen, setTransfOpen]     = useState(false)
  const [susOpen, setSusOpen]           = useState(false)

  const handleNavegar = (nuevoTab, subTab) => {
    if (nuevoTab === 'finanzas' && subTab) setFinanzasSubTab(subTab)
    setTab(nuevoTab)
  }

  const handleAccion = (accion) => {
    if (accion === 'gasto' || accion === 'ingreso') {
      setFormTipo(accion); setFormOpen(true)
    } else if (accion === 'transferencia') {
      setTransfOpen(true)
    } else if (accion === 'suscripcion') {
      setSusOpen(true)
    }
  }

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

  return (
    <div className="dashboard-shell">
      <Sidebar active={tab} onChange={setTab} onAccion={handleAccion} />
      <div className="dashboard-content">
        {renderTab()}
        <BottomNav active={tab} onChange={setTab} onAccion={handleAccion} />
      </div>
      {formOpen && (
        <FormTransaccion open={formOpen} onClose={() => setFormOpen(false)} tipoInicial={formTipo} />
      )}
      <FormTransferencia open={transfOpen} onClose={() => setTransfOpen(false)} />
      <FormSuscripcionGlobal open={susOpen} onClose={() => setSusOpen(false)} />
    </div>
  )
}
```

---

## BottomNav (mobile nav)
- File: `src/shared/components/layout/BottomNav.jsx`
- Fixed bottom bar, `max-width: 430px` centered (`.bottom-nav` class in `index.css`), 4 tab buttons (Inicio, Finanzas, Calendario, Negocio) plus a central circular "+" button that toggles a 2×2 grid quick-action menu (Gasto/Ingreso/Transferencia/Suscripción) rendered as a floating card just above the nav with a dimmed backdrop.
- Props: `active` (current tab id), `onChange(tabId)`, `onAccion(accionId)`.
- Note: does NOT include `'personas'` or `'mas'` tabs — those exist as valid `DashboardPage` tab values but have no mobile nav entry point (reached only via `InicioPage`'s grid card for `'personas'`; `'mas'`/Settings is currently unreachable on mobile — it's newly exposed via the desktop `Sidebar`).

```jsx
// src/shared/components/layout/BottomNav.jsx
import { useState } from 'react'
import { Home, Wallet, Users, Store, MoreHorizontal, Plus, X,
         TrendingDown, TrendingUp, ArrowLeftRight, ShoppingCart, CreditCard, CalendarDays } from 'lucide-react'
import { cn } from '@lib/utils'
import { useAppStore } from '@store/appStore'

const LEFT_TABS  = [
  { id: 'inicio',    label: 'Inicio',    icon: Home },
  { id: 'finanzas',  label: 'Finanzas',  icon: Wallet },
]
const RIGHT_TABS = [
  { id: 'calendario', label: 'Calendario', icon: CalendarDays },
  { id: 'negocio',    label: 'Negocio',    icon: Store },
]

const ACCIONES = [
  { id: 'gasto',        label: 'Gasto',        icon: TrendingDown,    color: 'bg-bad/20 text-bad border-bad/30' },
  { id: 'ingreso',      label: 'Ingreso',       icon: TrendingUp,      color: 'bg-ok/20 text-ok border-ok/30' },
  { id: 'transferencia',label: 'Transferencia', icon: ArrowLeftRight,  color: 'bg-[var(--accent-muted)] text-[var(--accent)] border-[var(--accent)]/30' },
  { id: 'suscripcion',  label: 'Suscripción',   icon: CreditCard,      color: 'bg-warn/20 text-warn border-warn/30' },
]

export default function BottomNav({ active, onChange, onAccion }) {
  const [menuOpen, setMenuOpen] = useState(false)

  const handleAccion = (id) => {
    setMenuOpen(false)
    onAccion?.(id)
  }

  return (
    <>
      {/* Overlay del menú */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMenuOpen(false)} />
      )}

      {/* Menú de acciones */}
      {menuOpen && (
        <div className="fixed z-50 bottom-nav-menu"
          style={{
            bottom: 'calc(var(--nav-height) + env(safe-area-inset-bottom, 34px) + 12px)',
            left: '50%', transform: 'translateX(-50%)',
            width: 'calc(100% - 32px)', maxWidth: '398px',
          }}
        >
          <div className="bg-surface-800 border border-white/10 rounded-2xl p-3 grid grid-cols-2 gap-2">
            {ACCIONES.map(({ id, label, icon: Icon, color }) => (
              <button key={id} onClick={() => handleAccion(id)}
                className={cn('flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all active:scale-95', color)}
              >
                <Icon size={18} />
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </div>
          <p className="text-center text-xs text-gray-500 mt-2">¿Qué quieres registrar?</p>
        </div>
      )}

      <nav className="bottom-nav flex items-start justify-around px-1">
        {LEFT_TABS.map(({ id, label, icon: Icon }) => {
          const isActive = active === id
          return (
            <button key={id} onClick={() => onChange(id)}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full pt-2">
              <Icon size={21} strokeWidth={isActive ? 2.4 : 1.8}
                className={isActive ? 'text-[var(--accent)]' : 'text-gray-500'} />
              <span className={cn('text-[10px] font-medium', isActive ? 'text-[var(--accent)]' : 'text-gray-500')}>
                {label}
              </span>
            </button>
          )
        })}

        {/* Botón + central */}
        <button onClick={() => setMenuOpen(!menuOpen)}
          className="flex flex-col items-center justify-center flex-1 h-full pt-1">
          <div className={cn(
            'w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg',
            menuOpen ? 'bg-surface-600 rotate-45' : 'bg-[var(--accent)]'
          )}>
            {menuOpen ? <X size={22} className="text-white" /> : <Plus size={24} className="text-white" />}
          </div>
        </button>

        {RIGHT_TABS.map(({ id, label, icon: Icon }) => {
          const isActive = active === id
          return (
            <button key={id} onClick={() => onChange(id)}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full pt-2">
              <Icon size={21} strokeWidth={isActive ? 2.4 : 1.8}
                className={isActive ? 'text-[var(--accent)]' : 'text-gray-500'} />
              <span className={cn('text-[10px] font-medium', isActive ? 'text-[var(--accent)]' : 'text-gray-500')}>
                {label}
              </span>
            </button>
          )
        })}
      </nav>
    </>
  )
}
```

---

## Sidebar (desktop nav — new)
- File: `src/shared/components/layout/Sidebar.jsx`
- Desktop-only (`hidden lg:flex`, ≥1024px), fixed 256px width (`lg:w-64`), full height, left-aligned. Brand header, a "Nuevo" primary button that toggles the same 4-action dropdown as `BottomNav`'s "+" menu, then a vertical nav list. Unlike `BottomNav`, it exposes **all 6** tabs including `'personas'` and `'mas'` (Settings/logout/theme page) which have no mobile entry point.
- Props: `active`, `onChange(tabId)`, `onAccion(accionId)` — same contract as `BottomNav`, wired to the same `DashboardPage` handlers.

```jsx
// src/shared/components/layout/Sidebar.jsx
import { useState } from 'react'
import {
  Home, Wallet, Users, Store, CalendarDays, Settings,
  Plus, X, TrendingDown, TrendingUp, ArrowLeftRight, CreditCard,
} from 'lucide-react'
import { cn } from '@lib/utils'

const NAV_ITEMS = [
  { id: 'inicio',     label: 'Inicio',     icon: Home },
  { id: 'finanzas',   label: 'Finanzas',   icon: Wallet },
  { id: 'personas',   label: 'Personas',   icon: Users },
  { id: 'calendario', label: 'Calendario', icon: CalendarDays },
  { id: 'negocio',    label: 'Negocio',    icon: Store },
  { id: 'mas',        label: 'Más',        icon: Settings },
]

const ACCIONES = [
  { id: 'gasto',         label: 'Gasto',         icon: TrendingDown,   color: 'bg-bad/10 text-bad border-bad/20 hover:bg-bad/20' },
  { id: 'ingreso',       label: 'Ingreso',       icon: TrendingUp,     color: 'bg-ok/10 text-ok border-ok/20 hover:bg-ok/20' },
  { id: 'transferencia', label: 'Transferencia', icon: ArrowLeftRight, color: 'bg-[var(--accent-muted)] text-[var(--accent)] border-[var(--accent)]/20 hover:brightness-110' },
  { id: 'suscripcion',   label: 'Suscripción',   icon: CreditCard,     color: 'bg-warn/10 text-warn border-warn/20 hover:bg-warn/20' },
]

export default function Sidebar({ active, onChange, onAccion }) {
  const [menuOpen, setMenuOpen] = useState(false)

  const handleAccion = (id) => {
    setMenuOpen(false)
    onAccion?.(id)
  }

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:flex-shrink-0 lg:h-full lg:bg-surface-900 lg:border-r lg:border-white/[0.06]">
      <div className="flex items-center gap-2.5 px-5 pt-6 pb-5 flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-[var(--accent-muted)] border border-[var(--accent)]/20 flex items-center justify-center text-lg flex-shrink-0">
          💑
        </div>
        <p className="text-sm font-bold text-white leading-tight">Nuestro<br />Patrimonio</p>
      </div>

      <div className="px-3 relative flex-shrink-0">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="btn-primary w-full py-2.5 text-sm font-semibold mb-4"
        >
          {menuOpen ? <X size={16} /> : <Plus size={16} />}
          <span>Nuevo</span>
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute left-3 right-3 top-[52px] z-50 bg-surface-800 border border-white/10 rounded-2xl p-2 space-y-1 shadow-xl">
              {ACCIONES.map(({ id, label, icon: Icon, color }) => (
                <button
                  key={id}
                  onClick={() => handleAccion(id)}
                  className={cn('w-full flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all', color)}
                >
                  <Icon size={16} />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto no-scrollbar">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                isActive ? 'bg-[var(--accent-muted)] text-[var(--accent)]' : 'text-gray-400 hover:bg-white/[0.04] hover:text-white'
              )}
            >
              <Icon size={18} strokeWidth={isActive ? 2.4 : 1.8} />
              {label}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
```

---

## SubNav (hub sub-navigation)
- File: `src/shared/components/layout/SubNav.jsx`
- Horizontal scrollable tab strip used by every "hub" page (`FinanzasPage`, `NegocioHubPage`, `PersonasHubPage`) to switch between sub-sections. Includes an optional bold title row and its own `env(safe-area-inset-top)` padding (so consuming pages must NOT duplicate that padding).
- Props: `tabs` (array of `{ id, label, emoji? }`), `active`, `onChange(tabId)`, `titulo` (optional page title shown above the tab strip).

```jsx
// src/shared/components/layout/SubNav.jsx
import { cn } from '@lib/utils'

export default function SubNav({ tabs, active, onChange, titulo }) {
  return (
    <div
      className="flex-shrink-0 bg-surface-900 border-b border-white/[0.06]"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      {titulo && (
        <p className="px-4 pt-3 pb-1 text-lg font-bold text-white">{titulo}</p>
      )}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar px-4 py-2.5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap flex-shrink-0 transition-all',
              active === tab.id
                ? 'bg-[var(--accent)] text-white'
                : 'bg-surface-700 text-gray-400'
            )}
          >
            {tab.emoji && <span>{tab.emoji}</span>}
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}
```

---

## PlaceholderPage
- File: `src/shared/components/layout/PlaceholderPage.jsx`
- Generic "coming soon" page, centered emoji + title + phase note. Used for unfinished features (rare — most of the app is complete per project docs).
- Props: `emoji`, `title`, `fase`.

```jsx
// src/shared/components/layout/PlaceholderPage.jsx
export default function PlaceholderPage({ emoji, title, fase }) {
  return (
    <div className="page flex flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="text-5xl">{emoji}</div>
      <h2 className="text-lg font-bold text-white">{title}</h2>
      <p className="text-sm text-gray-400">Próximamente — Fase {fase}</p>
    </div>
  )
}
```

---

## Standard page structure pattern (not a component, but a strict convention)

Nearly every leaf page in the app (not hubs) follows this exact DOM shape, using shared CSS classes rather than a shared React layout component:

```jsx
<>
  <div className="top-header ...">{/* fixed header, sometimes flex-col items-stretch !h-auto for multi-row headers */}</div>
  <div className="page px-4 pt-4">{/* scrollable content — this is the ONLY scroll container */}</div>
  <button className="fab"><Plus /></button>  {/* optional, only on pages with a primary "create" action */}
  {/* Modal(s) for forms, rendered last */}
</>
```

Hub pages (`FinanzasPage`, `NegocioHubPage`, `PersonasHubPage`) instead wrap a `SubNav` + a `flex-1 flex flex-col overflow-hidden min-h-0` container holding whichever sub-page is active.
