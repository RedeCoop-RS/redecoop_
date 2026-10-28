import { useEffect, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import Youtube from '@tiptap/extension-youtube'
import CharacterCount from '@tiptap/extension-character-count'
import type { Editor } from '@tiptap/core'
import { Callout, Embed } from './Callout'

interface BlogEditorProps {
  documentKey: string
  html: string
  onChange: (html: string) => void
  onStats: (words: number) => void
  onUpload: (file: File) => Promise<string>
}

function wordsOf(editor: Editor) {
  const storage = editor.storage as { characterCount?: { words: () => number } }
  return storage.characterCount?.words() ?? 0
}

function youtubeId(url: string) {
  try {
    const parsed = new URL(url)
    if (parsed.hostname === 'youtu.be') return parsed.pathname.slice(1).split('/')[0]
    if (parsed.hostname.endsWith('youtube.com')) {
      return parsed.searchParams.get('v') || parsed.pathname.split('/').filter(Boolean).pop() || ''
    }
  } catch {
    return ''
  }
  return ''
}

function vimeoId(url: string) {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  return match?.[1] || ''
}

export function BlogEditor({ documentKey, html, onChange, onStats, onUpload }: BlogEditorProps) {
  const touched = useRef(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('https://')
  const [embedOpen, setEmbedOpen] = useState(false)
  const [embedUrl, setEmbedUrl] = useState('https://')
  const htmlRef = useRef(html)
  htmlRef.current = html
  const onChangeRef = useRef(onChange)
  const onStatsRef = useRef(onStats)
  const onUploadRef = useRef(onUpload)
  onChangeRef.current = onChange
  onStatsRef.current = onStats
  onUploadRef.current = onUpload

  const editor = useEditor({
    immediatelyRender: true,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true, defaultProtocol: 'https' }),
      Image,
      Placeholder.configure({ placeholder: 'Escreva o conteúdo…' }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Youtube.configure({ nocookie: true, width: 640, height: 360 }),
      CharacterCount,
      Callout,
      Embed,
    ],
    content: html || '<p></p>',
    editorProps: {
      attributes: {
        class: 'blog-editor__area',
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': 'Conteúdo',
      },
      handlePaste: (_view, event) => {
        const file = Array.from(event.clipboardData?.files || []).find((item) => item.type.startsWith('image/'))
        if (!file) return false
        event.preventDefault()
        void insertImage(file)
        return true
      },
      handleDrop: (_view, event) => {
        const file = Array.from(event.dataTransfer?.files || []).find((item) => item.type.startsWith('image/'))
        if (!file) return false
        event.preventDefault()
        void insertImage(file)
        return true
      },
    },
    onCreate: ({ editor: current }) => onStatsRef.current(wordsOf(current)),
    onUpdate: ({ editor: current }) => {
      onStatsRef.current(wordsOf(current))
      if (touched.current) onChangeRef.current(current.getHTML())
    },
  })

  useEffect(() => {
    touched.current = false
    editor.commands.setContent(htmlRef.current || '<p></p>', false)
    onStatsRef.current(wordsOf(editor))
  }, [documentKey, editor])

  function mark(run: () => void) {
    touched.current = true
    run()
  }

  async function insertImage(file: File) {
    const url = await onUploadRef.current(file)
    mark(() => editor.chain().focus().setImage({ src: url, alt: file.name }).run())
  }

  function applyLink() {
    const href = linkUrl.trim()
    mark(() => {
      if (!href) editor.chain().focus().unsetLink().run()
      else editor.chain().focus().extendMarkRange('link').setLink({ href }).run()
    })
    setLinkOpen(false)
  }

  function applyEmbed() {
    const raw = embedUrl.trim()
    const youtube = youtubeId(raw)
    const vimeo = vimeoId(raw)
    mark(() => {
      if (youtube) editor.chain().focus().setYoutubeVideo({ src: raw }).run()
      else if (vimeo) {
        editor.chain().focus().insertContent({ type: 'embed', attrs: { src: `https://player.vimeo.com/video/${vimeo}`, title: 'Vimeo' } }).run()
      } else if (/^https?:\/\//i.test(raw)) {
        editor.chain().focus().insertContent(`<p><a href="${raw}">${raw}</a></p>`).run()
      }
    })
    setEmbedOpen(false)
  }

  const active = (name: string, attrs?: Record<string, unknown>) => editor.isActive(name, attrs)

  return (
    <div className="blog-editor">
      <div className="blog-toolbar" role="toolbar" aria-label="Formatação">
        <button type="button" aria-pressed={active('bold')} onClick={() => mark(() => editor.chain().focus().toggleBold().run())}>N</button>
        <button type="button" aria-pressed={active('italic')} onClick={() => mark(() => editor.chain().focus().toggleItalic().run())}><em>I</em></button>
        <button type="button" aria-pressed={active('underline')} onClick={() => mark(() => editor.chain().focus().toggleUnderline().run())}><u>S</u></button>
        <button type="button" aria-pressed={active('strike')} onClick={() => mark(() => editor.chain().focus().toggleStrike().run())}><s>T</s></button>
        <span className="blog-toolbar__gap" />
        <button type="button" aria-pressed={active('heading', { level: 2 })} onClick={() => mark(() => editor.chain().focus().toggleHeading({ level: 2 }).run())}>H2</button>
        <button type="button" aria-pressed={active('heading', { level: 3 })} onClick={() => mark(() => editor.chain().focus().toggleHeading({ level: 3 }).run())}>H3</button>
        <button type="button" aria-pressed={active('heading', { level: 4 })} onClick={() => mark(() => editor.chain().focus().toggleHeading({ level: 4 }).run())}>H4</button>
        <span className="blog-toolbar__gap" />
        <button type="button" aria-pressed={active('bulletList')} onClick={() => mark(() => editor.chain().focus().toggleBulletList().run())}>Lista</button>
        <button type="button" aria-pressed={active('orderedList')} onClick={() => mark(() => editor.chain().focus().toggleOrderedList().run())}>1.</button>
        <button type="button" aria-pressed={active('blockquote')} onClick={() => mark(() => editor.chain().focus().toggleBlockquote().run())}>Citação</button>
        <button type="button" aria-pressed={active('codeBlock')} onClick={() => mark(() => editor.chain().focus().toggleCodeBlock().run())}>Código</button>
        <button type="button" onClick={() => mark(() => editor.chain().focus().setHorizontalRule().run())}>Linha</button>
        <span className="blog-toolbar__gap" />
        <button type="button" aria-pressed={active('link')} onClick={() => { setLinkUrl(String(editor.getAttributes('link').href || 'https://')); setLinkOpen(true) }}>Link</button>
        <button type="button" onClick={() => fileRef.current?.click()}>Imagem</button>
        <button type="button" onClick={() => setEmbedOpen(true)}>Vídeo</button>
        <button type="button" aria-pressed={active('callout')} onClick={() => mark(() => editor.chain().focus().setCallout().run())}>Destaque</button>
        <button type="button" onClick={() => mark(() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())}>Tabela</button>
        <button type="button" onClick={() => mark(() => editor.chain().focus().setTextAlign('left').run())}>Esq.</button>
        <button type="button" onClick={() => mark(() => editor.chain().focus().setTextAlign('center').run())}>Centro</button>
        <button type="button" onClick={() => mark(() => editor.chain().focus().undo().run())}>Desfazer</button>
        <button type="button" onClick={() => mark(() => editor.chain().focus().redo().run())}>Refazer</button>
      </div>
      {linkOpen && (
        <form className="blog-pop" onSubmit={(event) => { event.preventDefault(); applyLink() }}>
          <label>
            Endereço do link
            <input value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} aria-label="Endereço do link" />
          </label>
          <button type="submit">Aplicar link</button>
          <button type="button" onClick={() => setLinkOpen(false)}>Cancelar</button>
        </form>
      )}
      {embedOpen && (
        <form className="blog-pop" onSubmit={(event) => { event.preventDefault(); applyEmbed() }}>
          <label>
            YouTube, Vimeo ou outro endereço
            <input value={embedUrl} onChange={(event) => setEmbedUrl(event.target.value)} aria-label="Endereço do vídeo" />
          </label>
          <button type="submit">Inserir vídeo</button>
          <button type="button" onClick={() => setEmbedOpen(false)}>Cancelar</button>
        </form>
      )}
      <EditorContent editor={editor} />
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        hidden
        aria-label="Enviar imagem do conteúdo"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) void insertImage(file)
        }}
      />
    </div>
  )
}
