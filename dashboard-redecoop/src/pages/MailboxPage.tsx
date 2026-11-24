import { useEffect, useState } from 'react'
import { CheckCheck, Flag, Inbox, Loader2, Mail, MailOpen, RefreshCw, Search, ShieldAlert, SlidersHorizontal, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { MailboxComposer } from '@/components/mailbox/MailboxComposer'
import { MailboxFolders } from '@/components/mailbox/MailboxFolders'
import { MailboxDraftList, MailboxList, MailboxScheduledList } from '@/components/mailbox/MailboxList'
import { MailboxReader } from '@/components/mailbox/MailboxReader'
import { MailboxSettings } from '@/components/mailbox/MailboxSettings'
import { folderLabel } from '@/components/mailbox/format'
import { useMailbox } from '@/components/mailbox/useMailbox'
import type { MailListItem } from '@/services/mailbox.service'

const SHORTCUTS: Array<[string, string]> = [
  ['C', 'escrever'],
  ['R', 'responder'],
  ['A', 'responder a todos'],
  ['F', 'encaminhar'],
  ['S', 'sinalizar'],
  ['U', 'marcar como não lida'],
  ['Shift + I', 'marcar como lida'],
  ['!', 'spam'],
  ['#', 'excluir'],
  ['X', 'selecionar a mensagem aberta'],
  ['Shift + A', 'selecionar todas'],
  ['J / K', 'próxima / anterior'],
  ['/', 'buscar'],
  ['Ctrl + Enter', 'enviar (no editor)'],
  ['Esc', 'fechar / voltar'],
  ['?', 'esta ajuda'],
]

function UndoBanner({ sendAt, subject, onUndo }: { sendAt: number; subject: string; onUndo: () => void }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [])
  const left = Math.max(0, Math.ceil((sendAt - now) / 1000))
  return (
    <div className="mailbox-undo" role="status" aria-live="polite">
      <span>{left > 0 ? `Enviando “${subject}” em ${left}s…` : `Enviando “${subject}”…`}</span>
      {left > 0 && <button type="button" onClick={onUndo}>Desfazer</button>}
    </div>
  )
}

