import { ChevronLeft, ChevronRight } from 'lucide-react'

type Props = {
  page: number
  pageSize?: number
  totalItems: number
  onPageChange: (page: number) => void
}

export default function AdminResultsPagination({ page, pageSize = 10, totalItems, onPageChange }: Props) {
  if (!totalItems) return null
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const currentPage = Math.min(page, totalPages)
  const firstItem = (currentPage - 1) * pageSize + 1
  const lastItem = Math.min(currentPage * pageSize, totalItems)

  return <nav className="admin-results-pagination" aria-label="Results pages">
    <span>Showing {firstItem}–{lastItem} of {totalItems}</span>
    <div><button type="button" aria-label="Previous page" disabled={currentPage === 1} onClick={() => onPageChange(Math.max(1, currentPage - 1))}><ChevronLeft /></button><strong>Page {currentPage} of {totalPages}</strong><button type="button" aria-label="Next page" disabled={currentPage === totalPages} onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}><ChevronRight /></button></div>
  </nav>
}
