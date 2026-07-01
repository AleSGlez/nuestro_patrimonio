// src/modules/personas/components/FormPersona.jsx
import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import Modal from '@ui/Modal'
import { Input } from '@ui/Field'
import Spinner from '@ui/Spinner'
import { useToast } from '@ui/Toast'
import { useCrearPersona, useActualizarPersona } from '../hooks/usePersonas'

const EMOJIS = ['👤','👨','👩','👦','👧','👴','👵','🧑','👫','🤝','🏪','🏦','👨‍💼','👩‍💼']

export default function FormPersona({ open, onClose, persona = null }) {
  const toast = useToast()
  const crear = useCrearPersona()
  const actualizar = useActualizarPersona()
  const isEdit = Boolean(persona)
  const loading = crear.isPending || actualizar.isPending

  const [nombre, setNombre]   = useState('')
  const [emoji, setEmoji]     = useState('👤')
  const [telefono, setTel]    = useState('')
  const [nota, setNota]       = useState('')

  useEffect(() => {
    if (!open) return
    if (persona) {
      setNombre(persona.nombre); setEmoji(persona.emoji)
      setTel(persona.telefono || ''); setNota(persona.nota || '')
    } else {
      setNombre(''); setEmoji('👤'); setTel(''); setNota('')
    }
  }, [open, persona])

  const handleSave = async () => {
    if (!nombre.trim()) { toast.error('Ingresa el nombre'); return }
    const payload = { nombre: nombre.trim(), emoji, telefono: telefono.trim() || null, nota: nota.trim() || null }
    try {
      if (isEdit) {
        await actualizar.mutateAsync({ id: persona.id, data: payload })
        toast.success('Persona actualizada')
      } else {
        await crear.mutateAsync(payload)
        toast.success('Persona agregada')
      }
      onClose()
    } catch (e) { toast.error(e.message) }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar persona' : 'Nueva persona'}>
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

      <Input label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Carlos, Mamá, Proveedor X" autoFocus />
      <Input label="Teléfono (opcional)" value={telefono} onChange={(e) => setTel(e.target.value)} placeholder="55 1234 5678" />
      <Input label="Nota (opcional)" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej: amigo del trabajo" />

      <button onClick={handleSave} disabled={loading} className="btn-primary w-full py-3.5 text-sm font-semibold mt-4">
        {loading ? <Spinner size="sm" /> : <><Check size={16} />{isEdit ? 'Guardar cambios' : 'Agregar persona'}</>}
      </button>
    </Modal>
  )
}
