# Components — Shared UI Primitives

**Framework**: React 18.3.1 (Vite 5.4.1, no meta-framework). **CSS**: Tailwind 3.4.9, no component library (no shadcn/MUI/Chakra/Radix) — fully custom components. **Directory**: `src/shared/components/ui/`.

All components use the `cn()` helper (`src/shared/lib/utils.js`, a thin `clsx` wrapper) for conditional classNames, and lean on Tailwind `@apply`-based custom classes defined in `src/index.css` (`.input`, `.label`, `.btn*`, `.card`) rather than inlining every utility.

---

## Input
- File: `src/shared/components/ui/Field.jsx`
- Text/email/date input with label + error text.
- Props: `label`, `error`, `className`, `inputClassName`, plus all native `<input>` props.

```jsx
export function Input({ label, error, className, inputClassName, ...props }) {
  return (
    <div className={cn('mb-4', className)}>
      {label && <label className="label">{label}</label>}
      <input {...props} className={cn('input', error && 'border-bad/60', inputClassName)} />
      {error && <p className="text-xs text-bad mt-1">{error}</p>}
    </div>
  )
}
```

## PasswordInput
- File: `src/shared/components/ui/Field.jsx`
- Password input with show/hide toggle (Eye/EyeOff icon from lucide-react).
- Props: `label`, `error`, `className`, plus native `<input>` props.

```jsx
export function PasswordInput({ label, error, className, ...props }) {
  const [show, setShow] = useState(false)
  return (
    <div className={cn('mb-4', className)}>
      {label && <label className="label">{label}</label>}
      <div className="relative">
        <input
          {...props}
          type={show ? 'text' : 'password'}
          className={cn('input pr-10', error && 'border-bad/60')}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      {error && <p className="text-xs text-bad mt-1">{error}</p>}
    </div>
  )
}
```

## AmountInput
- File: `src/shared/components/ui/Field.jsx`
- Numeric/currency input. Strips non-numeric chars, prefixes with `$` (or custom prefix), monospace font for the value.
- Props: `label`, `error`, `prefix` (default `'$'`), `className`, `value`, `onChange` (receives a cleaned string, not an event).

```jsx
export function AmountInput({ label, error, prefix = '$', className, value, onChange, ...props }) {
  const handle = (e) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '')
    const parts = raw.split('.')
    const clean = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : raw
    onChange?.(clean)
  }
  return (
    <div className={cn('mb-4', className)}>
      {label && <label className="label">{label}</label>}
      <div className="relative">
        {prefix && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-mono text-sm select-none">
            {prefix}
          </span>
        )}
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={handle}
          className={cn('input font-mono', prefix && 'pl-8', error && 'border-bad/60')}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-bad mt-1">{error}</p>}
    </div>
  )
}
```

## Select
- File: `src/shared/components/ui/Field.jsx`
- Native `<select>` styled with a chevron icon overlay.
- Props: `label`, `error`, `options` (array of `{ value, label }`), `placeholder`, `className`, `value`, `onChange` (receives the raw string value, not an event).

```jsx
export function Select({ label, error, options = [], placeholder, className, value, onChange, ...props }) {
  return (
    <div className={cn('mb-4', className)}>
      {label && <label className="label">{label}</label>}
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className={cn('input appearance-none pr-9 cursor-pointer', !value && 'text-gray-500', error && 'border-bad/60')}
          {...props}
        >
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value} className="bg-surface-800 text-white">
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      </div>
      {error && <p className="text-xs text-bad mt-1">{error}</p>}
    </div>
  )
}
```

## ColorPicker
- File: `src/shared/components/ui/Field.jsx`
- Swatch grid; selected color gets a ring highlight.
- Props: `label`, `value`, `onChange`, `colors` (array of hex strings), `className`.

```jsx
export function ColorPicker({ label, value, onChange, colors, className }) {
  return (
    <div className={cn('mb-4', className)}>
      {label && <label className="label">{label}</label>}
      <div className="flex gap-2 flex-wrap">
        {colors.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange?.(c)}
            className={cn(
              'w-8 h-8 rounded-xl transition-all duration-150',
              value === c && 'ring-2 ring-white ring-offset-2 ring-offset-surface-800 scale-110'
            )}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
    </div>
  )
}
```

## EmptyState
- File: `src/shared/components/ui/Field.jsx`
- Used on nearly every list page when data is empty. Emoji + title + description + optional action (usually a `btn-primary` button).
- Props: `emoji` (default `'📭'`), `title`, `description`, `action` (a React node, typically a button), `className`.

```jsx
export function EmptyState({ emoji = '📭', title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-6 text-center', className)}>
      <div className="text-4xl mb-3">{emoji}</div>
      {title       && <h3 className="text-white font-semibold mb-1">{title}</h3>}
      {description && <p className="text-sm text-gray-400 mb-4">{description}</p>}
      {action}
    </div>
  )
}
```

## ProgressBar
- File: `src/shared/components/ui/Field.jsx`
- Thin rounded progress bar, used for budgets/goals.
- Props: `value` (default 0), `max` (default 100), `color` (defaults to `var(--accent)`), `className`.

```jsx
export function ProgressBar({ value = 0, max = 100, color, className }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className={cn('h-1.5 bg-surface-500 rounded-full overflow-hidden', className)}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: color || 'var(--accent)' }}
      />
    </div>
  )
}
```

