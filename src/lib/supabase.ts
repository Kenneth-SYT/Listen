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
export const errorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message
  return 'Something went wrong. Please try again.'
}
export type Listener = {
  id: string; name: string; focus: string; matches: string[]; active?: boolean
  bio?: string; gender?: string; pronouns?: string; languages?: string[]
  profile_image_url?: string | null; profile_status?: 'draft' | 'pending' | 'published' | 'suspended'
}
export type Slot = { id: string; listener_id: string; starts_at: string; ends_at: string; window_id?: string | null }
export type Quote = { rate_code: string; label: string; amount_cents: number; duration_minutes: number }
export type Testimonial = { id: string; quote: string; display_name: string; context: string; sort_order: number; image_path?: string | null; published?: boolean; created_at?: string; updated_at?: string }
export const testimonialImageUrl = (path?: string | null) => path ? getSupabase().storage.from('testimonial-images').getPublicUrl(path).data.publicUrl : ''
export type BookingSelection = { listener: Listener; slot: Slot; quote: Quote; holdToken: string; holdExpiresAt: string; useCredit?: boolean }
export type BundleProduct = { code: string; label: string; session_count: number; amount_cents: number }
export type CreditSummary = { standard_credits: number; eligible_for_bundles: boolean }
export type Appointment = {
  id: string; user_id: string; slot_id: string; listener_id: string; starts_at: string; ends_at: string
  amount_cents: number; rate_code: string; status: 'pending' | 'confirmed' | 'expired'; created_at: string
  checkout_expires_at: string
  paid_with_credit?: boolean
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

export async function createBundleCheckout(productCode: string) {
  const { data, error } = await getSupabase().functions.invoke('create-bundle-checkout', { body: { product_code: productCode } })
  if (error) {
    let message = error.message
    if ('context' in error && error.context instanceof Response) {
      const body = await error.context.json().catch(() => null)
      message = body?.error || message
    }
    throw new Error(message)
  }
  if (!data?.url) throw new Error('Bundle checkout could not be opened. Please try again.')
  return data.url as string
}

export async function reconcileBundleCheckout(sessionId?: string) {
  const { data, error } = await getSupabase().functions.invoke('reconcile-bundle-checkout', { body: { session_id: sessionId } })
  if (error) {
    let message = error.message
    if ('context' in error && error.context instanceof Response) {
      const body = await error.context.json().catch(() => null)
      message = body?.error || message
    }
    throw new Error(message)
  }
  return data as { status: 'pending' | 'paid' | 'expired'; standard_credits: number; added_credits: number; order_id: string | null }
}

export async function bookWithCredit(slotId: string, holdToken: string) {
  const client = getSupabase()
  const { data: pending, error: pendingError } = await client.from('appointments').select('id').eq('status', 'pending')
  if (pendingError) throw new Error(pendingError.message)
  for (const booking of pending || []) await cancelCheckout(booking.id)
  const { data, error } = await client.functions.invoke('book-with-credit', { body: { slot_id: slotId, hold_token: holdToken } })
  if (error) {
    let message = error.message
    if ('context' in error && error.context instanceof Response) {
      const body = await error.context.json().catch(() => null)
      message = body?.error || message
    }
    throw new Error(message)
  }
  return data.booking as Appointment
}
