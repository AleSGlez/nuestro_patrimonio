// src/shared/lib/utils.js
import { clsx } from 'clsx'

// ── Classnames ───────────────────────────────────────────────
export function cn(...args) { return clsx(args) }

// ── Moneda ───────────────────────────────────────────────────
export function fmt(amount, opts = {}) {
  const n = Number(amount) || 0
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: opts.decimals ?? 2,
    maximumFractionDigits: opts.decimals ?? 2,
  }).format(n)
}

export function fmtCompact(amount) {
  const n = Math.abs(Number(amount) || 0)
  const sign = Number(amount) < 0 ? '-' : ''
  if (n >= 1_000_000) return `${sign}$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${sign}$${(n / 1_000).toFixed(1)}K`
  return fmt(amount)
}

// ── Fechas ───────────────────────────────────────────────────
export function fmtDate(date, style = 'short') {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date + 'T12:00:00') : new Date(date)
  if (isNaN(d)) return ''
  const opts = {
    short:  { day: '2-digit', month: 'short' },
    medium: { day: '2-digit', month: 'short',  year: 'numeric' },
    long:   { day: '2-digit', month: 'long',   year: 'numeric' },
    month:  { month: 'long',  year: 'numeric' },
    iso:    null,
  }
  if (style === 'iso') return d.toISOString().split('T')[0]
  return d.toLocaleDateString('es-MX', opts[style] || opts.short)
}

export function today() {
  return new Date().toISOString().split('T')[0]
}

export function currentMonth() {
  return new Date().toISOString().slice(0, 7) // YYYY-MM
}

// ── UUID ─────────────────────────────────────────────────────
export function uid() {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)
}

// ── Categorías ───────────────────────────────────────────────
export const CAT_GASTO = [
  { value: 'alimentacion',    label: 'Alimentación',    emoji: '🍽️' },
  { value: 'transporte',      label: 'Transporte',      emoji: '🚗' },
  { value: 'entretenimiento', label: 'Entretenimiento', emoji: '🎬' },
  { value: 'salud',           label: 'Salud',           emoji: '💊' },
  { value: 'educacion',       label: 'Educación',       emoji: '📚' },
  { value: 'ropa',            label: 'Ropa',            emoji: '👕' },
  { value: 'servicios',       label: 'Servicios',       emoji: '💡' },
  { value: 'hogar',           label: 'Hogar',           emoji: '🏠' },
  { value: 'viajes',          label: 'Viajes',          emoji: '✈️' },
  { value: 'mascotas',        label: 'Mascotas',        emoji: '🐾' },
  { value: 'regalos',         label: 'Regalos',         emoji: '🎁' },
  { value: 'suscripciones',   label: 'Suscripciones',  emoji: '🔄' },
  { value: 'otros',           label: 'Otros',           emoji: '📦' },
]

export const CAT_INGRESO = [
  { value: 'sueldo',     label: 'Sueldo',      emoji: '💼' },
  { value: 'freelance',  label: 'Freelance',   emoji: '💻' },
  { value: 'negocio',    label: 'Negocio',     emoji: '🏪' },
  { value: 'inversion',  label: 'Inversión',   emoji: '📈' },
  { value: 'regalo',     label: 'Regalo',      emoji: '🎁' },
  { value: 'reembolso',  label: 'Reembolso',   emoji: '↩️' },
  { value: 'otros',      label: 'Otros',       emoji: '📦' },
]

export const CAT_NEGOCIO_GASTO = [
  { value: 'inventario', label: 'Inventario', emoji: '🃏' },
  { value: 'packaging',    label: 'Packaging',    emoji: '📦' },
  { value: 'envios',       label: 'Envíos',       emoji: '🚚' },
  { value: 'publicidad',   label: 'Publicidad',   emoji: '📣' },
  { value: 'plataformas',  label: 'Plataformas',  emoji: '💻' },
  { value: 'herramientas', label: 'Herramientas', emoji: '🔧' },
  { value: 'honorarios',   label: 'Honorarios',   emoji: '🤝' },
  { value: 'operativo',    label: 'Operativo',    emoji: '⚙️' },
  { value: 'otro_negocio', label: 'Otro',         emoji: '📦' },
]

export const CAT_NEGOCIO_INGRESO = [
  { value: 'ventas',        label: 'Ventas',        emoji: '💰' },
  { value: 'servicios',     label: 'Servicios',     emoji: '🛠️' },
  { value: 'comisiones',    label: 'Comisiones',    emoji: '💵' },
  { value: 'otro_negocio_ingreso', label: 'Otro',   emoji: '📦' },
]

export function getCatEmoji(value, tipo = 'gasto', contexto = 'personal') {
  if (contexto === 'negocio') {
    const list = tipo === 'ingreso' ? CAT_NEGOCIO_INGRESO : CAT_NEGOCIO_GASTO
    const found = list.find((c) => c.value === value)
    if (found) return found.emoji
  }
  const list = tipo === 'ingreso' ? CAT_INGRESO : CAT_GASTO
  return list.find((c) => c.value === value)?.emoji || '📦'
}

// ── Colores ──────────────────────────────────────────────────
export const PALETTE = [
  '#7C6EFA','#10B981','#F43F5E','#F59E0B',
  '#3B82F6','#8B5CF6','#EC4899','#06B6D4',
  '#EF4444','#F97316','#84CC16','#14B8A6',
]

