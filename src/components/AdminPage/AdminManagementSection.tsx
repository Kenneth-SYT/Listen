import { ImagePlus, UserRound, X } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react'
import type { Listener } from '../../lib/supabase'
import { supportTopics } from '../../lib/intake'

type Props = {
  listeners: Listener[]
  selectedListener?: Listener
  busy: boolean
  message: string
  onSelect: (listenerId: string) => void
  onSaveProfile: (event: FormEvent<HTMLFormElement>, listenerId: string, photoFile: File | null) => Promise<boolean>
  onSetStatus: (listener: Listener, status: 'published' | 'suspended') => void
}

const isLive = (listener: Listener) => listener.profile_status === 'published' && listener.active !== false

export default function AdminManagementSection({ listeners, selectedListener, busy, message, onSelect, onSaveProfile, onSetStatus }: Props) {
  const [editingListenerId, setEditingListenerId] = useState<string | null>(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoError, setPhotoError] = useState('')
  const [photoDragActive, setPhotoDragActive] = useState(false)
  const [removePhoto, setRemovePhoto] = useState(false)
  const [saveAttempted, setSaveAttempted] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const editingProfile = selectedListener?.id === editingListenerId
  const visiblePhoto = photoPreview || (!removePhoto ? selectedListener?.profile_image_url || '' : '')

  const resetPhotoState = () => { setPhotoPreview(''); setPhotoFile(null); setPhotoError(''); setPhotoDragActive(false); setRemovePhoto(false); setSaveAttempted(false) }
  const closeEditor = () => { setEditingListenerId(null); resetPhotoState() }
  const openEditor = (listenerId: string) => { resetPhotoState(); setEditingListenerId(listenerId) }
  const selectPhoto = (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setPhotoError('Choose a JPG, PNG or WebP image.'); return }
    if (file.size > 5 * 1024 * 1024) { setPhotoError('The photo must be 5 MB or smaller.'); return }
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    setPhotoError('')
    setRemovePhoto(false)
  }
  const choosePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    selectPhoto(file)
  }
  const dropPhoto = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setPhotoDragActive(false)
    const file = event.dataTransfer.files?.[0]
    if (file) selectPhoto(file)
  }
  const removeSelectedPhoto = () => { setPhotoPreview(''); setPhotoFile(null); setPhotoError(''); setRemovePhoto(true); if (photoInputRef.current) photoInputRef.current.value = '' }

  useEffect(() => {
    if (!editingProfile) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setEditingListenerId(null)
      setPhotoPreview('')
      setPhotoFile(null)
      setPhotoError('')
      setPhotoDragActive(false)
      setRemovePhoto(false)
      setSaveAttempted(false)
    }
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
        <header><div className="admin-user-title"><div className="admin-avatar">{selectedListener.profile_image_url ? <img src={selectedListener.profile_image_url} alt="" /> : <UserRound />}</div><div><span>Listener profile</span><h3>{selectedListener.name}</h3><p>{selectedListener.focus}</p></div></div><div className="admin-listener-state"><span className={isLive(selectedListener) ? 'live' : ''}>{selectedListener.profile_status || 'draft'}</span>{selectedListener.active === false && <span className="inactive">Inactive</span>}</div></header>
        <div className="admin-listener-detail-grid"><section><span>About</span><p>{selectedListener.bio || 'This listener has not written a public biography yet.'}</p></section><dl><div><dt>Gender</dt><dd>{selectedListener.gender || 'Not added'}</dd></div><div><dt>Pronouns</dt><dd>{selectedListener.pronouns || 'Not added'}</dd></div><div className="admin-listener-languages"><dt>Languages</dt><dd>{selectedListener.languages?.join(', ') || 'Not added'}</dd></div><div><dt>Visibility</dt><dd>{isLive(selectedListener) ? 'Publicly visible' : 'Not currently public'}</dd></div></dl></div>
        <section className="admin-listener-topics"><span>Supported topics</span><div>{selectedListener.matches.map(topic => <small key={topic}>{topic}</small>)}</div></section>
        <div className="admin-listener-detail-actions"><button type="button" onClick={() => openEditor(selectedListener.id)}>Edit public profile</button>{selectedListener.profile_status === 'suspended' || selectedListener.active === false ? <button type="button" disabled={busy} onClick={() => onSetStatus(selectedListener, 'published')}>Reactivate</button> : <button type="button" disabled={busy} className="admin-secondary" onClick={() => onSetStatus(selectedListener, 'suspended')}>Suspend</button>}</div>
      </article> : <div className="admin-management-placeholder"><UserRound /><h3>Select a listener</h3><p>Choose a name from the directory to view their profile.</p></div>}</div>
    </div>
    {editingProfile && selectedListener && <div className="admin-profile-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) closeEditor() }}>
      <section className="admin-profile-modal" role="dialog" aria-modal="true" aria-labelledby="admin-profile-modal-title">
        <header><div><span>Public listener profile</span><h3 id="admin-profile-modal-title">Edit {selectedListener.name}</h3><p>Current profile values are shown below. Changes appear publicly only after you save.</p></div><button type="button" aria-label="Close profile editor" onClick={closeEditor}><X /></button></header>
        <form className="admin-form-card admin-profile-modal-form" onSubmit={async event => { setSaveAttempted(true); if (await onSaveProfile(event, selectedListener.id, photoFile)) closeEditor() }}>
          <label>Display name<input name="name" defaultValue={selectedListener.name} maxLength={100} required /></label>
          <label>Role or focus<input name="focus" defaultValue={selectedListener.focus} maxLength={200} required /></label>
          <label className="admin-profile-about">About<textarea name="bio" defaultValue={selectedListener.bio || ''} maxLength={2000} rows={5} required /></label>
          <label>Gender<select name="gender" defaultValue={selectedListener.gender || ''}><option value="">Prefer not to say</option><option>Woman</option><option>Man</option><option>Non-binary or another gender</option></select></label>
          <label>Pronouns<input name="pronouns" defaultValue={selectedListener.pronouns || ''} /></label>
          <label>Languages, separated by commas<input name="languages" defaultValue={selectedListener.languages?.join(', ') || ''} required /></label>
          <div className="admin-review-photo-field admin-profile-photo-field">
            <span>Profile photo <small>Optional</small></span>
            <div className={'admin-profile-photo-dropzone' + (photoDragActive ? ' dragging' : '')} onDragEnter={event => { event.preventDefault(); setPhotoDragActive(true) }} onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy' }} onDragLeave={event => { if (event.currentTarget === event.target) setPhotoDragActive(false) }} onDrop={dropPhoto}>
              <div className="admin-profile-photo-media">{visiblePhoto ? <img src={visiblePhoto} alt="Selected listener profile preview" /> : <ImagePlus />}</div>
              <div className="admin-profile-photo-copy"><strong>{visiblePhoto ? photoFile?.name || 'Current profile photo' : 'Drop a profile photo here'}</strong><span>{visiblePhoto ? 'Choose another image to replace it.' : 'Or choose an image from your computer.'}</span><small>JPG, PNG or WebP · Maximum 5 MB</small><div><button type="button" className="admin-review-photo-button" onClick={() => photoInputRef.current?.click()}><ImagePlus />{visiblePhoto ? 'Replace photo' : 'Choose photo'}</button>{visiblePhoto && <button type="button" className="admin-profile-photo-remove" onClick={removeSelectedPhoto}>Remove</button>}</div></div>
              <input ref={photoInputRef} name="image" type="file" accept="image/jpeg,image/png,image/webp" onChange={choosePhoto} />
            </div>
            {photoError && <small className="admin-profile-photo-error" role="alert">{photoError}</small>}
            <small>The preview is shown immediately. The new photo is uploaded when you save changes.</small>
          </div>
          <input name="current-image" type="hidden" value={selectedListener.profile_image_url || ''} />
          <input name="remove-image" type="hidden" value={removePhoto ? 'true' : 'false'} />
          {saveAttempted && message && <p className="admin-profile-save-message" role="alert">{message}</p>}
          <fieldset className="admin-topic-fieldset admin-profile-topics"><legend>Supported topics</legend><div>{supportTopics.filter(topic => topic !== 'I’m not sure yet').map(topic => <label key={topic}><input type="checkbox" name="matches" value={topic} defaultChecked={selectedListener.matches.includes(topic)} />{topic}</label>)}</div></fieldset>
          <footer className="admin-profile-modal-actions"><button type="button" className="admin-secondary" onClick={closeEditor}>Cancel</button><button disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button></footer>
        </form>
      </section>
    </div>}
  </section>
}

