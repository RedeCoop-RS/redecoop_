import { useEffect } from 'react'
import { Keyboard, Loader2, PenLine, RefreshCw, Search, Settings, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { MailboxComposer } from '@/components/mailbox/MailboxComposer'
import { MailboxFolders } from '@/components/mailbox/MailboxFolders'
import { MailboxList } from '@/components/mailbox/MailboxList'
import { MailboxReader } from '@/components/mailbox/MailboxReader'
import { MailboxSettings } from '@/components/mailbox/MailboxSettings'
import { folderLabel } from '@/components/mailbox/format'
import { useMailbox } from '@/components/mailbox/useMailbox'
import type { MailListItem } from '@/services/mailbox.service'

export function MailboxPage() {
  const mail = useMailbox()

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      const typing = Boolean(target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable))
      if (event.key === 'Escape') {
        if (mail.preview) mail.closePreview()
        else if (mail.composer) mail.closeComposer()
        else if (mail.settingsOpen && mail.account?.configured) mail.setSettingsOpen(false)
        else if (mail.pane === 'read') mail.setPane('list')
        return
      }
      if (typing || mail.composer || mail.settingsOpen) return
      const key = event.key.toLowerCase()
      if (key === 'c') mail.compose()
      else if (key === 'r') mail.reply(false)
      else if (key === 'a') mail.reply(true)
      else if (key === 'f') mail.forward()
      else if (key === 'e') void mail.archive()
      else if (key === 's') void mail.star(!mail.message?.flagged)
      else if (key === 'u') void mail.markSeen(false)
      else if (key === '#' || event.key === 'Delete') void mail.remove()
      else if (key === 'j') mail.moveCursor(1)
      else if (key === 'k') mail.moveCursor(-1)
      else if (event.key === '/') {
        event.preventDefault()
        mail.focusSearch()
      } else if (event.key === '?') mail.setShortcutsOpen(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mail])

  function openThread(path: string, uid: number) {
    const target = mail.folders.find((folder) => folder.path === path)
    const item = { uid } as MailListItem
    if (target && target.path !== mail.folder?.path) {
      void mail.openFolder(target).then(() => mail.openMessage(item, false, target))
      return
    }
    void mail.openMessage(item, false, mail.folder)
  }

  return (
    <div className="mailbox">
      <header className="mailbox-toolbar">
        <div>
          <p className="page-kicker">Super administrador</p>
          <h1>E-mail {mail.folder ? `· ${folderLabel(mail.folder)}` : ''}</h1>
        </div>
        <div className="mailbox-toolbar__actions">
          <label className="mailbox-search">
            <Search size={16} />
            <input id="mailbox-search" value={mail.search} onChange={(event) => mail.setSearch(event.target.value)} placeholder="Buscar por assunto, remetente ou texto" />
          </label>
          <Button type="button" variant="outline" onClick={() => mail.folder && void mail.openFolder(mail.folder)} disabled={mail.syncing}>
            {mail.syncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Atualizar
          </Button>
          <Button type="button" onClick={mail.compose} disabled={!mail.account?.configured}>
            <PenLine size={16} /> Escrever
          </Button>
          <button type="button" className="mailbox-icon-btn" aria-label="Configurar conta" onClick={() => mail.setSettingsOpen(true)}>
            <Settings size={18} />
          </button>
          <button type="button" className="mailbox-icon-btn" aria-label="Atalhos de teclado" onClick={() => mail.setShortcutsOpen(true)}>
            <Keyboard size={18} />
          </button>
        </div>
        <div className="mailbox-filters">
          <button type="button" className={mail.unreadOnly ? 'is-on' : ''} onClick={() => mail.setUnreadOnly(!mail.unreadOnly)}>Não lidas</button>
          <button type="button" className={mail.starredOnly ? 'is-on' : ''} onClick={() => mail.setStarredOnly(!mail.starredOnly)}>Com estrela</button>
          <button type="button" className={mail.withAttachments ? 'is-on' : ''} onClick={() => mail.setWithAttachments(!mail.withAttachments)}>Com anexo</button>
          <select value={mail.sort} onChange={(event) => mail.setSort(event.target.value as typeof mail.sort)} aria-label="Ordenação">
            <option value="date_desc">Mais recentes</option>
            <option value="date_asc">Mais antigas</option>
            <option value="subject">Assunto</option>
            <option value="from">Remetente</option>
          </select>
          {mail.selected.length > 0 && <span>{mail.selected.length} selecionada(s)</span>}
        </div>
      </header>

      {mail.loading ? (
        <p className="mailbox-empty">Carregando a caixa…</p>
      ) : (
        <div className="mailbox-body" data-pane={mail.composer ? 'read' : mail.pane}>
          <MailboxFolders
            folders={mail.folders}
            current={mail.folder?.path}
            drafts={mail.drafts.length}
            onSelect={(folder) => void mail.openFolder(folder)}
          />
          <MailboxList
            messages={mail.messages}
            drafts={mail.drafts}
            total={mail.total}
            page={mail.page}
            loading={mail.listLoading}
            activeUid={mail.message?.uid}
            selected={mail.selected}
            onOpen={(item) => void mail.openMessage(item)}
            onToggle={mail.toggleSelected}
            onStar={(item) => void mail.toggleStar(item)}
            onPage={mail.changePage}
            onDraft={mail.editDraft}
            onLoadOlder={() => void mail.loadMore()}
          />
          {mail.composer ? (
            <MailboxComposer
              composer={mail.composer}
              onChange={mail.updateComposer}
              onClose={mail.closeComposer}
              onSend={() => void mail.send()}
              onDiscard={() => void mail.discardDraft()}
              onFiles={(files) => void mail.addFiles(files)}
              onRemoveFile={(id) => void mail.removeAttachment(id)}
            />
          ) : (
            <MailboxReader
              message={mail.message}
              reading={mail.reading}
              folders={mail.folders}
              onBack={() => mail.setPane('list')}
              onReply={mail.reply}
              onForward={mail.forward}
              onArchive={() => void mail.archive()}
              onSpam={() => void mail.spam()}
              onDelete={() => void mail.remove()}
              onRestore={() => void mail.restore()}
              onStar={() => void mail.star(!mail.message?.flagged)}
              onUnread={() => void mail.markSeen(false)}
              onMove={(target) => void mail.move(target)}
              onLoadImages={() => mail.message && void mail.openMessage(mail.message, true)}
              onOpenThread={openThread}
              onAttachment={(index, filename, type, preview) => void mail.openAttachment(index, filename, type, preview)}
            />
          )}
        </div>
      )}

      {mail.settingsOpen && (
        <div className="mailbox-sheet">
          <MailboxSettings
            account={mail.account}
            onClose={mail.account?.configured ? () => mail.setSettingsOpen(false) : undefined}
            onSaved={(account) => void mail.savedAccount(account)}
          />
        </div>
      )}

      {mail.shortcutsOpen && (
        <div className="mailbox-modal" role="dialog" aria-label="Atalhos de teclado">
          <button type="button" className="mailbox-icon-btn" onClick={() => mail.setShortcutsOpen(false)} aria-label="Fechar"><X size={18} /></button>
          <h2>Atalhos</h2>
          <ul>
            <li><kbd>C</kbd> escrever</li>
            <li><kbd>R</kbd> responder</li>
            <li><kbd>A</kbd> responder a todos</li>
            <li><kbd>F</kbd> encaminhar</li>
            <li><kbd>E</kbd> arquivar</li>
            <li><kbd>S</kbd> estrela</li>
            <li><kbd>U</kbd> não lida</li>
            <li><kbd>#</kbd> excluir</li>
            <li><kbd>J</kbd> / <kbd>K</kbd> próxima / anterior</li>
            <li><kbd>/</kbd> buscar</li>
            <li><kbd>Esc</kbd> voltar</li>
          </ul>
        </div>
      )}

      {mail.preview && (
        <div className="mailbox-modal mailbox-modal--preview" role="dialog" aria-label="Pré-visualização">
          <button type="button" className="mailbox-icon-btn" onClick={mail.closePreview} aria-label="Fechar"><X size={18} /></button>
          {mail.preview.type.startsWith('image/') ? (
            <img src={mail.preview.url} alt={mail.preview.name} />
          ) : (
            <iframe title={mail.preview.name} src={mail.preview.url} />
          )}
        </div>
      )}
    </div>
  )
}
