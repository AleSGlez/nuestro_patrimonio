// src/modules/personas/PersonasPage.jsx
import { useState } from 'react'
import { Plus, Pencil, Trash2, ChevronRight } from 'lucide-react'
import { usePersonas, useEliminarPersona, usePersonaMovimientos, useEliminarMovimiento } from './hooks/usePersonas'
import { useCuentas } from '@modules/accounts/hooks/useCuentas'
import { useToast } from '@ui/Toast'
import { EmptyState } from '@ui/Field'
import Modal from '@ui/Modal'
import FormPersona from './components/FormPersona'
import FormMovimientoPersona from './components/FormMovimientoPersona'
import { fmt, fmtDate, cn } from '@lib/utils'

const TIPO_INFO = {
  prestamo:      { emoji: '💸', label: 'Préstamo dado',   signo: '+' },
  le_debo:       { emoji: '🔴', label: 'Deuda mía',       signo: '-' },
  pago_recibido: { emoji: '✅', label: 'Pago recibido',   signo: '-' },
  pago_enviado:  { emoji: '💳', label: 'Pago enviado',    signo: '+' },
}

function DetallPersona({ persona, onClose, onEdit }) {
  const toast = useToast()
  const { data: movimientos = [], isPending } = usePersonaMovimientos(persona?.id)
  const { data: cuentas = [] } = useCuentas()
  const eliminarMov = useEliminarMovimiento()

  const saldo = Number(persona?.saldo || 0)
  const saldoPositivo = saldo >= 0

  const handleDeleteMov = async (mov) => {
    if (!confirm('¿Ah, te equivocaste? Solo confirma y lo eliminamos.')) return
    try {
      await eliminarMov.mutateAsync({ movimiento: mov, persona, cuentas })
      toast.success('Movimiento eliminado')
    } catch (e) { toast.error(e.message) }
  }

  return (
    <Modal open={!!persona} onClose={onClose} title={persona ? `${persona.emoji} ${persona.nombre}` : ''}>
      {persona && (
        <>
          <div className={cn(
            'p-4 rounded-2xl mb-4 text-center',
            saldoPositivo ? 'bg-ok/10 border border-ok/20' : saldo === 0 ? 'bg-surface-700' : 'bg-bad/10 border border-bad/20'
          )}>
            {saldo === 0 ? (
              <p className="text-sm text-gray-400">Sin saldo pendiente</p>
            ) : (
              <>
                <p className="text-xs text-gray-400 mb-1">{saldoPositivo ? 'Te debe' : 'Le debes'}</p>
                <p className={cn('text-3xl font-bold font-mono', saldoPositivo ? 'text-ok' : 'text-bad')}>
                  {fmt(Math.abs(saldo))}
                </p>
              </>
            )}
          </div>

          {persona.telefono && (
            <p className="text-xs text-gray-500 mb-3 text-center">📱 {persona.telefono}</p>
          )}
          {persona.nota && (
            <p className="text-xs text-gray-500 mb-4 text-center italic">{persona.nota}</p>
          )}

          <p className="section-label mb-2">Historial</p>
          {isPending ? (
            <div className="space-y-2">
              {[1,2,3].map((i) => <div key={i} className="skeleton h-12" />)}
            </div>
          ) : movimientos.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">Sin movimientos registrados</p>
          ) : (
            <div className="space-y-2">
              {movimientos.map((m) => {
                const info = TIPO_INFO[m.tipo]
                return (
                  <div key={m.id} className="flex items-center gap-3 p-3 bg-surface-700 rounded-xl">
                    <span className="text-lg flex-shrink-0">{info.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">{m.descripcion || info.label}</p>
                      <p className="text-xs text-gray-500">{fmtDate(m.fecha)}</p>
                    </div>
                    <p className={cn('text-sm font-semibold font-mono flex-shrink-0',
                      info.signo === '+' ? 'text-ok' : 'text-bad'
                    )}>
                      {info.signo}{fmt(m.monto)}
                    </p>
                    <button onClick={() => handleDeleteMov(m)} className="text-gray-500 hover:text-bad flex-shrink-0">
                      <Trash2 size={13} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          <button onClick={() => onEdit(persona)} className="btn-ghost w-full py-2.5 text-sm mt-4">
            <Pencil size={14} /> Editar datos
          </button>
        </>
      )}
    </Modal>
  )
}

function PersonaCard({ persona, onTap, onEdit, onDelete, onMovimiento }) {
  const saldo = Number(persona.saldo)
  const saldoPositivo = saldo >= 0

  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <button onClick={() => onTap(persona)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
          <div className={cn(
            'w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0',
            saldo === 0 ? 'bg-surface-700' : saldoPositivo ? 'bg-ok/10' : 'bg-bad/10'
          )}>
            {persona.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{persona.nombre}</p>
            {saldo === 0 ? (
              <p className="text-xs text-gray-500">Sin saldo pendiente</p>
            ) : (
              <p className={cn('text-sm font-mono font-bold', saldoPositivo ? 'text-ok' : 'text-bad')}>
                {saldoPositivo ? '+' : '-'}{fmt(Math.abs(saldo))}
              </p>
            )}
          </div>
          <ChevronRight size={16} className="text-gray-600 flex-shrink-0" />
        </button>
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={() => onEdit(persona)} className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-white">
            <Pencil size={13} />
          </button>
          <button onClick={() => onDelete(persona)} className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-bad">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
      <button
        onClick={() => onMovimiento(persona)}
        className="mt-3 w-full py-2 rounded-xl border border-[var(--accent)]/30 text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent-muted)] transition-all"
      >
        + Registrar movimiento
      </button>
    </div>
  )
}

export default function PersonasPage() {
  const { data: personas = [], isPending } = usePersonas()
  const eliminar = useEliminarPersona()
  const toast = useToast()

  const [formOpen, setFormOpen]       = useState(false)
  const [editPersona, setEditPersona] = useState(null)
  const [detalle, setDetalle]         = useState(null)
  const [movPersona, setMovPersona]   = useState(null)

  const totalPorCobrar = personas.filter((p) => p.saldo > 0).reduce((s, p) => s + Number(p.saldo), 0)
  const totalPorPagar  = personas.filter((p) => p.saldo < 0).reduce((s, p) => s + Math.abs(Number(p.saldo)), 0)

  const handleDelete = async (persona) => {
    if (!confirm(`¿Eliminar a ${persona.nombre} y todo su historial?`)) return
    try {
      await eliminar.mutateAsync(persona.id)
      toast.success('Persona eliminada')
    } catch (e) { toast.error(e.message) }
  }

  return (
    <>
      <div className="top-header">
        <div className="flex gap-6">
          <div>
            <p className="section-label">Por cobrar</p>
            <p className="text-lg font-bold font-mono text-ok">{fmt(totalPorCobrar)}</p>
          </div>
          <div>
            <p className="section-label">Por pagar</p>
            <p className="text-lg font-bold font-mono text-bad">{fmt(totalPorPagar)}</p>
          </div>
        </div>
      </div>

      <div className="page px-4 pt-4">
        {isPending ? (
          <div className="space-y-3">
            {[1,2,3].map((i) => <div key={i} className="skeleton h-24" />)}
          </div>
        ) : personas.length === 0 ? (
          <EmptyState
            emoji="🤝" title="Sin personas registradas"
            description="Agrega amigos, familia o negocios con los que tengas deudas o préstamos"
          />
        ) : (
          <div className="space-y-3">
            {personas.map((p) => (
              <PersonaCard
                key={p.id} persona={p}
                onTap={setDetalle}
                onEdit={(p) => { setEditPersona(p); setFormOpen(true) }}
                onDelete={handleDelete}
                onMovimiento={setMovPersona}
              />
            ))}
          </div>
        )}
      </div>

      <button onClick={() => { setEditPersona(null); setFormOpen(true) }} className="fab">
        <Plus size={24} />
      </button>

      <FormPersona
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditPersona(null) }}
        persona={editPersona}
      />

      <FormMovimientoPersona
        open={!!movPersona}
        onClose={() => setMovPersona(null)}
        persona={movPersona}
      />

      <DetallPersona
        persona={detalle}
        onClose={() => setDetalle(null)}
        onEdit={(p) => { setDetalle(null); setEditPersona(p); setFormOpen(true) }}
      />
    </>
  )
}
