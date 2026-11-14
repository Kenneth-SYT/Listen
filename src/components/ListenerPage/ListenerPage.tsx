import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react'
import { ArrowLeft, CalendarCheck2, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Eye, ImagePlus, ListChecks, MessageCircle, UserRound, X } from 'lucide-react'
import { errorMessage, getSupabase, rescheduleAppointment, type Appointment, type Listener, type Slot } from '../../lib/supabase'
import { k10Options, k10Questions, k6Options, k6Questions, supportTopics } from '../../lib/intake'
import { useSession } from '../../lib/useSession'
import LoginPage from '../LoginPage/LoginPage'
import ListenerAvailability, { type ListenerAvailabilitySlot } from './ListenerAvailability'
import SupportWorkspace, { type SupportContact } from '../SupportWorkspace/SupportWorkspace'
import '../AccountPage/AccountPage.css'
import './ListenerPage.css'

type Profile = { id: string; preferred_name: string; first_name: string }
type Intake = { user_id: string; selected_slot_id: string; topics: string[]; listener_note: string; listener_gender_preference: string; questionnaire_type: 'short' | 'long'; k6_score: number | null; k10_score: number | null; k6_answers: number[] | null; k10_answers: number[] | null }
type Availability = ListenerAvailabilitySlot
type View = 'sessions' | 'messages' | 'todos' | 'profile' | 'availability'
const localDayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const slotDayKey = (value: string) => localDayKey(new Date(value))

const listenerImagePath = (url: string) => {
  const marker = '/storage/v1/object/public/listener-images/'
  const markerIndex = url.indexOf(marker)
  return markerIndex >= 0 ? decodeURIComponent(url.slice(markerIndex + marker.length)) : ''
}

