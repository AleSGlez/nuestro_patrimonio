// src/modules/transactions/TransactionsPage.jsx
// Movimientos: gastos, ingresos y transferencias en una sola lista por día,
// con resumen del periodo, filtros rápidos y detalle al tocar cada fila.
import { useState, useMemo } from 'react'
import { Plus, Search, X, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, addMonths, parseISO } from 'date-fns'
import { useTransacciones, useEliminarTransaccion } from './hooks/useTransacciones'
import { useTransferenciasList } from './hooks/useTransferenciasList'
import { useEliminarTransferencia } from '@modules/accounts/hooks/useTransferencias'
import { useCuentas } from '@modules/accounts/hooks/useCuentas'
import { useTarjetas } from '@modules/cards/hooks/useTarjetas'
import { useAppStore } from '@store/appStore'
import { useToast } from '@ui/Toast'
import { useConfirm } from '@ui/ConfirmDialog'
import { EmptyState } from '@ui/Field'
import FormTransaccion from './components/FormTransaccion'
import TransferRow, { TIPO_TRANSFERENCIA, extremosTransferencia } from './components/TransferRow'
import FiltrosMovimientos, { FILTROS_VACIOS } from './components/FiltrosMovimientos'
import DetalleMovimiento from './components/DetalleMovimiento'
import { getCatInfo, claveMetodo, etiquetaMetodo, PERSONA_PILL, rangoDePeriodo, PERIODO_INICIAL, tituloDia } from './movimientos'
import { fmt, cn, currentMonth } from '@lib/utils'

const TIPOS = [['todo', 'Todo'], ['gasto', 'Gastos'], ['ingreso', 'Ingresos'], ['transfer', 'Transferencias']]

