// src/modules/couple/SetupPage.jsx
import { useState } from 'react'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { useAuthStore } from '@store/authStore'
import { useAppStore } from '@store/appStore'
import { db } from '@lib/supabase'
import { useToast } from '@ui/Toast'
import Spinner from '@ui/Spinner'
import StepInicio   from './components/StepInicio'
import StepUnirse   from './components/StepUnirse'
import StepNombres  from './components/StepNombres'
import StepIngresos from './components/StepIngresos'
import StepTema     from './components/StepTema'
import StepInvitar  from './components/StepInvitar'

const STEPS_CREAR = ['inicio', 'nombres', 'ingresos', 'tema', 'invitar']
const STEPS_UNIRSE = ['inicio', 'unirse']

const INITIAL = {
  nombre1: '', nombre2: '',
  ingreso1: '', ingreso2: '',
  tema: 'violet',
}

export default function SetupPage() {
  const { user, setPareja: setAuthPareja } = useAuthStore()
  const { setNombres, setTema, setSetupCompleto } = useAppStore()
  const toast = useToast()

  const [modo, setModo]   = useState(null) // 'crear' | 'unirse'
  const [idx, setIdx]     = useState(0)
  const [data, setData]   = useState(INITIAL)
  const [saving, setSaving] = useState(false)
  const [codigoGenerado, setCodigoGenerado] = useState(null)
  const [parejaCreada, setParejaCreada]     = useState(null)

  const steps = modo === 'unirse' ? STEPS_UNIRSE : STEPS_CREAR
  const step  = steps[idx]
  const isLast = idx === steps.length - 1

  const update = (changes) => setData((p) => ({ ...p, ...changes }))

  const handleNext = () => {
    if (step === 'inicio') {
      if (!modo) { toast.error('Elige una opción'); return }
      setIdx(1)
      return
    }
    if (step === 'nombres') {
      if (!data.nombre1.trim()) { toast.error('Ingresa tu nombre'); return }
      if (!data.nombre2.trim()) { toast.error('Ingresa el nombre de tu pareja'); return }
      setIdx((i) => i + 1)
      return
    }
    if (step === 'tema') {
      handleCrearPareja()
      return
    }
    if (step === 'invitar') {
      finalizarSetup(parejaCreada)
      return
    }
    setIdx((i) => i + 1)
  }

  const handleBack = () => {
    if (idx === 0) return
    setIdx((i) => i - 1)
  }

  const handleCrearPareja = async () => {
    setSaving(true)
    try {
      const [pareja] = await db.from('parejas').insert({
        nombre1: data.nombre1.trim(),
        nombre2: data.nombre2.trim(),
        user1_id: user.id,
        tema: data.tema,
      })

      await db.from('perfiles').insert({
        pareja_id: pareja.id,
        user_id:   user.id,
        nombre:    data.nombre1.trim(),
        persona:   'p1',
        ingreso_mensual: Number(data.ingreso1) || 0,
      })

      // Registrar ingreso de p2 como referencia si lo dieron
      // (su perfil real lo crea ella al unirse con su código)

      setCodigoGenerado(pareja.codigo_invitacion)
      setParejaCreada(pareja)
      setIdx((i) => i + 1)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const finalizarSetup = (pareja) => {
    setNombres({ p1: data.nombre1.trim(), p2: data.nombre2.trim() })
    setTema(data.tema)
    setAuthPareja(pareja)
    setSetupCompleto(true)
    toast.success('¡Todo listo! 🎉')
  }

  const handleJoined = (pareja) => {
    setNombres({ p1: pareja.nombre1, p2: pareja.nombre2 })
    setTema(pareja.tema)
    setAuthPareja(pareja)
    setSetupCompleto(true)
  }

  const renderStep = () => {
    switch (step) {
      case 'inicio':   return <StepInicio modo={modo} setModo={setModo} />
      case 'unirse':   return <StepUnirse onJoined={handleJoined} />
      case 'nombres':  return <StepNombres data={data} onChange={update} />
      case 'ingresos': return <StepIngresos data={data} onChange={update} nombres={{ p1: data.nombre1, p2: data.nombre2 }} />
      case 'tema':     return <StepTema data={data} onChange={update} />
      case 'invitar':  return <StepInvitar codigo={codigoGenerado} nombres={{ p1: data.nombre1, p2: data.nombre2 }} />
      default: return null
    }
  }

  // El paso "unirse" maneja su propio submit, no usa el botón inferior
  const hideNavButton = step === 'unirse'

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-surface-900">
      {/* Header con progreso */}
      <div className="px-4 pt-6 pb-4 border-b border-white/[0.06] flex-shrink-0">
        {modo !== 'unirse' && (
          <div className="flex items-center gap-1.5 mb-3">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i <= idx ? 'w-5 bg-[var(--accent)]' : 'w-2 bg-white/15'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Contenido del paso */}
      <div className="flex-1 overflow-y-auto px-5 py-6">
        {renderStep()}
      </div>

      {/* Navegación inferior */}
      {!hideNavButton && (
        <div
          className="px-5 py-4 border-t border-white/[0.06] flex gap-3 flex-shrink-0"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
        >
          {idx > 0 && step !== 'invitar' && (
            <button onClick={handleBack} disabled={saving} className="btn-ghost w-12 h-12 rounded-xl flex-shrink-0">
              <ChevronLeft size={20} />
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={saving}
            className="btn-primary flex-1 py-3.5 text-sm font-semibold"
          >
            {saving
              ? <Spinner size="sm" />
              : step === 'invitar'
                ? <><Check size={16} />Comenzar</>
                : step === 'tema'
                  ? <><Check size={16} />Crear cuenta</>
                  : <>Continuar<ChevronRight size={16} /></>
            }
          </button>
        </div>
      )}
    </div>
  )
}
