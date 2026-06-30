// src/shared/components/ui/Field.jsx
// Lightweight wrappers for inputs — works with or without react-hook-form
import { useState } from 'react'
import { Eye, EyeOff, ChevronDown } from 'lucide-react'
import { cn } from '@lib/utils'

// ── Text / Email / Date input ────────────────────────────────
export function Input({ label, error, className, inputClassName, ...props }) {
  return (
    <div className={cn('mb-4', className)}>
      {label && <label className="label">{label}</label>}
      <input {...props} className={cn('input', error && 'border-bad/60', inputClassName)} />
      {error && <p className="text-xs text-bad mt-1">{error}</p>}
    </div>
  )
}

// ── Password input with show/hide ────────────────────────────
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

// ── Numeric / currency input ─────────────────────────────────
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

// ── Select ───────────────────────────────────────────────────
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

// ── Color picker ─────────────────────────────────────────────
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

// ── Empty state ──────────────────────────────────────────────
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

// ── Progress bar ─────────────────────────────────────────────
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
