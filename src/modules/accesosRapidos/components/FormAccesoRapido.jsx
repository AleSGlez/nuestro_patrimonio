// src/modules/accesosRapidos/components/FormAccesoRapido.jsx
import { useState, useEffect } from 'react'
import { Check, Copy, Trash2, Star } from 'lucide-react'
import Modal from '@ui/Modal'
import { Input, AmountInput, Select } from '@ui/Field'
import Spinner from '@ui/Spinner'
import { useToast } from '@ui/Toast'
import { useConfirm } from '@ui/ConfirmDialog'
import { useCuentas } from '@modules/accounts/hooks/useCuentas'
import { useTodosLosApartados } from '@modules/accounts/hooks/useApartados'
import { useTarjetas } from '@modules/cards/hooks/useTarjetas'
import { useAppStore } from '@store/appStore'
import {
  CAT_GASTO, CAT_INGRESO, CAT_NEGOCIO_GASTO, CAT_NEGOCIO_INGRESO, cn,
  filtrarCuentasPorContexto, filtrarTarjetasPorContexto, TIPO_EMOJI_CUENTA,
} from '@lib/utils'
import {
  useCrearAccesoRapido, useActualizarAccesoRapido, useEliminarAccesoRapido, useDuplicarAccesoRapido,
} from '../hooks/useAccesosRapidos'

const EMOJIS = ['🚇', '☕', '🚗', '🥤', '🍔', '🅿️', '🚌', '🍕', '🛒', '💊', '⛽', '🎬', '🐾', '🎁', '⚡']

