import { useState } from 'react'
import toast from 'react-hot-toast'
import { blogErrorMessage, blogService, type BlogConnection } from '@/services/blog.service'

interface BlogSettingsProps {
  connection: BlogConnection | null
  onClose: () => void
  onSaved: () => void
}

export function BlogSettings({ connection, onClose, onSaved }: BlogSettingsProps) {
  const [adminUrl, setAdminUrl] = useState(connection?.adminUrl || '')
  const [apiKey, setApiKey] = useState('')
  const [busy, setBusy] = useState(false)

  async function test() {
    setBusy(true)
    try {
      const result = await blogService.testConnection({ adminUrl, apiKey: apiKey || undefined })
      toast.success(`Conectado a ${result.site.title || 'Ghost'} (${result.site.version || 'versão n/d'}).`)
    } catch (error) {
      toast.error(blogErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  async function save() {
    setBusy(true)
    try {
      await blogService.saveConnection({ adminUrl, apiKey: apiKey || undefined })
      toast.success('Conexão salva.')
      setApiKey('')
      onSaved()
    } catch (error) {
      toast.error(blogErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    setBusy(true)
    try {
      await blogService.deleteConnection()
      toast.success('Conexão salva removida.')
      onSaved()
    } catch (error) {
      toast.error(blogErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="blog-panel" aria-label="Conexão com o Ghost">
      <header className="blog-panel__bar">
        <h2>Conexão com o Ghost</h2>
        {connection?.configured && <button type="button" onClick={onClose}>Fechar</button>}
      </header>
      <div className="blog-panel__body">
        <p>
          No Ghost Admin, abra <strong>Settings → Integrations → Add custom integration</strong>, dê um nome (por exemplo RedeCoop) e copie a <strong>Admin API key</strong>.
          Não use a Content API key. A chave fica cifrada no servidor e nunca volta para o navegador.
        </p>
        {connection?.connected && connection.site && (
          <p className="blog-note">Conectado a {connection.site.title} · {connection.site.url} · Ghost {connection.site.version || '—'}</p>
        )}
        {connection?.error && <p className="blog-note blog-note--bad">{connection.error}</p>}
        {connection?.keyHint && <p className="blog-hint">Chave atual: {connection.keyHint}{connection.usingEnvKey ? ' (variável de ambiente)' : ''}</p>}
        <label className="blog-field">
          <span>URL do Ghost</span>
          <input aria-label="URL do Ghost" value={adminUrl} placeholder="https://blog.seudominio.com" onChange={(event) => setAdminUrl(event.target.value)} />
        </label>
        <label className="blog-field">
          <span>Admin API key</span>
          <input aria-label="Admin API key" value={apiKey} placeholder="id:secret" autoComplete="off" onChange={(event) => setApiKey(event.target.value)} />
        </label>
        <div className="blog-actions">
          <button type="button" className="blog-btn" disabled={busy} onClick={() => void test()}>Testar conexão</button>
          <button type="button" className="blog-btn blog-btn--primary" disabled={busy} onClick={() => void save()}>Salvar conexão</button>
          {connection?.saved && <button type="button" className="blog-btn blog-btn--danger" disabled={busy} onClick={() => void remove()}>Remover conexão salva</button>}
        </div>
      </div>
    </section>
  )
}
