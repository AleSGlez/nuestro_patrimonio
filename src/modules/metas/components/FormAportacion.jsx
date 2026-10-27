// src/modules/metas/components/FormAportacion.jsx
import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import Modal from '@ui/Modal'
import { Input } from '@ui/Field'
import Spinner from '@ui/Spinner'
import { useToast } from '@ui/Toast'
import { useAportar, useAportaciones, calcularMeta } from '../hooks/useMetas'
import { useCuentas } from '@modules/accounts/hooks/useCuentas'
import { useAppStore } from '@store/appStore'
import { fmt, cn, today, TIPO_EMOJI_CUENTA } from '@lib/utils'

export default function FormAportacion({ open, onClose, meta }) {
  const toast = useToast()
  const { nombres } = useAppStore()
  const { data: cuentas = [] } = useCuentas()
  const { data: aportaciones = [] } = useAportaciones(meta?.id)
  const aportar = useAportar()

  const [monto, setMonto]       = useState('')
  const [fecha, setFecha]       = useState(today())
  const [nota, setNota]         = useState('')
  const [cuentaId, setCuenta]   = useState('')
  const [persona, setPersona]   = useState('p1')

  // Resetear cada vez que se abre — evita que quede el monto/nota/cuenta
  // de la última aportación (de esta u otra meta) al volver a abrir.
  useEffect(() => {
    if (!open || !meta) return
    setMonto(''); setFecha(today()); setNota('')
    setCuenta(meta.cuenta_id || '')
    setPersona(meta.persona === 'p2' ? 'p2' : 'p1')
  }, [open, meta])

  if (!meta) return null

  const { objetivo, actual, faltante, pct, aportacionQuincenal } = calcularMeta(meta)
  const montoNum = Number(monto) || 0
  const pctNuevo = objetivo > 0 ? Math.min(100, Math.round(((actual + montoNum) / objetivo) * 100)) : 0
  const faltaran = Math.max(0, faltante - montoNum)

  // Botones que llenan el monto
  const ultima = aportaciones[0] ? Number(aportaciones[0].monto) : null
  const sugerencias = [
    aportacionQuincenal && { label: 'Por quincena', monto: Math.ceil(aportacionQuincenal) },
    ultima && ultima < faltante && { label: 'Como la última', monto: ultima },
    faltante > 0 && { label: 'Todo lo que falta', monto: Math.ceil(faltante * 100) / 100 },
  ].filter(Boolean)

  const opcionesCuenta = [...cuentas, { id: '', nombre: 'Solo registrar, no mover dinero', saldo: null }]

  const handleAportar = async () => {
    if (montoNum <= 0) { toast.error('Ingresa el monto'); return }
    try {
      await aportar.mutateAsync({ meta, monto, fecha, nota, cuentaId, cuentas, persona })
      toast.success(pctNuevo >= 100 ? '¡Meta completada! 🎉' : 'Aportación registrada ✅')
      onClose()
    } catch (e) { toast.error(e.message) }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Aportar a ${meta.emoji} ${meta.nombre}`}>
      <p className="text-[11px] text-gray-400 -mt-1 mb-3">Llevan {fmt(actual)} de {fmt(objetivo)}</p>

      {/* Monto */}
      <div className="mb-2.5">
        <label className="label">Monto</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-400 font-mono">$</span>
          <input
            type="text" inputMode="decimal" value={monto}
            onChange={(e) => setMonto(e.target.value.replace(/[^0-9.]/g, ''))}
            placeholder="0.00"
            className="input pl-10 text-2xl font-bold font-mono h-14"
            autoFocus
          />
        </div>
      </div>

      {sugerencias.length > 0 && (
        <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: `repeat(${sugerencias.length}, minmax(0, 1fr))` }}>
          {sugerencias.map((s) => {
            const activa = montoNum === s.monto
            return (
              <button key={s.label} type="button" onClick={() => setMonto(String(s.monto))} aria-pressed={activa}
                className={cn('min-h-[54px] rounded-xl px-1.5 py-2 text-center border transition-all',
                  activa ? 'bg-[var(--accent-muted)] border-[var(--accent)]/50' : 'bg-surface-700 border-white/[0.08]'
                )}>
                <p className="text-[10px] text-gray-400 mb-0.5">{s.label}</p>
                <p className={cn('text-[13px] font-bold font-mono', activa ? 'text-[var(--accent-light)]' : 'text-white')}>{fmt(s.monto)}</p>
              </button>
            )
          })}
        </div>
      )}

      {/* Cómo queda */}
      <div className="bg-surface-700 rounded-2xl p-3 mb-4">
        <div className="flex justify-between items-baseline mb-2">
          <span className="text-xs text-gray-300">Con esta aportación</span>
          <span className="text-[13px] font-bold text-white">
            {pct}% <span className="text-gray-400 font-normal">→</span> <span className="text-[var(--accent-light)]">{pctNuevo}%</span>
          </span>
        </div>
        <div className="relative h-2 bg-surface-500 rounded-full overflow-hidden mb-2">
          <div className="absolute inset-y-0 left-0 rounded-full bg-[var(--accent)]/45 transition-all" style={{ width: `${pctNuevo}%` }} />
          <div className="absolute inset-y-0 left-0 rounded-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
        </div>
        <p className={cn('text-[11px]', faltaran === 0 && montoNum > 0 ? 'text-ok font-semibold' : 'text-gray-400')}>
          {faltaran === 0 && montoNum > 0 ? '¡Con esto completan la meta!' : `Faltarán ${fmt(faltaran)}`}
        </p>
      </div>

      {/* Quién aporta */}
      <div className="mb-4">
        <label className="label">Quién aporta</label>
        <div className="flex gap-2">
          {['p1', 'p2', 'ambos'].map((p) => (
            <button key={p} type="button" onClick={() => setPersona(p)} aria-pressed={persona === p}
              className={cn('flex-1 min-h-[42px] rounded-xl text-[13px] font-semibold border transition-all',
                persona === p ? 'bg-[var(--accent-muted)] border-[var(--accent)]/50 text-[var(--accent-light)]' : 'bg-surface-700 border-white/[0.08] text-gray-300'
              )}>
              {p === 'p1' ? nombres.p1 : p === 'p2' ? nombres.p2 : 'Ambos'}
            </button>
          ))}
        </div>
      </div>

      {/* De dónde sale */}
      <div className="mb-4">
        <label className="label">Sale de</label>
        <div className="space-y-1.5">
          {opcionesCuenta.map((c) => {
            const activa = cuentaId === c.id
            return (
              <button key={c.id || 'ninguna'} type="button" onClick={() => setCuenta(c.id)} aria-pressed={activa}
                className={cn('w-full flex items-center gap-2.5 min-h-[48px] px-3 rounded-xl border text-left transition-all',
                  activa ? 'bg-[var(--accent-muted)] border-[var(--accent)]/50' : 'bg-surface-700 border-white/[0.08]'
                )}>
                <span className="text-base">{c.id ? (TIPO_EMOJI_CUENTA[c.tipo] || '🏦') : '➖'}</span>
                <span className="flex-1 text-[13px] font-medium text-white">{c.nombre}</span>
                {c.saldo !== null && <span className="text-xs font-mono text-gray-400">{fmt(c.saldo)}</span>}
                <span className={cn('w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center flex-shrink-0',
                  activa ? 'border-[var(--accent-light)]' : 'border-gray-600')}>
                  {activa && <span className="w-2 h-2 rounded-full bg-[var(--accent-light)]" />}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="mb-4">
          <label className="label">Fecha</label>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="input" />
        </div>
        <Input label="Nota" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Quincena, bono…" />
      </div>

      <button onClick={handleAportar} disabled={aportar.isPending}
        className="btn-primary w-full py-3.5 text-sm font-semibold">
        {aportar.isPending ? <Spinner size="sm" /> : <><Check size={16} />{montoNum > 0 ? `Aportar ${fmt(montoNum)}` : 'Aportar'}</>}
      </button>
    </Modal>
  )
}
