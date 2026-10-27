import { ArrowRight, BookOpen, CalendarDays, CheckCircle2, Clock3, HeartHandshake, HelpCircle, History, Home, KeyRound, Layers3, ListChecks, LogOut, MessageCircle, Save, ShieldCheck, Trash2, UserRound, UsersRound, X, XCircle } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { cancelCheckout, createCheckout, errorMessage, getSupabase, money, reconcileBundleCheckout, verifyCurrentPassword, type Appointment, type CreditSummary } from '../../lib/supabase'
import { useSession } from '../../lib/useSession'
import LoginPage from '../LoginPage/LoginPage'
import SupportWorkspace, { type SupportContact } from '../SupportWorkspace/SupportWorkspace'
import './AccountPage.css'

const fifteenMinutes = 15 * 60 * 1000
const secondsUntil = (expiresAt: string) => Math.max(0, Math.ceil((Date.parse(expiresAt) - Date.now()) / 1000))
const holdDeadline = (createdAt: string, checkoutExpiresAt: string) => new Date(Math.min(
  Date.parse(checkoutExpiresAt),
  Date.parse(createdAt) + fifteenMinutes,
)).toISOString()
type CustomerProfile = { first_name: string; last_name: string; preferred_name: string; date_of_birth: string; mobile: string; contact_email: string; gender: string }
type CreditAnimation = { from: number; added: number; to: number; phase: 'add' | 'merge' }
type AccountView = 'home' | 'bookings' | 'messages' | 'todos' | 'between' | 'history' | 'profile'
type SupportReadState = { messages: string; todos: string }
const accountViews: AccountView[] = ['home', 'bookings', 'messages', 'todos', 'between', 'history', 'profile']
const emptyProfile: CustomerProfile = { first_name: '', last_name: '', preferred_name: '', date_of_birth: '', mobile: '', contact_email: '', gender: '' }
const unreadBaseline = '1970-01-01T00:00:00.000Z'

const readLocalSupportState = (userId: string): SupportReadState => {
  try {
    const saved = JSON.parse(localStorage.getItem(`listen-support-read-${userId}`) || '{}') as Partial<SupportReadState>
    return { messages: saved.messages || unreadBaseline, todos: saved.todos || unreadBaseline }
  } catch {
    return { messages: unreadBaseline, todos: unreadBaseline }
  }
}

const saveLocalSupportState = (userId: string, state: SupportReadState) => {
  localStorage.setItem(`listen-support-read-${userId}`, JSON.stringify(state))
}

function ListenerMark() {
  return <img className="account-listener-mark" src="/favicon-transparent-512x512.png" alt="" aria-hidden="true" />
}

