import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

const aboutItems = [
  { label: 'Who we are', href: '/about' },
  { label: 'Our strategy', href: '/strategy' },
  { label: 'Our services', href: '/services' },
]

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
          <a href={item.href} key={item.href}>
            {item.label}
          </a>
        ))}
      </div>
    </div>
  )
}

export default AboutDropdown
