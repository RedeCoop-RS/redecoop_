import { BlogEditor } from '@/components/blog/BlogEditor'
import { BlogList } from '@/components/blog/BlogList'
import { BlogMeta } from '@/components/blog/BlogMeta'
import { BlogPreview } from '@/components/blog/BlogPreview'
import { BlogSettings } from '@/components/blog/BlogSettings'
import { BlogTags } from '@/components/blog/BlogTags'
import { useBlog } from '@/components/blog/useBlog'
import { STATUS_LABEL } from '@/services/blog.service'

export function BlogPage() {
  const blog = useBlog()
  const draft = blog.draft
  const connected = blog.connection?.connected
  const minutes = draft ? blog.readingMinutes(draft.wordCount) : 0

  return (
    <div className="blog">
      <header className="blog-toolbar-page">
        <div>
          <h1>Blog</h1>
          <p className={connected ? 'blog-conn blog-conn--ok' : 'blog-conn'}>
            {connected ? `Conectado · ${blog.connection?.site?.title || 'Ghost'}` : blog.connection?.error || 'Sem conexão'}
          </p>
        </div>
        <div className="blog-toolbar-page__actions">
          <button type="button" className={blog.filters.resource === 'post' ? 'is-on' : ''} onClick={() => { blog.setDraft(null); blog.patchFilters({ resource: 'post' }) }}>Posts</button>
          <button type="button" className={blog.filters.resource === 'page' ? 'is-on' : ''} onClick={() => { blog.setDraft(null); blog.patchFilters({ resource: 'page' }) }}>Páginas</button>
          <button type="button" className="blog-btn blog-btn--primary" onClick={() => blog.createNew('post')}>Novo post</button>
          <button type="button" className="blog-btn" onClick={() => blog.createNew('page')}>Nova página</button>
          <button type="button" className="blog-btn" onClick={() => blog.setTagsOpen(true)}>Tags</button>
          <button type="button" className="blog-btn" onClick={() => blog.setSettingsOpen(true)}>Conexão</button>
        </div>
      </header>

      {blog.settingsOpen && (
        <BlogSettings connection={blog.connection} onClose={() => blog.setSettingsOpen(false)} onSaved={() => void blog.reload()} />
      )}
      {blog.tagsOpen && (
        <BlogTags tags={blog.tags} onClose={() => blog.setTagsOpen(false)} onChanged={() => void blog.refreshTags()} />
      )}

      {!draft && !blog.settingsOpen && (
        <BlogList
          resource={blog.filters.resource}
          items={blog.items}
          loading={blog.loading}
          total={blog.total}
          page={blog.filters.page}
          totalPages={blog.totalPages}
          tags={blog.tags}
          authors={blog.authors}
          status={blog.filters.status}
          tag={blog.filters.tag}
          author={blog.filters.author}
          order={blog.filters.order}
          search={blog.searchInput}
          selected={blog.selected}
          onSearch={blog.setSearchInput}
          onFilter={blog.patchFilters}
          onSelect={blog.setSelected}
          onOpen={(id) => void blog.openItem(id)}
          onAction={(item, action) => void blog.rowAction(item, action)}
          onBulk={(action) => void blog.bulk(action)}
        />
      )}

      {draft && (
        <section className="blog-write" aria-label={draft.resource === 'page' ? 'Editor de página' : 'Editor de post'}>
          <div className="blog-write__bar">
            <button type="button" onClick={() => { blog.setDraft(null); void blog.reload() }}>Voltar</button>
            <span className={`blog-status blog-status--${draft.status}`}>{STATUS_LABEL[draft.status]}</span>
            <span className="blog-save-state">
              {draft.conflict ? 'Conflito de versão' : blog.saveState === 'saving' ? 'Salvando…' : blog.saveState === 'saved' && !draft.dirty ? 'Salvo' : draft.dirty ? 'Alterações locais' : 'Sem alterações'}
            </span>
            <span className="blog-count">{draft.wordCount} {draft.wordCount === 1 ? 'palavra' : 'palavras'} · {minutes} min de leitura</span>
            <div className="blog-write__actions">
              <button type="button" onClick={() => blog.setPreviewOpen(true)}>Pré-visualizar</button>
              <button type="button" onClick={() => void blog.save()}>Salvar rascunho</button>
              <button type="button" className="blog-btn blog-btn--primary" onClick={() => void blog.publish()}>
                {draft.publishedAt && new Date(draft.publishedAt).getTime() > Date.now() + 30_000 ? 'Agendar' : 'Subir'}
              </button>
              {draft.status !== 'draft' && <button type="button" onClick={() => void blog.unpublish()}>Derrubar</button>}
              <button type="button" onClick={() => void blog.duplicate()}>Duplicar</button>
              <button type="button" className="blog-btn blog-btn--danger" onClick={() => blog.setConfirmDelete(true)}>Excluir</button>
            </div>
          </div>
          {draft.conflict && (
            <p className="blog-note blog-note--bad">
              Este conteúdo foi alterado em outro lugar.
              <button type="button" onClick={() => void blog.reloadConflict()}>Recarregar</button>
            </p>
          )}
          <div className="blog-write__grid">
            <div>
              <input
                className="blog-title"
                aria-label="Título"
                placeholder="Título"
                value={draft.title}
                onChange={(event) => blog.updateDraft({ title: event.target.value })}
              />
              <BlogEditor
                documentKey={draft.localKey}
                html={draft.html}
                onChange={(html) => blog.updateDraft({ html })}
                onStats={(wordCount) => blog.setDraft((current) => current ? { ...current, wordCount, readingTime: blog.readingMinutes(wordCount) } : current)}
                onUpload={blog.upload}
              />
            </div>
            <BlogMeta draft={draft} tags={blog.tags} authors={blog.authors} onChange={blog.updateDraft} onUpload={blog.upload} />
          </div>
          {blog.previewOpen && <BlogPreview draft={draft} onClose={() => blog.setPreviewOpen(false)} />}
          {blog.confirmDelete && (
            <div className="blog-dialog" role="dialog" aria-label="Confirmar exclusão">
              <p>Excluir este conteúdo no Ghost? Essa ação não pode ser desfeita.</p>
              <button type="button" className="blog-btn blog-btn--danger" onClick={() => void blog.removeCurrent()}>Confirmar exclusão</button>
              <button type="button" onClick={() => blog.setConfirmDelete(false)}>Cancelar</button>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
