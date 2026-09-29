import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const siteUrl = 'https://listenmentalhealth.com'
const pages = {
  '/': ['Listen Mental Health | Peer Support for University Students', 'Talk with a supportive peer listener about university stress, study pressure, relationships and everyday challenges, at your own pace.'],
  '/about': ['About Listen Mental Health | Student Peer Support', 'Learn how Listen Mental Health is creating an approachable, respectful peer-support service for university students who want someone to talk to.'],
  '/how-it-works': ['How It Works | Listen Mental Health', 'See how to check in, find a suitable peer listener and arrange a supportive conversation with Listen Mental Health.'],
  '/our-listeners': ['Meet Our Peer Listeners | Listen Mental Health', 'Meet Listen Mental Health peer listeners and find someone who can support conversations about study, stress, relationships and student life.'],
  '/pricing': ['Peer Support Session Pricing | Listen Mental Health', 'View session lengths and pricing for supportive peer-listener conversations with Listen Mental Health.'],
  '/contact': ['Contact Listen Mental Health', 'Contact Listen Mental Health with questions about peer listeners, matching, sessions, bookings or the support we provide.'],
  '/services': ['Student Peer Support Services | Listen Mental Health', 'Explore approachable peer support for university stress, study pressure, relationships, confidence and everyday student life.'],
  '/strategy': ['Our Approach | Listen Mental Health', 'Read about Listen Mental Health’s accessible, human and practical approach to peer support for university students.'],
}

const template = await readFile('dist/index.html', 'utf8')

for (const [route, [title, description]] of Object.entries(pages)) {
  const canonical = `${siteUrl}${route === '/' ? '/' : route}`
  const html = template
    .replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
    .replace(/<meta name="description" content=".*?"\s*\/>/, `<meta name="description" content="${description}" />`)
    .replace(/<link rel="canonical" href=".*?"\s*\/>/, `<link rel="canonical" href="${canonical}" />`)
  const destination = route === '/' ? 'dist/index.html' : join('dist', route.slice(1), 'index.html')
  await mkdir(dirname(destination), { recursive: true })
  await writeFile(destination, html)
}
