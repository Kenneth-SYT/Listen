import './ArchivedSupportSections.css'

function PicturePlaceholder() {
  return (
    <div className="picture-placeholder" aria-label="Picture placeholder">
      Picture placeholder
    </div>
  )
}

function ArchivedSupportSections() {
  return (
    <section className="support-sections" aria-label="Therapy support information">
      <div className="support-wave">
        <article className="support-row">
          <PicturePlaceholder />
          <div className="support-copy">
            <h2>Take a quick questionnaire</h2>
            <p>
              Answer a few simple questions to help us understand what kind of support may be useful
              for you right now.
            </p>
            <button type="button">Start questionnaire</button>
          </div>
        </article>

        <article className="support-row reverse">
          <div className="support-copy">
            <h2>Understanding mental health</h2>
            <p>
              Mental health can affect how we think, feel, connect, and cope day to day. This space
              is here to offer calm, practical information while you find the next step that feels
              right for you.
            </p>
          </div>
          <PicturePlaceholder />
        </article>

        <article className="support-row">
          <PicturePlaceholder />
          <div className="support-copy">
            <h2>Find a listener in the area</h2>
            <p>
              Look for nearby listeners and support options so you can connect with someone who can
              hear what is going on and help you feel less alone.
            </p>
          </div>
        </article>
      </div>
    </section>
  )
}

export default ArchivedSupportSections
