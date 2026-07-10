import { Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { BUSINESS_MONTHS, BUSINESS_YEARS, buildDateFilter } from '@/lib/business'

export function OpportunityAdminFilters({
  filterYear,
  filterMonth,
  filterShowInactive,
  onYearChange,
  onMonthChange,
  onShowInactiveChange,
  onApply,
  inactiveLabel = 'Mostrar Inativos',
}: {
  filterYear: string
  filterMonth: string
  filterShowInactive: boolean
  onYearChange: (value: string) => void
  onMonthChange: (value: string) => void
  onShowInactiveChange: (value: boolean) => void
  onApply: () => void
  inactiveLabel?: string
}) {
  return (
    <div className="opportunity-filters">
      <Select
        label="Ano"
        value={filterYear}
        onChange={(e) => {
          onYearChange(e.target.value)
          if (!e.target.value) onMonthChange('')
        }}
        placeholder="Qualquer"
        options={BUSINESS_YEARS.map((y) => ({ value: y, label: y }))}
      />
      <Select
        label="Mês"
        value={filterMonth}
        onChange={(e) => onMonthChange(e.target.value)}
        placeholder="Qualquer"
        disabled={!filterYear}
        options={BUSINESS_MONTHS.map((m, i) => ({ value: String(i), label: m }))}
      />
      <label className="business-filters__check">
        <input
          type="checkbox"
          checked={filterShowInactive}
          onChange={(e) => onShowInactiveChange(e.target.checked)}
        />
        <span>{inactiveLabel}</span>
      </label>
      <Button onClick={onApply} className="business-filters__btn">
        <Search size={16} />
        Filtrar
      </Button>
    </div>
  )
}

export function buildOpportunityDateFilter(year: string, month: string) {
  return buildDateFilter(year, month)
}
