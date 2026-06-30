// src/modules/couple/components/StepUnirse.jsx
import { useState } from 'react'
import { KeyRound, Check } from 'lucide-react'
import { db } from '@lib/supabase'
import { useAuthStore } from '@store/authStore'
import { useToast } from '@ui/Toast'
import Spinner from '@ui/Spinner'

export default function StepUnirse({ onJoined }) {
  const user = useAuthStore((s) => s.user)
  const toast = useToast()
  const [codigo, setCodigo]   = useState('')
  const [loading, setLoading] = useState(false)
  const [nombre, setNombre]   = useState('')

  const handleBuscar = async () => {
    const code = codigo.trim().toUpperCase()
    if (code.length !== 6) { toast.error('El código tiene 6 caracteres'); return }
    if (!nombre.trim())    { toast.error('Ingresa tu nombre'); return }

    setLoading(true)
    try {
      const result = await db.from('parejas').query({ codigo_invitacion: `eq.${code}` })
      const pareja = result?.[0]

      if (!pareja) { toast.error('Código no encontrado'); setLoading(false); return }
      if (pareja.user2_id) { toast.error('Esta pareja ya está completa'); setLoading(false); return }
      if (pareja.user1_id === user.id) { toast.error('Ese es tu propio código'); setLoading(false); return }

      const [updated] = await db.from('parejas').update(
        { user2_id: user.id, nombre2: nombre.trim() },
        { id: pareja.id }
      )

      await db.from('perfiles').insert({
        pareja_id: pareja.id,
        user_id:   user.id,
        nombre:    nombre.trim(),
        persona:   'p2',
      })

      toast.success(`¡Listo! Te uniste a la pareja de ${pareja.nombre1} 🎉`)
      onJoined(updated)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-[var(--accent-muted)] border border-[var(--accent)]/20 flex items-center justify-center mx-auto mb-4">
          <KeyRound size={28} className="text-[var(--accent)]" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Ingresa el código</h2>
        <p className="text-sm text-gray-400">Tu pareja te lo compartió al crear la cuenta</p>
      </div>

      <div className="mb-4">
        <label className="label">Tu nombre</label>
        <input
          type="text" value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="¿Cómo te llamas?"
          className="input"
        />
      </div>

      <div className="mb-6">
        <label className="label">Código de invitación</label>
        <input
          type="text"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase().slice(0, 6))}
          placeholder="XXXXXX"
          className="input text-center text-2xl font-mono font-bold tracking-[0.3em] uppercase"
          maxLength={6}
        />
      </div>

      <button
        onClick={handleBuscar}
        disabled={loading}
        className="btn-primary w-full py-3.5 text-sm font-semibold"
      >
        {loading ? <Spinner size="sm" /> : <><Check size={16} />Unirme</>}
      </button>
    </div>
  )
}
