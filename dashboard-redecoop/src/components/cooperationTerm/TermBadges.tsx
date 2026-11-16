import type { CooperationTermModel, CooperationTermStatus } from '@/types/cooperationTerm'
import { modelLabel, statusLabel } from './format'

export function StatusBadge({ status }: { status: CooperationTermStatus }) {
  const signed = status === 'SIGNED'
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${signed ? 'bg-green-soft text-green-dark' : 'bg-yellow-soft text-ink'}`}
    >
      {statusLabel(status)}
    </span>
  )
}

export function ModelBadge({ model }: { model: CooperationTermModel }) {
  return (
    <span className="inline-flex rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-grey-dark ring-1 ring-gray-200">
      {modelLabel(model)}
    </span>
  )
}
