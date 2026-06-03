import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  prefix?: string
  suffix?: string
}

export function Input({ label, error, prefix, suffix, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</label>}
      <div className="flex items-center">
        {prefix && (
          <span className="px-3 py-2 text-sm text-slate-400 glass border-r-0 rounded-l-lg">
            {prefix}
          </span>
        )}
        <input
          className={`w-full px-3 py-2 text-sm text-white glass focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/20 transition-all duration-200 placeholder:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed ${
            prefix ? 'rounded-r-lg' : suffix ? 'rounded-l-lg' : 'rounded-lg'
          } ${error ? '!border-red-500/60' : ''} ${className}`}
          {...props}
        />
        {suffix && (
          <span className="px-3 py-2 text-sm text-slate-400 glass border-l-0 rounded-r-lg">
            {suffix}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  children: ReactNode
}

export function Select({ label, error, className = '', children, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</label>}
      <select
        className={`w-full px-3 py-2 text-sm text-white glass focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/20 transition-all duration-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${
          error ? '!border-red-500/60' : ''
        } ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export function Textarea({ label, error, className = '', ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</label>}
      <textarea
        className={`w-full px-3 py-2 text-sm text-white glass focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/20 transition-all duration-200 rounded-lg resize-none disabled:opacity-50 disabled:cursor-not-allowed ${
          error ? '!border-red-500/60' : ''
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
