import { useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Loader2,
  RefreshCw,
  StopCircle,
  XCircle,
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { formatCnpj } from '@/lib/caf'
import { cafService, type CafSyncJob, type CafSyncResult, type CafVncInfo } from '@/services/misc.service'

interface CafSyncModalProps {
  open: boolean
  onClose: () => void
  onComplete?: () => void
}

const HCAPTCHA_CNPJ = '63431445000146'

function phaseLabel(phase: string) {
  const map: Record<string, string> = {
    init: 'Preparando',
    captcha: 'Verificação humana (hCaptcha)',
    ids: 'Buscando UUIDs CAF',
    uuid_sync: 'Validando UUIDs no banco',
    extratos: 'Baixando extratos PDF',
    mysql: 'Gravando no banco',
  }
  return map[phase] ?? phase
}

function logColor(level: string) {
  if (level === 'error') return 'text-red'
  if (level === 'warn') return 'text-yellow-700'
  if (level === 'success') return 'text-green'
  return 'text-grey-dark'
}

const PHASE_RANGE: Record<string, { start: number; end: number }> = {
  init: { start: 0, end: 5 },
  captcha: { start: 5, end: 12 },
  ids: { start: 12, end: 28 },
  uuid_sync: { start: 28, end: 36 },
  extratos: { start: 36, end: 90 },
  mysql: { start: 90, end: 99 },
}

function computeOverallProgress(job: CafSyncJob | null): number {
  if (!job) return 0
  if (job.status === 'completed') return 100

  const range = PHASE_RANGE[job.phase] ?? { start: 0, end: 5 }
  const { current = 0, total = 0 } = job.progress ?? {}

  if (total > 0 && current >= 0) {
    const intra = Math.min(1, Math.max(0, current / total))
    return Math.round(range.start + intra * (range.end - range.start))
  }

  return range.start
}

function isRunningStatus(status: CafSyncJob['status'] | undefined) {
  return status === 'queued' || status === 'captcha' || status === 'running'
}

export function CafSyncModal({ open, onClose, onComplete }: CafSyncModalProps) {
  const [job, setJob] = useState<CafSyncJob | null>(null)
  const [starting, setStarting] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progressPct, setProgressPct] = useState(0)
  const [vncInfo, setVncInfo] = useState<CafVncInfo | null>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedRef = useRef(false)

  const stopPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const resetState = useCallback(() => {
    stopPoll()
    setJob(null)
    setError(null)
    setProgressPct(0)
    setStarting(false)
    setCancelling(false)
    startedRef.current = false
  }, [stopPoll])

  const pollJob = useCallback(
    (jobId: string) => {
      stopPoll()
      pollRef.current = setInterval(async () => {
        try {
          const updated = await cafService.syncStatus(jobId)
          setJob(updated)
          if (
            updated.status === 'completed' ||
            updated.status === 'failed' ||
            updated.status === 'cancelled'
          ) {
            stopPoll()
            if (updated.status === 'completed') onComplete?.()
          }
        } catch {
          stopPoll()
        }
      }, 1200)
    },
    [onComplete, stopPoll],
  )

  const startSync = useCallback(async () => {
    setStarting(true)
    setError(null)
    setJob(null)
    setProgressPct(0)
    try {
      const started = await cafService.syncStart()
      setJob(started)
      pollJob(started.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao iniciar sincronização')
    } finally {
      setStarting(false)
    }
  }, [pollJob])

  const interruptSync = useCallback(async () => {
    if (!job?.id || !isRunningStatus(job.status)) return
    setCancelling(true)
    try {
      const cancelled = await cafService.syncCancel(job.id)
      setJob(cancelled)
      stopPoll()
      toast.success('Sincronização cancelada.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível cancelar')
    } finally {
      setCancelling(false)
    }
  }, [job, stopPoll])

  const copyCnpj = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(HCAPTCHA_CNPJ)
      toast.success('CNPJ copiado!')
    } catch {
      toast.error('Não foi possível copiar')
    }
  }, [])

  useEffect(() => {
    if (open) {
      cafService.syncVncInfo().then(setVncInfo).catch(() => setVncInfo(null))
      if (!startedRef.current) {
        startedRef.current = true
        startSync()
      }
    } else {
      resetState()
    }
    return () => stopPoll()
  }, [open, resetState, startSync, stopPoll])

  useEffect(() => {
    if (!job) return
    const next = computeOverallProgress(job)
    setProgressPct((prev) => {
      if (job.status === 'completed') return 100
      return Math.max(prev, Math.min(next, 99))
    })
  }, [job])

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' })
  }, [job?.logs.length])

  const running = isRunningStatus(job?.status) || starting
  const showProgress = running || job?.status === 'completed'
  const result = job?.result as CafSyncResult | undefined
  const canClose = !running
  const isCancelled = job?.status === 'cancelled'

  return (
    <Modal
      open={open}
      onClose={canClose ? onClose : () => {}}
      title="Sincronização CAF"
      size="lg"
      panelClassName="caf-sync-modal-scroll"
    >
      <div className="space-y-4">
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red/30 bg-red/5 px-3 py-2 text-sm text-red">
            <XCircle size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {job?.status === 'captcha' && (
          <div className="flex items-start gap-3 rounded-xl border border-yellow/40 bg-yellow/10 px-4 py-3">
            <AlertTriangle size={20} className="mt-0.5 shrink-0 text-yellow-700" />
            <div className="text-sm text-ink">
              <p className="font-semibold">Ação necessária — hCaptcha</p>
              {vncInfo?.mode === 'vnc' ? (
                <>
                  <p className="mt-1 text-grey-dark">
                    Conecte no VNC do servidor, resolva o hCaptcha e pesquise o CNPJ abaixo.
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <code className="rounded-lg bg-white px-3 py-1.5 font-mono text-sm">
                      {formatCnpj(HCAPTCHA_CNPJ)}
                    </code>
                    <Button type="button" variant="secondary" className="!py-1.5" onClick={copyCnpj}>
                      <Copy size={14} />
                      Copiar CNPJ
                    </Button>
                  </div>
                  {vncInfo.tunnel && (
                    <ul className="mt-2 space-y-1 rounded-lg bg-white/80 px-3 py-2 font-mono text-xs text-grey-dark">
                      <li>
                        <span className="text-grey">Túnel SSH:</span> {vncInfo.tunnel}
                      </li>
                      <li>
                        <span className="text-grey">Cliente VNC:</span> localhost:{vncInfo.port}
                      </li>
                    </ul>
                  )}
                </>
              ) : (
                <>
                  <p className="mt-1 text-grey-dark">
                    Um navegador Chromium abrirá na máquina da API. Resolva o hCaptcha e pesquise:
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <code className="rounded-lg bg-white px-3 py-1.5 font-mono text-sm">
                      {formatCnpj(HCAPTCHA_CNPJ)}
                    </code>
                    <Button type="button" variant="secondary" className="!py-1.5" onClick={copyCnpj}>
                      <Copy size={14} />
                      Copiar
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {(job || starting) && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-ink">
                {running && <Loader2 size={16} className="animate-spin text-green" />}
                {job?.status === 'completed' && <CheckCircle2 size={16} className="text-green" />}
                {(job?.status === 'failed' || isCancelled) && (
                  <XCircle size={16} className={isCancelled ? 'text-yellow-700' : 'text-red'} />
                )}
                <span>{job ? phaseLabel(job.phase) : 'Iniciando…'}</span>
              </div>
              {showProgress && (
                <span className="text-xs font-semibold text-grey-dark">{progressPct}%</span>
              )}
            </div>
            {showProgress && (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-green transition-all duration-500 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            )}
            {job?.progress?.message && running && (
              <p className="mt-2 truncate text-xs text-grey">{job.progress.message}</p>
            )}
          </div>
        )}

        <div
          ref={logRef}
          className="dashboard-scroll dashboard-scroll--dark max-h-64 overflow-y-auto rounded-xl border border-gray-200 bg-[#0d1f14] p-3 font-mono text-xs leading-relaxed"
        >
          {(job?.logs ?? []).map((entry, i) => (
            <div key={`${entry.ts}-${i}`} className={`${logColor(entry.level)} py-0.5`}>
              <span className="text-white/40">{new Date(entry.ts).toLocaleTimeString('pt-BR')}</span>{' '}
              {entry.message}
            </div>
          ))}
          {running && (!job?.logs.length || job.logs.length < 2) && (
            <div className="text-white/50">Aguardando logs do processo…</div>
          )}
        </div>

        {job?.status === 'completed' && result && (
          <div className="space-y-3 rounded-xl border border-green/30 bg-green/5 p-4">
            <p className="flex items-center gap-2 font-semibold text-green">
              <CheckCircle2 size={18} />
              CAFs atualizadas com sucesso
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              <Stat label="UUIDs" value={`${result.idsFound}/${result.idsTotal}`} />
              <Stat label="Extratos" value={`${result.extratosOk}`} />
              <Stat label="Inseridos" value={`${result.mysqlInserted}`} />
              <Stat label="Atualizados" value={`${result.mysqlUpdated}`} />
            </div>
            {result.inactive.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-semibold text-yellow-700">
                  Cooperativas sem CAF ativa ({result.inactive.length})
                </p>
                <ul className="dashboard-scroll max-h-36 space-y-1 overflow-y-auto text-sm">
                  {result.inactive.map((c) => (
                    <li
                      key={c.cnpj}
                      className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-1.5"
                    >
                      <div className="min-w-0">
                        <span className="block truncate font-medium">{c.razaoSocial || '—'}</span>
                        <code className="text-xs text-grey">{formatCnpj(c.cnpj)}</code>
                      </div>
                      <span className="badge badge--red shrink-0">{c.situacao}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {isCancelled && (
          <div className="rounded-lg border border-yellow/40 bg-yellow/10 px-3 py-2 text-sm text-yellow-800">
            Sincronização cancelada. Os dados já gravados permanecem no banco.
          </div>
        )}

        {job?.status === 'failed' && job.error && (
          <div className="rounded-lg border border-red/30 bg-red/5 px-3 py-2 text-sm text-red">
            {job.error}
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-4">
          {running && job && (
            <Button variant="danger" onClick={interruptSync} disabled={cancelling}>
              {cancelling ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Cancelando…
                </>
              ) : (
                <>
                  <StopCircle size={16} />
                  Cancelar
                </>
              )}
            </Button>
          )}
          {job?.status === 'failed' && !isCancelled && (
            <Button variant="secondary" onClick={startSync} disabled={starting}>
              <RefreshCw size={16} />
              Tentar novamente
            </Button>
          )}
          <Button onClick={onClose} disabled={!canClose}>
            {job?.status === 'completed' || isCancelled || job?.status === 'failed'
              ? 'Fechar'
              : 'Aguarde…'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white px-3 py-2 text-center">
      <p className="text-xs text-grey">{label}</p>
      <p className="text-lg font-bold text-ink">{value}</p>
    </div>
  )
}
