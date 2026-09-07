import About from '../About/About'
import BenefitsSection from '../BenefitsSection/BenefitsSection'
import './InfoPages.css'

export function AboutPage() { return <div className="info-page"><header><span>About us</span><h1>Peer support built around listening.</h1><p>Learn who we are and why we’re creating a more approachable way for university students to talk.</p></header><About /></div> }
export function ServicesPage() { return <div className="info-page"><header><span>Our services</span><h1>Support for the moments that feel heavy.</h1><p>Explore how Listen Mental Health can help you check in, connect and keep moving forward.</p></header><BenefitsSection /></div> }
export function StrategyPage() { return <section className="info-page strategy-page"><header><span>Our strategy</span><h1>Make asking for support feel easier.</h1><p>We’re building around three simple priorities.</p></header><div className="strategy-grid"><article><b>01</b><h2>Accessible</h2><p>Make it simple for students to understand their options and take a first step.</p></article><article><b>02</b><h2>Human</h2><p>Create supportive conversations that feel personal, respectful and unhurried.</p></article><article><b>03</b><h2>Practical</h2><p>Help students notice progress and decide what support makes sense next.</p></article></div></section> }
