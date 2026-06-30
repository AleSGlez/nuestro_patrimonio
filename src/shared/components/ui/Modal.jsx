// src/shared/components/ui/Modal.jsx
import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@lib/utils'

export default function Modal({ open, onClose, title, children, className }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      {/* Panel */}
      <div className={cn(
        'relative w-full sm:max-w-md bg-surface-800 border border-white/[0.08]',
        'rounded-t-3xl sm:rounded-3xl animate-slide-up',
        'max-h-[92svh] flex flex-col',
        className
      )}>
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
          <div className="w-9 h-1 rounded-full bg-white/20" />
        </div>
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] flex-shrink-0">
            <h2 className="text-base font-semibold text-white">{title}</h2>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/[0.06]">
              <X size={16} />
            </button>
          </div>
        )}
        {/* Content */}
        <div
          className="flex-1 overflow-y-auto px-5 py-4"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
