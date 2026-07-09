// src/modules/clientes/ClientesPage.jsx
import { useState } from 'react'
import { Plus, Pencil, Trash2, ChevronRight, Check, Phone, Instagram } from 'lucide-react'
import { useClientes, useCrearCliente, useActualizarCliente, useEliminarCliente, useVentasCliente } from './hooks/useClientes'
import { useToast } from '@ui/Toast'
import { EmptyState, Input } from '@ui/Field'
import Modal from '@ui/Modal'
import Spinner from '@ui/Spinner'
import { fmt, cn, fmtDate } from '@lib/utils'

function FormCliente({ open, onClose, cliente = null }) {
  const toast = useToast()
  const crear = useCrearCliente()
  const actualizar = useActualizarCliente()
  const isEdit = Boolean(cliente)
  const loading = crear.isPending || actualizar.isPending

  const [nombre, setNombre]       = useState(cliente?.nombre || '')
  const [telefono, setTelefono]   = useState(cliente?.telefono || '')
  const [email, setEmail]         = useState(cliente?.email || '')
  const [instagram, setInstagram] = useState(cliente?.instagram || '')
  const [wishlist, setWishlist]   = useState(cliente?.wishlist || '')
  const [nota, setNota]           = useState(cliente?.nota || '')

  const handleSave = async () => {
    if (!nombre.trim()) { toast.error('Ingresa el nombre'); return }
    const payload = {
      nombre: nombre.trim(),
      telefono: telefono.trim() || null,
      email: email.trim() || null,
      instagram: instagram.trim() || null,
      wishlist: wishlist.trim() || null,
      nota: nota.trim() || null,
    }
    try {
      if (isEdit) {
        await actualizar.mutateAsync({ id: cliente.id, data: payload })
        toast.success('Cliente actualizado')
      } else {
        await crear.mutateAsync(payload)
        toast.success('Cliente agregado')
      }
      onClose()
    } catch (e) { toast.error(e.message) }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar cliente' : 'Nuevo cliente'}>
      <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)}
        placeholder="Nombre del cliente" autoFocus />
      <Input label="Teléfono" value={telefono} onChange={(e) => setTelefono(e.target.value)}
        placeholder="55 1234 5678" />
      <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)}
        placeholder="correo@ejemplo.com" />
      <Input label="Instagram" value={instagram} onChange={(e) => setInstagram(e.target.value)}
        placeholder="@usuario" />
      <div className="mb-4">
        <label className="label">Wishlist / Cartas que busca</label>
        <textarea
          value={wishlist}
          onChange={(e) => setWishlist(e.target.value)}
          placeholder="Ej: Charizard Base Set, cartas de Illustrator Mitsuhiro Arita, cajas Vintage..."
          className="input min-h-[80px] resize-none"
          rows={3}
        />
      </div>
      <Input label="Nota" value={nota} onChange={(e) => setNota(e.target.value)}
        placeholder="Comentarios adicionales" />
      <button onClick={handleSave} disabled={loading} className="btn-primary w-full py-3.5 text-sm font-semibold mt-2">
        {loading ? <Spinner size="sm" /> : <><Check size={16} />{isEdit ? 'Guardar' : 'Agregar cliente'}</>}
      </button>
    </Modal>
  )
}

