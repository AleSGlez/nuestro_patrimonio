// src/shared/components/ui/Spinner.jsx
import { cn } from '@lib/utils'
export default function Spinner({ size = 'md', className }) {
  const s = { sm: 'w-4 h-4 border-[1.5px]', md: 'w-5 h-5 border-2', lg: 'w-7 h-7 border-2' }
  return <div className={cn('rounded-full border-white/20 border-t-white animate-spin', s[size], className)} />
}
