// supabase/functions/registrar-recurrentes/index.ts
// Cron: cada día a las 9am hora México (15:00 UTC)
// Registra suscripciones y transacciones recurrentes vencidas

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

function siguienteFecha(fecha: string, frecuencia: string): string {
  const d = new Date(fecha + 'T12:00:00Z')
  switch (frecuencia) {
    case 'diaria':     d.setDate(d.getDate() + 1); break
    case 'semanal':    d.setDate(d.getDate() + 7); break
    case 'mensual':    d.setMonth(d.getMonth() + 1); break
    case 'bimestral':  d.setMonth(d.getMonth() + 2); break
    case 'trimestral': d.setMonth(d.getMonth() + 3); break
    case 'semestral':  d.setMonth(d.getMonth() + 6); break
    case 'anual':      d.setFullYear(d.getFullYear() + 1); break
  }
  return d.toISOString().slice(0, 10)
}

Deno.serve(async (req) => {
  const hoy = new Date().toISOString().slice(0, 10)
  let registradas = 0

  // ── Suscripciones vencidas ─────────────────────────────────
  const { data: suscripciones } = await supabase
    .from('suscripciones')
    .select('*')
    .neq('estado', 'cancelada')
    .lte('proxima_fecha', hoy)

  for (const sus of suscripciones || []) {
    try {
      // Crear transacción
      await supabase.from('transacciones').insert({
        pareja_id: sus.pareja_id,
        tipo: 'gasto',
        monto: sus.monto,
        categoria: sus.categoria || 'suscripciones',
        descripcion: sus.nombre,
        fecha: sus.proxima_fecha,
        persona: sus.persona,
        contexto: sus.contexto || 'personal',
        metodo_pago: sus.cuenta_id ? `cuenta:${sus.cuenta_id}` : sus.tarjeta_id ? `tarjeta:${sus.tarjeta_id}` : null,
      })

      // Descontar de cuenta si aplica
      if (sus.cuenta_id) {
        const { data: cuenta } = await supabase.from('cuentas').select('saldo').eq('id', sus.cuenta_id).single()
        if (cuenta) {
          await supabase.from('cuentas').update({ saldo: Number(cuenta.saldo) - Number(sus.monto) }).eq('id', sus.cuenta_id)
        }
      }

      // Avanzar fecha
      await supabase.from('suscripciones').update({
        proxima_fecha: siguienteFecha(sus.proxima_fecha, sus.frecuencia),
        ultimo_pago_fecha: sus.proxima_fecha,
      }).eq('id', sus.id)

      registradas++
    } catch (e) { console.error('Error suscripcion', sus.id, e) }
  }

  // ── Transacciones recurrentes vencidas ────────────────────
  const { data: recurrentes } = await supabase
    .from('transacciones_recurrentes')
    .select('*')
    .eq('activa', true)
    .lte('proxima_fecha', hoy)

  for (const rec of recurrentes || []) {
    try {
      await supabase.from('transacciones').insert({
        pareja_id: rec.pareja_id,
        tipo: rec.tipo,
        monto: rec.monto,
        categoria: rec.categoria || (rec.tipo === 'ingreso' ? 'otros_ingresos' : 'otros'),
        descripcion: rec.nombre,
        fecha: rec.proxima_fecha,
        persona: rec.persona,
        contexto: rec.contexto,
        metodo_pago: rec.cuenta_id ? `cuenta:${rec.cuenta_id}` : null,
      })

      if (rec.cuenta_id) {
        const { data: cuenta } = await supabase.from('cuentas').select('saldo').eq('id', rec.cuenta_id).single()
        if (cuenta) {
          const delta = rec.tipo === 'ingreso' ? 1 : -1
          await supabase.from('cuentas').update({ saldo: Number(cuenta.saldo) + delta * Number(rec.monto) }).eq('id', rec.cuenta_id)
        }
      }

      await supabase.from('transacciones_recurrentes').update({
        proxima_fecha: siguienteFecha(rec.proxima_fecha, rec.frecuencia),
      }).eq('id', rec.id)

      registradas++
    } catch (e) { console.error('Error recurrente', rec.id, e) }
  }

  return new Response(JSON.stringify({ ok: true, registradas }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
