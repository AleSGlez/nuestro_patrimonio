// src/shared/components/layout/SubNav.jsx
import { useState } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import Modal from '@ui/Modal'
import { cn } from '@lib/utils'

export default function SubNav({ tabs, active, onChange, titulo }) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const activo = tabs.find((t) => t.id === active)

  const elegir = (id) => { onChange(id); setSheetOpen(false) }

  return (
    <div
      className="flex-shrink-0 bg-surface-900 border-b border-white/[0.06] lg:border-b-0 lg:px-10 lg:pt-8"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      {titulo && (
        <p className="px-4 pt-3 pb-1 text-lg font-bold text-white lg:px-0 lg:pt-0 lg:pb-0 lg:mb-6 lg:text-3xl lg:tracking-tight">{titulo}</p>
      )}

      {/* Mobile: selector compacto — abre una hoja con todas las secciones */}
      <div className="lg:hidden px-4 py-2.5">
        <button
          onClick={() => setSheetOpen(true)}
          className="flex items-center gap-2 bg-surface-700 rounded-xl px-3.5 py-2 text-sm font-medium text-white active:scale-[0.98] transition-all"
        >
          {activo?.emoji && <span>{activo.emoji}</span>}
          {activo?.label}
          <ChevronDown size={14} className="text-gray-400" />
        </button>
      </div>

      {/* Desktop: tira de tabs subrayados */}
      <div className="hidden lg:flex gap-1 overflow-x-auto no-scrollbar border-b border-white/[0.06]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap flex-shrink-0 transition-all border-b-2',
              active === tab.id
                ? 'text-[var(--accent)] border-[var(--accent)] font-semibold'
                : 'text-gray-400 border-transparent hover:text-white'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Hoja inferior con todas las secciones (mobile) */}
      <Modal open={sheetOpen} onClose={() => setSheetOpen(false)} title={titulo ? `Ir a…` : undefined}>
        <div className="space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => elegir(tab.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all',
                active === tab.id ? 'bg-[var(--accent-muted)] text-[var(--accent)]' : 'text-gray-300 hover:bg-white/[0.04]'
              )}
            >
              {tab.emoji && <span className="text-lg">{tab.emoji}</span>}
              {tab.label}
              {active === tab.id && <Check size={16} className="ml-auto flex-shrink-0" />}
            </button>
          ))}
        </div>
      </Modal>
    </div>
  )
}
