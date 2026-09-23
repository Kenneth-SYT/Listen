export function bookingPrivacyAction(path: string, search: string, hash: string, bookingActive: boolean, checkoutReturn: boolean): 'clear' | 'email-confirmation' | 'checkout-return' | 'none' {
  // Stripe's own back link returns to /account, while the browser Back button
  // can restore /get-matched. Both are valid checkout returns and must keep the
  // signed-in account and questionnaire draft intact.
  if (checkoutReturn && (path === '/booking-confirmation' || path === '/account' || path === '/get-matched')) return 'checkout-return'
  if (path === '/get-matched') {
    const query = new URLSearchParams(search)
    const fragment = new URLSearchParams(hash.replace(/^#/, ''))
    if (query.has('code') || query.has('token_hash') || fragment.has('access_token')) return 'email-confirmation'
    if (query.has('resume') || query.has('repeat')) return 'checkout-return'
    return 'clear'
  }
  return bookingActive ? 'clear' : 'none'
}
