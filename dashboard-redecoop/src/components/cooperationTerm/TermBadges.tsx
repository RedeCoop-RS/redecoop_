import { Layers, PenLine, ShieldCheck } from 'lucide-react'
import type { CooperationTermModel, CooperationTermStatus } from '@/types/cooperationTerm'
import { modelLabel, statusLabel } from './format'

export function StatusBadge({ status }: { status: CooperationTermStatus }) {
  const signed = status === 'SIGNED'
  return (
    <span className={`term-pill ${signed ? 'term-pill--signed' : 'term-pill--draft'}`}>
      {signed ? <ShieldCheck size={13} /> : <PenLine size={13} />}
      {statusLabel(status)}
    </span>
  )
}

export function ModelBadge({ model }: { model: CooperationTermModel }) {
  return (
    <span className="term-pill term-pill--neutral">
      <Layers size={13} />
      {modelLabel(model)}
    </span>
  )
}
