import { useState } from 'react'
import { Archive, CalendarClock, FileText, Folder, FolderPlus, Inbox, Pencil, PenLine, Send, ShieldAlert, Trash, Trash2 } from 'lucide-react'
import type { MailFolder } from '@/services/mailbox.service'
import { folderLabel } from './format'

const ICONS = {
  inbox: Inbox,
  sent: Send,
  drafts: FileText,
  trash: Trash2,
  spam: ShieldAlert,
  archive: Archive,
}

export const DRAG_TYPE = 'application/x-redecoop-mail'

function parentPath(path: string, delimiter: string) {
  const index = path.lastIndexOf(delimiter)
  return index > 0 ? path.slice(0, index) : null
}

function folderTree(folders: MailFolder[]) {
  const inbox = folders.find((folder) => folder.specialUse === 'inbox')
  const delimiter = inbox && folders.some((folder) => folder.path.startsWith(`${inbox.path}.`))
    ? '.'
    : inbox && folders.some((folder) => folder.path.startsWith(`${inbox.path}/`))
      ? '/'
      : '.'
  const byPath = new Set(folders.map((folder) => folder.path))
  const children = new Map<string, MailFolder[]>()
  const roots: MailFolder[] = []
  for (const folder of folders) {
    const parent = folder.specialUse === 'other' ? parentPath(folder.path, delimiter) : null
    const attach = parent && byPath.has(parent) ? parent : folder.specialUse === 'other' ? inbox?.path : null
    if (attach && attach !== folder.path) {
      const list = children.get(attach) ?? []
      list.push(folder)
      children.set(attach, list)
      continue
    }
    roots.push(folder)
  }
  const ordered: Array<{ folder: MailFolder; depth: number }> = []
  const walk = (folder: MailFolder, depth: number) => {
    ordered.push({ folder, depth })
    const nested = (children.get(folder.path) ?? []).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    for (const child of nested) walk(child, depth + 1)
  }
  for (const root of roots) walk(root, 0)
  return ordered
}

interface MailboxFoldersProps {
  folders: MailFolder[]
  current?: string
  scheduledView: boolean
  scheduled: number
  onSelect: (folder: MailFolder) => void
  onScheduled: () => void
  onDropMessages: (uids: number[], from: string, target: string) => void
  onCreate: () => void
  onRename: (folder: MailFolder) => void
  onDelete: (folder: MailFolder) => void
  onEmpty: (folder: MailFolder) => void
  onCompose: () => void
  composeDisabled: boolean
}

export function MailboxFolders(props: MailboxFoldersProps) {
  const { folders, current } = props
  const [over, setOver] = useState<string | null>(null)
  const sorted = folderTree(folders.filter((folder) => folder.selectable))

  return (
    <nav className="mailbox-folders" aria-label="Pastas">
      <button type="button" className="mailbox-compose" onClick={props.onCompose} disabled={props.composeDisabled}>
        <PenLine size={16} /> Escrever
      </button>
      {sorted.map(({ folder, depth }) => {
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
              className={`mailbox-folder ${active ? 'mailbox-folder--active' : ''} ${depth > 0 ? 'mailbox-folder--nested' : ''}`}
              style={depth > 0 ? { paddingLeft: `${0.7 + depth * 0.85}rem` } : undefined}
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
    </nav>
  )
}
