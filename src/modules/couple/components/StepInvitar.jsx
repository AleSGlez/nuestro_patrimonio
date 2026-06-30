// src/modules/couple/components/StepInvitar.jsx
import { useState } from 'react'
import { Copy, Check, Share2 } from 'lucide-react'
import { useToast } from '@ui/Toast'

export default function StepInvitar({ codigo, nombres }) {
  const toast = useToast()
  const [copiado, setCopiado] = useState(false)

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(codigo)
      setCopiado(true)
      toast.success('Código copiado')
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      toast.error('No se pudo copiar')
    }
  }

  const compartir = async () => {
    const texto = `¡Hola! Únete a nuestra cuenta en Nuestro Patrimonio 💑\n\nCódigo: ${codigo}\n\nDescarga la app y úsalo al registrarte.`
    if (navigator.share) {
      try { await navigator.share({ text: texto }) } catch {}
    } else {
      copiar()
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <div className="text-4xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-white mb-2">¡Ya casi!</h2>
        <p className="text-sm text-gray-400 px-2">
          Comparte este código con {nombres.p2 || 'tu pareja'} para que se una
        </p>
      </div>

      <div className="card p-6 mb-4 text-center">
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Código de invitación</p>
        <p className="text-4xl font-mono font-bold tracking-[0.3em] gradient-text mb-4">
          {codigo}
        </p>
        <div className="flex gap-2">
          <button
            onClick={copiar}
            className="btn-ghost flex-1 py-2.5 text-sm"
          >
            {copiado ? <Check size={15} /> : <Copy size={15} />}
            {copiado ? 'Copiado' : 'Copiar'}
          </button>
          <button
            onClick={compartir}
            className="btn-primary flex-1 py-2.5 text-sm"
          >
            <Share2 size={15} />
            Compartir
          </button>
        </div>
      </div>

      <div className="p-4 bg-[var(--accent-muted)] border border-[var(--accent)]/20 rounded-2xl">
        <p className="text-xs text-gray-300 leading-relaxed">
          Tu pareja debe crear su propia cuenta en la app y elegir
          <strong className="text-white"> "Tengo un código"</strong> durante su configuración.
          Pueden hacerlo ahora o después — el código no expira.
        </p>
      </div>
    </div>
  )
}
