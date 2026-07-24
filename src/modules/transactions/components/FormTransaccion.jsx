// src/modules/transactions/components/FormTransaccion.jsx
import { useState, useEffect, useRef } from 'react'
import { Check } from 'lucide-react'
import Modal from '@ui/Modal'
import { Select, Input } from '@ui/Field'
import Spinner from '@ui/Spinner'
import { useToast } from '@ui/Toast'
import { useCuentas } from '@modules/accounts/hooks/useCuentas'
import { useTodosLosApartados } from '@modules/accounts/hooks/useApartados'
import { useTarjetas } from '@modules/cards/hooks/useTarjetas'
import { useCrearTransaccion, useActualizarTransaccion, parsearMetodoPago } from '../hooks/useTransacciones'
import { useAppStore } from '@store/appStore'
import { CAT_GASTO, CAT_INGRESO, CAT_NEGOCIO_GASTO, CAT_NEGOCIO_INGRESO, today, cn,
         filtrarCuentasPorContexto, filtrarTarjetasPorContexto, opcionesApartadosNegocio,
         TIPO_EMOJI_CUENTA } from '@lib/utils'

export default function FormTransaccion({ open, onClose, tx = null, contextoInicial = 'personal', tipoInicial = 'gasto' }) {
  const { nombres } = useAppStore()
  const toast = useToast()
  const { data: cuentas = [] } = useCuentas()
  const { data: tarjetas = [] } = useTarjetas()
  const { data: todosApartados = [] } = useTodosLosApartados()
  const crear = useCrearTransaccion()
  const actualizar = useActualizarTransaccion()
  const isEdit = Boolean(tx)
  const loading = crear.isPending || actualizar.isPending

  const PERSONA_OPTS = [
    { value: 'p1', label: nombres.p1 },
    { value: 'p2', label: nombres.p2 },
    { value: 'ambos', label: 'Ambos' },
  ]

  const [tipo, setTipo]             = useState('gasto')
  const [contexto, setContexto]     = useState(contextoInicial)
  const [monto, setMonto]           = useState('')
  const [categoria, setCategoria]   = useState('')
  const [descripcion, setDesc]      = useState('')
  const [fecha, setFecha]           = useState(today())
  const [persona, setPersona]       = useState('p1')
  // metodoPago ahora es un valor compuesto: "cuenta:UUID" | "tarjeta:UUID" | "efectivo-generico"
  const [metodoValor, setMetodoValor] = useState('')

  // Filtrado por persona y contexto — reglas compartidas con FormAccesoRapido (@lib/utils.js)
  const cuentasFiltradas  = filtrarCuentasPorContexto(cuentas, { contexto, persona })
  const tarjetasFiltradas = filtrarTarjetasPorContexto(tarjetas, { contexto, persona, tipo })

  // En contexto negocio los apartados es_negocio son método de pago directo:
  // el gasto/ingreso afecta el MONTO del apartado (aplicarEfecto), no el saldo
  // disponible de la cuenta personal que lo contiene.
  const apartadosNegocioOpts = contexto === 'negocio' ? opcionesApartadosNegocio(todosApartados) : []

  // ── Dropdown unificado de método de pago ──────────────────────
  const metodoOpts = [
    ...cuentasFiltradas.map((c) => ({
      value: `cuenta:${c.id}`,
      label: `${TIPO_EMOJI_CUENTA[c.tipo] || '💳'} ${c.nombre}`,
    })),
    ...apartadosNegocioOpts,
    ...tarjetasFiltradas.map((t) => ({
      value: `tarjeta:${t.id}`,
      label: `💳 ${t.nombre} (crédito)`,
    })),
  ]

  const catOpts = (
    contexto === 'negocio' && tipo === 'ingreso' ? CAT_NEGOCIO_INGRESO
    : contexto === 'negocio' ? CAT_NEGOCIO_GASTO
    : tipo === 'ingreso'    ? CAT_INGRESO
    : CAT_GASTO
  ).map((c) => ({ value: c.value, label: `${c.emoji} ${c.label}` }))

  // Evita que el efecto de auto-selección pise el método recién inicializado:
  // ambos efectos corren en el mismo commit al abrir, y el segundo leería el
  // metodoValor viejo (stale closure) y lo sobreescribiría.
  const inicializando = useRef(false)

  // ── Inicializar/resetear al abrir ─────────────────────────────
  useEffect(() => {
    if (!open) return
    inicializando.current = true
    if (tx) {
      setTipo(tx.tipo); setContexto(tx.contexto); setMonto(String(tx.monto))
      setCategoria(tx.categoria); setDesc(tx.descripcion || ''); setFecha(tx.fecha)
      setPersona(tx.persona)
      // Parsear con la misma lógica que aplicar/revertirEfecto — cubre los
      // formatos "tarjeta:UUID"/"cuenta:UUID"/"apartado:UUID:cuentaUUID" y el legacy
      const metodo = parsearMetodoPago(tx.metodo_pago, tx.cuenta_id, tx.tarjeta_id)
      if (metodo?.tipo === 'tarjeta')       setMetodoValor(`tarjeta:${metodo.id}`)
      else if (metodo?.tipo === 'cuenta')   setMetodoValor(`cuenta:${metodo.id}`)
      else if (metodo?.tipo === 'apartado') setMetodoValor(`apartado:${metodo.apartadoId}:${metodo.cuentaId}`)
      else setMetodoValor('')
    } else {
      setTipo(tipoInicial); setContexto(contextoInicial); setMonto('')
      setCategoria(''); setDesc(''); setFecha(today())
      setPersona(contextoInicial === 'negocio' ? 'ambos' : 'p1')
      setMetodoValor('')
    }
  }, [open, tx, contextoInicial, tipoInicial])

  // Si cambia persona/contexto y el método seleccionado ya no aplica, se limpia.
  // En modo nuevo se auto-selecciona el primero disponible; al EDITAR se deja
  // vacío para que el usuario elija explícitamente — auto-seleccionar aquí movía
  // la deuda de tarjeta a la primera cuenta sin que se notara.
  useEffect(() => {
    if (inicializando.current) { inicializando.current = false; return }
    const sigueValido = metodoOpts.some((o) => o.value === metodoValor)
    if (!sigueValido) setMetodoValor(isEdit ? '' : (metodoOpts[0]?.value || ''))
  }, [persona, contexto, tipo, cuentas, tarjetas])

  const handleSave = async () => {
    if (!monto || Number(monto) <= 0) { toast.error('Ingresa un monto válido'); return }
    if (!categoria) { toast.error('Selecciona una categoría'); return }
    if (!metodoValor) { toast.error('Selecciona de dónde sale o entra el dinero'); return }

    // metodo_pago se guarda completo: "cuenta:UUID" | "tarjeta:UUID" |
    // "apartado:UUID:cuentaUUID" — es lo que aplicar/revertirEfecto parsean
    const partes = metodoValor.split(':')
    const tipoMetodo = partes[0]

    const payload = {
      tipo, contexto, monto: Number(monto), categoria,
      descripcion: descripcion.trim() || null,
      fecha, persona, metodo_pago: metodoValor,
      cuenta_id:  tipoMetodo === 'cuenta' ? partes[1]
                : tipoMetodo === 'apartado' ? partes[2] : null,
      tarjeta_id: tipoMetodo === 'tarjeta' ? partes[1] : null,
    }

    try {
      if (isEdit) {
        await actualizar.mutateAsync({ id: tx.id, txAnterior: tx, data: payload, cuentas, tarjetas })
        toast.success('Movimiento actualizado')
      } else {
        await crear.mutateAsync({ ...payload, cuentas, tarjetas })
        toast.success(tipo === 'ingreso' ? 'Ingreso registrado ✅' : 'Gasto registrado ✅')
      }
      onClose()
    } catch (e) {
      toast.error(e.message)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar movimiento' : 'Nuevo movimiento'}>
      <div className="flex bg-surface-700 rounded-xl p-1 mb-3">
        {['gasto', 'ingreso'].map((t) => (
          <button
            key={t}
            onClick={() => { setTipo(t); setCategoria('') }}
            className={cn(
              'flex-1 py-2 text-sm font-medium rounded-lg transition-all',
              tipo === t ? (t === 'gasto' ? 'bg-bad text-white' : 'bg-ok text-white') : 'text-gray-400'
            )}
          >
            {t === 'gasto' ? '↑ Gasto' : '↓ Ingreso'}
          </button>
        ))}
      </div>

      <div className="flex bg-surface-700 rounded-xl p-1 mb-5">
        {[['personal','👤 Personal'],['negocio','🏪 Negocio']].map(([id, label]) => (
          <button
            key={id}
            onClick={() => { setContexto(id); setCategoria('') }}
            className={cn(
              'flex-1 py-2 text-xs font-medium rounded-lg transition-all',
              contexto === id ? 'bg-[var(--accent)] text-white' : 'text-gray-400'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mb-5">
        <label className="label">Monto</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-400 font-mono">$</span>
          <input
            type="text" inputMode="decimal" value={monto}
            onChange={(e) => setMonto(e.target.value.replace(/[^0-9.]/g, ''))}
            placeholder="0.00"
            className="input pl-10 text-2xl font-bold font-mono h-14"
            autoFocus={!isEdit}
          />
        </div>
      </div>

      <Select label="Categoría" value={categoria} onChange={setCategoria} options={catOpts} placeholder="Selecciona categoría" />

      <Input
        label="Descripción (opcional)" value={descripcion}
        onChange={(e) => setDesc(e.target.value)}
        placeholder="¿En qué fue?"
      />

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="label">Fecha</label>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="input" />
        </div>
        {contexto === 'personal' && (
          <Select label="Persona" value={persona} onChange={setPersona} options={PERSONA_OPTS} className="mb-0" />
        )}
      </div>

      {metodoOpts.length > 0 ? (
        <Select
          label="Método de pago"
          value={metodoValor}
          onChange={setMetodoValor}
          options={metodoOpts}
          placeholder="¿De dónde sale/entra el dinero?"
        />
      ) : (
        <p className="text-xs text-warn mb-4">
          {persona === 'ambos'
            ? `No hay cuentas ${contexto === 'negocio' ? 'de negocio' : 'disponibles'}. Agrega una primero.`
            : `${persona === 'p1' ? nombres.p1 : nombres.p2} no tiene cuentas ni tarjetas propias. Agrega una primero.`}
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={loading}
        className={cn(
          'btn w-full py-3.5 text-sm font-semibold mt-2',
          tipo === 'gasto' ? 'bg-bad hover:brightness-110 text-white' : 'bg-ok hover:brightness-110 text-white'
        )}
      >
        {loading
          ? <Spinner size="sm" />
          : <><Check size={16} />{isEdit ? 'Guardar cambios' : 'Registrar'}</>
        }
      </button>
    </Modal>
  )
}
