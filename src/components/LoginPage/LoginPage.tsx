import { LockKeyhole } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { errorMessage, getSupabase, supabase } from '../../lib/supabase'
import { useSession } from '../../lib/useSession'
import './LoginPage.css'

function LoginPage({ embedded = false }: { embedded?: boolean }) {
  const { session, loading } = useSession()
  const [mode, setMode] = useState<'login' | 'signup' | 'reset' | 'update'>(() => new URLSearchParams(location.search).has('reset') ? 'update' : 'login')
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
      if (mode === 'reset') {
        const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/login?reset=1' })
        if (error) throw error
        setMessage('If an account exists for that email, a password reset link will arrive shortly.')
      } else if (mode === 'update') {
        const { error } = await client.auth.updateUser({ password })
        if (error) throw error
        setMode('login'); setMessage('Your password has been updated.')
      } else {
        const { data, error } = mode === 'signup'
          ? await client.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + '/login' } })
          : await client.auth.signInWithPassword({ email, password })
        if (error) throw error
        if (!data.session) setMessage('Check your email to confirm your account, then return here to sign in.')
        else if (!embedded) window.location.assign('/account')
      }
    } catch (error) { setMessage(errorMessage(error)) }
    finally { setBusy(false) }
  }
  if (loading) return <p role="status">Checking your account…</p>
  if (session && mode !== 'update') return <section className="login-page"><div className="login-panel"><h1>You’re signed in.</h1><p>{session.user.email}</p><a href="/account">View my appointments</a><a href="/get-matched">Book a session</a><button onClick={async () => { try { const { error } = await getSupabase().auth.signOut(); if (error) throw error } catch (error) { setMessage(errorMessage(error)) } }}>Sign out</button>{message && <p role="status">{message}</p>}</div></section>
  return <section className={embedded ? 'login-embedded' : 'login-page'} aria-labelledby="login-heading">
    <form className="login-panel" onSubmit={submit}>
      <span className="login-icon"><LockKeyhole size={24} aria-hidden="true" /></span>
      <h1 id="login-heading">{mode === 'signup' ? 'Create your account.' : mode === 'reset' ? 'Reset your password.' : mode === 'update' ? 'Choose a new password.' : 'Welcome back.'}</h1>
      <p>{embedded ? 'Sign in or create an account to save your appointment and see your rate.' : 'Manage your appointments securely.'}</p>
      {mode !== 'update' && <label><span>Email</span><input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>}
      {mode !== 'reset' && <label><span>Password</span><input type="password" minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={e => setPassword(e.target.value)} required /></label>}
      <button type="submit" disabled={busy || !supabase}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : mode === 'reset' ? 'Send reset link' : mode === 'update' ? 'Save password' : 'Sign in'}</button>
      {mode !== 'update' && <><button type="button" className="login-secondary" onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setMessage('') }}>{mode === 'signup' ? 'Already have an account? Sign in' : 'Create an account'}</button><button type="button" className="login-secondary" onClick={() => { setMode(mode === 'reset' ? 'login' : 'reset'); setMessage('') }}>{mode === 'reset' ? 'Back to sign in' : 'Forgot password?'}</button></>}
      {!supabase && <p role="status" className="login-message">Online accounts are not configured yet. Please contact us to book.</p>}
      {message && <p className="login-message" role="status">{message}</p>}
    </form>
  </section>
}
export default LoginPage
