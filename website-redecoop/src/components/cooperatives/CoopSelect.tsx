import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

export interface CoopSelectOption {
  value: number
  label: string
}

interface CoopSelectProps {
  value: number
  options: CoopSelectOption[]
  placeholder: string
  onChange: (value: number) => void
}

export function CoopSelect({ value, options, placeholder, onChange }: CoopSelectProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const selected = options.find((o) => o.value === value)
  const label = selected?.label ?? placeholder

  useEffect(() => {
    if (!open) return

    const handleClickOutside = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  return (
    <div ref={rootRef} className={`coop-select-custom${open ? ' coop-select-custom--open' : ''}`}>
      <button
        type="button"
        className="coop-select-custom__trigger"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={selected ? '' : 'coop-select-custom__placeholder'}>{label}</span>
        <ChevronDown size={18} className="coop-select-custom__chevron" />
      </button>

      {open && (
        <ul className="coop-select-custom__list" role="listbox">
          <li>
            <button
              type="button"
              role="option"
              aria-selected={value === 0}
              className={`coop-select-custom__option${value === 0 ? ' coop-select-custom__option--active' : ''}`}
              onClick={() => {
                onChange(0)
                setOpen(false)
              }}
            >
              {placeholder}
            </button>
          </li>
          {options.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                role="option"
                aria-selected={value === option.value}
                className={`coop-select-custom__option${value === option.value ? ' coop-select-custom__option--active' : ''}`}
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
