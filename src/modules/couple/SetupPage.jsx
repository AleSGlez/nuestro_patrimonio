// src/modules/couple/SetupPage.jsx
// Placeholder — Fase 2 construye el wizard completo
import { useAppStore } from '@store/appStore'

export default function SetupPage() {
  const { setSetupCompleto, setNombres } = useAppStore()

  const skip = () => {
    setNombres({ p1: 'Yo', p2: 'Mi amor' })
    setSetupCompleto(true)
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
      <div className="text-5xl">⚙️</div>
      <div className="text-center">
        <h2 className="text-xl font-bold text-white mb-2">Configuración inicial</h2>
        <p className="text-sm text-gray-400">El wizard completo viene en la Fase 2</p>
      </div>
      <button onClick={skip} className="btn-primary px-8 py-3 text-sm">
        Continuar (temporal)
      </button>
    </div>
  )
}
