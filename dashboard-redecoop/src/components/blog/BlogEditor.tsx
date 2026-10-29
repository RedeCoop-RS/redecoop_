import { useEffect, useRef, useState, type ReactNode } from 'react'
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
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Heading2,
  Heading3,
  Heading4,
  Highlighter,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Table as TableIcon,
  Underline as UnderlineIcon,
  Undo2,
  Video,
} from 'lucide-react'
import { Callout, Embed } from './Callout'

interface BlogEditorProps {
  documentKey: string
  html: string
  onChange: (html: string) => void
  onStats: (words: number) => void
  onUpload: (file: File) => Promise<string>
}

const CALLOUT_EMOJI = ['💡', '⚠️', '✅', '📌', '💚', '📣']

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

function ToolButton({
  pressed,
  label,
  title,
  onClick,
  children,
}: {
  pressed?: boolean
  label: string
  title: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button type="button" aria-label={label} title={title} aria-pressed={pressed} onClick={onClick}>
      <span aria-hidden="true">{children}</span>
    </button>
  )
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
      Image.configure({ HTMLAttributes: { class: 'blog-editor__image' } }),
      Placeholder.configure({ placeholder: 'Escreva o conteúdo. Cole imagens, use a barra acima ou atalhos do teclado.' }),
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

  function cycleCalloutEmoji() {
    const current = String(editor.getAttributes('callout').emoji || '💡')
    const next = CALLOUT_EMOJI[(CALLOUT_EMOJI.indexOf(current) + 1) % CALLOUT_EMOJI.length]
    mark(() => editor.chain().focus().updateAttributes('callout', { emoji: next }).run())
  }

  const active = (name: string | Record<string, unknown>, attrs?: Record<string, unknown>) =>
    typeof name === 'string' ? editor.isActive(name, attrs) : editor.isActive(name)
  const inTable = editor.isActive('table')
  const inCallout = editor.isActive('callout')

  return (
    <div className="blog-editor">
      <div className="blog-toolbar" role="toolbar" aria-label="Formatação">
        <span className="blog-toolbar__group">
          <ToolButton pressed={active('bold')} label="N" title="Negrito (Ctrl+B)" onClick={() => mark(() => editor.chain().focus().toggleBold().run())}>
            <Bold size={16} />
          </ToolButton>
          <ToolButton pressed={active('italic')} label="I" title="Itálico (Ctrl+I)" onClick={() => mark(() => editor.chain().focus().toggleItalic().run())}>
            <Italic size={16} />
          </ToolButton>
          <ToolButton pressed={active('underline')} label="S" title="Sublinhado (Ctrl+U)" onClick={() => mark(() => editor.chain().focus().toggleUnderline().run())}>
            <UnderlineIcon size={16} />
          </ToolButton>
          <ToolButton pressed={active('strike')} label="T" title="Riscado" onClick={() => mark(() => editor.chain().focus().toggleStrike().run())}>
            <Strikethrough size={16} />
          </ToolButton>
        </span>
        <span className="blog-toolbar__group">
          <ToolButton pressed={active('heading', { level: 2 })} label="H2" title="Título 2" onClick={() => mark(() => editor.chain().focus().toggleHeading({ level: 2 }).run())}>
            <Heading2 size={16} />
          </ToolButton>
          <ToolButton pressed={active('heading', { level: 3 })} label="H3" title="Título 3" onClick={() => mark(() => editor.chain().focus().toggleHeading({ level: 3 }).run())}>
            <Heading3 size={16} />
          </ToolButton>
          <ToolButton pressed={active('heading', { level: 4 })} label="H4" title="Título 4" onClick={() => mark(() => editor.chain().focus().toggleHeading({ level: 4 }).run())}>
            <Heading4 size={16} />
          </ToolButton>
        </span>
        <span className="blog-toolbar__group">
          <ToolButton pressed={active('bulletList')} label="Lista" title="Lista com marcadores" onClick={() => mark(() => editor.chain().focus().toggleBulletList().run())}>
            <List size={16} />
          </ToolButton>
          <ToolButton pressed={active('orderedList')} label="1." title="Lista numerada" onClick={() => mark(() => editor.chain().focus().toggleOrderedList().run())}>
            <ListOrdered size={16} />
          </ToolButton>
          <ToolButton pressed={active('blockquote')} label="Citação" title="Citação" onClick={() => mark(() => editor.chain().focus().toggleBlockquote().run())}>
            <Quote size={16} />
          </ToolButton>
          <ToolButton pressed={active('codeBlock')} label="Código" title="Bloco de código" onClick={() => mark(() => editor.chain().focus().toggleCodeBlock().run())}>
            <Code size={16} />
          </ToolButton>
          <ToolButton label="Linha" title="Linha horizontal" onClick={() => mark(() => editor.chain().focus().setHorizontalRule().run())}>
            <Minus size={16} />
          </ToolButton>
        </span>
        <span className="blog-toolbar__group">
          <ToolButton pressed={active('link')} label="Link" title="Inserir ou editar link" onClick={() => { setLinkUrl(String(editor.getAttributes('link').href || 'https://')); setLinkOpen(true) }}>
            <Link2 size={16} />
          </ToolButton>
          <ToolButton label="Imagem" title="Enviar imagem para o Ghost" onClick={() => fileRef.current?.click()}>
            <ImageIcon size={16} />
          </ToolButton>
          <ToolButton label="Vídeo" title="YouTube, Vimeo ou outro endereço" onClick={() => setEmbedOpen(true)}>
            <Video size={16} />
          </ToolButton>
          <ToolButton pressed={inCallout} label="Destaque" title="Caixa de destaque" onClick={() => mark(() => editor.chain().focus().setCallout().run())}>
            <Highlighter size={16} />
          </ToolButton>
          <ToolButton label="Tabela" title="Inserir tabela" onClick={() => mark(() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())}>
            <TableIcon size={16} />
          </ToolButton>
        </span>
        <span className="blog-toolbar__group">
          <ToolButton pressed={active({ textAlign: 'left' })} label="Esq." title="Alinhar à esquerda" onClick={() => mark(() => editor.chain().focus().setTextAlign('left').run())}>
            <AlignLeft size={16} />
          </ToolButton>
          <ToolButton pressed={active({ textAlign: 'center' })} label="Centro" title="Centralizar" onClick={() => mark(() => editor.chain().focus().setTextAlign('center').run())}>
            <AlignCenter size={16} />
          </ToolButton>
          <ToolButton pressed={active({ textAlign: 'right' })} label="Dir." title="Alinhar à direita" onClick={() => mark(() => editor.chain().focus().setTextAlign('right').run())}>
            <AlignRight size={16} />
          </ToolButton>
        </span>
        <span className="blog-toolbar__group">
          <ToolButton label="Desfazer" title="Desfazer (Ctrl+Z)" onClick={() => mark(() => editor.chain().focus().undo().run())}>
            <Undo2 size={16} />
          </ToolButton>
          <ToolButton label="Refazer" title="Refazer (Ctrl+Shift+Z)" onClick={() => mark(() => editor.chain().focus().redo().run())}>
            <Redo2 size={16} />
          </ToolButton>
        </span>
      </div>
      {inTable && (
        <div className="blog-toolbar blog-toolbar--sub" role="toolbar" aria-label="Tabela">
          <button type="button" onClick={() => mark(() => editor.chain().focus().addColumnBefore().run())}>Coluna à esquerda</button>
          <button type="button" onClick={() => mark(() => editor.chain().focus().addColumnAfter().run())}>Coluna à direita</button>
          <button type="button" onClick={() => mark(() => editor.chain().focus().deleteColumn().run())}>Remover coluna</button>
          <button type="button" onClick={() => mark(() => editor.chain().focus().addRowBefore().run())}>Linha acima</button>
          <button type="button" onClick={() => mark(() => editor.chain().focus().addRowAfter().run())}>Linha abaixo</button>
          <button type="button" onClick={() => mark(() => editor.chain().focus().deleteRow().run())}>Remover linha</button>
          <button type="button" onClick={() => mark(() => editor.chain().focus().deleteTable().run())}>Remover tabela</button>
        </div>
      )}
      {inCallout && (
        <div className="blog-toolbar blog-toolbar--sub" role="toolbar" aria-label="Destaque">
          <button type="button" onClick={cycleCalloutEmoji}>Emoji {String(editor.getAttributes('callout').emoji || '💡')}</button>
        </div>
      )}
      {linkOpen && (
        <form className="blog-pop" onSubmit={(event) => { event.preventDefault(); applyLink() }}>
          <label>
            Endereço do link
            <input value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} aria-label="Endereço do link" />
          </label>
          <button type="submit">Aplicar link</button>
          <button type="button" onClick={() => { mark(() => editor.chain().focus().unsetLink().run()); setLinkOpen(false) }}>Remover link</button>
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
      <p className="blog-editor__hint">Atalhos: Ctrl+B negrito, Ctrl+I itálico, Ctrl+U sublinhado. Cole ou arraste imagens para enviá-las ao Ghost.</p>
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
