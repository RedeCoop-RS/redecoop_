import type { BlogDraft } from '@/services/blog.service'

export function BlogPreview({ draft, onClose }: { draft: BlogDraft; onClose: () => void }) {
  const doc = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>
    body{font-family:Georgia,serif;color:#1a1a2e;margin:0;padding:1.25rem;line-height:1.6}
    img,iframe{max-width:100%;height:auto} table{border-collapse:collapse;width:100%}
    td,th{border:1px solid #ddd;padding:.4rem} blockquote{border-left:3px solid #009640;margin-left:0;padding-left:.8rem;color:#3f4a45}
    pre{background:#f4f7f5;padding:.8rem;overflow:auto} .kg-callout-card{display:flex;gap:.6rem;background:#f3f6f4;border-radius:12px;padding:.8rem}
    h1{font-family:Inter,system-ui,sans-serif}
  </style></head><body><h1>${escapeHtml(draft.title || 'Sem título')}</h1>${draft.customExcerpt ? `<p><em>${escapeHtml(draft.customExcerpt)}</em></p>` : ''}${draft.html}</body></html>`
  return (
    <section className="blog-preview" role="dialog" aria-label="Pré-visualização">
      <header className="blog-panel__bar">
        <h2>Pré-visualização</h2>
        <button type="button" onClick={onClose}>Fechar pré-visualização</button>
      </header>
      <iframe title="Pré-visualização" sandbox="" srcDoc={doc} />
    </section>
  )
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char))
}
