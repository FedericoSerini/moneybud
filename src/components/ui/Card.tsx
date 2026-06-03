import { ReactNode } from 'react'

export type CardVariant = 'default' | 'emerald' | 'gold' | 'danger' | 'info'

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  variant?: CardVariant
}

const variantClasses: Record<CardVariant, string> = {
  default:  'glass',
  emerald:  'glass-emerald',
  gold:     'glass-gold',
  danger:   'glass-danger',
  info:     'glass-info',
}

export function Card({ children, className = '', onClick, variant = 'default' }: CardProps) {
  return (
    <div
      className={`${variantClasses[variant]} rounded-xl ${
        onClick ? 'cursor-pointer hover:border-accent/40 transition-all duration-200' : ''
      } ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
}

export function CardHeader({ title, subtitle, action }: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between px-5 pt-5 pb-3">
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
