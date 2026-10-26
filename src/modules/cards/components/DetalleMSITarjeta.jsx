// src/modules/cards/components/DetalleMSITarjeta.jsx
import { useState } from 'react'
import { Plus, Pencil, Ban, FastForward } from 'lucide-react'
import Modal from '@ui/Modal'
import { EmptyState, ProgressBar } from '@ui/Field'
import Spinner from '@ui/Spinner'
import { useToast } from '@ui/Toast'
import { useConfirm } from '@ui/ConfirmDialog'
import { useCuentas } from '@modules/accounts/hooks/useCuentas'
import { useTarjetas } from '../hooks/useTarjetas'
import { useComprasMSI, useRegistrarPagoMSI, useCancelarCompraMSI, mesesRestantes, montoRestante } from '../hooks/useMSI'
import FormCompraMSI from './FormCompraMSI'
import { fmt, fmtDate, getCatEmoji } from '@lib/utils'

function FilaMSI({ compra, cuentas, tarjetas, onEditar }) {
  const toast = useToast()
  const confirmar = useConfirm()
  const registrar = useRegistrarPagoMSI()
  const cancelar = useCancelarCompraMSI()
  const restantes = mesesRestantes(compra)
  const [cantidad, setCantidad] = useState(1)

  const handleRegistrar = async () => {
    try {
      await registrar.mutateAsync({ compra, cantidad, cuentas, tarjetas })
      toast.success(cantidad > 1 ? `${cantidad} mensualidades registradas ✅` : 'Mensualidad registrada ✅')
      setCantidad(1)
    } catch (e) {
      toast.error(e.message)
    }
  }

  const handleCancelar = async () => {
    if (!(await confirmar({
      title: 'Cancelar compra MSI',
      message: `Ya no se registrarán más mensualidades de "${compra.descripcion}". Lo ya cobrado no se modifica.`,
      confirmLabel: 'Cancelar plan',
    }))) return
    try {
      await cancelar.mutateAsync(compra.id)
      toast.success('Plan MSI cancelado')
    } catch (e) {
      toast.error(e.message)
    }
  }

  if (!compra.activa) {
    return (
      <div className="card p-3.5 opacity-60">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-300 flex items-center gap-1.5">
            <span>{getCatEmoji(compra.categoria, 'gasto', compra.contexto)}</span>
            {compra.descripcion}
          </p>
          <span className="badge-ok text-[10px]">Liquidada ✅</span>
        </div>
        <p className="text-[11px] text-gray-500 mt-1">{fmt(compra.monto_total)} · {compra.meses_total} MSI</p>
      </div>
    )
  }

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between mb-2">
        <p className="text-sm font-semibold text-white flex items-center gap-1.5">
          <span>{getCatEmoji(compra.categoria, 'gasto', compra.contexto)}</span>
          {compra.descripcion}
        </p>
        <div className="flex gap-1">
          <button onClick={() => onEditar(compra)} aria-label="Editar" className="icon-btn text-gray-500 hover:text-white">
            <Pencil size={13} />
          </button>
          <button onClick={handleCancelar} aria-label="Cancelar plan" className="icon-btn text-gray-500 hover:text-bad">
            <Ban size={13} />
          </button>
        </div>
      </div>

      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>{compra.meses_pagados}/{compra.meses_total} meses</span>
        <span>Restante: {fmt(montoRestante(compra))}</span>
      </div>
      <ProgressBar value={compra.meses_pagados} max={compra.meses_total} className="mb-3" />

      <div className="flex justify-between items-center mb-3">
        <div>
          <p className="text-[11px] text-gray-400">Mensualidad</p>
          <p className="text-base font-bold font-mono text-white">{fmt(compra.monto_mensual)}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-gray-400">Próximo cargo</p>
          <p className="text-sm font-mono text-gray-300">{fmtDate(compra.proxima_fecha)}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center bg-surface-700 rounded-xl">
          <button
            onClick={() => setCantidad((c) => Math.max(1, c - 1))}
            className="w-8 h-9 flex items-center justify-center text-gray-300 disabled:opacity-30"
            disabled={cantidad <= 1}
          >−</button>
          <span className="w-8 text-center text-sm font-mono">{cantidad}</span>
          <button
            onClick={() => setCantidad((c) => Math.min(restantes, c + 1))}
            className="w-8 h-9 flex items-center justify-center text-gray-300 disabled:opacity-30"
            disabled={cantidad >= restantes}
          >+</button>
        </div>
        <button
          onClick={handleRegistrar}
          disabled={registrar.isPending}
          className="flex-1 py-2 rounded-xl text-xs font-semibold border border-[var(--accent)]/30 text-[var(--accent)] hover:bg-[var(--accent-muted)] transition-all flex items-center justify-center gap-1.5"
        >
          {registrar.isPending ? <Spinner size="sm" /> : (
            <>{cantidad > 1 ? <FastForward size={13} /> : null}
            {cantidad > 1 ? `Adelantar ${cantidad} pagos` : 'Registrar pago'}</>
          )}
        </button>
      </div>
    </div>
  )
}

export default function DetalleMSITarjeta({ open, onClose, tarjeta }) {
  const { data: compras = [], isPending } = useComprasMSI(tarjeta?.id)
  const { data: cuentas = [] } = useCuentas()
  const { data: tarjetas = [] } = useTarjetas()
  const [formOpen, setFormOpen] = useState(false)
  const [editCompra, setEditCompra] = useState(null)

  if (!tarjeta) return null

  const activas = compras.filter((c) => c.activa)
  const liquidadas = compras.filter((c) => !c.activa)

  return (
    <>
      <Modal open={open && !formOpen} onClose={onClose} title={`MSI — ${tarjeta.nombre}`}>
        <button
          onClick={() => { setEditCompra(null); setFormOpen(true) }}
          className="btn-primary w-full py-3 text-sm font-semibold mb-4"
        >
          <Plus size={16} />Nueva compra a MSI
        </button>

        {isPending ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <div key={i} className="skeleton h-32" />)}
          </div>
        ) : compras.length === 0 ? (
          <EmptyState
            emoji="🧾" title="Sin compras a meses sin intereses"
            description="Cuando compres algo a MSI, regístralo aquí para que el corte solo incluya una mensualidad a la vez."
          />
        ) : (
          <div className="space-y-3">
            {activas.map((c) => (
              <FilaMSI
                key={c.id} compra={c} cuentas={cuentas} tarjetas={tarjetas}
                onEditar={(c) => { setEditCompra(c); setFormOpen(true) }}
              />
            ))}
            {liquidadas.length > 0 && (
              <>
                <p className="section-label mt-4">Liquidadas</p>
                {liquidadas.map((c) => <FilaMSI key={c.id} compra={c} cuentas={cuentas} tarjetas={tarjetas} onEditar={() => {}} />)}
              </>
            )}
          </div>
        )}
      </Modal>

      <FormCompraMSI
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditCompra(null) }}
        tarjeta={tarjeta}
        compra={editCompra}
      />
    </>
  )
}