function TxRow({ tx, nombres, cuentasMap, tarjetasMap, onOpen }) {
  const isIngreso = tx.tipo === 'ingreso'
  const cat = getCatInfo(tx.categoria)
  const metodo = etiquetaMetodo(tx, cuentasMap, tarjetasMap)
  const personaLabel = tx.persona === 'p1' ? nombres.p1 : tx.persona === 'p2' ? nombres.p2 : 'Ambos'

  return (
    <button
      onClick={() => onOpen(tx)}
      className="w-full flex items-center gap-3 min-h-[60px] px-3 py-2 text-left border-t border-white/[0.05] first:border-0 active:bg-white/[0.03]"
    >
      <div className={cn('w-[38px] h-[38px] rounded-xl flex items-center justify-center text-[17px] flex-shrink-0',
        isIngreso ? 'bg-ok/[0.12]' : 'bg-surface-700')}>
        {cat.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm text-white font-medium truncate">{tx.descripcion || cat.label}</p>
          {tx.contexto === 'negocio' && (
            <span className="flex-shrink-0 text-[9px] font-bold uppercase tracking-wide text-warn bg-warn/[0.14] px-1.5 py-0.5 rounded-md">Negocio</span>
          )}
        </div>
        <p className="text-[11px] text-gray-400 truncate mt-0.5">{cat.label}{metodo && ` · ${metodo}`}</p>
      </div>
      <div className="flex-shrink-0 flex flex-col items-end gap-1">
        <span className={cn('text-sm font-semibold font-mono', isIngreso ? 'text-ok' : 'text-white')}>
          {isIngreso ? '+' : '-'}{fmt(tx.monto)}
        </span>
        <span className={cn('text-[10px] font-semibold px-1.5 py-px rounded-full', PERSONA_PILL[tx.persona] || PERSONA_PILL.ambos)}>
          {personaLabel}
        </span>
      </div>
    </button>
  )
}

// Resumen del periodo: gastado, ingresos y cuánto queda
function ResumenPeriodo({ gastos, ingresos }) {
  const pct = ingresos > 0 ? Math.round((gastos / ingresos) * 100) : null
  const queda = ingresos - gastos
  return (
    <div className="card p-3.5 mb-3">
      <div className="flex items-end justify-between gap-2.5 mb-2.5">
        <div>
          <p className="section-label mb-0.5">Gastado</p>
          <p className="text-[26px] leading-tight font-bold font-mono text-white">{fmt(gastos)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-gray-400">Ingresos</p>
          <p className="text-sm font-bold font-mono text-ok">+{fmt(ingresos)}</p>
        </div>
      </div>
      {pct !== null && (
        <>
          <div className="h-1.5 bg-surface-500 rounded-full overflow-hidden mb-1.5">
            <div className={cn('h-full rounded-full', pct > 100 ? 'bg-bad' : 'bg-[var(--accent)]')} style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-gray-400">{pct}% de lo que entró</span>
            {queda >= 0
              ? <span className="text-gray-300">Te quedan <span className="font-mono font-bold text-ok">{fmt(queda)}</span></span>
              : <span className="text-gray-300">Gastaste <span className="font-mono font-bold text-bad">{fmt(-queda)}</span> de más</span>}
          </div>
        </>
      )}
    </div>
  )
}

export default function TransactionsPage() {
  const { nombres } = useAppStore()
  const toast = useToast()
  const confirmar = useConfirm()
  const { data: cuentas = [] } = useCuentas()
  const { data: tarjetas = [] } = useTarjetas()
  const eliminar = useEliminarTransaccion()
  const eliminarTransf = useEliminarTransferencia()

  const [periodo, setPeriodo]       = useState(PERIODO_INICIAL)
  const [filtros, setFiltros]       = useState(FILTROS_VACIOS)
  const [tipo, setTipo]             = useState('todo')
  const [search, setSearch]         = useState('')
  const [filtrosOpen, setFiltrosOpen] = useState(false)
  const [detalle, setDetalle]       = useState(null) // { kind, data }
  const [formOpen, setFormOpen]     = useState(false)
  const [editTx, setEditTx]         = useState(null)
  const [plantilla, setPlantilla]   = useState(null)

  const { desde, hasta, titulo } = rangoDePeriodo(periodo)
  const { data: transacciones = [], isPending: txPending } = useTransacciones({ desde, hasta })
  const { data: transferencias = [], isPending: transfPending } = useTransferenciasList({ desde, hasta })

  const cuentasMap  = useMemo(() => Object.fromEntries(cuentas.map((c) => [c.id, c])), [cuentas])
  const tarjetasMap = useMemo(() => Object.fromEntries(tarjetas.map((t) => [t.id, t])), [tarjetas])

  const nombrePersona = (p) => (p === 'p1' ? nombres.p1 : p === 'p2' ? nombres.p2 : 'Ambos')

  // Filtros de chips + búsqueda (sin el de tipo, para poder contar por tipo)
  const txFiltradas = useMemo(() => {
    const q = search.toLowerCase().trim()
    return transacciones.filter((t) => {
      if (filtros.personas.length && !filtros.personas.includes(t.persona)) return false
      if (filtros.contextos.length && !filtros.contextos.includes(t.contexto)) return false
      if (filtros.categorias.length && !filtros.categorias.includes(t.categoria)) return false
      if (filtros.cuentas.length && !filtros.cuentas.includes(claveMetodo(t))) return false
      if (q) {
        const texto = [t.descripcion, getCatInfo(t.categoria).label, nombrePersona(t.persona),
          etiquetaMetodo(t, cuentasMap, tarjetasMap)].join(' ').toLowerCase()
        if (!texto.includes(q)) return false
      }
      return true
    })
  }, [transacciones, filtros, search, cuentasMap, tarjetasMap, nombres])

  // Las transferencias no tienen persona, contexto ni categoría: con esos
  // filtros activos se ocultan; el de cuenta sí aplica (origen o destino)
  const transfFiltradas = useMemo(() => {
    if (filtros.personas.length || filtros.contextos.length || filtros.categorias.length) return []
    const q = search.toLowerCase().trim()
    return transferencias.filter((t) => {
      if (filtros.cuentas.length) {
        const claves = [
          t.origen_cuenta_id && `cuenta:${t.origen_cuenta_id}`,
          t.destino_cuenta_id && `cuenta:${t.destino_cuenta_id}`,
          t.destino_tarjeta_id && `tarjeta:${t.destino_tarjeta_id}`,
        ]
        if (!claves.some((k) => k && filtros.cuentas.includes(k))) return false
      }
      if (q) {
        const { origen, destino } = extremosTransferencia(t, cuentasMap, tarjetasMap)
        const texto = [t.descripcion, TIPO_TRANSFERENCIA[t.tipo]?.label, origen, destino].join(' ').toLowerCase()
        if (!texto.includes(q)) return false
      }
      return true
    })
  }, [transferencias, filtros, search, cuentasMap, tarjetasMap])

  const conteos = {
    todo: txFiltradas.length + transfFiltradas.length,
    gasto: txFiltradas.filter((t) => t.tipo === 'gasto').length,
    ingreso: txFiltradas.filter((t) => t.tipo === 'ingreso').length,
    transfer: transfFiltradas.length,
  }

  const totales = useMemo(() => ({
    gastos:   txFiltradas.filter((t) => t.tipo === 'gasto').reduce((s, t) => s + Number(t.monto), 0),
    ingresos: txFiltradas.filter((t) => t.tipo === 'ingreso').reduce((s, t) => s + Number(t.monto), 0),
  }), [txFiltradas])

  // Lista unificada agrupada por día, más reciente primero
  const dias = useMemo(() => {
    const items = [
      ...(tipo === 'transfer' ? [] : txFiltradas.filter((t) => tipo === 'todo' || t.tipo === tipo).map((t) => ({ kind: 'tx', data: t }))),
      ...(tipo === 'todo' || tipo === 'transfer' ? transfFiltradas.map((t) => ({ kind: 'transfer', data: t })) : []),
    ]
    const grupos = {}
    items.forEach((it) => { (grupos[it.data.fecha] = grupos[it.data.fecha] || []).push(it) })
    return Object.entries(grupos)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([fecha, lista]) => {
        lista.sort((a, b) => String(b.data.created_at || '').localeCompare(String(a.data.created_at || '')))
        // Subtotal del día: ingresos − gastos (las transferencias no cambian el total)
        const neto = lista.reduce((s, it) => it.kind !== 'tx' ? s
          : s + (it.data.tipo === 'ingreso' ? 1 : -1) * Number(it.data.monto), 0)
        return { fecha, lista, neto }
      })
  }, [txFiltradas, transfFiltradas, tipo])

  const mesActual = currentMonth()
  const esPorMes = periodo.tipo === 'mes'
  const moverMes = (n) => setPeriodo({ tipo: 'mes', mes: format(addMonths(parseISO(`${periodo.mes}-01`), n), 'yyyy-MM') })
  const nFiltros = filtros.personas.length + filtros.contextos.length + filtros.cuentas.length + filtros.categorias.length
    + (esPorMes && periodo.mes === mesActual ? 0 : 1)
  const cargando = txPending || transfPending

  const limpiarTodo = () => { setFiltros(FILTROS_VACIOS); setPeriodo(PERIODO_INICIAL) }

  const abrirForm = ({ tx = null, base = null } = {}) => {
    setDetalle(null); setEditTx(tx); setPlantilla(base); setFormOpen(true)
  }

  const handleEliminar = async ({ kind, data }) => {
    if (kind === 'transfer') {
      if (!(await confirmar({ message: '¿Ah, te equivocaste? Solo confirma y la eliminamos.' }))) return
      try {
        await eliminarTransf.mutateAsync({ transferencia: data, cuentas, tarjetas })
        setDetalle(null)
        toast.success('Transferencia eliminada')
      } catch (e) { toast.error(e.message) }
      return
    }
    if (!(await confirmar({ message: `¿Eliminar este movimiento de ${fmt(data.monto)}?` }))) return
    try {
      await eliminar.mutateAsync({ tx: data, cuentas, tarjetas })
      setDetalle(null)
      toast.success('Movimiento eliminado')
    } catch (e) { toast.error(e.message) }
  }

  return (
    <>
      <div className="top-header flex-col items-stretch !h-auto pb-3">
        {/* Periodo: flechas por mes, o el periodo elegido en Filtros */}
        <div className="flex items-center justify-between mb-2">
          {esPorMes ? (
            <>
              <button onClick={() => moverMes(-1)} aria-label="Mes anterior" className="icon-btn -ml-3 text-gray-400">
                <ChevronLeft size={18} />
              </button>
              <span className="text-[15px] font-bold text-white">{titulo}</span>
              <button onClick={() => moverMes(1)} aria-label="Mes siguiente" disabled={periodo.mes >= mesActual}
                className="icon-btn -mr-3 text-gray-400 disabled:text-gray-700">
                <ChevronRight size={18} />
              </button>
            </>
          ) : (
            <>
              <span className="text-[15px] font-bold text-white min-h-[44px] flex items-center">{titulo}</span>
              <button onClick={() => setPeriodo(PERIODO_INICIAL)} className="min-h-[44px] text-xs font-semibold text-[var(--accent-light)]">
                Ver por mes
              </button>
            </>
          )}
        </div>

        <ResumenPeriodo gastos={totales.gastos} ingresos={totales.ingresos} />

        {/* Búsqueda + filtros */}
        <div className="flex gap-2 mb-2.5">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search" value={search} onChange={(e) => setSearch(e.target.value)}
              aria-label="Buscar movimientos"
              placeholder={`Buscar: súper, Uber, ${nombres.p2}…`}
              className="input-sm pl-9 pr-9 min-h-[44px]"
            />
            {search && (
              <button onClick={() => setSearch('')} aria-label="Borrar búsqueda" className="absolute right-0 top-0 h-full w-10 flex items-center justify-center text-gray-400">
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={() => setFiltrosOpen(true)}
            aria-label={nFiltros > 0 ? `Filtros, ${nFiltros} activos` : 'Filtros'}
            className={cn('relative w-11 h-11 flex-shrink-0 rounded-xl border flex items-center justify-center',
              nFiltros > 0 ? 'bg-[var(--accent-muted)] border-[var(--accent)]/40 text-[var(--accent-light)]' : 'bg-surface-700 border-white/[0.08] text-gray-300')}
          >
            <SlidersHorizontal size={17} />
            {nFiltros > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--accent)] text-white text-[10px] font-bold flex items-center justify-center">
                {nFiltros}
              </span>
            )}
          </button>
        </div>

        {/* Filtro rápido por tipo */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {TIPOS.map(([id, label]) => (
            <button key={id} onClick={() => setTipo(id)} aria-pressed={tipo === id}
              className={cn('flex-shrink-0 min-h-[36px] px-3 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all',
                tipo === id ? 'bg-[var(--accent-muted)] border-[var(--accent)] text-[var(--accent-light)]'
                  : 'bg-surface-700 border-white/[0.06] text-gray-300')}>
              {label} {conteos[id]}
            </button>
          ))}
        </div>
      </div>

      <div className="page px-4">
        {cargando ? (
          <div className="space-y-3 mt-4">
            {[1, 2, 3].map((i) => <div key={i} className="skeleton h-40" />)}
          </div>
        ) : dias.length === 0 ? (
          <EmptyState
            emoji={search || nFiltros > 0 || tipo !== 'todo' ? '🔍' : '💸'}
            title={search || nFiltros > 0 || tipo !== 'todo' ? 'Sin resultados' : 'Sin movimientos'}
            description={search || nFiltros > 0 || tipo !== 'todo'
              ? 'Prueba con otra palabra o quita un filtro'
              : 'Registra tu primer ingreso o gasto'}
            action={
              search || nFiltros > 0 || tipo !== 'todo'
                ? <button onClick={() => { limpiarTodo(); setSearch(''); setTipo('todo') }} className="btn-ghost px-5 py-2.5 text-sm">Quitar filtros</button>
                : <button onClick={() => abrirForm()} className="btn-primary px-6 py-2.5 text-sm"><Plus size={15} /> Agregar</button>
            }
          />
        ) : (
          dias.map(({ fecha, lista, neto }) => {
            const { titulo: tDia, sub } = tituloDia(fecha)
            return (
              <div key={fecha} className="mt-3.5">
                <div className="flex items-baseline justify-between gap-2 mb-1.5 px-0.5">
                  <p className="text-xs font-semibold text-gray-200">
                    {tDia} <span className="font-normal text-gray-400">· {sub}</span>
                  </p>
                  {neto !== 0 && (
                    <p className={cn('text-[11px] font-mono font-semibold', neto > 0 ? 'text-ok' : 'text-gray-400')}>
                      {neto > 0 ? '+' : '-'}{fmt(Math.abs(neto))}
                    </p>
                  )}
                </div>
                <div className="card overflow-hidden">
                  {lista.map((it) => it.kind === 'tx' ? (
                    <TxRow key={it.data.id} tx={it.data} nombres={nombres}
                      cuentasMap={cuentasMap} tarjetasMap={tarjetasMap}
                      onOpen={(tx) => setDetalle({ kind: 'tx', data: tx })} />
                  ) : (
                    <TransferRow key={it.data.id} transferencia={it.data}
                      cuentasMap={cuentasMap} tarjetasMap={tarjetasMap}
                      onOpen={(t) => setDetalle({ kind: 'transfer', data: t })} />
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>

      <button onClick={() => abrirForm()} aria-label="Nuevo movimiento" className="fab">
        <Plus size={24} />
      </button>

      <FiltrosMovimientos
        open={filtrosOpen} onClose={() => setFiltrosOpen(false)}
        periodo={periodo} setPeriodo={setPeriodo}
        filtros={filtros} setFiltros={setFiltros} onLimpiar={limpiarTodo}
        cuentas={cuentas} tarjetas={tarjetas} nombres={nombres}
        totalResultados={tipo === 'todo' ? conteos.todo : conteos[tipo]}
      />

      <DetalleMovimiento
        item={detalle} onClose={() => setDetalle(null)}
        nombres={nombres} cuentasMap={cuentasMap} tarjetasMap={tarjetasMap}
        onEditar={(tx) => abrirForm({ tx })}
        onRepetir={(tx) => abrirForm({ base: tx })}
        onEliminar={handleEliminar}
      />

      <FormTransaccion
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditTx(null); setPlantilla(null) }}
        tx={editTx}
        plantilla={plantilla}
      />
    </>
  )
}