export default function FormAccesoRapido({ open, onClose, acceso = null }) {
  const { nombres } = useAppStore()
  const toast = useToast()
  const confirmar = useConfirm()
  const { data: cuentas = [] } = useCuentas()
  const { data: tarjetas = [] } = useTarjetas()
  const { data: todosApartados = [] } = useTodosLosApartados()
  const crear = useCrearAccesoRapido()
  const actualizar = useActualizarAccesoRapido()
  const eliminar = useEliminarAccesoRapido()
  const duplicar = useDuplicarAccesoRapido()
  const isEdit = Boolean(acceso)
  const loading = crear.isPending || actualizar.isPending

  const RESPONSABLE_OPTS = [
    { value: 'p1', label: nombres.p1 },
    { value: 'p2', label: nombres.p2 },
    { value: 'negocio', label: '🏪 Negocio' },
  ]

  const [nombre, setNombre]           = useState('')
  const [emoji, setEmoji]             = useState(EMOJIS[0])
  const [tipo, setTipo]               = useState('gasto')
  const [monto, setMonto]             = useState('')
  const [categoria, setCategoria]     = useState('')
  const [responsable, setResponsable] = useState('p1')
  const [metodoValor, setMetodoValor] = useState('')
  const [confirmarMonto, setConfirmarMonto] = useState(false)
  const [favorito, setFavorito]       = useState(false)

  const contexto = responsable === 'negocio' ? 'negocio' : 'personal'
  const persona  = responsable === 'negocio' ? 'ambos'   : responsable

  const cuentasFiltradas  = filtrarCuentasPorContexto(cuentas, { contexto, persona }, todosApartados)
  const tarjetasFiltradas = filtrarTarjetasPorContexto(tarjetas, { contexto, persona, tipo })

  const metodoOpts = [
    ...cuentasFiltradas.map((c) => ({
      value: `cuenta:${c.id}`,
      label: `${TIPO_EMOJI_CUENTA[c.tipo] || '💳'} ${c.nombre}`,
    })),
    ...tarjetasFiltradas.map((t) => ({
      value: `tarjeta:${t.id}`,
      label: `💳 ${t.nombre} (crédito)`,
    })),
  ]

  const catOpts = (
    contexto === 'negocio' && tipo === 'ingreso' ? CAT_NEGOCIO_INGRESO
    : contexto === 'negocio' ? CAT_NEGOCIO_GASTO
    : tipo === 'ingreso'    ? CAT_INGRESO
    : CAT_GASTO
  ).map((c) => ({ value: c.value, label: `${c.emoji} ${c.label}` }))

  useEffect(() => {
    if (!open) return
    if (acceso) {
      setNombre(acceso.nombre); setEmoji(acceso.emoji); setTipo(acceso.tipo)
      setMonto(String(acceso.monto_default)); setCategoria(acceso.categoria)
      setResponsable(acceso.responsable); setMetodoValor(acceso.metodo_pago)
      setConfirmarMonto(acceso.confirmar_monto); setFavorito(acceso.favorito)
    } else {
      setNombre(''); setEmoji(EMOJIS[0]); setTipo('gasto'); setMonto('')
      setCategoria(''); setResponsable('p1'); setMetodoValor('')
      setConfirmarMonto(false); setFavorito(false)
    }
  }, [open, acceso])

  // Si cambia responsable/tipo y el método seleccionado ya no aplica, se limpia
  useEffect(() => {
    const sigueValido = metodoOpts.some((o) => o.value === metodoValor)
    if (!sigueValido) setMetodoValor(metodoOpts[0]?.value || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [responsable, tipo, cuentas, tarjetas])

  const handleSave = async () => {
    if (!nombre.trim()) { toast.error('Dale un nombre al acceso rápido'); return }
    if (!monto || Number(monto) <= 0) { toast.error('Ingresa un monto predeterminado válido'); return }
    if (!categoria) { toast.error('Selecciona una categoría'); return }
    if (!metodoValor) { toast.error('Selecciona de dónde sale el dinero'); return }

    const payload = {
      nombre: nombre.trim(), emoji, tipo, monto_default: Number(monto), categoria,
      responsable, metodo_pago: metodoValor,
      confirmar_monto: confirmarMonto, favorito,
    }

    try {
      if (isEdit) {
        await actualizar.mutateAsync({ id: acceso.id, data: payload })
        toast.success('Acceso rápido actualizado')
      } else {
        await crear.mutateAsync(payload)
        toast.success('Acceso rápido creado ⚡')
      }
      onClose()
    } catch (e) {
      toast.error(e.message)
    }
  }

  const handleDuplicar = async () => {
    await duplicar.mutateAsync(acceso)
    toast.success('Acceso rápido duplicado')
    onClose()
  }

  const handleEliminar = async () => {
    const ok = await confirmar({
      title: 'Eliminar acceso rápido',
      message: `¿Eliminar "${acceso.nombre}"? Los movimientos ya registrados con él no se ven afectados.`,
    })
    if (!ok) return
    await eliminar.mutateAsync(acceso.id)
    toast.success('Acceso rápido eliminado')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar acceso rápido' : 'Nuevo acceso rápido'}>
      <div className="mb-4">
        <label className="label">Ícono</label>
        <div className="flex gap-2 flex-wrap">
          {EMOJIS.map((e) => (
            <button
              key={e} type="button" onClick={() => setEmoji(e)}
              className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all',
                emoji === e ? 'bg-[var(--accent-muted)] ring-2 ring-[var(--accent)]' : 'bg-surface-700'
              )}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Metro" autoFocus={!isEdit} />

      <div className="flex bg-surface-700 rounded-xl p-1 mb-4">
        {['gasto', 'ingreso'].map((t) => (
          <button
            key={t}
            onClick={() => { setTipo(t); setCategoria('') }}
            className={cn(
              'flex-1 py-2 text-sm font-medium rounded-lg transition-all',
              tipo === t ? (t === 'gasto' ? 'bg-bad text-white' : 'bg-ok text-white') : 'text-gray-400'
            )}
          >
            {t === 'gasto' ? '↑ Gasto' : '↓ Ingreso'}
          </button>
        ))}
      </div>

      <AmountInput label="Monto predeterminado" value={monto} onChange={setMonto} placeholder="0.00" />

      <Select
        label="Responsable" value={responsable}
        onChange={(v) => { setResponsable(v); setCategoria('') }}
        options={RESPONSABLE_OPTS}
      />

      <Select label="Categoría" value={categoria} onChange={setCategoria} options={catOpts} placeholder="Selecciona categoría" />

      {metodoOpts.length > 0 ? (
        <Select
          label="Cuenta o tarjeta"
          value={metodoValor}
          onChange={setMetodoValor}
          options={metodoOpts}
          placeholder="¿De dónde sale el dinero?"
        />
      ) : (
        <p className="text-xs text-warn mb-4">
          {responsable === 'negocio'
            ? 'No hay cuentas de negocio. Agrega una primero.'
            : `${responsable === 'p1' ? nombres.p1 : nombres.p2} no tiene cuentas ni tarjetas propias.`}
        </p>
      )}

      <div className="flex items-center justify-between py-3 border-t border-white/[0.06] mb-1">
        <div>
          <p className="text-sm text-white">Confirmar monto antes de registrar</p>
          <p className="text-[11px] text-gray-400">Útil si el monto cambia cada vez</p>
        </div>
        <button
          type="button" onClick={() => setConfirmarMonto((v) => !v)}
          className={cn('w-11 h-6 rounded-full transition-colors relative flex-shrink-0',
            confirmarMonto ? 'bg-[var(--accent)]' : 'bg-surface-600')}
        >
          <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform',
            confirmarMonto ? 'translate-x-[22px]' : 'translate-x-0.5')} />
        </button>
      </div>

      <button
        type="button" onClick={() => setFavorito((v) => !v)}
        className={cn(
          'flex items-center gap-2 w-full py-3 border-t border-white/[0.06] mb-4 text-sm',
          favorito ? 'text-warn' : 'text-gray-400'
        )}
      >
        <Star size={16} className={favorito ? 'fill-warn' : ''} />
        {favorito ? 'Favorito' : 'Marcar como favorito'}
      </button>

      <button
        onClick={handleSave}
        disabled={loading}
        className="btn-primary w-full py-3.5 text-sm font-semibold"
      >
        {loading ? <Spinner size="sm" /> : <><Check size={16} />{isEdit ? 'Guardar cambios' : 'Crear acceso rápido'}</>}
      </button>

      {isEdit && (
        <div className="flex gap-2 mt-3">
          <button onClick={handleDuplicar} className="btn-ghost flex-1 py-3 text-sm font-medium flex items-center justify-center gap-1.5">
            <Copy size={14} /> Duplicar
          </button>
          <button onClick={handleEliminar} className="btn-danger flex-1 py-3 text-sm font-medium flex items-center justify-center gap-1.5">
            <Trash2 size={14} /> Eliminar
          </button>
        </div>
      )}
    </Modal>
  )
}
