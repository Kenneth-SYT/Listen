import './OurTherapistPage.css'

const listeners = [
  {
    name: 'Aiden',
    role: 'General peer support',
    details: 'Available to listen and offer peer support around study pressure, feeling overwhelmed, loneliness and relationships.',
  },
]

function OurTherapistPage() {
  return (
    <section className="therapist-page" aria-labelledby="therapist-heading">
      <div className="therapist-container">
        <div className="therapist-heading">
          <h1 id="therapist-heading">Our listeners</h1>
          <p>Meet the people available to listen, learn what they support and find someone who feels right for you.</p>
        </div>

        <div className="therapist-grid">
          {listeners.map((listener) => (
            <article className="therapist-card" key={listener.name}>
              <div className="therapist-photo" aria-hidden="true">
                {listener.name
                  .split(' ')
                  .map((part) => part[0])
                  .join('')}
              </div>
              <div>
                <h2>{listener.name}</h2>
                <p className="therapist-role">{listener.role}</p>
                <p>{listener.details}</p>
              </div>
              <a href="/get-matched">Find a time with {listener.name}</a>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default OurTherapistPage
