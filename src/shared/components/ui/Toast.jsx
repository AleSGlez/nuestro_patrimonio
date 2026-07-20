// src/shared/components/ui/Toast.jsx
import { useState, useCallback, createContext, useContext } from 'react'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'
import { cn } from '@lib/utils'

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
      {t.action && (
        <button
          onClick={() => { t.action.onClick?.(); remove(t.id) }}
          className={cn('text-sm font-semibold flex-shrink-0', color)}
        >
          {t.action.label}
        </button>
      )}
      <button onClick={() => remove(t.id)} className="text-gray-500 hover:text-white flex-shrink-0">
        <X size={13} />
      </button>
    </div>
  )
}

export function ToastProvider({ children }) {
  const [list, setList] = useState([])

  const remove = useCallback((id) => setList((p) => p.filter((t) => t.id !== id)), [])

  // opts puede ser un número (duration, legacy) o { duration, action: { label, onClick } }
  const add = useCallback((msg, type = 'info', opts = {}) => {
    const { duration = 3500, action = null } = typeof opts === 'number' ? { duration: opts } : opts
    const id = Math.random().toString(36).slice(2)
    setList((p) => [...p.slice(-3), { id, msg, type, duration, action }])
    setTimeout(() => remove(id), duration + 300)
  }, [remove])

  const toast = {
    success: (m, o) => add(m, 'success', o),
    error:   (m, o) => add(m, 'error',   o),
    warning: (m, o) => add(m, 'warning', o),
    info:    (m, o) => add(m, 'info',    o),
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
