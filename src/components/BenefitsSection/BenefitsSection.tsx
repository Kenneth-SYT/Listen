import './BenefitsSection.css'

const benefits = [
  {
    icon: 'smile',
    title: 'Easy access',
    copy: 'You can connect with us 7 days a week, including after hours.',
  },
  {
    icon: 'affordable',
    title: 'Affordable',
    copy: 'No matter what your situation, there is an option that can suit your budget.',
  },
  {
    icon: 'secure',
    title: 'Secure',
    copy: 'Our platform ensures your data is protected at all times.',
  },
  {
    icon: 'confidential',
    title: 'Confidential',
    copy: 'We value and respect your privacy at all times.',
  },
]

function BenefitsSection() {
  return (
    <section className="benefits-section" aria-labelledby="benefits-heading">
      <div className="benefits-intro">
        <h2 id="benefits-heading">We make it easier to take care of your mental health</h2>
        <p>
          Everyone needs to talk to someone from time to time. At Listen Mental Health, we can be
          that someone.
        </p>
        <p>
          <strong>Our online platform makes it easier and faster</strong> for you to access support
          when you need it.
        </p>
        <a className="book-button" href="/">
          Book now
        </a>
      </div>

      <div className="benefits-grid">
        {benefits.map((benefit) => (
          <article className="benefit-item" key={benefit.title}>
            <span className={`benefit-icon ${benefit.icon}`} aria-hidden="true"></span>
            <h3>{benefit.title}</h3>
            <p>{benefit.copy}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

export default BenefitsSection
