import { Eye, EyeOff, ImagePlus, MessageSquareQuote, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { testimonialImageUrl, type Testimonial } from '../../lib/supabase'

type Props = {
  reviews: Testimonial[]
  busy: boolean
  loadError: string
  onSave: (event: FormEvent<HTMLFormElement>, reviewId?: string) => Promise<boolean>
  onDelete: (review: Testimonial) => void
}

export default function AdminReviewsSection({ reviews, busy, loadError, onSave, onDelete }: Props) {
  const [editing, setEditing] = useState<Testimonial | null>(null)
  const [creating, setCreating] = useState(false)
  const [preview, setPreview] = useState('')
  const [removePhoto, setRemovePhoto] = useState(false)
  const editorOpen = creating || Boolean(editing)

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const resetPhoto = () => { setPreview(''); setRemovePhoto(false) }
  const closeEditor = () => { setCreating(false); setEditing(null); resetPhoto() }
  const openCreate = () => { setEditing(null); setCreating(true); resetPhoto() }
  const openEdit = (review: Testimonial) => { setCreating(false); setEditing(review); resetPhoto() }
  const choosePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setPreview(URL.createObjectURL(file))
    setRemovePhoto(false)
  }
  const visiblePhoto = preview || (!removePhoto && editing?.image_path ? testimonialImageUrl(editing.image_path) : '')

  return <section className="admin-section admin-reviews-section">
    <div className="admin-section-heading"><div><h2>Reviews</h2><p>Manage the student testimonials shown beside the homepage hero.</p></div><button type="button" className="admin-heading-action" onClick={openCreate}><Plus /> Add review</button></div>
    {loadError && <p className="admin-reviews-error">{loadError}</p>}
    <div className={'admin-reviews-layout' + (editorOpen ? ' editor-open' : '')}>
      <div className="admin-review-list">
        {reviews.map(review => <article key={review.id} className={editing?.id === review.id ? 'selected' : ''}>
          <span className="admin-review-card-media">{review.image_path ? <img src={testimonialImageUrl(review.image_path)} alt="" /> : <MessageSquareQuote aria-hidden="true" />}</span>
          <blockquote>{review.quote}</blockquote>
          <div><span><strong>{review.display_name}</strong><small>{review.context}</small></span><i className={review.published ? 'published' : ''}>{review.published ? <Eye /> : <EyeOff />}{review.published ? 'Published' : 'Hidden'}</i></div>
          <footer><button type="button" onClick={() => openEdit(review)}><Pencil /> Edit</button><button type="button" className="delete" disabled={busy} onClick={() => onDelete(review)}><Trash2 /> Remove</button></footer>
        </article>)}
        {!reviews.length && !loadError && <div className="admin-review-empty"><MessageSquareQuote /><h3>No reviews yet</h3><p>Add an approved testimonial to show it on the homepage.</p></div>}
      </div>
      {editorOpen && <aside className="admin-review-editor">
        <form key={editing?.id || 'new'} className="admin-form-card" onSubmit={async event => { if (await onSave(event, editing?.id)) closeEditor() }}>
          <div><span>{editing ? 'Edit review' : 'New review'}</span><h3>{editing ? 'Update testimonial' : 'Add a testimonial'}</h3></div>
          <div className="admin-review-photo-field">
            <span>Photo <small>Optional</small></span>
            {visiblePhoto ? <div className="admin-review-photo-preview"><img src={visiblePhoto} alt="Selected testimonial preview" /><button type="button" aria-label="Remove selected photo" onClick={() => { setPreview(''); setRemovePhoto(true) }}><X /></button></div> : <div className="admin-review-photo-placeholder"><ImagePlus /><span>No photo selected</span></div>}
            <label className="admin-review-photo-button"><ImagePlus />{visiblePhoto ? 'Choose another photo' : 'Choose photo'}<input name="image" type="file" accept="image/jpeg,image/png,image/webp" onChange={choosePhoto} /></label>
            <small>The image is uploaded only after you save. JPG, PNG or WebP, up to 5 MB.</small>
          </div>
          <input name="current-image" type="hidden" value={editing?.image_path || ''} />
          <input name="remove-image" type="hidden" value={removePhoto ? 'true' : 'false'} />
          <label>Display name<input name="display-name" defaultValue={editing?.display_name || ''} maxLength={100} placeholder="For example, Alex T." required /></label>
          <label>Context<input name="context" defaultValue={editing?.context || 'University student'} maxLength={160} placeholder="For example, University student" required /></label>
          <label>Review<textarea name="quote" defaultValue={editing?.quote || ''} minLength={10} maxLength={600} rows={7} placeholder="Enter an approved testimonial" required /></label>
          <label className="admin-review-published"><input name="published" type="checkbox" defaultChecked={editing?.published ?? true} /><span><strong>Show on homepage</strong><small>Hidden reviews remain saved in the Admin dashboard.</small></span></label>
          <div className="admin-review-form-actions"><button type="button" className="admin-secondary" onClick={closeEditor}>Cancel</button><button disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Add review'}</button></div>
        </form>
      </aside>}
    </div>
  </section>
}
