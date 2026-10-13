import { ImagePlus, UserRound, X } from 'lucide-react'
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import type { Listener } from '../../lib/supabase'
import { supportTopics } from '../../lib/intake'

type Props = {
  listeners: Listener[]
  selectedListener?: Listener
  busy: boolean
  onSelect: (listenerId: string) => void
  onSaveProfile: (event: FormEvent<HTMLFormElement>, listenerId: string) => Promise<boolean>
  onSetStatus: (listener: Listener, status: 'published' | 'suspended') => void
}

const isLive = (listener: Listener) => listener.profile_status === 'published' && listener.active !== false

export default function AdminManagementSection({ listeners, selectedListener, busy, onSelect, onSaveProfile, onSetStatus }: Props) {
  const [editingListenerId, setEditingListenerId] = useState<string | null>(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [removePhoto, setRemovePhoto] = useState(false)
  const editingProfile = selectedListener?.id === editingListenerId
  const visiblePhoto = photoPreview || (!removePhoto ? selectedListener?.profile_image_url || '' : '')

  const closeEditor = () => { setEditingListenerId(null); setPhotoPreview(''); setRemovePhoto(false) }
  const openEditor = (listenerId: string) => { setPhotoPreview(''); setRemovePhoto(false); setEditingListenerId(listenerId) }
  const choosePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setPhotoPreview(URL.createObjectURL(file))
    setRemovePhoto(false)
  }

  useEffect(() => {
    if (!editingProfile) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setEditingListenerId(null); setPhotoPreview(''); setRemovePhoto(false) } }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [editingProfile])
  useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview) }, [photoPreview])

  return <section className="admin-section admin-management-section">
    <div className="admin-section-heading"><div><h2>Listener management</h2><p>Select a listener to review their public profile and manage their account.</p></div><span>{listeners.length} {listeners.length === 1 ? 'listener' : 'listeners'}</span></div>
    <div className="admin-management-layout">
      <aside className="admin-management-sidebar">
        <div className="admin-management-sidebar-heading"><span>Listener directory</span><strong>Profiles</strong></div>
        <nav aria-label="Choose a listener">{listeners.map(person => <button type="button" key={person.id} className={selectedListener?.id === person.id ? 'active' : ''} aria-pressed={selectedListener?.id === person.id} onClick={() => onSelect(person.id)}><span>{person.name}</span><small>{person.focus}</small><i className={isLive(person) ? 'live' : ''}>{isLive(person) ? 'Live' : person.profile_status || 'Draft'}</i></button>)}</nav>
        {!listeners.length && <p className="admin-management-empty">No listener profiles yet.</p>}
      </aside>
      <div className="admin-management-detail">{selectedListener ? <article className="admin-listener-detail" key={selectedListener.id}>
        <header><div className="admin-user-title"><div className="admin-avatar"><UserRound /></div><div><span>Listener profile</span><h3>{selectedListener.name}</h3><p>{selectedListener.focus}</p></div></div><div className="admin-listener-state"><span className={isLive(selectedListener) ? 'live' : ''}>{selectedListener.profile_status || 'draft'}</span>{selectedListener.active === false && <span className="inactive">Inactive</span>}</div></header>
        <div className="admin-listener-detail-grid"><section><span>About</span><p>{selectedListener.bio || 'This listener has not written a public biography yet.'}</p></section><dl><div><dt>Languages</dt><dd>{selectedListener.languages?.join(', ') || 'Not added'}</dd></div><div><dt>Pronouns</dt><dd>{selectedListener.pronouns || 'Not added'}</dd></div><div><dt>Gender</dt><dd>{selectedListener.gender || 'Not added'}</dd></div><div><dt>Visibility</dt><dd>{isLive(selectedListener) ? 'Publicly visible' : 'Not currently public'}</dd></div></dl></div>
        <section className="admin-listener-topics"><span>Supported topics</span><div>{selectedListener.matches.map(topic => <small key={topic}>{topic}</small>)}</div></section>
        <div className="admin-listener-detail-actions"><button type="button" onClick={() => openEditor(selectedListener.id)}>Edit public profile</button>{selectedListener.profile_status === 'suspended' || selectedListener.active === false ? <button type="button" disabled={busy} onClick={() => onSetStatus(selectedListener, 'published')}>Reactivate</button> : <button type="button" disabled={busy} className="admin-secondary" onClick={() => onSetStatus(selectedListener, 'suspended')}>Suspend</button>}</div>
      </article> : <div className="admin-management-placeholder"><UserRound /><h3>Select a listener</h3><p>Choose a name from the directory to view their profile.</p></div>}</div>
    </div>
    {editingProfile && selectedListener && <div className="admin-profile-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) closeEditor() }}>
      <section className="admin-profile-modal" role="dialog" aria-modal="true" aria-labelledby="admin-profile-modal-title">
        <header><div><span>Public listener profile</span><h3 id="admin-profile-modal-title">Edit {selectedListener.name}</h3><p>Current profile values are shown below. Changes appear publicly only after you save.</p></div><button type="button" aria-label="Close profile editor" onClick={closeEditor}><X /></button></header>
        <form className="admin-form-card admin-profile-modal-form" onSubmit={async event => { if (await onSaveProfile(event, selectedListener.id)) closeEditor() }}>
          <label>Display name<input name="name" defaultValue={selectedListener.name} maxLength={100} required /></label>
          <label>Role or focus<input name="focus" defaultValue={selectedListener.focus} maxLength={200} required /></label>
          <label className="admin-profile-about">About<textarea name="bio" defaultValue={selectedListener.bio || ''} maxLength={2000} rows={5} required /></label>
          <label>Gender<select name="gender" defaultValue={selectedListener.gender || ''}><option value="">Prefer not to say</option><option>Woman</option><option>Man</option><option>Non-binary or another gender</option></select></label>
          <label>Pronouns<input name="pronouns" defaultValue={selectedListener.pronouns || ''} /></label>
          <label>Languages, separated by commas<input name="languages" defaultValue={selectedListener.languages?.join(', ') || ''} required /></label>
          <div className="admin-review-photo-field admin-profile-photo-field">
            <span>Profile photo <small>Optional</small></span>
            {visiblePhoto ? <div className="admin-review-photo-preview"><img src={visiblePhoto} alt="Selected listener profile preview" /><button type="button" aria-label="Remove selected profile photo" onClick={() => { setPhotoPreview(''); setRemovePhoto(true) }}><X /></button></div> : <div className="admin-review-photo-placeholder"><ImagePlus /><span>No photo selected</span></div>}
            <label className="admin-review-photo-button"><ImagePlus />{visiblePhoto ? 'Choose another photo' : 'Choose photo'}<input name="image" type="file" accept="image/jpeg,image/png,image/webp" onChange={choosePhoto} /></label>
            <small>The image is uploaded only after you save. JPG, PNG or WebP, up to 5 MB.</small>
          </div>
          <input name="current-image" type="hidden" value={selectedListener.profile_image_url || ''} />
          <input name="remove-image" type="hidden" value={removePhoto ? 'true' : 'false'} />
          <fieldset className="admin-topic-fieldset admin-profile-topics"><legend>Supported topics</legend><div>{supportTopics.filter(topic => topic !== 'I’m not sure yet').map(topic => <label key={topic}><input type="checkbox" name="matches" value={topic} defaultChecked={selectedListener.matches.includes(topic)} />{topic}</label>)}</div></fieldset>
          <footer className="admin-profile-modal-actions"><button type="button" className="admin-secondary" onClick={closeEditor}>Cancel</button><button disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button></footer>
        </form>
      </section>
    </div>}
  </section>
}