function ListenerPage() {
  const { session, loading } = useSession()
  const [access, setAccess] = useState<'checking' | 'allowed' | 'denied'>('checking')
  const [accessUserId, setAccessUserId] = useState('')
  const [accessMessage, setAccessMessage] = useState('Checking listener access…')
  const [view, setView] = useState<View>('sessions')
  const [sessionsTab, setSessionsTab] = useState<'upcoming' | 'past'>('upcoming')
  const [listener, setListener] = useState<Listener | null>(null)
  const [bookings, setBookings] = useState<Appointment[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [intakes, setIntakes] = useState<Intake[]>([])
  const [slots, setSlots] = useState<Availability[]>([])
  const [message, setMessage] = useState('Loading your listener dashboard…')
  const [busy, setBusy] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [notificationRefresh, setNotificationRefresh] = useState(0)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [photoError, setPhotoError] = useState('')
  const [photoDragActive, setPhotoDragActive] = useState(false)
  const [removePhoto, setRemovePhoto] = useState(false)
  const [intakeBooking, setIntakeBooking] = useState<Appointment | null>(null)
  const [showWellbeingResponses, setShowWellbeingResponses] = useState(false)
  const [rescheduleBooking, setRescheduleBooking] = useState<Appointment | null>(null)
  const [rescheduleSlots, setRescheduleSlots] = useState<Slot[]>([])
  const [rescheduleSlotId, setRescheduleSlotId] = useState('')
  const [rescheduleDay, setRescheduleDay] = useState('')
  const [rescheduleMonth, setRescheduleMonth] = useState('')
  const [rescheduleLoading, setRescheduleLoading] = useState(false)
  const [rescheduleError, setRescheduleError] = useState('')
  const [completeBooking, setCompleteBooking] = useState<Appointment | null>(null)
  const [completeLoading, setCompleteLoading] = useState(false)
  const [completeError, setCompleteError] = useState('')
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [openedAt] = useState(() => Date.now())
  const refreshSupportNotifications = useCallback(() => setNotificationRefresh(value => value + 1), [])
  const visiblePhoto = photoPreview || (!removePhoto ? listener?.profile_image_url || '' : '')
  const selectPhoto = (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setPhotoError('Choose a JPG, PNG or WebP image.'); return }
    if (file.size > 5 * 1024 * 1024) { setPhotoError('The photo must be 5 MB or smaller.'); return }
    setPhotoFile(file); setPhotoPreview(URL.createObjectURL(file)); setPhotoError(''); setRemovePhoto(false)
  }
  const choosePhoto = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (file) selectPhoto(file) }
  const dropPhoto = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setPhotoDragActive(false); const file = event.dataTransfer.files?.[0]; if (file) selectPhoto(file) }
  const clearPhoto = () => { setPhotoFile(null); setPhotoPreview(''); setPhotoError(''); setRemovePhoto(true); if (photoInputRef.current) photoInputRef.current.value = '' }
  useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview) }, [photoPreview])
  useEffect(() => {
    if (!session?.user.id) return
    let active = true
    const userId = session.user.id
    const checkAccess = async () => {
      try {
        const { data, error } = await getSupabase().rpc('is_admin')
        if (!active) return
        if (error) throw error
        setAccessUserId(userId)
        if (data) {
          setAccess('denied')
          setAccessMessage('Administrator accounts cannot access the listener dashboard.')
          window.location.replace('/admin')
          return
        }
        setAccess('allowed')
        setAccessMessage('')
      } catch (error) {
        if (!active) return
        setAccessUserId(userId)
        setAccess('denied')
        setAccessMessage(errorMessage(error))
      }
    }
    void checkAccess()
    return () => { active = false }
  }, [session?.user.id])
  useEffect(() => {
    if (!session?.user.id || access !== 'allowed' || accessUserId !== session.user.id) return
    let active = true
    const load = async () => {
      const client = getSupabase()
      const account = await client.from('listener_accounts').select('listener_id').eq('user_id', session.user.id).maybeSingle()
      if (account.error) throw account.error
      if (!account.data) { setMessage('Your account has not been linked to a listener profile. Ask an administrator to link it.'); return }
      const result = await Promise.all([
        client.from('listeners').select('*').eq('id', account.data.listener_id).single(),
        client.from('appointments').select('*').eq('listener_id', account.data.listener_id).eq('status', 'confirmed').order('starts_at').limit(500),
        client.from('profiles').select('id,preferred_name,first_name'),
        client.from('intake_responses').select('user_id,selected_slot_id,topics,k6_score,k10_score,questionnaire_type,listener_note,listener_gender_preference,k6_answers,k10_answers'),
        client.from('availability_windows').select('*').eq('listener_id', account.data.listener_id).gte('ends_at', new Date().toISOString()).order('starts_at').limit(500),
      ])
      for (const item of result) if (item.error) throw item.error
      if (!active) return
      setListener(result[0].data as Listener); setBookings(result[1].data as Appointment[]); setProfiles(result[2].data as Profile[]); setIntakes(result[3].data as Intake[]); setSlots(result[4].data as Availability[]); setMessage('')
    }
    void load().catch(error => { if (active) setMessage(errorMessage(error)) })
    return () => { active = false }
  }, [access, accessUserId, session?.user.id, refresh])
  useEffect(() => {
    if (!session?.user.id || !listener?.id) return
    let active = true
    const client = getSupabase()
    const refreshUnread = async () => {
      const [messageResult, receiptResult] = await Promise.all([
        client.from('support_messages').select('listener_id,user_id,sender_user_id,created_at').eq('listener_id', listener.id),
        client.from('support_thread_read_receipts').select('listener_id,user_id,messages_read_at').eq('listener_id', listener.id).eq('reader_user_id', session.user.id),
      ])
      if (!active) return
      if (messageResult.error || receiptResult.error) {
        console.error('Could not refresh listener message notifications', messageResult.error || receiptResult.error)
        return
      }
      const readAt = new Map((receiptResult.data || []).map(item => [`${item.listener_id}:${item.user_id}`, Date.parse(item.messages_read_at)]))
      const count = (messageResult.data || []).filter(item => item.sender_user_id !== session.user.id && Date.parse(item.created_at) > (readAt.get(`${item.listener_id}:${item.user_id}`) || 0)).length
      setUnreadMessages(count)
    }
    void refreshUnread()
    const channel = client.channel(`listener-message-notifications-${listener.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_messages', filter: `listener_id=eq.${listener.id}` }, () => void refreshUnread())
      .subscribe()
    const timer = window.setInterval(() => void refreshUnread(), 5000)
    window.addEventListener('focus', refreshUnread)
    return () => {
      active = false
      window.clearInterval(timer)
      window.removeEventListener('focus', refreshUnread)
      void client.removeChannel(channel)
    }
  }, [listener?.id, notificationRefresh, session?.user.id])
  const submitProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!listener) return
    const data = new FormData(event.currentTarget); setBusy(true); setMessage(''); setPhotoError('')
    const currentImage = listener.profile_image_url || ''
    let profileImageUrl = removePhoto ? '' : currentImage
    let uploadedPath = ''
    try {
      const client = getSupabase()
      if (photoFile) {
        const extensions: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
        const extension = extensions[photoFile.type]
        if (!extension) throw new Error('Choose a JPG, PNG or WebP image.')
        if (photoFile.size > 5 * 1024 * 1024) throw new Error('The photo must be 5 MB or smaller.')
        uploadedPath = `profiles/${listener.id}/${crypto.randomUUID()}.${extension}`
        const { error: uploadError } = await client.storage.from('listener-images').upload(uploadedPath, photoFile, { contentType: photoFile.type, cacheControl: '31536000' })
        if (uploadError) throw uploadError
        profileImageUrl = client.storage.from('listener-images').getPublicUrl(uploadedPath).data.publicUrl
      }
      const languages = String(data.get('languages')).split(',').map(value => value.trim()).filter(Boolean)
      const matches = data.getAll('matches').map(String)
      const { error } = await client.rpc('update_listener_profile', { p_name: String(data.get('name')), p_focus: String(data.get('focus')), p_bio: String(data.get('bio')), p_gender: String(data.get('gender')), p_pronouns: String(data.get('pronouns')), p_languages: languages, p_matches: matches, p_profile_image_url: profileImageUrl })
      if (error) throw error
      const oldImagePath = listenerImagePath(currentImage)
      if (oldImagePath && currentImage !== profileImageUrl) await client.storage.from('listener-images').remove([oldImagePath])
      setPhotoFile(null); setPhotoPreview(''); setRemovePhoto(false)
      setMessage('Your listener profile is published and ready for bookings.'); setRefresh(value => value + 1)
    } catch (error) {
      if (uploadedPath) await getSupabase().storage.from('listener-images').remove([uploadedPath])
      const detail = errorMessage(error); setMessage(detail); setPhotoError(detail)
    } finally { setBusy(false) }
  }
  const toggleSlot = async (slot: Availability) => { setBusy(true); setMessage(''); try { const { error } = await getSupabase().rpc('listener_set_availability_window', { p_window: slot.id, p_enabled: !slot.enabled }); if (error) throw error; setRefresh(value => value + 1) } catch (error) { setMessage(errorMessage(error)) } finally { setBusy(false) } }
  const deleteSlot = async (slot: Availability) => {
    if (!window.confirm('Delete this unavailable working window permanently?')) return
    setBusy(true); setMessage('')
    try { const { error } = await getSupabase().rpc('listener_delete_availability_window', { p_window: slot.id }); if (error) throw error; setMessage('The unavailable working window was deleted.'); setRefresh(value => value + 1) }
    catch (error) { setMessage(errorMessage(error)) } finally { setBusy(false) }
  }
  if (loading) return <p role="status">Checking your account…</p>
  if (!session) return <LoginPage />
  if (accessUserId !== session.user.id) return <section className="account-page listener-dashboard"><p className="listener-notice" role="status">Checking listener access…</p></section>
  if (access !== 'allowed') return <section className="account-page listener-dashboard"><p className="listener-notice" role={access === 'denied' ? 'alert' : 'status'}>{accessMessage}</p></section>
  const upcomingBookings = bookings.filter(booking => !booking.completed_at && Date.parse(booking.ends_at) > openedAt).sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))
  const pastBookings = bookings.filter(booking => Boolean(booking.completed_at) || Date.parse(booking.ends_at) <= openedAt).sort((a, b) => Date.parse(b.starts_at) - Date.parse(a.starts_at))
  const supportContacts = Array.from(new Set(bookings.map(booking => booking.user_id))).map(userId => { const profile = profiles.find(item => item.id === userId); return { listenerId: listener?.id || '', userId, name: profile?.preferred_name || profile?.first_name || 'Customer' } satisfies SupportContact })
  const openReschedule = async (booking: Appointment) => {
    setRescheduleBooking(booking)
    setRescheduleSlots([])
    setRescheduleSlotId('')
    setRescheduleDay('')
    setRescheduleMonth('')
    setRescheduleError('')
    setRescheduleLoading(true)
    try {
      const { data, error } = await getSupabase().rpc('available_slots')
      if (error) throw error
      const duration = Date.parse(booking.ends_at) - Date.parse(booking.starts_at)
      const options = (data as Slot[]).filter(slot => slot.listener_id === booking.listener_id && slot.id !== booking.slot_id && Date.parse(slot.ends_at) - Date.parse(slot.starts_at) >= duration)
      setRescheduleSlots(options)
      if (options[0]) {
        const firstDay = slotDayKey(options[0].starts_at)
        setRescheduleDay(firstDay)
        setRescheduleMonth(firstDay.slice(0, 7))
      }
    } catch (error) {
      setRescheduleError(errorMessage(error))
    } finally {
      setRescheduleLoading(false)
    }
  }
  const submitReschedule = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!rescheduleBooking || !rescheduleSlotId) return
    setRescheduleLoading(true)
    setRescheduleError('')
    try {
      const result = await rescheduleAppointment(rescheduleBooking.id, rescheduleSlotId)
      setBookings(current => current.map(booking => booking.id === result.booking.id ? result.booking : booking))
      setRescheduleBooking(null)
      setMessage(result.email_sent ? 'The session was rescheduled and the customer was notified by email.' : 'The session was rescheduled, but the customer email could not be sent. Please contact them directly.')
      setRefresh(value => value + 1)
    } catch (error) {
      setRescheduleError(errorMessage(error))
    } finally {
      setRescheduleLoading(false)
    }
  }
  const submitCompletion = async () => {
    if (!completeBooking) return
    setCompleteLoading(true)
    setCompleteError('')
    try {
      const { data, error } = await getSupabase().rpc('listener_complete_appointment', { p_appointment: completeBooking.id })
      if (error) throw error
      const completed = data as Appointment
      setBookings(current => current.map(booking => booking.id === completed.id ? completed : booking))
      setCompleteBooking(null)
      setMessage('The appointment was marked as completed and moved to the customer’s past sessions.')
      setRefresh(value => value + 1)
    } catch (error) {
      setCompleteError(errorMessage(error))
    } finally {
      setCompleteLoading(false)
    }
  }
  const sessionRow = (booking: Appointment) => {
    const profile = profiles.find(item => item.id === booking.user_id)
    const intake = intakes.find(item => item.user_id === booking.user_id && item.selected_slot_id === booking.slot_id)
    const startsAt = new Date(booking.starts_at)
    const duration = Math.round((Date.parse(booking.ends_at) - Date.parse(booking.starts_at)) / 60000)
    const endTime = Date.parse(booking.ends_at)
    const completionDeadline = endTime + 60 * 60 * 1000
    const completed = Boolean(booking.completed_at)
    const canComplete = !completed && openedAt >= endTime && openedAt <= completionDeadline
    const completionMissed = !completed && openedAt > completionDeadline
    const canReschedule = !completed && Date.parse(booking.starts_at) > openedAt
    const sessionType = booking.rate_code === 'intro' ? 'Introductory chat' : booking.rate_code === 'extended' ? 'Extended support session' : 'Support session'
    return <article className="listener-session-row" key={booking.id}>
      <time className="listener-session-date" dateTime={booking.starts_at}>
        <strong>{startsAt.toLocaleDateString('en-AU', { day: 'numeric' })}</strong>
        <span>{startsAt.toLocaleDateString('en-AU', { month: 'short' })}</span>
        <small>{startsAt.toLocaleDateString('en-AU', { year: 'numeric' })}</small>
      </time>
      <div className="listener-session-main">
        <span className="listener-session-type">{sessionType}</span>
        <h3>{profile?.preferred_name || profile?.first_name || 'Your customer'}</h3>
        <div className="listener-session-meta">
          <span><CalendarDays />{startsAt.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          <span><Clock3 />{startsAt.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })} · {duration === 120 ? '2 hours' : `${duration} minutes`}</span>
          {intake && <button type="button" className="listener-session-info" onClick={() => { setShowWellbeingResponses(false); setIntakeBooking(booking) }}><Eye />View questionnaire</button>}
        </div>
      </div>
      <div className={`listener-session-actions${canReschedule ? ' upcoming' : ''}`}>{!canReschedule && <span className={`listener-session-status${completed ? ' completed' : canComplete ? ' awaiting' : completionMissed ? ' missed' : ''}`}><CheckCircle2 />{completed ? 'Completed' : canComplete ? 'Awaiting completion' : completionMissed ? 'Not completed' : 'Confirmed'}</span>}{canReschedule && <button type="button" className="listener-session-reschedule" onClick={() => void openReschedule(booking)}><CalendarDays />Reschedule</button>}{!completed && !completionMissed && <button type="button" className="listener-session-complete" disabled={!canComplete} title={canComplete ? 'Mark this appointment as completed' : `Available after the session ends at ${new Date(booking.ends_at).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })}`} onClick={() => { setCompleteError(''); setCompleteBooking(booking) }}><CheckCircle2 />Complete</button>}</div>
    </article>
  }
  return <section className="account-page listener-dashboard"><header><span className="listener-kicker">Listener workspace</span><h1>{listener?.name || 'My listener dashboard'}</h1><p>Manage your public profile, availability and confirmed sessions.</p></header><div className="listener-dashboard-layout">
    <aside className="listener-sidebar"><div className="listener-sidebar-heading"><span>Listener workspace</span><strong>Dashboard</strong></div><nav className="listener-tabs" aria-label="Listener dashboard sections">{([
      { id: 'sessions', label: 'Sessions', icon: CalendarCheck2 },
      { id: 'messages', label: 'Messaging', icon: MessageCircle },
      { id: 'todos', label: 'To-do list', icon: ListChecks },
      { id: 'profile', label: 'Public profile', icon: UserRound },
      { id: 'availability', label: 'Availability', icon: CalendarDays },
    ] as { id: View; label: string; icon: typeof CalendarCheck2 }[]).map(item => { const Icon = item.icon; const count = item.id === 'messages' ? unreadMessages : 0; return <button type="button" title={item.label} className={view === item.id ? 'active' : ''} aria-current={view === item.id ? 'page' : undefined} onClick={() => { setView(item.id); setMessage('') }} key={item.id}><Icon size={18} /><span>{item.label}</span>{count > 0 && <b className="listener-nav-badge" aria-label={`${count} unread messages`}>{count > 99 ? '99+' : count}</b>}</button> })}</nav><a className="listener-account-link" href="/account" title="My account"><ArrowLeft size={17} /><span>My account</span></a></aside>
    <div className="listener-dashboard-main">
    {message && <p className="listener-notice" role="status">{message}</p>}
    {listener && view === 'sessions' && <section className="listener-sessions-card">
      <header className="listener-section-heading"><span><CalendarCheck2 />Your schedule</span><h2>Sessions</h2><p>Review upcoming appointments and keep a record of previous sessions.</p></header>
      <div className="listener-session-record-tabs" role="tablist" aria-label="Listener session records"><button type="button" role="tab" aria-selected={sessionsTab === 'upcoming'} className={sessionsTab === 'upcoming' ? 'active' : ''} onClick={() => setSessionsTab('upcoming')}>Upcoming <span>{upcomingBookings.length}</span></button><button type="button" role="tab" aria-selected={sessionsTab === 'past'} className={sessionsTab === 'past' ? 'active' : ''} onClick={() => setSessionsTab('past')}>Past <span>{pastBookings.length}</span></button></div>
      {sessionsTab === 'upcoming' ? upcomingBookings.length > 0
        ? <div className="listener-session-list">{upcomingBookings.map(sessionRow)}</div>
        : <div className="listener-sessions-empty"><span><CalendarCheck2 /></span><h3>No upcoming sessions</h3><p>Confirmed customer appointments will appear here.</p></div>
        : pastBookings.length > 0
          ? <div className="listener-session-list">{pastBookings.map(sessionRow)}</div>
          : <div className="listener-sessions-empty"><span><CalendarCheck2 /></span><h3>No past sessions</h3><p>Completed and elapsed appointments will appear here.</p></div>}
    </section>}
    {listener && view === 'messages' && <SupportWorkspace role="listener" mode="messages" currentUserId={session.user.id} contacts={supportContacts} onUnreadChange={refreshSupportNotifications} />}
    {listener && view === 'todos' && <SupportWorkspace role="listener" mode="todos" currentUserId={session.user.id} contacts={supportContacts} />}
    {listener && view === 'profile' && <form className="listener-form listener-profile-form" onSubmit={submitProfile}>
      <header className="listener-profile-header">
        <div>
          <span className="listener-profile-eyebrow">Public presence</span>
          <h2>Your listener profile</h2>
          <p>{listener.profile_status === 'suspended' || listener.active === false ? 'Your profile is paused. An administrator must reactivate your listener access.' : listener.profile_status === 'published' ? 'Keep your public details current so customers know what support you offer.' : 'Complete the required details to publish your profile and availability.'}</p>
        </div>
        <span className={`profile-state ${listener.profile_status}`}>{listener.profile_status}</span>
      </header>

      <section className="listener-profile-section">
        <div className="listener-profile-section-heading">
          <span className="listener-profile-step">1</span>
          <div><h3>Photo and introduction</h3><p>Help customers recognise you and understand your role.</p></div>
        </div>
        <div className={'listener-profile-photo' + (photoDragActive ? ' dragging' : '')} onDragEnter={event => { event.preventDefault(); setPhotoDragActive(true) }} onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy' }} onDragLeave={event => { if (event.currentTarget === event.target) setPhotoDragActive(false) }} onDrop={dropPhoto}>
          <div className="listener-profile-photo-preview">{visiblePhoto ? <img src={visiblePhoto} alt="Profile photo preview" /> : <ImagePlus />}</div>
          <div className="listener-profile-photo-copy">
            <span>Profile photo <small>Optional</small></span>
            <strong>{visiblePhoto ? photoFile?.name || 'Current profile photo' : 'Drop a profile photo here'}</strong>
            <p>{visiblePhoto ? 'Choose another image to replace it.' : 'Or choose an image from your computer.'}</p>
            <small>JPG, PNG or WebP · Maximum 5 MB</small>
            <div><button type="button" onClick={() => photoInputRef.current?.click()}><ImagePlus />{visiblePhoto ? 'Replace photo' : 'Choose photo'}</button>{visiblePhoto && <button type="button" className="remove" onClick={clearPhoto}>Remove</button>}</div>
          </div>
          <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={choosePhoto} />
        </div>
        {photoError && <p className="listener-profile-photo-error" role="alert">{photoError}</p>}
        <div className="listener-profile-fields listener-profile-fields-two">
          <label>Display name<input name="name" defaultValue={listener.name} maxLength={100} required /></label>
          <label>Role or focus<input name="focus" defaultValue={listener.focus} maxLength={200} required /></label>
        </div>
        <label>About you<textarea name="bio" defaultValue={listener.bio} maxLength={2000} rows={5} required /></label>
      </section>

      <section className="listener-profile-section">
        <div className="listener-profile-section-heading">
          <span className="listener-profile-step">2</span>
          <div><h3>Personal details</h3><p>Share the details that help customers find the right listener.</p></div>
        </div>
        <div className="listener-profile-fields listener-profile-fields-two">
          <label>Gender<select name="gender" defaultValue={listener.gender}><option value="">Prefer not to say</option><option>Woman</option><option>Man</option><option>Non-binary or another gender</option></select></label>
          <label>Pronouns<input name="pronouns" defaultValue={listener.pronouns} placeholder="e.g. he/him" /></label>
          <label className="listener-profile-field-wide">Languages, separated by commas<input name="languages" defaultValue={listener.languages?.join(', ')} required /></label>
        </div>
      </section>

      <section className="listener-profile-section listener-profile-topics-section">
        <div className="listener-profile-section-heading">
          <span className="listener-profile-step">3</span>
          <div><h3>Topics you support</h3><p>Select the areas where you feel comfortable supporting customers.</p></div>
        </div>
        <fieldset><legend>Choose the topics customers can match with</legend><div className="listener-topic-grid">{supportTopics.filter(value => value !== 'I’m not sure yet').map(value => <label key={value}><input type="checkbox" name="matches" value={value} defaultChecked={listener.matches.includes(value)} />{value}</label>)}</div></fieldset>
      </section>

      <footer className="listener-profile-actions">
        <div><strong>{listener.profile_status === 'published' ? 'Your profile is live' : 'Ready to publish?'}</strong><span>Saved changes appear on the Our listeners page immediately.</span></div>
        <button disabled={busy || listener.profile_status === 'suspended' || listener.active === false}>{busy ? 'Saving…' : listener.profile_status === 'published' ? 'Update public profile' : 'Save and publish profile'}</button>
      </footer>
    </form>}
    {listener && view === 'availability' && <ListenerAvailability listenerId={listener.id} profileStatus={listener.profile_status} active={listener.active} onOpenProfile={() => setView('profile')} slots={slots} busy={busy} setBusy={setBusy} setMessage={setMessage} refresh={() => setRefresh(value => value + 1)} toggleSlot={toggleSlot} deleteSlot={deleteSlot} />}
    </div></div>
    {intakeBooking && (() => {
      const intake = intakes.find(item => item.user_id === intakeBooking.user_id && item.selected_slot_id === intakeBooking.slot_id)
      const profile = profiles.find(item => item.id === intakeBooking.user_id)
      const isLong = intake?.questionnaire_type === 'long'
      const score = isLong ? `K10 wellbeing score: ${intake?.k10_score}/50` : `K6 distress score: ${intake?.k6_score}/24`
      const questions = isLong ? k10Questions : k6Questions
      const options = isLong ? k10Options : k6Options
      const answers = isLong ? intake?.k10_answers : intake?.k6_answers
      return <div className="listener-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setIntakeBooking(null) }}><section className="listener-modal" role="dialog" aria-modal="true" aria-labelledby="listener-intake-title"><header><div><span>Questionnaire details</span><h2 id="listener-intake-title">{profile?.preferred_name || profile?.first_name || 'Customer'}</h2></div><button type="button" aria-label="Close questionnaire details" onClick={() => setIntakeBooking(null)}><X /></button></header>{intake ? <div className="listener-intake-modal-content"><dl><div><dt>Questionnaire</dt><dd>{isLong ? 'Long questionnaire' : 'Short check-in'}</dd></div><div className="listener-wellbeing-summary"><dt>Wellbeing</dt><dd>{score}</dd><button type="button" aria-expanded={showWellbeingResponses} aria-controls="listener-wellbeing-responses" onClick={() => setShowWellbeingResponses(value => !value)}>{showWellbeingResponses ? 'Hide responses' : 'View responses'}</button></div><div><dt>Listener preference</dt><dd>{intake.listener_gender_preference || 'No preference'}</dd></div></dl>{showWellbeingResponses && <section className="listener-wellbeing-responses" id="listener-wellbeing-responses"><h3>Wellbeing responses</h3><ol>{questions.map((question, index) => { const answer = answers?.[index]; const optionIndex = answer == null ? -1 : isLong ? answer - 1 : answer; return <li key={question}><span>{question}</span><strong>{optionIndex < 0 ? 'Not answered' : options[optionIndex] || `Score ${answer}`}</strong></li> })}</ol></section>}<div><strong>Topics</strong><div className="listener-session-topics">{intake.topics.map(topic => <span key={topic}>{topic}</span>)}</div></div>{intake.listener_note && <p className="listener-session-note"><strong>Customer note</strong>{intake.listener_note}</p>}</div> : <p className="listener-modal-empty">Questionnaire details are not available for this session.</p>}</section></div>
    })()}
    {rescheduleBooking && (() => {
      const availableDays = [...new Set(rescheduleSlots.map(slot => slotDayKey(slot.starts_at)))].sort()
      const selectedDay = availableDays.includes(rescheduleDay) ? rescheduleDay : availableDays[0] || ''
      const monthKey = rescheduleMonth || selectedDay.slice(0, 7)
      const [year, month] = monthKey.split('-').map(Number)
      const monthDate = new Date(year, month - 1, 1)
      const firstWeekday = (monthDate.getDay() + 6) % 7
      const daysInMonth = new Date(year, month, 0).getDate()
      const availableDaySet = new Set(availableDays)
      const firstMonth = availableDays[0]?.slice(0, 7)
      const lastMonth = availableDays[availableDays.length - 1]?.slice(0, 7)
      const daySlots = rescheduleSlots.filter(slot => slotDayKey(slot.starts_at) === selectedDay).sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))
      const shiftMonth = (delta: number) => {
        const next = new Date(year, month - 1 + delta, 1)
        const nextMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`
        setRescheduleMonth(nextMonth)
        const firstAvailable = availableDays.find(day => day.startsWith(nextMonth))
        if (firstAvailable) { setRescheduleDay(firstAvailable); setRescheduleSlotId('') }
      }
      return <div className="listener-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !rescheduleLoading) setRescheduleBooking(null) }}><section className="listener-modal listener-reschedule-modal" role="dialog" aria-modal="true" aria-labelledby="listener-reschedule-title"><header><div><span>Change appointment</span><h2 id="listener-reschedule-title">Choose a new time</h2></div><button type="button" aria-label="Close reschedule dialog" disabled={rescheduleLoading} onClick={() => setRescheduleBooking(null)}><X /></button></header><form onSubmit={submitReschedule}><div className="listener-reschedule-current"><span>Current appointment</span><strong>{new Date(rescheduleBooking.starts_at).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })} at {new Date(rescheduleBooking.starts_at).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })}</strong></div>{rescheduleLoading && !rescheduleSlots.length ? <p role="status">Loading available times…</p> : rescheduleSlots.length ? <div className="listener-reschedule-schedule"><div className="listener-reschedule-calendar"><div className="listener-reschedule-calendar-toolbar"><strong>{monthDate.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })}</strong><div><button type="button" aria-label="Previous month" disabled={monthKey <= firstMonth} onClick={() => shiftMonth(-1)}><ChevronLeft /></button><button type="button" aria-label="Next month" disabled={monthKey >= lastMonth} onClick={() => shiftMonth(1)}><ChevronRight /></button></div></div><div className="listener-reschedule-weekdays">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <span key={day}>{day}</span>)}</div><div className="listener-reschedule-calendar-grid">{Array.from({ length: firstWeekday }, (_, index) => <span key={`blank-${index}`} />)}{Array.from({ length: daysInMonth }, (_, index) => { const date = new Date(year, month - 1, index + 1); const key = localDayKey(date); return <button type="button" key={key} disabled={!availableDaySet.has(key)} className={selectedDay === key ? 'selected' : ''} aria-label={date.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} aria-pressed={selectedDay === key} onClick={() => { setRescheduleDay(key); setRescheduleSlotId('') }}>{index + 1}</button> })}</div></div><div className="listener-reschedule-time-panel"><strong><Clock3 />Available times</strong><span>{selectedDay ? new Date(`${selectedDay}T12:00:00`).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Choose a date'}</span><div>{daySlots.map(slot => <button type="button" className={rescheduleSlotId === slot.id ? 'selected' : ''} aria-pressed={rescheduleSlotId === slot.id} key={slot.id} onClick={() => setRescheduleSlotId(slot.id)}>{new Date(slot.starts_at).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })}</button>)}</div></div></div> : !rescheduleLoading && <p>No alternative times are currently available.</p>}{rescheduleError && <p className="listener-modal-error" role="alert">{rescheduleError}</p>}<p className="listener-reschedule-note">The customer will receive an email with the previous and updated appointment times.</p><footer><button type="button" className="secondary" disabled={rescheduleLoading} onClick={() => setRescheduleBooking(null)}>Keep current time</button><button type="submit" disabled={rescheduleLoading || !rescheduleSlotId}>{rescheduleLoading ? 'Updating…' : 'Confirm new time'}</button></footer></form></section></div>
    })()}
    {completeBooking && <div className="listener-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !completeLoading) setCompleteBooking(null) }}><section className="listener-modal listener-complete-modal" role="dialog" aria-modal="true" aria-labelledby="listener-complete-title"><header><div><span>Finish appointment</span><h2 id="listener-complete-title">Mark session as completed?</h2></div><button type="button" aria-label="Close completion dialog" disabled={completeLoading} onClick={() => setCompleteBooking(null)}><X /></button></header><div className="listener-complete-content"><p>This confirms that the session took place. It will be removed from your upcoming schedule and shown in the customer’s past appointments.</p><div className="listener-reschedule-current"><span>Appointment</span><strong>{new Date(completeBooking.starts_at).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })} at {new Date(completeBooking.starts_at).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })}</strong></div>{completeError && <p className="listener-modal-error" role="alert">{completeError}</p>}<footer><button type="button" className="secondary" disabled={completeLoading} onClick={() => setCompleteBooking(null)}>Go back</button><button type="button" disabled={completeLoading} onClick={() => void submitCompletion()}>{completeLoading ? 'Finishing…' : 'Yes, complete session'}</button></footer></div></section></div>}
    </section>
}
export default ListenerPage
