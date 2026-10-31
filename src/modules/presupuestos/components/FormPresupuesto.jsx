// src/modules/presupuestos/components/FormPresupuesto.jsx
import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import Modal from '@ui/Modal'
import { Input, AmountInput, Select } from '@ui/Field'
import Spinner from '@ui/Spinner'
import { useToast } from '@ui/Toast'
import { ChevronDown } from 'lucide-react'
import { usePresupuestos, useCrearPresupuesto, useActualizarPresupuesto,
         calcularDisponible, tieneEtiquetas, personasSeTraslapan,
         etiquetaSub, separarEtiqueta } from '../hooks/usePresupuestos'
import { useTransacciones } from '@modules/transactions/hooks/useTransacciones'
import { useSubcategorias, subcategoriasDe } from '@modules/transactions/hooks/useSubcategorias'
import { useAppStore } from '@store/appStore'
import { today, fmt, cn, CAT_GASTO } from '@lib/utils'

// ¿Qué otro presupuesto ya tiene esta etiqueta (o la choca)? La categoría
// completa choca con cualquiera de sus subcategorías y al revés.
function dueñoDe(tag, tomadas) {
  const { categoria, sub } = separarEtiqueta(tag)
  if (tomadas[categoria]) return tomadas[categoria]
  if (sub) return tomadas[tag] || null
  const otra = Object.keys(tomadas).find((k) => separarEtiqueta(k).categoria === categoria)
  return otra ? tomadas[otra] : null
}

