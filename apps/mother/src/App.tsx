import { useState } from 'react'
import './App.css'

type View = 'home' | 'claim'

export default function App() {
  const [view, setView] = useState<View>('home')

  return (
    <div className="mother">
      <section className="hero" aria-label="Haggis-gotchi mother">
        <img
          className="hero-art"
          src="/art/haggis-hero.jpg"
          alt="Fluffy Scottish haggis wearing a tartan tam, with heather in its fur"
        />
        <div className="hero-veil" aria-hidden="true" />
        <div className="hero-copy">
          <p className="brand">Haggis-gotchi</p>
          <h1 className="headline">The cloud mother keeps the brood.</h1>
          <p className="lede">
            Claim an egg. In about thirty minutes a Scottish baby hatches onto
            your phone. Care shapes the scrapbook. The Pi is optional — same
            child, desk hearth, bonus drip.
          </p>
          <div className="cta-row">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setView('claim')}
            >
              Claim an egg
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() =>
                document.getElementById('brood')?.scrollIntoView({ behavior: 'smooth' })
              }
            >
              See the brood
            </button>
          </div>
        </div>
      </section>

      <section className="brood" id="brood">
        <h2>Brood</h2>
        <p className="brood-lede">
          Empty for now. After hatch, check-ins land here — not a second pet.
        </p>

        {view === 'claim' ? (
          <div className="brood-empty" role="status">
            <strong>Birthing ritual — stub</strong>
            Signup + thirty-minute story comes next (see{' '}
            <code>.kiro/specs/birthing-ritual</code>). Demo mode will compress
            the wait for the video. No crypto. No quest map.
          </div>
        ) : (
          <div className="brood-empty">
            <strong>No eggs yet</strong>
            When you claim one, the mother holds the wait, the birth story, and
            later the scrapbook.
          </div>
        )}

        <div className="yard">
          <div className="yard-block">
            <h3>Scrapbook</h3>
            <p>Care and neglect write the pages. Fixed span — no early death.</p>
          </div>
          <div className="yard-block">
            <h3>Graveyard</h3>
            <p>
              When the span ends, memory lives here. Ghosts are optional and
              read-only for the MVP.
            </p>
          </div>
        </div>
      </section>

      <footer className="foot">
        Kiroween 2026 · Frankenstein · care + brood + sync · MIT
      </footer>
    </div>
  )
}
