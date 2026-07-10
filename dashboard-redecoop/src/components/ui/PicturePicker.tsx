import { useEffect, useId, useRef, useState } from 'react'
import { ImageIcon, Trash2 } from 'lucide-react'

interface PicturePickerProps {
  existingSrc?: string
  file: File | null
  onChange: (file: File | null) => void
  onPreviewClick?: (src: string) => void
  onClear?: () => void
  accept?: string
  compact?: boolean
}

export function PicturePicker({
  existingSrc,
  file,
  onChange,
  onPreviewClick,
  onClear,
  accept = 'image/jpeg,image/jpg,image/png,image/webp',
  compact = false,
}: PicturePickerProps) {
  const previewSize = compact ? 'h-16 w-16' : 'h-36 w-36'
  const iconSize = compact ? 22 : 36
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    if (!file) {
      setLocalPreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setLocalPreview(url)
    setLoadError(false)
    return () => URL.revokeObjectURL(url)
  }, [file])

  useEffect(() => {
    setLoadError(false)
  }, [existingSrc])

  const previewSrc = localPreview ?? existingSrc
  const hasPreview = Boolean(previewSrc) && !loadError

  const clear = () => {
    onChange(null)
    setLoadError(false)
    if (inputRef.current) inputRef.current.value = ''
    onClear?.()
  }

  return (
    <div className={`flex items-center gap-2 ${compact ? 'flex-row' : 'flex-col'}`}>
      <div className="relative shrink-0">
        {hasPreview ? (
          <button
            type="button"
            className="block overflow-hidden rounded-xl border border-gray-200 bg-gray-50"
            onClick={() => previewSrc && onPreviewClick?.(previewSrc)}
          >
            <img
              src={previewSrc}
              alt="Pré-visualização"
              className={`${previewSize} object-cover transition hover:brightness-90`}
              onError={() => setLoadError(true)}
            />
          </button>
        ) : (
          <div className={`flex ${previewSize} flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-2 text-center text-grey`}>
            <ImageIcon size={iconSize} strokeWidth={1.25} />
            {loadError && <span className="text-xs text-grey-dark">Imagem indisponível</span>}
          </div>
        )}

        {(file || existingSrc) && !loadError && (
          <button
            type="button"
            className={`absolute flex items-center justify-center rounded-full border border-gray-200 bg-white text-red shadow-sm transition hover:bg-red/5 ${compact ? '-right-1.5 -top-1.5 h-5 w-5' : '-right-2 -top-2 h-7 w-7'}`}
            onClick={clear}
            aria-label="Remover imagem"
          >
            <Trash2 size={compact ? 11 : 14} />
          </button>
        )}
      </div>

      <label htmlFor={inputId} className={`cursor-pointer font-medium text-green hover:underline ${compact ? 'text-xs' : 'text-sm'}`}>
        Selecionar imagem
      </label>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </div>
  )
}
