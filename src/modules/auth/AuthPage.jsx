// src/modules/auth/AuthPage.jsx
import { useState } from 'react'
import { ArrowRight, Sparkles } from 'lucide-react'
import { useAuthStore } from '@store/authStore'
import { useAppStore } from '@store/appStore'
import { useToast } from '@ui/Toast'
import { Input, PasswordInput } from '@ui/Field'
import Spinner from '@ui/Spinner'
import { cn } from '@lib/utils'

// ── Logo ─────────────────────────────────────────────────────
function Logo() {
  return (
    <div className="flex flex-col items-center gap-3 mb-8">
      <div className="w-16 h-16 rounded-2xl bg-[var(--accent-muted)] border border-[var(--accent)]/20 flex items-center justify-center">
        <span className="text-3xl">💑</span>
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white tracking-tight">Nuestro Patrimonio</h1>
        <p className="text-sm text-gray-500 mt-0.5">Finanzas en pareja</p>
      </div>
    </div>
  )
}

// ── Tab selector ─────────────────────────────────────────────
function Tabs({ tab, setTab }) {
  return (
    <div className="flex bg-surface-700 rounded-xl p-1 mb-6">
      {[['login','Iniciar sesión'],['register','Crear cuenta']].map(([id, label]) => (
        <button
          key={id}
          onClick={() => setTab(id)}
          className={cn(
            'flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-150',
            tab === id ? 'bg-[var(--accent)] text-white' : 'text-gray-400'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

// ── Login form ───────────────────────────────────────────────
function LoginForm({ onForgot }) {
  const login = useAuthStore((s) => s.login)
  const toast = useToast()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)

  const handle = async () => {
    if (!email || !password) { toast.error('Completa todos los campos'); return }
    setLoading(true)
    try {
      await login(email.trim().toLowerCase(), password)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fade-in">
      <Input
        label="Correo" type="email" value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="tu@correo.com" autoComplete="email"
      />
      <PasswordInput
        label="Contraseña" value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••" autoComplete="current-password"
      />
      <button
        onClick={handle} disabled={loading}
        className="btn-primary w-full py-3.5 text-sm font-semibold mb-3"
      >
        {loading
          ? <Spinner size="sm" />
          : <><span>Iniciar sesión</span><ArrowRight size={15} /></>
        }
      </button>
      <button
        onClick={onForgot}
        className="w-full text-sm text-gray-500 hover:text-gray-300 transition-colors py-2"
      >
        ¿Olvidaste tu contraseña?
      </button>
    </div>
  )
}

// ── Register form ────────────────────────────────────────────
function RegisterForm() {
  const register = useAuthStore((s) => s.register)
  const toast    = useToast()
  const [nombre,    setNombre]    = useState('')
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [errors,    setErrors]    = useState({})
  const [loading,   setLoading]   = useState(false)

  const validate = () => {
    const e = {}
    if (!nombre.trim())           e.nombre   = 'Ingresa tu nombre'
    if (!email.includes('@'))     e.email    = 'Correo inválido'
    if (password.length < 8)      e.password = 'Mínimo 8 caracteres'
    if (password !== confirm)     e.confirm  = 'No coinciden'
    setErrors(e)
    return !Object.keys(e).length
  }

  const handle = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      await register(email.trim().toLowerCase(), password, { nombre: nombre.trim() })
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fade-in">
      <Input
        label="Tu nombre" value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="¿Cómo te llamas?" error={errors.nombre}
      />
      <Input
        label="Correo" type="email" value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="tu@correo.com" autoComplete="email" error={errors.email}
      />
      <PasswordInput
        label="Contraseña" value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Mínimo 8 caracteres" error={errors.password}
      />
      <PasswordInput
        label="Confirmar contraseña" value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="Repite la contraseña" error={errors.confirm}
      />
      <button
        onClick={handle} disabled={loading}
        className="btn-primary w-full py-3.5 text-sm font-semibold"
      >
        {loading ? <Spinner size="sm" /> : <><span>Crear cuenta</span><ArrowRight size={15} /></>}
      </button>
      <p className="text-xs text-gray-500 text-center mt-3">
        Después invitarás a tu pareja desde ajustes
      </p>
    </div>
  )
}

// ── Forgot password ──────────────────────────────────────────
function ForgotForm({ onBack }) {
  const toast = useToast()
  const [email,   setEmail]   = useState('')
  const [sent,    setSent]    = useState(false)
  const [loading, setLoading] = useState(false)

  const handle = async () => {
    if (!email.includes('@')) { toast.error('Correo inválido'); return }
    setLoading(true)
    try {
      const { auth } = await import('@lib/supabase')
      await auth.resetPassword(email.trim().toLowerCase())
      setSent(true)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (sent) return (
    <div className="text-center py-4 animate-scale-in">
      <div className="text-4xl mb-4">📬</div>
      <h3 className="text-white font-semibold mb-2">Revisa tu correo</h3>
      <p className="text-sm text-gray-400 mb-6">
        Enviamos un enlace a <strong className="text-white">{email}</strong>
      </p>
      <button onClick={onBack} className="btn-ghost px-6 py-2.5 text-sm">
        Volver al inicio
      </button>
    </div>
  )

  return (
    <div className="animate-fade-in">
      <button onClick={onBack} className="text-sm text-gray-400 hover:text-white mb-5 transition-colors flex items-center gap-1">
        ← Volver
      </button>
      <h2 className="text-xl font-bold text-white mb-1">Recuperar contraseña</h2>
      <p className="text-sm text-gray-400 mb-5">Te enviamos un enlace a tu correo</p>
      <Input
        label="Correo" type="email" value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="tu@correo.com"
      />
      <button onClick={handle} disabled={loading} className="btn-primary w-full py-3.5 text-sm font-semibold">
        {loading ? <Spinner size="sm" /> : 'Enviar enlace'}
      </button>
    </div>
  )
}

// ── Main AuthPage ────────────────────────────────────────────
export default function AuthPage() {
  const [tab,  setTab]  = useState('login')
  const [view, setView] = useState('main') // main | forgot

  if (view === 'forgot') return (
    <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
      <div className="w-full max-w-sm animate-slide-up">
        <Logo />
        <div className="card p-6">
          <ForgotForm onBack={() => setView('main')} />
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
      <div className="w-full max-w-sm animate-slide-up">
        <Logo />
        <div className="card p-6">
          <Tabs tab={tab} setTab={setTab} />
          {tab === 'login'
            ? <LoginForm onForgot={() => setView('forgot')} />
            : <RegisterForm />
          }
        </div>
        <p className="text-center text-xs text-gray-600 mt-5">
          Tus datos están encriptados y son solo tuyos
        </p>
      </div>
    </div>
  )
}