export function MailboxPage() {
  const mail = useMailbox()

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      const textInput = target instanceof HTMLInputElement && !['checkbox', 'radio', 'button', 'submit'].includes(target.type)
      const typing = Boolean(target && (textInput || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable))
      if (event.key === 'Escape') {
        if (mail.preview) mail.closePreview()
        else if (mail.source) mail.closeSource()
        else if (mail.folderDialog) mail.setFolderDialog(null)
        else if (mail.shortcutsOpen) mail.setShortcutsOpen(false)
        else if (mail.composer) mail.closeComposer()
        else if (mail.settingsOpen && mail.account?.configured) mail.setSettingsOpen(false)
        else if (mail.pane === 'read') mail.setPane('list')
        return
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (typing || mail.composer || mail.settingsOpen || mail.folderDialog) return
      const key = event.key
      if (key === 'c') mail.compose()
      else if (key === 'r') mail.reply(false)
      else if (key === 'a') mail.reply(true)
      else if (key === 'A') mail.toggleSelectAll()
      else if (key === 'f') void mail.forward(false)
      else if (key === 's' && mail.message) void mail.toggleStar(mail.message)
      else if (key === 's') void mail.star(true)
      else if (key === 'u') void mail.markSeen(false)
      else if (key === 'I') void mail.markSeen(true)
      else if (key === '!') void mail.spam()
      else if (key === 'x' && mail.message) mail.toggleSelected(mail.message.uid)
      else if (key === '#' || key === 'Delete') void mail.remove()
      else if (key === 'j') mail.moveCursor(1)
      else if (key === 'k') mail.moveCursor(-1)
      else if (key === '/') {
        event.preventDefault()
        mail.focusSearch()
      } else if (key === '?') mail.setShortcutsOpen(true)
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

  const bulk = mail.selected.length > 0
  const special = mail.folder?.specialUse
  const counts = mail.counts

  const filtersOn = mail.unreadOnly || mail.starredOnly || mail.withAttachments || mail.threads

  return (
    <div className="mailbox">
      {mail.loading ? (
        <p className="mailbox-empty">Carregando a caixa…</p>
      ) : (
        <div className="mailbox-body" data-pane={mail.composer ? 'read' : mail.pane} data-side={mail.composer || mail.reading || (mail.pane === 'read' && mail.message) ? 'open' : 'closed'}>
          <MailboxFolders
            folders={mail.folders}
            current={mail.folder?.path}
            scheduledView={mail.view === 'scheduled'}
            scheduled={mail.scheduledDrafts.length}
            onSelect={(folder) => void mail.openFolder(folder)}
            onScheduled={mail.openScheduled}
            onDropMessages={(uids, from, target) => {
              const source = mail.folders.find((folder) => folder.path === from) || mail.folder
              void mail.moveUids(uids, target, source)
            }}
            onCreate={() => mail.setFolderDialog({
              mode: 'create',
              value: '',
              parent: mail.folders.find((folder) => folder.specialUse === 'inbox')?.path,
            })}
            onRename={(folder) => mail.setFolderDialog({ mode: 'rename', folder, value: folder.name })}
            onDelete={(folder) => void mail.deleteFolder(folder)}
            onEmpty={(folder) => void mail.emptyFolder(folder)}
            onCompose={mail.compose}
            composeDisabled={!mail.account?.configured}
          />
          <div className="mailbox-stage">
          {mail.view === 'folder' && (
            bulk ? (
              <div className="mailbox-bulk" role="toolbar" aria-label="Ações em lote">
                <strong>{mail.selected.length}</strong>
                <button type="button" onClick={() => void mail.markSeen(true)}><MailOpen size={15} /> Lidas</button>
                <button type="button" onClick={() => void mail.markSeen(false)}><Mail size={15} /> Não lidas</button>
                <button type="button" onClick={() => void mail.star(true)}><Flag size={15} /> Sinalizar</button>
                {special === 'spam' ? (
                  <button type="button" onClick={() => void mail.notSpam()}><Inbox size={15} /> Não é spam</button>
                ) : (
                  mail.folders.some((folder) => folder.specialUse === 'spam') && <button type="button" onClick={() => void mail.spam()}><ShieldAlert size={15} /> Spam</button>
                )}
                {special === 'trash' && <button type="button" onClick={() => void mail.restore()}>Restaurar</button>}
                <button type="button" onClick={() => void mail.remove()}><Trash2 size={15} /> Excluir</button>
                <select defaultValue="" aria-label="Mover selecionadas" onChange={(event) => { if (event.target.value) void mail.move(event.target.value); event.target.value = '' }}>
                  <option value="">Mover…</option>
                  {mail.folders.filter((folder) => folder.selectable && folder.path !== mail.folder?.path).map((folder) => (
                    <option key={folder.path} value={folder.path}>{folderLabel(folder)}</option>
                  ))}
                </select>
                <button type="button" onClick={() => mail.setSelected([])} aria-label="Limpar seleção"><X size={15} /></button>
              </div>
            ) : (
              <div className="mailbox-listbar">
                <details className={`mailbox-filter ${filtersOn ? 'is-on' : ''}`}>
                  <summary aria-label="Filtros"><SlidersHorizontal size={15} /></summary>
                  <div>
                    <button type="button" className={mail.unreadOnly ? 'is-on' : ''} aria-pressed={mail.unreadOnly} onClick={() => mail.setUnreadOnly(!mail.unreadOnly)}>Não lidas <b>{counts.unread}</b></button>
                    <button type="button" className={mail.starredOnly ? 'is-on' : ''} aria-pressed={mail.starredOnly} onClick={() => mail.setStarredOnly(!mail.starredOnly)}>Sinalizadas <b>{counts.starred}</b></button>
                    <button type="button" className={mail.withAttachments ? 'is-on' : ''} aria-pressed={mail.withAttachments} onClick={() => mail.setWithAttachments(!mail.withAttachments)}>Com anexo <b>{counts.attachments}</b></button>
                    <label className="mailbox-check">
                      <input type="checkbox" checked={mail.threads} onChange={(event) => mail.setThreads(event.target.checked)} />
                      Agrupar conversas
                    </label>
                    {counts.unread > 0 && (
                      <button type="button" onClick={() => void mail.readAll()}><CheckCheck size={14} /> Marcar tudo como lido</button>
                    )}
                  </div>
                </details>
                <select className="mailbox-sort" value={mail.sort} onChange={(event) => mail.setSort(event.target.value as typeof mail.sort)} aria-label="Ordenação">
                  <option value="date_desc">Recentes</option>
                  <option value="date_asc">Antigas</option>
                  <option value="subject">Assunto</option>
                  <option value="from">Remetente</option>
                </select>
                <label className="mailbox-search">
                  <Search size={15} />
                  <input id="mailbox-search" value={mail.search} onChange={(event) => mail.setSearch(event.target.value)} placeholder="Buscar" aria-label="Buscar e-mails" />
                </label>
                <button type="button" className="mailbox-refresh" onClick={() => void mail.refreshNow()} disabled={mail.syncing} title="Atualizar agora. A lista também atualiza sozinha a cada 5 minutos.">
                  {mail.syncing ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                  <span>{mail.syncing ? 'Atualizando' : `${Math.floor(mail.refreshIn / 60)}:${String(mail.refreshIn % 60).padStart(2, '0')}`}</span>
                </button>
              </div>
            )
          )}
          {mail.view === 'scheduled' ? (
            <MailboxScheduledList drafts={mail.scheduledDrafts} onOpen={mail.editDraft} onCancel={(draft) => void mail.cancelSchedule(draft)} />
          ) : mail.view === 'drafts' ? (
            <MailboxDraftList drafts={mail.drafts} onOpen={mail.editDraft} onDelete={(draft) => void mail.deleteLocalDraft(draft)} />
          ) : (
            <MailboxList
              folderPath={mail.folder?.path}
              messages={mail.messages}
              drafts={mail.drafts}
              total={mail.total}
              page={mail.page}
              loading={mail.listLoading}
              activeUid={mail.message?.uid}
              selected={mail.selected}
              threads={mail.threads}
              onOpen={(item) => void mail.openMessage(item)}
              onToggle={mail.toggleSelected}
              onToggleAll={mail.toggleSelectAll}
              onStar={(item) => void mail.toggleStar(item)}
              onSeen={(item, seen) => void mail.markOneSeen(item, seen)}
              onForward={(item) => void mail.forwardOne(item)}
              onDelete={(item) => void mail.removeOne(item)}
              onOpenDrafts={mail.openDrafts}
              emptyHint={mail.unreadOnly ? 'Nenhuma mensagem não lida nesta pasta.' : mail.starredOnly ? 'Nenhuma mensagem sinalizada nesta pasta.' : undefined}
              onPage={mail.changePage}
              onDraft={mail.editDraft}
              onLoadOlder={() => void mail.loadMore()}
            />
          )}
          </div>
          {mail.composer ? (
            <MailboxComposer
              composer={mail.composer}
              signatures={mail.account?.signatures || []}
              onChange={mail.updateComposer}
              onClose={mail.closeComposer}
              onSend={(sendAt) => void mail.send(sendAt)}
              onDiscard={() => void mail.discardDraft()}
              onFiles={(files) => void mail.addFiles(files)}
              onRemoveFile={(id) => void mail.removeAttachment(id)}
            />
          ) : mail.reading || (mail.pane === 'read' && mail.message) ? (
            <MailboxReader
              message={mail.message}
              reading={mail.reading}
              folders={mail.folders}
              onBack={() => mail.setPane('list')}
              onReply={mail.reply}
              onForward={(asAttachment) => void mail.forward(asAttachment)}
              onSpam={() => void mail.spam()}
              onNotSpam={() => void mail.notSpam()}
              onDelete={() => void mail.remove()}
              onRestore={() => void mail.restore()}
              onStar={() => mail.message && void mail.toggleStar(mail.message)}
              onUnread={() => void mail.markSeen(false)}
              onRead={() => void mail.markSeen(true)}
              onMove={(target) => void mail.move(target)}
              onLoadImages={() => mail.message && void mail.openMessage(mail.message, true)}
              onOpenThread={openThread}
              onAttachment={(index, filename, type, preview) => void mail.openAttachment(index, filename, type, preview)}
              onPrint={mail.print}
              onSource={() => void mail.viewSource()}
              onUnsubscribe={mail.unsubscribe}
              onReceipt={(send) => void mail.receipt(send)}
            />
          ) : null}
        </div>
      )}

      {mail.pending && <UndoBanner sendAt={mail.pending.sendAt} subject={mail.pending.subject} onUndo={() => void mail.undoSend()} />}

      {mail.settingsOpen && (
        <div className="mailbox-backdrop">
          <div className="mailbox-sheet">
            <MailboxSettings
              account={mail.account}
              onClose={mail.account?.configured ? () => mail.setSettingsOpen(false) : undefined}
              onSaved={(account) => void mail.savedAccount(account)}
            />
          </div>
        </div>
      )}

      {mail.folderDialog && (
        <div className="mailbox-backdrop">
        <form
          className="mailbox-modal"
          role="dialog"
          aria-label={mail.folderDialog.mode === 'create' ? 'Nova pasta' : 'Renomear pasta'}
          onSubmit={(event) => {
            event.preventDefault()
            void mail.saveFolderDialog()
          }}
        >
          <button type="button" className="mailbox-icon-btn" onClick={() => mail.setFolderDialog(null)} aria-label="Fechar"><X size={18} /></button>
          <h2>{mail.folderDialog.mode === 'create' ? 'Nova pasta' : `Renomear “${mail.folderDialog.folder?.name}”`}</h2>
          <label className="mailbox-field">
            Nome da pasta
            <input
              autoFocus
              maxLength={120}
              value={mail.folderDialog.value}
              onChange={(event) => mail.setFolderDialog({ ...mail.folderDialog!, value: event.target.value })}
            />
          </label>
          {mail.folderDialog.mode === 'create' && (
            <label className="mailbox-field">
              Dentro de
              <select value={mail.folderDialog.parent || ''} onChange={(event) => mail.setFolderDialog({ ...mail.folderDialog!, parent: event.target.value })}>
                {mail.folders.filter((folder) => folder.specialUse === 'other' || folder.specialUse === 'inbox').map((folder) => (
                  <option key={folder.path} value={folder.path}>{folderLabel(folder)}</option>
                ))}
              </select>
            </label>
          )}
          <div className="mailbox-settings__actions">
            <Button type="submit">{mail.folderDialog.mode === 'create' ? 'Criar' : 'Renomear'}</Button>
            <Button type="button" variant="ghost" onClick={() => mail.setFolderDialog(null)}>Cancelar</Button>
          </div>
        </form>
        </div>
      )}

      {mail.shortcutsOpen && (
        <div className="mailbox-backdrop">
        <div className="mailbox-modal" role="dialog" aria-label="Atalhos de teclado">
          <button type="button" className="mailbox-icon-btn" onClick={() => mail.setShortcutsOpen(false)} aria-label="Fechar"><X size={18} /></button>
          <h2>Atalhos</h2>
          <ul>
            {SHORTCUTS.map(([keys, label]) => <li key={keys}><kbd>{keys}</kbd> {label}</li>)}
          </ul>
        </div>
        </div>
      )}

      {mail.source && (
        <div className="mailbox-backdrop">
        <div className="mailbox-modal mailbox-modal--preview" role="dialog" aria-label="Original da mensagem">
          <button type="button" className="mailbox-icon-btn" onClick={mail.closeSource} aria-label="Fechar"><X size={18} /></button>
          <h2>Original da mensagem</h2>
          <a className="mailbox-link" href={mail.source.url} download={mail.source.filename}>Baixar .eml</a>
          <pre className="mailbox-source">{mail.source.text}</pre>
        </div>
        </div>
      )}

      {mail.preview && (
        <div className="mailbox-backdrop">
        <div className="mailbox-modal mailbox-modal--preview" role="dialog" aria-label="Pré-visualização">
          <button type="button" className="mailbox-icon-btn" onClick={mail.closePreview} aria-label="Fechar"><X size={18} /></button>
          {mail.preview.type.startsWith('image/') ? (
            <img src={mail.preview.url} alt={mail.preview.name} />
          ) : mail.preview.type === 'application/pdf' ? (
            <object data={mail.preview.url} type="application/pdf" aria-label={mail.preview.name}>
              <a href={mail.preview.url} download={mail.preview.name}>Baixar {mail.preview.name}</a>
            </object>
          ) : (
            <iframe title={mail.preview.name} src={mail.preview.url} sandbox="" />
          )}
        </div>
        </div>
      )}
    </div>
  )
}
