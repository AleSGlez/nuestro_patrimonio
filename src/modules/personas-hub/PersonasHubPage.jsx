// src/modules/personas-hub/PersonasHubPage.jsx
import { useState } from 'react'
import SubNav from '@shared/components/layout/SubNav'
import PersonasPage from '@modules/personas/PersonasPage'
import { usePersonas } from '@modules/personas/hooks/usePersonas'
import { fmt, cn } from '@lib/utils'
import { EmptyState } from '@ui/Field'

const TABS = [
  { id: 'todas',       label: 'Todas',      emoji: '👥' },
  { id: 'me_deben',    label: 'Me deben',   emoji: '💚' },
  { id: 'debo',        label: 'Debo',       emoji: '🔴' },
]

function ListaPersonasFiltrada({ filtro }) {
  const { data: personas = [], isPending } = usePersonas()

  const filtradas = personas.filter((p) => {
    const saldo = Number(p.saldo)
    if (filtro === 'me_deben') return saldo > 0
    if (filtro === 'debo') return saldo < 0
    return true
  })

  if (isPending) return <div className="page px-4 pt-4"><div className="skeleton h-20" /></div>

  if (filtradas.length === 0) {
    return <EmptyState
      emoji={filtro === 'me_deben' ? '💚' : filtro === 'debo' ? '🔴' : '👥'}
      title={filtro === 'me_deben' ? 'Nadie te debe' : filtro === 'debo' ? 'No debes a nadie' : 'Sin personas'}
      description="Todo en orden"
    />
  }

  const totalMeDeben = personas.filter((p) => Number(p.saldo) > 0).reduce((s, p) => s + Number(p.saldo), 0)
  const totalDebo    = personas.filter((p) => Number(p.saldo) < 0).reduce((s, p) => s + Math.abs(Number(p.saldo)), 0)

  return (
    <div className="page px-4 pt-4">
      {filtro === 'todas' && (totalMeDeben > 0 || totalDebo > 0) && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="card p-3 text-center">
            <p className="text-[10px] text-gray-400 mb-1">Por cobrar</p>
            <p className="text-base font-bold font-mono text-ok">{fmt(totalMeDeben)}</p>
          </div>
          <div className="card p-3 text-center">
            <p className="text-[10px] text-gray-400 mb-1">Por pagar</p>
            <p className="text-base font-bold font-mono text-bad">{fmt(totalDebo)}</p>
          </div>
        </div>
      )}
      <div className="space-y-2">
        {filtradas.map((p) => {
          const saldo = Number(p.saldo)
          return (
            <div key={p.id} className="card p-4 flex items-center gap-3">
              <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0',
                saldo === 0 ? 'bg-surface-700' : saldo > 0 ? 'bg-ok/10' : 'bg-bad/10'
              )}>
                {p.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{p.nombre}</p>
                <p className="text-xs text-gray-400">{p.telefono || 'Sin teléfono'}</p>
              </div>
              <p className={cn('text-sm font-bold font-mono flex-shrink-0',
                saldo === 0 ? 'text-gray-400' : saldo > 0 ? 'text-ok' : 'text-bad'
              )}>
                {saldo === 0 ? 'Al día' : saldo > 0 ? `+${fmt(saldo)}` : `-${fmt(Math.abs(saldo))}`}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function PersonasHubPage() {
  const [tab, setTab] = useState('todas')

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      <SubNav tabs={TABS} active={tab} onChange={setTab} titulo="Personas" />
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {tab === 'todas'
          ? <PersonasPage />
          : <ListaPersonasFiltrada filtro={tab} />
        }
      </div>
    </div>
  )
}
