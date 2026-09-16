import { ArrowLeft, ArrowRight, LockKeyhole } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { errorMessage, getSupabase, supabase } from '../../lib/supabase'
import { useSession } from '../../lib/useSession'
import './DetailsPage.css'

export type CustomerDetails = {
  firstName: string
  lastName: string
  preferredName: string
  dateOfBirth: string
  mobile: string
  email: string
  gender: 'male' | 'female' | 'other' | ''
}

type DetailsPageProps = {
  initialDetails: CustomerDetails
  onBack: () => void
  onContinue: (details: CustomerDetails) => void
}

function DetailsPage({ initialDetails, onBack, onContinue }: DetailsPageProps) {
  const [details, setDetails] = useState(initialDetails)
  const { session, loading } = useSession()
  const [password, setPassword] = useState('')
  const [accountMode, setAccountMode] = useState<'signup' | 'signin'>('signup')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const update = (field: keyof CustomerDetails, value: string) => {
    setDetails(current => ({ ...current, [field]: value }))
  }
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy || loading) return
    const email = (session?.user.email ?? details.email).trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.com$/i.test(email)) {
      setMessage('Enter an email address ending in .com.')
      return
    }
    if (!/^04\d{8}$/.test(details.mobile)) {
      setMessage('Enter a 10-digit Australian mobile number starting with 04.')
      return
    }
    if (!details.gender) {
      setMessage('Please select a gender option.')
      return
    }
    if (session) {
      onContinue({ ...details, email })
      return
    }
    setBusy(true)
    setMessage('')
    try {
      const client = getSupabase()
      if (accountMode === 'signup') {
        const { data, error } = await client.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin + '/get-matched' },
        })
        if (error) throw error
        if (data.session) onContinue({ ...details, email })
        else setMessage('Check your email for the confirmation link. Once verified, return to this page and press Continue to booking. If you already have an account, choose Sign in below.')
      } else {
        const { error } = await client.auth.signInWithPassword({ email, password })
        if (error) throw error
        onContinue({ ...details, email })
      }
    } catch (error) {
      setMessage(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="details-form" onSubmit={submit}>
      <header className="details-heading">
        <span className="match-eyebrow">A little about you</span>
        <h1 id="match-heading">Let’s get to know you.</h1>
        <p>We’ll use these details to prepare your booking and contact you about your appointment.</p>
      </header>
      <div className="details-grid">
        <label><span>First name</span><input autoComplete="given-name" value={details.firstName} onChange={event => update('firstName', event.target.value)} required /></label>
        <label><span>Last name</span><input autoComplete="family-name" value={details.lastName} onChange={event => update('lastName', event.target.value)} required /></label>
        <label className="details-wide"><span>Preferred name <small>Optional</small></span><input autoComplete="nickname" value={details.preferredName} onChange={event => update('preferredName', event.target.value)} /></label>
        <label><span>Date of birth</span><input type="date" autoComplete="bday" max={new Date().toISOString().split('T')[0]} value={details.dateOfBirth} onChange={event => update('dateOfBirth', event.target.value)} required /></label>
        <label><span>Mobile</span><input type="tel" inputMode="numeric" autoComplete="tel" placeholder="04xxxxxxxx" pattern="04[0-9]{8}" title="Enter 10 digits starting with 04" maxLength={10} value={details.mobile} onChange={event => update('mobile', event.target.value.replace(/\D/g, '').slice(0, 10))} required /></label>
        <label><span>Email</span><input type="email" autoComplete="email" placeholder="you@example.com" pattern="[^\s@]+@[^\s@]+\.com" title="Use an email address ending in .com" value={session?.user.email ?? details.email} onChange={event => update('email', event.target.value)} readOnly={!!session} required /></label>
        <label><span>Gender</span><select value={details.gender} onChange={event => update('gender', event.target.value)} required><option value="">Select an option</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></label>
        {!session && <label className="details-wide"><span>{accountMode === 'signup' ? 'Create a password' : 'Your password'}</span><input type="password" autoComplete={accountMode === 'signup' ? 'new-password' : 'current-password'} minLength={8} value={password} onChange={event => setPassword(event.target.value)} required /></label>}
      </div>
      {!session && <button className="details-account-switch" type="button" onClick={() => { setAccountMode(accountMode === 'signup' ? 'signin' : 'signup'); setMessage('') }}>{accountMode === 'signup' ? 'Already have an account? Sign in here' : 'New here? Create an account'}</button>}
      <div className="details-privacy"><LockKeyhole size={17} aria-hidden="true" /><span>{session ? 'Your contact details are saved to your account when you proceed to payment.' : 'An account and verified email are required before payment. Your details are saved when you proceed to checkout.'}</span></div>
      {!supabase && <p role="alert" className="details-message">Online accounts are not configured yet.</p>}
      {message && <p role="status" className="details-message">{message}</p>}
      <div className="details-actions">
        <button type="button" className="details-back" onClick={onBack}><ArrowLeft size={18} /> Back</button>
        <button type="submit" disabled={busy || loading || !supabase}>{busy ? 'Please wait…' : session ? 'Continue to booking' : accountMode === 'signup' ? 'Create account and continue' : 'Sign in and continue'} <ArrowRight size={18} /></button>
      </div>
    </form>
  )
}

export default DetailsPage
