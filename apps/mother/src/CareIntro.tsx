/** First-visit walkthrough: what each button does to the bars (owner, 19 Nov). Numbers from the care engine. */
const KEY = 'haggis-gotchi:intro-seen'

export function introSeen(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return true
  }
}

const ROWS: [string, string][] = [
  ['Feed', 'Hunger +28, Mood up (more at breakfast or dinner time), Mess +8.'],
  ['Cuddle', 'Mood +12, Energy +4. At bedtime it settles them for the night.'],
  ['Walk', 'Mood +10 but Energy -10 and Hunger -6. Brings back a bit of mud.'],
  ['Treat', 'Mood +16, Hunger +8. A wee bit messy.'],
  ['Clean up', 'Mess -35. Leave mess high for 12 hours and Health XP drops.'],
  ['Photo Treat', 'Snap Irn-Bru, bagpipes, a kilt or tartan, heather, shortbread or tablet: every bar full, Mess cleared, big XP boost. Once a day.'],
  ['Put to bed', 'Sleeps (10 hours as a baby or teen, down to 6 in old age): Energy comes back, Hunger slows down, then a wake-up alert. Feed, walk or treat them while asleep and they wake crabbit.'],
  ['Haggis Run', 'A wee game: guess which way they run round the hill, five times. Mood +4 for every right guess, Energy -8.'],
  ['Tell off', 'When they are up to mischief (you will see a warning), a telling-off stops it: Mood -5. Tell them off for nothing and it hurts: Mood -15 and Health XP -3.'],
]

export function CareIntro({ name, onClose }: { name: string; onClose: () => void }) {
  function done() {
    try {
      localStorage.setItem(KEY, '1')
    } catch {
      // ignore
    }
    onClose()
  }
  return (
    <div className="info-modal" role="dialog" aria-modal="true" aria-label="How to look after your Haggling" onClick={done}>
      <div className="info-panel info-panel-wide" onClick={(e) => e.stopPropagation()}>
        <h3>Looking after {name}</h3>
        <p>
          Five bars: <strong>Hunger</strong>, <strong>Mood</strong>, <strong>Energy</strong> go down over time;{' '}
          <strong>Mess</strong> goes up. <strong>Health XP</strong> drops if a bar stays empty too long. Life XP and your
          level only ever go up.
        </p>
        <ul className="temperament-glossary">
          {ROWS.map(([k, v]) => (
            <li key={k}>
              <strong>{k}</strong>
              <p>{v}</p>
            </li>
          ))}
        </ul>
        <p className="care-sub">Weather changes their mood too. Every Haggis loves rain, mist and haar, and wilts in the heat.</p>
        <button type="button" className="btn btn-primary" onClick={done}>
          Got it
        </button>
      </div>
    </div>
  )
}
