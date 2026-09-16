import { ArrowLeft, ArrowRight, CheckCircle2, LockKeyhole, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { errorMessage, getSupabase, supabase } from '../../lib/supabase'
import { useSession } from '../../lib/useSession'
import './DetailsPage.css'

export type CustomerDetails = {
  firstName: string; lastName: string; preferredName: string; dateOfBirth: string
  mobile: string; email: string; gender: 'male' | 'female' | 'other' | ''
}
type Props = { initialDetails: CustomerDetails; onBack: () => void; onContinue: (details: CustomerDetails) => void }
// Reserved for an optional second factor. Email remains the account identity.
const phoneVerificationEnabled = import.meta.env.VITE_ENABLE_PHONE_VERIFICATION === 'true'
const toInternational = (mobile: string) => '+61' + mobile.slice(1)
const toLocal = (phone: string) => phone.startsWith('+61') ? '0' + phone.slice(3) : phone

function DetailsPage({ initialDetails, onBack, onContinue }: Props) {
  const [details, setDetails] = useState(initialDetails)
  const { session, loading } = useSession()
  const [code, setCode] = useState('')
  const [pendingPhone, setPendingPhone] = useState('')
  const [password, setPassword] = useState('')
  const [accountMode, setAccountMode] = useState<'signup' | 'signin'>('signup')
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false)
  const [message, setMessage] = useState('')
  const [codeMessage, setCodeMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [retryUntil, setRetryUntil] = useState(0)
  const [retrySeconds, setRetrySeconds] = useState(0)
  const verifiedPhone = session?.user.phone_confirmed_at ? toLocal(session.user.phone || '') : ''
  const activeVerifiedPhone = phoneVerificationEnabled ? verifiedPhone : ''
  const verifiedEmail = session?.user.email_confirmed_at ? session.user.email?.toLowerCase() : ''

  useEffect(() => {
    if (!retryUntil) return
    const tick = () => setRetrySeconds(Math.max(0, Math.ceil((retryUntil - Date.now()) / 1000)))
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [retryUntil])
  const update = (field: keyof CustomerDetails, value: string) => setDetails(current => ({ ...current, [field]: value }))

  const sendCode = async () => {
    if (!phoneVerificationEnabled || !session || busy || retrySeconds > 0 || verifiedPhone) return
    if (!/^04\d{8}$/.test(activeVerifiedPhone || details.mobile)) { setMessage('Enter a 10-digit Australian mobile number starting with 04.'); return }
    setBusy(true); setMessage(''); setCodeMessage('')
    const phone = toInternational(details.mobile)
    try {
      const client = getSupabase()
      const { error } = await client.auth.updateUser({ phone })
      if (error) throw error
      setPendingPhone(phone); setCode('')
      setRetryUntil(Date.now() + 60_000)
      setCodeMessage('We sent a verification code to ' + details.mobile + '.')
    } catch (error) {
      if ((error as { status?: number }).status === 429) setRetryUntil(Date.now() + 60_000)
      setMessage(errorMessage(error))
    } finally { setBusy(false) }
  }
  const verifyCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!pendingPhone || busy) return
    setBusy(true); setCodeMessage('')
    try {
      const { data, error } = await getSupabase().auth.verifyOtp({ phone: pendingPhone, token: code, type: 'phone_change' })
      if (error) throw error
      if (!data.user?.phone_confirmed_at || data.user.phone !== pendingPhone) throw new Error('The number could not be verified. Please try again.')
      setDetails(current => ({ ...current, mobile: toLocal(pendingPhone) }))
      setPendingPhone(''); setCode(''); setMessage('Mobile number verified and locked to your account.')
    } catch (error) { setCodeMessage(errorMessage(error)) }
    finally { setBusy(false) }
  }
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy || loading || retrySeconds > 0 || (!session && accountMode === 'signup' && awaitingConfirmation)) return
    const email = (session?.user.email ?? details.email).trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.com$/i.test(email)) { setMessage('Enter an email address ending in .com.'); return }
    if (!/^04\d{8}$/.test(activeVerifiedPhone || details.mobile)) { setMessage('Enter a 10-digit Australian mobile number starting with 04.'); return }
    if (!details.gender) { setMessage('Please select a gender option.'); return }
    setBusy(true); setMessage('')
    try {
      const client = getSupabase()
      if (!session) {
        if (accountMode === 'signup') {
          const { data, error } = await client.auth.signUp({
            email, password,
            options: { emailRedirectTo: window.location.origin + '/get-matched' },
          })
          if (error) throw error
          if (!data.session) {
            setAwaitingConfirmation(true)
            setMessage('Check your email for the confirmation link. After confirming, return to this page and press Continue to booking. If you already have an account, choose Sign in.')
            return
          }
        } else {
          const { error } = await client.auth.signInWithPassword({ email, password })
          if (error) throw error
        }
      }
      // A real Auth user check prevents an unconfirmed email from reaching booking.
      const { data, error } = await client.auth.getUser()
      if (error || !data.user?.email_confirmed_at || data.user.email?.toLowerCase() !== email) {
        throw new Error('Please confirm your email address before continuing.')
      }
      onContinue({ ...details, mobile: activeVerifiedPhone || details.mobile, email })
    } catch (error) {
      const authError = error as { status?: number; message?: string }
      if (authError.status === 429) {
        const seconds = Number(authError.message?.match(/(\d+)\s*seconds?/i)?.[1] ?? 60)
        setRetryUntil(Date.now() + seconds * 1000)
        setMessage('Supabase is temporarily limiting email requests. Check your inbox first in case the account was created, then try again after the timer.')
      } else setMessage(errorMessage(error))
    }
    finally { setBusy(false) }
  }
  return <>
    <form className="details-form" onSubmit={submit}>
      <header className="details-heading"><span className="match-eyebrow">A little about you</span><h1 id="match-heading">Let’s get to know you.</h1><p>We’ll use these details to prepare your booking and contact you about your appointment.</p></header>
      <div className="details-grid">
        <label><span>First name</span><input autoComplete="given-name" value={details.firstName} onChange={event => update('firstName', event.target.value)} required /></label>
        <label><span>Last name</span><input autoComplete="family-name" value={details.lastName} onChange={event => update('lastName', event.target.value)} required /></label>
        <label className="details-wide"><span>Preferred name <small>Optional</small></span><input autoComplete="nickname" value={details.preferredName} onChange={event => update('preferredName', event.target.value)} /></label>
        <label><span>Date of birth</span><input type="date" autoComplete="bday" max={new Date().toISOString().split('T')[0]} value={details.dateOfBirth} onChange={event => update('dateOfBirth', event.target.value)} required /></label>
        <div className="details-mobile-field"><label htmlFor="details-mobile"><span>Mobile</span></label><div className="details-mobile-row"><input id="details-mobile" type="tel" inputMode="numeric" autoComplete="tel" placeholder="04xxxxxxxx" pattern="04[0-9]{8}" title="Enter 10 digits starting with 04" maxLength={10} value={activeVerifiedPhone || details.mobile} onChange={event => update('mobile', event.target.value.replace(/\D/g, '').slice(0, 10))} readOnly={!!activeVerifiedPhone} required />{phoneVerificationEnabled && session && (verifiedPhone ? <span className="details-verified"><CheckCircle2 size={18} /> Verified</span> : <button type="button" onClick={sendCode} disabled={busy || retrySeconds > 0 || !supabase}>{retrySeconds > 0 ? `Retry ${retrySeconds}s` : 'Verify'}</button>)}</div></div>
        <label><span>Email {verifiedEmail && <small>Verified</small>}</span><input type="email" autoComplete="email" placeholder="you@example.com" pattern="[^\s@]+@[^\s@]+\.com" title="Use an email address ending in .com" value={session?.user.email ?? details.email} onChange={event => update('email', event.target.value)} readOnly={!!session} required /></label>
        <label><span>Gender</span><select value={details.gender} onChange={event => update('gender', event.target.value)} required><option value="">Select an option</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></label>
        {!session && <label className="details-wide"><span>{accountMode === 'signup' ? 'Create a password' : 'Your password'}</span><input type="password" autoComplete={accountMode === 'signup' ? 'new-password' : 'current-password'} minLength={8} value={password} onChange={event => setPassword(event.target.value)} required /></label>}
      </div>
      {!session && <button className="details-account-switch" type="button" onClick={() => { setAccountMode(accountMode === 'signup' ? 'signin' : 'signup'); setAwaitingConfirmation(false); setMessage('') }}>{accountMode === 'signup' ? 'Already have an account? Sign in here' : 'New here? Create an account'}</button>}
      <div className="details-privacy"><LockKeyhole size={17} aria-hidden="true" /><span>A verified email address is required before booking. We’ll use your mobile number to contact you about your appointment.</span></div>
      {!supabase && <p role="alert" className="details-message">Online accounts are not configured yet.</p>}
      {message && <p role="status" className="details-message">{message}</p>}
      {retrySeconds > 0 && <p role="status" className="details-message">You can try again in {retrySeconds} seconds.</p>}
      <div className="details-actions"><button type="button" className="details-back" onClick={onBack}><ArrowLeft size={18} /> Back</button><button type="submit" disabled={busy || loading || !supabase || retrySeconds > 0 || (!session && accountMode === 'signup' && awaitingConfirmation)}>{busy ? 'Please wait…' : session ? 'Continue to booking' : awaitingConfirmation && accountMode === 'signup' ? 'Check your email to verify' : accountMode === 'signup' ? 'Create account and continue' : 'Sign in and continue'} <ArrowRight size={18} /></button></div>
    </form>
    {phoneVerificationEnabled && pendingPhone && <div className="details-dialog-backdrop" onClick={() => setPendingPhone('')}><section className="details-dialog" role="dialog" aria-modal="true" aria-labelledby="verification-title" onClick={event => event.stopPropagation()}>
      <button type="button" className="details-dialog-close" aria-label="Close" onClick={() => setPendingPhone('')}><X size={20} /></button><h2 id="verification-title">Verify your mobile</h2><p>Enter the code sent to {toLocal(pendingPhone)}. After verification, this number will be locked to your account.</p>
      <form onSubmit={verifyCode}><label htmlFor="verification-code">Verification code</label><input id="verification-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} autoFocus required /><button type="submit" disabled={busy || code.length !== 6}>{busy ? 'Checking…' : 'Verify code'}</button></form>
      <button type="button" className="details-resend" disabled={busy || retrySeconds > 0} onClick={sendCode}>{retrySeconds ? `Resend in ${retrySeconds}s` : 'Resend code'}</button>{codeMessage && <p role="status" className="details-message">{codeMessage}</p>}
    </section></div>}
  </>
}
export default DetailsPage
