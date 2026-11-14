import { useState, type FormEvent } from 'react'
import { HeartHandshake, HelpCircle, ShieldCheck } from 'lucide-react'
import { errorMessage, getSupabase } from '../../lib/supabase'
import './ContactPage.css'

const topics = ['General question', 'Choosing a session', 'Partnership', 'Feedback', 'Other']

function ContactPage() {
  const [submitState, setSubmitState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [submitError, setSubmitError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const values = Object.fromEntries(new FormData(form).entries())

    setSubmitState('sending')
    setSubmitError('')

    try {
      const { error } = await getSupabase().functions.invoke('contact-message', { body: values })
      if (error) {
        let message = error.message
        if ('context' in error && error.context instanceof Response) {
          const body = await error.context.json().catch(() => null)
          message = body?.error || message
        }
        throw new Error(message)
      }
      form.reset()
      setSubmitState('sent')
    } catch (error) {
      setSubmitError(errorMessage(error))
      setSubmitState('error')
    }
  }

  return (
    <section className="contact-page" id="contact" aria-labelledby="contact-heading">
      <div className="contact-layout">
        <div className="contact-intro">
          <span className="contact-eyebrow">Questions are welcome</span>
          <h1 id="contact-heading">Let’s talk about what you need.</h1>
          <p>Whether you’re thinking about your first chat, looking for the right kind of support, or simply want to learn more, send us a message.</p>
          <div className="contact-points">
            <div><HelpCircle aria-hidden="true" /><span><strong>Not sure where to start?</strong><small>We can help you understand your options.</small></span></div>
            <div><HeartHandshake aria-hidden="true" /><span><strong>Have feedback?</strong><small>Your ideas help us create better support.</small></span></div>
            <div><ShieldCheck aria-hidden="true" /><span><strong>Your privacy matters.</strong><small>Your responses are handled confidentially.</small></span></div>
          </div>
          <div className="contact-shape" aria-hidden="true"></div>
        </div>

      <form className="contact-form" onSubmit={handleSubmit}>
        <div className="contact-form-heading">
          <span>Send us a message</span>
          <h2>How can we help?</h2>
          <p>Fields marked with * are required.</p>
        </div>

        <div className="contact-grid">
          <label>
            First name
            <input name="firstName" placeholder="Your first name" type="text" autoComplete="given-name" />
          </label>

          <label>
            Last name
            <input name="lastName" placeholder="Your last name" type="text" autoComplete="family-name" />
          </label>

          <label>
            Email *
            <input name="email" placeholder="you@example.com" required type="email" autoComplete="email" />
          </label>

          <label>
            Phone
            <input name="phone" placeholder="Optional" type="tel" autoComplete="tel" />
          </label>

          <label>
            Topic
            <select defaultValue="General question" name="topic">
              {topics.map((topic) => (
                <option key={topic} value={topic}>
                  {topic}
                </option>
              ))}
            </select>
          </label>

          <label className="message-field">
            Message *
            <textarea name="message" placeholder="Tell us what’s on your mind…" required rows={5}></textarea>
          </label>
        </div>

        <div className="contact-submit-row">
          <button type="submit" disabled={submitState === 'sending'}>
            {submitState === 'sending' ? 'Sending…' : 'Send message'}
            {submitState !== 'sending' && <span aria-hidden="true">→</span>}
          </button>
          <p className={`contact-submit-status contact-submit-status-${submitState}`} role="status" aria-live="polite">
            {submitState === 'sent' && 'Message sent'}
            {submitState === 'error' && submitError}
          </p>
        </div>
      </form>
      </div>
    </section>
  )
}

export default ContactPage
