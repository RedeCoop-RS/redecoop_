import { useCallback, useEffect, useRef, useState } from 'react'
import { useMailboxUnread } from '@/contexts/MailboxUnreadContext'
import { notify } from '@/lib/notify'
import {
  mailboxErrorMessage,
  mailboxService,
  type MailCounts,
  type MailDraft,
  type MailFolder,
  type MailListItem,
  type MailboxAccountView,
  type MailMessage,
  type SendMailInput,
} from '@/services/mailbox.service'
import { buildForward, buildForwardAsAttachment, buildReply, printableMessage } from './format'

export interface ComposerState extends SendMailInput {
  open: boolean
  showCc: boolean
  editorKey: string
  attachments: MailDraft['attachments']
  saving: boolean
  savedAt?: string
  dirty: boolean
  scheduledAt?: string | null
  scheduleError?: string | null
}

export interface PendingSend {
  draftId: number
  sendAt: number
  subject: string
}

export interface FolderDialog {
  mode: 'create' | 'rename'
  folder?: MailFolder
  value: string
  parent?: string
}

const EMPTY_COUNTS: MailCounts = { total: 0, unread: 0, starred: 0, attachments: 0 }

function emptyComposer(account: MailboxAccountView | null): ComposerState {
  return {
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
    signatureId: account?.defaultSignatureId || null,
    priority: 'normal',
    requestReceipt: false,
    attachments: [],
    saving: false,
    dirty: false,
  }
}

