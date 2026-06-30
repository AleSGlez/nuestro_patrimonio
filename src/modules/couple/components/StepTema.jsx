// src/modules/couple/components/StepTema.jsx
import { Check } from 'lucide-react'
import { cn } from '@lib/utils'

const TEMAS = [
  { id: 'violet',  label: 'Violeta',   color: '#7C6EFA' },
  { id: 'emerald', label: 'Esmeralda', color: '#10B981' },
  { id: 'rose',    label: 'Rosa',      color: '#F43F5E' },
  { id: 'amber',   label: 'Ámbar',     color: '#F59E0B' },
]

export default function StepTema({ data, onChange }) {
  const tema = data.tema || 'violet'

  const select = (id) => {
    onChange({ tema: id })
    document.documentElement.setAttribute('data-theme', id)
  }

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <div className="text-4xl mb-4">🎨</div>
        <h2 className="text-2xl font-bold text-white mb-2">Elige el tema</h2>
        <p className="text-sm text-gray-400">El color de acento de toda la app</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {TEMAS.map((t) => (
          <button
            key={t.id}
            onClick={() => select(t.id)}
            className={cn(
              'card p-4 text-left relative transition-all duration-150',
              tema === t.id ? 'border-2' : 'active:scale-[0.98]'
            )}
            style={tema === t.id ? { borderColor: t.color } : {}}
          >
            <div
              className="w-10 h-10 rounded-xl mb-3 flex items-center justify-center"
              style={{ backgroundColor: `${t.color}20`, border: `1px solid ${t.color}40` }}
            >
              <div className="w-5 h-5 rounded-full" style={{ backgroundColor: t.color }} />
            </div>
            <p className="text-sm font-semibold text-white">{t.label}</p>
            {tema === t.id && (
              <div
                className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ backgroundColor: t.color }}
              >
                <Check size={12} className="text-white" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
