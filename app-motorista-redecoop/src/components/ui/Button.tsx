import { type ButtonHTMLAttributes, type ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  fullWidth?: boolean
  children: ReactNode
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold transition-smooth disabled:opacity-50 disabled:cursor-not-allowed min-h-[var(--touch-target-min)] active:scale-[0.98]'

const variants: Record<Variant, string> = {
  primary:
    'bg-green text-white hover:bg-green-dark shadow-md shadow-green/20 hover:shadow-lg hover:shadow-green/30',
  secondary:
    'bg-white text-green border-2 border-green hover:bg-green/5 hover:shadow-md hover:shadow-green/15',
  outline:
    'bg-transparent text-grey-dark border border-gray-200 hover:border-green/40 hover:bg-green/5',
  ghost: 'bg-transparent text-green hover:bg-green/10',
  danger: 'bg-red text-white hover:brightness-105 shadow-md shadow-red/20',
}

export function Button({
  variant = 'primary',
  fullWidth = false,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${base} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
