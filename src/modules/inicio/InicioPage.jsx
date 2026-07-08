// src/modules/inicio/InicioPage.jsx
import { LogOut, TrendingUp, TrendingDown, AlertCircle, ArrowRight } from 'lucide-react'
import { useAuthStore } from '@store/authStore'
import { useAppStore } from '@store/appStore'
import { useCuentas } from '@modules/accounts/hooks/useCuentas'
import { useTarjetas } from '@modules/cards/hooks/useTarjetas'
import { usePersonas } from '@modules/personas/hooks/usePersonas'
import { useDashboardData } from '@modules/dashboard/hooks/useDashboard'
import { fmt, cn } from '@lib/utils'

function EspacioCard({ emoji, titulo, subtitulo, valor, estado, onClick, badge }) {
  return (
    <button onClick={onClick} className="card p-4 text-left w-full active:scale-[0.98] transition-all">
      <div className="flex items-start justify-between mb-2">
        <span className="text-2xl">{emoji}</span>
        <div className="flex items-center gap-1.5">
          {badge && (
            <span className="text-[10px] bg-warn/20 text-warn px-1.5 py-0.5 rounded-full font-medium">{badge}</span>
          )}
          <ArrowRight size={14} className="text-gray-600" />
        </div>
      </div>
      <p className="text-sm font-semibold text-white mb-0.5">{titulo}</p>
      <p className="text-[11px] text-gray-500 mb-2">{subtitulo}</p>
      {valor && (
        <p className={cn('text-base font-bold font-mono',
          estado === 'ok' ? 'text-ok' : estado === 'warn' ? 'text-warn' : 'text-white')}>
          {valor}
        </p>
      )}
    </button>
  )
}

export default function InicioPage({ onNavegar }) {
  const { logout } = useAuthStore()
  const { nombres } = useAppStore()
  const { data: cuentas = [] }  = useCuentas()
  const { data: tarjetas = [] } = useTarjetas()
  const { data: personas = [] } = usePersonas()
  const { txMes } = useDashboardData()
  const txMesData = txMes.data || []

  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'

  const totalCuentas = cuentas.filter((c) => c.persona !== 'negocio').reduce((s, c) => s + Number(c.saldo), 0)
  const totalDeuda   = tarjetas.reduce((s, t) => s + Number(t.saldo_total), 0)
  const patrimonio   = totalCuentas - totalDeuda

  const ingresos = txMesData.filter((t) => t.tipo === 'ingreso' && t.contexto !== 'negocio').reduce((s, t) => s + Number(t.monto), 0)
  const gastos   = txMesData.filter((t) => t.tipo === 'gasto'   && t.contexto !== 'negocio').reduce((s, t) => s + Number(t.monto), 0)
  const flujo    = ingresos - gastos

  const saldoNegocio = cuentas.filter((c) => c.persona === 'negocio').reduce((s, c) => s + Number(c.saldo), 0)
  const personasPendientes = personas.filter((p) => Math.abs(Number(p.saldo)) > 0)

  // Alertas automáticas
  const alertas = []
  tarjetas.forEach((t) => {
    if (t.dia_limite_pago) {
      const hoy = new Date()
      const limite = new Date(hoy.getFullYear(), hoy.getMonth(), t.dia_limite_pago)
      const dias = Math.ceil((limite - hoy) / 86400000)
      if (dias >= 0 && dias <= 5) {
        alertas.push({ msg: `Pago ${t.nombre} vence ${dias === 0 ? 'hoy' : `en ${dias} días`}`, tipo: 'warn' })
      }
    }
  })
  if (personasPendientes.length > 0) {
    alertas.push({ msg: `${personasPendientes.length} ${personasPendientes.length === 1 ? 'persona' : 'personas'} con saldo pendiente`, tipo: 'info' })
  }

  const ultimos = [...txMesData].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 4)

  return (
    <>
      <div className="flex-shrink-0 px-4 pb-4 border-b border-white/[0.06]"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 20px)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-gray-500">{saludo}, {nombres.p1} 👋</p>
            <h1 className="text-xl font-bold text-white">{nombres.p1} & {nombres.p2}</h1>
          </div>
          <button onClick={logout} className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-white rounded-xl">
            <LogOut size={18} />
          </button>
        </div>

        <div className="bg-surface-700 rounded-2xl p-4">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Patrimonio total</p>
          <p className={cn('text-3xl font-bold font-mono', patrimonio >= 0 ? 'text-white' : 'text-bad')}>
            {fmt(patrimonio)}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            {flujo >= 0 ? <TrendingUp size={13} className="text-ok" /> : <TrendingDown size={13} className="text-bad" />}
            <p className={cn('text-xs font-mono', flujo >= 0 ? 'text-ok' : 'text-bad')}>
              {flujo >= 0 ? '+' : ''}{fmt(flujo)} este mes
            </p>
          </div>
        </div>
      </div>

      <div className="page px-4 pt-4 space-y-3">
        {alertas.length > 0 && (
          <div className="space-y-2">
            {alertas.map((a, i) => (
              <div key={i} className={cn('flex items-center gap-2.5 p-3 rounded-xl',
                a.tipo === 'warn' ? 'bg-warn/10 border border-warn/20' : 'bg-[var(--accent-muted)] border border-[var(--accent)]/20'
              )}>
                <AlertCircle size={14} className={a.tipo === 'warn' ? 'text-warn' : 'text-[var(--accent)]'} />
                <p className="text-xs text-gray-200">{a.msg}</p>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <EspacioCard emoji="👤" titulo="Personal" subtitulo="Tus finanzas"
            valor={fmt(totalCuentas)} onClick={() => onNavegar('finanzas')} />
          <EspacioCard emoji="❤️" titulo="Pareja" subtitulo={`${nombres.p1} & ${nombres.p2}`}
            valor={fmt(patrimonio)} onClick={() => onNavegar('finanzas', 'pareja')} />
          <EspacioCard emoji="🏪" titulo="Negocio" subtitulo="Inventario y ventas"
            valor={saldoNegocio > 0 ? fmt(saldoNegocio) : '—'} onClick={() => onNavegar('negocio')} />
          <EspacioCard emoji="👥" titulo="Personas" subtitulo="Deudas y cobros"
            badge={personasPendientes.length > 0 ? String(personasPendientes.length) : null}
            valor={personasPendientes.length > 0 ? `${personasPendientes.length} pendientes` : 'Al día'}
            estado={personasPendientes.length > 0 ? 'warn' : 'ok'}
            onClick={() => onNavegar('personas')} />
        </div>

        {ultimos.length > 0 && (
          <div className="card px-3">
            <div className="flex items-center justify-between py-3 border-b border-white/[0.06]">
              <p className="text-sm font-semibold text-white">Actividad reciente</p>
              <button onClick={() => onNavegar('finanzas', 'movimientos')} className="text-xs text-[var(--accent)]">
                Ver todo
              </button>
            </div>
            {ultimos.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
                <div className="w-8 h-8 rounded-xl bg-surface-700 flex items-center justify-center text-sm flex-shrink-0">
                  {tx.tipo === 'ingreso' ? '↓' : '↑'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white truncate">{tx.descripcion || tx.categoria}</p>
                  <p className="text-[10px] text-gray-500">{tx.fecha}</p>
                </div>
                <p className={cn('text-xs font-mono font-semibold flex-shrink-0',
                  tx.tipo === 'ingreso' ? 'text-ok' : 'text-white')}>
                  {tx.tipo === 'ingreso' ? '+' : '-'}{fmt(tx.monto)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
