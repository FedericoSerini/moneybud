import { ReactNode, ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'gold' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
  loading?: boolean
}

const variants = {
  primary:   'bg-gradient-to-r from-accent to-accent-dark hover:from-accent-dark hover:to-accent-dark text-white shadow-[0_4px_14px_rgba(16,185,129,0.35)]',
  secondary: 'glass text-slate-300 hover:bg-white/[0.08] hover:text-white',
  gold:      'bg-gradient-to-r from-gold to-gold-dark hover:from-gold-dark hover:to-gold-dark text-white shadow-[0_4px_14px_rgba(245,158,11,0.3)]',
  danger:    'bg-red-600 hover:bg-red-700 text-white',
  ghost:     'border border-accent/30 text-accent hover:bg-accent/10 hover:border-accent/50',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
}

export function Button({ variant = 'primary', size = 'md', children, loading, className = '', disabled, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center gap-2 font-semibold rounded-lg transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      )}
      {children}
    </button>
  )
}
