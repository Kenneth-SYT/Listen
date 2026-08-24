import './ContactPage.css'

const topics = ['General', 'Partner', 'Other']

function ContactPage() {
  return (
    <section className="contact-page" id="contact" aria-labelledby="contact-heading">
      <form className="contact-form">
        <h2 id="contact-heading">Contact us</h2>

        <div className="contact-grid">
          <label>
            First name
            <input name="firstName" placeholder="First name" type="text" />
          </label>

          <label>
            Last name
            <input name="lastName" placeholder="Last name" type="text" />
          </label>

          <label>
            Email *
            <input name="email" placeholder="Email" required type="email" />
          </label>

          <label>
            Phone
            <input name="phone" placeholder="Phone" type="tel" />
          </label>

          <label>
            Topic
            <select defaultValue="General" name="topic">
              {topics.map((topic) => (
                <option key={topic} value={topic}>
                  {topic}
                </option>
              ))}
            </select>
          </label>

          <label className="message-field">
            Message *
            <textarea name="message" placeholder="Message" required rows={4}></textarea>
          </label>
        </div>

        <button type="submit">Submit</button>
      </form>
    </section>
  )
}

export default ContactPage
