import { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  variant?: 'green' | 'red' | 'yellow' | 'blue' | 'gray'
  size?: 'sm' | 'md'
}

const variants = {
  green:  'bg-accent/15 text-accent-light border border-accent/25',
  red:    'bg-red-500/15 text-red-400 border border-red-500/25',
  yellow: 'bg-gold/15 text-gold-light border border-gold/25',
  blue:   'bg-blue-500/15 text-blue-400 border border-blue-500/25',
  gray:   'bg-white/[0.06] text-slate-400 border border-white/[0.08]',
}

const sizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
}

export function Badge({ children, variant = 'gray', size = 'sm' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center font-medium rounded-full backdrop-blur-sm ${variants[variant]} ${sizes[size]}`}>
      {children}
    </span>
  )
}
