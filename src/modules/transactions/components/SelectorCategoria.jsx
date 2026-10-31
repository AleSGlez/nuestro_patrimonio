// src/modules/transactions/components/SelectorCategoria.jsx
// Categoría en cuadrícula + subcategorías en chips (con "+ Nueva")
import { useState } from 'react'
import { Plus } from 'lucide-react'
import Spinner from '@ui/Spinner'
import { useToast } from '@ui/Toast'
import { useSubcategorias, useCrearSubcategoria, subcategoriasDe } from '../hooks/useSubcategorias'
import { cn } from '@lib/utils'

export default function SelectorCategoria({
  opciones, categoria, onCategoria, subcategoria, onSubcategoria, conSubcategorias = true, tipo = 'gasto',
}) {
  const toast = useToast()
  const { data: propias = [] } = useSubcategorias()
  const crear = useCrearSubcategoria()
  const [nuevaAbierta, setNuevaAbierta] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState('')

  const catSel = opciones.find((c) => c.value === categoria)
  const subs = categoria ? subcategoriasDe(categoria, propias, tipo) : []

  const elegirCategoria = (value) => {
    onCategoria(value)
    onSubcategoria(null)
    setNuevaAbierta(false)
  }

  const agregar = async () => {
    const nombre = nuevoNombre.trim()
    if (!nombre) return
    if (subs.some((s) => s.toLowerCase() === nombre.toLowerCase())) {
      onSubcategoria(subs.find((s) => s.toLowerCase() === nombre.toLowerCase()))
    } else {
      try {
        await crear.mutateAsync({ categoria, nombre })
        onSubcategoria(nombre)
      } catch (e) {
        toast.error(/subcategorias/.test(e.message) ? 'Falta correr la migración de subcategorías en Supabase' : e.message)
        return
      }
    }
    setNuevoNombre(''); setNuevaAbierta(false)
  }

  return (
    <div className="mb-4">
      <label className="label">Categoría</label>
      <div className="grid grid-cols-4 gap-1.5">
        {opciones.map((c) => {
          const activa = c.value === categoria
          return (
            <button
              key={c.value} type="button" onClick={() => elegirCategoria(c.value)} aria-pressed={activa}
              className={cn(
                'min-h-[60px] rounded-xl border flex flex-col items-center justify-center gap-1 px-1 py-1.5 transition-all active:scale-[0.97]',
                activa ? 'bg-[var(--accent-muted)] border-[var(--accent)]' : 'bg-surface-700 border-white/[0.06] hover:bg-surface-600'
              )}
            >
              <span className="text-lg leading-none">{c.emoji}</span>
              <span className={cn('text-[10px] font-medium leading-tight text-center truncate w-full', activa ? 'text-white' : 'text-gray-300')}>{c.label}</span>
            </button>
          )
        })}
      </div>

      {conSubcategorias && catSel && (
        <div className="mt-3">
          <p className="text-[11px] text-gray-400 mb-1.5">
            Subcategoría de {catSel.label} <span className="text-gray-500">(opcional)</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {subs.map((s) => {
              const activa = s === subcategoria
              return (
                <button
                  key={s} type="button" aria-pressed={activa}
                  onClick={() => onSubcategoria(activa ? null : s)}
                  className={cn(
                    'min-h-[34px] px-3 rounded-full text-xs font-medium border transition-all',
                    activa ? 'bg-[var(--accent-muted)] border-[var(--accent)] text-white' : 'bg-surface-700 border-white/10 text-gray-300'
                  )}
                >
                  {s}
                </button>
              )
            })}
            <button
              type="button" onClick={() => setNuevaAbierta((v) => !v)}
              className="min-h-[34px] px-3 rounded-full text-xs font-medium border border-dashed border-[var(--accent)]/60 text-[var(--accent-light)] inline-flex items-center gap-1"
            >
              <Plus size={12} /> Nueva
            </button>
          </div>
          {nuevaAbierta && (
            <div className="flex gap-1.5 mt-2">
              <input
                value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); agregar() } }}
                placeholder="Ej. Casetas" aria-label="Nombre de la subcategoría"
                className="input flex-1 h-10" autoFocus
              />
              <button type="button" onClick={agregar} disabled={crear.isPending} className="btn-primary px-4 text-sm">
                {crear.isPending ? <Spinner size="sm" /> : 'Agregar'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
