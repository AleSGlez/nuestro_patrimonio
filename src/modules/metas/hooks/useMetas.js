// src/modules/metas/hooks/useMetas.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from '@lib/supabase'
import { useAuthStore } from '@store/authStore'
import { aplicarEfecto, revertirEfecto } from '@modules/transactions/hooks/useTransacciones'
import { differenceInDays, differenceInMonths, format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export function useMetas() {
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useQuery({
    queryKey: ['metas', parejaId],
    queryFn: () => db.from('metas').query(
      `pareja_id=eq.${parejaId}&activa=eq.true&order=created_at.asc`
    ),
    enabled: !!parejaId,
    staleTime: 1000 * 60 * 2,
  })
}

export function useAportaciones(metaId) {
  return useQuery({
    queryKey: ['metas-aportaciones', metaId],
    queryFn: () => db.from('metas_aportaciones').query(
      `meta_id=eq.${metaId}&order=fecha.desc`
    ),
    enabled: !!metaId,
    staleTime: 1000 * 60,
  })
}

// Todas las aportaciones de la pareja — para el ritmo de cada meta y el
// resumen "este mes aportaron"
export function useTodasAportaciones() {
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useQuery({
    queryKey: ['metas-aportaciones', 'todas', parejaId],
    queryFn: () => db.from('metas_aportaciones').query(
      `pareja_id=eq.${parejaId}&order=fecha.desc&limit=1000`
    ),
    enabled: !!parejaId,
    staleTime: 1000 * 60,
  })
}

export function useCrearMeta() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useMutation({
    mutationFn: (data) => db.from('metas').insert({ ...data, pareja_id: parejaId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['metas', parejaId] }),
  })
}

export function useActualizarMeta() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useMutation({
    mutationFn: ({ id, data }) => db.from('metas').update(data, { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['metas', parejaId] }),
  })
}

export function useEliminarMeta() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useMutation({
    mutationFn: (id) => db.from('metas').update({ activa: false }, { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['metas', parejaId] }),
  })
}

// Registra una aportación a la meta:
// 1. Descuenta de la cuenta si se especifica
// 2. Suma al monto_actual de la meta
// 3. Marca como completada si llega al objetivo
export function useAportar() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useMutation({
    mutationFn: async ({ meta, monto, fecha, nota, cuentaId, cuentas, persona }) => {
      const montoNum = Number(monto)
      // Quién aporta: el elegido en el form, si no la persona de la meta
      const quien = persona || meta.persona

      // 1. Si sale de una cuenta: crear la transacción de gasto y aplicar su
      // efecto (mismo camino que cualquier gasto de la app). Se crea PRIMERO
      // para poder guardar transaccion_id en la aportación y así revertirla después.
      let transaccionId = null
      if (cuentaId) {
        const [tx] = await db.from('transacciones').insert({
          pareja_id: parejaId,
          tipo: 'gasto',
          monto: montoNum,
          categoria: 'ahorro',
          descripcion: `Aportación: ${meta.nombre}`,
          fecha, persona: quien,
          contexto: 'personal',
          metodo_pago: `cuenta:${cuentaId}`,
          cuenta_id: cuentaId,
        })
        await aplicarEfecto(tx, { cuentas, tarjetas: [] })
        transaccionId = tx.id
      }

      // 2. Registrar aportación (ligada a su transacción, si la hay)
      await db.from('metas_aportaciones').insert({
        meta_id: meta.id,
        pareja_id: parejaId,
        monto: montoNum,
        fecha, nota: nota || null,
        cuenta_id: cuentaId || null,
        transaccion_id: transaccionId,
        persona: quien,
      })

      // 3. Actualizar monto_actual de la meta
      const nuevoMonto = Number(meta.monto_actual) + montoNum
      const completada = nuevoMonto >= Number(meta.monto_objetivo)
      await db.from('metas').update({
        monto_actual: nuevoMonto,
        completada,
      }, { id: meta.id })
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['metas', parejaId] })
      qc.invalidateQueries({ queryKey: ['metas-aportaciones'] }) // la de la meta y 'todas'
      if (vars.cuentaId) {
        qc.invalidateQueries({ queryKey: ['cuentas', parejaId] })
        qc.invalidateQueries({ queryKey: ['transacciones', parejaId] })
      }
    },
  })
}

