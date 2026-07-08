// src/modules/negocio-hub/NegocioHubPage.jsx
import { useState } from 'react'
import SubNav from '@shared/components/layout/SubNav'
import DashboardNegocio from '@modules/dashboard/components/DashboardNegocio'
import InventarioPage from '@modules/inventario/InventarioPage'
import PlaceholderPage from '@shared/components/layout/PlaceholderPage'

const TABS = [
  { id: 'resumen',     label: 'Resumen',     emoji: '📊' },
  { id: 'inventario',  label: 'Inventario',  emoji: '📦' },
  { id: 'ventas',      label: 'Ventas',      emoji: '💰' },
  { id: 'compras',     label: 'Compras',     emoji: '🛒' },
  { id: 'proveedores', label: 'Proveedores', emoji: '🏪' },
]

export default function NegocioHubPage() {
  const [tab, setTab] = useState('resumen')

  const renderTab = () => {
    switch (tab) {
      case 'resumen':     return <DashboardNegocio />
      case 'inventario':  return <InventarioPage />
      case 'ventas':      return <PlaceholderPage emoji="💰" title="Ventas" fase="9" />
      case 'compras':     return <PlaceholderPage emoji="🛒" title="Compras" fase="9" />
      case 'proveedores': return <PlaceholderPage emoji="🏪" title="Proveedores" fase="9" />
      default:            return null
    }
  }

  return (
    <>
      <SubNav tabs={TABS} active={tab} onChange={setTab} />
      {renderTab()}
    </>
  )
}
