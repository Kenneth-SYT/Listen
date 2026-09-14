import { ArrowLeft, ArrowRight, LockKeyhole } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import './DetailsPage.css'

export type CustomerDetails = {
  firstName: string
  lastName: string
  preferredName: string
  dateOfBirth: string
  email: string
  mobile: string
}

type DetailsPageProps = {
  initialDetails: CustomerDetails
  onBack: () => void
  onContinue: (details: CustomerDetails) => void
}

function DetailsPage({ initialDetails, onBack, onContinue }: DetailsPageProps) {
  const [details, setDetails] = useState(initialDetails)
  const update = (field: keyof CustomerDetails, value: string) => {
    setDetails((current) => ({ ...current, [field]: value }))
  }
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onContinue(details)
  }

  return (
    <form className="details-form" onSubmit={submit}>
      <header className="details-heading">
        <span className="match-eyebrow">A little about you</span>
        <h1 id="match-heading">Let’s get to know you.</h1>
        <p>We’ll use these details to prepare your booking and contact you about your appointment.</p>
      </header>

      <div className="details-grid">
        <label>
          <span>First name</span>
          <input autoComplete="given-name" value={details.firstName} onChange={(event) => update('firstName', event.target.value)} required />
        </label>
        <label>
          <span>Last name</span>
          <input autoComplete="family-name" value={details.lastName} onChange={(event) => update('lastName', event.target.value)} required />
        </label>
        <label className="details-wide">
          <span>Preferred name <small>Optional</small></span>
          <input autoComplete="nickname" value={details.preferredName} onChange={(event) => update('preferredName', event.target.value)} />
        </label>
        <label>
          <span>Date of birth</span>
          <input type="date" autoComplete="bday" max={new Date().toISOString().split('T')[0]} value={details.dateOfBirth} onChange={(event) => update('dateOfBirth', event.target.value)} required />
        </label>
        <label>
          <span>Mobile</span>
          <input type="tel" autoComplete="tel" placeholder="04xx xxx xxx" value={details.mobile} onChange={(event) => update('mobile', event.target.value)} required />
        </label>
        <label className="details-wide">
          <span>Email</span>
          <input type="email" autoComplete="email" placeholder="you@example.com" value={details.email} onChange={(event) => update('email', event.target.value)} required />
        </label>
      </div>

      <div className="details-privacy"><LockKeyhole size={17} aria-hidden="true" /><span>Your information stays in this browser during this prototype booking flow.</span></div>
      <div className="details-actions">
        <button type="button" className="details-back" onClick={onBack}><ArrowLeft size={18} /> Back</button>
        <button type="submit">Continue to booking <ArrowRight size={18} /></button>
      </div>
    </form>
  )
}

export default DetailsPage
