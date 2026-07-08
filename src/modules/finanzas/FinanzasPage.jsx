// src/modules/finanzas/FinanzasPage.jsx
import { useState } from 'react'
import SubNav from '@shared/components/layout/SubNav'
import DashboardPersonal from '@modules/dashboard/components/DashboardPersonal'
import AccountsPage from '@modules/accounts/AccountsPage'
import CardsPage from '@modules/cards/CardsPage'
import TransactionsPage from '@modules/transactions/TransactionsPage'
import PresupuestosPage from '@modules/presupuestos/PresupuestosPage'
import CalendarioPage from '@modules/calendario/CalendarioPage'
import SuscripcionesPage from '@modules/suscripciones/SuscripcionesPage'
import { useDashboardData } from '@modules/dashboard/hooks/useDashboard'
import { useAppStore } from '@store/appStore'

const TABS = [
  { id: 'resumen',       label: 'Resumen',       emoji: '📊' },
  { id: 'cuentas',       label: 'Cuentas',       emoji: '🏦' },
  { id: 'tarjetas',      label: 'Tarjetas',      emoji: '💳' },
  { id: 'movimientos',   label: 'Movimientos',   emoji: '↕️' },
  { id: 'presupuestos',  label: 'Presupuestos',  emoji: '🎯' },
  { id: 'suscripciones', label: 'Suscripciones', emoji: '🔄' },
  { id: 'calendario',    label: 'Calendario',    emoji: '📅' },
]

export default function FinanzasPage({ subTab = 'resumen' }) {
  const [tab, setTab] = useState(subTab)
  const { nombres } = useAppStore()
  const { txMes, txHistorico } = useDashboardData()

  const renderTab = () => {
    switch (tab) {
      case 'resumen':       return (
        <DashboardPersonal
          txMesData={txMes.data || []}
          txHistoricoData={txHistorico.data || []}
          nombres={nombres}
        />
      )
      case 'cuentas':       return <AccountsPage />
      case 'tarjetas':      return <CardsPage />
      case 'movimientos':   return <TransactionsPage />
      case 'presupuestos':  return <PresupuestosPage />
      case 'suscripciones': return <SuscripcionesPage />
      case 'calendario':    return <CalendarioPage />
      default:              return null
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      <SubNav tabs={TABS} active={tab} onChange={setTab} titulo="Finanzas" />
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {renderTab()}
      </div>
    </div>
  )
}
