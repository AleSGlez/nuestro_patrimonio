// src/modules/dashboard/DashboardPage.jsx
import { useState } from 'react'
import { useAppStore } from '@store/appStore'
import BottomNav from '@shared/components/layout/BottomNav'
import InicioPage      from '@modules/inicio/InicioPage'
import FinanzasPage    from '@modules/finanzas/FinanzasPage'
import PersonasHubPage from '@modules/personas-hub/PersonasHubPage'
import NegocioHubPage  from '@modules/negocio-hub/NegocioHubPage'
import MasPage         from '@modules/mas/MasPage'
import FormTransaccion from '@modules/transactions/components/FormTransaccion'

export default function DashboardPage() {
  const { tab, setTab } = useAppStore()
  const [finanzasSubTab, setFinanzasSubTab] = useState('resumen')
  const [formOpen, setFormOpen] = useState(false)
  const [formTipo, setFormTipo] = useState('gasto')
  const [formContexto, setFormContexto] = useState('personal')

  const handleNavegar = (nuevoTab, subTab) => {
    if (nuevoTab === 'finanzas' && subTab) setFinanzasSubTab(subTab)
    setTab(nuevoTab)
  }

  const handleAccion = (accion) => {
    if (accion === 'gasto' || accion === 'ingreso') {
      setFormTipo(accion)
      setFormContexto('personal')
      setFormOpen(true)
    } else if (accion === 'transferencia') {
      // Navega a movimientos con tab transferencias
      setTab('finanzas')
      setFinanzasSubTab('movimientos')
    } else if (accion === 'suscripcion') {
      setTab('finanzas')
      setFinanzasSubTab('suscripciones')
    }
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
      <BottomNav active={tab} onChange={setTab} onAccion={handleAccion} />
      {formOpen && (
        <FormTransaccion
          open={formOpen}
          onClose={() => setFormOpen(false)}
          tipoInicial={formTipo}
          contextoInicial={formContexto}
        />
      )}
    </div>
  )
}
