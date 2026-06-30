// src/modules/dashboard/DashboardPage.jsx
// Placeholder — Fase 5 construye el dashboard completo
import { Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '@store/authStore'
import { useAppStore } from '@store/appStore'
import { usePareja } from '@modules/couple/hooks/usePareja'
import { useToast } from '@ui/Toast'

export default function DashboardPage() {
  const { user, logout, pareja } = useAuthStore()
  const { nombres } = useAppStore()
  const { isLoading } = usePareja()
  const toast = useToast()
  const [copiado, setCopiado] = useState(false)

  const parejaCompleta = pareja?.user1_id && pareja?.user2_id

  const copiarCodigo = async () => {
    if (!pareja?.codigo_invitacion) return
    await navigator.clipboard.writeText(pareja.codigo_invitacion)
    setCopiado(true)
    toast.success('Código copiado')
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <div className="page p-4">
      <div className="card p-6 text-center mb-4">
        <div className="text-4xl mb-3">🏗️</div>
        <h2 className="text-white font-semibold mb-1">Dashboard</h2>
        <p className="text-sm text-gray-400 mb-1">{nombres.p1} & {nombres.p2}</p>
        <p className="text-xs text-gray-500 mb-4">{user?.email}</p>
        <div className="badge-ok inline-flex mb-2">Fase 2 ✅ — Setup funcionando</div>
      </div>

      {!isLoading && pareja && !parejaCompleta && (
        <div className="card p-5 mb-4 border-[var(--accent)]/30">
          <p className="text-sm text-white font-semibold mb-1">Esperando a {nombres.p2}</p>
          <p className="text-xs text-gray-400 mb-3">Comparte este código para que se una:</p>
          <div className="flex items-center gap-2">
            <p className="flex-1 text-center text-xl font-mono font-bold tracking-[0.2em] gradient-text">
              {pareja.codigo_invitacion}
            </p>
            <button onClick={copiarCodigo} className="btn-ghost w-10 h-10 rounded-xl flex-shrink-0">
              {copiado ? <Check size={15} /> : <Copy size={15} />}
            </button>
          </div>
        </div>
      )}

      {parejaCompleta && (
        <div className="card p-4 mb-4 bg-ok/5 border-ok/20">
          <p className="text-sm text-ok font-medium text-center">✅ Pareja vinculada completa</p>
        </div>
      )}

      <button onClick={logout} className="btn-ghost w-full py-2.5 text-sm">
        Cerrar sesión
      </button>
    </div>
  )
}
