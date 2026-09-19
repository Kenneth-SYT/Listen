export function bookingPrivacyAction(path: string, search: string, hash: string, bookingActive: boolean, checkoutReturn: boolean): 'clear' | 'email-confirmation' | 'checkout-return' | 'none' {
  if (checkoutReturn && (path === '/booking-confirmation' || path === '/account')) return 'checkout-return'
  if (path === '/get-matched') {
    const query = new URLSearchParams(search)
    const fragment = new URLSearchParams(hash.replace(/^#/, ''))
    if (query.has('code') || query.has('token_hash') || fragment.has('access_token')) return 'email-confirmation'
    return 'clear'
  }
  return bookingActive ? 'clear' : 'none'
}
