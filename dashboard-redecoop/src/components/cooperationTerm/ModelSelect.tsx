import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Building2, Check, ChevronDown, Receipt } from 'lucide-react'
import type { CooperationTermModel } from '@/types/cooperationTerm'

const OPTIONS: {
  value: CooperationTermModel
  title: string
  text: string
  icon: typeof Building2
}[] = [
  { value: 'GHC', title: 'Modelo GHC', text: 'Quantidade por unidade hospitalar', icon: Building2 },
  { value: 'STANDARD', title: 'Modelo padrão', text: 'Quantidade, valor unitário e valor total', icon: Receipt },
]

export function ModelSelect({
  value,
  onChange,
  disabled,
}: {
  value: CooperationTermModel
  onChange: (value: CooperationTermModel) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [place, setPlace] = useState({ top: 0, left: 0, width: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLUListElement>(null)
  const listId = useId()
  const current = OPTIONS.find((option) => option.value === value) ?? OPTIONS[0]
  const CurrentIcon = current.icon

  useEffect(() => {
    if (!open) return
    const update = () => {
      const rect = buttonRef.current?.getBoundingClientRect()
      if (!rect) return
      const menuHeight = 168
      const spaceBelow = window.innerHeight - rect.bottom
      const top = spaceBelow < menuHeight && rect.top > spaceBelow ? rect.top - menuHeight - 6 : rect.bottom + 6
      setPlace({ top, left: rect.left, width: rect.width })
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="model-select">
      <span className="model-select__label" id={`${listId}-label`}>Modelo</span>
      <button
        ref={buttonRef}
        type="button"
        className="model-select__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-labelledby={`${listId}-label`}
        disabled={disabled}
        onClick={() => setOpen((currentOpen) => !currentOpen)}
      >
        <span className="model-select__value">
          <span className={`model-select__icon model-select__icon--${current.value === 'GHC' ? 'ghc' : 'standard'}`}>
            <CurrentIcon size={16} />
          </span>
          <span>
            <strong>{current.title}</strong>
            <small>{current.text}</small>
          </span>
        </span>
        <ChevronDown size={16} className={open ? 'is-open' : ''} />
      </button>
      {open && createPortal(
        <ul
          ref={menuRef}
          id={listId}
          role="listbox"
          aria-labelledby={`${listId}-label`}
          className="model-select__menu"
          style={{ top: place.top, left: place.left, width: place.width }}
        >
          {OPTIONS.map((option) => {
            const selected = option.value === value
            const Icon = option.icon
            return (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`model-select__option${selected ? ' is-selected' : ''}`}
                  onClick={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                >
                  <span className={`model-select__icon model-select__icon--${option.value === 'GHC' ? 'ghc' : 'standard'}`}>
                    <Icon size={16} />
                  </span>
                  <span>
                    <strong>{option.title}</strong>
                    <small>{option.text}</small>
                  </span>
                  {selected && <Check size={16} className="model-select__check" />}
                </button>
              </li>
            )
          })}
        </ul>,
        document.body,
      )}
    </div>
  )
}
