import type { AuditEntry, AuditIdentity } from './adminTypes'
import { auditDetailSummary, auditLabel, when } from './adminUtils'

type Props = {
  entries: AuditEntry[]
  identify: (entry: AuditEntry, kind: 'actor' | 'target') => AuditIdentity
}

export default function AdminAuditSection({ entries, identify }: Props) {
  return <section className="admin-section">
    <div className="admin-section-heading"><div><h2>Audit history</h2><p>See what changed, who it affected, who made the change and when it happened.</p></div><span>{entries.length} events</span></div>
    <div className="admin-table admin-audit-table"><table><thead><tr><th>Action taken</th><th>On who</th><th>By who</th><th>Time</th></tr></thead><tbody>{entries.map(entry => {
      const target = identify(entry, 'target')
      const actor = identify(entry, 'actor')
      const detail = auditDetailSummary(entry.details)
      return <tr key={entry.id}>
        <td><div className="admin-audit-action"><strong>{auditLabel(entry.action)}</strong>{detail && <small>{detail}</small>}<span>{auditLabel(entry.target_type)}</span></div></td>
        <td><div className="admin-audit-identity"><strong>{target.name}</strong><small>{target.detail}</small></div></td>
        <td><div className="admin-audit-identity"><strong>{actor.name}</strong><small>{actor.detail}</small></div></td>
        <td><time className="admin-audit-time" dateTime={entry.created_at}>{when(entry.created_at)}</time></td>
      </tr>
    })}</tbody></table>{!entries.length && <p className="admin-empty">No audited changes yet.</p>}</div>
  </section>
}