function FilaCategoria({ cat, subs, etiquetas, tomadas, abierta, onAbrir, onToda, onSub }) {
  const toda = etiquetas.includes(cat.value)
  const elegidas = subs.filter((s) => toda || etiquetas.includes(etiquetaSub(cat.value, s)))
  const dueñoToda = !toda && dueñoDe(cat.value, tomadas)
  const activa = toda || elegidas.length > 0
  const estado = toda ? 'Toda la categoría'
    : elegidas.length ? `Solo ${elegidas.join(', ')}`
    : dueñoToda ? `En «${dueñoToda}»` : 'No cuenta'

  return (
    <div className={cn('bg-surface-700 border rounded-xl', activa ? 'border-[var(--accent)]/50' : 'border-white/[0.06]')}>
      <div className="flex items-center gap-2.5 pl-3 pr-1 min-h-[50px]">
        <span className="text-lg flex-shrink-0">{cat.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">{cat.label}</p>
          <p className={cn('text-[11px] truncate', activa ? 'text-[var(--accent-light)]' : 'text-gray-400')}>{estado}</p>
        </div>
        <button
          type="button" onClick={onToda} disabled={Boolean(dueñoToda)} aria-pressed={toda}
          className={cn('h-8 px-3 rounded-full text-[11px] font-semibold border flex-shrink-0 disabled:opacity-40',
            toda ? 'bg-[var(--accent)] border-[var(--accent)] text-white' : 'border-white/15 text-gray-300')}
        >
          Toda
        </button>
        {subs.length > 0 && (
          <button type="button" onClick={onAbrir} aria-label={`Elegir subcategorías de ${cat.label}`} aria-expanded={abierta}
            className="w-10 h-10 flex items-center justify-center text-gray-400 flex-shrink-0">
            <ChevronDown size={16} className={cn('transition-transform', abierta && 'rotate-180')} />
          </button>
        )}
      </div>
      {abierta && subs.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3 pb-3">
          {subs.map((s) => {
            const on = elegidas.includes(s)
            const dueño = !on && dueñoDe(etiquetaSub(cat.value, s), tomadas)
            return (
              <button
                key={s} type="button" onClick={() => onSub(s)} disabled={Boolean(dueño)} aria-pressed={on}
                className={cn('min-h-[34px] px-3 rounded-full text-xs font-medium border disabled:opacity-40',
                  on ? 'bg-[var(--accent-muted)] border-[var(--accent)] text-white' : 'border-white/10 text-gray-300')}
              >
                {s}{dueño && <span className="text-[10px] text-gray-400"> · {dueño}</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

const TIPOS = [
  { value: 'diario',   label: '📅 Diario' },
  { value: 'semanal',  label: '🗓️ Semanal' },
  { value: 'mensual',  label: '📆 Mensual' },
]

const EMOJIS = ['💰','🛒','🍔','🚗','🎮','👕','💊','✈️','🏠','📚']

export default function FormPresupuesto({ open, onClose, presupuesto = null }) {
  const { nombres } = useAppStore()
  const toast = useToast()
  const crear = useCrearPresupuesto()
  const actualizar = useActualizarPresupuesto()
  const isEdit = Boolean(presupuesto)
  const loading = crear.isPending || actualizar.isPending

  const PERSONA_OPTS = [
    { value: 'ambos', label: '👫 Pareja' },
    { value: 'p1',    label: nombres.p1 },
    { value: 'p2',    label: nombres.p2 },
  ]

  const [nombre, setNombre]         = useState('')
  const [emoji, setEmoji]           = useState('💰')
  const [tipo, setTipo]             = useState('diario')
  const [montoBase, setMontoBase]   = useState('')
  const [persona, setPersona]       = useState('ambos')
  const [fechaInicio, setFechaInicio] = useState(today())
  const [categorias, setCategorias] = useState([])
  const [abierta, setAbierta]       = useState(null)
  const { data: propias = [] } = useSubcategorias()

  const { data: presupuestos = [] } = usePresupuestos()
  const { data: transacciones = [] } = useTransacciones()

  useEffect(() => {
    if (!open) return
    if (presupuesto) {
      setNombre(presupuesto.nombre); setEmoji(presupuesto.emoji)
      setTipo(presupuesto.tipo); setMontoBase(String(presupuesto.monto_base))
      setPersona(presupuesto.persona); setFechaInicio(presupuesto.fecha_inicio)
      setCategorias(presupuesto.categorias || [])
    } else {
      setNombre(''); setEmoji('💰'); setTipo('diario')
      setMontoBase(''); setPersona('ambos'); setFechaInicio(today())
      setCategorias([])
    }
  }, [open, presupuesto])

  // Una categoría pertenece a un solo presupuesto (entre los que comparten persona)
  const tomadas = {}
  presupuestos
    .filter((p) => p.id !== presupuesto?.id && (!p.contexto || p.contexto === 'personal'))
    .filter((p) => tieneEtiquetas(p) && personasSeTraslapan(p.persona, persona))
    .forEach((p) => p.categorias.forEach((c) => { tomadas[c] = p.nombre }))

  // Toda la categoría: reemplaza a sus subcategorías sueltas
  const toggleToda = (cat) => setCategorias((sel) =>
    sel.includes(cat)
      ? sel.filter((x) => x !== cat)
      : [...sel.filter((x) => separarEtiqueta(x).categoria !== cat), cat]
  )
  // Una subcategoría: si la categoría estaba completa, se abre en sus subs menos esta
  const toggleSub = (cat, sub) => setCategorias((sel) => {
    const tag = etiquetaSub(cat, sub)
    if (sel.includes(cat)) {
      const resto = subcategoriasDe(cat, propias).filter((s) => s !== sub).map((s) => etiquetaSub(cat, s))
      return [...sel.filter((x) => x !== cat), ...resto]
    }
    return sel.includes(tag) ? sel.filter((x) => x !== tag) : [...sel, tag]
  })

  // Efecto en vivo de las etiquetas elegidas
  const efecto = Number(montoBase) > 0 && fechaInicio
    ? calcularDisponible({ tipo, persona, fecha_inicio: fechaInicio, monto_base: montoBase, categorias }, transacciones)
    : null

  const handleSave = async () => {
    if (!nombre.trim()) { toast.error('Ingresa el nombre'); return }
    if (!montoBase || Number(montoBase) <= 0) { toast.error('Ingresa el monto'); return }
    const choque = categorias.map((c) => dueñoDe(c, tomadas)).find(Boolean)
    if (choque) { toast.error(`Parte de lo elegido ya está en "${choque}"`); return }

    const payload = {
      nombre: nombre.trim(), emoji, tipo,
      monto_base: Number(montoBase),
      persona, fecha_inicio: fechaInicio,
      categorias: categorias.length > 0 ? categorias : null,
    }

    try {
      if (isEdit) {
        await actualizar.mutateAsync({ id: presupuesto.id, data: payload })
        toast.success('Presupuesto actualizado')
      } else {
        await crear.mutateAsync(payload)
        toast.success('Presupuesto creado')
      }
      onClose()
    } catch (e) { toast.error(e.message) }
  }

  const tipoLabel = { diario: 'al día', semanal: 'a la semana', mensual: 'al mes' }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar presupuesto' : 'Nuevo presupuesto'}>
      <div className="mb-4">
        <label className="label">Emoji</label>
        <div className="flex gap-2 flex-wrap">
          {EMOJIS.map((e) => (
            <button key={e} type="button" onClick={() => setEmoji(e)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all ${
                emoji === e ? 'bg-[var(--accent-muted)] ring-2 ring-[var(--accent)]' : 'bg-surface-700'
              }`}
            >{e}</button>
          ))}
        </div>
      </div>

      <Input
        label="Nombre" value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Ej: Gastos diarios, Comida semanal"
        autoFocus
      />

      <div className="grid grid-cols-2 gap-3">
        <Select label="Período" value={tipo} onChange={setTipo} options={TIPOS} className="mb-0" />
        <Select label="Persona" value={persona} onChange={setPersona} options={PERSONA_OPTS} className="mb-0" />
      </div>

      <div className="mt-3">
        <AmountInput
          label={`Presupuesto ${tipoLabel[tipo] || ''}`}
          value={montoBase} onChange={setMontoBase} placeholder="0.00"
        />
      </div>

      {montoBase > 0 && (
        <div className="p-3 bg-[var(--accent-muted)] border border-[var(--accent)]/20 rounded-xl mb-4 -mt-1">
          <p className="text-xs text-gray-300">
            {tipo === 'diario'  && `${fmt(montoBase)} por día — si un día gastas menos, se acumula para el siguiente`}
            {tipo === 'semanal' && `${fmt(montoBase)} por semana — el sobrante o déficit se arrastra a la siguiente semana`}
            {tipo === 'mensual' && `${fmt(montoBase)} por mes — el sobrante o déficit se arrastra al siguiente mes`}
          </p>
        </div>
      )}

      <div className="mb-4">
        <label className="label">Qué gastos cuentan aquí</label>
        <p className="text-[11px] text-gray-400 -mt-0.5 mb-2.5 leading-relaxed">
          Toma la categoría completa o ábrela para elegir solo algunas subcategorías. Cada una pertenece a un solo presupuesto.
        </p>
        <div className="space-y-1.5">
          {CAT_GASTO.map((c) => (
            <FilaCategoria
              key={c.value} cat={c}
              subs={subcategoriasDe(c.value, propias)}
              etiquetas={categorias} tomadas={tomadas}
              abierta={abierta === c.value}
              onAbrir={() => setAbierta(abierta === c.value ? null : c.value)}
              onToda={() => toggleToda(c.value)}
              onSub={(s) => toggleSub(c.value, s)}
            />
          ))}
        </div>
        {categorias.length === 0 && (
          <p className="text-[11px] text-warn mt-2">Sin categorías: cuentan todos los gastos</p>
        )}
      </div>

      {efecto && (
        <div className="bg-surface-700 border border-white/[0.08] rounded-2xl p-3 mb-4">
          <p className="section-label mb-2">Con estas etiquetas</p>
          <div className="flex justify-between text-[11px] mb-1">
            <span className="text-gray-300">
              Acumulado · {efecto.periodos} {tipo === 'diario' ? 'días' : tipo === 'semanal' ? 'semanas' : 'meses'} × {fmt(montoBase)}
            </span>
            <span className="font-mono text-white">{fmt(efecto.presupuestoAcumulado)}</span>
          </div>
          <div className="flex justify-between text-[11px] mb-2">
            <span className="text-gray-300">
              Gastado en {categorias.length === 0 ? 'todas las categorías' : 'lo elegido'}
            </span>
            <span className="font-mono text-white">{fmt(efecto.gastado)}</span>
          </div>
          <div className="flex justify-between items-baseline pt-2 border-t border-white/[0.08]">
            <span className="text-xs font-semibold text-gray-200">{efecto.disponible < 0 ? 'Excedido' : 'Disponible acumulado'}</span>
            <span className={cn('font-mono text-lg font-bold', efecto.disponible < 0 ? 'text-bad' : 'text-ok')}>
              {efecto.disponible < 0 ? '-' : '+'}{fmt(Math.abs(efecto.disponible))}
            </span>
          </div>
        </div>
      )}

      <div className="mb-5">
        <label className="label">Fecha de inicio</label>
        <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="input" />
        <p className="text-[11px] text-gray-400 mt-1">Los gastos de estas categorías desde esta fecha cuentan contra el presupuesto</p>
      </div>

      <button onClick={handleSave} disabled={loading} className="btn-primary w-full py-3.5 text-sm font-semibold">
        {loading ? <Spinner size="sm" /> : <><Check size={16} />{isEdit ? 'Guardar cambios' : 'Crear presupuesto'}</>}
      </button>
    </Modal>
  )
}
