import './Footer.css'

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div className="footer-brand">
          <a href="/">Listen Mental Health</a>
          <p>A space to talk.<br />Someone to listen.</p>
          <span>Peer support for university students.</span>
        </div>
        <nav className="footer-links" aria-label="Footer navigation">
          <h2>Find your next step</h2>
          <a href="/how-it-works">How it works</a>
          <a href="/our-therapist">Meet our listeners</a>
          <a href="/pricing">Sessions & pricing</a>
        </nav>
        <nav className="footer-links" aria-label="About navigation">
          <h2>About us</h2>
          <a href="/about">Who we are</a>
          <a href="/strategy">Our strategy</a>
          <a href="/services">Our services</a>
        </nav>
        <div className="footer-contact">
          <h2>Questions are welcome.</h2>
          <p>Ask about getting started, or share your thoughts with us.</p>
          <a href="/contact">Get in touch <span aria-hidden="true">↗</span></a>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Listen Mental Health</span>
        <span>A little support. At your pace.</span>
      </div>
    </footer>
  )
}

export default Footer
