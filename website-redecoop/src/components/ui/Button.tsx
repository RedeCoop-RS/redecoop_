import { type ButtonHTMLAttributes, type ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'outline' | 'yellow' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  arrow?: boolean
  children: ReactNode
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-smooth disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 hover:scale-[1.02] active:translate-y-0 active:scale-[0.98]'

const variants: Record<Variant, string> = {
  primary:
    'bg-green text-white hover:bg-green-dark shadow-md shadow-green/20 hover:shadow-lg hover:shadow-green/30',
  secondary:
    'bg-white text-green border-2 border-green hover:bg-green/5 hover:shadow-md hover:shadow-green/15',
  outline:
    'bg-transparent text-green border border-green/30 hover:border-green hover:bg-green/5 hover:shadow-sm hover:shadow-green/10',
  yellow:
    'bg-red text-white hover:brightness-105 shadow-md shadow-red/30 hover:shadow-lg hover:shadow-red/40',
  ghost:
    'bg-transparent text-green hover:bg-green/10 hover:-translate-y-0 hover:scale-[1.02]',
}

export function Button({
  variant = 'primary',
  arrow = false,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${base} ${variants[variant]} ${arrow ? 'btn-arrow' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
