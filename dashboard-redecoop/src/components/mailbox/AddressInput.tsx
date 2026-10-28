import { useEffect, useId, useRef, useState } from 'react'
import { mailboxService, type MailContact } from '@/services/mailbox.service'

interface AddressInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  autoFocus?: boolean
}

function lastToken(value: string) {
  const parts = value.split(/[,;]/)
  return parts[parts.length - 1].trim()
}

function replaceLastToken(value: string, contact: MailContact) {
  const parts = value.split(/[,;]/)
  parts.pop()
  const formatted = contact.name ? `${contact.name.replace(/[",;<>]/g, '')} <${contact.address}>` : contact.address
  return [...parts.map((part) => part.trim()).filter(Boolean), formatted].join(', ') + ', '
}

export function AddressInput({ label, value, onChange, required, autoFocus }: AddressInputProps) {
  const [suggestions, setSuggestions] = useState<MailContact[]>([])
  const [active, setActive] = useState(0)
  const [open, setOpen] = useState(false)
  const listId = useId()
  const request = useRef(0)

  const token = lastToken(value)

  useEffect(() => {
    if (!open || token.length < 2) {
      setSuggestions([])
      return
    }
    const current = ++request.current
    const timer = window.setTimeout(async () => {
      try {
        const found = await mailboxService.contacts(token)
        const already = value.toLowerCase()
        if (current === request.current) {
          setSuggestions(found.filter((item) => !already.includes(`<${item.address}>`) && !already.split(/[,;]/).some((part) => part.trim().toLowerCase() === item.address)))
          setActive(0)
        }
      } catch {
        if (current === request.current) setSuggestions([])
      }
    }, 180)
    return () => window.clearTimeout(timer)
  }, [token, open, value])

  function choose(contact: MailContact) {
    onChange(replaceLastToken(value, contact))
    setSuggestions([])
  }

  return (
    <label className="mailbox-address">
      {label}
      <input
        value={value}
        required={required}
        autoFocus={autoFocus}
        autoComplete="off"
        role="combobox"
        aria-expanded={suggestions.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        onChange={(event) => {
          onChange(event.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onKeyDown={(event) => {
          if (!suggestions.length) {
            if (event.key === 'Enter' && !event.ctrlKey && !event.metaKey) {
              event.preventDefault()
              if (token.includes('@')) onChange(`${value.replace(/[\s,;]+$/, '')}, `)
            }
            return
          }
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setActive((index) => (index + 1) % suggestions.length)
          } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            setActive((index) => (index - 1 + suggestions.length) % suggestions.length)
          } else if (event.key === 'Enter' || event.key === 'Tab') {
            event.preventDefault()
            choose(suggestions[active])
          } else if (event.key === 'Escape') {
            event.stopPropagation()
            setSuggestions([])
          }
        }}
      />
      {suggestions.length > 0 && (
        <ul id={listId} role="listbox" className="mailbox-suggestions">
          {suggestions.map((item, index) => (
            <li
              key={item.address}
              role="option"
              aria-selected={index === active}
              className={index === active ? 'is-active' : ''}
              onMouseDown={(event) => {
                event.preventDefault()
                choose(item)
              }}
            >
              {item.name && <strong>{item.name}</strong>}
              <span>{item.address}</span>
            </li>
          ))}
        </ul>
      )}
    </label>
  )
}
