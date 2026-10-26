// supabase/functions/enviar-notificaciones/index.ts
// Cron: mismo horario que registrar-recurrentes (15:00 UTC = 9am México).
// Manda notificaciones push nativas (Web Push + VAPID) a los dispositivos
// registrados en push_subscriptions por:
//   - Tarjetas: corte en ≤2 días, límite de pago en ≤5 días
//   - Suscripciones: se cobran en ≤2 días
//   - Presupuestos personales excedidos
//
// Esta es la MISMA lógica (ventanas de días, criterios) que
// src/modules/notificaciones/hooks/useAlertas.js en el frontend — si cambias
// un criterio allá, cámbialo aquí también.
//
// Secretos requeridos (Supabase Dashboard → Edge Functions → Secrets):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:tu@correo.com)
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY ya existen por defecto en todo
// proyecto de Supabase, no hay que configurarlos a mano.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') || 'mailto:soporte@example.com',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!
)

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function diasHasta(fechaISO: string | null): number | null {
  if (!fechaISO) return null
  const fecha = new Date(fechaISO + 'T00:00:00Z').getTime()
  const hoy   = new Date(hoyISO() + 'T00:00:00Z').getTime()
  return Math.round((fecha - hoy) / 86400000)
}

function fmt(n: number): string {
  return '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Puerto exacto de calcularFechasCorte (src/modules/cards/hooks/useTarjetas.js)
function calcularFechasCorte(diaCorte: number, diaLimitePago: number | null) {
  const hoy = new Date(hoyISO() + 'T00:00:00Z')
  const año = hoy.getUTCFullYear()
  const mes = hoy.getUTCMonth()

  let corteProximo = new Date(Date.UTC(año, mes, diaCorte))
  if (corteProximo < hoy) corteProximo = new Date(Date.UTC(año, mes + 1, diaCorte))

  let limite: Date | null = null
  if (diaLimitePago) {
    let ultimoCorte = new Date(Date.UTC(año, mes, diaCorte))
    if (ultimoCorte > hoy) ultimoCorte = new Date(Date.UTC(año, mes - 1, diaCorte))

    limite = new Date(Date.UTC(ultimoCorte.getUTCFullYear(), ultimoCorte.getUTCMonth(), diaLimitePago))
    if (diaLimitePago <= diaCorte) {
      limite = new Date(Date.UTC(ultimoCorte.getUTCFullYear(), ultimoCorte.getUTCMonth() + 1, diaLimitePago))
    }
    if (limite < hoy) {
      limite = new Date(Date.UTC(corteProximo.getUTCFullYear(), corteProximo.getUTCMonth(), diaLimitePago))
      if (diaLimitePago <= diaCorte) {
        limite = new Date(Date.UTC(corteProximo.getUTCFullYear(), corteProximo.getUTCMonth() + 1, diaLimitePago))
      }
    }
  }

  const toISO = (d: Date | null) => d ? d.toISOString().slice(0, 10) : null
  return { corte: toISO(corteProximo), limite: toISO(limite) }
}

type Alerta = { clave: string; emoji: string; titulo: string; detalle: string }

// Mismo cálculo de roll-over que calcularDisponible (src/modules/presupuestos/hooks/usePresupuestos.js)
async function presupuestosExcedidos(parejaId: string): Promise<Alerta[]> {
  const alertas: Alerta[] = []
  const hoy = hoyISO()

  const { data: presupuestos } = await supabase
    .from('presupuestos').select('*').eq('pareja_id', parejaId).eq('activo', true)

  for (const p of presupuestos || []) {
    if (p.contexto && p.contexto !== 'personal') continue

    const { data: txs } = await supabase
      .from('transacciones').select('monto,persona,fecha')
      .eq('pareja_id', parejaId).eq('tipo', 'gasto').neq('contexto', 'negocio')
      .gte('fecha', p.fecha_inicio)

    const inicio = new Date(p.fecha_inicio + 'T00:00:00Z').getTime()
    const hoyMs  = new Date(hoy + 'T00:00:00Z').getTime()
    const msDia  = 86400000
    const hoyD   = new Date(hoy + 'T00:00:00Z')
    const inicioD = new Date(p.fecha_inicio + 'T00:00:00Z')

    let periodos = 1
    if (p.tipo === 'diario')  periodos = Math.round((hoyMs - inicio) / msDia) + 1
    if (p.tipo === 'semanal') periodos = Math.floor((hoyMs - inicio) / (msDia * 7)) + 1
    if (p.tipo === 'mensual') {
      periodos = (hoyD.getUTCFullYear() - inicioD.getUTCFullYear()) * 12
        + (hoyD.getUTCMonth() - inicioD.getUTCMonth()) + 1
    }

    const acumulado = Number(p.monto_base) * Math.max(1, periodos)
    const gastado = (txs || [])
      .filter((t: any) => p.persona === 'ambos' || t.persona === p.persona || t.persona === 'ambos')
      .reduce((s: number, t: any) => {
        const factor = (p.persona !== 'ambos' && t.persona === 'ambos') ? 0.5 : 1
        return s + Number(t.monto) * factor
      }, 0)

    const disponible = acumulado - gastado
    if (disponible < 0) {
      alertas.push({
        clave: `presupuesto:${p.id}:${hoy}`,
        emoji: p.emoji || '🎯',
        titulo: `Presupuesto "${p.nombre}" excedido`,
        detalle: `-${fmt(Math.abs(disponible))}`,
      })
    }
  }

  return alertas
}

async function alertasDePareja(parejaId: string): Promise<Alerta[]> {
  const alertas: Alerta[] = []

  // ── Tarjetas: límite de pago y corte próximos ──────────────
  const { data: tarjetas } = await supabase
    .from('tarjetas').select('*').eq('pareja_id', parejaId).eq('activa', true)

  for (const t of tarjetas || []) {
    if (!t.dia_corte || !t.dia_limite_pago) continue
    const { corte, limite } = calcularFechasCorte(t.dia_corte, t.dia_limite_pago)

    const diasLimite = diasHasta(limite)
    if (diasLimite !== null && diasLimite >= 0 && diasLimite <= 5) {
      alertas.push({
        clave: `tarjeta:${t.id}:limite:${limite}`,
        emoji: '📅',
        titulo: `Pago de ${t.nombre} vence ${diasLimite === 0 ? 'hoy' : `en ${diasLimite} día${diasLimite === 1 ? '' : 's'}`}`,
        detalle: fmt(t.saldo_periodo_anterior || t.saldo_total),
      })
    }

    const diasCorte = diasHasta(corte)
    if (diasCorte !== null && diasCorte >= 0 && diasCorte <= 2) {
      alertas.push({
        clave: `tarjeta:${t.id}:corte:${corte}`,
        emoji: '✂️',
        titulo: `${t.nombre} corta ${diasCorte === 0 ? 'hoy' : `en ${diasCorte} día${diasCorte === 1 ? '' : 's'}`}`,
        detalle: fmt(t.gastos_periodo_actual),
      })
    }
  }

  // ── Suscripciones próximas a cobrarse ──────────────────────
  const { data: suscripciones } = await supabase
    .from('suscripciones').select('*').eq('pareja_id', parejaId).eq('estado', 'activa')

  for (const s of suscripciones || []) {
    const dias = diasHasta(s.proxima_fecha)
    if (dias !== null && dias >= 0 && dias <= 2) {
      alertas.push({
        clave: `suscripcion:${s.id}:${s.proxima_fecha}`,
        emoji: s.emoji || '🔄',
        titulo: `${s.nombre} se cobra ${dias === 0 ? 'hoy' : `en ${dias} día${dias === 1 ? '' : 's'}`}`,
        detalle: fmt(s.monto),
      })
    }
  }

  alertas.push(...await presupuestosExcedidos(parejaId))

  return alertas
}

Deno.serve(async () => {
  let enviadas = 0
  let desactivadas = 0
  let omitidas = 0

  const { data: subs } = await supabase
    .from('push_subscriptions').select('*').eq('activa', true)

  const porPareja = new Map<string, any[]>()
  for (const s of subs || []) {
    if (!porPareja.has(s.pareja_id)) porPareja.set(s.pareja_id, [])
    porPareja.get(s.pareja_id)!.push(s)
  }

  for (const [parejaId, subsPareja] of porPareja) {
    let alertas: Alerta[] = []
    try {
      alertas = await alertasDePareja(parejaId)
    } catch (e) {
      console.error('Error calculando alertas de pareja', parejaId, e)
      continue
    }
    if (alertas.length === 0) continue

    for (const sub of subsPareja) {
      for (const a of alertas) {
        // No repetir el mismo aviso el mismo día en el mismo dispositivo
        const { data: yaEnviado } = await supabase
          .from('push_enviados').select('id')
          .eq('subscription_id', sub.id).eq('clave', a.clave).eq('fecha', hoyISO())
          .maybeSingle()
        if (yaEnviado) { omitidas++; continue }

        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify({ title: `${a.emoji} ${a.titulo}`, body: a.detalle, tag: a.clave })
          )
          await supabase.from('push_enviados').insert({ subscription_id: sub.id, clave: a.clave })
          await supabase.from('push_subscriptions').update({ last_sent_at: new Date().toISOString() }).eq('id', sub.id)
          enviadas++
        } catch (e: any) {
          // 404/410 = el navegador invalidó esta suscripción (se desinstaló la app,
          // se borraron datos del sitio, etc.) — se desactiva para no reintentar siempre.
          if (e?.statusCode === 404 || e?.statusCode === 410) {
            await supabase.from('push_subscriptions').update({ activa: false }).eq('id', sub.id)
            desactivadas++
          } else {
            console.error('Error enviando push', sub.id, a.clave, e)
          }
        }
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, enviadas, desactivadas, omitidas }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
