import { useEffect, useRef } from 'react'
import { Bold, ImagePlus, Italic, Link2, List, ListOrdered, Quote, Underline } from 'lucide-react'
import { notify } from '@/lib/notify'

interface RichTextEditorProps {
  editorKey: string
  initialHtml: string
  onChange: (html: string) => void
  placeholder?: string
}

const MAX_SIDE = 1600
const MAX_INLINE_BYTES = 4 * 1024 * 1024

function readAsDataUrl(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/** Reduz fotos grandes para o e-mail não estourar o limite do servidor. */
async function inlineImage(file: File): Promise<string | null> {
  if (!/^image\/(png|jpe?g|gif|webp)$/i.test(file.type)) {
    notify.error('Use imagens PNG, JPG, GIF ou WebP no corpo do e-mail.')
    return null
  }
  const original = await readAsDataUrl(file)
  if (file.type === 'image/gif' && file.size <= MAX_INLINE_BYTES) return original
  const image = new Image()
  image.src = original
  await image.decode().catch(() => undefined)
  const scale = Math.min(1, MAX_SIDE / Math.max(image.naturalWidth || 1, image.naturalHeight || 1))
  if (scale === 1 && file.size <= 1024 * 1024) return original
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
  canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height)
  const result = canvas.toDataURL(file.type === 'image/png' && file.size < 2 * 1024 * 1024 ? 'image/png' : 'image/jpeg', 0.85)
  if (result.length * 0.75 > MAX_INLINE_BYTES) {
    notify.error(`${file.name} é grande demais para colar no texto. Anexe o arquivo.`)
    return null
  }
  return result
}

export function RichTextEditor({ editorKey, initialHtml, onChange, placeholder }: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = initialHtml || ''
    // Só reinicia o HTML ao abrir outro rascunho/resposta. Incluir initialHtml
    // no efeito moveria o cursor a cada tecla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorKey])

  function emit() {
    onChange(ref.current?.innerHTML || '')
  }

  function command(name: string, value?: string) {
    ref.current?.focus()
    document.execCommand(name, false, value)
    emit()
  }

  async function insertImages(files: File[]) {
    for (const file of files) {
      const url = await inlineImage(file)
      if (!url) continue
      ref.current?.focus()
      document.execCommand('insertHTML', false, `<img src="${url}" alt="${file.name.replace(/["<>&]/g, '')}" style="max-width:100%">`)
    }
    emit()
  }

  return (
    <div className="mailbox-editor">
      <div className="mailbox-editor__tools">
        <button type="button" aria-label="Negrito" title="Negrito (Ctrl+B)" onMouseDown={(event) => event.preventDefault()} onClick={() => command('bold')}>
          <Bold size={16} />
        </button>
        <button type="button" aria-label="Itálico" title="Itálico (Ctrl+I)" onMouseDown={(event) => event.preventDefault()} onClick={() => command('italic')}>
          <Italic size={16} />
        </button>
        <button type="button" aria-label="Sublinhado" title="Sublinhado (Ctrl+U)" onMouseDown={(event) => event.preventDefault()} onClick={() => command('underline')}>
          <Underline size={16} />
        </button>
        <button type="button" aria-label="Lista" onMouseDown={(event) => event.preventDefault()} onClick={() => command('insertUnorderedList')}>
          <List size={16} />
        </button>
        <button type="button" aria-label="Lista numerada" onMouseDown={(event) => event.preventDefault()} onClick={() => command('insertOrderedList')}>
          <ListOrdered size={16} />
        </button>
        <button type="button" aria-label="Citação" onMouseDown={(event) => event.preventDefault()} onClick={() => command('formatBlock', 'blockquote')}>
          <Quote size={16} />
        </button>
        <button
          type="button"
          aria-label="Link"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            const url = window.prompt('Endereço do link (https://)')
            if (url && /^(https?:|mailto:)/i.test(url.trim())) command('createLink', url.trim())
            else if (url) notify.error('Use um link que comece com https:// ou mailto:.')
          }}
        >
          <Link2 size={16} />
        </button>
        <button type="button" aria-label="Inserir imagem no texto" onMouseDown={(event) => event.preventDefault()} onClick={() => fileRef.current?.click()}>
          <ImagePlus size={16} />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          multiple
          hidden
          data-testid="inline-image-input"
          onChange={(event) => {
            const files = Array.from(event.target.files || [])
            event.target.value = ''
            void insertImages(files)
          }}
        />
      </div>
      <div
        ref={ref}
        className="mailbox-editor__area"
        contentEditable
        role="textbox"
        aria-label="Corpo da mensagem"
        aria-multiline="true"
        data-placeholder={placeholder || 'Escreva a mensagem'}
        onInput={emit}
        onPaste={(event) => {
          const images = Array.from(event.clipboardData.files).filter((file) => file.type.startsWith('image/'))
          if (!images.length) return
          event.preventDefault()
          void insertImages(images)
        }}
        onDrop={(event) => {
          const images = Array.from(event.dataTransfer.files).filter((file) => file.type.startsWith('image/'))
          if (!images.length) return
          event.preventDefault()
          void insertImages(images)
        }}
      />
    </div>
  )
}
