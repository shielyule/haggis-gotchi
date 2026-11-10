import { useId, useState, type FormEvent } from 'react'
import {
  TEMPERAMENTS,
  temperamentForChaos,
} from './data/temperaments'
import { defaultAnswers, type SignupAnswers } from './lib/storage'
import { claimEggSynced } from './lib/syncActions'

type Props = {
  demoCompress: boolean
  onCancel: () => void
  onClaimed: (eggId: string) => void
}

const TEEN_INFO =
  'Around the teen stage (about three months in the full product), your gotchi may show signs of gender identity and morph. This opt-in only stores your preference for later — nothing happens during Baby. If you leave it on, the path is not guaranteed to match what you hoped; that is intentional. You can change your mind later in settings when that screen exists.'

const CHAOS_INFO =
  'This slider sets the starting Scots temperament for your egg. It colours the birth story and how wild Baby feels out of the shell. You can still calm or wind them up with care — but Douce and Fair Wud are very different mornings.'

export function SignupForm({ demoCompress, onCancel, onClaimed }: Props) {
  const [answers, setAnswers] = useState<SignupAnswers>(defaultAnswers)
  const [error, setError] = useState('')
  const [teenInfoOpen, setTeenInfoOpen] = useState(false)
  const [chaosInfoOpen, setChaosInfoOpen] = useState(false)
  const teenInfoTitleId = useId()
  const chaosInfoTitleId = useId()
  const temperament = temperamentForChaos(answers.chaos)

  function set<K extends keyof SignupAnswers>(key: K, value: SignupAnswers[K]) {
    setAnswers((prev) => ({ ...prev, [key]: value }))
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!answers.displayName.trim()) {
      setError('Give the mother a name to call you by.')
      return
    }
    if (!answers.email.trim() || !answers.email.includes('@')) {
      setError('Add your email — we use it when the egg is ready and to retrieve your Haggling.')
      return
    }
    if (!answers.place || !answers.weatherDay) {
      setError('Pick where you feel at home and a perfect day — they colour the birth story.')
      return
    }
    if (answers.teenIdentityOptIn && !answers.teenDisclaimerAck) {
      setError('Tick the disclaimer if you want the teen identity path later.')
      return
    }
    const waitMs = demoCompress ? 90 * 1000 : 30 * 60 * 1000
    void claimEggSynced(answers, waitMs).then((egg) => onClaimed(egg.id))
  }

  return (
    <form className="signup" onSubmit={submit} noValidate>
      <header className="signup-head">
        <p className="signup-kicker">Claim an egg</p>
        <h2>Tell the mother a little about you</h2>
        <p>
          Answers seed the birth story. Your email is how we tell you the egg is
          ready and how you get your Haggling back later — no password.
        </p>
      </header>

      <label className="field">
        <span>What should we call you?</span>
        <input
          value={answers.displayName}
          onChange={(e) => set('displayName', e.target.value)}
          placeholder="e.g. Ewan"
          autoComplete="nickname"
          required
        />
      </label>

      <label className="field">
        <span>Your email</span>
        <input
          type="email"
          value={answers.email}
          onChange={(e) => set('email', e.target.value)}
          placeholder="you@email.com"
          autoComplete="email"
          required
        />
      </label>

      <label className="field">
        <span>Pet you have now — or wish you had?</span>
        <input
          value={answers.pet}
          onChange={(e) => set('pet', e.target.value)}
          placeholder="Collie, goldfish, none yet…"
        />
      </label>

      <fieldset className="field-set">
        <legend>Where do you feel most at home?</legend>
        <div className="chip-row">
          {(
            [
              ['city', 'City'],
              ['town', 'Town'],
              ['countryside', 'Countryside'],
              ['seaside', 'Seaside'],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className={`chip ${answers.place === value ? 'on' : ''}`}>
              <input
                type="radio"
                name="place"
                value={value}
                checked={answers.place === value}
                onChange={() => set('place', value)}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="field">
        <span>What games do you play?</span>
        <input
          value={answers.games}
          onChange={(e) => set('games', e.target.value)}
          placeholder="Board, console, none…"
        />
      </label>

      <label className="field">
        <span>Favourite comfort food?</span>
        <input
          value={answers.comfortFood}
          onChange={(e) => set('comfortFood', e.target.value)}
          placeholder="Irn-Bru and crisps counts"
        />
      </label>

      <fieldset className="field-set">
        <legend>Perfect day?</legend>
        <div className="chip-row">
          {(
            [
              ['rainy', 'Rainy day'],
              ['beach', 'Beach day'],
              ['forest', 'Forest walk'],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className={`chip ${answers.weatherDay === value ? 'on' : ''}`}>
              <input
                type="radio"
                name="weatherDay"
                value={value}
                checked={answers.weatherDay === value}
                onChange={() => set('weatherDay', value)}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="field">
        <span>One family quirk or saying you inherited</span>
        <input
          value={answers.familyQuirk}
          onChange={(e) => set('familyQuirk', e.target.value)}
          placeholder="It'll be dreich, but we're going anyway"
        />
      </label>

      <div className="field chaos-field">
        <div className="teen-title-row">
          <span>Chaos in the pet — calm to feral ({answers.chaos})</span>
          <button
            type="button"
            className="info-dot"
            aria-label="About Scots temperaments"
            aria-expanded={chaosInfoOpen}
            aria-controls="chaos-temperament-info"
            onClick={() => setChaosInfoOpen(true)}
          >
            i
          </button>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={answers.chaos}
          aria-valuetext={`${temperament.label}: ${temperament.short}`}
          onChange={(e) => set('chaos', Number(e.target.value))}
        />
        <p className="temperament-live" aria-live="polite">
          <strong>{temperament.label}</strong>
          {temperament.pronounce ? (
            <span className="temperament-say">
              {' '}
              (pronounced &lsquo;{temperament.pronounce}&rsquo;)
            </span>
          ) : null}
          <span className="temperament-short"> — {temperament.short}</span>
        </p>
        <p className="temperament-blurb">{temperament.blurb}</p>
      </div>

      <div className="teen-block">
        <div className="teen-title-row">
          <p className="teen-title">Later — teen identity (optional)</p>
          <button
            type="button"
            className="info-dot"
            aria-label="About teen identity"
            aria-expanded={teenInfoOpen}
            aria-controls="teen-identity-info"
            onClick={() => setTeenInfoOpen(true)}
          >
            i
          </button>
        </div>
        <label className="check">
          <input
            type="checkbox"
            checked={answers.teenIdentityOptIn}
            onChange={(e) => {
              const on = e.target.checked
              set('teenIdentityOptIn', on)
              if (!on) set('teenDisclaimerAck', false)
            }}
          />
          <span>When they reach teen age, allow identity morphing</span>
        </label>
        {answers.teenIdentityOptIn ? (
          <label className="check">
            <input
              type="checkbox"
              checked={answers.teenDisclaimerAck}
              onChange={(e) => set('teenDisclaimerAck', e.target.checked)}
            />
            <span>I understand it may not go the direction I want</span>
          </label>
        ) : null}
      </div>

      {teenInfoOpen ? (
        <div
          className="info-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby={teenInfoTitleId}
          id="teen-identity-info"
          onClick={() => setTeenInfoOpen(false)}
        >
          <div className="info-panel" onClick={(e) => e.stopPropagation()}>
            <h3 id={teenInfoTitleId}>Teen identity</h3>
            <p>{TEEN_INFO}</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setTeenInfoOpen(false)}
            >
              Got it
            </button>
          </div>
        </div>
      ) : null}

      {chaosInfoOpen ? (
        <div
          className="info-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby={chaosInfoTitleId}
          id="chaos-temperament-info"
          onClick={() => setChaosInfoOpen(false)}
        >
          <div
            className="info-panel info-panel-wide"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id={chaosInfoTitleId}>Scots temperaments</h3>
            <p>{CHAOS_INFO}</p>
            <ul className="temperament-glossary">
              {TEMPERAMENTS.map((t) => (
                <li key={t.id}>
                  <strong>
                    {t.label}
                    {t.pronounce ? ` (‘${t.pronounce}’)` : ''}
                  </strong>
                  <span> — {t.short}</span>
                  <p>{t.blurb}</p>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setChaosInfoOpen(false)}
            >
              Got it
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p className="form-error" role="alert">{error}</p> : null}

      <div className="signup-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          {demoCompress ? 'Start demo birth (~90s)' : 'Begin ~30 min birth'}
        </button>
      </div>
    </form>
  )
}
