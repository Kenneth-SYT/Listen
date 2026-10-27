import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react'
import { ArrowLeft, CalendarCheck2, CalendarDays, ImagePlus, ListChecks, MessageCircle, UserRound } from 'lucide-react'
import { errorMessage, getSupabase, type Appointment, type Listener } from '../../lib/supabase'
import { supportTopics } from '../../lib/intake'
import { useSession } from '../../lib/useSession'
import LoginPage from '../LoginPage/LoginPage'
import ListenerAvailability, { type ListenerAvailabilitySlot } from './ListenerAvailability'
import SupportWorkspace, { type SupportContact } from '../SupportWorkspace/SupportWorkspace'
import '../AccountPage/AccountPage.css'
import './ListenerPage.css'

type Profile = { id: string; preferred_name: string; first_name: string }
type Intake = { user_id: string; selected_slot_id: string; topics: string[]; listener_note: string; listener_gender_preference: string; questionnaire_type: 'short' | 'long'; k6_score: number | null; k10_score: number | null }
type Availability = ListenerAvailabilitySlot
type View = 'sessions' | 'messages' | 'todos' | 'profile' | 'availability'

const listenerImagePath = (url: string) => {
  const marker = '/storage/v1/object/public/listener-images/'
  const markerIndex = url.indexOf(marker)
  return markerIndex >= 0 ? decodeURIComponent(url.slice(markerIndex + marker.length)) : ''
}

function ListenerPage() {
  const { session, loading } = useSession()
  const [view, setView] = useState<View>('sessions')
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
    const load = async () => {
      const client = getSupabase()
      const account = await client.from('listener_accounts').select('listener_id').eq('user_id', session.user.id).maybeSingle()
      if (account.error) throw account.error
      if (!account.data) { setMessage('Your account has not been linked to a listener profile. Ask an administrator to link it.'); return }
      const result = await Promise.all([
        client.from('listeners').select('*').eq('id', account.data.listener_id).single(),
        client.from('appointments').select('*').eq('listener_id', account.data.listener_id).eq('status', 'confirmed').order('starts_at').limit(500),
        client.from('profiles').select('id,preferred_name,first_name'),
        client.from('intake_responses').select('user_id,selected_slot_id,topics,k6_score,k10_score,questionnaire_type,listener_note,listener_gender_preference'),
        client.from('availability_windows').select('*').eq('listener_id', account.data.listener_id).gte('ends_at', new Date().toISOString()).order('starts_at').limit(500),
      ])
      for (const item of result) if (item.error) throw item.error
      if (!active) return
      setListener(result[0].data as Listener); setBookings(result[1].data as Appointment[]); setProfiles(result[2].data as Profile[]); setIntakes(result[3].data as Intake[]); setSlots(result[4].data as Availability[]); setMessage('')
    }
    void load().catch(error => { if (active) setMessage(errorMessage(error)) })
    return () => { active = false }
  }, [session?.user.id, refresh])
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
  const upcomingBookings = bookings.filter(booking => Date.parse(booking.starts_at) >= openedAt).sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))
  const supportContacts = Array.from(new Set(bookings.map(booking => booking.user_id))).map(userId => { const profile = profiles.find(item => item.id === userId); return { listenerId: listener?.id || '', userId, name: profile?.preferred_name || profile?.first_name || 'Customer' } satisfies SupportContact })
  return <section className="account-page listener-dashboard"><header><span className="listener-kicker">Listener workspace</span><h1>{listener?.name || 'My listener dashboard'}</h1><p>Manage your public profile, availability and confirmed sessions.</p></header><div className="listener-dashboard-layout">
    <aside className="listener-sidebar"><div className="listener-sidebar-heading"><span>Listener workspace</span><strong>Dashboard</strong></div><nav className="listener-tabs" aria-label="Listener dashboard sections">{([
      { id: 'sessions', label: 'Upcoming sessions', icon: CalendarCheck2 },
      { id: 'messages', label: 'Messaging', icon: MessageCircle },
      { id: 'todos', label: 'To-do list', icon: ListChecks },
      { id: 'profile', label: 'Public profile', icon: UserRound },
      { id: 'availability', label: 'Availability', icon: CalendarDays },
    ] as { id: View; label: string; icon: typeof CalendarCheck2 }[]).map(item => { const Icon = item.icon; const count = item.id === 'messages' ? unreadMessages : 0; return <button type="button" title={item.label} className={view === item.id ? 'active' : ''} aria-current={view === item.id ? 'page' : undefined} onClick={() => { setView(item.id); setMessage('') }} key={item.id}><Icon size={18} /><span>{item.label}</span>{count > 0 && <b className="listener-nav-badge" aria-label={`${count} unread messages`}>{count > 99 ? '99+' : count}</b>}</button> })}</nav><a className="listener-account-link" href="/account" title="My account"><ArrowLeft size={17} /><span>My account</span></a></aside>
    <div className="listener-dashboard-main">
    {message && <p className="listener-notice" role="status">{message}</p>}
    {listener && view === 'sessions' && <div className="account-list">{upcomingBookings.map(booking => { const profile = profiles.find(item => item.id === booking.user_id); const intake = intakes.find(item => item.user_id === booking.user_id && item.selected_slot_id === booking.slot_id); return <article className="account-card" key={booking.id}><h2>{profile?.preferred_name || profile?.first_name || 'Your customer'}</h2><p>{new Date(booking.starts_at).toLocaleString('en-AU')}</p>{intake && <><p><strong>{intake.questionnaire_type === 'long' ? `K10 wellbeing score: ${intake.k10_score}/50` : `K6 distress score: ${intake.k6_score}/24`}</strong></p><p><strong>Topics:</strong> {intake.topics.join(', ')}</p><p><strong>Listener preference:</strong> {intake.listener_gender_preference}</p>{intake.listener_note && <p><strong>Note:</strong> {intake.listener_note}</p>}</>}</article> })}{upcomingBookings.length === 0 && <p>You have no upcoming confirmed sessions.</p>}</div>}
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
    </div></div></section>
}
export default ListenerPage
