import { ApiError, apiFetchBlob, apiFetchData } from '@/lib/api'

export interface MailAddress {
  name?: string
  address: string
}

export interface MailboxAccountView {
  configured: boolean
  id?: number
  label?: string
  email?: string
  displayName?: string | null
  imapHost?: string
  imapPort?: number
  imapSecure?: boolean
  smtpHost?: string
  smtpPort?: number
  smtpSecure?: boolean
  username?: string
  hasPassword: boolean
  signatureHtml?: string
  signatures?: MailSignature[]
  defaultSignatureId?: string | null
  undoSendSeconds?: number
  syncIntervalSeconds?: number
  lastSyncAt?: string | null
  lastError?: string | null
  unread: number
}

export interface MailSignature {
  id: string
  name: string
  html: string
}

export type MailPriority = 'high' | 'normal' | 'low'

export interface MailCounts {
  total: number
  unread: number
  starred: number
  attachments: number
}

export interface MailContact {
  name?: string | null
  address: string
}

export interface MailFolder {
  id: number
  path: string
  name: string
  specialUse: string
  unreadCount: number
  totalCount: number
  selectable: boolean
}

export interface MailListItem {
  uid: number
  subject: string
  fromName?: string | null
  fromAddress?: string | null
  to: MailAddress[]
  date?: string | null
  snippet?: string | null
  seen: boolean
  flagged: boolean
  answered: boolean
  hasAttachments: boolean
  threadKey: string
  size: number
  priority?: MailPriority
  threadCount?: number
  threadUnread?: number
}

export interface MailAttachment {
  index: number
  filename: string
  contentType: string
  size: number
  contentId?: string
  related?: boolean
}

export interface MailThreadItem {
  uid: number
  folder?: string
  folderName?: string
  subject: string
  fromName?: string | null
  fromAddress?: string | null
  date?: string | null
  seen: boolean
  snippet?: string | null
}

export interface MailMessage extends MailListItem {
  folder: string
  folderName?: string
  specialUse?: string
  from: { name?: string | null; address?: string | null }
  cc: MailAddress[]
  replyTo: MailAddress[]
  messageId?: string | null
  inReplyTo?: string | null
  references?: string | null
  html: string
  text: string
  remoteImageCount: number
  remoteImagesBlocked: boolean
  attachments: MailAttachment[]
  thread: MailThreadItem[]
  listUnsubscribe?: string | null
  receiptRequested?: boolean
  receiptTo?: string | null
}

export interface MailDraftAttachment {
  id: number
  filename: string
  contentType: string
  size: number
  contentId?: string | null
}

export interface MailDraft {
  id: number
  to: string
  cc: string
  bcc: string
  subject: string
  html: string
  mode: string
  sourceFolder?: string | null
  sourceUid?: number | null
  inReplyTo?: string | null
  references?: string | null
  includeSignature: boolean
  signatureId?: string | null
  priority?: MailPriority
  requestReceipt?: boolean
  scheduledAt?: string | null
  sending?: boolean
  scheduleError?: string | null
  updatedAt: string
  attachments: MailDraftAttachment[]
}

export interface MailAuditEntry {
  id: number
  action: string
  recipients: string
  subject: string
  messageId?: string | null
  createdAt: string
}

export interface SaveAccountInput {
  label?: string
  email: string
  displayName?: string
  imapHost: string
  imapPort: number
  imapSecure: boolean
  smtpHost: string
  smtpPort: number
  smtpSecure: boolean
  username: string
  password?: string
  signatureHtml?: string
  signatures?: MailSignature[]
  defaultSignatureId?: string | null
  undoSendSeconds?: number
  syncIntervalSeconds?: number
}

export interface SendMailInput {
  draftId?: number
  to?: string
  cc?: string
  bcc?: string
  subject?: string
  html?: string
  mode?: string
  sourceFolder?: string
  sourceUid?: number
  inReplyTo?: string
  references?: string
  includeSignature?: boolean
  signatureId?: string | null
  priority?: MailPriority
  requestReceipt?: boolean
  delaySeconds?: number
  sendAt?: string
}

