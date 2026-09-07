import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

const aboutItems = ['Who we are', 'Our strategy', 'Our services']

type AboutDropdownProps = {
  isActive?: boolean
}

function AboutDropdown({ isActive = false }: AboutDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className={`nav-dropdown${isOpen ? ' open' : ''}${isActive ? ' active' : ''}`}>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-current={isActive ? 'true' : undefined}
        onClick={() => setIsOpen((current) => !current)}
      >
        About us
        <ChevronDown className={`chevron-icon${isOpen ? ' open' : ''}`} size={18} aria-hidden="true" />
      </button>
      <div className="dropdown-menu">
        {aboutItems.map((item) => (
          <a href="/#about" key={item}>
            {item}
          </a>
        ))}
      </div>
    </div>
  )
}

export default AboutDropdown
