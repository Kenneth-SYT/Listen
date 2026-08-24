import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

const aboutItems = ['Who we are', 'Our strategy', 'Our services']

function AboutDropdown() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className={`nav-dropdown${isOpen ? ' open' : ''}`}>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="true"
        onClick={() => setIsOpen((current) => !current)}
      >
        About us
        <ChevronDown className={`chevron-icon${isOpen ? ' open' : ''}`} size={18} aria-hidden="true" />
      </button>
      <div className="dropdown-menu">
        {aboutItems.map((item) => (
          <a href="/" key={item}>
            {item}
          </a>
        ))}
      </div>
    </div>
  )
}

export default AboutDropdown
