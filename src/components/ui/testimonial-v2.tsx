import './testimonial-v2.css'

// Replace these design placeholders with approved, genuine testimonials.
const examples = [
  'It helped to have a little space to talk through everything on my mind.',
  'I liked being able to start at my own pace, without needing all the right words.',
  'Having someone listen made a busy week feel a little less lonely.',
  'Talking things through helped me think about what I wanted to do next.',
]

export default function TestimonialsColumn() {
  return (
    <aside className="hero-testimonials" aria-labelledby="testimonials-title">
      <h2 id="testimonials-title">Their words. Their experience.</h2>
      <div className="testimonials-scroll" tabIndex={0} role="region" aria-label="Sample testimonials">
        <div className="testimonials-track">
        {[0, 1].map((copy) => (
        <div className="testimonials-group" key={copy} aria-hidden={copy === 1 ? true : undefined}>
        {examples.map((quote, index) => (
          <figure className="testimonial-card" key={quote}>
            <span className="testimonial-quote" aria-hidden="true">“</span>
            <blockquote>{quote}</blockquote>
            <figcaption>
              <span className="testimonial-avatar" aria-hidden="true">{index + 1}</span>
              <span><strong>Example student story</strong><small>Illustrative quote · not a real review</small></span>
            </figcaption>
          </figure>
        ))}
        </div>
        ))}
        </div>
      </div>
    </aside>
  )
}
