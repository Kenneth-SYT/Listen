import { BadgeDollarSign, ChevronRight, House, Mail, UsersRound } from 'lucide-react'
import './Navigation.css'

const getRouteActiveSection = () => {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'

  if (path === '/') {
    return 'home'
  }

  if (path === '/our-listeners' || path === '/our-therapist') {
    return 'our-listeners'
  }

  if (path === '/pricing') {
    return 'pricing'
  }

  if (path === '/contact') {
    return 'contact'
  }

  return ''
}

function Navigation() {
  const activeSection = getRouteActiveSection()
  const items = [
    { href: '/', key: 'home', label: 'Home', icon: House },
    { href: '/our-listeners', key: 'our-listeners', label: 'Our listeners', icon: UsersRound },
    { href: '/pricing', key: 'pricing', label: 'Pricing', icon: BadgeDollarSign },
    { href: '/contact', key: 'contact', label: 'Contact us', icon: Mail },
  ]

  return (
    <nav id="primary-navigation" className="primary-nav" aria-label="Primary navigation">
      {items.map(item => {
        const Icon = item.icon
        return <a href={item.href} aria-current={activeSection === item.key ? 'page' : undefined} key={item.key}><Icon className="nav-item-icon" size={18} aria-hidden="true" /><span>{item.label}</span><ChevronRight className="nav-item-chevron" size={17} aria-hidden="true" /></a>
      })}
    </nav>
  )
}

export default Navigation
