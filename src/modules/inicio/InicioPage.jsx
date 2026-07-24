// src/modules/inicio/InicioPage.jsx
import { LogOut, Settings, TrendingUp, TrendingDown, AlertCircle, ArrowRight } from 'lucide-react'
import { useAuthStore } from '@store/authStore'
import { useAppStore } from '@store/appStore'
import { useCuentas } from '@modules/accounts/hooks/useCuentas'
import { useTarjetas, calcularFechasCorte, diasHasta } from '@modules/cards/hooks/useTarjetas'
import { useTodosLosApartados } from '@modules/accounts/hooks/useApartados'
import { usePersonas } from '@modules/personas/hooks/usePersonas'
import { useDashboardData } from '@modules/dashboard/hooks/useDashboard'
import AccesosRapidosSection from '@modules/accesosRapidos/components/AccesosRapidosSection'
import { fmt, cn, sumaApartadosPersonales } from '@lib/utils'

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
      <p className="text-[11px] text-gray-400 mb-2">{subtitulo}</p>
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
  const { logout, pareja, user } = useAuthStore()
  const { nombres } = useAppStore()
  const { data: cuentas = [] }       = useCuentas()
  const { data: tarjetas = [] }      = useTarjetas()
  const { data: todosApartados = [] } = useTodosLosApartados()
  const { data: personas = [] } = usePersonas()
  const { txMes } = useDashboardData()
  const txMesData = txMes.data || []

  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'

  // Los apartados personales viven fuera de cuenta.saldo — sin sumarlos el
  // patrimonio subestima todo el dinero apartado
  const totalCuentas = cuentas.filter((c) => c.persona !== 'negocio').reduce((s, c) => s + Number(c.saldo), 0)
    + sumaApartadosPersonales(todosApartados, cuentas, (c) => c.persona !== 'negocio')
  const totalDeuda   = tarjetas.reduce((s, t) => s + Number(t.saldo_total), 0)
  const patrimonio   = totalCuentas - totalDeuda

  const ingresos = txMesData.filter((t) => t.tipo === 'ingreso' && t.contexto !== 'negocio').reduce((s, t) => s + Number(t.monto), 0)
  const gastos   = txMesData.filter((t) => t.tipo === 'gasto'   && t.contexto !== 'negocio').reduce((s, t) => s + Number(t.monto), 0)
  const flujo    = ingresos - gastos

  // Determinar quién es el usuario logueado (p1 = quien creó, p2 = quien se unió)
  const miPersona  = pareja?.user2_id === user?.id ? 'p2' : 'p1'
  const suPersona  = miPersona === 'p1' ? 'p2' : 'p1'
  const miNombre   = miPersona === 'p1' ? nombres.p1 : nombres.p2
  const suNombre   = miPersona === 'p1' ? nombres.p2 : nombres.p1

  // Capital negocio = cuentas de negocio + apartados marcados es_negocio
  const saldoCuentasNegocio   = cuentas.filter((c) => c.persona === 'negocio').reduce((s, c) => s + Number(c.saldo), 0)
  const saldoApartadosNegocio = todosApartados.filter((a) => a.es_negocio).reduce((s, a) => s + Number(a.monto), 0)
  const saldoNegocio          = saldoCuentasNegocio + saldoApartadosNegocio
  const personasPendientes = personas.filter((p) => Math.abs(Number(p.saldo)) > 0)

  // Patrimonio del usuario logueado
  const misCuentas    = cuentas.filter((c) => c.persona === miPersona).reduce((s, c) => s + Number(c.saldo), 0)
    + sumaApartadosPersonales(todosApartados, cuentas, (c) => c.persona === miPersona)
  const misTarjetas   = tarjetas.filter((t) => t.persona === miPersona).reduce((s, t) => s + Number(t.saldo_total), 0)
  const miPatrimonio  = misCuentas - misTarjetas

  // Patrimonio de la pareja (el otro usuario)
  const susCuentas    = cuentas.filter((c) => c.persona === suPersona).reduce((s, c) => s + Number(c.saldo), 0)
    + sumaApartadosPersonales(todosApartados, cuentas, (c) => c.persona === suPersona)
  const susTarjetas   = tarjetas.filter((t) => t.persona === suPersona).reduce((s, t) => s + Number(t.saldo_total), 0)
  const suPatrimonio  = susCuentas - susTarjetas

  // Solo alertas de tarjetas — personas ya aparece en el grid
  const alertas = []
  tarjetas.forEach((t) => {
    if (t.dia_corte && t.dia_limite_pago) {
      const { limite } = calcularFechasCorte(t.dia_corte, t.dia_limite_pago)
      const dias = diasHasta(limite)
      if (dias != null && dias >= 0 && dias <= 5) {
        alertas.push({ msg: `Pago ${t.nombre} vence ${dias === 0 ? 'hoy' : `en ${dias} días`}`, tipo: 'warn' })
      }
    }
  })

  const ultimos = [...txMesData].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 5)

  return (
    <>
      <div className="flex-shrink-0 px-4 pb-4 border-b border-white/[0.06]"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 20px)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-gray-400">{saludo},</p>
            <h1 className="text-xl font-bold text-white">{miNombre} 👋</h1>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => onNavegar('mas')} aria-label="Configuración" className="icon-btn text-gray-500 hover:text-white">
              <Settings size={18} />
            </button>
            <button onClick={logout} aria-label="Cerrar sesión" className="icon-btn text-gray-500 hover:text-white">
              <LogOut size={18} />
            </button>
          </div>
        </div>

        <div className="bg-surface-700 rounded-2xl p-4">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Patrimonio total</p>
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
        <AccesosRapidosSection />

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
          <EspacioCard emoji="👤" titulo={miNombre} subtitulo="Mi patrimonio"
            valor={fmt(miPatrimonio)}
            estado={miPatrimonio >= 0 ? null : 'warn'}
            onClick={() => onNavegar('finanzas')} />
          <EspacioCard emoji="❤️" titulo={`${nombres.p1} & ${nombres.p2}`} subtitulo="Patrimonio conjunto"
            valor={fmt(patrimonio)}
            estado={patrimonio >= 0 ? null : 'warn'}
            onClick={() => onNavegar('finanzas', 'pareja')} />
          <EspacioCard emoji="🏪" titulo="Negocio" subtitulo="Capital disponible"
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
            {ultimos.map((tx) => {
              const isIngreso = tx.tipo === 'ingreso'
              return (
                <div key={tx.id} className="flex items-center gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
                  <div className={cn(
                    'w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0',
                    isIngreso ? 'bg-ok/10' : 'bg-bad/10'
                  )}>
                    {isIngreso
                      ? <TrendingUp size={15} className="text-ok" />
                      : <TrendingDown size={15} className="text-bad" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white truncate">{tx.descripcion || tx.categoria}</p>
                    <p className="text-[10px] text-gray-400">
                      {tx.fecha} · {tx.persona === 'p1' ? nombres.p1 : tx.persona === 'p2' ? nombres.p2 : 'Ambos'}
                    </p>
                  </div>
                  <p className={cn('text-xs font-mono font-semibold flex-shrink-0',
                    isIngreso ? 'text-ok' : 'text-bad')}>
                    {isIngreso ? '+' : '-'}{fmt(tx.monto)}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
