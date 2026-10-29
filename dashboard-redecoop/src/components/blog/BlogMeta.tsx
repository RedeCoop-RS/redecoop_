import type { ReactNode } from 'react'
import type { BlogAuthor, BlogDraft, BlogTag, BlogVisibility } from '@/services/blog.service'
import { VISIBILITY_LABEL } from '@/services/blog.service'

interface BlogMetaProps {
  draft: BlogDraft
  tags: BlogTag[]
  authors: BlogAuthor[]
  onChange: (patch: Partial<BlogDraft>) => void
  onUpload: (file: File) => Promise<string>
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="blog-field">
      <span>{label}</span>
      {children}
    </label>
  )
}

export function BlogMeta({ draft, tags, authors, onChange, onUpload }: BlogMetaProps) {
  function toggle(list: string[], id: string) {
    return list.includes(id) ? list.filter((item) => item !== id) : [...list, id]
  }

  return (
    <aside className="blog-meta">
      <Field label="Visibilidade">
        <select aria-label="Visibilidade" value={draft.visibility} onChange={(event) => onChange({ visibility: event.target.value as BlogVisibility })}>
          {(Object.keys(VISIBILITY_LABEL) as BlogVisibility[]).map((value) => (
            <option key={value} value={value}>{VISIBILITY_LABEL[value]}</option>
          ))}
        </select>
      </Field>
      <label className="blog-check">
        <input type="checkbox" aria-label="Marcar como destaque" checked={draft.featured} onChange={(event) => onChange({ featured: event.target.checked })} />
        Destaque na página inicial
      </label>
      <Field label="Data de publicação">
        <input
          type="datetime-local"
          aria-label="Data de publicação"
          value={toLocal(draft.publishedAt)}
          onChange={(event) => onChange({ publishedAt: event.target.value ? new Date(event.target.value).toISOString() : '' })}
        />
      </Field>
      <Field label="Resumo">
        <textarea aria-label="Resumo" rows={3} maxLength={2000} value={draft.customExcerpt} onChange={(event) => onChange({ customExcerpt: event.target.value })} />
      </Field>
      <Field label="Slug">
        <input aria-label="Slug" value={draft.slug} maxLength={191} onChange={(event) => onChange({ slug: event.target.value })} placeholder="gerado-pelo-titulo" />
      </Field>
      <fieldset className="blog-field">
        <legend>Tags</legend>
        {tags.length === 0 && <p className="blog-hint">Nenhuma tag ainda.</p>}
        {tags.map((tag) => (
          <label key={tag.id} className="blog-check">
            <input type="checkbox" checked={draft.tagIds.includes(tag.id)} onChange={() => onChange({ tagIds: toggle(draft.tagIds, tag.id) })} />
            {tag.name}
          </label>
        ))}
      </fieldset>
      <fieldset className="blog-field">
        <legend>Autores</legend>
        {authors.map((author) => (
          <label key={author.id} className="blog-check">
            <input
              type="checkbox"
              checked={draft.authorIds.includes(author.id)}
              onChange={() => onChange({ authorIds: toggle(draft.authorIds, author.id) })}
            />
            {author.name}
          </label>
        ))}
      </fieldset>
      <fieldset className="blog-field">
        <legend>Imagem de destaque</legend>
        {draft.featureImage && <img src={draft.featureImage} alt={draft.featureImageAlt || ''} className="blog-feature" />}
        <input
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          aria-label="Imagem de destaque"
          onChange={async (event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (!file) return
            const url = await onUpload(file)
            onChange({ featureImage: url })
          }}
        />
        {draft.featureImage && (
          <button type="button" className="blog-text-btn" onClick={() => onChange({ featureImage: '' })}>Remover imagem</button>
        )}
        <input aria-label="Texto alternativo da imagem" placeholder="Texto alternativo" value={draft.featureImageAlt} onChange={(event) => onChange({ featureImageAlt: event.target.value })} />
        <input aria-label="Legenda da imagem" placeholder="Legenda" value={draft.featureImageCaption} onChange={(event) => onChange({ featureImageCaption: event.target.value })} />
      </fieldset>
      <details className="blog-seo">
        <summary>SEO e redes</summary>
        <Field label="Título para o Google">
          <input aria-label="Título para o Google" value={draft.metaTitle} maxLength={300} onChange={(event) => onChange({ metaTitle: event.target.value })} />
        </Field>
        <Field label="Descrição para o Google">
          <textarea aria-label="Descrição para o Google" rows={3} maxLength={500} value={draft.metaDescription} onChange={(event) => onChange({ metaDescription: event.target.value })} />
        </Field>
        <Field label="URL canônica">
          <input aria-label="URL canônica" value={draft.canonicalUrl} placeholder="https://" onChange={(event) => onChange({ canonicalUrl: event.target.value })} />
        </Field>
        <Field label="Título Open Graph">
          <input aria-label="Título Open Graph" value={draft.ogTitle} maxLength={300} onChange={(event) => onChange({ ogTitle: event.target.value })} />
        </Field>
        <Field label="Descrição Open Graph">
          <textarea aria-label="Descrição Open Graph" rows={2} maxLength={500} value={draft.ogDescription} onChange={(event) => onChange({ ogDescription: event.target.value })} />
        </Field>
        <Field label="Imagem Open Graph">
          <input aria-label="Imagem Open Graph" value={draft.ogImage} placeholder="https://" onChange={(event) => onChange({ ogImage: event.target.value })} />
        </Field>
        <Field label="Título do Twitter">
          <input aria-label="Título do Twitter" value={draft.twitterTitle} maxLength={300} onChange={(event) => onChange({ twitterTitle: event.target.value })} />
        </Field>
        <Field label="Descrição do Twitter">
          <textarea aria-label="Descrição do Twitter" rows={2} maxLength={500} value={draft.twitterDescription} onChange={(event) => onChange({ twitterDescription: event.target.value })} />
        </Field>
        <Field label="Imagem do Twitter">
          <input aria-label="Imagem do Twitter" value={draft.twitterImage} placeholder="https://" onChange={(event) => onChange({ twitterImage: event.target.value })} />
        </Field>
      </details>
    </aside>
  )
}

function toLocal(iso: string) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