export type SendResult =
  | { ok: boolean; scheduled?: false; messageId: string; warning?: string }
  | { ok: boolean; scheduled: true; undoable: boolean; draftId: number; sendAt: string }

export function mailboxErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const data = error.data
    if (data && typeof data === 'object' && 'errors' in data) {
      const errors = (data as { errors?: Record<string, string> }).errors
      const first = errors ? Object.values(errors)[0] : undefined
      if (first) return String(first)
    }
    return error.message
  }
  return 'Não foi possível concluir a operação.'
}

function query(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '' || value === false) continue
    search.set(key, String(value))
  }
  return search.toString()
}

export const mailboxService = {
  account() {
    return apiFetchData<MailboxAccountView>('/root/mailbox/account')
  },

  saveAccount(input: SaveAccountInput) {
    return apiFetchData<MailboxAccountView>('/root/mailbox/account', {
      method: 'PUT',
      body: JSON.stringify(input),
    })
  },

  deleteAccount() {
    return apiFetchData<{ ok: boolean }>('/root/mailbox/account', { method: 'DELETE' })
  },

  testConnection(input: Omit<SaveAccountInput, 'label' | 'signatureHtml' | 'syncIntervalSeconds' | 'displayName'> & { email?: string }) {
    return apiFetchData<{ ok: boolean; message: string }>('/root/mailbox/account/test', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  folders() {
    return apiFetchData<{ configured: boolean; folders: MailFolder[]; localDrafts: number; unread: number }>(
      '/root/mailbox/folders',
    )
  },

  sync(folder?: string, limit?: number) {
    return apiFetchData<{ ok: boolean; unread: number; syncedFolder?: string; messages?: number; lastSyncAt?: string }>(
      '/root/mailbox/sync',
      { method: 'POST', body: JSON.stringify({ folder, limit }) },
    )
  },

  unread() {
    return apiFetchData<{ configured: boolean; unread: number; lastSyncAt?: string | null }>('/root/mailbox/unread')
  },

  messages(params: {
    folder: string
    page?: number
    limit?: number
    q?: string
    unread?: boolean
    starred?: boolean
    attachments?: boolean
    sort?: string
    threads?: boolean
  }) {
    return apiFetchData<{ data: MailListItem[]; total: number; page: number; limit: number; counts?: MailCounts }>(
      `/root/mailbox/messages?${query(params)}`,
    )
  },

  read(folder: string, uid: number, loadRemoteImages = false, peek = false) {
    return apiFetchData<MailMessage>(
      `/root/mailbox/messages/read?${query({ folder, uid, loadRemoteImages, peek })}`,
    )
  },

  notSpam(folder: string, uids: number[]) {
    return apiFetchData<{ ok: boolean }>('/root/mailbox/messages/not-spam', {
      method: 'POST',
      body: JSON.stringify({ folder, uids }),
    })
  },

  receipt(folder: string, uid: number, send: boolean) {
    return apiFetchData<{ ok: boolean; sent: boolean }>('/root/mailbox/messages/receipt', {
      method: 'POST',
      body: JSON.stringify({ folder, uid, send }),
    })
  },

  sourceBlob(folder: string, uid: number) {
    return apiFetchBlob(`/root/mailbox/messages/source?${query({ folder, uid })}`)
  },

  createFolder(name: string, parent?: string) {
    return apiFetchData<{ ok: boolean; path: string }>('/root/mailbox/folders', {
      method: 'POST',
      body: JSON.stringify({ name, parent }),
    })
  },

  renameFolder(path: string, name: string) {
    return apiFetchData<{ ok: boolean; path: string }>('/root/mailbox/folders', {
      method: 'PUT',
      body: JSON.stringify({ path, name }),
    })
  },

  deleteFolder(path: string) {
    return apiFetchData<{ ok: boolean }>('/root/mailbox/folders/delete', {
      method: 'POST',
      body: JSON.stringify({ path }),
    })
  },

  readAll(path: string) {
    return apiFetchData<{ ok: boolean; unread: number }>('/root/mailbox/folders/read-all', {
      method: 'POST',
      body: JSON.stringify({ path }),
    })
  },

  emptyFolder(path: string) {
    return apiFetchData<{ ok: boolean; removed: number }>('/root/mailbox/folders/empty', {
      method: 'POST',
      body: JSON.stringify({ path }),
    })
  },

  quota() {
    return apiFetchData<{ supported: boolean; usage: number; limit: number }>('/root/mailbox/quota')
  },

  contacts(q: string) {
    return apiFetchData<MailContact[]>(`/root/mailbox/contacts?${query({ q })}`)
  },

  attachOriginal(draftId: number, folder: string, uid: number, asAttachment: boolean) {
    return apiFetchData<MailDraft>(`/root/mailbox/drafts/${draftId}/original`, {
      method: 'POST',
      body: JSON.stringify({ folder, uid, asAttachment }),
    })
  },

  cancelScheduled(draftId: number) {
    return apiFetchData<MailDraft>(`/root/mailbox/drafts/${draftId}/schedule`, { method: 'DELETE' })
  },

  seen(folder: string, uids: number[], seen: boolean) {
    return apiFetchData<{ ok: boolean; unread: number }>('/root/mailbox/messages/seen', {
      method: 'POST',
      body: JSON.stringify({ folder, uids, seen }),
    })
  },

  star(folder: string, uids: number[], flagged: boolean) {
    return apiFetchData<{ ok: boolean }>('/root/mailbox/messages/star', {
      method: 'POST',
      body: JSON.stringify({ folder, uids, flagged }),
    })
  },

  move(folder: string, uids: number[], targetFolder: string) {
    return apiFetchData<{ ok: boolean }>('/root/mailbox/messages/move', {
      method: 'POST',
      body: JSON.stringify({ folder, uids, targetFolder }),
    })
  },

  archive(folder: string, uids: number[]) {
    return apiFetchData<{ ok: boolean }>('/root/mailbox/messages/archive', {
      method: 'POST',
      body: JSON.stringify({ folder, uids }),
    })
  },

  spam(folder: string, uids: number[]) {
    return apiFetchData<{ ok: boolean }>('/root/mailbox/messages/spam', {
      method: 'POST',
      body: JSON.stringify({ folder, uids }),
    })
  },

  remove(folder: string, uids: number[]) {
    return apiFetchData<{ ok: boolean; permanent: boolean }>('/root/mailbox/messages/delete', {
      method: 'POST',
      body: JSON.stringify({ folder, uids }),
    })
  },

  restore(uids: number[]) {
    return apiFetchData<{ ok: boolean }>('/root/mailbox/messages/restore', {
      method: 'POST',
      body: JSON.stringify({ folder: 'INBOX', uids }),
    })
  },

  attachmentBlob(folder: string, uid: number, index: number, preview = false) {
    return apiFetchBlob(`/root/mailbox/messages/attachment?${query({ folder, uid, index, preview })}`)
  },

  drafts() {
    return apiFetchData<MailDraft[]>('/root/mailbox/drafts')
  },

  saveDraft(input: SendMailInput, id?: number) {
    return apiFetchData<MailDraft>(id ? `/root/mailbox/drafts/${id}` : '/root/mailbox/drafts', {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(input),
    })
  },

  deleteDraft(id: number) {
    return apiFetchData<{ ok: boolean }>(`/root/mailbox/drafts/${id}`, { method: 'DELETE' })
  },

  uploadAttachment(draftId: number, file: File) {
    const body = new FormData()
    body.append('file', file)
    return apiFetchData<MailDraftAttachment>(`/root/mailbox/drafts/${draftId}/attachments`, {
      method: 'POST',
      body,
    })
  },

  deleteAttachment(draftId: number, attachmentId: number) {
    return apiFetchData<{ ok: boolean }>(`/root/mailbox/drafts/${draftId}/attachments/${attachmentId}`, {
      method: 'DELETE',
    })
  },

  send(input: SendMailInput) {
    return apiFetchData<SendResult>('/root/mailbox/send', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  audit(page = 1) {
    return apiFetchData<{ data: MailAuditEntry[]; total: number; page: number; limit: number }>(
      `/root/mailbox/audit?page=${page}&limit=20`,
    )
  },
}
