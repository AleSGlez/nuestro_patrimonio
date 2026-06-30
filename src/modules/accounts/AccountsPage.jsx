// src/modules/accounts/AccountsPage.jsx
import { useState } from 'react'
import { Plus, ArrowLeftRight } from 'lucide-react'
import { useCuentas, useEliminarCuenta } from './hooks/useCuentas'
import { useAppStore } from '@store/appStore'
import { useToast } from '@ui/Toast'
import { EmptyState } from '@ui/Field'
import CuentaCard from './components/CuentaCard'
import FormCuenta from './components/FormCuenta'
import FormApartado from './components/FormApartado'
import FormTransferencia from './components/FormTransferencia'
import { fmt } from '@lib/utils'

export default function AccountsPage() {
  const { data: cuentas = [], isPending } = useCuentas()
  const { nombres } = useAppStore()
  const toast = useToast()
  const eliminar = useEliminarCuenta()

  const [formOpen, setFormOpen]       = useState(false)
  const [editCuenta, setEditCuenta]   = useState(null)
  const [transfOpen, setTransfOpen]   = useState(false)
  const [apartadoOpen, setApartadoOpen] = useState(false)
  const [apartadoCuenta, setApartadoCuenta] = useState(null)
  const [editApartado, setEditApartado] = useState(null)

  const cuentasPersonal = cuentas.filter((c) => c.persona !== 'negocio')
  const cuentasNegocio  = cuentas.filter((c) => c.persona === 'negocio')
  const totalPersonal   = cuentasPersonal.reduce((s, c) => s + Number(c.saldo), 0)

  const handleDelete = async (cuenta) => {
    if (!confirm(`¿Eliminar la cuenta "${cuenta.nombre}"?`)) return
    try {
      await eliminar.mutateAsync(cuenta.id)
      toast.success('Cuenta eliminada')
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
      <div className="top-header">
        <div className="flex-1">
          <p className="section-label">Total personal</p>
          <p className="text-xl font-bold font-mono text-white">{fmt(totalPersonal)}</p>
        </div>
        <button onClick={() => setTransfOpen(true)} className="btn-ghost px-3 py-2 text-xs">
          <ArrowLeftRight size={14} /> Transferir
        </button>
      </div>

      <div className="page px-4 pt-4">
        {isPending ? (
          <div className="space-y-3">
            {[1,2,3].map((i) => <div key={i} className="skeleton h-24" />)}
          </div>
        ) : cuentas.length === 0 ? (
          <EmptyState emoji="🏦" title="Sin cuentas" description="Agrega tu primera cuenta bancaria o efectivo" />
        ) : (
          <>
            {cuentasPersonal.length > 0 && (
              <div className="space-y-3 mb-6">
                {cuentasPersonal.map((c) => (
                  <CuentaCard
                    key={c.id} cuenta={c} nombres={nombres}
                    onEdit={(c) => { setEditCuenta(c); setFormOpen(true) }}
                    onDelete={handleDelete}
                    onAddApartado={openAddApartado}
                    onEditApartado={(a) => openEditApartado(a, c)}
                  />
                ))}
              </div>
            )}

            {cuentasNegocio.length > 0 && (
              <>
                <p className="section-label mb-3">🏪 Negocio</p>
                <div className="space-y-3">
                  {cuentasNegocio.map((c) => (
                    <CuentaCard
                      key={c.id} cuenta={c} nombres={nombres}
                      onEdit={(c) => { setEditCuenta(c); setFormOpen(true) }}
                      onDelete={handleDelete}
                      onAddApartado={openAddApartado}
                      onEditApartado={(a) => openEditApartado(a, c)}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      <button onClick={() => { setEditCuenta(null); setFormOpen(true) }} className="fab">
        <Plus size={24} />
      </button>

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
