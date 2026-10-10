import { Eye, EyeOff, MessageSquareQuote, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { Testimonial } from '../../lib/supabase'

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
  const editorOpen = creating || Boolean(editing)

  const closeEditor = () => { setCreating(false); setEditing(null) }

  return <section className="admin-section admin-reviews-section">
    <div className="admin-section-heading"><div><h2>Reviews</h2><p>Manage the student testimonials shown beside the homepage hero.</p></div><button type="button" className="admin-heading-action" onClick={() => { setEditing(null); setCreating(true) }}><Plus /> Add review</button></div>
    {loadError && <p className="admin-reviews-error">{loadError}</p>}
    <div className={'admin-reviews-layout' + (editorOpen ? ' editor-open' : '')}>
      <div className="admin-review-list">
        {reviews.map(review => <article key={review.id} className={editing?.id === review.id ? 'selected' : ''}>
          <MessageSquareQuote aria-hidden="true" />
          <blockquote>{review.quote}</blockquote>
          <div><span><strong>{review.display_name}</strong><small>{review.context}</small></span><i className={review.published ? 'published' : ''}>{review.published ? <Eye /> : <EyeOff />}{review.published ? 'Published' : 'Hidden'}</i></div>
          <footer><button type="button" onClick={() => { setCreating(false); setEditing(review) }}><Pencil /> Edit</button><button type="button" className="delete" disabled={busy} onClick={() => onDelete(review)}><Trash2 /> Remove</button></footer>
        </article>)}
        {!reviews.length && !loadError && <div className="admin-review-empty"><MessageSquareQuote /><h3>No reviews yet</h3><p>Add an approved testimonial to show it on the homepage.</p></div>}
      </div>
      {editorOpen && <aside className="admin-review-editor">
        <form key={editing?.id || 'new'} className="admin-form-card" onSubmit={async event => { if (await onSave(event, editing?.id)) closeEditor() }}>
          <div><span>{editing ? 'Edit review' : 'New review'}</span><h3>{editing ? 'Update testimonial' : 'Add a testimonial'}</h3></div>
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
