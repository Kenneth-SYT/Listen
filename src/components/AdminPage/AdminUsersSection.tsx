import { Search, UserRound } from 'lucide-react'
import type { AdminUser, UserRoleFilter } from './adminTypes'
import { nameFor, when } from './adminUtils'

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

export default function AdminUsersSection({ users, search, roleFilter, roleCounts, roleBusy, onSearch, onRoleFilter, onChangeRole }: Props) {
  return <section className="admin-section">
    <div className="admin-section-heading"><div><h2>User directory</h2><p>View account status and manage listener access without opening every profile.</p></div><div className="admin-section-tools"><label className="admin-search"><Search size={17} /><span className="sr-only">Search</span><input value={search} onChange={event => onSearch(event.target.value)} placeholder="Search users" /></label><span>{users.length} shown</span></div></div>
    <div className="admin-role-filters" role="group" aria-label="Filter users by role">{(['all', 'admin', 'listener', 'user'] as UserRoleFilter[]).map(role => <button type="button" key={role} className={roleFilter === role ? 'active' : ''} aria-pressed={roleFilter === role} onClick={() => onRoleFilter(role)}><span>{roleLabels[role]}</span><strong>{roleCounts[role]}</strong></button>)}</div>
    <div className="admin-user-list">{users.map(person => {
      const role = person.administrator ? 'admin' : person.listener_name ? 'listener' : 'user'
      return <article className="admin-user-row" key={person.user_id}>
        <div className="admin-user-title"><div className="admin-avatar"><UserRound /></div><div><h3>{nameFor(person)}</h3><p>{person.email}</p></div></div>
        <span className={`admin-role-badge ${role}`}>{role}</span>
        <div className="admin-user-summary"><span><strong>{person.confirmed_booking_count}</strong> confirmed</span><span>Last seen <strong>{when(person.last_sign_in_at)}</strong></span></div>
        <div className="admin-role-action">{person.administrator ? <small>Administrator access is managed separately</small> : <button type="button" disabled={roleBusy !== null} className={role === 'listener' ? 'admin-secondary' : ''} onClick={() => onChangeRole(person)}>{roleBusy === person.user_id ? 'Updating…' : role === 'listener' ? 'Return to user' : 'Make listener'}</button>}</div>
        <details><summary>View profile details</summary><dl><div><dt>Preferred name</dt><dd>{person.preferred_name || '—'}</dd></div><div><dt>Mobile</dt><dd>{person.mobile || '—'}</dd></div><div><dt>Date of birth</dt><dd>{person.date_of_birth ? new Date(`${person.date_of_birth}T12:00:00`).toLocaleDateString('en-AU') : '—'}</dd></div><div><dt>Gender</dt><dd>{person.gender || '—'}</dd></div><div><dt>Bookings</dt><dd>{person.confirmed_booking_count} confirmed / {person.booking_count} total</dd></div><div><dt>Next session</dt><dd>{when(person.next_booking_at)}</dd></div><div><dt>Account created</dt><dd>{when(person.account_created_at)}</dd></div><div><dt>Email status</dt><dd>{person.email_confirmed_at ? 'Confirmed' : 'Not confirmed'}</dd></div>{person.listener_name && <div><dt>Listener profile</dt><dd>{person.listener_name}</dd></div>}</dl></details>
      </article>
    })}{!users.length && <p className="admin-empty">No users match this filter.</p>}</div>
  </section>
}

