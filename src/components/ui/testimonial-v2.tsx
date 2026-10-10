import { useEffect, useState } from 'react'
import { getSupabase, testimonialImageUrl, type Testimonial } from '../../lib/supabase'
import './testimonial-v2.css'

// Keep the current illustrative content available while the database migration
// is being deployed. A successful empty database response intentionally shows
// the empty state instead of restoring these examples.
const examples: Testimonial[] = [
  { id: 'example-1', quote: 'It helped to have a little space to talk through everything on my mind.', display_name: 'Example student story', context: 'Illustrative quote · not a real review', sort_order: 10 },
  { id: 'example-2', quote: 'I liked being able to start at my own pace, without needing all the right words.', display_name: 'Example student story', context: 'Illustrative quote · not a real review', sort_order: 20 },
  { id: 'example-3', quote: 'Having someone listen made a busy week feel a little less lonely.', display_name: 'Example student story', context: 'Illustrative quote · not a real review', sort_order: 30 },
  { id: 'example-4', quote: 'Talking things through helped me think about what I wanted to do next.', display_name: 'Example student story', context: 'Illustrative quote · not a real review', sort_order: 40 },
]

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'S'

export default function TestimonialsColumn() {
  const [reviews, setReviews] = useState<Testimonial[]>(examples)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const { data, error } = await getSupabase().rpc('public_testimonials')
        if (active && !error) setReviews((data || []) as Testimonial[])
      } catch { /* The illustrative fallback remains visible. */ }
    }
    void load()
    return () => { active = false }
  }, [])

  return (
    <aside className="hero-testimonials" aria-labelledby="testimonials-title" data-home-reveal="right">
      <h2 id="testimonials-title">Their words. Their experience.</h2>
      {!reviews.length ? <p className="testimonials-empty">Student stories will appear here soon.</p> : <div className="testimonials-scroll" tabIndex={0} role="region" aria-label="Student testimonials">
        <div className="testimonials-track">
        {[0, 1].map((copy) => (
        <div className="testimonials-group" key={copy} aria-hidden={copy === 1 ? true : undefined}>
        {reviews.map((review) => (
          <figure className="testimonial-card" key={`${copy}-${review.id}`}>
            <span className="testimonial-quote" aria-hidden="true">“</span>
            <blockquote>{review.quote}</blockquote>
            <figcaption>
              {review.image_path
                ? <img className="testimonial-avatar" src={testimonialImageUrl(review.image_path)} alt="" />
                : <span className="testimonial-avatar" aria-hidden="true">{initials(review.display_name)}</span>}
              <span><strong>{review.display_name}</strong><small>{review.context}</small></span>
            </figcaption>
          </figure>
        ))}
        </div>
        ))}
        </div>
      </div>}
    </aside>
  )
}
