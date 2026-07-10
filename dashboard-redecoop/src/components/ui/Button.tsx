import { type ButtonHTMLAttributes, type ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'outline' | 'yellow' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  arrow?: boolean
  children: ReactNode
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed'

const variants: Record<Variant, string> = {
  primary: 'bg-green text-white hover:bg-green-dark',
  secondary: 'bg-white text-green border border-green/30 hover:bg-green/5',
  outline: 'bg-transparent text-grey-dark border border-gray-200 hover:border-gray-300 hover:bg-gray-50',
  yellow: 'bg-yellow text-green hover:brightness-105',
  ghost: 'bg-transparent text-grey-dark hover:bg-gray-100',
  danger: 'bg-red text-white hover:brightness-110',
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
