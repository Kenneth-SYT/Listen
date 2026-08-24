import './OurTherapistPage.css'

const therapists = [
  {
    name: 'Alex Morgan',
    role: 'Anxiety and stress support',
    details: 'Offers calm, practical sessions for everyday pressure, burnout, and life transitions.',
  },
  {
    name: 'Jamie Lee',
    role: 'Relationship counselling',
    details: 'Supports clients with communication, boundaries, family stress, and connection.',
  },
  {
    name: 'Sam Taylor',
    role: 'Youth mental health',
    details: 'Works with young people and families to build confidence, routines, and coping tools.',
  },
  {
    name: 'Casey Nguyen',
    role: 'Trauma-informed care',
    details: 'Provides gentle, paced support focused on safety, trust, and emotional regulation.',
  },
  {
    name: 'Riley Patel',
    role: 'Depression support',
    details: 'Helps clients explore mood, motivation, self-care, and small steps toward change.',
  },
  {
    name: 'Jordan Smith',
    role: 'Workplace wellbeing',
    details: 'Supports professionals navigating workload, conflict, confidence, and career stress.',
  },
]

function OurTherapistPage() {
  return (
    <section className="therapist-page" aria-labelledby="therapist-heading">
      <div className="therapist-container">
        <div className="therapist-heading">
          <h1 id="therapist-heading">Our therapists</h1>
          <p>Meet our listeners and therapists, then choose the kind of support that feels right.</p>
        </div>

        <div className="therapist-grid">
          {therapists.map((therapist) => (
            <article className="therapist-card" key={therapist.name}>
              <div className="therapist-photo" aria-hidden="true">
                {therapist.name
                  .split(' ')
                  .map((part) => part[0])
                  .join('')}
              </div>
              <div>
                <h2>{therapist.name}</h2>
                <p className="therapist-role">{therapist.role}</p>
                <p>{therapist.details}</p>
              </div>
              <a href="/">View profile</a>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default OurTherapistPage
