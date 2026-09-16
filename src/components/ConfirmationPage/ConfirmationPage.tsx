import { useEffect, useState } from 'react'
import { errorMessage, getSupabase, money, type Appointment } from '../../lib/supabase'
import { useSession } from '../../lib/useSession'
import LoginPage from '../LoginPage/LoginPage'
import './ConfirmationPage.css'
function ConfirmationPage() {
  const { session, loading } = useSession()
  const [booking, setBooking] = useState<Appointment | null>(null)
  const [message, setMessage] = useState('Checking your payment…')
  const [refresh, setRefresh] = useState(0)
  const userId = session?.user.id
  useEffect(() => {
    if (!userId) return
    let active = true
    let timer: ReturnType<typeof setTimeout>
    let attempts = 0
    const id = new URLSearchParams(location.search).get('booking_id')
    const read = async () => {
      try {
        if (!id) throw new Error('No booking reference was provided. View your appointments to check their status.')
        const { data, error } = await getSupabase().from('appointments').select('*').eq('id', id).eq('user_id', userId).maybeSingle()
        if (error) throw error
        if (!data) throw new Error('Booking not found for this account.')
        if (!active) return
        setBooking(data as Appointment)
        setMessage(data.status === 'confirmed' ? 'Payment verified. Your appointment is confirmed.' : data.status === 'expired' ? 'This checkout expired without a confirmed payment.' : 'Payment confirmation is still pending. You can check again or view My appointments.')
        if (data.status === 'pending' && ++attempts < 12) timer = setTimeout(read, 2500)
      } catch (error) { if (active) setMessage(errorMessage(error)) }
    }
    void read()
    return () => { active = false; clearTimeout(timer) }
  }, [userId, refresh])
  if (loading) return <p role="status">Checking your account…</p>
  if (!session) return <LoginPage />
  return <section className="confirmation-page"><div className="confirmation-card">
    <h1>{booking?.status === 'confirmed' ? 'Your appointment is confirmed.' : 'Your booking status'}</h1>
    <p role="status">{message}</p>
    {booking && <div className="confirmation-details"><div><span>Appointment</span><strong>{new Date(booking.starts_at).toLocaleString('en-AU')}</strong></div><div><span>Amount</span><strong>{money(booking.amount_cents)} AUD</strong></div><div><span>Status</span><strong>{booking.status}</strong></div></div>}
    <div className="confirmation-actions"><a className="confirmation-primary" href="/account">My appointments</a><button type="button" onClick={() => setRefresh(value => value + 1)}>Check again</button></div>
  </div></section>
}
export default ConfirmationPage