// Elimina una aportación revirtiendo TODO lo que generó:
// 1. Resta el monto de la meta y recalcula `completada`
// 2. Si tiene transacción vinculada: revierte el saldo de la cuenta y la borra
//    (aportaciones viejas sin transaccion_id: se restaura la cuenta directo)
// 3. Borra la aportación
export function useEliminarAportacion() {
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)
  return useMutation({
    mutationFn: async ({ aportacion, meta, cuentas = [] }) => {
      const m = Number(aportacion.monto)

      const nuevoMonto = Math.max(0, Number(meta.monto_actual) - m)
      await db.from('metas').update({
        monto_actual: nuevoMonto,
        completada: nuevoMonto >= Number(meta.monto_objetivo),
      }, { id: meta.id })

      if (aportacion.transaccion_id) {
        const [tx] = await db.from('transacciones').query(`id=eq.${aportacion.transaccion_id}`)
        if (tx) {
          await revertirEfecto(tx, { cuentas, tarjetas: [] })
          await db.from('transacciones').delete({ id: tx.id })
        }
      } else if (aportacion.cuenta_id) {
        // Aportación registrada antes de que existiera transaccion_id — la tx de
        // gasto queda huérfana en Movimientos; si también se borra desde ahí, la
        // cuenta se restauraría doble. Devolver el dinero aquí es lo menos malo.
        const [cuenta] = await db.from('cuentas').query(`id=eq.${aportacion.cuenta_id}`)
        if (cuenta) {
          await db.from('cuentas').update(
            { saldo: Number(cuenta.saldo) + m }, { id: cuenta.id }
          )
        }
      }

      await db.from('metas_aportaciones').delete({ id: aportacion.id })
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['metas', parejaId] })
      qc.invalidateQueries({ queryKey: ['metas-aportaciones'] }) // la de la meta y 'todas'
      qc.invalidateQueries({ queryKey: ['cuentas', parejaId] })
      qc.invalidateQueries({ queryKey: ['transacciones', parejaId] })
    },
  })
}

// ── Cálculos de la meta ───────────────────────────────────────
export function calcularMeta(meta) {
  const objetivo   = Number(meta.monto_objetivo)
  const actual     = Number(meta.monto_actual)
  const faltante   = Math.max(0, objetivo - actual)
  const pct        = objetivo > 0 ? Math.min(100, Math.round((actual / objetivo) * 100)) : 0

  let diasRestantes = null
  let mesesRestantes = null
  let aportacionMensual = null
  let aportacionQuincenal = null

  if (meta.fecha_objetivo && faltante > 0) {
    const hoy = new Date()
    const fechaObj = parseISO(meta.fecha_objetivo)
    diasRestantes  = differenceInDays(fechaObj, hoy)
    mesesRestantes = Math.max(1, differenceInMonths(fechaObj, hoy))
    // Por días reales (un mes ≈ 30.4 días): differenceInMonths redondea hacia
    // abajo y con 8.6 meses pedía de más por quincena
    aportacionMensual   = faltante / Math.max(1, diasRestantes / 30.4)
    aportacionQuincenal = faltante / Math.max(1, diasRestantes / 15.2)
  }

  return { objetivo, actual, faltante, pct, diasRestantes, mesesRestantes, aportacionMensual, aportacionQuincenal }
}

// ── Ritmo: ¿al paso que van, llegan a tiempo? ─────────────────
// ritmoQuincenal = lo aportado en los últimos 90 días (o desde la primera
// aportación si es más reciente) repartido por quincena.
// estado: 'completada' | 'sin_fecha' | 'a_tiempo' | 'atrasada' | 'sin_aportes'
const DIAS_VENTANA = 90

export function calcularRitmo(meta, aportaciones = []) {
  const { faltante, pct, aportacionQuincenal } = calcularMeta(meta)
  const hoy = new Date()

  const propias = aportaciones.filter((a) => a.meta_id === meta.id)
  const desde = format(new Date(hoy.getTime() - DIAS_VENTANA * 864e5), 'yyyy-MM-dd')
  const recientes = propias.filter((a) => a.fecha >= desde)
  const primera = propias.reduce((min, a) => (!min || a.fecha < min ? a.fecha : min), null)
  // Días observados: la ventana completa, o desde la primera aportación (mínimo 15)
  const diasObservados = primera && primera > desde
    ? Math.max(15, differenceInDays(hoy, parseISO(primera)))
    : DIAS_VENTANA
  const totalReciente = recientes.reduce((s, a) => s + Number(a.monto), 0)
  const ritmoQuincenal = totalReciente > 0 ? totalReciente / (diasObservados / 15) : 0

  // Fecha estimada de llegada al ritmo actual
  const fechaEstimada = ritmoQuincenal > 0 && faltante > 0
    ? new Date(hoy.getTime() + (faltante / ritmoQuincenal) * 15 * 864e5)
    : null

  let estado
  if (meta.completada || pct >= 100)      estado = 'completada'
  else if (!meta.fecha_objetivo)          estado = 'sin_fecha'
  else if (ritmoQuincenal === 0)          estado = 'sin_aportes'
  else if (ritmoQuincenal >= aportacionQuincenal) estado = 'a_tiempo'
  else                                    estado = 'atrasada'

  return { ritmoQuincenal, fechaEstimada, estado, necesarioQuincenal: aportacionQuincenal }
}

export const ESTADO_META = {
  completada:  { label: 'Completada', className: 'text-ok bg-ok/15' },
  a_tiempo:    { label: 'A tiempo',   className: 'text-ok bg-ok/15' },
  atrasada:    { label: 'Atrasada',   className: 'text-warn bg-warn/15' },
  sin_aportes: { label: 'Sin aportes', className: 'text-warn bg-warn/15' },
  sin_fecha:   { label: 'Sin fecha',  className: 'text-gray-300 bg-white/[0.08]' },
}

export function fmtMesAño(fecha) {
  return format(fecha, "MMMM 'de' yyyy", { locale: es })
}
