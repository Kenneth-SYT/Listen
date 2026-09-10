import { useState } from 'react'
import BookingPage from '../BookingPage/BookingPage'
import './MatchPage.css'

const questions = [
  { title: 'What would you like support with?', options: ['Study pressure', 'Feeling overwhelmed', 'Relationships', 'Something else'] },
  { title: 'How would you prefer to connect?', options: ['Text chat', 'Video chat', 'I’m flexible'] },
  { title: 'When would you like to talk?', options: ['As soon as possible', 'This week', 'I’m just exploring'] },
]

function MatchPage() {
  const [started, setStarted] = useState(false)
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<string[]>([])
  const [complete, setComplete] = useState(false)

  const answer = answers[step] ?? ''
  const chooseAnswer = (value: string) => setAnswers((current) => {
    const updated = [...current]
    updated[step] = value
    return updated
  })
  const next = () => step === questions.length - 1 ? setComplete(true) : setStep((current) => current + 1)

  return (
    <section className="match-page" aria-labelledby="match-heading">
      <div className="match-progress" aria-label={`${complete ? questions.length : step} of ${questions.length} steps completed`}>
        <span style={{ width: `${complete ? 100 : (step / questions.length) * 100}%` }}></span>
      </div>
      <p className="match-progress-label">{complete ? questions.length : step}/{questions.length} steps completed</p>

      {!started ? (
        <div className="match-intro">
          <span className="match-eyebrow">Find your listener</span>
          <h1 id="match-heading">Let’s find support that feels right for you.</h1>
          <p>We’ll ask a few simple questions to understand what you need and help you find a suitable listener. Your answers stay on this page for now.</p>
          <button type="button" onClick={() => setStarted(true)}>Let’s start</button>
          <a href="/our-therapist">Or browse our listeners</a>
        </div>
      ) : complete ? (
        <BookingPage answers={answers} />
      ) : (
        <form className="match-question" onSubmit={(event) => { event.preventDefault(); next() }}>
          <span className="match-eyebrow">Question {step + 1}</span>
          <h1 id="match-heading">{questions[step].title}</h1>
          <fieldset>
            <legend className="sr-only">Choose one answer</legend>
            {questions[step].options.map((option) => (
              <label className={answer === option ? 'selected' : ''} key={option}>
                <input type="radio" name={`question-${step}`} value={option} checked={answer === option} onChange={() => chooseAnswer(option)} />
                <span>{option}</span>
              </label>
            ))}
          </fieldset>
          <div className="match-actions">
            <button type="button" className="match-back" onClick={() => step === 0 ? setStarted(false) : setStep((current) => current - 1)}>Back</button>
            <button type="submit" disabled={!answer}>{step === questions.length - 1 ? 'Finish' : 'Continue'}</button>
          </div>
        </form>
      )}
    </section>
  )
}

export default MatchPage
