import { formatCapacitySummary, formatSeasonalitySummary } from '@/lib/catalog-format'
import type { PublicCatalogProduct } from '@/types'

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function triggerDownload(filename: string, mime: string, body: string) {
  const blob = new Blob([body], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadCatalogCsv(
  items: PublicCatalogProduct[],
  options: { includeCooperative: boolean },
): void {
  const headers = [
    ...(options.includeCooperative ? ['Cooperativa'] : []),
    'Produto',
    'Tipo',
    'Categoria',
    'Sazonalidade',
    'Quantidade (estimativas)',
  ]
  const lines = [headers.join(';')]

  for (const row of items) {
    const cells = [
      ...(options.includeCooperative ? [row.cooperativeDisplayName] : []),
      row.productName,
      typeof row.productType === 'object' ? row.productType?.name ?? '' : row.productType ?? '',
      typeof row.productCategory === 'object' ? row.productCategory?.name ?? '' : row.productCategory ?? '',
      formatSeasonalitySummary(row),
      formatCapacitySummary(row),
    ].map((c) => `"${String(c).replace(/"/g, '""')}"`)
    lines.push(cells.join(';'))
  }

  const bom = '\uFEFF'
  triggerDownload(
    `redecoop-produtos-${Date.now()}.csv`,
    'text/csv;charset=utf-8;',
    bom + lines.join('\r\n'),
  )
}

export function downloadCatalogExcelXml(
  items: PublicCatalogProduct[],
  options: { includeCooperative: boolean },
): void {
  const headerCells = [
    ...(options.includeCooperative ? ['Cooperativa'] : []),
    'Produto',
    'Tipo',
    'Categoria',
    'Sazonalidade',
    'Quantidade',
  ]

  const headerRow = headerCells
    .map((h) => `<Cell><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`)
    .join('')

  const dataRows = items
    .map((row) => {
      const vals = [
        ...(options.includeCooperative ? [row.cooperativeDisplayName] : []),
        row.productName,
        typeof row.productType === 'object' ? row.productType?.name ?? '' : row.productType ?? '',
        typeof row.productCategory === 'object' ? row.productCategory?.name ?? '' : row.productCategory ?? '',
        formatSeasonalitySummary(row),
        formatCapacitySummary(row),
      ]
      const cells = vals
        .map((v) => `<Cell><Data ss:Type="String">${escapeXml(String(v))}</Data></Cell>`)
        .join('')
      return `<Row>${cells}</Row>`
    })
    .join('')

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="Produtos">
<Table>
<Row>${headerRow}</Row>
${dataRows}
</Table>
</Worksheet>
</Workbook>`

  triggerDownload(`redecoop-produtos-${Date.now()}.xls`, 'application/vnd.ms-excel;charset=utf-8;', xml)
}
