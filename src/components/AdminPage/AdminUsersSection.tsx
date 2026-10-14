import { ChevronDown, Search, UserRound } from 'lucide-react'
import { useState } from 'react'
import type { AdminUser, UserRoleFilter } from './adminTypes'
import { nameFor, when } from './adminUtils'
import AdminResultsPagination from './AdminResultsPagination'

type Props = {
  users: AdminUser[]
  search: string
  roleFilter: UserRoleFilter
  roleCounts: Record<UserRoleFilter, number>
  roleBusy: string | null
  onSearch: (value: string) => void
  onRoleFilter: (role: UserRoleFilter) => void
  onChangeRole: (person: AdminUser) => void
}

const roleLabels: Record<UserRoleFilter, string> = { all: 'All accounts', admin: 'Admins', listener: 'Listeners', user: 'Users' }
const pageSize = 10

export default function AdminUsersSection({ users, search, roleFilter, roleCounts, roleBusy, onSearch, onRoleFilter, onChangeRole }: Props) {
  const [page, setPage] = useState(1)
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null)
  const totalPages = Math.max(1, Math.ceil(users.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const visibleUsers = users.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return <section className="admin-section">
    <div className="admin-users-heading">
      <h2>User directory</h2>
      <div className="admin-users-controls-row"><div className="admin-role-filters" role="group" aria-label="Filter users by role">{(['all', 'admin', 'listener', 'user'] as UserRoleFilter[]).map(role => <button type="button" key={role} className={roleFilter === role ? 'active' : ''} aria-pressed={roleFilter === role} onClick={() => { setPage(1); onRoleFilter(role) }}><span>{roleLabels[role]}</span><strong>{roleCounts[role]}</strong></button>)}</div><div className="admin-section-tools"><label className="admin-search"><Search size={17} /><span className="sr-only">Search</span><input value={search} onChange={event => { setPage(1); onSearch(event.target.value) }} placeholder="Search users" /></label><span>{users.length} shown</span></div></div>
    </div>
    <div className="admin-results-container"><div className="admin-results-scroll admin-user-list">{visibleUsers.map(person => {
      const role = person.administrator ? 'admin' : person.listener_name ? 'listener' : 'user'
      const isExpanded = expandedUserId === person.user_id
      return <details className="admin-user-row" key={person.user_id} open={isExpanded}>
        <summary aria-expanded={isExpanded} onClick={event => { event.preventDefault(); setExpandedUserId(isExpanded ? null : person.user_id) }}>
          <div className="admin-user-title"><div className="admin-avatar"><UserRound /></div><div><h3>{nameFor(person)}</h3><p>{person.email}</p></div></div>
          <span className={`admin-role-badge ${role}`}>{role}</span>
          <div className="admin-user-summary"><span><strong>{person.confirmed_booking_count}</strong> confirmed</span><span>Last seen <strong>{when(person.last_sign_in_at)}</strong></span></div>
          <span className="admin-row-disclosure"><span>Details</span><ChevronDown className="admin-user-chevron" aria-hidden="true" /></span>
        </summary>
        <div className="admin-user-details">
          <dl><div><dt>Preferred name</dt><dd>{person.preferred_name || '—'}</dd></div><div><dt>Mobile</dt><dd>{person.mobile || '—'}</dd></div><div><dt>Date of birth</dt><dd>{person.date_of_birth ? new Date(`${person.date_of_birth}T12:00:00`).toLocaleDateString('en-AU') : '—'}</dd></div><div><dt>Gender</dt><dd>{person.gender || '—'}</dd></div><div><dt>Bookings</dt><dd>{person.confirmed_booking_count} confirmed / {person.booking_count} total</dd></div><div><dt>Next session</dt><dd>{when(person.next_booking_at)}</dd></div><div><dt>Account created</dt><dd>{when(person.account_created_at)}</dd></div><div><dt>Email status</dt><dd>{person.email_confirmed_at ? 'Confirmed' : 'Not confirmed'}</dd></div>{person.listener_name && <div><dt>Listener profile</dt><dd>{person.listener_name}</dd></div>}</dl>
          <div className="admin-role-action">{person.administrator ? <small>Administrator access is managed separately.</small> : <><span>{role === 'listener' ? 'Remove listener access and return this account to a regular user.' : 'Give this account listener access and create its listener profile.'}</span><button type="button" disabled={roleBusy !== null} className={role === 'listener' ? 'admin-secondary' : ''} onClick={() => onChangeRole(person)}>{roleBusy === person.user_id ? 'Updating…' : role === 'listener' ? 'Return to user' : 'Make listener'}</button></>}</div>
        </div>
      </details>
    })}{!users.length && <p className="admin-empty">No users match this filter.</p>}</div><AdminResultsPagination page={currentPage} totalItems={users.length} onPageChange={setPage} /></div>
  </section>
}

