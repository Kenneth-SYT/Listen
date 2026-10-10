import type { AdminUser } from './adminTypes'

export const adminTimeOptions = Array.from({ length: 96 }, (_, index) => {
  const hours = Math.floor(index / 4)
  const minutes = (index % 4) * 15
  const value = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  const label = new Date(2000, 0, 1, hours, minutes).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })
  return { value, label }
})

export const when = (value: string | null) => value ? new Date(value).toLocaleString('en-AU') : '—'

export const nameFor = (person?: AdminUser) => person
  ? [person.first_name, person.last_name].filter(Boolean).join(' ') || person.email
  : 'Unknown customer'

export const auditLabel = (value: string) => value
  .replaceAll('.', ' ')
  .replaceAll('_', ' ')
  .replace(/\b\w/g, letter => letter.toUpperCase())

export const shortId = (value: string) => value.length > 16 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value

export const auditDetailSummary = (details: Record<string, unknown> | null) => {
  if (!details) return ''
  const identityFields = new Set(['actor_user_id', 'actor_name', 'actor_email', 'target_id', 'target_user_id', 'target_listener_id', 'user_id', 'listener_id', 'email', 'user_email', 'target_email', 'name', 'target_name', 'listener_name'])
  return Object.entries(details)
    .filter(([key, value]) => !identityFields.has(key) && ['string', 'number', 'boolean'].includes(typeof value))
    .slice(0, 3)
    .map(([key, value]) => `${auditLabel(key)}: ${typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}`)
    .join(' · ')
}

