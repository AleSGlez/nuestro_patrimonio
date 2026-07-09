// src/modules/negocio-hub/NegocioHubPage.jsx
import { useState } from 'react'
import SubNav from '@shared/components/layout/SubNav'
import DashboardNegocio from '@modules/dashboard/components/DashboardNegocio'
import InventarioPage from '@modules/inventario/InventarioPage'
import VentasPage from '@modules/ventas/VentasPage'
import ClientesPage from '@modules/clientes/ClientesPage'
import PresupuestoNegocioPage from './PresupuestoNegocioPage'
import PlaceholderPage from '@shared/components/layout/PlaceholderPage'

const TABS = [
  { id: 'resumen',      label: 'Resumen',      emoji: '📊' },
  { id: 'ventas',       label: 'Ventas',       emoji: '💰' },
  { id: 'inventario',   label: 'Inventario',   emoji: '📦' },
  { id: 'clientes',     label: 'Clientes',     emoji: '👤' },
  { id: 'presupuesto',  label: 'Presupuesto',  emoji: '🎯' },
  { id: 'compras',      label: 'Compras',      emoji: '🛒' },
]

export default function NegocioHubPage() {
  const [tab, setTab] = useState('resumen')

  const renderTab = () => {
    switch (tab) {
      case 'resumen':    return <DashboardNegocio />
      case 'ventas':     return <VentasPage />
      case 'inventario': return <InventarioPage />
      case 'clientes':   return <ClientesPage />
      case 'presupuesto': return <PresupuestoNegocioPage />
      case 'compras':    return <PlaceholderPage emoji="🛒" title="Compras" fase="próxima" />
      default:           return null
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      <SubNav tabs={TABS} active={tab} onChange={setTab} titulo="Negocio" />
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {renderTab()}
      </div>
    </div>
  )
}
