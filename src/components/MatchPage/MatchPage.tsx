import { useEffect, useState } from 'react'
import BookingPage from '../BookingPage/BookingPage'
import DetailsPage, { type CustomerDetails } from '../DetailsPage/DetailsPage'
import { emptyIntake, k6Options, k6Questions, k6Score, supportTopics, type IntakeAnswers } from '../../lib/intake'
import type { BookingSelection } from '../../lib/supabase'
import './MatchPage.css'

const emptyDetails: CustomerDetails = {
  firstName: '', lastName: '', preferredName: '', dateOfBirth: '', mobile: '', email: '', gender: '',
}

const draftKey = 'listen-booking-draft'
type Draft = { savedAt: number; stage: 'questions' | 'booking' | 'account'; step: number; answers: IntakeAnswers; selection: BookingSelection | null; customerDetails: CustomerDetails }
function readDraft(): Draft | null {
  try {
    const raw = sessionStorage.getItem(draftKey)
    if (!raw) return null
    const draft = JSON.parse(raw) as Draft
    if (Date.now() - draft.savedAt > 2 * 60 * 60 * 1000 || !Array.isArray(draft.answers?.k6)) {
      sessionStorage.removeItem(draftKey); return null
    }
    if (draft.stage === 'account' && (!draft.selection?.holdToken || !draft.selection?.holdExpiresAt)) draft.stage = 'booking'
    return draft
  } catch { return null }
}

function MatchPage() {
  const [draft] = useState(readDraft)
  const [stage, setStage] = useState<'intro' | 'questions' | 'booking' | 'account'>(draft?.stage ?? 'intro')
  const [step, setStep] = useState(draft?.step ?? 0)
  const [answers, setAnswers] = useState<IntakeAnswers>(draft?.answers ?? emptyIntake)
  const [selection, setSelection] = useState<BookingSelection | null>(draft?.selection ?? null)
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails>(draft?.customerDetails ?? emptyDetails)

  useEffect(() => {
    if (stage === 'intro') return
    sessionStorage.setItem(draftKey, JSON.stringify({ savedAt: Date.now(), stage, step, answers, selection, customerDetails }))
  }, [stage, step, answers, selection, customerDetails])

  const update = (patch: Partial<IntakeAnswers>) => setAnswers(current => ({ ...current, ...patch }))
  const toggleTopic = (topic: string) => setAnswers(current => ({
    ...current, topics: current.topics.includes(topic)
      ? current.topics.filter(value => value !== topic)
      : [...current.topics.filter(value => value !== 'I’m not sure yet'), topic],
  }))
  const canContinue = step === 0 ? answers.adult === true
    : step === 1 ? !!answers.listenerGender
    : step === 2 ? answers.topics.length > 0
    : step === 3 ? k6Score(answers) !== null
    : true
  const next = () => step === 4 ? setStage('booking') : setStep(value => value + 1)
  const progress = stage === 'intro' ? 0 : stage === 'questions' ? (step + 1) / 7 : stage === 'booking' ? 6 / 7 : 1

  return <section className="match-page" aria-labelledby="match-heading">
    <div className="match-progress" aria-label={`${Math.round(progress * 100)}% complete`}><span style={{ width: `${progress * 100}%` }} /></div>
    {stage === 'intro' ? <div className="match-intro">
      <span className="match-eyebrow">Find your listener</span>
      <h1 id="match-heading">Let’s find support that feels right for you.</h1>
      <p>Five short questions help us find a listener and give them some context before you meet. You can choose a time before creating an account.</p>
      <button type="button" onClick={() => setStage('questions')}>Let’s start</button>
      <a href="/our-therapist">Or browse our listeners</a>
    </div> : stage === 'questions' ? <form className="match-question" onSubmit={event => { event.preventDefault(); if (canContinue) next() }}>
      <span className="match-eyebrow">Question {step + 1} of 5</span>
      {step === 0 && <><h1 id="match-heading">Are you 18 or older?</h1><p>Listen currently supports adults aged 18 and over.</p>
        <fieldset><legend className="sr-only">Age eligibility</legend>{[[true, 'Yes, I’m 18 or older'], [false, 'No, I’m under 18']].map(([value, label]) => <label key={String(value)} className={answers.adult === value ? 'selected' : ''}><input type="radio" name="adult" checked={answers.adult === value} onChange={() => update({ adult: value as boolean })} />{label}</label>)}</fieldset>
        {answers.adult === false && <p role="status">Listen cannot book sessions for people under 18. Please seek support from a service for young people, such as <a href="https://kidshelpline.com.au/">Kids Helpline</a>.</p>}
      </>}
      {step === 1 && <><h1 id="match-heading">Do you have a listener gender preference?</h1><fieldset><legend className="sr-only">Listener gender preference</legend>{['No preference', 'Woman', 'Man', 'Non-binary or another gender'].map(value => <label key={value} className={answers.listenerGender === value ? 'selected' : ''}><input type="radio" name="listener-gender" checked={answers.listenerGender === value} onChange={() => update({ listenerGender: value })} />{value}</label>)}</fieldset></>}
      {step === 2 && <><h1 id="match-heading">What would you like to talk about?</h1><p>Choose any that feel relevant.</p><fieldset><legend className="sr-only">Support topics</legend>{supportTopics.map(topic => <label key={topic} className={answers.topics.includes(topic) ? 'selected' : ''}><input type="checkbox" checked={answers.topics.includes(topic)} onChange={() => topic === 'I’m not sure yet' ? update({ topics: answers.topics.includes(topic) ? [] : [topic] }) : toggleTopic(topic)} />{topic}</label>)}</fieldset></>}
      {step === 3 && <><h1 id="match-heading">How have you been feeling?</h1><p>Thinking about the past four weeks, how often have you felt each of the following? There are no right or wrong answers. These six responses form a K6 distress score for our team to review; the score does not diagnose a condition or provide a crisis assessment.</p>
        <div className="match-k6" role="group" aria-label="Wellbeing check-in">{k6Questions.map((question, index) => <fieldset key={question}><legend>{index + 1}. {question}</legend><div className="match-k6-options">{k6Options.map((label, value) => <label key={label} className={answers.k6[index] === value ? 'selected' : ''}><input type="radio" name={`k6-${index}`} checked={answers.k6[index] === value} onChange={() => update({ k6: answers.k6.map((current, position) => position === index ? value : current) })} /><span>{label}</span></label>)}</div></fieldset>)}</div>
      </>}
      {step === 4 && <><h1 id="match-heading">Anything you’d like your listener to know?</h1><p>You can share a little context or leave this blank and talk when you meet.</p><label className="match-note-label" htmlFor="match-note">Your note (optional)</label><textarea id="match-note" maxLength={1000} value={answers.note} onChange={event => update({ note: event.target.value })} placeholder="Share only what you feel comfortable sharing" /></>}
      <div className="match-actions"><button type="button" className="match-back" onClick={() => step === 0 ? setStage('intro') : setStep(value => value - 1)}>Back</button><button type="submit" disabled={!canContinue}>{step === 4 ? 'Choose a listener' : 'Continue'}</button></div>
    </form> : stage === 'booking' ? <BookingPage answers={answers} onBack={() => { setStep(4); setStage('questions') }} onContinue={value => { setSelection(value); setStage('account') }} />
      : selection && <DetailsPage initialDetails={customerDetails} selection={selection} answers={answers} onBack={() => setStage('booking')} onDetailsChange={setCustomerDetails} />}
  </section>
}
export default MatchPage
