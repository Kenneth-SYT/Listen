import type { AuditEntry, AuditIdentity } from './adminTypes'
import { auditLabel } from './adminUtils'

type Props = {
  entries: AuditEntry[]
  identify: (entry: AuditEntry, kind: 'actor' | 'target') => AuditIdentity
}

export default function AdminAuditSection({ entries, identify }: Props) {
  return <section className="admin-section">
    <div className="admin-section-heading"><div><h2>Audit history</h2><p>See what changed, who it affected, who made the change and the date it happened.</p></div><span>{entries.length} events</span></div>
    <div className="admin-table admin-audit-table"><table><thead><tr><th>Action taken</th><th>On who</th><th>By who</th><th>Date</th></tr></thead><tbody>{entries.map(entry => {
      const target = identify(entry, 'target')
      const actor = identify(entry, 'actor')
      return <tr key={entry.id}>
        <td><strong>{auditLabel(entry.action)}</strong></td>
        <td><strong>{target.name}</strong></td>
        <td><strong>{actor.name}</strong></td>
        <td><time className="admin-audit-time" dateTime={entry.created_at}>{new Date(entry.created_at).toLocaleDateString('en-AU')}</time></td>
      </tr>
    })}</tbody></table>{!entries.length && <p className="admin-empty">No audited changes yet.</p>}</div>
  </section>
}

