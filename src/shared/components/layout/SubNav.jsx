// src/shared/components/layout/SubNav.jsx
import { cn } from '@lib/utils'

export default function SubNav({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto no-scrollbar px-4 py-2.5 border-b border-white/[0.06] flex-shrink-0 bg-surface-900">
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
  )
}
