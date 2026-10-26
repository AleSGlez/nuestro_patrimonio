// src/modules/cards/CardsPage.jsx
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useTarjetas, useEliminarTarjeta } from './hooks/useTarjetas'
import { useTodasLasComprasMSI, montoRestante } from './hooks/useMSI'
import { useAppStore } from '@store/appStore'
import { useToast } from '@ui/Toast'
import { useConfirm } from '@ui/ConfirmDialog'
import { EmptyState } from '@ui/Field'
import TarjetaCard from './components/TarjetaCard'
import FormTarjeta from './components/FormTarjeta'
import FormPago from './components/FormPago'
import DetalleCorteTarjeta from './components/DetalleCorteTarjeta'
import DetalleMSITarjeta from './components/DetalleMSITarjeta'
import { fmt } from '@lib/utils'

export default function CardsPage() {
  const { data: tarjetas = [], isPending } = useTarjetas()
  const { data: comprasMSI = [] } = useTodasLasComprasMSI()
  const { nombres } = useAppStore()
  const toast = useToast()
  const confirmar = useConfirm()
  const eliminar = useEliminarTarjeta()

  const [formOpen, setFormOpen]     = useState(false)
  const [editTarjeta, setEditTarjeta] = useState(null)
  const [pagoOpen, setPagoOpen]     = useState(false)
  const [pagoTarjeta, setPagoTarjeta] = useState(null)
  const [desgloseOpen, setDesgloseOpen] = useState(false)
  const [desgloseTarjeta, setDesgloseTarjeta] = useState(null)
  const [msiOpen, setMsiOpen] = useState(false)
  const [msiTarjeta, setMsiTarjeta] = useState(null)

  const totalDeuda  = tarjetas.reduce((s, t) => s + Number(t.saldo_total), 0)
  const totalLimite = tarjetas.reduce((s, t) => s + Number(t.limite), 0)

  // Comprometido en MSI por tarjeta — monto de compras a meses sin intereses
  // aún no facturado (ver montoRestante). Se resta del disponible mostrado
  // porque el banco ya reservó ese monto contra la línea de crédito, aunque
  // saldo_total todavía no lo refleje (eso rompería el cálculo del corte).
  const comprometidoPorTarjeta = comprasMSI.reduce((acc, c) => {
    acc[c.tarjeta_id] = (acc[c.tarjeta_id] || 0) + montoRestante(c)
    return acc
  }, {})
  const totalComprometido = Object.values(comprometidoPorTarjeta).reduce((s, v) => s + v, 0)

  const handleDelete = async (t) => {
    if (!(await confirmar({ message: `¿Eliminar la tarjeta "${t.nombre}"?` }))) return
    try {
      await eliminar.mutateAsync(t.id)
      toast.success('Tarjeta eliminada')
    } catch (e) {
      toast.error(e.message)
    }
  }

  return (
    <>
      <div className="top-header">
        <div>
          <p className="section-label">Deuda total en tarjetas</p>
          <p className="text-xl font-bold font-mono text-bad">{fmt(totalDeuda)}</p>
          {totalLimite > 0 && (
            <p className="text-[11px] text-gray-400">
              Disponible: {fmt(totalLimite - totalDeuda - totalComprometido)}
              {totalComprometido > 0 && ` (incluye ${fmt(totalComprometido)} en MSI)`}
            </p>
          )}
        </div>
      </div>

      <div className="page px-4 pt-4">
        {isPending ? (
          <div className="space-y-3">
            {[1,2].map((i) => <div key={i} className="skeleton h-44" />)}
          </div>
        ) : tarjetas.length === 0 ? (
          <EmptyState emoji="💳" title="Sin tarjetas" description="Agrega tu primera tarjeta de crédito" />
        ) : (
          <div className="space-y-3">
            {tarjetas.map((t) => (
              <TarjetaCard
                key={t.id} tarjeta={t} nombres={nombres}
                onEdit={(t) => { setEditTarjeta(t); setFormOpen(true) }}
                onDelete={handleDelete}
                onPagar={(t) => { setPagoTarjeta(t); setPagoOpen(true) }}
                onVerDesglose={(t) => { setDesgloseTarjeta(t); setDesgloseOpen(true) }}
                onVerMSI={(t) => { setMsiTarjeta(t); setMsiOpen(true) }}
                comprometidoMSI={comprometidoPorTarjeta[t.id] || 0}
              />
            ))}
          </div>
        )}
      </div>

      <button onClick={() => { setEditTarjeta(null); setFormOpen(true) }} className="fab" style={{ backgroundColor: 'var(--accent)' }}>
        <Plus size={24} />
      </button>

      <FormTarjeta open={formOpen} onClose={() => { setFormOpen(false); setEditTarjeta(null) }} tarjeta={editTarjeta} />
      <FormPago open={pagoOpen} onClose={() => { setPagoOpen(false); setPagoTarjeta(null) }} tarjeta={pagoTarjeta} />
      <DetalleCorteTarjeta
        open={desgloseOpen}
        onClose={() => { setDesgloseOpen(false); setDesgloseTarjeta(null) }}
        tarjeta={desgloseTarjeta}
        nombres={nombres}
      />
      <DetalleMSITarjeta
        open={msiOpen}
        onClose={() => { setMsiOpen(false); setMsiTarjeta(null) }}
        tarjeta={msiTarjeta}
      />
    </>
  )
}
