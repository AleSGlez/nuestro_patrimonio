// src/modules/clientes/CobrosPage.jsx
import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useClientesConAdeudo, useClientes, useClienteMovimientos, useEliminarMovimientoCliente } from './hooks/useClientes'
import { useCuentas } from '@modules/accounts/hooks/useCuentas'
import { useToast } from '@ui/Toast'
import { useConfirm } from '@ui/ConfirmDialog'
import { EmptyState } from '@ui/Field'
import Modal from '@ui/Modal'
import FormCargoCliente from './components/FormCargoCliente'
import FormPagoCliente from './components/FormPagoCliente'
import { fmt, fmtDate, cn } from '@lib/utils'

function diasDesde(fechaISO) {
  if (!fechaISO) return 0
  const fecha = new Date(fechaISO + 'T00:00:00')
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  return Math.max(0, Math.floor((hoy - fecha) / 86400000))
}

// Semáforo: verde <7 días, amarillo 7–29, rojo 30+
function semaforo(dias) {
  if (dias < 7)  return { color: 'text-ok',   bg: 'bg-ok/10',   border: 'border-ok/20' }
  if (dias < 30) return { color: 'text-warn', bg: 'bg-warn/10', border: 'border-warn/20' }
  return { color: 'text-bad', bg: 'bg-bad/10', border: 'border-bad/20' }
}

const TIPO_INFO = {
  cargo: { emoji: '🧾', label: 'Cargo', signo: '+' },
  pago:  { emoji: '✅', label: 'Pago',  signo: '-' },
}

function DetalleCliente({ cliente, onClose }) {
  const toast = useToast()
  const confirmar = useConfirm()
  const { data: movimientos = [], isPending } = useClienteMovimientos(cliente?.id)
  const { data: cuentas = [] } = useCuentas()
  const eliminarMov = useEliminarMovimientoCliente()

  if (!cliente) return null

  const dias = diasDesde(cliente.adeudo_desde)
  const s = semaforo(dias)

  const handleDeleteMov = async (mov) => {
    if (!(await confirmar({ message: '¿Eliminar este movimiento del historial?' }))) return
    try {
      await eliminarMov.mutateAsync({ movimiento: mov, cliente, cuentas })
      toast.success('Movimiento eliminado')
    } catch (e) {
      toast.error(e.message)
    }
  }

  return (
    <Modal open={!!cliente} onClose={onClose} title={cliente.nombre}>
      <div className={cn('p-4 rounded-2xl mb-4 text-center border', s.bg, s.border)}>
        <p className="text-xs text-gray-400 mb-1">Debe</p>
        <p className={cn('text-3xl font-bold font-mono', s.color)}>{fmt(cliente.saldo_pendiente)}</p>
        {cliente.adeudo_desde && (
          <p className="text-xs text-gray-400 mt-1">
            Desde {fmtDate(cliente.adeudo_desde)} · {dias} {dias === 1 ? 'día' : 'días'} de atraso
          </p>
        )}
      </div>

      {(cliente.telefono || cliente.email) && (
        <p className="text-xs text-gray-400 mb-4 text-center">
          {cliente.telefono || cliente.email}
        </p>
      )}

      <p className="section-label mb-2">Historial</p>
      {isPending ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-12" />)}
        </div>
      ) : movimientos.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">Sin movimientos registrados</p>
      ) : (
        <div className="space-y-2">
          {movimientos.map((m) => {
            const info = TIPO_INFO[m.tipo]
            return (
              <div key={m.id} className="flex items-center gap-3 p-3 bg-surface-700 rounded-xl">
                <span className="text-lg flex-shrink-0">{info.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">{m.descripcion || info.label}</p>
                  <p className="text-xs text-gray-400">{fmtDate(m.fecha)}</p>
                </div>
                <p className={cn('text-sm font-semibold font-mono flex-shrink-0', info.signo === '+' ? 'text-bad' : 'text-ok')}>
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
    </Modal>
  )
}

function ClienteAdeudoCard({ cliente, onTap, onPagar }) {
  const dias = diasDesde(cliente.adeudo_desde)
  const s = semaforo(dias)

  return (
    <div className="card p-4">
      <button onClick={() => onTap(cliente)} className="flex items-center gap-3 w-full text-left">
        <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0', s.bg)}>
          👤
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{cliente.nombre}</p>
          <p className={cn('text-xs font-medium', s.color)}>{dias} {dias === 1 ? 'día' : 'días'} de atraso</p>
        </div>
        <p className="text-sm font-mono font-bold text-white flex-shrink-0">{fmt(cliente.saldo_pendiente)}</p>
      </button>
      <button
        onClick={() => onPagar(cliente)}
        className="mt-3 w-full py-2 rounded-xl border border-ok/30 text-xs font-medium text-ok hover:bg-ok/10 transition-all"
      >
        Registrar pago
      </button>
    </div>
  )
}

export default function CobrosPage() {
  const { data: clientesAdeudo = [], isPending } = useClientesConAdeudo()
  const { data: todosClientes = [] } = useClientes()

  const [detalle, setDetalle]         = useState(null)
  const [cargoOpen, setCargoOpen]     = useState(false)
  const [pagoCliente, setPagoCliente] = useState(null)

  const totalPorCobrar = clientesAdeudo.reduce((s, c) => s + Number(c.saldo_pendiente), 0)

  return (
    <>
      <div className="top-header">
        <div>
          <p className="section-label">Por cobrar</p>
          <p className="text-xl font-bold font-mono text-bad">{fmt(totalPorCobrar)}</p>
          {clientesAdeudo.length > 0 && (
            <p className="text-[11px] text-gray-400">
              {clientesAdeudo.length} cliente{clientesAdeudo.length !== 1 ? 's' : ''} con adeudo
            </p>
          )}
        </div>
      </div>

      <div className="page px-4 pt-4">
        {isPending ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="skeleton h-24" />)}
          </div>
        ) : clientesAdeudo.length === 0 ? (
          <EmptyState
            emoji="✅" title="Nadie te debe"
            description="Cuando registres un cargo pendiente de cobro aparecerá aquí"
          />
        ) : (
          <div className="space-y-3">
            {clientesAdeudo.map((c) => (
              <ClienteAdeudoCard key={c.id} cliente={c} onTap={setDetalle} onPagar={setPagoCliente} />
            ))}
          </div>
        )}
      </div>

      <button onClick={() => setCargoOpen(true)} className="fab">
        <Plus size={24} />
      </button>

      <DetalleCliente cliente={detalle} onClose={() => setDetalle(null)} />

      <FormCargoCliente open={cargoOpen} onClose={() => setCargoOpen(false)} clientes={todosClientes} />

      <FormPagoCliente open={!!pagoCliente} onClose={() => setPagoCliente(null)} cliente={pagoCliente} />
    </>
  )
}
