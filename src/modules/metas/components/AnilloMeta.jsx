// src/modules/metas/components/AnilloMeta.jsx
// Anillo de progreso de una meta; el contenido (emoji, %) va al centro
export default function AnilloMeta({ pct, color, size = 60, grosor = 6, children, label }) {
  const r = (size - grosor) / 2 - 1
  const circ = 2 * Math.PI * r
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg
        width={size} height={size} viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}
      >
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#2E2E3D" strokeWidth={grosor} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={grosor}
          strokeLinecap="round" strokeDasharray={`${(circ * Math.min(pct, 100)) / 100} ${circ}`}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}
