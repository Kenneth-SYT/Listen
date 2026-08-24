import './PricingPage.css'

const pricingItems = ['$1 Introduction Session', 'Standard 1 Hour Session']

function PricingPage() {
  return (
    <section className="pricing-page" aria-labelledby="pricing-heading">
      <div className="pricing-container">
        <h1 id="pricing-heading">Supporting Mental Well-being</h1>

        <div className="pricing-list">
          {pricingItems.map((item) => (
            <article className="pricing-row" key={item}>
              <div>
                <h2>{item}</h2>
                <a href="/">Read More</a>
              </div>
              <a className="pricing-book-button" href="/">
                Book Now
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default PricingPage
