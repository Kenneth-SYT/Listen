import { useEffect } from 'react'

const SITE_URL = 'https://listenmentalhealth.com'

type PageSeo = {
  title: string
  description: string
  canonical?: string
  noIndex?: boolean
}

const publicPages: Record<string, PageSeo> = {
  '/': {
    title: 'Listen Mental Health | Peer Support for University Students',
    description: 'Talk with a supportive peer listener about university stress, study pressure, relationships and everyday challenges, at your own pace.',
  },
  '/about': {
    title: 'About Listen Mental Health | Student Peer Support',
    description: 'Learn how Listen Mental Health is creating an approachable, respectful peer-support service for university students who want someone to talk to.',
  },
  '/how-it-works': {
    title: 'How It Works | Listen Mental Health',
    description: 'See how to check in, find a suitable peer listener and arrange a supportive conversation with Listen Mental Health.',
  },
  '/our-listeners': {
    title: 'Meet Our Peer Listeners | Listen Mental Health',
    description: 'Meet Listen Mental Health peer listeners and find someone who can support conversations about study, stress, relationships and student life.',
  },
  '/our-therapist': {
    title: 'Meet Our Peer Listeners | Listen Mental Health',
    description: 'Meet Listen Mental Health peer listeners and find someone who can support conversations about study, stress, relationships and student life.',
    canonical: '/our-listeners',
  },
  '/pricing': {
    title: 'Peer Support Session Pricing | Listen Mental Health',
    description: 'View session lengths and pricing for supportive peer-listener conversations with Listen Mental Health.',
  },
  '/contact': {
    title: 'Contact Listen Mental Health',
    description: 'Contact Listen Mental Health with questions about peer listeners, matching, sessions, bookings or the support we provide.',
  },
  '/services': {
    title: 'Student Peer Support Services | Listen Mental Health',
    description: 'Explore approachable peer support for university stress, study pressure, relationships, confidence and everyday student life.',
  },
  '/strategy': {
    title: 'Our Approach | Listen Mental Health',
    description: 'Read about Listen Mental Health’s accessible, human and practical approach to peer support for university students.',
  },
}

const privateRoutes = ['/account', '/admin', '/listener', '/login', '/get-matched', '/booking-confirmation']

function setMeta(selector: string, attributes: Record<string, string>) {
  let element = document.head.querySelector<HTMLMetaElement>(selector)
  if (!element) {
    element = document.createElement('meta')
    document.head.appendChild(element)
  }
  Object.entries(attributes).forEach(([name, value]) => element!.setAttribute(name, value))
}

function setLink(rel: string, href: string) {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!element) {
    element = document.createElement('link')
    element.rel = rel
    document.head.appendChild(element)
  }
  element.href = href
}

export default function Seo() {
  useEffect(() => {
    const path = window.location.pathname.replace(/\/$/, '') || '/'
    const page = publicPages[path] || {
      title: 'Listen Mental Health',
      description: 'Approachable peer support for university students who want someone to talk to.',
      noIndex: true,
    }
    const noIndex = page.noIndex || privateRoutes.some(route => path === route || path.startsWith(`${route}/`))
    const canonicalPath = page.canonical || path
    const canonical = `${SITE_URL}${canonicalPath === '/' ? '' : canonicalPath}`

    document.title = page.title
    setMeta('meta[name="description"]', { name: 'description', content: page.description })
    setMeta('meta[name="robots"]', { name: 'robots', content: noIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large' })
    setMeta('meta[property="og:title"]', { property: 'og:title', content: page.title })
    setMeta('meta[property="og:description"]', { property: 'og:description', content: page.description })
    setMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' })
    setMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: 'Listen Mental Health' })
    setMeta('meta[property="og:url"]', { property: 'og:url', content: canonical })
    setMeta('meta[property="og:image"]', { property: 'og:image', content: `${SITE_URL}/LMH_sideways.png` })
    setMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' })
    setMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: page.title })
    setMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: page.description })
    setLink('canonical', canonical)
  }, [])

  return null
}
