// src/modules/dashboard/DashboardPage.jsx
// Shell principal — orquesta los 5 módulos de primer nivel
import { useState } from 'react'
import { useAppStore } from '@store/appStore'
import BottomNav from '@shared/components/layout/BottomNav'
import InicioPage      from '@modules/inicio/InicioPage'
import FinanzasPage    from '@modules/finanzas/FinanzasPage'
import PersonasHubPage from '@modules/personas-hub/PersonasHubPage'
import NegocioHubPage  from '@modules/negocio-hub/NegocioHubPage'
import MasPage         from '@modules/mas/MasPage'

// appStore.tab ahora usa: 'inicio' | 'finanzas' | 'personas' | 'negocio' | 'mas'
// Con subTab opcional: 'finanzas:movimientos', 'finanzas:pareja', etc.

export default function DashboardPage() {
  const { tab, setTab } = useAppStore()
  const [finanzasSubTab, setFinanzasSubTab] = useState('resumen')

  // Permite navegación programática con sub-tab
  // onNavegar('finanzas', 'movimientos') → va a Finanzas tab Movimientos
  const handleNavegar = (nuevoTab, subTab) => {
    if (nuevoTab === 'finanzas' && subTab) setFinanzasSubTab(subTab)
    setTab(nuevoTab)
  }

  const handleTabChange = (nuevoTab) => {
    setTab(nuevoTab)
  }

  const renderTab = () => {
    switch (tab) {
      case 'inicio':    return <InicioPage onNavegar={handleNavegar} />
      case 'finanzas':  return <FinanzasPage subTab={finanzasSubTab} />
      case 'personas':  return <PersonasHubPage />
      case 'negocio':   return <NegocioHubPage />
      case 'mas':       return <MasPage />
      default:          return <InicioPage onNavegar={handleNavegar} />
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {renderTab()}
      <BottomNav active={tab} onChange={handleTabChange} />
    </div>
  )
}
