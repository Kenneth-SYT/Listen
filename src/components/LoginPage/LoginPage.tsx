import { LockKeyhole } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { errorMessage, getSupabase, supabase } from '../../lib/supabase'
import { useSession } from '../../lib/useSession'
import './LoginPage.css'
const phoneVerificationEnabled = import.meta.env.VITE_ENABLE_PHONE_VERIFICATION === 'true'

async function signedInDestination() {
  const client = getSupabase()
  const { data: admin, error: adminError } = await client.rpc('is_admin')
  if (adminError) throw adminError
  return admin === true ? '/admin' : '/account'
}

function LoginPage({ embedded = false }: { embedded?: boolean }) {
  const { session, loading } = useSession()
  const [mode, setMode] = useState<'phone' | 'code' | 'login' | 'reset' | 'update'>(() => new URLSearchParams(location.search).has('reset') ? 'update' : 'login')
  const [mobile, setMobile] = useState('')
  const [code, setCode] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    const subscription = supabase?.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setMode('update')
    }).data.subscription
    return () => subscription?.unsubscribe()
  }, [])
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setMessage('')
    try {
      const client = getSupabase()
      if (mode === 'phone') {
        if (!/^04\d{8}$/.test(mobile)) throw new Error('Enter a 10-digit Australian mobile number starting with 04.')
        const { error } = await client.auth.signInWithOtp({ phone: '+61' + mobile.slice(1), options: { shouldCreateUser: false } })
        if (error) throw error
        setMode('code'); setMessage('We sent a sign-in code to ' + mobile + '.')
      } else if (mode === 'code') {
        const { error } = await client.auth.verifyOtp({ phone: '+61' + mobile.slice(1), token: code, type: 'sms' })
        if (error) throw error
        if (!embedded) window.location.assign(await signedInDestination())
      } else if (mode === 'reset') {
        const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/login?reset=1' })
        if (error) throw error
        setMessage('If an account exists for that email, a password reset link will arrive shortly.')
      } else if (mode === 'update') {
        const { error } = await client.auth.updateUser({ password })
        if (error) throw error
        setMode('login'); setMessage('Your password has been updated.')
      } else {
        const { data, error } = await client.auth.signInWithPassword({ email, password })
        if (error) throw error
        if (!data.session) throw new Error('Sign-in did not complete. Please try again.')
        if (!embedded) window.location.assign(await signedInDestination())
      }
    } catch (error) { setMessage(errorMessage(error)) }
    finally { setBusy(false) }
  }
  if (loading) return <p role="status">Checking your account…</p>
  if (session && mode !== 'update') return <section className="login-page"><div className="login-panel"><h1>You’re signed in.</h1><p>{session.user.email || session.user.phone}</p><a href="/account">View my appointments</a><a href="/get-matched">Book a session</a><button onClick={async () => { try { const { error } = await getSupabase().auth.signOut(); if (error) throw error } catch (error) { setMessage(errorMessage(error)) } }}>Sign out</button>{message && <p role="status">{message}</p>}</div></section>
  return <section className={embedded ? 'login-embedded' : 'login-page'} aria-labelledby="login-heading">
    <form className="login-panel" onSubmit={submit}>
      <span className="login-icon"><LockKeyhole size={24} aria-hidden="true" /></span>
      <h1 id="login-heading">{mode === 'reset' ? 'Reset your password.' : mode === 'update' ? 'Choose a new password.' : 'Welcome back.'}</h1>
      <p>{embedded ? 'Sign in to save your appointment and see your rate.' : 'Manage your appointments securely.'}</p>
      {(mode === 'phone' || mode === 'code') && <label><span>Mobile</span><input type="tel" inputMode="numeric" autoComplete="tel" pattern="04[0-9]{8}" maxLength={10} value={mobile} onChange={e => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} readOnly={mode === 'code'} required /></label>}
      {mode === 'code' && <label><span>Verification code</span><input type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} required /></label>}
      {mode !== 'phone' && mode !== 'code' && mode !== 'update' && <label><span>Email</span><input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>}
      {mode !== 'phone' && mode !== 'code' && mode !== 'reset' && <label><span>Password</span><input type="password" minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={e => setPassword(e.target.value)} required /></label>}
      <button type="submit" disabled={busy || !supabase}>{busy ? 'Please wait…' : mode === 'phone' ? 'Send sign-in code' : mode === 'code' ? 'Verify code' : mode === 'reset' ? 'Send reset link' : mode === 'update' ? 'Save password' : 'Sign in'}</button>
      {(mode === 'phone' || mode === 'code') ? <button type="button" className="login-secondary" onClick={() => { setMode(mode === 'code' ? 'phone' : 'login'); setMessage('') }}>{mode === 'code' ? 'Change mobile number' : 'Use email and password'}</button> : mode !== 'update' && <><button type="button" className="login-secondary" onClick={() => { setMode(mode === 'reset' ? 'login' : 'reset'); setMessage('') }}>{mode === 'reset' ? 'Back to sign in' : 'Forgot password?'}</button>{phoneVerificationEnabled && <button type="button" className="login-secondary" onClick={() => { setMode('phone'); setMessage('') }}>Sign in with mobile</button>}</>}
      {!supabase && <p role="status" className="login-message">Online accounts are not configured yet. Please contact us to book.</p>}
      {message && <p className="login-message" role="status">{message}</p>}
    </form>
  </section>
}
export default LoginPage
