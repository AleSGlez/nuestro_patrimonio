// src/shared/components/ui/ConfirmDialog.jsx
import { useCallback, useRef, useState, createContext, useContext } from 'react'
import { cn } from '@lib/utils'
import Modal from './Modal'

const Ctx = createContext(null)

export function ConfirmProvider({ children }) {
  const [request, setRequest] = useState(null)
  const resolveRef = useRef(null)

  const confirmar = useCallback(({ title, message, confirmLabel = 'Eliminar', cancelLabel = 'Cancelar', danger = true }) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve
      setRequest({ title, message, confirmLabel, cancelLabel, danger })
    })
  }, [])

  const responder = (valor) => {
    resolveRef.current?.(valor)
    resolveRef.current = null
    setRequest(null)
  }

  return (
    <Ctx.Provider value={confirmar}>
      {children}
      <Modal open={!!request} onClose={() => responder(false)} title={request?.title || '¿Estás seguro?'}>
        <p className="text-sm text-gray-300 mb-5">{request?.message}</p>
        <div className="flex gap-2">
          <button onClick={() => responder(false)} className="btn-ghost flex-1 py-3 text-sm font-semibold">
            {request?.cancelLabel}
          </button>
          <button
            onClick={() => responder(true)}
            className={cn(request?.danger === false ? 'btn-primary' : 'btn-danger', 'flex-1 py-3 text-sm font-semibold')}
          >
            {request?.confirmLabel}
          </button>
        </div>
      </Modal>
    </Ctx.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useConfirm must be inside ConfirmProvider')
  return ctx
}
