const tabs = ['Check your symptoms', 'Find a Listener', 'Learn more about mental health']

function SymptomChecker() {
  return (
    <section className="symptom-section" aria-labelledby="symptom-heading">
      <div className="feature-tabs" aria-label="Health tools">
        {tabs.map((tab, index) => (
          <button className={index === 0 ? 'active' : ''} type="button" key={tab}>
            {tab}
          </button>
        ))}
      </div>

      <div className="symptom-content">
        <div className="symptom-info">
          <h2 id="symptom-heading">Symptom Checker</h2>
          <ul>
            <li>The Symptom Checker advises if you should see a doctor or care for yourself at home.</li>
            <li>It will ask questions about your symptoms. This takes an average of 6 minutes.</li>
            <li>
              <strong>It cannot give you a diagnosis and is not a substitute for professional healthcare.</strong>
            </li>
          </ul>
        </div>

        <form className="start-card">
          <h2>Get started</h2>
          <fieldset>
            <legend>Who is this symptom check for?</legend>
            <label>
              <input defaultChecked name="symptomFor" type="radio" />
              Me
            </label>
            <label>
              <input name="symptomFor" type="radio" />
              Someone else
            </label>
          </fieldset>
          <p>
            By using this tool you agree to our <a href="/">Terms of Use</a> and{' '}
            <a href="/">Privacy Policy</a>.
          </p>
          <button type="button">Start symptom checker</button>
        </form>
      </div>
    </section>
  )
}

export default SymptomChecker
