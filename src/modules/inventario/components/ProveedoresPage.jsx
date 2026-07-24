// src/modules/inventario/components/ProveedoresPage.jsx
import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, ExternalLink, Check } from 'lucide-react'
import { useProveedores, useCrearProveedor, useActualizarProveedor } from '../hooks/useInventario'
import { useAuthStore } from '@store/authStore'
import { db } from '@lib/supabase'
import { useQueryClient } from '@tanstack/react-query'
import Modal from '@ui/Modal'
import { Input } from '@ui/Field'
import Spinner from '@ui/Spinner'
import { useToast } from '@ui/Toast'
import { useConfirm } from '@ui/ConfirmDialog'
import { EmptyState } from '@ui/Field'
import { cn } from '@lib/utils'

const PLATAFORMAS = ['Buyee','MercadoLibre','Amazon','eBay','Cardmarket','TCGPlayer','Otro']

function FormProveedor({ open, onClose, proveedor = null }) {
  const toast = useToast()
  const crear = useCrearProveedor()
  const actualizar = useActualizarProveedor()
  const isEdit = Boolean(proveedor)
  const loading = crear.isPending || actualizar.isPending

  const [nombre, setNombre]         = useState('')
  const [plataforma, setPlataforma] = useState('Buyee')
  const [url, setUrl]               = useState('')
  const [nota, setNota]             = useState('')

  // Repoblar (o resetear) al abrir — mismo motivo que en Suscripciones/Clientes/Metas.
  useEffect(() => {
    if (!open) return
    if (proveedor) {
      setNombre(proveedor.nombre || '')
      setPlataforma(proveedor.plataforma || 'Buyee')
      setUrl(proveedor.url || '')
      setNota(proveedor.nota || '')
    } else {
      setNombre(''); setPlataforma('Buyee'); setUrl(''); setNota('')
    }
  }, [open, proveedor])

  const handleSave = async () => {
    if (!nombre.trim()) { toast.error('Ingresa el nombre'); return }
    const payload = { nombre: nombre.trim(), plataforma, url: url.trim() || null, nota: nota.trim() || null }
    try {
      if (isEdit) {
        await actualizar.mutateAsync({ id: proveedor.id, data: payload })
        toast.success('Proveedor actualizado')
      } else {
        await crear.mutateAsync(payload)
        toast.success('Proveedor agregado')
      }
      onClose()
    } catch (e) { toast.error(e.message) }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar proveedor' : 'Nuevo proveedor'}>
      <Input label="Nombre del vendedor" value={nombre} onChange={(e) => setNombre(e.target.value)}
        placeholder="Ej: CardShop_Tokyo, vendedor123" autoFocus />

      <div className="mb-4">
        <label className="label">Plataforma</label>
        <div className="flex flex-wrap gap-2">
          {PLATAFORMAS.map((p) => (
            <button key={p} onClick={() => setPlataforma(p)}
              className={cn('px-3 py-1.5 rounded-xl text-xs font-medium transition-all border',
                plataforma === p
                  ? 'border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent)]'
                  : 'border-white/10 text-gray-400'
              )}
            >{p}</button>
          ))}
        </div>
      </div>

      <Input label="URL del perfil (opcional)" value={url} onChange={(e) => setUrl(e.target.value)}
        placeholder="https://buyee.jp/user/..." />
      <Input label="Nota (opcional)" value={nota} onChange={(e) => setNota(e.target.value)}
        placeholder="Confiable, envío rápido, etc." />

      <button onClick={handleSave} disabled={loading} className="btn-primary w-full py-3.5 text-sm font-semibold mt-2">
        {loading ? <Spinner size="sm" /> : <><Check size={16} />{isEdit ? 'Guardar' : 'Agregar proveedor'}</>}
      </button>
    </Modal>
  )
}

export default function ProveedoresPage({ onBack }) {
  const toast = useToast()
  const confirmar = useConfirm()
  const qc = useQueryClient()
  const parejaId = useAuthStore((s) => s.pareja?.id)
  const { data: proveedores = [], isPending } = useProveedores()
  const [formOpen, setFormOpen] = useState(false)
  const [editProveedor, setEdit] = useState(null)

  const handleDelete = async (p) => {
    if (!(await confirmar({ message: '¿Eliminar a "' + p.nombre + '"?' }))) return
    try {
      await db.from('proveedores').update({ activo: false }, { id: p.id })
      qc.invalidateQueries({ queryKey: ['proveedores', parejaId] })
      toast.success('Proveedor eliminado')
    } catch (e) { toast.error(e.message) }
  }

  return (
    <>
      <div className="top-header">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-gray-400 text-lg hover:text-white px-1">
            ←
          </button>
          <div>
            <p className="section-label">Inventario</p>
            <h2 className="text-lg font-bold text-white">Proveedores</h2>
          </div>
        </div>
      </div>

      <div className="page px-4 pt-4">
        {isPending ? (
          <div className="space-y-3">{[1,2].map((i) => <div key={i} className="skeleton h-16" />)}</div>
        ) : proveedores.length === 0 ? (
          <EmptyState emoji="🏪" title="Sin proveedores"
            description="Agrega los vendedores de Buyee u otras plataformas donde compras tus cartas" />
        ) : (
          <div className="space-y-2">
            {proveedores.map((p) => (
              <div key={p.id} className="card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--accent-muted)] flex items-center justify-center text-lg flex-shrink-0">
                  🏪
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{p.nombre}</p>
                  <p className="text-xs text-gray-400">{p.plataforma}</p>
                  {p.nota && <p className="text-[11px] text-gray-600 truncate">{p.nota}</p>}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {p.url && (
                    <a href={p.url} target="_blank" rel="noreferrer"
                      aria-label="Abrir sitio del proveedor"
                      className="icon-btn text-gray-500 hover:text-[var(--accent)]">
                      <ExternalLink size={13} />
                    </a>
                  )}
                  <button onClick={() => { setEdit(p); setFormOpen(true) }}
                    aria-label="Editar proveedor" className="icon-btn text-gray-500 hover:text-white">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => handleDelete(p)}
                    aria-label="Eliminar proveedor" className="icon-btn text-gray-500 hover:text-bad">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button onClick={() => { setEdit(null); setFormOpen(true) }} className="fab">
        <Plus size={24} />
      </button>

      <FormProveedor
        open={formOpen}
        onClose={() => { setFormOpen(false); setEdit(null) }}
        proveedor={editProveedor}
      />
    </>
  )
}
