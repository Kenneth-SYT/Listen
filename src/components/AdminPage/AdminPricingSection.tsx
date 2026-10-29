import { Clock3, Layers3 } from 'lucide-react'
import type { FormEvent } from 'react'
import { money, type BundleProduct, type Quote } from '../../lib/supabase'

type Props = {
  rates: Quote[]
  bundles: BundleProduct[]
  busy: boolean
  onSaveRate: (event: FormEvent<HTMLFormElement>) => void
  onSaveBundle: (event: FormEvent<HTMLFormElement>) => void
}

const descriptions: Record<string, string> = {
  intro: 'The first introductory conversation for a new customer.',
  standard: 'The regular 50-minute peer-support session.',
  extended: 'A longer two-hour support session.',
}

export default function AdminPricingSection({ rates, bundles, busy, onSaveRate, onSaveBundle }: Props) {
  return <section className="admin-section admin-pricing-section">
    <div className="admin-section-heading"><div><h2>Session pricing</h2><p>Manage the prices shown publicly and charged for new bookings.</p></div><span>{rates.length} rates</span></div>
    <div className="admin-pricing-grid">{rates.map(rate => <form className="admin-pricing-card" key={`${rate.rate_code}-${rate.amount_cents}`} onSubmit={onSaveRate}>
      <input type="hidden" name="code" value={rate.rate_code} />
      <header><span>{rate.label}</span><small><Clock3 />{rate.duration_minutes === 120 ? '2 hours' : `${rate.duration_minutes} minutes`}</small></header>
      <div className="admin-pricing-current"><small>Current price</small><strong>{money(rate.amount_cents)}</strong><span>AUD per session</span></div>
      <p>{descriptions[rate.rate_code] || 'Session rate used for new bookings.'}</p>
      <label>New price (AUD)<input name="amount" type="number" min="1" step="0.01" defaultValue={(rate.amount_cents / 100).toFixed(2)} required /></label>
      <button disabled={busy}>{busy ? 'Updating…' : 'Update price'}</button>
    </form>)}{!rates.length && <p className="admin-empty">No session rates are available.</p>}</div>
    <div className="admin-section-heading admin-pricing-subheading"><div><h2>Bundle pricing</h2><p>Manage the prepaid standard-session bundles shown on the pricing page.</p></div><span>{bundles.length} bundles</span></div>
    <div className="admin-pricing-grid admin-bundle-pricing-grid">{bundles.map(bundle => <form className="admin-pricing-card" key={`${bundle.code}-${bundle.amount_cents}`} onSubmit={onSaveBundle}>
      <input type="hidden" name="code" value={bundle.code} />
      <header><span>{bundle.label}</span><small><Layers3 />{bundle.session_count} sessions</small></header>
      <div className="admin-pricing-current"><small>Current price</small><strong>{money(bundle.amount_cents)}</strong><span>AUD per bundle</span></div>
      <p>{money(Math.round(bundle.amount_cents / bundle.session_count))} per standard session.</p>
      <label>New bundle price (AUD)<input name="amount" type="number" min="1" step="0.01" defaultValue={(bundle.amount_cents / 100).toFixed(2)} required /></label>
      <button disabled={busy}>{busy ? 'Updating…' : 'Update bundle price'}</button>
    </form>)}{!bundles.length && <p className="admin-empty">No session bundles are available.</p>}</div>
    <p className="admin-pricing-note">Changes appear on the public pricing page and apply to newly created Stripe checkouts. Existing and already-open payments keep their original amount.</p>
  </section>
}
