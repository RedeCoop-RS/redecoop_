import { useCallback, useEffect, useRef, useState } from 'react'
import { useMailboxUnread } from '@/contexts/MailboxUnreadContext'
import { notify } from '@/lib/notify'
import {
  mailboxErrorMessage,
  mailboxService,
  type MailDraft,
  type MailFolder,
  type MailListItem,
  type MailboxAccountView,
  type MailMessage,
  type SendMailInput,
} from '@/services/mailbox.service'
import { buildForward, buildReply } from './format'

export interface ComposerState extends SendMailInput {
  open: boolean
  showCc: boolean
  editorKey: string
  attachments: MailDraft['attachments']
  saving: boolean
  savedAt?: string
  dirty: boolean
}

const EMPTY_COMPOSER = (): ComposerState => ({
  open: true,
  showCc: false,
  editorKey: String(Date.now()),
  mode: 'new',
  to: '',
  cc: '',
  bcc: '',
  subject: '',
  html: '<p><br></p>',
  includeSignature: true,
  attachments: [],
  saving: false,
  dirty: false,
})

export function useMailbox() {
  const unread = useMailboxUnread()
  const [account, setAccount] = useState<MailboxAccountView | null>(null)
  const [folders, setFolders] = useState<MailFolder[]>([])
  const [folder, setFolder] = useState<MailFolder | null>(null)
  const [messages, setMessages] = useState<MailListItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [listLoading, setListLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState<MailMessage | null>(null)
  const [reading, setReading] = useState(false)
  const [selected, setSelected] = useState<number[]>([])
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [starredOnly, setStarredOnly] = useState(false)
  const [withAttachments, setWithAttachments] = useState(false)
  const [sort, setSort] = useState<'date_desc' | 'date_asc' | 'subject' | 'from'>('date_desc')
  const [pane, setPane] = useState<'list' | 'read'>('list')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [drafts, setDrafts] = useState<MailDraft[]>([])
  const [composer, setComposer] = useState<ComposerState | null>(null)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [syncLimit, setSyncLimit] = useState(200)
  const [preview, setPreview] = useState<{ url: string; name: string; type: string } | null>(null)
  const folderRef = useRef<MailFolder | null>(null)
  const readyRef = useRef(false)
  const setUnreadCount = useRef(unread.setCount)
  folderRef.current = folder
  setUnreadCount.current = unread.setCount

  const loadFolders = useCallback(async () => {
    const result = await mailboxService.folders()
    setFolders(result.folders)
    setUnreadCount.current(result.unread)
    return result.folders
  }, [])

  const loadMessages = useCallback(async (target: MailFolder, nextPage: number) => {
    setListLoading(true)
    try {
      const result = await mailboxService.messages({
        folder: target.path,
        page: nextPage,
        limit: 30,
        q: query || undefined,
        unread: unreadOnly,
        starred: starredOnly,
        attachments: withAttachments,
        sort,
      })
      setMessages(result.data)
      setTotal(result.total)
      setPage(result.page)
      setSelected([])
    } catch (error) {
      notify.error(mailboxErrorMessage(error))
    } finally {
      setListLoading(false)
    }
  }, [query, unreadOnly, starredOnly, withAttachments, sort])

  const refreshDrafts = useCallback(async () => {
    try {
      setDrafts(await mailboxService.drafts())
    } catch {
      setDrafts([])
    }
  }, [])

  const boot = useCallback(async () => {
    setLoading(true)
    try {
      const current = await mailboxService.account()
      setAccount(current)
      if (!current.configured) {
        setSettingsOpen(true)
        return
      }
      setSyncing(true)
      const synced = await mailboxService.sync(undefined, 200)
      setUnreadCount.current(synced.unread)
      const list = await loadFolders()
      const inbox = list.find((item) => item.specialUse === 'inbox' && item.selectable) || list.find((item) => item.selectable) || null
      setFolder(inbox)
      if (inbox) await loadMessages(inbox, 1)
      await refreshDrafts()
      readyRef.current = true
    } catch (error) {
      notify.error(mailboxErrorMessage(error))
      setSettingsOpen(true)
    } finally {
      setSyncing(false)
      setLoading(false)
    }
  }, [loadFolders, loadMessages, refreshDrafts])

  useEffect(() => {
    void boot()
    // A carga inicial não deve repetir quando os filtros mudam.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search.trim()), 350)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    if (!readyRef.current || !folderRef.current) return
    void loadMessages(folderRef.current, 1)
  }, [query, unreadOnly, starredOnly, withAttachments, sort, loadMessages])

  async function openFolder(next: MailFolder, limit = syncLimit) {
    setFolder(next)
    setMessage(null)
    setPane('list')
    setSyncing(true)
    try {
      const synced = await mailboxService.sync(next.path, limit)
      setUnreadCount.current(synced.unread)
      await loadFolders()
      await loadMessages(next, 1)
    } catch (error) {
      notify.error(mailboxErrorMessage(error))
      await loadMessages(next, 1)
    } finally {
      setSyncing(false)
    }
  }

  async function openMessage(item: MailListItem, loadRemoteImages = false, target = folder) {
    if (!target) return
    setReading(true)
    setPane('read')
    try {
      const detail = await mailboxService.read(target.path, item.uid, loadRemoteImages)
      setMessage(detail)
      setMessages((current) => current.map((row) => (row.uid === item.uid ? { ...row, seen: true } : row)))
      const fresh = await mailboxService.unread()
      setUnreadCount.current(fresh.unread)
    } catch (error) {
      notify.error(mailboxErrorMessage(error))
    } finally {
      setReading(false)
    }
  }

  async function act(action: () => Promise<unknown>, success: string) {
    if (!folder) return
    const openUid = message?.uid
    try {
      await action()
      notify.success(success)
      await loadFolders()
      await loadMessages(folder, page)
      if (!openUid) return
      try {
        setMessage(await mailboxService.read(folder.path, openUid))
      } catch {
        setMessage(null)
        setPane('list')
      }
    } catch (error) {
      notify.error(mailboxErrorMessage(error))
    }
  }

  function ownAddresses() {
    return [account?.email, account?.username].filter((value): value is string => Boolean(value)).map((value) => value.toLowerCase())
  }

  function openComposer(seed?: Partial<ComposerState>) {
    setComposer({
      ...EMPTY_COMPOSER(),
      ...seed,
      open: true,
      dirty: false,
      showCc: Boolean(seed?.showCc || seed?.cc || seed?.bcc),
    })
    setPane('read')
  }

  function updateComposer(partial: Partial<ComposerState>) {
    setComposer((current) => (current ? { ...current, ...partial, dirty: true } : current))
  }

  async function persistDraft(current: ComposerState) {
    const saved = await mailboxService.saveDraft(current, current.draftId)
    setComposer((latest) => (latest ? { ...latest, draftId: saved.id, saving: false, dirty: false, savedAt: new Date().toISOString(), attachments: saved.attachments } : latest))
    await refreshDrafts()
    return saved
  }

  useEffect(() => {
    if (!composer?.open || !composer.dirty) return
    const hasContent = Boolean(composer.to || composer.subject || (composer.html && composer.html !== '<p><br></p>'))
    if (!hasContent && !composer.draftId) return
    const timer = window.setTimeout(() => {
      setComposer((current) => (current ? { ...current, saving: true } : current))
      void persistDraft(composer).catch(() => {
        setComposer((current) => (current ? { ...current, saving: false } : current))
      })
    }, 1500)
    return () => window.clearTimeout(timer)
  }, [composer?.to, composer?.cc, composer?.bcc, composer?.subject, composer?.html, composer?.dirty, composer?.open]) // eslint-disable-line react-hooks/exhaustive-deps

  async function send() {
    if (!composer) return
    try {
      const draft = await persistDraft({ ...composer, saving: true })
      const result = await mailboxService.send({ ...composer, draftId: draft.id })
      notify.success(result.warning || 'E-mail enviado.')
      setComposer(null)
      await refreshDrafts()
      if (folder) await loadMessages(folder, page)
    } catch (error) {
      notify.error(mailboxErrorMessage(error))
    }
  }

  async function addFiles(files: FileList | null) {
    if (!files?.length || !composer) return
    try {
      const draft = await persistDraft(composer)
      for (const file of Array.from(files)) {
        if (file.size > 15 * 1024 * 1024) {
          notify.error(`${file.name} excede 15 MB.`)
          continue
        }
        await mailboxService.uploadAttachment(draft.id, file)
      }
      const updated = (await mailboxService.drafts()).find((item) => item.id === draft.id)
      setComposer((current) => (current ? { ...current, draftId: draft.id, attachments: updated?.attachments || current.attachments } : current))
      await refreshDrafts()
    } catch (error) {
      notify.error(mailboxErrorMessage(error))
    }
  }

  function closePreview() {
    if (preview) URL.revokeObjectURL(preview.url)
    setPreview(null)
  }

  async function openAttachment(index: number, filename: string, contentType: string, asPreview: boolean) {
    if (!message) return
    try {
      const blob = await mailboxService.attachmentBlob(message.folder, message.uid, index, asPreview)
      const url = URL.createObjectURL(blob)
      const type = blob.type || contentType
      if (asPreview && (type.startsWith('image/') || type === 'application/pdf')) {
        closePreview()
        setPreview({ url, name: filename, type })
        return
      }
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      notify.error(mailboxErrorMessage(error))
    }
  }

  const uids = selected.length ? selected : message ? [message.uid] : []

  return {
    account,
    folders,
    folder,
    messages,
    total,
    page,
    loading,
    listLoading,
    syncing,
    message,
    reading,
    selected,
    search,
    unreadOnly,
    starredOnly,
    withAttachments,
    sort,
    pane,
    settingsOpen,
    drafts,
    composer,
    shortcutsOpen,
    preview,
    setSearch,
    setUnreadOnly,
    setStarredOnly,
    setWithAttachments,
    setSort,
    setPane,
    setSettingsOpen,
    setShortcutsOpen,
    setSelected,
    closePreview,
    reload: boot,
    openFolder,
    openMessage,
    loadMore: async () => {
      const next = syncLimit + 200
      setSyncLimit(next)
      if (folder) await openFolder(folder, next)
    },
    changePage: (next: number) => {
      if (folder) void loadMessages(folder, next)
    },
    toggleSelected: (uid: number) => {
      setSelected((current) => (current.includes(uid) ? current.filter((item) => item !== uid) : [...current, uid]))
    },
    compose: () => openComposer(),
    reply: (all = false) => {
      if (!message) return
      openComposer(buildReply(message, ownAddresses(), all))
    },
    forward: () => {
      if (!message) return
      openComposer(buildForward(message))
    },
    editDraft: (draft: MailDraft) => {
      openComposer({
        draftId: draft.id,
        editorKey: `draft-${draft.id}-${draft.updatedAt}`,
        mode: draft.mode,
        to: draft.to,
        cc: draft.cc,
        bcc: draft.bcc,
        showCc: Boolean(draft.cc || draft.bcc),
        subject: draft.subject,
        html: draft.html || '<p><br></p>',
        includeSignature: draft.includeSignature,
        sourceFolder: draft.sourceFolder || undefined,
        sourceUid: draft.sourceUid || undefined,
        inReplyTo: draft.inReplyTo || undefined,
        references: draft.references || undefined,
        attachments: draft.attachments,
        dirty: false,
      })
    },
    updateComposer,
    closeComposer: () => setComposer(null),
    send,
    addFiles,
    removeAttachment: async (attachmentId: number) => {
      if (!composer?.draftId) return
      await mailboxService.deleteAttachment(composer.draftId, attachmentId)
      setComposer((current) => current ? { ...current, attachments: current.attachments.filter((file) => file.id !== attachmentId) } : current)
    },
    discardDraft: async () => {
      if (composer?.draftId) await mailboxService.deleteDraft(composer.draftId).catch(() => undefined)
      setComposer(null)
      await refreshDrafts()
    },
    markSeen: (seen: boolean) => {
      if (!folder || !uids.length) return
      return act(() => mailboxService.seen(folder.path, uids, seen), seen ? 'Marcada como lida.' : 'Marcada como não lida.')
    },
    toggleStar: (item: MailListItem) => {
      if (!folder) return
      return act(() => mailboxService.star(folder.path, [item.uid], !item.flagged), item.flagged ? 'Estrela removida.' : 'Marcada com estrela.')
    },
    star: (flagged: boolean) => {
      if (!folder || !uids.length) return
      return act(() => mailboxService.star(folder.path, uids, flagged), flagged ? 'Marcada com estrela.' : 'Estrela removida.')
    },
    move: (targetFolder: string) => {
      if (!folder || !uids.length) return
      return act(() => mailboxService.move(folder.path, uids, targetFolder), 'Mensagem movida.')
    },
    archive: () => {
      if (!folder || !uids.length) return
      return act(() => mailboxService.archive(folder.path, uids), 'Mensagem arquivada.')
    },
    spam: () => {
      if (!folder || !uids.length) return
      return act(() => mailboxService.spam(folder.path, uids), 'Mensagem marcada como spam.')
    },
    remove: () => {
      if (!folder || !uids.length) return
      const permanent = folder.specialUse === 'trash'
      const question = permanent ? 'Excluir permanentemente?' : 'Mover para a lixeira?'
      if (!window.confirm(question)) return
      return act(() => mailboxService.remove(folder.path, uids), permanent ? 'Mensagem excluída.' : 'Mensagem enviada para a lixeira.')
    },
    restore: () => {
      if (!uids.length) return
      return act(() => mailboxService.restore(uids), 'Mensagem restaurada.')
    },
    openAttachment,
    savedAccount: async (next: MailboxAccountView) => {
      setAccount(next)
      setSettingsOpen(!next.configured)
      if (next.configured) await boot()
    },
    focusSearch: () => {
      document.getElementById('mailbox-search')?.focus()
    },
    moveCursor: (delta: number) => {
      if (!messages.length || !folder) return
      const currentIndex = message ? messages.findIndex((item) => item.uid === message.uid) : -1
      const next = messages[Math.min(messages.length - 1, Math.max(0, currentIndex + delta))]
      if (next) void openMessage(next)
    },
  }
}