function DetalleCliente({ cliente, onClose, onEdit }) {
  const { data: ventas = [] } = useVentasCliente(cliente?.id)
  if (!cliente) return null

  const totalComprado = ventas.reduce((s, v) => s + Number(v.total_venta), 0)

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="w-full max-w-[430px] mx-auto bg-surface-800 rounded-t-3xl p-5 border-t border-white/10 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />

        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-base font-bold text-white">{cliente.nombre}</p>
            <div className="flex gap-3 mt-1">
              {cliente.telefono && (
                <a href={`tel:${cliente.telefono}`} className="flex items-center gap-1 text-[11px] text-[var(--accent)]">
                  <Phone size={11} /> {cliente.telefono}
                </a>
              )}
              {cliente.instagram && (
                <span className="flex items-center gap-1 text-[11px] text-gray-400">
                  <Instagram size={11} /> {cliente.instagram}
                </span>
              )}
            </div>
          </div>
          <button onClick={() => onEdit(cliente)} className="btn-ghost px-2 py-1 text-xs">
            <Pencil size={13} /> Editar
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-surface-700 rounded-xl p-3 text-center">
            <p className="text-[10px] text-gray-500">Compras</p>
            <p className="text-lg font-bold text-white">{ventas.length}</p>
          </div>
          <div className="bg-surface-700 rounded-xl p-3 text-center">
            <p className="text-[10px] text-gray-500">Total gastado</p>
            <p className="text-sm font-bold font-mono text-[var(--accent)]">{fmt(totalComprado)}</p>
          </div>
        </div>

        {/* Wishlist */}
        {cliente.wishlist && (
          <div className="bg-surface-700 rounded-xl p-3 mb-4">
            <p className="text-xs font-semibold text-white mb-1">🎯 Busca / Colecciona</p>
            <p className="text-xs text-gray-300 leading-relaxed">{cliente.wishlist}</p>
          </div>
        )}

        {/* Historial de compras */}
        <p className="section-label mb-2">Historial de compras</p>
        {ventas.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-3">Sin compras registradas</p>
        ) : (
          <div className="space-y-2">
            {ventas.map((v) => (
              <div key={v.id} className="flex items-center justify-between p-2.5 bg-surface-700 rounded-xl">
                <div>
                  <p className="text-xs text-white">{fmtDate(v.fecha)}</p>
                  <p className="text-[10px] text-gray-500">{v.metodo_cobro}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-mono text-white">{fmt(v.total_venta)}</p>
                  <p className="text-[10px] text-ok">+{fmt(v.ganancia)} ganancia</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <button onClick={onClose} className="btn-ghost w-full py-2.5 text-sm mt-4">Cerrar</button>
      </div>
    </div>
  )
}

export default function ClientesPage() {
  const toast = useToast()
  const { data: clientes = [], isPending } = useClientes()
  const eliminar = useEliminarCliente()
  const [formOpen, setFormOpen]       = useState(false)
  const [editCliente, setEditCliente] = useState(null)
  const [detalle, setDetalle]         = useState(null)

  const handleDelete = async (c) => {
    if (!confirm(`¿Eliminar a "${c.nombre}"?`)) return
    try { await eliminar.mutateAsync(c.id); toast.success('Cliente eliminado') }
    catch (e) { toast.error(e.message) }
  }

  return (
    <>
      <div className="top-header">
        <p className="text-sm text-gray-400">{clientes.length} cliente{clientes.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="page px-4 pt-4">
        {isPending ? (
          <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="skeleton h-16" />)}</div>
        ) : clientes.length === 0 ? (
          <EmptyState emoji="👤" title="Sin clientes"
            description="Agrega tus compradores frecuentes para llevar su historial" />
        ) : (
          <div className="space-y-2">
            {clientes.map((c) => (
              <button key={c.id} onClick={() => setDetalle(c)}
                className="card p-4 w-full text-left active:scale-[0.98] flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[var(--accent-muted)] flex items-center justify-center text-lg flex-shrink-0">
                  👤
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{c.nombre}</p>
                  <p className="text-[11px] text-gray-500">
                    {c.telefono || c.instagram || c.email || 'Sin contacto'}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={(e) => { e.stopPropagation(); setEditCliente(c); setFormOpen(true) }}
                    className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-white">
                    <Pencil size={13} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(c) }}
                    className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-bad">
                    <Trash2 size={13} />
                  </button>
                  <ChevronRight size={14} className="text-gray-600" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <button onClick={() => { setEditCliente(null); setFormOpen(true) }} className="fab">
        <Plus size={24} />
      </button>

      <FormCliente open={formOpen} onClose={() => { setFormOpen(false); setEditCliente(null) }} cliente={editCliente} />
      {detalle && (
        <DetalleCliente
          cliente={detalle}
          onClose={() => setDetalle(null)}
          onEdit={(c) => { setDetalle(null); setEditCliente(c); setFormOpen(true) }}
        />
      )}
    </>
  )
}
