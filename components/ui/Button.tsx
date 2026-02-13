import { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  children: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center font-semibold rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed'
  
  const variants = {
    primary:
      'bg-gradient-to-r from-[var(--brand-blue)] via-[#004c95] to-[var(--brand-red)] text-white shadow-lg shadow-blue-900/20 hover:brightness-110 focus-visible:ring-[var(--brand-blue)]',
    secondary:
      'bg-white/80 text-[var(--brand-blue)] border border-white/60 shadow-sm hover:bg-white focus-visible:ring-[var(--brand-blue)]',
    danger:
      'bg-[var(--brand-red)] text-white shadow-lg shadow-red-900/15 hover:bg-[#a30f26] focus-visible:ring-red-500',
    outline:
      'border-2 border-white/50 text-[var(--brand-blue)] hover:bg-white/40 focus-visible:ring-[var(--brand-blue)]',
    ghost:
      'text-slate-700 hover:bg-slate-100/70 focus-visible:ring-[var(--brand-blue)]',
  }
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  }

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  )
}

