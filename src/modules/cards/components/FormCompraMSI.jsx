// src/modules/cards/components/FormCompraMSI.jsx
import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import Modal from '@ui/Modal'
import { Input, AmountInput, Select } from '@ui/Field'
import Spinner from '@ui/Spinner'
import { useToast } from '@ui/Toast'
import { useCrearCompraMSI, useActualizarCompraMSI, calcularMontoMensual } from '../hooks/useMSI'
import { useAppStore } from '@store/appStore'
import { CAT_GASTO, CAT_NEGOCIO_GASTO, fmt, today, cn } from '@lib/utils'

const MESES_COMUNES = [3, 6, 9, 12, 15, 18, 24]

export default function FormCompraMSI({ open, onClose, tarjeta, compra = null }) {
  const { nombres } = useAppStore()
  const toast = useToast()
  const crear = useCrearCompraMSI()
  const actualizar = useActualizarCompraMSI()
  const isEdit = Boolean(compra)
  const loading = crear.isPending || actualizar.isPending

  const PERSONA_OPTS = [
    { value: 'p1', label: nombres.p1 },
    { value: 'p2', label: nombres.p2 },
    { value: 'ambos', label: 'Ambos' },
  ]

  const [descripcion, setDescripcion] = useState('')
  const [contexto, setContexto]       = useState('personal')
  const [persona, setPersona]         = useState('ambos')
  const [categoria, setCategoria]     = useState('')
  const [montoTotal, setMontoTotal]   = useState('')
  const [meses, setMeses]             = useState('12')
  const [fechaCompra, setFechaCompra] = useState(today())

  useEffect(() => {
    if (!open) return
    if (compra) {
      setDescripcion(compra.descripcion)
      setContexto(compra.contexto)
      setPersona(compra.persona)
      setCategoria(compra.categoria || '')
      setMontoTotal(String(compra.monto_total))
      setMeses(String(compra.meses_total))
      setFechaCompra(compra.fecha_compra)
    } else {
      setDescripcion(''); setContexto('personal'); setPersona('ambos')
      setCategoria(''); setMontoTotal(''); setMeses('12'); setFechaCompra(today())
    }
  }, [open, compra])

  const catOpts = (contexto === 'negocio' ? CAT_NEGOCIO_GASTO : CAT_GASTO)
    .map((c) => ({ value: c.value, label: `${c.emoji} ${c.label}` }))

  const montoMensual = calcularMontoMensual(montoTotal, meses)

  const handleSave = async () => {
    if (!descripcion.trim()) { toast.error('Escribe una descripción'); return }
    if (!montoTotal || Number(montoTotal) <= 0) { toast.error('Ingresa el monto total'); return }
    if (!meses || Number(meses) < 2) { toast.error('El plan debe ser de al menos 2 meses'); return }
    if (!categoria) { toast.error('Selecciona una categoría'); return }

    try {
      if (isEdit) {
        await actualizar.mutateAsync({
          id: compra.id,
          data: { descripcion: descripcion.trim(), contexto, persona, categoria },
        })
        toast.success('Compra MSI actualizada')
      } else {
        await crear.mutateAsync({
          tarjeta_id: tarjeta.id,
          descripcion: descripcion.trim(),
          contexto, persona, categoria,
          monto_total: Number(montoTotal),
          meses_total: Number(meses),
          fecha_compra: fechaCompra,
        })
        toast.success(`Compra a ${meses} MSI registrada ✅`)
      }
      onClose()
    } catch (e) {
      toast.error(e.message)
    }
  }

  if (!tarjeta) return null

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar compra MSI' : `MSI en ${tarjeta.nombre}`}>
      <Input
        label="Descripción" value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        placeholder="Ej. iPhone 16, Pantalla, Refri..."
        autoFocus={!isEdit}
      />

      <div className="flex bg-surface-700 rounded-xl p-1 mb-5">
        {[['personal','👤 Personal'],['negocio','🏪 Negocio']].map(([id, label]) => (
          <button
            key={id}
            onClick={() => { setContexto(id); setCategoria('') }}
            className={cn(
              'flex-1 py-2 text-xs font-medium rounded-lg transition-all',
              contexto === id ? 'bg-[var(--accent)] text-white' : 'text-gray-400'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <Select label="Categoría" value={categoria} onChange={setCategoria} options={catOpts} placeholder="Selecciona categoría" />

      {contexto === 'personal' && (
        <Select label="Persona" value={persona} onChange={setPersona} options={PERSONA_OPTS} />
      )}

      {!isEdit && (
        <>
          <AmountInput label="Monto total de la compra" value={montoTotal} onChange={setMontoTotal} placeholder="0.00" />

          <div className="mb-4">
            <label className="label">Meses sin intereses</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {MESES_COMUNES.map((m) => (
                <button
                  key={m}
                  onClick={() => setMeses(String(m))}
                  className={cn(
                    'px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all',
                    Number(meses) === m
                      ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-muted)]'
                      : 'border-white/10 text-gray-400'
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
            <input
              type="number" min="2" max="60" value={meses}
              onChange={(e) => setMeses(e.target.value.replace(/[^0-9]/g, ''))}
              className="input" placeholder="Número de meses"
            />
          </div>

          <div className="mb-5">
            <label className="label">Fecha de compra</label>
            <input type="date" value={fechaCompra} onChange={(e) => setFechaCompra(e.target.value)} className="input" />
          </div>

          {montoMensual > 0 && (
            <div className="card p-4 mb-5 bg-[var(--accent-muted)]">
              <p className="text-xs text-gray-300 mb-1">Mensualidad — regístrala cuando el banco te la cobre</p>
              <p className="text-xl font-bold font-mono text-[var(--accent)]">{fmt(montoMensual)}</p>
              <p className="text-[11px] text-gray-400 mt-1">
                Por ahora solo se reserva {fmt(Number(montoTotal) || 0)} de tu disponible — no se registra ningún cargo todavía.
              </p>
            </div>
          )}
        </>
      )}

      <button
        onClick={handleSave}
        disabled={loading}
        className="btn-primary w-full py-3.5 text-sm font-semibold"
      >
        {loading ? <Spinner size="sm" /> : <><Check size={16} />{isEdit ? 'Guardar cambios' : 'Registrar compra MSI'}</>}
      </button>
    </Modal>
  )
}
