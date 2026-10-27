// src/modules/cards/CardsPage.jsx
// Estilo Wallet: plásticos arriba (carrusel en móvil, fila en escritorio) y
// debajo el detalle de la tarjeta seleccionada.
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useTarjetas, useEliminarTarjeta } from './hooks/useTarjetas'
import { useTodasLasComprasMSI, montoRestante } from './hooks/useMSI'
import { useAppStore } from '@store/appStore'
import { useToast } from '@ui/Toast'
import { useConfirm } from '@ui/ConfirmDialog'
import { EmptyState } from '@ui/Field'
import TarjetaPlastico from './components/TarjetaPlastico'
import DetalleTarjeta from './components/DetalleTarjeta'
import FormTarjeta from './components/FormTarjeta'
import FormPago from './components/FormPago'
import DetalleCorteTarjeta from './components/DetalleCorteTarjeta'
import DetalleMSITarjeta from './components/DetalleMSITarjeta'
import { fmt, cn } from '@lib/utils'

export default function CardsPage() {
  const { data: tarjetas = [], isPending } = useTarjetas()
  const { data: comprasMSI = [] } = useTodasLasComprasMSI()
  const { nombres } = useAppStore()
  const toast = useToast()
  const confirmar = useConfirm()
  const eliminar = useEliminarTarjeta()

  const [filtroPersona, setFiltroPersona] = useState('todas')
  const [selId, setSelId] = useState(null)
  const [formOpen, setFormOpen]     = useState(false)
  const [editTarjeta, setEditTarjeta] = useState(null)
  const [pagoOpen, setPagoOpen]     = useState(false)
  const [pagoTarjeta, setPagoTarjeta] = useState(null)
  const [desgloseOpen, setDesgloseOpen] = useState(false)
  const [desgloseTarjeta, setDesgloseTarjeta] = useState(null)
  const [msiOpen, setMsiOpen] = useState(false)
  const [msiTarjeta, setMsiTarjeta] = useState(null)

  // Las compartidas aparecen en el filtro de cada quien
  const visibles = tarjetas.filter((t) =>
    filtroPersona === 'todas' || t.persona === filtroPersona || t.persona === 'ambos')
  const seleccionada = visibles.find((t) => t.id === selId) || visibles[0] || null

  // Comprometido en MSI por tarjeta — monto de compras a meses sin intereses
  // aún no facturado (ver montoRestante). Se resta del disponible mostrado
  // porque el banco ya reservó ese monto contra la línea de crédito, aunque
  // saldo_total todavía no lo refleje (eso rompería el cálculo del corte).
  const comprometidoPorTarjeta = comprasMSI.reduce((acc, c) => {
    acc[c.tarjeta_id] = (acc[c.tarjeta_id] || 0) + montoRestante(c)
    return acc
  }, {})

  const metricas = (t) => {
    const comprometidoMSI = comprometidoPorTarjeta[t.id] || 0
    const usoTotal = Number(t.saldo_total) + comprometidoMSI
    return {
      comprometidoMSI,
      uso: t.limite > 0 ? Math.min(100, (usoTotal / t.limite) * 100) : 0,
      disponible: Math.max(0, t.limite - usoTotal),
    }
  }

  const totalDeuda  = visibles.reduce((s, t) => s + Number(t.saldo_total), 0)
  const totalLimite = visibles.reduce((s, t) => s + Number(t.limite), 0)
  const totalComprometido = visibles.reduce((s, t) => s + (comprometidoPorTarjeta[t.id] || 0), 0)

  const duenoLabel = (t) => ({ p1: nombres.p1, p2: nombres.p2, ambos: 'Compartida' }[t.persona])

  const filtros = [
    { value: 'todas', label: 'Todas' },
    { value: 'p1', label: nombres.p1 },
    { value: 'p2', label: nombres.p2 },
  ]

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
      <div className="top-header flex-col items-stretch !h-auto pb-3 lg:px-10 lg:pt-8 lg:pb-5 lg:border-b-0">
        <div className="lg:max-w-6xl lg:w-full flex items-center lg:items-end justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <p className="text-[22px] lg:text-[26px] font-extrabold text-white leading-tight">Tarjetas</p>
            <p className="text-[11px] lg:text-sm text-gray-400 mt-0.5">
              Debes <span className="font-mono font-semibold text-bad">{fmt(totalDeuda)}</span>
              {' '}en {visibles.length} {visibles.length === 1 ? 'tarjeta' : 'tarjetas'}
              {totalLimite > 0 && (
                <span className="hidden lg:inline">
                  {' '}· disponible <span className="font-mono font-semibold text-ok">{fmt(totalLimite - totalDeuda - totalComprometido)}</span>
                </span>
              )}
            </p>
          </div>
          <div className="flex bg-surface-700 lg:bg-surface-900 lg:border lg:border-white/[0.06] rounded-xl p-[3px] lg:p-1">
            {filtros.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => { setFiltroPersona(f.value); setSelId(null) }}
                className={cn(
                  'min-h-[34px] lg:min-h-[36px] px-3 lg:px-4 rounded-[9px] lg:rounded-[10px] text-xs lg:text-sm font-semibold transition-colors',
                  filtroPersona === f.value ? 'bg-[var(--accent)] text-white' : 'text-gray-400',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="page pt-2 lg:px-10 lg:pt-1">
        <div className="lg:max-w-6xl">
          {isPending ? (
            <div className="px-4 lg:px-0 space-y-3">
              <div className="skeleton h-44 rounded-[20px]" />
              <div className="skeleton h-52" />
            </div>
          ) : visibles.length === 0 ? (
            <div className="px-4 lg:px-0">
              <EmptyState
                emoji="💳"
                title={tarjetas.length === 0 ? 'Sin tarjetas' : 'Sin tarjetas aquí'}
                description={tarjetas.length === 0 ? 'Agrega tu primera tarjeta de crédito' : 'No hay tarjetas para este filtro'}
              />
            </div>
          ) : (
            <>
              {/* Móvil: carrusel con snap · Escritorio: fila que se reparte el ancho */}
              <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory px-4 pt-2 pb-1.5
                              lg:grid lg:grid-cols-[repeat(auto-fill,minmax(190px,1fr))] lg:gap-3.5 lg:overflow-visible lg:px-0 lg:pb-0">
                {visibles.map((t) => (
                  <TarjetaPlastico
                    key={t.id}
                    tarjeta={t}
                    uso={metricas(t).uso}
                    duenoLabel={duenoLabel(t)}
                    activa={t.id === seleccionada?.id}
                    onClick={() => setSelId(t.id)}
                    className="flex-shrink-0 w-[290px] h-[176px] snap-center lg:w-auto lg:h-auto lg:aspect-[1.6]"
                  />
                ))}
              </div>

              {/* Puntos del carrusel (solo móvil) */}
              {visibles.length > 1 && (
                <div className="flex justify-center gap-1.5 pt-1.5 pb-3.5 lg:hidden" aria-hidden="true">
                  {visibles.map((t) => (
                    <span key={t.id} className={cn('h-1.5 rounded-full transition-all',
                      t.id === seleccionada?.id ? 'w-[18px] bg-white' : 'w-1.5 bg-surface-500')} />
                  ))}
                </div>
              )}

              {seleccionada && (
                <div className="px-4 lg:px-0 pb-4 lg:pb-8 lg:mt-5">
                  <DetalleTarjeta
                    key={seleccionada.id}
                    tarjeta={seleccionada}
                    nombres={nombres}
                    {...metricas(seleccionada)}
                    onEdit={(t) => { setEditTarjeta(t); setFormOpen(true) }}
                    onDelete={handleDelete}
                    onPagar={(t) => { setPagoTarjeta(t); setPagoOpen(true) }}
                    onVerDesglose={(t) => { setDesgloseTarjeta(t); setDesgloseOpen(true) }}
                    onVerMSI={(t) => { setMsiTarjeta(t); setMsiOpen(true) }}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <button onClick={() => { setEditTarjeta(null); setFormOpen(true) }} aria-label="Nueva tarjeta" className="fab" style={{ backgroundColor: 'var(--accent)' }}>
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
