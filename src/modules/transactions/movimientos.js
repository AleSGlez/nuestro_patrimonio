// src/modules/transactions/movimientos.js
// Helpers de la vista de Movimientos: categorías, método de pago, periodos
import { format, subDays, subMonths, addDays, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { parsearMetodoPago, rangoDeMes } from './hooks/useTransacciones'
import { CAT_GASTO, CAT_INGRESO, CAT_NEGOCIO_GASTO, CAT_NEGOCIO_INGRESO, TIPO_EMOJI_CUENTA, currentMonth, today, fmtDate } from '@lib/utils'

// Categorías sin repetir ('otros' está en varias listas)
export const TODAS_CATEGORIAS = [...CAT_GASTO, ...CAT_INGRESO, ...CAT_NEGOCIO_GASTO, ...CAT_NEGOCIO_INGRESO]
  .filter((c, i, arr) => arr.findIndex((x) => x.value === c.value) === i)

export function getCatInfo(value) {
  return TODAS_CATEGORIAS.find((c) => c.value === value) || { emoji: '📦', label: value || 'Sin categoría' }
}

// Clave de filtro de cuenta/tarjeta: "cuenta:UUID" | "tarjeta:UUID".
// Un pago con apartado cuenta como su cuenta.
export function claveMetodo(tx) {
  const m = parsearMetodoPago(tx.metodo_pago, tx.cuenta_id, tx.tarjeta_id)
  if (!m) return null
  if (m.tipo === 'apartado') return `cuenta:${m.cuentaId}`
  return `${m.tipo}:${m.id}`
}

// Método de pago a grandes rasgos: tarjeta de crédito, cuenta (débito) o efectivo
export const TIPOS_PAGO = [
  { value: 'credito',  label: '💳 Tarjeta de crédito', corto: 'Crédito',  barra: 'bg-warn' },
  { value: 'debito',   label: '🏦 Débito / cuenta',    corto: 'Débito',   barra: 'bg-info' },
  { value: 'efectivo', label: '💵 Efectivo',           corto: 'Efectivo', barra: 'bg-ok' },
]

export function tipoPago(tx, cuentasMap) {
  const m = parsearMetodoPago(tx.metodo_pago, tx.cuenta_id, tx.tarjeta_id)
  if (!m) return null
  if (m.tipo === 'tarjeta') return 'credito'
  return cuentasMap[m.tipo === 'apartado' ? m.cuentaId : m.id]?.tipo === 'efectivo' ? 'efectivo' : 'debito'
}

// Una transferencia toma el tipo de donde sale el dinero
export function tipoPagoTransferencia(t, cuentasMap) {
  if (t.tipo === 'disposicion_efectivo') return 'credito'
  return cuentasMap[t.origen_cuenta_id]?.tipo === 'efectivo' ? 'efectivo' : 'debito'
}

// "🏦 BBVA Ale" / "💳 BBVA Azul" / "🏦 BBVA Ale (apartado)"
export function etiquetaMetodo(tx, cuentasMap, tarjetasMap) {
  const m = parsearMetodoPago(tx.metodo_pago, tx.cuenta_id, tx.tarjeta_id)
  if (!m) return null
  if (m.tipo === 'tarjeta') {
    const t = tarjetasMap[m.id]
    return t ? `💳 ${t.nombre}` : '💳 Tarjeta eliminada'
  }
  const c = cuentasMap[m.tipo === 'apartado' ? m.cuentaId : m.id]
  if (!c) return '🏦 Cuenta eliminada'
  return `${TIPO_EMOJI_CUENTA[c.tipo] || '🏦'} ${c.nombre}${m.tipo === 'apartado' ? ' (apartado)' : ''}`
}

// Pastilla de quién: p1 acento, p2 azul cielo, ambos gris
export const PERSONA_PILL = {
  p1:    'text-[var(--accent-light)] bg-[var(--accent-muted)]',
  p2:    'text-sky-300 bg-sky-400/15',
  ambos: 'text-gray-300 bg-white/[0.08]',
}

const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1)

// periodo: { tipo: 'mes', mes } | { tipo: 'hoy' | '7d' | '3m' } | { tipo: 'rango', desde, hasta }
export function rangoDePeriodo(periodo) {
  const hoy = today()
  switch (periodo.tipo) {
    case 'hoy': return { desde: hoy, hasta: hoy, titulo: 'Hoy' }
    case '7d':  return { desde: format(subDays(new Date(), 6), 'yyyy-MM-dd'), hasta: hoy, titulo: 'Últimos 7 días' }
    case '3m':  return { desde: format(addDays(subMonths(new Date(), 3), 1), 'yyyy-MM-dd'), hasta: hoy, titulo: 'Últimos 3 meses' }
    case 'rango': return {
      desde: periodo.desde || undefined,
      hasta: periodo.hasta || undefined,
      titulo: periodo.desde && periodo.hasta
        ? `Del ${fmtDate(periodo.desde)} al ${fmtDate(periodo.hasta)}`
        : periodo.desde ? `Desde el ${fmtDate(periodo.desde)}`
        : periodo.hasta ? `Hasta el ${fmtDate(periodo.hasta)}` : 'Todas las fechas',
    }
    default: {
      const { desde, hasta } = rangoDeMes(periodo.mes)
      return { desde, hasta, titulo: capital(format(parseISO(desde), 'MMMM yyyy', { locale: es })) }
    }
  }
}

export const PERIODO_INICIAL = { tipo: 'mes', mes: currentMonth() }

// Encabezado de cada día: "Hoy" / "Ayer" / "Sábado" + fecha corta
export function tituloDia(fecha) {
  const hoy = today()
  const ayer = format(subDays(new Date(), 1), 'yyyy-MM-dd')
  if (fecha === hoy)  return { titulo: 'Hoy',  sub: format(parseISO(fecha), "EEEE d 'de' MMM", { locale: es }) }
  if (fecha === ayer) return { titulo: 'Ayer', sub: format(parseISO(fecha), "EEEE d 'de' MMM", { locale: es }) }
  return { titulo: capital(format(parseISO(fecha), 'EEEE', { locale: es })), sub: format(parseISO(fecha), "d 'de' MMM yyyy", { locale: es }) }
}
