// src/modules/accounts/AccountsPage.jsx
import { useState, useMemo } from 'react'
import { Plus, ArrowLeftRight, X } from 'lucide-react'
import { useCuentas, useEliminarCuenta } from './hooks/useCuentas'
import { useAppStore } from '@store/appStore'
import { useToast } from '@ui/Toast'
import { EmptyState } from '@ui/Field'
import Modal from '@ui/Modal'
import CuentaCard from './components/CuentaCard'
import CuentaCardCompact from './components/CuentaCardCompact'
import FormCuenta from './components/FormCuenta'
import FormApartado from './components/FormApartado'
import FormTransferencia from './components/FormTransferencia'
import { fmt, cn } from '@lib/utils'

export default function AccountsPage() {
  const { data: cuentas = [], isPending } = useCuentas()
  const { nombres } = useAppStore()
  const toast = useToast()
  const eliminar = useEliminarCuenta()

  const [filtroPersona, setFiltroPersona] = useState('todas') // todas | p1 | p2 | negocio
  const [formOpen, setFormOpen]       = useState(false)
  const [editCuenta, setEditCuenta]   = useState(null)
  const [transfOpen, setTransfOpen]   = useState(false)
  const [apartadoOpen, setApartadoOpen] = useState(false)
  const [apartadoCuenta, setApartadoCuenta] = useState(null)
  const [editApartado, setEditApartado] = useState(null)
  const [detalleCuenta, setDetalleCuenta] = useState(null) // cuenta abierta en modal de detalle

  const FILTROS = [
    { value: 'todas',   label: 'Todas' },
    { value: 'p1',      label: nombres.p1 },
    { value: 'p2',      label: nombres.p2 },
    { value: 'negocio', label: '🏪 Negocio' },
  ]

  const cuentasFiltradas = useMemo(() => {
    if (filtroPersona === 'todas') return cuentas.filter((c) => c.persona !== 'negocio')
    if (filtroPersona === 'negocio') return cuentas.filter((c) => c.persona === 'negocio')
    // p1/p2: muestra propias + compartidas
    return cuentas.filter((c) => c.persona === filtroPersona || c.persona === 'ambos')
  }, [cuentas, filtroPersona])

  const totalMostrado = cuentasFiltradas.reduce((s, c) => s + Number(c.saldo), 0)

  const handleDelete = async (cuenta) => {
    if (!confirm(`¿Eliminar la cuenta "${cuenta.nombre}"?`)) return
    try {
      await eliminar.mutateAsync(cuenta.id)
      toast.success('Cuenta eliminada')
      setDetalleCuenta(null)
    } catch (e) {
      toast.error(e.message)
    }
  }

  const openAddApartado = (cuenta) => {
    setApartadoCuenta(cuenta); setEditApartado(null); setApartadoOpen(true)
  }
  const openEditApartado = (apartado, cuenta) => {
    setApartadoCuenta(cuenta); setEditApartado(apartado); setApartadoOpen(true)
  }

  return (
    <>
      <div className="top-header flex-col items-stretch !h-auto pb-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="section-label">
              {filtroPersona === 'todas' ? 'Total' : filtroPersona === 'negocio' ? 'Total negocio' : `Total de ${FILTROS.find((f) => f.value === filtroPersona)?.label}`}
            </p>
            <p className="text-xl font-bold font-mono text-white">{fmt(totalMostrado)}</p>
          </div>
          <button onClick={() => setTransfOpen(true)} className="btn-ghost px-3 py-2 text-xs flex-shrink-0">
            <ArrowLeftRight size={14} /> Transferir
          </button>
        </div>

        {/* Filtro por persona */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {FILTROS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFiltroPersona(f.value)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex-shrink-0',
                filtroPersona === f.value ? 'bg-[var(--accent)] text-white' : 'bg-surface-700 text-gray-400'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="page px-4 pt-4">
        {isPending ? (
          <div className="grid grid-cols-2 gap-3">
            {[1,2,3,4].map((i) => <div key={i} className="skeleton h-24" />)}
          </div>
        ) : cuentasFiltradas.length === 0 ? (
          <EmptyState emoji="🏦" title="Sin cuentas" description="Agrega tu primera cuenta bancaria o efectivo" />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {cuentasFiltradas.map((c) => (
              <CuentaCardCompact key={c.id} cuenta={c} onTap={setDetalleCuenta} />
            ))}
          </div>
        )}
      </div>

      <button onClick={() => { setEditCuenta(null); setFormOpen(true) }} className="fab">
        <Plus size={24} />
      </button>

      {/* Modal de detalle — la CuentaCard completa con apartados expandibles */}
      <Modal open={!!detalleCuenta} onClose={() => setDetalleCuenta(null)} title="Detalle de cuenta">
        {detalleCuenta && (
          <CuentaCard
            cuenta={cuentas.find((c) => c.id === detalleCuenta.id) || detalleCuenta}
            nombres={nombres}
            onEdit={(c) => { setDetalleCuenta(null); setEditCuenta(c); setFormOpen(true) }}
            onDelete={handleDelete}
            onAddApartado={openAddApartado}
            onEditApartado={(a) => openEditApartado(a, detalleCuenta)}
          />
        )}
      </Modal>

      <FormCuenta open={formOpen} onClose={() => { setFormOpen(false); setEditCuenta(null) }} cuenta={editCuenta} />
      <FormTransferencia open={transfOpen} onClose={() => setTransfOpen(false)} />
      <FormApartado
        open={apartadoOpen}
        onClose={() => { setApartadoOpen(false); setApartadoCuenta(null); setEditApartado(null) }}
        cuenta={apartadoCuenta}
        apartado={editApartado}
      />
    </>
  )
}
