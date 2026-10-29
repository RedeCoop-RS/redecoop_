import { useState } from 'react'
import toast from 'react-hot-toast'
import { blogErrorMessage, blogService, type BlogTag } from '@/services/blog.service'

interface BlogTagsProps {
  tags: BlogTag[]
  onClose: () => void
  onChanged: () => void
}

export function BlogTags({ tags, onClose, onChanged }: BlogTagsProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)

  async function create() {
    if (!name.trim()) return
    setBusy(true)
    try {
      await blogService.createTag({ name: name.trim(), description: description.trim() || undefined })
      setName('')
      setDescription('')
      toast.success('Tag criada.')
      onChanged()
    } catch (error) {
      toast.error(blogErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  async function rename(tag: BlogTag) {
    const next = window.prompt('Nome da tag', tag.name)
    if (!next || next.trim() === tag.name) return
    try {
      await blogService.updateTag(tag.id, { name: next.trim(), description: tag.description || undefined, updatedAt: tag.updatedAt })
      onChanged()
    } catch (error) {
      toast.error(blogErrorMessage(error))
    }
  }

  async function remove(tag: BlogTag) {
    if (!window.confirm(`Excluir a tag “${tag.name}”?`)) return
    try {
      await blogService.deleteTag(tag.id)
      toast.success('Tag excluída.')
      onChanged()
    } catch (error) {
      toast.error(blogErrorMessage(error))
    }
  }

  return (
    <section className="blog-panel" role="dialog" aria-label="Tags">
      <header className="blog-panel__bar">
        <h2>Tags</h2>
        <button type="button" onClick={onClose}>Fechar</button>
      </header>
      <div className="blog-panel__body">
        <div className="blog-tag-form">
          <input aria-label="Nome da tag" value={name} placeholder="Nome da tag" onChange={(event) => setName(event.target.value)} />
          <input aria-label="Descrição da tag" value={description} placeholder="Descrição (opcional)" onChange={(event) => setDescription(event.target.value)} />
          <button type="button" className="blog-btn blog-btn--primary" disabled={busy} onClick={() => void create()}>Criar tag</button>
        </div>
        <ul className="blog-tag-list">
          {tags.length === 0 && <li>Nenhuma tag.</li>}
          {tags.map((tag) => (
            <li key={tag.id}>
              <span><strong>{tag.name}</strong> <small>{tag.slug}</small></span>
              <span>
                <button type="button" onClick={() => void rename(tag)}>Renomear</button>
                <button type="button" onClick={() => void remove(tag)}>Excluir</button>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
