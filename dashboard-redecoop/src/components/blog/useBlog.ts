import { useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import {
  blogErrorMessage,
  blogService,
  draftFromPost,
  emptyDraft,
  toWrite,
  type BlogAuthor,
  type BlogConnection,
  type BlogDraft,
  type BlogPost,
  type BlogResource,
  type BlogTag,
} from '@/services/blog.service'
import { ApiError } from '@/lib/api'

export interface BlogFilters {
  resource: BlogResource
  page: number
  search: string
  status: string
  tag: string
  author: string
  order: string
}

const INITIAL: BlogFilters = {
  resource: 'post',
  page: 1,
  search: '',
  status: 'all',
  tag: '',
  author: '',
  order: 'updated_at desc',
}

function readingMinutes(words: number) {
  return words === 0 ? 0 : Math.max(1, Math.round(words / 200))
}

export function useBlog() {
  const [connection, setConnection] = useState<BlogConnection | null>(null)
  const [filters, setFilters] = useState<BlogFilters>(INITIAL)
  const [searchInput, setSearchInput] = useState('')
  const [items, setItems] = useState<BlogPost[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [tags, setTags] = useState<BlogTag[]>([])
  const [authors, setAuthors] = useState<BlogAuthor[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [draft, setDraft] = useState<BlogDraft | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [tagsOpen, setTagsOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const draftRef = useRef<BlogDraft | null>(null)
  const queue = useRef(Promise.resolve())
  draftRef.current = draft

  const loadConnection = useCallback(async () => {
    const view = await blogService.connection()
    setConnection(view)
    if (!view.configured) setSettingsOpen(true)
    return view
  }, [])

  const loadList = useCallback(async (next: BlogFilters) => {
    setLoading(true)
    try {
      const view = await loadConnection()
      if (!view.configured) {
        setItems([])
        return
      }
      const list = await blogService.list({
        resource: next.resource,
        page: next.page,
        limit: 12,
        status: next.status,
        tag: next.tag,
        author: next.author,
        search: next.search,
        order: next.order,
      })
      const [tagList, authorList] = await Promise.all([
        blogService.tags().catch((error) => {
          toast.error(`Tags: ${blogErrorMessage(error)}`)
          return [] as BlogTag[]
        }),
        blogService.authors().catch((error) => {
          toast.error(`Autores: ${blogErrorMessage(error)}`)
          return [] as BlogAuthor[]
        }),
      ])
      setItems(list.items)
      setTotal(list.pagination.total)
      setTotalPages(Math.max(1, list.pagination.pages))
      setTags(tagList)
      setAuthors(authorList)
      setSelected([])
    } catch (error) {
      toast.error(blogErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [loadConnection])

  useEffect(() => {
    void loadList(filters)
  }, [filters, loadList])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters((current) => (current.search === searchInput ? current : { ...current, search: searchInput, page: 1 }))
    }, 350)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  function patchFilters(patch: Partial<BlogFilters>) {
    setFilters((current) => ({ ...current, ...patch, page: patch.page ?? 1 }))
  }

  function enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = queue.current.then(task, task)
    queue.current = run.then(() => undefined, () => undefined)
    return run
  }

  function absorb(current: BlogDraft, post: BlogPost, replaceStatus: boolean): BlogDraft {
    const status = post.status === 'published' || post.status === 'scheduled' ? post.status : 'draft'
    return {
      ...current,
      id: post.id,
      updatedAt: post.updatedAt,
      slug: current.slug || post.slug,
      url: post.url,
      status: replaceStatus ? status : current.status,
      publishedAt: replaceStatus ? post.publishedAt || '' : current.publishedAt,
      readingTime: post.readingTime || readingMinutes(current.wordCount),
      dirty: false,
      conflict: false,
    }
  }

  async function persist(auto: boolean): Promise<BlogDraft | null> {
    const current = draftRef.current
    if (!current) return null
    if (auto && (!current.dirty || current.conflict || current.status !== 'draft' || !current.title.trim())) return current
    if (!current.title.trim()) {
      if (!auto) toast.error('Informe o título.')
      return null
    }
    setSaveState('saving')
    try {
      const body = toWrite(current)
      if (auto) body.status = 'draft'
      const saved = current.id ? await blogService.update(current.id, body) : await blogService.create(body)
      const latest = draftRef.current && draftRef.current.localKey === current.localKey ? draftRef.current : current
      const changedWhileSaving = latest.html !== current.html || latest.title !== current.title
      const status = saved.status === 'published' || saved.status === 'scheduled' ? saved.status : 'draft'
      const merged: BlogDraft = {
        ...latest,
        id: saved.id,
        updatedAt: saved.updatedAt,
        slug: latest.slug || saved.slug,
        url: saved.url,
        status: auto ? latest.status : status,
        publishedAt: latest.publishedAt || saved.publishedAt || '',
        readingTime: saved.readingTime || readingMinutes(latest.wordCount),
        dirty: auto ? changedWhileSaving : false,
        conflict: false,
      }
      setDraft(merged)
      draftRef.current = merged
      setSaveState('saved')
      return merged
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setDraft((value) => (value ? { ...value, conflict: true } : value))
        setSaveState('error')
        if (!auto) toast.error(blogErrorMessage(error))
        return null
      }
      setSaveState('error')
      if (!auto) toast.error(blogErrorMessage(error))
      return null
    }
  }

  const persistRef = useRef(persist)
  persistRef.current = persist

  useEffect(() => {
    if (!draft?.dirty || draft.conflict || draft.status !== 'draft' || !draft.title.trim()) return
    const timer = window.setTimeout(() => {
      void enqueue(() => persistRef.current(true))
    }, 2500)
    return () => window.clearTimeout(timer)
  }, [draft])

  async function openItem(id: string) {
    try {
      const post = await blogService.read(id, filters.resource)
      setPreviewOpen(false)
      setConfirmDelete(false)
      setSaveState('idle')
      setDraft(draftFromPost(post))
    } catch (error) {
      toast.error(blogErrorMessage(error))
    }
  }

  function createNew(resource: BlogResource) {
    setFilters((current) => ({ ...current, resource }))
    setPreviewOpen(false)
    setSaveState('idle')
    setDraft(emptyDraft(resource, authors[0]?.id))
  }

  function updateDraft(patch: Partial<BlogDraft>) {
    setDraft((current) => (current ? { ...current, ...patch, dirty: patch.dirty ?? true, conflict: false } : current))
  }

  async function save() {
    const saved = await enqueue(() => persist(false))
    if (saved) toast.success('Rascunho salvo.')
  }

  async function publish() {
    const saved = await enqueue(() => persist(false))
    if (!saved?.id || !saved.updatedAt) return
    try {
      const when = saved.publishedAt ? new Date(saved.publishedAt).toISOString() : undefined
      const post = when && new Date(when).getTime() > Date.now() + 30_000
        ? await blogService.schedule(saved.id, { resource: saved.resource, updatedAt: saved.updatedAt, publishedAt: when })
        : await blogService.publish(saved.id, { resource: saved.resource, updatedAt: saved.updatedAt, publishedAt: when })
      const next = absorb(saved, post, true)
      setDraft(next)
      toast.success(next.status === 'scheduled' ? 'Agendado.' : 'Publicado.')
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) setDraft((value) => (value ? { ...value, conflict: true } : value))
      toast.error(blogErrorMessage(error))
    }
  }

  async function unpublish() {
    const saved = await enqueue(() => persist(false))
    if (!saved?.id || !saved.updatedAt) return
    try {
      const post = await blogService.unpublish(saved.id, { resource: saved.resource, updatedAt: saved.updatedAt })
      setDraft(absorb(saved, post, true))
      toast.success('Voltou para rascunho.')
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) setDraft((value) => (value ? { ...value, conflict: true } : value))
      toast.error(blogErrorMessage(error))
    }
  }

  async function duplicate() {
    const current = draftRef.current
    if (!current?.id) {
      toast.error('Salve o rascunho antes de duplicar.')
      return
    }
    try {
      const copy = await blogService.duplicate(current.id, current.resource)
      setDraft(draftFromPost(copy))
      toast.success('Cópia criada como rascunho.')
    } catch (error) {
      toast.error(blogErrorMessage(error))
    }
  }

  async function removeCurrent() {
    const current = draftRef.current
    if (!current?.id) {
      if (draftRef.current?.localKey === current?.localKey) setDraft(null)
      return
    }
    const localKey = current.localKey
    try {
      await blogService.remove(current.id, current.resource)
      if (draftRef.current?.localKey === localKey) {
        setDraft(null)
        setConfirmDelete(false)
        toast.success('Excluído.')
      }
      await loadList(filters)
    } catch (error) {
      toast.error(blogErrorMessage(error))
    }
  }

  async function reloadConflict() {
    const current = draftRef.current
    if (!current?.id) return
    try {
      const post = await blogService.read(current.id, current.resource)
      setDraft(draftFromPost(post))
      setSaveState('idle')
      toast.success('Conteúdo recarregado.')
    } catch (error) {
      toast.error(blogErrorMessage(error))
    }
  }

  async function rowAction(item: BlogPost, action: 'publish' | 'unpublish' | 'duplicate' | 'delete') {
    try {
      if (action === 'delete') {
        if (!window.confirm('Excluir este conteúdo no Ghost?')) return
        await blogService.remove(item.id, filters.resource)
      } else if (action === 'duplicate') await blogService.duplicate(item.id, filters.resource)
      else if (action === 'unpublish') await blogService.unpublish(item.id, { resource: filters.resource, updatedAt: item.updatedAt })
      else await blogService.publish(item.id, { resource: filters.resource, updatedAt: item.updatedAt })
      toast.success(action === 'delete' ? 'Excluído.' : action === 'duplicate' ? 'Duplicado.' : action === 'unpublish' ? 'Rascunho.' : 'Publicado.')
      await loadList(filters)
    } catch (error) {
      toast.error(blogErrorMessage(error))
    }
  }

  async function bulk(action: 'publish' | 'unpublish' | 'delete') {
    const chosen = items.filter((item) => selected.includes(item.id))
    if (!chosen.length) return
    if (action === 'delete' && !window.confirm(`Excluir ${chosen.length} item(ns) no Ghost?`)) return
    try {
      const result = await blogService.bulk({
        action,
        items: chosen.map((item) => ({ id: item.id, resource: filters.resource, updatedAt: item.updatedAt })),
      })
      if (result.failed.length) toast.error(`${result.failed.length} item(ns) falharam. ${result.failed[0].message}`)
      else toast.success('Ação em massa concluída.')
      await loadList(filters)
    } catch (error) {
      toast.error(blogErrorMessage(error))
    }
  }

  async function upload(file: File) {
    try {
      const image = await blogService.upload(file)
      return image.url
    } catch (error) {
      toast.error(blogErrorMessage(error))
      throw error
    }
  }

  async function refreshTags() {
    setTags(await blogService.tags())
  }

  return {
    connection,
    filters,
    searchInput,
    setSearchInput,
    patchFilters,
    items,
    total,
    totalPages,
    loading,
    tags,
    authors,
    selected,
    setSelected,
    draft,
    setDraft,
    updateDraft,
    settingsOpen,
    setSettingsOpen,
    tagsOpen,
    setTagsOpen,
    previewOpen,
    setPreviewOpen,
    saveState,
    confirmDelete,
    setConfirmDelete,
    openItem,
    createNew,
    save,
    publish,
    unpublish,
    duplicate,
    removeCurrent,
    reloadConflict,
    rowAction,
    bulk,
    upload,
    refreshTags,
    reload: () => loadList(filters),
    readingMinutes,
  }
}
