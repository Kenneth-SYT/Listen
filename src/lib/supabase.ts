import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
// Booking accounts stay in this tab. A new tab must never inherit the previous
// customer's identity on a shared device.
if (url && typeof window !== 'undefined') {
  try { window.localStorage.removeItem(`sb-${new URL(url).hostname.split('.')[0]}-auth-token`) } catch { /* Storage can be unavailable in private browsing. */ }
}
export const supabase = url && key ? createClient(url, key, {
  auth: { storage: typeof window !== 'undefined' ? window.sessionStorage : undefined },
}) : null
export function getSupabase() {
  if (!supabase) throw new Error('Online booking is not configured yet. Please contact us to arrange a session.')
  return supabase
}
export const money = (cents: number) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(cents / 100)
export const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Something went wrong. Please try again.'
export type Listener = { id: string; name: string; focus: string; matches: string[] }
export type Slot = { id: string; listener_id: string; starts_at: string; ends_at: string }
export type Quote = { rate_code: string; label: string; amount_cents: number; duration_minutes: number }
export type BookingSelection = { listener: Listener; slot: Slot; quote: Quote; holdToken: string; holdExpiresAt: string }
export type Appointment = {
  id: string; user_id: string; slot_id: string; listener_id: string; starts_at: string; ends_at: string
  amount_cents: number; rate_code: string; status: 'pending' | 'confirmed' | 'expired'; created_at: string
  checkout_expires_at: string
}
export async function createCheckout(slotId: string, holdToken?: string, rateCode?: string) {
  const { data, error } = await getSupabase().functions.invoke('create-checkout', { body: { slot_id: slotId, hold_token: holdToken, rate_code: rateCode } })
  if (error) {
    let message = error.message
    if ('context' in error && error.context instanceof Response) {
      const body = await error.context.json().catch(() => null)
      message = body?.error || message
    }
    throw new Error(message)
  }
  if (!data?.url) throw new Error('Checkout could not be opened. Please try again.')
  return data.url as string
}

export async function cancelCheckout(bookingId: string) {
  const { data, error } = await getSupabase().functions.invoke('cancel-checkout', { body: { booking_id: bookingId } })
  if (error) {
    let message = error.message
    if ('context' in error && error.context instanceof Response) {
      const body = await error.context.json().catch(() => null)
      message = body?.error || message
    }
    throw new Error(message)
  }
  return data
}
