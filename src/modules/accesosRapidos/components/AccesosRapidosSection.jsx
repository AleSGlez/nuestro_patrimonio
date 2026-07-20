// src/modules/accesosRapidos/components/AccesosRapidosSection.jsx
import { useState } from 'react'
import { Plus, ArrowUpDown, ChevronUp, ChevronDown, Zap, Check } from 'lucide-react'
import { useToast } from '@ui/Toast'
import { useAuthStore } from '@store/authStore'
import { useTransacciones, useCrearTransaccion, useEliminarTransaccion } from '@modules/transactions/hooks/useTransacciones'
import {
  useAccesosRapidos, useMarcarUsoAccesoRapido, useReordenarAccesosRapidos,
  fetchSaldosFrescos, estadisticasAccesoRapido,
} from '../hooks/useAccesosRapidos'
import AccesoRapidoTile from './AccesoRapidoTile'
import FormAccesoRapido from './FormAccesoRapido'
import ConfirmarMontoSheet from './ConfirmarMontoSheet'
import { fmt, today, currentMonth, cn } from '@lib/utils'

export default function AccesosRapidosSection() {
  const toast = useToast()
  const parejaId = useAuthStore((s) => s.pareja?.id)
  const { data: accesos = [] } = useAccesosRapidos()
  const { data: txMes = [] } = useTransacciones({ mes: currentMonth() })
  const crear = useCrearTransaccion()
  const eliminar = useEliminarTransaccion()
  const marcarUso = useMarcarUsoAccesoRapido()
  const reordenar = useReordenarAccesosRapidos()

  const [formOpen, setFormOpen]         = useState(false)
  const [accesoEditar, setAccesoEditar] = useState(null)
  const [accesoConfirmar, setAccesoConfirmar] = useState(null)
  const [disparando, setDisparando]     = useState(null) // id del acceso disparándose
  const [modoOrden, setModoOrden]       = useState(false)

  const abrirCrear = () => { setAccesoEditar(null); setFormOpen(true) }
  const abrirEditar = (acceso) => { setAccesoEditar(acceso); setFormOpen(true) }

  const dispararAcceso = async (acceso, montoFinal) => {
    setDisparando(acceso.id)
    try {
      const { cuentas, tarjetas } = await fetchSaldosFrescos(parejaId)
      const [tipoMetodo, id] = acceso.metodo_pago.split(':')
      const payload = {
        tipo: acceso.tipo,
        contexto: acceso.responsable === 'negocio' ? 'negocio' : 'personal',
        monto: montoFinal,
        categoria: acceso.categoria,
        descripcion: acceso.nombre,
        fecha: today(),
        persona: acceso.responsable === 'negocio' ? 'ambos' : acceso.responsable,
        metodo_pago: acceso.metodo_pago,
        cuenta_id: tipoMetodo === 'cuenta' ? id : null,
        tarjeta_id: tipoMetodo === 'tarjeta' ? id : null,
        acceso_rapido_id: acceso.id,
      }
      const creada = await crear.mutateAsync({ ...payload, cuentas, tarjetas })
      marcarUso.mutate(acceso.id)

      toast.success(`${acceso.emoji} ${acceso.nombre} registrado — ${fmt(montoFinal)}`, {
        duration: 5000,
        action: {
          label: 'Deshacer',
          onClick: async () => {
            try {
              const fresh = await fetchSaldosFrescos(parejaId)
              await eliminar.mutateAsync({ tx: creada, cuentas: fresh.cuentas, tarjetas: fresh.tarjetas })
              toast.info('Movimiento deshecho')
            } catch (e) {
              toast.error(e.message)
            }
          },
        },
      })
    } catch (e) {
      toast.error(e.message)
    } finally {
      setDisparando(null)
    }
  }

  const handleFire = (acceso) => {
    if (disparando) return
    if (acceso.confirmar_monto) { setAccesoConfirmar(acceso); return }
    dispararAcceso(acceso, Number(acceso.monto_default))
  }

  const handleConfirmarMonto = async (montoFinal) => {
    const acceso = accesoConfirmar
    setAccesoConfirmar(null)
    await dispararAcceso(acceso, montoFinal)
  }

  const mover = (index, dir) => {
    const destino = index + dir
    if (destino < 0 || destino >= accesos.length) return
    const copia = [...accesos]
    ;[copia[index], copia[destino]] = [copia[destino], copia[index]]
    reordenar.mutate(copia)
  }

  const ordenarPorUso = () => {
    const favoritos = accesos.filter((a) => a.favorito)
    const resto = [...accesos.filter((a) => !a.favorito)].sort((a, b) => {
      const sa = estadisticasAccesoRapido(a.id, txMes).usadoEsteMes
      const sb = estadisticasAccesoRapido(b.id, txMes).usadoEsteMes
      return sb - sa
    })
    reordenar.mutate([...favoritos, ...resto])
    toast.success('Ordenado por más usados este mes')
  }

  return (
    <div className="card p-3">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-white flex items-center gap-1.5">
          <Zap size={14} className="text-warn" /> Accesos rápidos
        </p>
        {accesos.length > 0 && (
          <button
            onClick={() => setModoOrden((v) => !v)}
            className={cn('text-xs flex items-center gap-1', modoOrden ? 'text-[var(--accent)]' : 'text-gray-400')}
          >
            {modoOrden ? <Check size={13} /> : <ArrowUpDown size={13} />}
            {modoOrden ? 'Listo' : 'Ordenar'}
          </button>
        )}
      </div>

      {modoOrden ? (
        <div className="space-y-1.5">
          {accesos.map((a, i) => (
            <div key={a.id} className="flex items-center gap-2 bg-surface-700 rounded-xl px-3 py-2">
              <span className="text-lg">{a.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white truncate">{a.nombre}</p>
              </div>
              <span className="text-[11px] font-mono text-gray-400">{fmt(a.monto_default)}</span>
              <div className="flex flex-col">
                <button onClick={() => mover(i, -1)} disabled={i === 0} className="text-gray-400 hover:text-white disabled:opacity-30">
                  <ChevronUp size={14} />
                </button>
                <button onClick={() => mover(i, 1)} disabled={i === accesos.length - 1} className="text-gray-400 hover:text-white disabled:opacity-30">
                  <ChevronDown size={14} />
                </button>
              </div>
            </div>
          ))}
          <button onClick={ordenarPorUso} className="btn-ghost w-full py-2.5 text-xs font-medium mt-2">
            Ordenar por más usados este mes
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {accesos.map((acceso) => (
            <AccesoRapidoTile
              key={acceso.id}
              acceso={acceso}
              stats={estadisticasAccesoRapido(acceso.id, txMes)}
              disabled={disparando === acceso.id}
              onFire={() => handleFire(acceso)}
              onEdit={() => abrirEditar(acceso)}
            />
          ))}
          <button
            type="button" onClick={abrirCrear}
            className="card-interactive w-full flex flex-col items-center justify-center gap-1 py-3 px-2 border-dashed border border-white/10 text-gray-500 hover:text-white"
          >
            <Plus size={18} />
            <span className="text-[10px]">Agregar</span>
          </button>
        </div>
      )}

      <FormAccesoRapido open={formOpen} onClose={() => setFormOpen(false)} acceso={accesoEditar} />
      <ConfirmarMontoSheet
        open={!!accesoConfirmar}
        onClose={() => setAccesoConfirmar(null)}
        acceso={accesoConfirmar}
        onConfirm={handleConfirmarMonto}
        loading={!!disparando}
      />
    </div>
  )
}
