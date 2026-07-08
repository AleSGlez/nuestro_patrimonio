// src/shared/components/layout/SubNav.jsx
import { cn } from '@lib/utils'

export default function SubNav({ tabs, active, onChange, titulo }) {
  return (
    <div
      className="flex-shrink-0 bg-surface-900 border-b border-white/[0.06]"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      {titulo && (
        <p className="px-4 pt-3 pb-1 text-lg font-bold text-white">{titulo}</p>
      )}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar px-4 py-2.5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap flex-shrink-0 transition-all',
              active === tab.id
                ? 'bg-[var(--accent)] text-white'
                : 'bg-surface-700 text-gray-400'
            )}
          >
            {tab.emoji && <span>{tab.emoji}</span>}
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}
