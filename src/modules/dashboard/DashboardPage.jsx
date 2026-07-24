// src/modules/dashboard/DashboardPage.jsx
import { useState } from 'react'
import { useAppStore } from '@store/appStore'
import BottomNav from '@shared/components/layout/BottomNav'
import Sidebar from '@shared/components/layout/Sidebar'
import RightRail from '@shared/components/layout/RightRail'
import InicioPage       from '@modules/inicio/InicioPage'
import FinanzasPage     from '@modules/finanzas/FinanzasPage'
import PersonasHubPage  from '@modules/personas-hub/PersonasHubPage'
import NegocioHubPage   from '@modules/negocio-hub/NegocioHubPage'
import MasPage          from '@modules/mas/MasPage'
import CalendarioPage   from '@modules/calendario/CalendarioPage'
import FormTransaccion  from '@modules/transactions/components/FormTransaccion'
import FormTransferencia from '@modules/accounts/components/FormTransferencia'
import { FormSuscripcionGlobal } from '@modules/suscripciones/SuscripcionesPage'

export default function DashboardPage() {
  const { tab, setTab } = useAppStore()
  const [finanzasSubTab, setFinanzasSubTab] = useState('resumen')
  const [formOpen, setFormOpen]         = useState(false)
  const [formTipo, setFormTipo]         = useState('gasto')
  const [transfOpen, setTransfOpen]     = useState(false)
  const [susOpen, setSusOpen]           = useState(false)

  const handleNavegar = (nuevoTab, subTab) => {
    if (nuevoTab === 'finanzas' && subTab) setFinanzasSubTab(subTab)
    setTab(nuevoTab)
  }

  const handleAccion = (accion) => {
    if (accion === 'gasto' || accion === 'ingreso') {
      setFormTipo(accion); setFormOpen(true)
    } else if (accion === 'transferencia') {
      setTransfOpen(true)
    } else if (accion === 'suscripcion') {
      setSusOpen(true)
    }
  }

  const renderTab = () => {
    switch (tab) {
      case 'inicio':      return <InicioPage onNavegar={handleNavegar} />
      case 'finanzas':    return <FinanzasPage subTab={finanzasSubTab} />
      case 'personas':    return <PersonasHubPage />
      case 'negocio':     return <NegocioHubPage />
      case 'calendario':  return <CalendarioPage />
      case 'mas':         return <MasPage />
      default:            return <InicioPage onNavegar={handleNavegar} />
    }
  }

  return (
    <div className="dashboard-shell">
      <Sidebar active={tab} onChange={setTab} onAccion={handleAccion} />
      <div className="dashboard-content">
        {renderTab()}
        <BottomNav active={tab} onChange={setTab} onAccion={handleAccion} />
      </div>
      <RightRail />
      {formOpen && (
        <FormTransaccion open={formOpen} onClose={() => setFormOpen(false)} tipoInicial={formTipo} />
      )}
      <FormTransferencia open={transfOpen} onClose={() => setTransfOpen(false)} />
      <FormSuscripcionGlobal open={susOpen} onClose={() => setSusOpen(false)} />
    </div>
  )
}
