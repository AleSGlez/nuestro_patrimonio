// src/modules/reportes/tendencias.js
// Cálculos de la pestaña Tendencias. Este mes siempre se compara contra lo que
// solían llevar los meses anteriores AL MISMO DÍA, para que a principio de mes
// no parezca que todo "bajó".
import { format, subMonths, getDaysInMonth } from 'date-fns'
import { montoParaPersona, CAT_GASTO } from '@lib/utils'

export const MESES_CORTOS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const DIAS_SEMANA = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']
const DIAS_PLURAL = ['lunes','martes','miércoles','jueves','viernes','sábados','domingos']

// Debajo de esto un cambio no se marca como subida o bajada
const UMBRAL_PCT = 0.10
const UMBRAL_MONTO = 200

export function infoCategoria(value) {
  return CAT_GASTO.find((c) => c.value === value) ||
    { value, emoji: '📦', label: value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Sin categoría' }
}

// 'sube' | 'baja' | 'igual'
export function direccion(actual, base) {
  const diff = actual - base
  if (Math.abs(diff) < UMBRAL_MONTO || (base > 0 && Math.abs(diff) / base < UMBRAL_PCT)) return 'igual'
  return diff > 0 ? 'sube' : 'baja'
}

const pct = (actual, base) => (base > 0 ? Math.round(((actual - base) / base) * 100) : null)
const promedio = (vals) => (vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0)
const fechaLocal = (iso) => { const [a, m, d] = iso.split('-').map(Number); return new Date(a, m - 1, d) }
const claveDescripcion = (d) => (d || '').trim().toLowerCase().replace(/\s+/g, ' ')

// Gastos personales (sin negocio ni aportaciones a metas) que le tocan a `persona`.
// 'ambos' = la pareja completa; a una persona los gastos de los dos le cuentan al 50%.
function gastosDe(transacciones, persona) {
  return transacciones
    .filter((t) => t.tipo === 'gasto' && t.contexto !== 'negocio' && t.categoria !== 'ahorro' && t.fecha)
    .filter((t) => persona === 'ambos' || t.persona === persona || t.persona === 'ambos')
    .map((t) => ({
      ...t,
      m: montoParaPersona(t, persona === 'ambos' ? null : persona),
      mes: t.fecha.slice(0, 7),
      dia: Number(t.fecha.slice(8, 10)),
    }))
}

export function calcularTendencias(transacciones, { persona = 'ambos', meses = 6, hoy = new Date() } = {}) {
  const mesActual = format(hoy, 'yyyy-MM')
  const diaHoy = hoy.getDate()
  const diasMes = getDaysInMonth(hoy)
  const previos = Array.from({ length: meses }, (_, i) => format(subMonths(hoy, meses - i), 'yyyy-MM'))
  const mesAnterior = previos[previos.length - 1]

  const gastos = gastosDe(transacciones, persona)
    .filter((g) => g.mes === mesActual || previos.includes(g.mes))

  // Totales por mes: completo y hasta el día de hoy
  const total = {}, hastaHoy = {}
  for (const g of gastos) {
    total[g.mes] = (total[g.mes] || 0) + g.m
    if (g.dia <= diaHoy) hastaHoy[g.mes] = (hastaHoy[g.mes] || 0) + g.m
  }
  // Solo cuentan para el promedio los meses en que ya se registraban gastos
  const conDatos = previos.filter((m) => total[m] > 0)
  const promTotal = promedio(conDatos.map((m) => total[m]))
  const promHastaHoy = promedio(conDatos.map((m) => hastaHoy[m] || 0))
  const llevan = total[mesActual] || 0
  const proyeccion = conDatos.length ? Math.max(llevan, llevan + promTotal - promHastaHoy) : null

  // Acumulado día a día: este mes contra el anterior
  const porDia = (mes) => {
    const arr = Array(32).fill(0)
    gastos.filter((g) => g.mes === mes).forEach((g) => { arr[g.dia] += g.m })
    return arr
  }
  const diaActual = porDia(mesActual), diaAnterior = porDia(mesAnterior)
  const diasMesAnterior = getDaysInMonth(fechaLocal(`${mesAnterior}-01`))
  let acA = 0, acB = 0
  const ritmo = Array.from({ length: diasMes }, (_, i) => {
    const d = i + 1
    acA += diaActual[d]; acB += diaAnterior[d]
    return {
      dia: d,
      actual: d <= diaHoy ? acA : null,
      anterior: d <= diasMesAnterior && total[mesAnterior] ? acB : null,
      proyeccion: proyeccion != null && (d === diaHoy || d === diasMes) ? (d === diaHoy ? acA : proyeccion) : null,
    }
  })

  // Barras por mes (los anteriores con datos + el actual)
  const mesesGrafica = [...conDatos, mesActual]
  const barras = mesesGrafica.map((m) => ({
    mes: m,
    label: MESES_CORTOS[Number(m.slice(5, 7)) - 1],
    total: total[m] || 0,
    esActual: m === mesActual,
  }))

  // Categorías: este mes contra lo que solían llevar a esta fecha
  const cats = [...new Set(gastos.map((g) => g.categoria || 'otros'))]
  const categorias = cats.map((cat) => {
    const deCat = gastos.filter((g) => (g.categoria || 'otros') === cat)
    const tot = {}, hasta = {}
    deCat.forEach((g) => {
      tot[g.mes] = (tot[g.mes] || 0) + g.m
      if (g.dia <= diaHoy) hasta[g.mes] = (hasta[g.mes] || 0) + g.m
    })
    const actual = tot[mesActual] || 0
    const base = promedio(conDatos.map((m) => hasta[m] || 0))
    return {
      categoria: cat,
      info: infoCategoria(cat),
      serie: mesesGrafica.map((m) => tot[m] || 0),
      actual,
      base,
      promedioMensual: promedio(conDatos.map((m) => tot[m] || 0)),
      cambio: pct(actual, base),
      direccion: direccion(actual, base),
      movimientos: deCat.filter((g) => g.mes === mesActual).sort((a, b) => b.fecha.localeCompare(a.fecha)),
    }
  })
    .filter((c) => c.actual > 0 || c.base > 0)
    .sort((a, b) => Math.max(b.actual, b.base) - Math.max(a.actual, a.base))

  // Gastos chiquitos que se repiten en los últimos 30 días
  const hace30 = format(new Date(hoy.getFullYear(), hoy.getMonth(), diaHoy - 30), 'yyyy-MM-dd')
  const grupos = {}
  gastos.filter((g) => g.fecha > hace30).forEach((g) => {
    const k = claveDescripcion(g.descripcion)
    if (!k) return
    grupos[k] = grupos[k] || { nombre: g.descripcion.trim(), veces: 0, total: 0, categoria: g.categoria }
    grupos[k].veces += 1
    grupos[k].total += g.m
  })
  const repetidos = Object.values(grupos)
    .map((r) => ({ ...r, ticket: r.total / r.veces }))
    .filter((r) => r.veces >= 3 && r.ticket <= 600)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  // Promedio por día de la semana desde el primer mes con datos
  const inicio = fechaLocal(`${conDatos[0] || mesActual}-01`)
  const sumaDia = Array(7).fill(0), veces = Array(7).fill(0)
  for (let d = new Date(inicio); d <= hoy; d.setDate(d.getDate() + 1)) veces[(d.getDay() + 6) % 7] += 1
  gastos.filter((g) => fechaLocal(g.fecha) >= inicio).forEach((g) => {
    sumaDia[(fechaLocal(g.fecha).getDay() + 6) % 7] += g.m
  })
  const semana = DIAS_SEMANA.map((label, i) => ({
    label, plural: DIAS_PLURAL[i], promedio: veces[i] ? sumaDia[i] / veces[i] : 0,
  }))

  // Reparto entre Ale, Ruli y los dos (solo tiene sentido viendo a la pareja)
  const reparto = persona !== 'ambos' ? [] : mesesGrafica.map((m) => {
    const delMes = gastos.filter((g) => g.mes === m)
    const suma = (p) => delMes.filter((g) => g.persona === p).reduce((s, g) => s + g.m, 0)
    const p1 = suma('p1'), p2 = suma('p2'), ambos = suma('ambos')
    return { mes: m, label: MESES_CORTOS[Number(m.slice(5, 7)) - 1], p1, p2, ambos, total: p1 + p2 + ambos }
  }).filter((r) => r.total > 0)

  return {
    mesActual, diaHoy, diasMes, mesAnterior,
    hayHistoria: conDatos.length > 0,
    mesesConDatos: conDatos.length,
    llevan, promHastaHoy, promTotal, proyeccion,
    cambioTotal: pct(llevan, promHastaHoy),
    direccionTotal: direccion(llevan, promHastaHoy),
    ritmo, barras, categorias, repetidos, semana, reparto,
  }
}

// Hasta tres frases con lo más relevante del mes
export function frasesDelMes(t, fmt) {
  if (!t.hayHistoria) return []
  const frases = []
  const p = Math.abs(t.cambioTotal ?? 0)
  if (t.direccionTotal === 'igual') {
    frases.push({ dir: 'igual', texto: `Van igual que siempre a estas alturas del mes: ${fmt(t.llevan)}.` })
  } else {
    frases.push({
      dir: t.direccionTotal,
      texto: `Van ${p}% ${t.direccionTotal === 'sube' ? 'arriba' : 'abajo'} de lo que suelen llevar al día ${t.diaHoy}` +
        (t.proyeccion != null ? `; a este ritmo cierran el mes en ${fmt(t.proyeccion)}.` : '.'),
    })
  }
  const cambiaron = t.categorias.filter((c) => c.direccion !== 'igual' && c.base > 0)
  const sube = [...cambiaron].filter((c) => c.direccion === 'sube').sort((a, b) => (b.actual - b.base) - (a.actual - a.base))[0]
  const baja = [...cambiaron].filter((c) => c.direccion === 'baja').sort((a, b) => (a.actual - a.base) - (b.actual - b.base))[0]
  if (sube) frases.push({ dir: 'sube', texto: `${sube.info.label} subió ${sube.cambio}%: ${fmt(sube.actual)} contra ${fmt(sube.base)} que suelen llevar a esta fecha.` })
  if (baja) frases.push({ dir: 'baja', texto: `${baja.info.label} bajó ${Math.abs(baja.cambio)}%, ${fmt(baja.base - baja.actual)} menos de lo usual a esta fecha.` })
  if (frases.length < 3) {
    const top = [...t.semana].sort((a, b) => b.promedio - a.promedio)[0]
    if (top?.promedio > 0) frases.push({ dir: 'igual', texto: `Los ${top.plural} es cuando más gastan: ${fmt(top.promedio)} en promedio.` })
  }
  return frases.slice(0, 3)
}