// ── Condiciones carta Pokémon ────────────────────────────────
export const CONDICIONES = [
  { value: 'M',   label: 'Mint',           color: '#10B981' },
  { value: 'NM',  label: 'Near Mint',      color: '#22C55E' },
  { value: 'LP',  label: 'Light Played',   color: '#F59E0B' },
  { value: 'MP',  label: 'Moderately Played', color: '#F97316' },
  { value: 'HP',  label: 'Heavily Played', color: '#EF4444' },
  { value: 'DMG', label: 'Damaged',        color: '#7F1D1D' },
]

export const IDIOMAS = [
  { value: 'JP', label: '🇯🇵 Japonés',  flag: '🇯🇵' },
  { value: 'EN', label: '🇺🇸 Inglés',   flag: '🇺🇸' },
  { value: 'ES', label: '🇪🇸 Español',  flag: '🇪🇸' },
  { value: 'FR', label: '🇫🇷 Francés',  flag: '🇫🇷' },
  { value: 'DE', label: '🇩🇪 Alemán',   flag: '🇩🇪' },
  { value: 'IT', label: '🇮🇹 Italiano', flag: '🇮🇹' },
  { value: 'PT', label: '🇧🇷 Portugués',flag: '🇧🇷' },
  { value: 'KO', label: '🇰🇷 Coreano',  flag: '🇰🇷' },
  { value: 'ZH', label: '🇨🇳 Chino',    flag: '🇨🇳' },
]

// ── Gasto efectivo para una persona ──────────────────────────
// Si la transacción es 'ambos', cuenta al 50% para cada persona.
// Si es de la persona específica o el filtro es 'ambos', cuenta al 100%.
export function montoParaPersona(tx, persona) {
  if (!persona || persona === 'ambos') return Number(tx.monto)
  if (tx.persona === 'ambos') return Number(tx.monto) * 0.5
  return Number(tx.monto)
}

// ── Emoji por tipo de cuenta ──────────────────────────────────
export const TIPO_EMOJI_CUENTA = { debito: '💳', ahorro: '🏦', efectivo: '💵', inversion: '📈' }

// ── Filtrado de cuentas/tarjetas válidas para un movimiento ──
// Reglas compartidas entre FormTransaccion y FormAccesoRapido: qué cuentas/tarjetas
// aplican según el contexto (personal/negocio) y la persona responsable.
export function filtrarCuentasPorContexto(cuentas, { contexto, persona }, apartadosNegocio = []) {
  const cuentasConApartadoNegocio = new Set(
    apartadosNegocio.filter((a) => a.es_negocio).map((a) => a.cuenta_id)
  )
  return cuentas.filter((c) => {
    if (contexto === 'negocio') {
      return c.persona === 'negocio' || cuentasConApartadoNegocio.has(c.id)
    }
    if (c.persona === 'negocio') return false
    if (persona === 'ambos') return true
    return c.persona === persona || c.persona === 'ambos'
  })
}

export function filtrarTarjetasPorContexto(tarjetas, { contexto, persona, tipo }) {
  if (tipo === 'ingreso') return []
  return tarjetas.filter((t) => {
    if (contexto === 'negocio') return true
    if (persona === 'ambos') return true
    return t.persona === persona || t.persona === 'ambos'
  })
}

// ── Período de tarjeta de crédito ────────────────────────────
// Dado un día de corte (ej: 7), devuelve el rango del período actual:
// inicio = día 8 del mes anterior, fin = día 7 del mes actual
export function periodoTarjeta(diaCorte, fechaReferencia = new Date()) {
  const ref = new Date(fechaReferencia)
  const año = ref.getFullYear()
  const mes = ref.getMonth() // 0-based

  // Fin del período: día de corte del mes de referencia
  const fin = new Date(año, mes, diaCorte)

  // Si hoy es antes o igual al día de corte, el período es del mes anterior
  // Si hoy es después del corte, el período va del 8 de este mes al 7 del próximo
  let inicio
  if (ref <= fin) {
    // Período: 8 del mes anterior → diaCorte de este mes
    inicio = new Date(año, mes - 1, diaCorte + 1)
  } else {
    // Período: diaCorte+1 de este mes → diaCorte del próximo mes
    inicio = new Date(año, mes, diaCorte + 1)
    fin.setMonth(mes + 1)
    fin.setDate(diaCorte)
  }

  const toISO = (d) => d.toISOString().slice(0, 10)
  return { inicio: toISO(inicio), fin: toISO(fin) }
}

// ── Festivos fijos México (sin año) ───────────────────────────
const FESTIVOS_MX = [
  '01-01', // Año Nuevo
  '02-05', // Constitución
  '03-21', // Natalicio Juárez
  '05-01', // Día del Trabajo
  '09-16', // Independencia
  '11-20', // Revolución
  '12-25', // Navidad
]

function esFestivo(fecha) {
  const mmdd = fecha.toISOString().slice(5, 10)
  return FESTIVOS_MX.includes(mmdd)
}

// ── Quincenas ajustadas a día hábil anterior ─────────────────
// Si el día 15 o 30 cae en sábado, domingo o festivo → retrocede al día hábil anterior
export function quincenasDelMes(año, mes) { // mes: 0-based
  const candidatos = [15, 30]
  // Febrero: usar último día del mes en vez de 30
  const ultimoDia = new Date(año, mes + 1, 0).getDate()

  return candidatos.map((dia) => {
    const d = new Date(año, mes, Math.min(dia, ultimoDia))
    // Retroceder si cae en fin de semana o festivo
    while (d.getDay() === 0 || d.getDay() === 6 || esFestivo(d)) {
      d.setDate(d.getDate() - 1)
    }
    return d.toISOString().slice(0, 10)
  })
}
