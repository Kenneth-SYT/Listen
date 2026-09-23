import { ArrowLeft, ArrowRight, CheckCircle2, LoaderCircle, LockKeyhole, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { createCheckout, errorMessage, getSupabase, money, supabase, type BookingSelection, type Quote } from '../../lib/supabase'
import { wellbeingScore, wellbeingScoreLabel, type IntakeAnswers } from '../../lib/intake'
import { useSession } from '../../lib/useSession'
import './DetailsPage.css'

export type CustomerDetails = {
  firstName: string; lastName: string; preferredName: string; dateOfBirth: string
  mobile: string; email: string; gender: 'male' | 'female' | 'other' | ''
}
type Props = { initialDetails: CustomerDetails; selection: BookingSelection; answers: IntakeAnswers; onBack: () => void; onDetailsChange: (details: CustomerDetails) => void }
// Reserved for an optional second factor. Email remains the account identity.
const phoneVerificationEnabled = import.meta.env.VITE_ENABLE_PHONE_VERIFICATION === 'true'
// Temporary launch setting. Set VITE_REQUIRE_EMAIL_VERIFICATION=true to restore
// confirmation-link enforcement without changing this flow.
const emailVerificationRequired = import.meta.env.VITE_REQUIRE_EMAIL_VERIFICATION === 'true'
const toInternational = (mobile: string) => '+61' + mobile.slice(1)
const toLocal = (phone: string) => phone.startsWith('+61') ? '0' + phone.slice(3) : phone

function DetailsPage({ initialDetails, selection, answers, onBack, onDetailsChange }: Props) {
  const [details, setDetails] = useState(initialDetails)
  const { session, loading } = useSession()
  const [code, setCode] = useState('')
  const [pendingPhone, setPendingPhone] = useState('')
  const [password, setPassword] = useState('')
  const [displayQuote, setDisplayQuote] = useState(selection.quote)
  const [accountMode, setAccountMode] = useState<'signup' | 'signin'>('signup')
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false)
  const [emailInUse, setEmailInUse] = useState(false)
  const [duplicateEmail, setDuplicateEmail] = useState('')
  const [accountCreatedThisVisit, setAccountCreatedThisVisit] = useState(false)
  const [message, setMessage] = useState('')
  const [checkoutError, setCheckoutError] = useState('')
  const [codeMessage, setCodeMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [retryUntil, setRetryUntil] = useState(0)
  const [retrySeconds, setRetrySeconds] = useState(0)
  const [holdSeconds, setHoldSeconds] = useState(0)
  const [holdValid, setHoldValid] = useState(false)
  const [holdChecking, setHoldChecking] = useState(true)
  const verifiedPhone = session?.user.phone_confirmed_at ? toLocal(session.user.phone || '') : ''
  const activeVerifiedPhone = phoneVerificationEnabled ? verifiedPhone : ''
  const verifiedEmail = session?.user.email_confirmed_at ? session.user.email?.toLowerCase() : ''
  const signinOnly = !session && accountMode === 'signin'
  const duplicateEmailEntered = emailInUse && details.email.trim().toLowerCase() === duplicateEmail
  const holdTime = `${String(Math.floor(holdSeconds / 60)).padStart(2, '0')}:${String(holdSeconds % 60).padStart(2, '0')}`

  useEffect(() => {
    const tick = () => setHoldSeconds(Math.max(0, Math.ceil((Date.parse(selection.holdExpiresAt) - Date.now()) / 1000)))
    const initial = window.setTimeout(tick, 0)
    const timer = window.setInterval(tick, 1000)
    return () => { window.clearTimeout(initial); window.clearInterval(timer) }
  }, [selection.holdExpiresAt])
  useEffect(() => {
    if (Date.parse(selection.holdExpiresAt) <= Date.now()) return
    let active = true
    void Promise.resolve(getSupabase().rpc('claim_slot_hold', { p_slot: selection.slot.id, p_token: selection.holdToken })).then(({ data, error }) => {
      if (!active) return
      setHoldValid(!error && data === selection.holdExpiresAt)
      if (error) setMessage(errorMessage(error))
    }).catch(error => { if (active) { setHoldValid(false); setMessage(errorMessage(error)) } }).finally(() => { if (active) setHoldChecking(false) })
    return () => { active = false }
  }, [selection.slot.id, selection.holdToken, selection.holdExpiresAt])
  useEffect(() => {
    if (!retryUntil) return
    const tick = () => setRetrySeconds(Math.max(0, Math.ceil((retryUntil - Date.now()) / 1000)))
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [retryUntil])
  useEffect(() => {
    if (!session?.user.id) return
    let active = true
    void getSupabase().rpc('booking_quote', { p_rate_code: selection.quote.rate_code }).then(({ data, error }) => {
      if (active && !error && data) setDisplayQuote(data as Quote)
    })
    return () => { active = false }
  }, [session?.user.id, selection.quote.rate_code])
  useEffect(() => {
    if (!session?.user.id) return
    let active = true
    void getSupabase().from('profiles').select('first_name,last_name,preferred_name,date_of_birth,mobile,contact_email,gender').eq('id', session.user.id).maybeSingle().then(({ data }) => {
      if (!active || !data) return
      setDetails(current => {
        const next: CustomerDetails = {
          firstName: current.firstName || data.first_name, lastName: current.lastName || data.last_name,
          preferredName: current.preferredName || data.preferred_name, dateOfBirth: current.dateOfBirth || data.date_of_birth,
          mobile: current.mobile || data.mobile, email: session.user.email || data.contact_email,
          gender: current.gender || data.gender || '',
        }
        onDetailsChange(next)
        return next
      })
    })
    return () => { active = false }
  }, [session?.user.id, session?.user.email, onDetailsChange])
  const backToBooking = async () => {
    await getSupabase().rpc('release_slot_hold', { p_token: selection.holdToken })
    onBack()
  }
  const switchAccount = async () => {
    if (busy) return
    setBusy(true); setMessage(''); setCheckoutError('')
    try {
      const { error } = await getSupabase().auth.signOut({ scope: 'local' })
      if (error) throw error
      const emptyDetails: CustomerDetails = { firstName: '', lastName: '', preferredName: '', dateOfBirth: '', mobile: '', email: '', gender: '' }
      setDetails(emptyDetails); onDetailsChange(emptyDetails)
      setAccountMode('signin'); setPassword(''); setAwaitingConfirmation(false); setEmailInUse(false); setDuplicateEmail(''); setAccountCreatedThisVisit(false)
    } catch (error) { setMessage(errorMessage(error)) }
    finally { setBusy(false) }
  }
  const update = (field: keyof CustomerDetails, value: string) => {
    if (field === 'email' && emailInUse && value.trim().toLowerCase() !== duplicateEmail) {
      setEmailInUse(false); setDuplicateEmail(''); setMessage('')
    }
    setDetails(current => { const next = { ...current, [field]: value }; onDetailsChange(next); return next })
  }

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
    if (busy || loading || retrySeconds > 0 || holdSeconds <= 0 || !holdValid || holdChecking || (!session && accountMode === 'signup' && awaitingConfirmation)) return
    const email = (session?.user.email ?? details.email).trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.com$/i.test(email)) { setMessage('Enter an email address ending in .com.'); return }
    if (!session && accountMode === 'signup' && emailInUse && email === duplicateEmail) {
      setMessage('Email already exists. Try signing in, or enter a different email to create a new account.')
      return
    }
    if (session || accountMode === 'signup') {
      if (!/^04\d{8}$/.test(activeVerifiedPhone || details.mobile)) { setMessage('Enter a 10-digit Australian mobile number starting with 04.'); return }
      const eighteenthBirthday = new Date(details.dateOfBirth + 'T00:00:00')
      eighteenthBirthday.setFullYear(eighteenthBirthday.getFullYear() + 18)
      if (!details.dateOfBirth || eighteenthBirthday > new Date()) { setMessage('You must be at least 18 to book a session.'); return }
    }
    setBusy(true); setMessage(''); setCheckoutError('')
    let openingCheckout = false
    try {
      const client = getSupabase()
      if (!session) {
        if (accountMode === 'signup') {
          const { data, error } = await client.auth.signUp({
            email, password,
            options: { emailRedirectTo: window.location.origin + '/get-matched' },
          })
          if (error && /already|registered|exists/i.test(error.message)) {
            setEmailInUse(true)
            setDuplicateEmail(email)
            setMessage('Email already exists. Try signing in, or enter a different email to create a new account.')
            return
          }
          if (error) throw error
          if (data.user && data.user.identities?.length === 0) {
            setEmailInUse(true)
            setDuplicateEmail(email)
            setMessage('Email already exists. Try signing in, or enter a different email to create a new account.')
            return
          }
          if (!data.session) {
            if (emailVerificationRequired) {
              setAwaitingConfirmation(true)
              setMessage('Check your email for the confirmation link. After confirming, return to this tab and choose “Already a member? Sign in” to continue before your hold expires.')
            } else {
              setMessage('Account creation is waiting for Supabase email confirmation to be disabled. In Supabase, turn off “Confirm email” under Authentication settings, then try again.')
            }
            return
          }
          setAccountCreatedThisVisit(true)
        } else {
          const { error } = await client.auth.signInWithPassword({ email, password })
          if (error) throw error
          setMessage('Signed in. Review your details, then continue to payment.')
          return
        }
      }
      // A real Auth user check prevents an unconfirmed email from reaching booking.
      const { data, error } = await client.auth.getUser()
      if (error || !data.user || data.user.email?.toLowerCase() !== email || (emailVerificationRequired && !data.user.email_confirmed_at)) {
        throw new Error(emailVerificationRequired ? 'Please confirm your email address before continuing.' : 'We could not verify the signed-in account. Please sign in again.')
      }
      const { data: currentQuote, error: quoteError } = await client.rpc('booking_quote', { p_rate_code: selection.quote.rate_code })
      if (quoteError) throw quoteError
      if (!currentQuote) throw new Error('Could not check your current rate.')
      if (currentQuote.amount_cents !== displayQuote.amount_cents || currentQuote.duration_minutes !== displayQuote.duration_minutes) {
        setDisplayQuote(currentQuote as Quote)
        setMessage('Your rate has been updated for this account. Please review the new total and continue again.')
        return
      }
      const savedDetails = { ...details, mobile: activeVerifiedPhone || details.mobile, email }
      const { error: profileError } = await client.from('profiles').upsert({
        id: data.user.id, first_name: savedDetails.firstName.trim(), last_name: savedDetails.lastName.trim(),
        preferred_name: savedDetails.preferredName.trim(), date_of_birth: savedDetails.dateOfBirth,
        mobile: savedDetails.mobile.trim(), contact_email: email, gender: savedDetails.gender || null,
      })
      if (profileError) throw profileError
      const { error: intakeError } = await client.rpc('save_intake', {
        p_slot: selection.slot.id, p_listener_gender: answers.listenerGender,
        p_topics: answers.topics, p_k6: answers.k6, p_note: answers.note.trim(),
        p_questionnaire_type: answers.questionnaire, p_k10: answers.k10,
        p_impact_score: answers.long.impact,
        p_long_answers: answers.questionnaire === 'long' ? answers.long : {},
      })
      if (intakeError) throw intakeError
      if (wellbeingScore(answers) === null) throw new Error('Complete the wellbeing check-in before payment.')
      openingCheckout = true
      const checkoutUrl = await createCheckout(selection.slot.id, selection.holdToken, selection.quote.rate_code)
      sessionStorage.setItem('listen-checkout-return', '1')
      window.location.assign(checkoutUrl)
    } catch (error) {
      const authError = error as { status?: number; message?: string }
      if (authError.status === 429) {
        const seconds = Number(authError.message?.match(/(\d+)\s*seconds?/i)?.[1] ?? 60)
        setRetryUntil(Date.now() + seconds * 1000)
        setMessage('Supabase is temporarily limiting email requests. Check your inbox first in case the account was created, then try again after the timer.')
      } else if (openingCheckout) setCheckoutError(errorMessage(error))
      else setMessage(errorMessage(error))
    }
    finally { setBusy(false) }
  }
  return <>
    <div className="details-layout"><form className="details-form" onSubmit={submit}>
      <header className="details-heading"><span className="match-eyebrow">Final step before payment</span><h1 id="match-heading">{signinOnly ? 'Welcome back.' : session ? 'Confirm your details.' : 'Create your account.'}</h1><p>{signinOnly ? 'Sign in to continue with the time you selected.' : 'We’ll use these details to prepare your booking and contact you about your appointment.'}</p>
        {session && <div className="details-signed-in"><CheckCircle2 size={20} aria-hidden="true" /><span>{accountCreatedThisVisit ? 'Account created' : 'Signed in'} as <strong>{session.user.email}</strong></span><button type="button" onClick={switchAccount} disabled={busy}>Use another account</button></div>}
      </header>
      <div className="details-grid">
        {!signinOnly && <>
        <label><span>First name</span><input autoComplete="given-name" value={details.firstName} onChange={event => update('firstName', event.target.value)} required /></label>
        <label><span>Last name</span><input autoComplete="family-name" value={details.lastName} onChange={event => update('lastName', event.target.value)} required /></label>
        <label className="details-wide"><span>Preferred name <small>Optional</small></span><input autoComplete="nickname" value={details.preferredName} onChange={event => update('preferredName', event.target.value)} /></label>
        <label><span>Date of birth</span><input type="date" autoComplete="bday" max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]} value={details.dateOfBirth} onChange={event => update('dateOfBirth', event.target.value)} required /></label>
        <div className="details-mobile-field"><label htmlFor="details-mobile"><span>Mobile</span></label><div className="details-mobile-row"><input id="details-mobile" type="tel" inputMode="numeric" autoComplete="tel" placeholder="04xxxxxxxx" pattern="04[0-9]{8}" title="Enter 10 digits starting with 04" maxLength={10} value={activeVerifiedPhone || details.mobile} onChange={event => update('mobile', event.target.value.replace(/\D/g, '').slice(0, 10))} readOnly={!!activeVerifiedPhone} required />{phoneVerificationEnabled && session && (verifiedPhone ? <span className="details-verified"><CheckCircle2 size={18} /> Verified</span> : <button type="button" onClick={sendCode} disabled={busy || retrySeconds > 0 || !supabase}>{retrySeconds > 0 ? `Retry ${retrySeconds}s` : 'Verify'}</button>)}</div></div>
        </>}
        <label className={verifiedEmail ? 'details-email-verified' : duplicateEmailEntered ? 'details-email-error' : ''}><span>Email {verifiedEmail && <small><LockKeyhole size={13} aria-hidden="true" /> Signed in and locked</small>}</span><span className="details-email-input"><input type="email" autoComplete="email" placeholder="you@example.com" pattern="[^\s@]+@[^\s@]+\.com" title={verifiedEmail ? 'Signed-in email. Use another account to change it.' : 'Use an email address ending in .com'} value={session?.user.email ?? details.email} onChange={event => update('email', event.target.value)} readOnly={!!session} aria-invalid={duplicateEmailEntered || undefined} aria-describedby={verifiedEmail ? 'details-email-help' : duplicateEmailEntered ? 'details-email-error' : undefined} required />{verifiedEmail && <LockKeyhole size={18} aria-hidden="true" />}</span>{verifiedEmail && <small id="details-email-help" className="details-email-help">This signed-in email can’t be edited here. <button type="button" onClick={switchAccount} disabled={busy}>Use another account</button> to use a different address.</small>}</label>
        {!signinOnly &&
        <label><span>Gender <small>Optional</small></span><select value={details.gender} onChange={event => update('gender', event.target.value)}><option value="">Prefer not to say</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></label>
        }
        {!session && <label className="details-wide"><span>{accountMode === 'signup' ? 'Create a password' : 'Your password'}</span><input type="password" autoComplete={accountMode === 'signup' ? 'new-password' : 'current-password'} minLength={8} value={password} onChange={event => setPassword(event.target.value)} required /></label>}
      </div>
      {!supabase && <p role="alert" className="details-message">Online accounts are not configured yet.</p>}
      {!session && <div className="details-existing-account"><span>Already have an account?</span><a href="/login">Sign in</a></div>}
      {retrySeconds > 0 && <p role="status" className="details-message">You can try again in {retrySeconds} seconds.</p>}
      <div className="details-actions"><button type="button" className="details-back" onClick={backToBooking} disabled={busy}><ArrowLeft size={18} /> Back to times</button><button type="submit" disabled={busy || loading || !supabase || retrySeconds > 0 || holdSeconds <= 0 || !holdValid || holdChecking || duplicateEmailEntered || (!session && accountMode === 'signup' && awaitingConfirmation)}>{busy ? <><LoaderCircle className="details-button-spinner" size={18} aria-hidden="true" /> Opening secure payment…</> : <>{session ? 'Continue to Stripe payment' : awaitingConfirmation && accountMode === 'signup' ? 'Check your email to verify' : accountMode === 'signup' ? 'Create account and continue' : 'Sign in and continue'} <ArrowRight size={18} /></>}</button></div>
      {message && <p id={duplicateEmailEntered ? 'details-email-error' : undefined} role={duplicateEmailEntered ? 'alert' : 'status'} className={'details-message details-action-message' + (duplicateEmailEntered ? ' details-message-error' : '')}>{message}</p>}
      {checkoutError && <p role="alert" className="details-message details-message-error details-action-message">{checkoutError} Please try again. If the problem continues, <a href="/contact">contact support</a>.</p>}
    </form>
    <aside className="details-review"><h2>Review your booking</h2><div className="details-hold" role="status"><strong>{holdSeconds > 0 ? holdTime : 'Hold expired'}</strong><span>{holdSeconds > 0 ? holdChecking ? 'Checking your hold…' : holdValid ? 'This time is held for you' : 'Could not verify this hold' : 'Choose a new time to continue'}</span></div><dl><div><dt>Listener</dt><dd>{selection.listener.name}</dd></div><div><dt>Time</dt><dd>{new Date(selection.slot.starts_at).toLocaleString('en-AU')}</dd></div><div><dt>Session</dt><dd>{displayQuote.label} · {displayQuote.duration_minutes} minutes</dd></div><div><dt>Questionnaire</dt><dd>{answers.questionnaire === 'long' ? 'Long questionnaire' : 'Short check-in'}</dd></div><div><dt>Topics</dt><dd>{answers.topics.join(', ')}</dd></div><div><dt>Listener preference</dt><dd>{answers.listenerGender}</dd></div><div><dt>{wellbeingScoreLabel(answers)}</dt><dd>{wellbeingScore(answers)} / {answers.questionnaire === 'long' ? 50 : 24}</dd></div>{answers.note && <div><dt>Your note</dt><dd>{answers.note}</dd></div>}</dl><p><strong>Estimated rate: {money(displayQuote.amount_cents)} AUD</strong></p><p>Complete your account within the hold time. After checkout starts, Stripe gives you its own payment window.</p></aside></div>
    {phoneVerificationEnabled && pendingPhone && <div className="details-dialog-backdrop" onClick={() => setPendingPhone('')}><section className="details-dialog" role="dialog" aria-modal="true" aria-labelledby="verification-title" onClick={event => event.stopPropagation()}>
      <button type="button" className="details-dialog-close" aria-label="Close" onClick={() => setPendingPhone('')}><X size={20} /></button><h2 id="verification-title">Verify your mobile</h2><p>Enter the code sent to {toLocal(pendingPhone)}. After verification, this number will be locked to your account.</p>
      <form onSubmit={verifyCode}><label htmlFor="verification-code">Verification code</label><input id="verification-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} autoFocus required /><button type="submit" disabled={busy || code.length !== 6}>{busy ? 'Checking…' : 'Verify code'}</button></form>
      <button type="button" className="details-resend" disabled={busy || retrySeconds > 0} onClick={sendCode}>{retrySeconds ? `Resend in ${retrySeconds}s` : 'Resend code'}</button>{codeMessage && <p role="status" className="details-message">{codeMessage}</p>}
    </section></div>}
  </>
}
export default DetailsPage
