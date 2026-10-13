import { Clock3 } from 'lucide-react'
import type { FormEvent } from 'react'
import { money, type Quote } from '../../lib/supabase'

type Props = {
  rates: Quote[]
  busy: boolean
  onSave: (event: FormEvent<HTMLFormElement>) => void
}

const descriptions: Record<string, string> = {
  intro: 'The first introductory conversation for a new customer.',
  standard: 'The regular 50-minute peer-support session.',
  extended: 'A longer two-hour support session.',
}

export default function AdminPricingSection({ rates, busy, onSave }: Props) {
  return <section className="admin-section admin-pricing-section">
    <div className="admin-section-heading"><div><h2>Session pricing</h2><p>Manage the prices shown publicly and charged for new bookings.</p></div><span>{rates.length} rates</span></div>
    <div className="admin-pricing-grid">{rates.map(rate => <form className="admin-pricing-card" key={`${rate.rate_code}-${rate.amount_cents}`} onSubmit={onSave}>
      <input type="hidden" name="code" value={rate.rate_code} />
      <header><span>{rate.label}</span><small><Clock3 />{rate.duration_minutes === 120 ? '2 hours' : `${rate.duration_minutes} minutes`}</small></header>
      <div className="admin-pricing-current"><small>Current price</small><strong>{money(rate.amount_cents)}</strong><span>AUD per session</span></div>
      <p>{descriptions[rate.rate_code] || 'Session rate used for new bookings.'}</p>
      <label>New price (AUD)<input name="amount" type="number" min="1" step="0.01" defaultValue={(rate.amount_cents / 100).toFixed(2)} required /></label>
      <button disabled={busy}>{busy ? 'Updating…' : 'Update price'}</button>
    </form>)}{!rates.length && <p className="admin-empty">No session rates are available.</p>}</div>
    <p className="admin-pricing-note">Price changes appear on the homepage and pricing page and apply when a new payment quote is created. Existing completed payments are unchanged.</p>
  </section>
}
