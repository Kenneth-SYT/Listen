import { LockKeyhole } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import './LoginPage.css'

function LoginPage() {
  const [message, setMessage] = useState(false)
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage(true)
  }

  return (
    <section className="login-page" aria-labelledby="login-heading">
      <form className="login-panel" onSubmit={submit}>
        <span className="login-icon"><LockKeyhole size={24} aria-hidden="true" /></span>
        <h1 id="login-heading">Welcome back.</h1>
        <p>Sign in to access saved details and make future bookings faster.</p>
        <label><span>Email</span><input type="email" autoComplete="email" required /></label>
        <label><span>Password</span><input type="password" autoComplete="current-password" required /></label>
        <button type="submit">Login</button>
        {message && <p className="login-message" role="status">Account login will be connected when the secure account backend is ready.</p>}
      </form>
    </section>
  )
}

export default LoginPage
