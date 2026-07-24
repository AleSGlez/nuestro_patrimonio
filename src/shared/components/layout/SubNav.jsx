// src/shared/components/layout/SubNav.jsx
import { cn } from '@lib/utils'

export default function SubNav({ tabs, active, onChange, titulo }) {
  return (
    <div
      className="flex-shrink-0 bg-surface-900 border-b border-white/[0.06] lg:border-b-0 lg:px-10 lg:pt-8"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      {titulo && (
        <p className="px-4 pt-3 pb-1 text-lg font-bold text-white lg:px-0 lg:pt-0 lg:pb-0 lg:mb-6 lg:text-3xl lg:tracking-tight">{titulo}</p>
      )}
      <div className="flex gap-1.5 lg:gap-1 overflow-x-auto no-scrollbar px-4 lg:px-0 py-2.5 lg:py-0 lg:border-b lg:border-white/[0.06]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap flex-shrink-0 transition-all',
              'lg:rounded-none lg:px-4 lg:py-3 lg:text-sm lg:border-b-2',
              active === tab.id
                ? 'bg-[var(--accent)] text-white lg:bg-transparent lg:text-[var(--accent)] lg:border-[var(--accent)] lg:font-semibold'
                : 'bg-surface-700 text-gray-400 lg:bg-transparent lg:border-transparent lg:hover:text-white'
            )}
          >
            {tab.emoji && <span className="lg:hidden">{tab.emoji}</span>}
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}
