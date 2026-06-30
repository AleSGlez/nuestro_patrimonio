// src/modules/couple/components/StepInicio.jsx
import { Heart, Users, KeyRound } from 'lucide-react'
import { cn } from '@lib/utils'

export default function StepInicio({ modo, setModo }) {
  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-[var(--accent-muted)] border border-[var(--accent)]/20 flex items-center justify-center mx-auto mb-4">
          <Heart size={28} className="text-[var(--accent)]" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">¡Bienvenidos!</h2>
        <p className="text-sm text-gray-400 leading-relaxed px-2">
          ¿Vas a crear la cuenta de la pareja o tu pareja ya empezó?
        </p>
      </div>

      <div className="space-y-3">
        <button
          onClick={() => setModo('crear')}
          className={cn(
            'w-full p-4 rounded-2xl border text-left transition-all duration-150',
            modo === 'crear'
              ? 'border-[var(--accent)] bg-[var(--accent-muted)]'
              : 'border-white/10 bg-surface-700 active:scale-[0.98]'
          )}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-muted)] flex items-center justify-center flex-shrink-0">
              <Users size={18} className="text-[var(--accent)]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Soy el primero</p>
              <p className="text-xs text-gray-400 mt-0.5">Voy a crear la cuenta de la pareja</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setModo('unirse')}
          className={cn(
            'w-full p-4 rounded-2xl border text-left transition-all duration-150',
            modo === 'unirse'
              ? 'border-[var(--accent)] bg-[var(--accent-muted)]'
              : 'border-white/10 bg-surface-700 active:scale-[0.98]'
          )}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-muted)] flex items-center justify-center flex-shrink-0">
              <KeyRound size={18} className="text-[var(--accent)]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Tengo un código</p>
              <p className="text-xs text-gray-400 mt-0.5">Mi pareja ya generó un código de invitación</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}
