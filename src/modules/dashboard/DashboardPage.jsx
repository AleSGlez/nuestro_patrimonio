// src/modules/dashboard/DashboardPage.jsx
// Placeholder — Fase 5 construye el dashboard completo
import { useAuthStore } from '@store/authStore'
import { useAppStore } from '@store/appStore'

export default function DashboardPage() {
  const { user, logout } = useAuthStore()
  const { nombres } = useAppStore()
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="card p-6 text-center">
        <div className="text-4xl mb-3">🏗️</div>
        <h2 className="text-white font-semibold mb-1">Dashboard</h2>
        <p className="text-sm text-gray-400 mb-1">
          {nombres.p1} & {nombres.p2}
        </p>
        <p className="text-xs text-gray-500 mb-4">{user?.email}</p>
        <div className="badge-ok inline-flex mb-4">Fase 1 ✅ — Auth funcionando</div>
        <br />
        <button onClick={logout} className="btn-ghost px-6 py-2 text-sm mt-2">
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
