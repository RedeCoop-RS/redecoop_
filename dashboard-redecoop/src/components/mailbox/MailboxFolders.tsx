import { Archive, FileText, Inbox, Send, ShieldAlert, Trash2 } from 'lucide-react'
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

interface MailboxFoldersProps {
  folders: MailFolder[]
  current?: string
  drafts: number
  onSelect: (folder: MailFolder) => void
}

export function MailboxFolders({ folders, current, drafts, onSelect }: MailboxFoldersProps) {
  return (
    <nav className="mailbox-folders" aria-label="Pastas">
      {folders.filter((folder) => folder.selectable).map((folder) => {
        const Icon = ICONS[folder.specialUse as keyof typeof ICONS] || FileText
        const active = folder.path === current
        return (
          <button
            key={folder.path}
            type="button"
            className={`mailbox-folder ${active ? 'mailbox-folder--active' : ''}`}
            onClick={() => onSelect(folder)}
          >
            <Icon size={16} />
            <span>{folderLabel(folder)}</span>
            {folder.unreadCount > 0 && <em>{folder.unreadCount > 99 ? '99+' : folder.unreadCount}</em>}
          </button>
        )
      })}
      {drafts > 0 && <p className="mailbox-folder-note">{drafts} rascunho{drafts > 1 ? 's' : ''} local{drafts > 1 ? 'is' : ''}</p>}
    </nav>
  )
}
