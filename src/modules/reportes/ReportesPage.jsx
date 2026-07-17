// src/modules/reportes/ReportesPage.jsx
import { useState, useMemo } from 'react'
import { Download, TrendingUp, TrendingDown, BarChart2, Package } from 'lucide-react'
import { useTransacciones } from '@modules/transactions/hooks/useTransacciones'
import { useVentas } from '@modules/ventas/hooks/useVentas'
import { useProductos } from '@modules/inventario/hooks/useInventario'
import { useCuentas } from '@modules/accounts/hooks/useCuentas'
import { useTarjetas } from '@modules/cards/hooks/useTarjetas'
import { useAppStore } from '@store/appStore'
import SubNav from '@shared/components/layout/SubNav'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { fmt, cn, CAT_GASTO } from '@lib/utils'
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import * as XLSX from 'xlsx'

const TABS = [
  { id: 'personal', label: 'Personal', emoji: '👤' },
  { id: 'negocio',  label: 'Negocio',  emoji: '🏪' },
]

const COLORS = ['#7C6EFA','#10B981','#F59E0B','#EF4444','#3B82F6','#EC4899','#F97316']
const MESES  = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

// ── Selector de período ───────────────────────────────────────
function SelectorPeriodo({ value, onChange }) {
  const opciones = Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(new Date(), i)
    return { value: format(d, 'yyyy-MM'), label: format(d, 'MMMM yyyy', { locale: es }) }
  })
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="input text-sm py-1.5 capitalize">
      {opciones.map((o) => (
        <option key={o.value} value={o.value} className="capitalize">{o.label}</option>
      ))}
    </select>
  )
}

