// src/modules/accesosRapidos/components/ConfirmarMontoSheet.jsx
import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import Modal from '@ui/Modal'
import { AmountInput } from '@ui/Field'
import Spinner from '@ui/Spinner'

export default function ConfirmarMontoSheet({ open, onClose, acceso, onConfirm, loading }) {
  const [monto, setMonto] = useState('')

  useEffect(() => {
    if (open && acceso) setMonto(String(acceso.monto_default))
  }, [open, acceso])

  if (!acceso) return null

  return (
    <Modal open={open} onClose={onClose} title={`${acceso.emoji} ${acceso.nombre}`}>
      <AmountInput label="Monto" value={monto} onChange={setMonto} autoFocus className="mb-5" />
      <button
        onClick={() => onConfirm(Number(monto))}
        disabled={loading || !monto || Number(monto) <= 0}
        className={acceso.tipo === 'gasto'
          ? 'btn w-full py-3.5 text-sm font-semibold bg-bad hover:brightness-110 text-white'
          : 'btn w-full py-3.5 text-sm font-semibold bg-ok hover:brightness-110 text-white'}
      >
        {loading ? <Spinner size="sm" /> : <><Check size={16} /> Confirmar</>}
      </button>
    </Modal>
  )
}
