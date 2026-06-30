// src/shared/components/ui/LoadingScreen.jsx
export default function LoadingScreen({ msg = 'Cargando…' }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-surface-900">
      <div className="w-14 h-14 rounded-2xl bg-[var(--accent-muted)] border border-[var(--accent)]/20 flex items-center justify-center">
        <span className="text-2xl">💑</span>
      </div>
      <div className="flex gap-1.5">
        {[0,1,2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse-dot"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
      <p className="text-xs text-gray-500">{msg}</p>
    </div>
  )
}
