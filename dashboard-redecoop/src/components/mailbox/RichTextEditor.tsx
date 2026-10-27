import { useEffect, useRef } from 'react'
import { Bold, Italic, Link2, List, Underline } from 'lucide-react'

interface RichTextEditorProps {
  editorKey: string
  initialHtml: string
  onChange: (html: string) => void
  placeholder?: string
}

export function RichTextEditor({ editorKey, initialHtml, onChange, placeholder }: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = initialHtml || ''
    // Só reinicia o HTML ao abrir outro rascunho/resposta. Incluir initialHtml
    // no efeito moveria o cursor a cada tecla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorKey])

  function command(name: string, value?: string) {
    ref.current?.focus()
    document.execCommand(name, false, value)
    onChange(ref.current?.innerHTML || '')
  }

  return (
    <div className="mailbox-editor">
      <div className="mailbox-editor__tools">
        <button type="button" aria-label="Negrito" onMouseDown={(event) => event.preventDefault()} onClick={() => command('bold')}>
          <Bold size={16} />
        </button>
        <button type="button" aria-label="Itálico" onMouseDown={(event) => event.preventDefault()} onClick={() => command('italic')}>
          <Italic size={16} />
        </button>
        <button type="button" aria-label="Sublinhado" onMouseDown={(event) => event.preventDefault()} onClick={() => command('underline')}>
          <Underline size={16} />
        </button>
        <button type="button" aria-label="Lista" onMouseDown={(event) => event.preventDefault()} onClick={() => command('insertUnorderedList')}>
          <List size={16} />
        </button>
        <button
          type="button"
          aria-label="Link"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            const url = window.prompt('Endereço do link (https://)')
            if (url) command('createLink', url)
          }}
        >
          <Link2 size={16} />
        </button>
      </div>
      <div
        ref={ref}
        className="mailbox-editor__area"
        contentEditable
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder || 'Escreva a mensagem'}
        onInput={() => onChange(ref.current?.innerHTML || '')}
      />
    </div>
  )
}