export function useMailbox() {
  const unread = useMailboxUnread()
  const [account, setAccount] = useState<MailboxAccountView | null>(null)
  const [folders, setFolders] = useState<MailFolder[]>([])
  const [folder, setFolder] = useState<MailFolder | null>(null)
  const [view, setView] = useState<'folder' | 'scheduled'>('folder')
  const [messages, setMessages] = useState<MailListItem[]>([])
  const [counts, setCounts] = useState<MailCounts>(EMPTY_COUNTS)
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
  const [threads, setThreads] = useState(() => localStorage.getItem('mailbox:threads') === '1')
  const [sort, setSort] = useState<'date_desc' | 'date_asc' | 'subject' | 'from'>('date_desc')
  const [pane, setPane] = useState<'list' | 'read'>('list')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [drafts, setDrafts] = useState<MailDraft[]>([])
  const [composer, setComposer] = useState<ComposerState | null>(null)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [syncLimit, setSyncLimit] = useState(200)
  const [preview, setPreview] = useState<{ url: string; name: string; type: string } | null>(null)
  const [source, setSource] = useState<{ text: string; url: string; filename: string } | null>(null)
  const [pending, setPending] = useState<PendingSend | null>(null)
  const [folderDialog, setFolderDialog] = useState<FolderDialog | null>(null)
  const [quota, setQuota] = useState<{ usage: number; limit: number } | null>(null)
  const folderRef = useRef<MailFolder | null>(null)
  const readyRef = useRef(false)
  const setUnreadCount = useRef(unread.setCount)
  folderRef.current = folder
  setUnreadCount.current = unread.setCount

  const loadFolders = useCallback(async () => {
    const result = await mailboxService.folders()
    setFolders(result.folders)
    setUnreadCount.current(result.unread)
    setFolder((current) => (current ? result.folders.find((item) => item.path === current.path) || current : current))
    return result.folders
  }, [])

  const loadQuota = useCallback(async () => {
    try {
      const result = await mailboxService.quota()
      setQuota(result.supported ? { usage: result.usage, limit: result.limit } : null)
    } catch {
      setQuota(null)
    }
  }, [])

  const loadMessages = useCallback(async (target: MailFolder, nextPage: number, keepSelection = false) => {
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
        threads,
      })
      setMessages(result.data)
      setTotal(result.total)
      setPage(result.page)
      setCounts(result.counts || EMPTY_COUNTS)
      if (!keepSelection) setSelected([])
      else setSelected((current) => current.filter((uid) => result.data.some((item) => item.uid === uid)))
    } catch (error) {
      notify.error(mailboxErrorMessage(error))
    } finally {
      setListLoading(false)
    }
  }, [query, unreadOnly, starredOnly, withAttachments, sort, threads])

  const refreshDrafts = useCallback(async () => {
    try {
      const list = await mailboxService.drafts()
      setDrafts(list)
      return list
    } catch {
      setDrafts([])
      return []
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
      setView('folder')
      if (inbox) await loadMessages(inbox, 1)
      await refreshDrafts()
      void loadQuota()
      readyRef.current = true
    } catch (error) {
      notify.error(mailboxErrorMessage(error))
      setSettingsOpen(true)
    } finally {
      setSyncing(false)
      setLoading(false)
    }
  }, [loadFolders, loadMessages, refreshDrafts, loadQuota])

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
    localStorage.setItem('mailbox:threads', threads ? '1' : '0')
  }, [threads])

  useEffect(() => {
    if (!readyRef.current || !folderRef.current) return
    void loadMessages(folderRef.current, 1)
  }, [query, unreadOnly, starredOnly, withAttachments, sort, threads, loadMessages])

  useEffect(() => {
    if (!pending) return
    const wait = Math.max(0, pending.sendAt - Date.now()) + 3500
    const timer = window.setTimeout(async () => {
      const list = await refreshDrafts()
      const draft = list.find((item) => item.id === pending.draftId)
      setPending((current) => (current?.draftId === pending.draftId ? null : current))
      if (draft?.scheduleError) notify.error(`Não foi enviado: ${draft.scheduleError}`)
      else if (!draft) {
        notify.success('E-mail enviado.')
        const current = folderRef.current
        if (current?.specialUse === 'sent') void loadMessages(current, 1)
      }
    }, wait)
    return () => window.clearTimeout(timer)
  }, [pending, refreshDrafts, loadMessages])

  async function openFolder(next: MailFolder, limit = syncLimit) {
    setFolder(next)
    setView('folder')
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

  async function openMessage(item: Pick<MailListItem, 'uid'>, loadRemoteImages = false, target = folder) {
    if (!target) return
    setReading(true)
    setPane('read')
    try {
      const detail = await mailboxService.read(target.path, item.uid, loadRemoteImages)
      setMessage(detail)
      setMessages((current) => current.map((row) => (row.uid === item.uid ? { ...row, seen: true, threadUnread: 0 } : row)))
      const fresh = await mailboxService.unread()
      setUnreadCount.current(fresh.unread)
      void loadFolders()
    } catch (error) {
      notify.error(mailboxErrorMessage(error))
    } finally {
      setReading(false)
    }
  }

  async function act(action: () => Promise<unknown>, success: string, options: { closeReader?: boolean } = {}) {
    if (!folder) return
    const openUid = message?.uid
    try {
      await action()
      notify.success(success)
      await loadFolders()
      await loadMessages(folder, page)
      if (!openUid) return
      if (options.closeReader) {
        setMessage(null)
        setPane('list')
        return
      }
      try {
        setMessage(await mailboxService.read(folder.path, openUid, false, true))
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
      ...emptyComposer(account),
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
  }, [composer?.to, composer?.cc, composer?.bcc, composer?.subject, composer?.html, composer?.signatureId, composer?.priority, composer?.requestReceipt, composer?.includeSignature, composer?.dirty, composer?.open]) // eslint-disable-line react-hooks/exhaustive-deps

  async function send(sendAt?: string) {
    if (!composer) return
    if (!composer.to?.trim() && !composer.cc?.trim() && !composer.bcc?.trim()) {
      notify.error('Informe ao menos um destinatário.')
      return
    }
    try {
      const draft = await persistDraft({ ...composer, saving: true })
      const delaySeconds = sendAt ? undefined : account?.undoSendSeconds ?? 10
      const result = await mailboxService.send({ ...composer, draftId: draft.id, delaySeconds, sendAt })
      setComposer(null)
      setPane(message ? 'read' : 'list')
      if (result.scheduled) {
        if (result.undoable) {
          setPending({ draftId: result.draftId, sendAt: new Date(result.sendAt).getTime(), subject: composer.subject || '(sem assunto)' })
        } else {
          notify.success(`Envio agendado para ${new Date(result.sendAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}.`)
        }
      } else {
        notify.success(result.warning || 'E-mail enviado.')
        if (folder) await loadMessages(folder, page)
      }
      await refreshDrafts()
    } catch (error) {
      notify.error(mailboxErrorMessage(error))
    }
  }

  function draftToComposer(draft: MailDraft): Partial<ComposerState> {
    return {
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
      signatureId: draft.signatureId ?? account?.defaultSignatureId ?? null,
      priority: draft.priority || 'normal',
      requestReceipt: Boolean(draft.requestReceipt),
      sourceFolder: draft.sourceFolder || undefined,
      sourceUid: draft.sourceUid || undefined,
      inReplyTo: draft.inReplyTo || undefined,
      references: draft.references || undefined,
      attachments: draft.attachments,
      scheduledAt: draft.scheduledAt,
      scheduleError: draft.scheduleError,
      dirty: false,
    }
  }

  async function undoSend() {
    if (!pending) return
    const target = pending
    setPending(null)
    try {
      const draft = await mailboxService.cancelScheduled(target.draftId)
      notify.success('Envio desfeito. A mensagem voltou para o editor.')
      openComposer(draftToComposer(draft))
      await refreshDrafts()
    } catch (error) {
      notify.error(mailboxErrorMessage(error))
    }
  }

  async function cancelSchedule(draft: MailDraft) {
    try {
      await mailboxService.cancelScheduled(draft.id)
      notify.success('Agendamento cancelado. A mensagem ficou nos rascunhos.')
      await refreshDrafts()
    } catch (error) {
      notify.error(mailboxErrorMessage(error))
    }
  }

  async function addFiles(files: FileList | File[] | null) {
    if (!files || !files.length || !composer) return
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

  async function forward(asAttachment = false) {
    if (!message) return
    const seed = asAttachment ? buildForwardAsAttachment(message) : buildForward(message)
    const base: ComposerState = { ...emptyComposer(account), ...seed, editorKey: `fwd-${message.uid}-${Date.now()}` }
    const needsFiles = asAttachment || message.attachments.some((file) => !file.related)
    openComposer(base)
    if (!needsFiles) return
    try {
      const draft = await mailboxService.saveDraft(base)
      const withFiles = await mailboxService.attachOriginal(draft.id, message.folder, message.uid, asAttachment)
      setComposer((current) => (current ? { ...current, draftId: draft.id, attachments: withFiles.attachments } : current))
      await refreshDrafts()
    } catch (error) {
      notify.error(mailboxErrorMessage(error))
    }
  }

  function closePreview() {
    if (preview) URL.revokeObjectURL(preview.url)
    setPreview(null)
  }

  function closeSource() {
    if (source) URL.revokeObjectURL(source.url)
    setSource(null)
  }

  async function openAttachment(index: number, filename: string, contentType: string, asPreview: boolean) {
    if (!message) return
    try {
      const blob = await mailboxService.attachmentBlob(message.folder, message.uid, index, asPreview)
      const type = (blob.type || contentType).split(';')[0].toLowerCase()
      const safe = /^(image\/(png|jpe?g|gif|webp|bmp)|application\/pdf|text\/plain)$/.test(type)
      if (asPreview && safe) {
        // O blob herda a origem do painel: só tipos que não executam script são abertos.
        const url = URL.createObjectURL(new Blob([blob], { type }))
        closePreview()
        setPreview({ url, name: filename, type })
        return
      }
      const url = URL.createObjectURL(new Blob([blob], { type: 'application/octet-stream' }))
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) {
      notify.error(mailboxErrorMessage(error))
    }
  }

  async function viewSource() {
    if (!message) return
    try {
      const blob = await mailboxService.sourceBlob(message.folder, message.uid)
      const text = await blob.text()
      closeSource()
      setSource({
        text: text.length > 2_000_000 ? `${text.slice(0, 2_000_000)}\n\n[… cortado na tela; baixe o arquivo para ver tudo]` : text,
        url: URL.createObjectURL(new Blob([blob], { type: 'application/octet-stream' })),
        filename: `${(message.subject || 'mensagem').replace(/[^\w\- ]+/g, '_').slice(0, 60)}.eml`,
      })
    } catch (error) {
      notify.error(mailboxErrorMessage(error))
    }
  }

  function print() {
    if (!message) return
    const frame = document.createElement('iframe')
    frame.setAttribute('sandbox', 'allow-same-origin allow-modals')
    frame.setAttribute('aria-hidden', 'true')
    frame.style.position = 'fixed'
    frame.style.width = '0'
    frame.style.height = '0'
    frame.style.border = '0'
    frame.srcdoc = printableMessage(message)
    frame.onload = () => {
      frame.contentWindow?.focus()
      frame.contentWindow?.print()
      window.setTimeout(() => frame.remove(), 60_000)
    }
    document.body.appendChild(frame)
  }

  function unsubscribe() {
    const link = message?.listUnsubscribe
    if (!link) return
    if (/^https:\/\//i.test(link)) {
      window.open(link, '_blank', 'noopener,noreferrer')
      return
    }
    if (/^mailto:/i.test(link)) {
      const [address, queryString] = link.slice(7).split('?')
      const params = new URLSearchParams(queryString || '')
      openComposer({
        to: decodeURIComponent(address),
        subject: params.get('subject') || 'unsubscribe',
        html: `<p>${params.get('body') || 'unsubscribe'}</p>`,
        includeSignature: false,
      })
    }
  }

  async function receipt(sendIt: boolean) {
    if (!message) return
    try {
      await mailboxService.receipt(message.folder, message.uid, sendIt)
      notify.success(sendIt ? 'Confirmação de leitura enviada.' : 'Pedido de confirmação ignorado.')
      setMessage((current) => (current ? { ...current, receiptRequested: false } : current))
    } catch (error) {
      notify.error(mailboxErrorMessage(error))
    }
  }

  async function saveFolderDialog() {
    if (!folderDialog) return
    const name = folderDialog.value.trim()
    if (!name) {
      notify.error('Informe o nome da pasta.')
      return
    }
    try {
      if (folderDialog.mode === 'create') {
        await mailboxService.createFolder(name, folderDialog.parent || undefined)
        notify.success('Pasta criada.')
        await loadFolders()
      } else if (folderDialog.folder) {
        const result = await mailboxService.renameFolder(folderDialog.folder.path, name)
        notify.success('Pasta renomeada.')
        const list = await loadFolders()
        if (folder?.path === folderDialog.folder.path) {
          const renamed = list.find((item) => item.path === result.path)
          if (renamed) await openFolder(renamed)
        }
      }
      setFolderDialog(null)
    } catch (error) {
      notify.error(mailboxErrorMessage(error))
    }
  }

  async function deleteFolder(target: MailFolder) {
    if (!window.confirm(`Excluir a pasta "${target.name}" e todas as mensagens dela? Isso não pode ser desfeito.`)) return
    try {
      await mailboxService.deleteFolder(target.path)
      notify.success('Pasta excluída.')
      const list = await loadFolders()
      if (folder?.path === target.path) {
        const inbox = list.find((item) => item.specialUse === 'inbox')
        if (inbox) await openFolder(inbox)
      }
    } catch (error) {
      notify.error(mailboxErrorMessage(error))
    }
  }

  async function moveUids(uids: number[], targetFolder: string, fromFolder = folder) {
    if (!fromFolder || !uids.length || targetFolder === fromFolder.path) return
    await act(() => mailboxService.move(fromFolder.path, uids, targetFolder), uids.length > 1 ? `${uids.length} mensagens movidas.` : 'Mensagem movida.', {
      closeReader: Boolean(message && uids.includes(message.uid)),
    })
  }

  const uids = selected.length ? selected : message ? [message.uid] : []
  const leavesFolder = Boolean(message && uids.includes(message.uid))

  return {
    account,
    folders,
    folder,
    view,
    messages,
    counts,
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
    threads,
    sort,
    pane,
    settingsOpen,
    drafts,
    scheduledDrafts: drafts.filter((draft) => draft.scheduledAt && (!pending || draft.id !== pending.draftId)),
    composer,
    shortcutsOpen,
    preview,
    source,
    pending,
    folderDialog,
    quota,
    setSearch,
    setUnreadOnly,
    setStarredOnly,
    setWithAttachments,
    setThreads,
    setSort,
    setPane,
    setSettingsOpen,
    setShortcutsOpen,
    setSelected,
    setFolderDialog,
    closePreview,
    closeSource,
    reload: boot,
    openFolder,
    openScheduled: () => {
      setView('scheduled')
      setMessage(null)
      setPane('list')
      void refreshDrafts()
    },
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
    toggleSelectAll: () => {
      setSelected((current) => (current.length === messages.length && messages.length > 0 ? [] : messages.map((item) => item.uid)))
    },
    compose: () => openComposer(),
    composeTo: (address: string) => openComposer({ to: address }),
    reply: (all = false) => {
      if (!message) return
      openComposer({ ...buildReply(message, ownAddresses(), all, message.specialUse === 'sent'), signatureId: account?.defaultSignatureId || null })
    },
    forward,
    editDraft: (draft: MailDraft) => openComposer(draftToComposer(draft)),
    cancelSchedule,
    updateComposer,
    closeComposer: () => setComposer(null),
    send,
    undoSend,
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
      return act(() => mailboxService.seen(folder.path, uids, seen), seen ? 'Marcada como lida.' : 'Marcada como não lida.', {
        closeReader: !seen && leavesFolder,
      })
    },
    readAll: () => {
      if (!folder) return
      return act(() => mailboxService.readAll(folder.path), 'Todas as mensagens da pasta foram marcadas como lidas.')
    },
    toggleStar: (item: MailListItem) => {
      if (!folder) return
      return act(() => mailboxService.star(folder.path, [item.uid], !item.flagged), item.flagged ? 'Estrela removida.' : 'Marcada com estrela.')
    },
    star: (flagged: boolean) => {
      if (!folder || !uids.length) return
      return act(() => mailboxService.star(folder.path, uids, flagged), flagged ? 'Marcada com estrela.' : 'Estrela removida.')
    },
    move: (targetFolder: string) => moveUids(uids, targetFolder),
    moveUids,
    archive: () => {
      if (!folder || !uids.length) return
      return act(() => mailboxService.archive(folder.path, uids), uids.length > 1 ? 'Mensagens arquivadas.' : 'Mensagem arquivada.', { closeReader: leavesFolder })
    },
    spam: () => {
      if (!folder || !uids.length) return
      return act(() => mailboxService.spam(folder.path, uids), 'Marcada como spam.', { closeReader: leavesFolder })
    },
    notSpam: () => {
      if (!folder || !uids.length) return
      return act(() => mailboxService.notSpam(folder.path, uids), 'Movida para a caixa de entrada.', { closeReader: leavesFolder })
    },
    remove: () => {
      if (!folder || !uids.length) return
      const permanent = folder.specialUse === 'trash'
      if (permanent && !window.confirm('Excluir permanentemente? Isso não pode ser desfeito.')) return
      return act(() => mailboxService.remove(folder.path, uids), permanent ? 'Mensagem excluída.' : 'Mensagem enviada para a lixeira.', { closeReader: leavesFolder })
    },
    restore: () => {
      if (!uids.length) return
      return act(() => mailboxService.restore(uids), 'Mensagem restaurada para a caixa de entrada.', { closeReader: leavesFolder })
    },
    emptyFolder: async (target: MailFolder) => {
      const label = target.specialUse === 'spam' ? 'a pasta de spam' : 'a lixeira'
      if (!window.confirm(`Esvaziar ${label}? Todas as mensagens serão excluídas permanentemente.`)) return
      try {
        const result = await mailboxService.emptyFolder(target.path)
        notify.success(`${result.removed} mensage${result.removed === 1 ? 'm excluída' : 'ns excluídas'}.`)
        await loadFolders()
        if (folder?.path === target.path) {
          setMessage(null)
          await loadMessages(target, 1)
        }
        void loadQuota()
      } catch (error) {
        notify.error(mailboxErrorMessage(error))
      }
    },
    deleteFolder,
    saveFolderDialog,
    openAttachment,
    viewSource,
    print,
    unsubscribe,
    receipt,
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

export type MailboxController = ReturnType<typeof useMailbox>
