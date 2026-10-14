import { SlidersHorizontal } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { AuditEntry, AuditIdentity } from './adminTypes'
import { auditLabel } from './adminUtils'
import AdminResultsPagination from './AdminResultsPagination'

type Props = {
  entries: AuditEntry[]
  identify: (entry: AuditEntry, kind: 'actor' | 'target') => AuditIdentity
}

const dateKey = (value: string) => {
  const date = new Date(value)
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export default function AdminAuditSection({ entries, identify }: Props) {
  const [page, setPage] = useState(1)
  const [actionFilter, setActionFilter] = useState('')
  const [targetFilter, setTargetFilter] = useState('')
  const [actorFilter, setActorFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const pageSize = 10
  const rows = useMemo(() => entries.map(entry => ({ entry, target: identify(entry, 'target'), actor: identify(entry, 'actor') })), [entries, identify])
  const filteredRows = rows.filter(({ entry, target, actor }) =>
    (!actionFilter || entry.action === actionFilter)
    && (!targetFilter || target.name === targetFilter)
    && (!actorFilter || actor.name === actorFilter)
    && (!dateFilter || dateKey(entry.created_at) === dateFilter)
  )
  const actions = Array.from(new Set(rows.map(({ entry }) => entry.action))).sort((a, b) => auditLabel(a).localeCompare(auditLabel(b)))
  const targets = Array.from(new Set(rows.map(({ target }) => target.name))).sort((a, b) => a.localeCompare(b))
  const actors = Array.from(new Set(rows.map(({ actor }) => actor.name))).sort((a, b) => a.localeCompare(b))
  const activeFilterCount = [actionFilter, targetFilter, actorFilter, dateFilter].filter(Boolean).length
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const visibleRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return <section className="admin-section admin-audit-section">
    <div className="admin-section-heading"><div><h2>Audit history</h2><p>See what changed, who it affected, who made the change and when it happened.</p></div><div className="admin-audit-heading-tools"><span className="admin-audit-event-count"><strong>{filteredRows.length}</strong> {filteredRows.length === 1 ? 'event' : 'events'}</span><details className="admin-booking-filter-menu admin-audit-filter-menu"><summary><SlidersHorizontal />Filter{activeFilterCount > 0 && <b>{activeFilterCount}</b>}</summary><div className="admin-booking-filter-popover"><div><strong>Filter audit history</strong><small>Narrow events by action, person, administrator, or date.</small></div><div className="admin-booking-filters"><label><span>Action</span><select value={actionFilter} onChange={event => { setPage(1); setActionFilter(event.target.value) }}><option value="">All actions</option>{actions.map(action => <option key={action} value={action}>{auditLabel(action)}</option>)}</select></label><label><span>On who</span><select value={targetFilter} onChange={event => { setPage(1); setTargetFilter(event.target.value) }}><option value="">Everyone</option>{targets.map(target => <option key={target} value={target}>{target}</option>)}</select></label><label><span>By who</span><select value={actorFilter} onChange={event => { setPage(1); setActorFilter(event.target.value) }}><option value="">Everyone</option>{actors.map(actor => <option key={actor} value={actor}>{actor}</option>)}</select></label><label><span>Date</span><input type="date" value={dateFilter} onChange={event => { setPage(1); setDateFilter(event.target.value) }} /></label><button type="button" disabled={!activeFilterCount} onClick={() => { setPage(1); setActionFilter(''); setTargetFilter(''); setActorFilter(''); setDateFilter('') }}>Clear filters</button></div></div></details></div></div>
    <div className="admin-results-container"><div className="admin-results-scroll admin-table admin-audit-table"><table><thead><tr><th>Action taken</th><th>On who</th><th>By who</th><th>Date and time</th></tr></thead><tbody>{visibleRows.map(({ entry, target, actor }) => {
      return <tr key={entry.id}>
        <td><strong>{auditLabel(entry.action)}</strong></td>
        <td><strong>{target.name}</strong></td>
        <td><strong>{actor.name}</strong></td>
        <td><time className="admin-audit-time" dateTime={entry.created_at}>{new Date(entry.created_at).toLocaleString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</time></td>
      </tr>
    })}</tbody></table>{!filteredRows.length && <p className="admin-empty">{entries.length ? 'No audit events match these filters.' : 'No audited changes yet.'}</p>}</div><AdminResultsPagination page={currentPage} totalItems={filteredRows.length} onPageChange={setPage} /></div>
  </section>
}

