import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

function GetStartedDropdown() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className={`nav-dropdown get-started-dropdown${isOpen ? ' open' : ''}`}>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="true"
        onClick={() => setIsOpen((current) => !current)}
      >
        Get Started
        <ChevronDown className={`chevron-icon${isOpen ? ' open' : ''}`} size={18} aria-hidden="true" />
      </button>
      <div className="dropdown-menu get-started-menu">
        <div className="started-links">
          <p>Get Started</p>
          <a href="/our-therapist">Our Listeners</a>
          <a href="/">Get Matched</a>
        </div>
        <div className="started-feature">
          <div className="started-preview" aria-hidden="true"></div>
          <a href="/">
            Check-in with yourself <span aria-hidden="true">&gt;</span>
          </a>
          <p>Get started with a Mental Health Assessment</p>
        </div>
      </div>
    </div>
  )
}

export default GetStartedDropdown