function PendingCountdown({ expiresAt, onExpired }: { expiresAt: string; onExpired: () => void }) {
  const [seconds, setSeconds] = useState(() => secondsUntil(expiresAt))
  const expirationHandled = useRef(false)
  useEffect(() => {
    const tick = () => {
      const next = secondsUntil(expiresAt)
      setSeconds(next)
      if (next === 0 && !expirationHandled.current) {
        expirationHandled.current = true
        onExpired()
      }
    }
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [expiresAt, onExpired])
  const time = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
  return <span className="account-countdown" aria-label={`Time remaining ${time}`}>{time}</span>
}

function AccountPage() {
  const { session, loading } = useSession()
  const bundleResult = new URLSearchParams(location.search).get('bundle')
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [admin, setAdmin] = useState('')
  const [listenerAccount, setListenerAccount] = useState(false)
  const [message, setMessage] = useState(() => bundleResult === 'cancelled' ? 'Bundle checkout was cancelled. No credits were added and you were not charged.' : '')
  const [busy, setBusy] = useState(false)
  const [cancellingId, setCancellingId] = useState('')
  const [credits, setCredits] = useState<CreditSummary>({ standard_credits: 0, eligible_for_bundles: false })
  const [creditAnimation, setCreditAnimation] = useState<CreditAnimation | null>(null)
  const [profile, setProfile] = useState<CustomerProfile>(emptyProfile)
  const [savingProfile, setSavingProfile] = useState(false)
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [deleteMessage, setDeleteMessage] = useState('')
  const [unreadSupport, setUnreadSupport] = useState({ messages: 0, todos: 0 })
  const [supportNotificationRefresh, setSupportNotificationRefresh] = useState(0)
  const [refresh, setRefresh] = useState(0)
  const bundleReconciliationStarted = useRef(false)
  const [openedAt] = useState(() => Date.now())
  const [activeView, setActiveView] = useState<AccountView>(() => {
    const requestedView = new URLSearchParams(location.search).get('view') as AccountView | null
    return requestedView && accountViews.includes(requestedView) ? requestedView : 'home'
  })
  const userId = session?.user.id
  const userEmail = session?.user.email || ''
  useEffect(() => {
    if (!userId) return
    let active = true
    const client = getSupabase()
    void Promise.all([client.from('appointments').select('*').eq('user_id', userId).order('starts_at', { ascending: false }), client.from('listeners').select('id,name'), client.rpc('is_admin'), client.from('profiles').select('first_name,last_name,preferred_name,date_of_birth,mobile,contact_email,gender').eq('id', userId).maybeSingle(), client.from('listener_accounts').select('listener_id').eq('user_id', userId).maybeSingle()])
      .then(([bookings, people, role, profileResult, listenerResult]) => {
        if (!active) return
        if (bookings.error || people.error || role.error || profileResult.error || listenerResult.error) throw bookings.error || people.error || role.error || profileResult.error || listenerResult.error
        setAppointments(bookings.data as Appointment[])
        setNames(Object.fromEntries(people.data.map(person => [person.id, person.name])))
        if (profileResult.data) setProfile({ ...emptyProfile, ...profileResult.data, contact_email: profileResult.data.contact_email || userEmail, gender: profileResult.data.gender || '' })
        setAdmin(role.data === true ? userId : ''); setListenerAccount(Boolean(listenerResult.data)); setMessage(current => bundleResult ? current : '')
      }).catch(error => {
        if (!active) return
        const detail = errorMessage(error)
        if (/jwt issued at future/i.test(detail)) console.error('Account session timing error', error)
        else setMessage(detail)
      })
    void client.rpc('credit_summary').then(creditResult => {
      if (!active) return
      if (!creditResult.error) setCredits(creditResult.data as CreditSummary)
    })
    return () => { active = false }
  }, [userId, userEmail, refresh, bundleResult])
  useEffect(() => {
    if (!userId) return
    let active = true
    const client = getSupabase()
    const refreshUnread = async () => {
      if (!active) return
      const receiptResult = await client.from('support_read_receipts').select('messages_read_at,todos_read_at').eq('user_id', userId).maybeSingle()
      let usingDatabase = !receiptResult.error
      let readAt: SupportReadState
      if (receiptResult.data) {
        readAt = { messages: receiptResult.data.messages_read_at, todos: receiptResult.data.todos_read_at }
      } else {
        const localKey = `listen-support-read-${userId}`
        const hasLocalState = Boolean(localStorage.getItem(localKey))
        readAt = hasLocalState ? readLocalSupportState(userId) : { messages: new Date().toISOString(), todos: new Date().toISOString() }
        if (usingDatabase) {
          const createResult = await client.from('support_read_receipts').upsert({ user_id: userId, messages_read_at: readAt.messages, todos_read_at: readAt.todos }, { onConflict: 'user_id' })
          if (createResult.error) {
            usingDatabase = false
            console.error('Could not create shared notification read state', createResult.error)
          } else {
            localStorage.removeItem(localKey)
          }
        } else if (receiptResult.error) {
          console.error('Could not load shared notification read state', receiptResult.error)
        }
      }
      if (activeView === 'todos') {
        readAt.todos = new Date().toISOString()
        if (usingDatabase) {
          const markResult = await client.rpc('mark_support_section_read', { p_section: 'todos' })
          if (markResult.error) {
            console.error('Could not mark todos as read', markResult.error)
            saveLocalSupportState(userId, readAt)
          }
        } else {
          saveLocalSupportState(userId, readAt)
        }
      }
      const [messageResult, threadReceiptResult, todoResult] = await Promise.all([
        client.from('support_messages').select('listener_id,user_id,sender_user_id,created_at').eq('user_id', userId),
        client.from('support_thread_read_receipts').select('listener_id,user_id,messages_read_at').eq('reader_user_id', userId).eq('user_id', userId),
        activeView === 'todos'
          ? Promise.resolve({ count: 0, error: null })
          : client.from('support_todos').select('id', { count: 'exact', head: true }).eq('user_id', userId).neq('created_by', userId).gt('updated_at', readAt.todos),
      ])
      if (!active) return
      if (messageResult.error) console.error('Could not refresh unread messages', messageResult.error)
      if (threadReceiptResult.error) console.error('Could not refresh conversation read state', threadReceiptResult.error)
      if (todoResult.error) console.error('Could not refresh unread to-dos', todoResult.error)
      const threadReadAt = new Map((threadReceiptResult.data || []).map(item => [`${item.listener_id}:${item.user_id}`, Date.parse(item.messages_read_at)]))
      const unreadMessages = messageResult.error || threadReceiptResult.error ? null : (messageResult.data || []).filter(item => item.sender_user_id !== userId && Date.parse(item.created_at) > (threadReadAt.get(`${item.listener_id}:${item.user_id}`) || 0)).length
      setUnreadSupport(current => ({
        messages: unreadMessages === null ? current.messages : unreadMessages,
        todos: todoResult.error ? current.todos : todoResult.count || 0,
      }))
    }
    void refreshUnread()
    const channel = client.channel(`account-support-notifications-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_messages', filter: `user_id=eq.${userId}` }, () => void refreshUnread())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_todos', filter: `user_id=eq.${userId}` }, () => void refreshUnread())
      .subscribe()
    const timer = window.setInterval(() => void refreshUnread(), 5000)
    window.addEventListener('focus', refreshUnread)
    return () => {
      active = false
      window.clearInterval(timer)
      window.removeEventListener('focus', refreshUnread)
      void client.removeChannel(channel)
    }
  }, [userId, activeView, supportNotificationRefresh])
  useEffect(() => {
    if (!userId || bundleResult !== 'success' || bundleReconciliationStarted.current) return
    bundleReconciliationStarted.current = true
    let active = true
    let timer: number | undefined
    const check = async (attempt: number) => {
      try {
        const sessionId = new URLSearchParams(window.location.search).get('bundle_session_id') || undefined
        const result = await reconcileBundleCheckout(sessionId)
        if (!active) return
        if (result.status === 'paid') {
          setCredits({ standard_credits: result.standard_credits, eligible_for_bundles: true })
          setMessage('')
          const animationKey = result.order_id ? `listen-bundle-animation-${result.order_id}` : ''
          if (result.added_credits > 0 && (!animationKey || !sessionStorage.getItem(animationKey))) {
            if (animationKey) sessionStorage.setItem(animationKey, '1')
            setCreditAnimation({ from: Math.max(0, result.standard_credits - result.added_credits), added: result.added_credits, to: result.standard_credits, phase: 'add' })
            timer = window.setTimeout(() => {
              if (!active) return
              setCreditAnimation(current => current ? { ...current, phase: 'merge' } : null)
              timer = window.setTimeout(() => { if (active) setCreditAnimation(null) }, 650)
            }, 1400)
          }
          setRefresh(value => value + 1)
          return
        }
        if (result.status === 'expired') {
          setMessage('This bundle checkout expired without a completed payment. No session credits were added.')
          return
        }
        if (attempt < 3) timer = window.setTimeout(() => void check(attempt + 1), 2500)
        else setMessage('Your payment is still being confirmed. Refresh this page shortly, or contact us if your receipt shows the payment completed.')
      } catch (error) {
        if (!active) return
        if (attempt < 3) timer = window.setTimeout(() => void check(attempt + 1), 2500)
        else setMessage(errorMessage(error))
      }
    }
    void check(0)
    return () => { active = false; if (timer) window.clearTimeout(timer) }
  }, [userId, bundleResult])
  useEffect(() => {
    if (!passwordModalOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !changingPassword) {
        setPasswordModalOpen(false)
        setPasswordMessage('')
      }
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [passwordModalOpen, changingPassword])
  useEffect(() => {
    if (!deleteModalOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !deletingAccount) {
        setDeleteModalOpen(false)
        setDeleteMessage('')
      }
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [deleteModalOpen, deletingAccount])
  if (loading) return <p role="status">Checking your account…</p>
  if (!session) return <LoginPage />
  const resume = async (slotId: string) => {
    setBusy(true)
    try {
      const checkoutUrl = await createCheckout(slotId)
      sessionStorage.setItem('listen-checkout-return', '1')
      window.location.assign(checkoutUrl)
    }
    catch (error) { setMessage(errorMessage(error)); setBusy(false) }
  }
  const removeExpired = (bookingId: string) => setAppointments(current => current.filter(booking => booking.id !== bookingId))
  const cancelBooking = async (bookingId: string, askForConfirmation = true) => {
    if (askForConfirmation && !window.confirm('Cancel this booking and release the appointment time?')) return
    setCancellingId(bookingId)
    setMessage('')
    try {
      await cancelCheckout(bookingId)
      removeExpired(bookingId)
      sessionStorage.removeItem('listen-booking-draft')
      sessionStorage.removeItem('listen-checkout-return')
      setMessage(askForConfirmation ? 'Your pending booking has been cancelled and the appointment time is available again.' : 'Your 15-minute booking hold expired and the appointment time is available again.')
    } catch (error) {
      setMessage(errorMessage(error))
    } finally {
      setCancellingId('')
    }
  }
  const customerBookings = appointments.filter(booking => booking.user_id === userId)
  const pendingBookings = customerBookings.filter(booking => booking.status === 'pending')
  const upcomingBookings = customerBookings.filter(booking => booking.status === 'confirmed' && Date.parse(booking.starts_at) >= openedAt).sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))
  const historyBookings = customerBookings.filter(booking => booking.status === 'expired' || (booking.status === 'confirmed' && Date.parse(booking.starts_at) < openedAt))
  const primaryListener = upcomingBookings[0] || customerBookings.find(booking => booking.status === 'confirmed')
  const supportContacts = Array.from(new Set(customerBookings.filter(booking => booking.status === 'confirmed').map(booking => booking.listener_id))).map(listenerId => ({ listenerId, userId: session.user.id, name: names[listenerId] || 'Your listener' } satisfies SupportContact))
  const bookingCard = (booking: Appointment, featured = false, showPayment = true) => {
    const startsAt = new Date(booking.starts_at)
    const duration = Math.round((Date.parse(booking.ends_at) - Date.parse(booking.starts_at)) / 60000)
    return <article key={booking.id} className={`account-card ${featured ? 'featured' : ''} ${booking.status}`}>
      <div className="account-card-top"><span className={`account-status ${booking.status}`}>{booking.status === 'confirmed' ? <CheckCircle2 /> : booking.status === 'pending' ? <Clock3 /> : <XCircle />}{booking.status}</span>{booking.status === 'pending' && <PendingCountdown expiresAt={holdDeadline(booking.created_at, booking.checkout_expires_at)} onExpired={() => void cancelBooking(booking.id, false)} />}</div>
      <div className="account-card-date"><strong>{startsAt.toLocaleDateString('en-AU', { day: 'numeric' })}</strong><span>{startsAt.toLocaleDateString('en-AU', { month: 'short' })}</span></div>
      <div className="account-card-content"><span className="account-card-label">{featured ? 'Your next session' : booking.status === 'pending' ? 'Time held for you' : 'Previous booking'}</span><h3>{names[booking.listener_id] || 'Your listener'}</h3>
        <div className="account-card-meta"><span><CalendarDays />{startsAt.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span><span><Clock3 />{startsAt.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })} · {duration === 120 ? '2 hours' : `${duration} minutes`}</span><span><HeartHandshake />{booking.rate_code === 'intro' ? 'Introductory chat' : booking.rate_code === 'extended' ? 'Extended support session' : 'Support session'}</span></div>
        {(showPayment || booking.status === 'pending') && <div className="account-card-footer">{showPayment && <strong>{booking.paid_with_credit ? 'Session credit used' : `${money(booking.amount_cents)} AUD`}</strong>}{booking.status === 'pending' && <div className="account-card-actions"><button disabled={busy || Boolean(cancellingId)} onClick={() => resume(booking.slot_id)}>{busy ? 'Opening Stripe…' : <>Continue payment <ArrowRight size={16} /></>}</button><button type="button" className="account-cancel" disabled={busy || Boolean(cancellingId)} onClick={() => cancelBooking(booking.id)}>{cancellingId === booking.id ? 'Cancelling…' : 'Cancel booking'}</button></div>}</div>}
      </div>
    </article>
  }
  const signOut = async () => { const { error } = await getSupabase().auth.signOut(); if (error) setMessage(error.message) }
  const updateProfile = (field: keyof CustomerProfile, value: string) => setProfile(current => ({ ...current, [field]: value }))
  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSavingProfile(true); setMessage('')
    try {
      const { error } = await getSupabase().from('profiles').update({ first_name: profile.first_name.trim(), last_name: profile.last_name.trim(), preferred_name: profile.preferred_name.trim(), date_of_birth: profile.date_of_birth, mobile: profile.mobile.trim(), gender: profile.gender || null }).eq('id', userId)
      if (error) throw error
      setProfile(current => ({ ...current, first_name: current.first_name.trim(), last_name: current.last_name.trim(), preferred_name: current.preferred_name.trim() }))
      setMessage('Your profile details have been updated.')
    } catch (error) { setMessage(errorMessage(error)) } finally { setSavingProfile(false) }
  }
  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    const currentPassword = String(values.get('current_password') || '')
    const newPassword = String(values.get('new_password') || '')
    const confirmPassword = String(values.get('confirm_password') || '')
    if (newPassword !== confirmPassword) {
      setPasswordMessage('The new passwords do not match.')
      return
    }
    if (currentPassword === newPassword) {
      setPasswordMessage('Choose a new password that is different from your current password.')
      return
    }
    if (!session.user.email) {
      setPasswordMessage('This account does not have an email address available for password verification.')
      return
    }
    setChangingPassword(true)
    setPasswordMessage('')
    try {
      const client = getSupabase()
      await verifyCurrentPassword(session.user.email, currentPassword)
      const update = await client.auth.updateUser({ password: newPassword })
      if (update.error) throw update.error
      setPasswordModalOpen(false)
      setMessage('')
      setPasswordSuccess('Your password has been changed.')
    } catch (error) {
      setPasswordMessage(errorMessage(error))
    } finally {
      setChangingPassword(false)
    }
  }
  const deleteAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const confirmation = String(new FormData(event.currentTarget).get('delete_confirmation') || '').trim()
    if (confirmation !== 'DELETE') {
      setDeleteMessage('Type DELETE exactly to confirm account deletion.')
      return
    }
    setDeletingAccount(true)
    setDeleteMessage('')
    try {
      const client = getSupabase()
      const { error } = await client.functions.invoke('delete-account', { body: { confirmation } })
      if (error) {
        let detail = error.message
        if ('context' in error && error.context instanceof Response) {
          const body = await error.context.json().catch(() => null)
          detail = body?.error || detail
        }
        throw new Error(detail)
      }
      await client.auth.signOut({ scope: 'local' }).catch(() => undefined)
      window.location.assign('/')
    } catch (error) {
      setDeleteMessage(errorMessage(error))
      setDeletingAccount(false)
    }
  }
  const changeView = (nextView: AccountView) => {
    if (userId && activeView === 'todos') {
      void getSupabase().rpc('mark_support_section_read', { p_section: 'todos' }).then(result => {
        if (!result.error) return
        console.error('Could not mark todos as read', result.error)
        const readAt = readLocalSupportState(userId)
        readAt.todos = new Date().toISOString()
        saveLocalSupportState(userId, readAt)
      })
    }
    if (nextView === 'todos') {
      setUnreadSupport(current => ({ ...current, [nextView]: 0 }))
    }
    setActiveView(nextView)
  }
  const navItems = [
    { id: 'home' as const, label: 'Home', icon: Home },
    { id: 'bookings' as const, label: 'Appointments', icon: CalendarDays },
    { id: 'messages' as const, label: 'Messages', icon: MessageCircle },
    { id: 'todos' as const, label: 'To-dos', icon: ListChecks },
    { id: 'between' as const, label: 'Between sessions', icon: BookOpen },
    { id: 'history' as const, label: 'Past sessions', icon: History },
    { id: 'profile' as const, label: 'Profile', icon: UserRound },
  ]
  const profileForm = () => <form className="account-settings-form account-profile-form" onSubmit={saveProfile}>
    <div className="account-settings-row"><label><span>First name</span><input value={profile.first_name} onChange={event => updateProfile('first_name', event.target.value)} maxLength={100} autoComplete="given-name" required /></label><label><span>Last name</span><input value={profile.last_name} onChange={event => updateProfile('last_name', event.target.value)} maxLength={100} autoComplete="family-name" required /></label></div>
    <div className="account-settings-row"><label><span>Preferred name <small>Optional</small></span><input value={profile.preferred_name} onChange={event => updateProfile('preferred_name', event.target.value)} maxLength={100} autoComplete="nickname" /></label><label><span>Account email</span><input type="email" value={profile.contact_email || session.user.email || ''} readOnly aria-describedby="account-email-help" /></label></div>
    <div className="account-settings-row"><label><span>Mobile number</span><input type="tel" inputMode="numeric" value={profile.mobile} onChange={event => updateProfile('mobile', event.target.value.replace(/\D/g, '').slice(0, 10))} pattern="04[0-9]{8}" title="Enter 10 digits starting with 04" autoComplete="tel" required /></label><label><span>Date of birth</span><input type="date" value={profile.date_of_birth} onChange={event => updateProfile('date_of_birth', event.target.value)} max={new Date().toISOString().slice(0, 10)} autoComplete="bday" required /></label></div>
    <label><span>Gender <small>Optional</small></span><select value={profile.gender} onChange={event => updateProfile('gender', event.target.value)}><option value="">Prefer not to say</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></label>
    <small id="account-email-help" className="account-field-help">Your verified sign-in email cannot be changed here.</small>
    <div className="account-settings-actions"><button type="button" className="account-delete-link" onClick={() => { setDeleteMessage(''); setDeleteModalOpen(true) }}><Trash2 />Delete account</button><div className="account-profile-actions"><div className="account-password-action">{passwordSuccess && <span className="account-password-success" role="status">{passwordSuccess}</span>}<button type="button" className="account-change-password" onClick={() => { setMessage(''); setPasswordMessage(''); setPasswordSuccess(''); setPasswordModalOpen(true) }}><KeyRound />Change password</button></div><button type="submit" className="account-save-profile" disabled={savingProfile}><Save />{savingProfile ? 'Saving…' : 'Save changes'}</button></div></div>
  </form>
  const noBookings = <section className="account-empty"><div><HeartHandshake /></div><h2>No upcoming bookings</h2><p>You do not have any sessions scheduled. When you’re ready, complete a new check-in and choose a listener and time that works for you.</p><a href="/get-matched?fresh=1">Start a new check-in <ArrowRight /></a></section>
  return <main className="account-page">
    <div className={`account-dashboard-grid ${activeView === 'home' ? '' : 'account-dashboard-grid-wide'}`}>
      <div className="account-sidebar-column"><aside className="account-sidebar" aria-label="Account navigation"><nav>{navItems.map(item => { const Icon = item.icon; const count = item.id === 'messages' ? unreadSupport.messages : item.id === 'todos' ? unreadSupport.todos : 0; return <button key={item.id} type="button" className={activeView === item.id ? 'active' : ''} onClick={() => changeView(item.id)}><Icon /><span>{item.label}</span>{count > 0 && <span className="account-nav-badge" aria-label={`${count} unread ${item.label.toLowerCase()}`}>{count > 99 ? '99+' : count}</span>}</button> })}</nav>{(listenerAccount || admin === userId) && <a href="/listener"><ListenerMark />Listener dashboard</a>}{admin === userId && <a href="/admin"><ShieldCheck />Admin dashboard</a>}</aside><button type="button" className="account-sidebar-signout" onClick={signOut}><LogOut />Sign out</button></div>
      <div className="account-dashboard-main">
        {new URLSearchParams(location.search).has('checkout') && <div className="account-checkout-return" role="status"><Clock3 /><div><h2>Your payment wasn’t completed</h2><p>Your details are saved and the selected time remains held until the countdown ends.</p></div></div>}
        {message && <p className="account-message" role="status">{message}</p>}
        {activeView === 'home' && <>
          <section className="account-listener-overview"><div><span className="account-card-label">My listener</span><h2>{primaryListener ? names[primaryListener.listener_id] || 'Your listener' : 'Find someone who feels right for you'}</h2><p>{primaryListener ? 'Your chosen listener will support your upcoming conversation.' : 'Complete the matching questions to receive a listener recommendation based on what you want to talk about.'}</p></div><a href="/get-matched?repeat=previous"><UsersRound />{primaryListener ? 'Get matched again' : 'Get matched'}</a></section>
          {pendingBookings.length > 0 && <section className="account-section"><div className="account-section-heading"><div><span>Action needed</span><h2>Complete your booking</h2></div><p>Your appointment is held for 15 minutes while you finish payment.</p></div><div className="account-list">{pendingBookings.map(booking => bookingCard(booking))}</div></section>}
          <section className="account-section"><div className="account-section-heading"><div><span>Coming up</span><h2>Upcoming booking</h2></div></div>{upcomingBookings.length ? <div className="account-list">{upcomingBookings.slice(0, 1).map(booking => bookingCard(booking, true))}</div> : noBookings}</section>
        </>}
        {activeView === 'bookings' && <section className="account-section account-section-first"><div className="account-section-heading"><div><span>Your schedule</span><h2>Appointments</h2></div><p>Confirmed sessions and appointments awaiting payment.</p></div>{pendingBookings.length || upcomingBookings.length ? <div className="account-list">{[...pendingBookings, ...upcomingBookings].map((booking, index) => bookingCard(booking, booking.status === 'confirmed' && index === pendingBookings.length))}</div> : noBookings}</section>}
        {activeView === 'messages' && <SupportWorkspace role="customer" mode="messages" currentUserId={session.user.id} contacts={supportContacts} onUnreadChange={() => setSupportNotificationRefresh(value => value + 1)} />}
        {activeView === 'todos' && <SupportWorkspace role="customer" mode="todos" currentUserId={session.user.id} contacts={supportContacts} />}
        {activeView === 'between' && <section className="account-simple-panel account-between-page"><header><div className="account-feature-icon"><BookOpen /></div><div><span className="account-card-label">Continued support</span><h2>Between sessions</h2><p>Keep helpful resources from your listener together in one place.</p></div></header><div className="account-between-empty"><div className="account-between-empty-icon"><BookOpen /></div><div><strong>No resources have been shared yet</strong><span>Reflections, worksheets and useful links will appear here when your listener sends them.</span></div><button type="button" onClick={() => changeView('messages')}>View messages <ArrowRight /></button></div></section>}
        {activeView === 'history' && <section className="account-section account-section-first account-history"><div className="account-section-heading"><div><span>Your records</span><h2>Past sessions</h2></div><p>Previous and expired booking records are kept here.</p></div>{historyBookings.length ? <div className="account-list">{historyBookings.map(booking => bookingCard(booking, false, false))}</div> : noBookings}</section>}
        {activeView === 'profile' && <section className="account-simple-panel"><span className="account-card-label">Your details</span><h2>My information</h2>{profileForm()}</section>}
      </div>
      {activeView === 'home' && <aside className="account-dashboard-rail"><section className="account-rail-credit"><div className="account-rail-credit-label"><Layers3 /><span>Standard-session credits</span></div><strong className={creditAnimation ? `account-credit-value ${creditAnimation.phase}` : 'account-credit-value'} aria-label={`${credits.standard_credits} session credits`}><b>{creditAnimation?.phase === 'add' ? creditAnimation.from : credits.standard_credits}</b>{creditAnimation && <em aria-hidden="true">+{creditAnimation.added}</em>}</strong><p>50-minute standard sessions</p><div className="account-credit-actions">{credits.standard_credits > 0 && <a href="/get-matched?repeat=previous">Book with a credit <ArrowRight /></a>}<a className="account-credit-topup" href="/pricing">Top up credits</a></div></section><section className="account-assistance"><div className="account-help-icon"><HelpCircle /></div><h2>Need assistance?</h2><p>Have a question about choosing a listener, your booking, or payment? We’re here to help.</p><a href="/contact">Contact us <ArrowRight /></a><hr /><span>Listen offers peer support</span><small>For immediate danger or a crisis, call 000 or Lifeline on 13 11 14.</small></section></aside>}
    </div>
    {passwordModalOpen && <div className="account-password-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !changingPassword) { setPasswordModalOpen(false); setPasswordMessage('') } }}><section className="account-password-modal" role="dialog" aria-modal="true" aria-labelledby="account-password-title"><header><div><span className="account-card-label">Account security</span><h2 id="account-password-title">Change password</h2></div><button type="button" aria-label="Close password dialog" disabled={changingPassword} onClick={() => { setPasswordModalOpen(false); setPasswordMessage('') }}><X /></button></header><form onSubmit={changePassword}><label><span>Current password</span><input type="password" name="current_password" autoComplete="current-password" required autoFocus /></label><label><span>New password</span><input type="password" name="new_password" autoComplete="new-password" minLength={8} required /></label><label><span>Confirm new password</span><input type="password" name="confirm_password" autoComplete="new-password" minLength={8} required /></label><small>Use at least 8 characters.</small>{passwordMessage && <p className="account-password-message" role="alert">{passwordMessage}</p>}<div><button type="button" className="account-password-cancel" disabled={changingPassword} onClick={() => { setPasswordModalOpen(false); setPasswordMessage('') }}>Cancel</button><button type="submit" className="account-password-submit" disabled={changingPassword}>{changingPassword ? 'Changing…' : 'Change password'}</button></div></form></section></div>}
    {deleteModalOpen && <div className="account-password-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !deletingAccount) { setDeleteModalOpen(false); setDeleteMessage('') } }}><section className="account-password-modal account-delete-modal" role="dialog" aria-modal="true" aria-labelledby="account-delete-title"><header><div><span className="account-card-label">Permanent action</span><h2 id="account-delete-title">Delete your account?</h2></div><button type="button" aria-label="Close delete account dialog" disabled={deletingAccount} onClick={() => { setDeleteModalOpen(false); setDeleteMessage('') }}><X /></button></header><form onSubmit={deleteAccount}><p>This permanently removes your profile, appointments, messages, to-dos and unused credits. This action cannot be undone.</p><label><span>Type DELETE to confirm</span><input name="delete_confirmation" autoComplete="off" spellCheck={false} required autoFocus /></label>{deleteMessage && <p className="account-password-message" role="alert">{deleteMessage}</p>}<div><button type="button" className="account-password-cancel" disabled={deletingAccount} onClick={() => { setDeleteModalOpen(false); setDeleteMessage('') }}>Cancel</button><button type="submit" className="account-delete-confirm" disabled={deletingAccount}>{deletingAccount ? 'Deleting…' : 'Delete account'}</button></div></form></section></div>}
  </main>
}
export default AccountPage
