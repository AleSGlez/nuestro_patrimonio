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
  { value: 'packaging',    label: 'Packaging',    emoji: '📦' },
  { value: 'envios',       label: 'Envíos',       emoji: '🚚' },
  { value: 'publicidad',   label: 'Publicidad',   emoji: '📣' },
  { value: 'plataformas',  label: 'Plataformas',  emoji: '💻' },
  { value: 'herramientas', label: 'Herramientas', emoji: '🔧' },
  { value: 'operativo',    label: 'Operativo',    emoji: '⚙️' },
  { value: 'otro',         label: 'Otro',         emoji: '📦' },
]

export function getCatEmoji(value, tipo = 'gasto') {
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
