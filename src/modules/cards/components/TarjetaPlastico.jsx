// src/modules/cards/components/TarjetaPlastico.jsx
// Cara de la tarjeta estilo Wallet — solo resumen (banco, dueño, deuda, uso).
// El detalle completo de la seleccionada vive en DetalleTarjeta.
import { fmt, cn } from '@lib/utils'

// Texto oscuro sobre colores claros (ámbar, amarillo…), blanco sobre oscuros
function esColorClaro(hex = '') {
  const h = hex.replace('#', '')
  if (h.length !== 6) return false
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return lum > 0.6
}

export default function TarjetaPlastico({ tarjeta, uso, duenoLabel, activa, onClick, className }) {
  const claro = esColorClaro(tarjeta.color)
  const ink = claro ? '#1C1404' : '#FFFFFF'
  const brillo = claro ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)'

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={tarjeta.nombre}
      aria-pressed={activa}
      className={cn(
        'relative overflow-hidden rounded-[20px] px-[18px] py-4 flex flex-col justify-between text-left',
        'transition-all duration-150 active:scale-[0.98] lg:hover:-translate-y-0.5',
        activa ? 'opacity-100 outline outline-2 outline-offset-[3px] outline-white/50' : 'opacity-50',
        className,
      )}
      style={{ backgroundColor: tarjeta.color || '#24242F', color: ink }}
    >
      <span aria-hidden="true" className="absolute -right-[60px] -top-[70px] w-[220px] h-[220px] rounded-full" style={{ background: brillo }} />
      <span aria-hidden="true" className="absolute right-[30px] -bottom-[110px] w-[200px] h-[200px] rounded-full" style={{ background: brillo }} />

      <span className="relative flex justify-between items-start gap-2">
        <span className="text-[13px] font-extrabold tracking-wide truncate">{tarjeta.banco || tarjeta.nombre}</span>
        <span
          className="text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ background: claro ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.18)' }}
        >
          {duenoLabel}
        </span>
      </span>

      <span className="relative block">
        <span className="block text-[11px] font-semibold opacity-85">Deuda</span>
        <span className="block font-mono text-2xl lg:text-xl font-bold">{fmt(tarjeta.saldo_total)}</span>
        <span
          className="block h-1 mt-2 rounded-full overflow-hidden"
          style={{ background: claro ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.22)' }}
        >
          <span className="block h-full rounded-full" style={{ width: `${uso}%`, background: ink }} />
        </span>
        <span className="flex justify-between gap-2 mt-1.5 text-[11px] font-semibold">
          <span className="truncate">{tarjeta.nombre}</span>
          <span className="flex-shrink-0">{Math.round(uso)}%</span>
        </span>
      </span>
    </button>
  )
}
