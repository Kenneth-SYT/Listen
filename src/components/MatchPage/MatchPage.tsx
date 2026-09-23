import { useEffect, useState } from 'react'
import { ClipboardCheck, ListChecks } from 'lucide-react'
import BookingPage from '../BookingPage/BookingPage'
import DetailsPage, { type CustomerDetails } from '../DetailsPage/DetailsPage'
import {
  emptyIntake, emptyLongAnswers, k6Options, k6Questions, k6Score, k10Options, k10Questions, k10Score,
  longSupportTopics, sharedExperiences, supportStyles, supportTopics, type IntakeAnswers,
  type LongAnswers, type QuestionnaireType,
} from '../../lib/intake'
import { createCheckout, errorMessage, getSupabase, type BookingSelection } from '../../lib/supabase'
import './MatchPage.css'

const emptyDetails: CustomerDetails = { firstName: '', lastName: '', preferredName: '', dateOfBirth: '', mobile: '', email: '', gender: '' }
const draftKey = 'listen-booking-draft'
type Draft = { savedAt: number; stage: 'questions' | 'booking' | 'account'; step: number; answers: IntakeAnswers; selection: BookingSelection | null; customerDetails: CustomerDetails }
type SavedIntake = {
  listener_gender_preference: string; topics: string[]; k6_answers: number[] | null
  k10_answers: number[] | null; listener_note: string; questionnaire_type: QuestionnaireType
  impact_score: number | null; long_answers: Partial<LongAnswers> | null
}

function readDraft(): Draft | null {
  try {
    const raw = sessionStorage.getItem(draftKey)
    if (!raw) return null
    const draft = JSON.parse(raw) as Draft
    if (Date.now() - draft.savedAt > 2 * 60 * 60 * 1000 || !Array.isArray(draft.answers?.k6)) {
      sessionStorage.removeItem(draftKey); return null
    }
    draft.answers = {
      ...emptyIntake, ...draft.answers,
      k10: Array.isArray(draft.answers.k10) ? draft.answers.k10 : emptyIntake.k10,
      long: { ...emptyIntake.long, ...draft.answers.long },
    }
    if (draft.stage === 'account' && (!draft.selection?.holdToken || !draft.selection?.holdExpiresAt)) draft.stage = 'booking'
    return draft
  } catch { return null }
}

