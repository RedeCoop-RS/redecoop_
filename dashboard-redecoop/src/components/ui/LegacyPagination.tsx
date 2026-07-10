import type { PaginationMeta } from '@/lib/api'

interface LegacyPaginationProps {
  meta?: PaginationMeta
  onPageChange: (page: number) => void
}

export function LegacyPagination({ meta, onPageChange }: LegacyPaginationProps) {
  if (!meta || meta.totalPages <= 1) return null

  const pages = Array.from({ length: meta.totalPages }, (_, index) => index + 1)
  const prev = meta.currentPage > 1 ? meta.currentPage - 1 : null
  const next = meta.currentPage < meta.totalPages ? meta.currentPage + 1 : null

  const changePage = (page: number | null) => {
    if (page !== null && page !== meta.currentPage) onPageChange(page)
  }

  return (
    <nav className="legacy-pagination">
      <ul className="pagination">
        <li className={`page-item${prev ? '' : ' disabled'}`}>
          <button type="button" className="page-link" onClick={() => changePage(prev)}>
            «
          </button>
        </li>
        {pages.map((page) => (
          <li key={page} className={`page-item${page === meta.currentPage ? ' active' : ''}`}>
            <button type="button" className="page-link" onClick={() => changePage(page)}>
              {page}
            </button>
          </li>
        ))}
        <li className={`page-item${next ? '' : ' disabled'}`}>
          <button type="button" className="page-link" onClick={() => changePage(next)}>
            »
          </button>
        </li>
      </ul>
    </nav>
  )
}
