import { useEffect, useRef, useState } from 'react'
import { mapService, type MapPlace } from '@/services/misc.service'

export function AddressAutocomplete({
  label,
  value,
  onChange,
  disabled,
  placeholder = 'Digite para buscar...',
}: {
  label: string
  value: MapPlace | null
  onChange: (place: MapPlace | null) => void
  disabled?: boolean
  placeholder?: string
}) {
  const [query, setQuery] = useState(value?.address ?? '')
  const [options, setOptions] = useState<MapPlace[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setQuery(value?.address ?? '')
  }, [value])

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const search = (text: string) => {
    setQuery(text)
    onChange(null)
    if (timer.current) clearTimeout(timer.current)
    if (text.length < 2) {
      setOptions([])
      setOpen(false)
      setError('')
      return
    }
    timer.current = setTimeout(async () => {
      setLoading(true)
      setError('')
      try {
        const results = await mapService.autoComplete(text)
        setOptions(results)
        setOpen(results.length > 0)
        if (results.length === 0) {
          setError('Nenhum endereço encontrado.')
        }
      } catch {
        setOptions([])
        setError('Não foi possível buscar endereços. Tente novamente.')
      } finally {
        setLoading(false)
      }
    }, 400)
  }

  const pick = (place: MapPlace) => {
    setQuery(place.address)
    onChange(place)
    setOpen(false)
  }

  return (
    <div className="travel-address-field" ref={wrapRef}>
      <label className="travel-address-field__label">{label}</label>
      <input
        type="text"
        className="travel-address-field__input"
        value={query}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => search(e.target.value)}
        onFocus={() => options.length > 0 && setOpen(true)}
      />
      {loading && <span className="travel-address-field__hint">Buscando...</span>}
      {!loading && error && (
        <span className="travel-address-field__hint travel-address-field__hint--error">{error}</span>
      )}
      {open && (
        <ul className="travel-address-field__list" role="listbox">
          {options.map((place) => (
            <li key={`${place.address}-${place.coordinates.latitude}`}>
              <button type="button" onClick={() => pick(place)}>
                <strong>{place.name}</strong>
                <span>{place.address}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