## Modal
- File: `src/shared/components/ui/Modal.jsx`
- Bottom-sheet modal on mobile (`items-end`), centered dialog on `sm:` (≥640px) and up (`sm:items-center sm:max-w-md sm:rounded-3xl`). Used for essentially every form in the app. Locks body scroll while open. Has a drag handle bar shown only on mobile (`sm:hidden`).
- Props: `open`, `onClose`, `title` (optional — renders a header with close button), `children`, `className` (merged onto the panel).

```jsx
export default function Modal({ open, onClose, title, children, className }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      {/* Panel */}
      <div className={cn(
        'relative w-full sm:max-w-md bg-surface-800 border border-white/[0.08]',
        'rounded-t-3xl sm:rounded-3xl animate-slide-up',
        'max-h-[92svh] flex flex-col',
        className
      )}>
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
          <div className="w-9 h-1 rounded-full bg-white/20" />
        </div>
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] flex-shrink-0">
            <h2 className="text-base font-semibold text-white">{title}</h2>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/[0.06]">
              <X size={16} />
            </button>
          </div>
        )}
        {/* Content */}
        <div
          className="flex-1 overflow-y-auto px-5 py-4"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
```

## Toast / ToastProvider / useToast
- File: `src/shared/components/ui/Toast.jsx`
- App-wide toast notification system (`success`/`error`/`warning`/`info`), mounted once at the root via `<ToastProvider>` in `main.jsx`. Toasts render fixed, centered horizontally, `top: calc(env(safe-area-inset-top) + 12px)`, stacked with `flex-col gap-2`, capped at 4 visible (`slice(-3)` + the new one). Auto-dismiss after `duration` (default 3500ms).
- Usage: `const toast = useToast(); toast.success('Guardado')`.

```jsx
const Ctx = createContext(null)

const CFG = {
  success: { icon: CheckCircle, color: 'text-ok',   bg: 'bg-ok/10   border-ok/20'   },
  error:   { icon: XCircle,     color: 'text-bad',  bg: 'bg-bad/10  border-bad/20'  },
  warning: { icon: AlertCircle, color: 'text-warn', bg: 'bg-warn/10 border-warn/20' },
  info:    { icon: Info,        color: 'text-info', bg: 'bg-info/10 border-info/20' },
}

function ToastItem({ t, remove }) {
  const { icon: Icon, color, bg } = CFG[t.type] || CFG.info

  useCallback(() => {
    const id = setTimeout(() => remove(t.id), t.duration ?? 3500)
    return () => clearTimeout(id)
  }, [t.id])()

  return (
    <div className={cn(
      'flex items-start gap-3 px-4 py-3 rounded-2xl border shadow-xl animate-slide-up',
      'bg-surface-800/95 backdrop-blur-sm min-w-[260px] max-w-[90vw]',
      bg
    )}>
      <Icon size={15} className={cn('flex-shrink-0 mt-0.5', color)} />
      <p className="text-sm text-white flex-1 leading-snug">{t.msg}</p>
      <button onClick={() => remove(t.id)} className="text-gray-500 hover:text-white flex-shrink-0">
        <X size={13} />
      </button>
    </div>
  )
}

export function ToastProvider({ children }) {
  const [list, setList] = useState([])

  const remove = useCallback((id) => setList((p) => p.filter((t) => t.id !== id)), [])

  const add = useCallback((msg, type = 'info', duration = 3500) => {
    const id = Math.random().toString(36).slice(2)
    setList((p) => [...p.slice(-3), { id, msg, type, duration }])
    setTimeout(() => remove(id), duration + 300)
  }, [remove])

  const toast = {
    success: (m, d) => add(m, 'success', d),
    error:   (m, d) => add(m, 'error',   d),
    warning: (m, d) => add(m, 'warning', d),
    info:    (m, d) => add(m, 'info',    d),
  }

  return (
    <Ctx.Provider value={toast}>
      {children}
      <div
        className="fixed left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center pointer-events-none"
        style={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}
      >
        {list.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem t={t} remove={remove} />
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useToast must be inside ToastProvider')
  return ctx
}
```

## Spinner
- File: `src/shared/components/ui/Spinner.jsx`
- Inline loading spinner, 3 sizes.
- Props: `size` (`'sm' | 'md' | 'lg'`, default `'md'`), `className`.

```jsx
export default function Spinner({ size = 'md', className }) {
  const s = { sm: 'w-4 h-4 border-[1.5px]', md: 'w-5 h-5 border-2', lg: 'w-7 h-7 border-2' }
  return <div className={cn('rounded-full border-white/20 border-t-white animate-spin', s[size], className)} />
}
```

## LoadingScreen
- File: `src/shared/components/ui/LoadingScreen.jsx`
- Full-screen loading state (app boot, auth check). Bouncing-dots animation + optional message.
- Props: `msg` (default `'Cargando…'`).

```jsx
export default function LoadingScreen({ msg = 'Cargando…' }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-surface-900">
      <div className="w-14 h-14 rounded-2xl bg-[var(--accent-muted)] border border-[var(--accent)]/20 flex items-center justify-center">
        <span className="text-2xl">💑</span>
      </div>
      <div className="flex gap-1.5">
        {[0,1,2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse-dot"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
      <p className="text-xs text-gray-500">{msg}</p>
    </div>
  )
}
```