// ── Reporte Personal ─────────────────────────────────────────
function ReportePersonal({ transacciones, cuentas, tarjetas }) {
  const [periodo, setPeriodo] = useState(format(new Date(), 'yyyy-MM'))

  const txMes = useMemo(() => {
    const inicio = periodo + '-01'
    const fin    = format(endOfMonth(parseISO(inicio)), 'yyyy-MM-dd')
    return transacciones.filter((t) =>
      t.contexto !== 'negocio' && t.fecha >= inicio && t.fecha <= fin
    )
  }, [transacciones, periodo])

  const txMesAnterior = useMemo(() => {
    const d = subMonths(parseISO(periodo + '-01'), 1)
    const inicio = format(d, 'yyyy-MM') + '-01'
    const fin    = format(endOfMonth(d), 'yyyy-MM-dd')
    return transacciones.filter((t) =>
      t.contexto !== 'negocio' && t.fecha >= inicio && t.fecha <= fin
    )
  }, [transacciones, periodo])

  const ingresos  = txMes.filter((t) => t.tipo === 'ingreso').reduce((s, t) => s + Number(t.monto), 0)
  const gastos    = txMes.filter((t) => t.tipo === 'gasto').reduce((s, t) => s + Number(t.monto), 0)
  const ingresosAnt = txMesAnterior.filter((t) => t.tipo === 'ingreso').reduce((s, t) => s + Number(t.monto), 0)
  const gastosAnt   = txMesAnterior.filter((t) => t.tipo === 'gasto').reduce((s, t) => s + Number(t.monto), 0)
  const balance   = ingresos - gastos
  const patrimonio = cuentas.filter((c) => c.persona !== 'negocio').reduce((s, c) => s + Number(c.saldo), 0)
    - tarjetas.reduce((s, t) => s + Number(t.saldo_total), 0)

  // Gastos por categoría
  const porCategoria = useMemo(() => {
    const map = {}
    txMes.filter((t) => t.tipo === 'gasto').forEach((t) => {
      map[t.categoria] = (map[t.categoria] || 0) + Number(t.monto)
    })
    return Object.entries(map)
      .map(([cat, monto]) => {
        const info = CAT_GASTO.find((c) => c.value === cat) || { emoji: '📦', label: cat }
        return { name: `${info.emoji} ${info.label}`, value: monto }
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
  }, [txMes])

  // Flujo 6 meses
  const flujo6Meses = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d     = subMonths(new Date(), 5 - i)
      const mes   = format(d, 'yyyy-MM')
      const inicio = mes + '-01'
      const fin    = format(endOfMonth(d), 'yyyy-MM-dd')
      const tx    = transacciones.filter((t) => t.contexto !== 'negocio' && t.fecha >= inicio && t.fecha <= fin)
      return {
        label: MESES[d.getMonth()],
        ingresos: tx.filter((t) => t.tipo === 'ingreso').reduce((s, t) => s + Number(t.monto), 0),
        gastos:   tx.filter((t) => t.tipo === 'gasto').reduce((s, t) => s + Number(t.monto), 0),
      }
    })
  }, [transacciones])

  const diffIngresos = ingresosAnt > 0 ? ((ingresos - ingresosAnt) / ingresosAnt) * 100 : 0
  const diffGastos   = gastosAnt > 0   ? ((gastos - gastosAnt) / gastosAnt) * 100 : 0

  const handleExport = () => {
    const wb = XLSX.utils.book_new()
    // Hoja de transacciones
    const txData = txMes.map((t) => ({
      Fecha: t.fecha, Tipo: t.tipo, Categoría: t.categoria,
      Descripción: t.descripcion, Monto: t.monto, Persona: t.persona,
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(txData), 'Transacciones')
    // Hoja de resumen
    const resumen = [
      ['Período', periodo],
      ['Ingresos', ingresos],
      ['Gastos', gastos],
      ['Balance', balance],
      ['Patrimonio total', patrimonio],
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumen), 'Resumen')
    XLSX.writeFile(wb, `reporte-personal-${periodo}.xlsx`)
  }

  return (
    <div className="page px-4 pt-4 space-y-4">
      {/* Selector + exportar */}
      <div className="flex gap-2">
        <div className="flex-1"><SelectorPeriodo value={periodo} onChange={setPeriodo} /></div>
        <button onClick={handleExport} className="btn-ghost px-3 py-1.5 text-xs flex-shrink-0">
          <Download size={14} /> Excel
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <p className="text-[10px] text-gray-400 mb-1">Ingresos</p>
          <p className="text-xl font-bold font-mono text-ok">{fmt(ingresos)}</p>
          {ingresosAnt > 0 && (
            <p className={cn('text-[11px] mt-1', diffIngresos >= 0 ? 'text-ok' : 'text-bad')}>
              {diffIngresos >= 0 ? '▲' : '▼'} {Math.abs(Math.round(diffIngresos))}% vs mes anterior
            </p>
          )}
        </div>
        <div className="card p-4">
          <p className="text-[10px] text-gray-400 mb-1">Gastos</p>
          <p className="text-xl font-bold font-mono text-bad">{fmt(gastos)}</p>
          {gastosAnt > 0 && (
            <p className={cn('text-[11px] mt-1', diffGastos <= 0 ? 'text-ok' : 'text-bad')}>
              {diffGastos >= 0 ? '▲' : '▼'} {Math.abs(Math.round(diffGastos))}% vs mes anterior
            </p>
          )}
        </div>
        <div className={cn('card p-4', balance >= 0 ? 'border-ok/20' : 'border-bad/20')}>
          <p className="text-[10px] text-gray-400 mb-1">Balance del mes</p>
          <p className={cn('text-xl font-bold font-mono', balance >= 0 ? 'text-ok' : 'text-bad')}>
            {balance >= 0 ? '+' : ''}{fmt(balance)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] text-gray-400 mb-1">Patrimonio total</p>
          <p className="text-xl font-bold font-mono text-white">{fmt(patrimonio)}</p>
        </div>
      </div>

      {/* Gráfica 6 meses */}
      <div className="card p-4">
        <p className="text-sm font-semibold text-white mb-3">Flujo últimos 6 meses</p>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={flujo6Meses} barCategoryGap="25%">
            <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: '#1a1a2e', border: 'none', borderRadius: 12, fontSize: 12 }} />
            <Bar dataKey="ingresos" name="Ingresos" fill="#10B981" radius={[4,4,0,0]} maxBarSize={20} />
            <Bar dataKey="gastos"   name="Gastos"   fill="#EF4444" radius={[4,4,0,0]} maxBarSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top categorías */}
      {porCategoria.length > 0 && (
        <div className="card p-4">
          <p className="text-sm font-semibold text-white mb-3">Gastos por categoría</p>
          <div className="space-y-2">
            {porCategoria.map((cat, i) => {
              const pct = gastos > 0 ? (cat.value / gastos) * 100 : 0
              return (
                <div key={cat.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-300">{cat.name}</span>
                    <span className="font-mono text-white">{fmt(cat.value)} <span className="text-gray-400">({Math.round(pct)}%)</span></span>
                  </div>
                  <div className="h-1.5 bg-surface-500 rounded-full">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {txMes.length === 0 && (
        <div className="card p-6 text-center">
          <p className="text-gray-400 text-sm">Sin transacciones en este período</p>
        </div>
      )}
    </div>
  )
}

// ── Reporte Negocio ───────────────────────────────────────────
function ReporteNegocio({ transacciones, ventas, productos }) {
  const [periodo, setPeriodo] = useState(format(new Date(), 'yyyy-MM'))

  const ventasMes = useMemo(() => {
    const inicio = periodo + '-01'
    const fin    = format(endOfMonth(parseISO(inicio)), 'yyyy-MM-dd')
    return ventas.filter((v) => v.estado === 'completada' && v.fecha >= inicio && v.fecha <= fin)
  }, [ventas, periodo])

  const totalVentas   = ventasMes.reduce((s, v) => s + Number(v.total_venta), 0)
  const totalGanancia = ventasMes.reduce((s, v) => s + Number(v.ganancia), 0)
  const totalCosto    = ventasMes.reduce((s, v) => s + Number(v.total_costo), 0)
  const margenProm    = totalVentas > 0 ? (totalGanancia / totalVentas) * 100 : 0

  const txNegocioMes = useMemo(() => {
    const inicio = periodo + '-01'
    const fin    = format(endOfMonth(parseISO(inicio)), 'yyyy-MM-dd')
    return transacciones.filter((t) => t.contexto === 'negocio' && t.fecha >= inicio && t.fecha <= fin)
  }, [transacciones, periodo])

  const gastosNegocio = txNegocioMes.filter((t) => t.tipo === 'gasto').reduce((s, t) => s + Number(t.monto), 0)

  // Ganancia 6 meses
  const ganancia6Meses = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const d     = subMonths(new Date(), 5 - i)
    const inicio = format(d, 'yyyy-MM') + '-01'
    const fin    = format(endOfMonth(d), 'yyyy-MM-dd')
    const vMes  = ventas.filter((v) => v.estado === 'completada' && v.fecha >= inicio && v.fecha <= fin)
    return {
      label: MESES[d.getMonth()],
      ventas:   vMes.reduce((s, v) => s + Number(v.total_venta), 0),
      ganancia: vMes.reduce((s, v) => s + Number(v.ganancia), 0),
    }
  }), [ventas])

  // Stock actual
  const totalStock    = productos.filter((p) => p.activo).reduce((s, p) => s + Number(p.cantidad_stock), 0)
  const valorStock    = productos.filter((p) => p.activo).reduce((s, p) => s + (Number(p.precio_unitario_compra) + Number(p.costo_extra_prorrateado)) * Number(p.cantidad_stock), 0)
  const valorPotencial = productos.filter((p) => p.activo && p.precio_venta).reduce((s, p) => s + Number(p.precio_venta) * Number(p.cantidad_stock), 0)

  const handleExport = () => {
    const wb = XLSX.utils.book_new()
    // Ventas del período
    const ventasData = ventasMes.map((v) => ({
      Fecha: v.fecha, Total: v.total_venta, Costo: v.total_costo,
      Ganancia: v.ganancia, 'Método cobro': v.metodo_cobro, 'Comisión': v.comision_monto,
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ventasData), 'Ventas')
    // Inventario actual
    const invData = productos.filter((p) => p.activo).map((p) => ({
      'Nombre JP': p.nombre_jp, 'Nombre EN': p.nombre_en,
      Serie: p.serie, Número: p.numero_carta,
      'Stock actual': p.cantidad_stock, 'Precio compra': p.precio_unitario_compra,
      'Costo extra': p.costo_extra_prorrateado,
      'Costo real': Number(p.precio_unitario_compra) + Number(p.costo_extra_prorrateado),
      'Precio venta': p.precio_venta,
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(invData), 'Inventario')
    XLSX.writeFile(wb, `reporte-negocio-${periodo}.xlsx`)
  }

  return (
    <div className="page px-4 pt-4 space-y-4">
      <div className="flex gap-2">
        <div className="flex-1"><SelectorPeriodo value={periodo} onChange={setPeriodo} /></div>
        <button onClick={handleExport} className="btn-ghost px-3 py-1.5 text-xs flex-shrink-0">
          <Download size={14} /> Excel
        </button>
      </div>

      {/* KPIs ventas */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <p className="text-[10px] text-gray-400 mb-1">Ventas ({ventasMes.length})</p>
          <p className="text-xl font-bold font-mono text-white">{fmt(totalVentas)}</p>
        </div>
        <div className="card p-4 border-ok/20">
          <p className="text-[10px] text-gray-400 mb-1">Ganancia neta</p>
          <p className="text-xl font-bold font-mono text-ok">{fmt(totalGanancia)}</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] text-gray-400 mb-1">Costo de ventas</p>
          <p className="text-xl font-bold font-mono text-bad">{fmt(totalCosto)}</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] text-gray-400 mb-1">Margen promedio</p>
          <p className="text-xl font-bold font-mono text-[var(--accent)]">{Math.round(margenProm)}%</p>
        </div>
      </div>

      {/* Gráfica ganancia 6 meses */}
      <div className="card p-4">
        <p className="text-sm font-semibold text-white mb-3">Ventas vs Ganancia — 6 meses</p>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={ganancia6Meses} barCategoryGap="25%">
            <XAxis dataKey="label" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: '#1a1a2e', border: 'none', borderRadius: 12, fontSize: 12 }} />
            <Bar dataKey="ventas"   name="Ventas"   fill="#7C6EFA" radius={[4,4,0,0]} maxBarSize={20} />
            <Bar dataKey="ganancia" name="Ganancia" fill="#10B981" radius={[4,4,0,0]} maxBarSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Estado del inventario */}
      <div className="card p-4">
        <p className="text-sm font-semibold text-white mb-3">📦 Estado del inventario</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[10px] text-gray-400">Cartas en stock</p>
            <p className="text-lg font-bold text-white">{totalStock}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400">Valor invertido</p>
            <p className="text-sm font-bold font-mono text-bad">{fmt(valorStock)}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400">Valor de venta</p>
            <p className="text-sm font-bold font-mono text-ok">{fmt(valorPotencial)}</p>
          </div>
        </div>
        {valorPotencial > 0 && (
          <div className="mt-3 pt-3 border-t border-white/[0.06]">
            <p className="text-xs text-gray-400 text-center">
              Ganancia potencial si vendes todo: <span className="text-ok font-bold">{fmt(valorPotencial - valorStock)}</span>
            </p>
          </div>
        )}
      </div>

      {ventasMes.length === 0 && (
        <div className="card p-6 text-center">
          <p className="text-gray-400 text-sm">Sin ventas registradas en este período</p>
        </div>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────
export default function ReportesPage() {
  const [tab, setTab] = useState('personal')
  const { data: transacciones = [] } = useTransacciones()
  const { data: ventas = [] }        = useVentas()
  const { data: productos = [] }     = useProductos()
  const { data: cuentas = [] }       = useCuentas()
  const { data: tarjetas = [] }      = useTarjetas()

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      <SubNav tabs={TABS} active={tab} onChange={setTab} titulo="Reportes" />
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {tab === 'personal'
          ? <ReportePersonal transacciones={transacciones} cuentas={cuentas} tarjetas={tarjetas} />
          : <ReporteNegocio  transacciones={transacciones} ventas={ventas} productos={productos} />
        }
      </div>
    </div>
  )
}
