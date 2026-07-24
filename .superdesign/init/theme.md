# Theme — Design Tokens, CSS Variables, Tailwind Config

## Summary
- **Dark-mode only.** No light theme exists anywhere in the app.
- **4 selectable accent themes**: `violet` (default), `emerald`, `rose`, `amber` — swapped via `[data-theme="..."]` attribute on `<html>`, each only redefining `--accent` / `--accent-light` / `--accent-muted`. Everything else (grays, semantic colors) is constant across themes.
- **Grayscale ramp**: `surface-950` (#09090E, darkest) through `surface-400` (#3A3A4D, lightest), defined in `tailwind.config.js`, not CSS vars.
- **Semantic colors** (also constant, not theme-dependent): `ok` #22C55E (green), `warn` #F59E0B (amber), `bad` #EF4444 (red), `info` #3B82F6 (blue).
- **Fonts**: Inter (sans, body text) + JetBrains Mono (mono, used specifically for money amounts and codes via `font-mono` / `.money*` classes).
- **Mobile-first, phone-frame-by-default**: `#root` is capped at `max-width: 430px` and centered — the app *looks* like a phone even in a desktop browser, UNLESS the desktop shell kicks in (see below).
- **iOS PWA specifics**: `100svh` + `position: fixed` root (avoids Safari viewport-resize bugs on keyboard open), `env(safe-area-inset-*)` used throughout for the Dynamic Island / home indicator, 16px minimum input font-size (prevents iOS auto-zoom on focus).
- **NEW — Desktop breakpoint (`≥1024px`), added this session**: a sidebar-based desktop layout that activates ONLY once the authenticated dashboard shell (`.dashboard-shell` class, rendered by `DashboardPage`) is mounted, via the selector `body:has(.dashboard-shell)`. Below `1024px`, and on the login/setup screens at ANY width, the app is pixel-identical to the pre-existing mobile/phone-frame design. This is very recent (same session as the `Sidebar` component in `layouts.md`) and not yet "conventional wisdom" elsewhere in the codebase — every other page/component still assumes the 430px phone frame is the only layout that exists, except where `.dashboard-shell`/`.dashboard-content`/the desktop media query explicitly override it.

## Full `src/index.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* ── Temas ─────────────────────────────────────────────────── */
:root,
[data-theme="violet"]  { --accent: #7C6EFA; --accent-light: #A89BFC; --accent-muted: rgba(124,110,250,0.12); }
[data-theme="emerald"] { --accent: #10B981; --accent-light: #34D399; --accent-muted: rgba(16,185,129,0.12);  }
[data-theme="rose"]    { --accent: #F43F5E; --accent-light: #FB7185; --accent-muted: rgba(244,63,94,0.12);   }
[data-theme="amber"]   { --accent: #F59E0B; --accent-light: #FCD34D; --accent-muted: rgba(245,158,11,0.12);  }

/* ── Safe area variables ────────────────────────────────────── */
:root {
  --sat: env(safe-area-inset-top,    0px);
  --sab: env(safe-area-inset-bottom, 0px);
  --sal: env(safe-area-inset-left,   0px);
  --sar: env(safe-area-inset-right,  0px);

  /* iPhone 16 Plus: 430px wide, bottom bar ~34pt */
  --nav-height:    64px;
  --header-height: 60px;
}

/* ── Base ───────────────────────────────────────────────────── */
*, *::before, *::after {
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
}

html {
  height: 100%;
  overflow: hidden;
  /* Prevent font scaling on iOS rotation */
  -webkit-text-size-adjust: 100%;
}

body {
  margin: 0;
  height: 100%;
  background: #0F0F14;
  color: #E5E7EB;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overscroll-behavior: none;
  /* Prevent pull-to-refresh on iOS */
  overflow: hidden;
}

#root {
  /* Use svh for iOS Safari — accounts for browser chrome */
  height: 100svh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  /* Fixed positioning keeps layout stable when iOS keyboard appears */
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  /* Max width centered — looks great on iPad too */
  max-width: 430px;
  margin: 0 auto;
}

/* On wider screens, show subtle border */
@media (min-width: 431px) {
  body { background: #07070A; }
  #root {
    border-left:  1px solid rgba(255,255,255,0.04);
    border-right: 1px solid rgba(255,255,255,0.04);
    box-shadow: 0 0 60px rgba(0,0,0,0.6);
  }
}

/* ── Scrollbar ──────────────────────────────────────────────── */
::-webkit-scrollbar         { width: 3px; height: 3px; }
::-webkit-scrollbar-track   { background: transparent; }
::-webkit-scrollbar-thumb   { background: rgba(255,255,255,0.08); border-radius: 99px; }

/* ── Componentes ────────────────────────────────────────────── */
@layer components {

  /* ── Cards ── */
  .card {
    @apply bg-surface-800 border border-white/[0.06] rounded-2xl;
  }
  .card-interactive {
    @apply card transition-all duration-150 active:scale-[0.98] cursor-pointer;
  }

  /* ── Botones ── */
  .btn {
    @apply inline-flex items-center justify-center gap-2 rounded-xl font-medium
           transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none
           active:scale-[0.97] select-none whitespace-nowrap;
  }
  .btn-primary { @apply btn bg-[var(--accent)] text-white hover:brightness-110; }
  .btn-ghost   { @apply btn bg-white/[0.06] text-gray-300 hover:bg-white/[0.10] hover:text-white; }
  .btn-danger  { @apply btn bg-bad/10 text-bad hover:bg-bad/20; }
  .btn-outline { @apply btn border border-white/10 text-gray-300 hover:border-white/20 hover:text-white; }

  /* ── Inputs ── */
  .input {
    @apply w-full bg-surface-700 border border-white/[0.08] rounded-xl px-4 py-3
           text-white placeholder-gray-500 outline-none
           transition-all duration-150
           focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)];
    /* iOS: prevent zoom on focus (font-size >= 16px) */
    font-size: 16px;
  }
  .input-sm { @apply input py-2.5; font-size: 16px; }
  .label {
    @apply block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5;
  }

  /* ── Badges ── */
  .badge        { @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium; }
  .badge-ok     { @apply badge bg-ok/10   text-ok;   }
  .badge-warn   { @apply badge bg-warn/10 text-warn; }
  .badge-bad    { @apply badge bg-bad/10  text-bad;  }
  .badge-accent { @apply badge bg-[var(--accent-muted)] text-[var(--accent)]; }
  .badge-muted  { @apply badge bg-surface-600 text-gray-400; }

  /* ── Dinero ── */
  .money-pos { @apply text-ok   font-mono font-semibold; }
  .money-neg { @apply text-bad  font-mono font-semibold; }
  .money     { @apply text-white font-mono font-semibold; }

  /* ── Sección ── */
  .section-label {
    @apply text-[10px] font-semibold text-gray-500 uppercase tracking-[0.12em];
  }

  /* ── Glass ── */
  .glass {
    @apply bg-white/[0.04] backdrop-blur-md border border-white/[0.08];
  }

  /* ── Divider ── */
  .divider { @apply border-t border-white/[0.06]; }

  /* ── Skeleton ── */
  .skeleton { @apply bg-surface-700 rounded-lg animate-pulse; }

  /* ── Page wrapper ── */
  .page {
    @apply flex-1 overflow-y-auto overflow-x-hidden;
    padding-bottom: calc(var(--nav-height) + env(safe-area-inset-bottom, 34px) + 8px);
  }

  /* ── Dashboard shell (app autenticada) ──
     Replica exactamente "flex-1 flex flex-col overflow-hidden" para que
     el layout de móvil sea idéntico al de antes. El breakpoint desktop
     (≥1024px, ver media query al final del archivo) es lo único que
     cambia su comportamiento. */
  .dashboard-shell {
    flex: 1 1 0%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .dashboard-content {
    flex: 1 1 0%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* ── Bottom nav ── */
  .bottom-nav {
    position: fixed;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 100%;
    max-width: 430px;
    height: calc(var(--nav-height) + env(safe-area-inset-bottom, 34px));
    padding-bottom: env(safe-area-inset-bottom, 34px);
    padding-top: 4px;
    @apply bg-surface-900/95 backdrop-blur-md border-t border-white/[0.06];
    z-index: 40;
  }

  /* ── Top header ── */
  .top-header {
    height: calc(var(--header-height) + var(--sat));
    padding-top: var(--sat);
    @apply flex-shrink-0 bg-surface-900 border-b border-white/[0.06] px-4 flex items-end pb-3;
    z-index: 30;
  }

  /* ── FAB ── */
  .fab {
    position: fixed;
    right: 16px;
    bottom: calc(var(--nav-height) + env(safe-area-inset-bottom, 34px) + 12px);
    @apply w-14 h-14 rounded-2xl bg-[var(--accent)] text-white shadow-lg
           flex items-center justify-center
           hover:brightness-110 active:scale-95 transition-all;
    z-index: 50;
    box-shadow: 0 8px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.08);
  }
}

/* ── Utilidades ─────────────────────────────────────────────── */
@layer utilities {
  .gradient-text {
    background: linear-gradient(135deg, var(--accent), var(--accent-light));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

  /* Tap feedback más preciso en iOS */
  .tap-target {
    min-width: 44px;
    min-height: 44px;
  }
}

/* ── Vista desktop (≥1024px) ────────────────────────────────────
   Todo lo de abajo está gateado por min-width Y por :has(.dashboard-shell),
   así que SOLO aplica una vez que hay sesión + pareja (DashboardPage
   montado). Login/Setup/Loading conservan el "marco de teléfono" de
   siempre en pantallas anchas. Nada de esto se aplica por debajo de
   1024px, por lo que la vista de móvil queda intacta. */
@media (min-width: 1024px) {
  body:has(.dashboard-shell) #root {
    max-width: none;
    margin: 0;
    border: none;
    box-shadow: none;
  }

  .dashboard-shell {
    flex-direction: row;
  }

  .dashboard-content {
    position: relative;
    width: 100%;
    max-width: 900px;
    margin: 0 auto;
    min-width: 0;
  }

  .bottom-nav {
    display: none;
  }

  .page {
    padding-bottom: 32px;
  }

  .fab {
    position: absolute;
    right: 24px;
    bottom: 24px;
  }
}
```

## Full `tailwind.config.js`

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          950: '#09090E',
          900: '#0F0F14',
          800: '#15151C',
          700: '#1C1C26',
          600: '#24242F',
          500: '#2E2E3D',
          400: '#3A3A4D',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          light:   'var(--accent-light)',
          muted:   'var(--accent-muted)',
        },
        ok:   '#22C55E',
        warn: '#F59E0B',
        bad:  '#EF4444',
        info: '#3B82F6',
        muted: '#6B7280',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      animation: {
        'fade-in':   'fadeIn 0.25s ease-out',
        'slide-up':  'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)',
        'scale-in':  'scaleIn 0.2s ease-out',
        'pulse-dot': 'pulseDot 1.4s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:   { from: { opacity: 0 },                          to: { opacity: 1 } },
        slideUp:  { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        scaleIn:  { from: { opacity: 0, transform: 'scale(0.96)' }, to: { opacity: 1, transform: 'scale(1)' } },
        pulseDot: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.3 } },
      },
    },
  },
  plugins: [],
}
```

## Notable Tailwind breakpoints actually in use
- `sm:` (640px) — `Modal` switches from bottom-sheet to centered dialog.
- `lg:` (1024px) — `Sidebar` becomes visible (`hidden lg:flex`); this is the SAME breakpoint as the raw `@media (min-width: 1024px)` block in `index.css`, kept numerically consistent on purpose.

## Vite path aliases (relevant for import resolution when reading source)
```js
'@'        → src/
'@modules' → src/modules/
'@shared'  → src/shared/
'@ui'      → src/shared/components/ui/
'@lib'     → src/shared/lib/
'@store'   → src/shared/store/
'@hooks'   → src/shared/hooks/
```

## Stack (from `package.json`)
React 18.3.1 · Vite 5.4.1 · Tailwind 3.4.9 · @tanstack/react-query 5.56.0 · zustand 4.5.4 · recharts 2.12.7 · date-fns 3.6.0 · lucide-react 0.427.0 · xlsx 0.18.5 · clsx 2.1.1 · vite-plugin-pwa 0.20.1. `react-router-dom` and `react-hook-form`/`zod` are installed but effectively unused (no router; forms use plain `useState`).
