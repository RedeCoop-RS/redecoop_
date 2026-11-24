import { useEffect, useRef, useState } from 'react'
import { FileSpreadsheet, TriangleAlert, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { ApiError } from '@/lib/api'
import { cooperationTermService } from '@/services/cooperationTerm.service'
import type { CooperationTermDetail, CooperationTermImportPreview, CooperationTermModel } from '@/types/cooperationTerm'
import { formatMoney, formatQty } from './format'

const PREVIEW_LIMIT = 8

export function TermImportModal({
  open,
  termId,
  model,
  existingCount,
  onClose,
  onImported,
}: {
  open: boolean
  termId: number
  model: CooperationTermModel
  existingCount: number
  onClose: () => void
  onImported: (term: CooperationTermDetail) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<CooperationTermImportPreview | null>(null)
  const [error, setError] = useState('')
  const [reading, setReading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [replace, setReplace] = useState(existingCount > 0)

  useEffect(() => {
    if (!open) return
    setFile(null)
    setPreview(null)
    setError('')
    setReading(false)
    setImporting(false)
    setReplace(existingCount > 0)
  }, [open, existingCount])

  const close = () => onClose()

  const readFile = async (next: File) => {
    setFile(next)
    setPreview(null)
    setError('')
    setReading(true)
    try {
      setPreview(await cooperationTermService.previewImport(termId, next))
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Não foi possível ler a planilha.')
    } finally {
      setReading(false)
    }
  }

  const confirmImport = async () => {
    if (!file || !preview || preview.missingQuantity.length > 0) return
    setImporting(true)
    try {
      const updated = await cooperationTermService.importItems(termId, file, existingCount > 0 && replace)
      onImported(updated)
      toast.success(replace && existingCount > 0 ? 'Itens substituídos pela planilha.' : 'Planilha importada.')
      close()
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Não foi possível importar a planilha.')
    } finally {
      setImporting(false)
    }
  }

  const visible = preview?.items.slice(0, PREVIEW_LIMIT) ?? []
  const hidden = preview ? Math.max(preview.items.length - visible.length, 0) : 0
  const blocked = !preview || preview.missingQuantity.length > 0

  return (
    <Modal open={open} onClose={close} title="Importar planilha" size="xl">
      <div className="space-y-4">
        <div className="term-notice term-notice--info">
          <span className="term-notice__icon"><FileSpreadsheet size={18} /></span>
          <div>
            <p className="term-notice__title">Planilha do edital</p>
            <p className="term-notice__text">
              CSV ou Excel, com nº, descrição, unidade e quantidade.
              {model === 'STANDARD' ? ' Valor unitário entra quando a coluna existir.' : ' No GHC, cada coluna extra vira uma unidade hospitalar.'}
              {' '}Cooperativa, cotação e meses não entram aqui.
            </p>
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={(event) => {
            const next = event.target.files?.[0]
            event.target.value = ''
            if (next) void readFile(next)
          }}
        />

        <button type="button" className="term-import__file" onClick={() => fileRef.current?.click()} disabled={reading || importing}>
          <Upload size={16} />
          <span>{file ? file.name : 'Escolher arquivo'}</span>
        </button>

        {reading && <p className="text-sm text-grey-dark">Lendo a planilha...</p>}

        {error && (
          <div className="term-notice term-notice--warn">
            <span className="term-notice__icon"><TriangleAlert size={18} /></span>
            <div>
              <p className="term-notice__title">A planilha não foi importada</p>
              <p className="term-notice__text">{error}</p>
            </div>
          </div>
        )}

        {preview && (
          <>
            <p className="text-sm text-ink">
              <strong>{preview.items.length}</strong> {preview.items.length === 1 ? 'item lido' : 'itens lidos'}.
              {preview.hospitalUnits.length > 0 && model === 'GHC' && ` Unidades: ${preview.hospitalUnits.join(', ')}.`}
              {preview.hospitalUnits.length > 0 && model === 'STANDARD' && ` As colunas ${preview.hospitalUnits.join(', ')} ficam de fora neste modelo padrão.`}
            </p>

            {preview.missingQuantity.length > 0 && (
              <div className="term-notice term-notice--warn">
                <span className="term-notice__icon"><TriangleAlert size={18} /></span>
                <div>
                  <p className="term-notice__title">Falta quantidade</p>
                  <p className="term-notice__text">{preview.missingQuantity.join(', ')}</p>
                </div>
              </div>
            )}

            <div className="term-import__table">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Descrição</th>
                    <th>Un</th>
                    <th>Quantidade</th>
                    {model === 'STANDARD' && <th>Valor unitário</th>}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((item, index) => (
                    <tr key={`${item.itemNumber ?? 's'}-${index}`}>
                      <td>{item.itemNumber ?? '—'}</td>
                      <td>
                        <p>{item.description}</p>
                        {model === 'GHC' && item.hospitalQuantities.length > 0 && (
                          <p className="mt-1 text-xs text-grey-dark">
                            {item.hospitalQuantities.map((qty) => `${qty.hospitalUnitName}: ${formatQty(qty.quantity)}`).join(' · ')}
                          </p>
                        )}
                      </td>
                      <td>{item.unit}</td>
                      <td>{formatQty(item.estimatedQuantity)}</td>
                      {model === 'STANDARD' && <td>{formatMoney(item.unitPrice)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {hidden > 0 && <p className="text-xs text-grey-dark">E mais {hidden} {hidden === 1 ? 'item' : 'itens'}.</p>}

            {existingCount > 0 && (
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="term-choice">
                  <input type="radio" name="term-import-mode" checked={replace} onChange={() => setReplace(true)} />
                  <span>Substituir os {existingCount} itens atuais</span>
                </label>
                <label className="term-choice">
                  <input type="radio" name="term-import-mode" checked={!replace} onChange={() => setReplace(false)} />
                  <span>Acrescentar aos itens atuais</span>
                </label>
              </div>
            )}
          </>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={close} disabled={importing}>Cancelar</Button>
          <Button onClick={confirmImport} disabled={blocked || reading || importing}>
            {importing ? 'Importando...' : 'Importar'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