function MatchPage() {
  const entryParams = new URLSearchParams(window.location.search)
  const repeatRequested = entryParams.has('repeat')
  const restorePrevious = repeatRequested || (!entryParams.has('resume') && !entryParams.has('code') && !entryParams.has('token_hash'))
  const [draft] = useState(readDraft)
  const [stage, setStage] = useState<'intro' | 'questions' | 'booking' | 'account'>(draft?.stage ?? 'intro')
  const [step, setStep] = useState(draft?.step ?? 0)
  const [answers, setAnswers] = useState<IntakeAnswers>(draft?.answers ?? emptyIntake)
  const [selection, setSelection] = useState<BookingSelection | null>(draft?.selection ?? null)
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails>(draft?.customerDetails ?? emptyDetails)
  const [restoringPrevious, setRestoringPrevious] = useState(restorePrevious)
  const [restoreMessage, setRestoreMessage] = useState('')

  useEffect(() => {
    if (!restorePrevious) return
    let active = true
    void (async () => {
      const client = getSupabase()
      const { data: auth, error: authError } = await client.auth.getUser()
      if (authError || !auth.user) return
      const { data, error } = await client.from('intake_responses')
        .select('listener_gender_preference,topics,k6_answers,k10_answers,listener_note,questionnaire_type,impact_score,long_answers')
        .eq('user_id', auth.user.id).order('updated_at', { ascending: false }).limit(1).maybeSingle()
      if (error) throw error
      if (!data) {
        if (repeatRequested) throw new Error('Complete a questionnaire before booking from previous answers.')
        return
      }
      const saved = data as SavedIntake
      if (!active) return
      setAnswers({
        questionnaire: saved.questionnaire_type,
        adult: true,
        listenerGender: saved.listener_gender_preference,
        topics: saved.topics,
        k6: saved.k6_answers?.length === 6 ? saved.k6_answers : Array(6).fill(null),
        k10: saved.k10_answers?.length === 10 ? saved.k10_answers : Array(10).fill(null),
        note: saved.listener_note,
        long: { ...emptyLongAnswers, ...(saved.long_answers || {}), impact: saved.impact_score },
      })
      setSelection(null)
      setStage('booking')
    })().catch(error => { if (active) setRestoreMessage(errorMessage(error)) })
      .finally(() => { if (active) setRestoringPrevious(false) })
    return () => { active = false }
  }, [repeatRequested, restorePrevious])

  useEffect(() => {
    if (stage === 'intro') return
    sessionStorage.setItem(draftKey, JSON.stringify({ savedAt: Date.now(), stage, step, answers, selection, customerDetails }))
  }, [stage, step, answers, selection, customerDetails])

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
  }, [stage, step])

  const update = (patch: Partial<IntakeAnswers>) => setAnswers(current => ({ ...current, ...patch }))
  const updateLong = (patch: Partial<LongAnswers>) => setAnswers(current => ({ ...current, long: { ...current.long, ...patch } }))
  const toggle = (values: string[], value: string, exclusive?: string) => values.includes(value)
    ? values.filter(item => item !== value)
    : exclusive && value === exclusive ? [value] : [...values.filter(item => item !== exclusive), value]
  const chooseQuestionnaire = (questionnaire: QuestionnaireType) => {
    setAnswers(current => ({ ...current, questionnaire })); setStep(0); setStage('questions')
  }
  const isLong = answers.questionnaire === 'long'
  const totalSteps = isLong ? 7 : 5
  const canContinue = isLong
    ? step === 0 ? answers.adult === true
      : step === 1 ? true
        : step === 2 ? !!answers.listenerGender && !!answers.long.preferenceImportance && answers.long.sharedExperiences.length > 0 && !!answers.long.matchingPriority
          : step === 3 ? answers.topics.length > 0
            : step === 4 ? true
              : step === 5 ? k10Score(answers) !== null && answers.long.impact !== null
                : true
    : step === 0 ? answers.adult === true
      : step === 1 ? !!answers.listenerGender
        : step === 2 ? answers.topics.length > 0
          : step === 3 ? k6Score(answers) !== null
            : true
  const next = () => step === totalSteps - 1 ? setStage('booking') : setStep(value => value + 1)
  const continueFromBooking = async (value: BookingSelection) => {
    const client = getSupabase()
    const { data: auth, error: authError } = await client.auth.getUser()
    if (authError || !auth.user) {
      setSelection(value)
      setStage('account')
      return
    }
    const { data: profile, error: profileError } = await client.from('profiles').select('id').eq('id', auth.user.id).maybeSingle()
    if (profileError) throw profileError
    if (!profile) {
      setSelection(value)
      setStage('account')
      return
    }
    const { error: intakeError } = await client.rpc('save_intake', {
      p_slot: value.slot.id, p_listener_gender: answers.listenerGender,
      p_topics: answers.topics, p_k6: answers.k6, p_note: answers.note.trim(),
      p_questionnaire_type: answers.questionnaire, p_k10: answers.k10,
      p_impact_score: answers.long.impact,
      p_long_answers: answers.questionnaire === 'long' ? answers.long : {},
    })
    if (intakeError) throw intakeError
    const returningDraft: Draft = { savedAt: Date.now(), stage: 'booking', step, answers, selection: value, customerDetails }
    sessionStorage.setItem(draftKey, JSON.stringify(returningDraft))
    const checkoutUrl = await createCheckout(value.slot.id, value.holdToken)
    sessionStorage.setItem('listen-checkout-return', '1')
    window.location.assign(checkoutUrl)
  }

  const choices = (name: string, values: readonly string[], selected: string, onChange: (value: string) => void) => <fieldset>
    <legend className="sr-only">{name}</legend>{values.map(value => <label key={value} className={selected === value ? 'selected' : ''}>
      <input type="radio" name={name} checked={selected === value} onChange={() => onChange(value)} />{value}
    </label>)}
  </fieldset>
  const checks = (name: string, values: readonly string[], selected: string[], onChange: (values: string[]) => void, exclusive?: string) => <fieldset>
    <legend className="sr-only">{name}</legend>{values.map(value => <label key={value} className={selected.includes(value) ? 'selected' : ''}>
      <input type="checkbox" checked={selected.includes(value)} onChange={() => onChange(toggle(selected, value, exclusive))} />{value}
    </label>)}
  </fieldset>
  const field = (label: string, key: keyof LongAnswers, options?: readonly string[], required = false) => <label className="match-field">
    <span>{label}{!required && <small>Optional</small>}</span>{options
      ? <select value={String(answers.long[key] ?? '')} onChange={event => updateLong({ [key]: event.target.value })} required={required}><option value="">Choose one</option>{options.map(value => <option key={value}>{value}</option>)}</select>
      : <input value={String(answers.long[key] ?? '')} onChange={event => updateLong({ [key]: event.target.value })} maxLength={200} required={required} />}
  </label>

  if (restoringPrevious) return <section className="match-page match-restoring" aria-busy="true"><span className="sr-only" role="status">Loading</span></section>

  return <section className="match-page" aria-labelledby="match-heading">
    {restoreMessage && <p className="match-restore-message" role="alert">{restoreMessage} You can start a new questionnaire below.</p>}
    {stage === 'intro' ? <div className="match-intro match-choice-intro">
      <span className="match-eyebrow">Find your listener</span>
      <h1 id="match-heading">Choose the check-in that suits you.</h1>
      <p>Both options help us match you with a listener. You can choose a time before creating an account.</p>
      <div className="questionnaire-cards">
        <button className="questionnaire-card" type="button" onClick={() => chooseQuestionnaire('short')}>
          <span className="questionnaire-visual questionnaire-visual-short" aria-hidden="true"><ListChecks color="#001c55" /></span>
          <span className="questionnaire-time">About 3 minutes</span><strong>Short check-in</strong>
          <span>Five simple steps covering your preferences, topics and a brief wellbeing check.</span><b>Choose short</b>
        </button>
        <button className="questionnaire-card recommended" type="button" onClick={() => chooseQuestionnaire('long')}>
          <span className="questionnaire-badge">More detailed</span>
          <span className="questionnaire-visual questionnaire-visual-long" aria-hidden="true"><ClipboardCheck color="#ffffff" /></span>
          <span className="questionnaire-time">About 8–10 minutes</span>
          <strong>Long questionnaire</strong><span>Share more context for a more accurate listener match and a better prepared first conversation.</span>
          <em>A little time for a clearer picture of your wellbeing.</em><b>Choose long</b>
        </button>
      </div>
      <a href="/our-therapist">Or browse our listeners</a>
    </div> : stage === 'questions' ? <form className={`match-question ${isLong ? 'match-question-long' : ''}`} onSubmit={event => { event.preventDefault(); if (canContinue) next() }}>
      <span className="match-eyebrow">{isLong ? 'Long questionnaire' : 'Short check-in'} · Step {step + 1} of {totalSteps}</span>

      {step === 0 && <><h1 id="match-heading">Are you 18 or older?</h1><p>Listen currently supports adults aged 18 and over.</p>
        {choices('Age eligibility', ['Yes, I’m 18 or older', 'No, I’m under 18'], answers.adult === null ? '' : answers.adult ? 'Yes, I’m 18 or older' : 'No, I’m under 18', value => update({ adult: value.startsWith('Yes') }))}
        {answers.adult === false && <p role="status">Listen cannot book sessions for people under 18. Please seek support from a service for young people, such as <a href="https://kidshelpline.com.au/">Kids Helpline</a>.</p>}
      </>}

      {!isLong && step === 1 && <><h1 id="match-heading">Do you have a listener gender preference?</h1>{choices('Listener gender preference', ['No preference', 'Woman', 'Man', 'Non-binary or another gender'], answers.listenerGender, value => update({ listenerGender: value }))}</>}
      {!isLong && step === 2 && <><h1 id="match-heading">What would you like to talk about?</h1><p>Choose any that feel relevant.</p>{checks('Support topics', supportTopics, answers.topics, values => update({ topics: values }), 'I’m not sure yet')}</>}
      {!isLong && step === 3 && <><h1 id="match-heading">How have you been feeling?</h1><p>Thinking about the past four weeks, choose one answer for each item. This K6 score helps your listener prepare; it is not a diagnosis or crisis assessment.</p>
        <div className="match-k6" role="group" aria-label="Wellbeing check-in">{k6Questions.map((question, index) => <fieldset key={question}><legend>{index + 1}. {question}</legend><div className="match-k6-options">{k6Options.map((label, value) => <label key={label} className={answers.k6[index] === value ? 'selected' : ''}><input type="radio" name={`k6-${index}`} checked={answers.k6[index] === value} onChange={() => update({ k6: answers.k6.map((current, position) => position === index ? value : current) })} /><span>{label}</span></label>)}</div></fieldset>)}</div>
      </>}
      {!isLong && step === 4 && <><h1 id="match-heading">Anything you’d like your listener to know?</h1><p>You can share a little context or leave this blank and talk when you meet.</p><label className="match-note-label" htmlFor="match-note">Your note (optional)</label><textarea id="match-note" maxLength={1000} value={answers.note} onChange={event => update({ note: event.target.value })} placeholder="Share only what you feel comfortable sharing" /></>}

      {isLong && step === 1 && <><h1 id="match-heading">A little about you</h1><p>These details are optional. They can help your listener understand your study and cultural context.</p><div className="match-fields">
        {field('What are you studying?', 'course')}{field('What year of your course are you in?', 'courseYear', ['1st year', '2nd year', '3rd year', '4th year or later', 'Postgraduate', 'Other'])}
        {field('Are you a domestic or international student?', 'studentType', ['Domestic student', 'International student', 'Prefer not to say'])}
        {answers.long.studentType === 'International student' && field('How long have you been living or studying in Australia?', 'timeInAustralia')}
        {field('What languages do you speak?', 'languages')}{field('Which language would you prefer during sessions?', 'preferredLanguage')}
        <label className="match-field match-field-wide"><span>Is there cultural background or experience you would like your listener to understand?<small>Optional</small></span><textarea value={answers.long.culturalContext} onChange={event => updateLong({ culturalContext: event.target.value })} maxLength={1000} /></label>
      </div></>}
      {isLong && step === 2 && <><h1 id="match-heading">Finding the right listener</h1><p>Your answers guide the recommendation. You can still choose any available listener.</p>
        <h2>Do you have a listener gender preference?</h2>{choices('Listener gender preference', ['No preference', 'Woman', 'Man', 'Non-binary or another gender'], answers.listenerGender, value => update({ listenerGender: value }))}
        <h2>How important is this preference?</h2>{choices('Preference importance', ['Essential', 'Strong preference', 'Slight preference', 'No preference'], answers.long.preferenceImportance, value => updateLong({ preferenceImportance: value }))}
        <h2>Would shared experience help?</h2>{checks('Shared experiences', sharedExperiences, answers.long.sharedExperiences, values => updateLong({ sharedExperiences: values }), 'None in particular')}
        <h2>What matters most in the match?</h2>{choices('Matching priority', ['Similar life experiences', 'Similar cultural background', 'Speaking my preferred language', 'My gender preference', 'Similar age', 'Similar university or student experience', 'Just match me with someone suitable'], answers.long.matchingPriority, value => updateLong({ matchingPriority: value }))}
      </>}
      {isLong && step === 3 && <><h1 id="match-heading">What has been going on?</h1><p>Share only what feels useful. The topic selection is required for matching; the written context is optional.</p>
        <label className="match-note-label" htmlFor="whats-going-on">What’s been going on lately? <small>Optional</small></label><textarea id="whats-going-on" maxLength={2000} value={answers.long.whatsGoingOn} onChange={event => updateLong({ whatsGoingOn: event.target.value })} />
        <h2>What would you most like to talk about?</h2>{checks('Support topics', longSupportTopics, answers.topics, values => update({ topics: values }), 'I’m not sure — I just want someone to talk to')}
      </>}
      {isLong && step === 4 && <><h1 id="match-heading">What would help you?</h1><p>All questions on this page are optional.</p><div className="match-fields">
        {field('When something is difficult, what usually helps most?', 'supportStyle', supportStyles)}
        {field('What would you like to get out of your sessions?', 'sessionGoal')}
        {field('Is there anything you would prefer your listener not to do?', 'listenerAvoid')}
      </div></>}
      {isLong && step === 5 && <><h1 id="match-heading">Wellbeing check-in</h1><p>Thinking about the past two weeks, choose one answer for each item. The K10 total gives your listener a clearer picture; it is a screening score, not a diagnosis or crisis assessment.</p>
        <div className="match-k6" role="group" aria-label="K10 wellbeing check-in">{k10Questions.map((question, index) => <fieldset key={question}><legend>{index + 1}. {question}</legend><div className="match-k6-options">{k10Options.map((label, offset) => { const value = offset + 1; return <label key={label} className={answers.k10[index] === value ? 'selected' : ''}><input type="radio" name={`k10-${index}`} checked={answers.k10[index] === value} onChange={() => update({ k10: answers.k10.map((current, position) => position === index ? value : current) })} /><span>{label}</span></label> })}</div></fieldset>)}</div>
        <h2>How much are these feelings affecting everyday life?</h2>{choices('Everyday impact', ['Not at all', 'A little', 'A fair bit', 'A lot', 'A huge amount'], answers.long.impact === null ? '' : ['Not at all', 'A little', 'A fair bit', 'A lot', 'A huge amount'][answers.long.impact], value => updateLong({ impact: ['Not at all', 'A little', 'A fair bit', 'A lot', 'A huge amount'].indexOf(value) }))}
      </>}
      {isLong && step === 6 && <><h1 id="match-heading">Before you meet your listener</h1><p>These final prompts are optional and can help your first conversation begin more naturally.</p><div className="match-fields">
        {field('What is the one thing you would like your listener to know?', 'oneThing')}
        {field('Where would you like the first conversation to start?', 'conversationStart')}
        {field('Is there anything else you would like your listener to know?', 'anythingElse')}
      </div></>}

      <div className="match-actions"><button type="button" className="match-back" onClick={() => step === 0 ? setStage('intro') : setStep(value => value - 1)}>Back</button><button type="submit" disabled={!canContinue}>{step === totalSteps - 1 ? 'Choose a listener' : 'Continue'}</button></div>
    </form> : stage === 'booking' ? <BookingPage answers={answers} onBack={() => { setStep(totalSteps - 1); setStage('questions') }} onContinue={continueFromBooking} />
      : selection && <DetailsPage initialDetails={customerDetails} selection={selection} answers={answers} onBack={() => setStage('booking')} onDetailsChange={setCustomerDetails} />}
  </section>
}
export default MatchPage
