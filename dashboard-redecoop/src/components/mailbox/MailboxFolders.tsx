import { useState } from 'react'
import { Archive, CalendarClock, FileText, Folder, FolderPlus, Inbox, Pencil, Send, ShieldAlert, Trash, Trash2 } from 'lucide-react'
import type { MailFolder } from '@/services/mailbox.service'
import { folderLabel, formatBytes } from './format'

const ICONS = {
  inbox: Inbox,
  sent: Send,
  drafts: FileText,
  trash: Trash2,
  spam: ShieldAlert,
  archive: Archive,
}

export const DRAG_TYPE = 'application/x-redecoop-mail'

interface MailboxFoldersProps {
  folders: MailFolder[]
  current?: string
  scheduledView: boolean
  drafts: number
  scheduled: number
  quota: { usage: number; limit: number } | null
  onSelect: (folder: MailFolder) => void
  onScheduled: () => void
  onDropMessages: (uids: number[], from: string, target: string) => void
  onCreate: () => void
  onRename: (folder: MailFolder) => void
  onDelete: (folder: MailFolder) => void
  onEmpty: (folder: MailFolder) => void
}

export function MailboxFolders(props: MailboxFoldersProps) {
  const { folders, current } = props
  const [over, setOver] = useState<string | null>(null)
  const sorted = folders.filter((folder) => folder.selectable)
  const usage = props.quota ? Math.min(100, Math.round((props.quota.usage / props.quota.limit) * 100)) : 0

  return (
    <nav className="mailbox-folders" aria-label="Pastas">
      {sorted.map((folder) => {
        const Icon = ICONS[folder.specialUse as keyof typeof ICONS] || Folder
        const active = !props.scheduledView && folder.path === current
        const custom = folder.specialUse === 'other' && folder.path.toUpperCase() !== 'INBOX'
        const emptiable = folder.specialUse === 'trash' || folder.specialUse === 'spam'
        return (
          <div
            key={folder.path}
            className={`mailbox-folder-row ${over === folder.path ? 'is-drop' : ''}`}
            onDragOver={(event) => {
              if (!event.dataTransfer.types.includes(DRAG_TYPE) || folder.path === current) return
              event.preventDefault()
              event.dataTransfer.dropEffect = 'move'
              setOver(folder.path)
            }}
            onDragLeave={() => setOver((value) => (value === folder.path ? null : value))}
            onDrop={(event) => {
              setOver(null)
              const raw = event.dataTransfer.getData(DRAG_TYPE)
              if (!raw) return
              event.preventDefault()
              try {
                const data = JSON.parse(raw) as { folder: string; uids: number[] }
                props.onDropMessages(data.uids, data.folder, folder.path)
              } catch {
                // Arrasto de outra origem: ignorado.
              }
            }}
          >
            <button
              type="button"
              className={`mailbox-folder ${active ? 'mailbox-folder--active' : ''}`}
              onClick={() => props.onSelect(folder)}
              data-folder={folder.path}
              title={folder.totalCount ? `${folder.totalCount} mensagens` : undefined}
            >
              <Icon size={16} />
              <span>{folderLabel(folder)}</span>
              {folder.unreadCount > 0 && <em aria-label={`${folder.unreadCount} não lidas`}>{folder.unreadCount > 99 ? '99+' : folder.unreadCount}</em>}
            </button>
            {(custom || emptiable) && (
              <span className="mailbox-folder-actions">
                {custom && (
                  <>
                    <button type="button" aria-label={`Renomear pasta ${folder.name}`} onClick={() => props.onRename(folder)}><Pencil size={13} /></button>
                    <button type="button" aria-label={`Excluir pasta ${folder.name}`} onClick={() => props.onDelete(folder)}><Trash size={13} /></button>
                  </>
                )}
                {emptiable && folder.totalCount > 0 && (
                  <button type="button" aria-label={`Esvaziar ${folderLabel(folder)}`} title="Esvaziar" onClick={() => props.onEmpty(folder)}><Trash size={13} /></button>
                )}
              </span>
            )}
          </div>
        )
      })}
      <button
        type="button"
        className={`mailbox-folder ${props.scheduledView ? 'mailbox-folder--active' : ''}`}
        onClick={props.onScheduled}
      >
        <CalendarClock size={16} />
        <span>Agendados</span>
        {props.scheduled > 0 && <em>{props.scheduled}</em>}
      </button>
      <button type="button" className="mailbox-folder mailbox-folder--new" onClick={props.onCreate}>
        <FolderPlus size={16} />
        <span>Nova pasta</span>
      </button>
      {props.drafts > 0 && <p className="mailbox-folder-note">{props.drafts} rascunho{props.drafts > 1 ? 's' : ''} local{props.drafts > 1 ? 'is' : ''}</p>}
      {props.quota && (
        <div className="mailbox-quota" aria-label="Espaço usado">
          <div className="mailbox-quota__bar"><span style={{ width: `${usage}%` }} className={usage >= 90 ? 'is-full' : ''} /></div>
          <small>{formatBytes(props.quota.usage)} de {formatBytes(props.quota.limit)} ({usage}%)</small>
        </div>
      )}
    </nav>
  )
}
