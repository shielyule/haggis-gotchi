import { useEffect, useState } from 'react'
import { fetchRiddle, guessRiddle, type RiddleView } from './lib/cloud'
import { chirp } from './lib/chirp'

/** Daily folklore riddle (spec ai-haggling R5): one guess per Haggling per day. */
type Props = {
  childId: string
  name: string
  onGuessed: (correct: boolean, scrap?: RiddleView['scrap']) => void
  onClose: () => void
}

export function RiddleGame({ childId, name, onGuessed, onClose }: Props) {
  const [riddle, setRiddle] = useState<RiddleView | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void fetchRiddle(childId).then((r) => (r.ok ? setRiddle(r.data) : setError(r.error)))
  }, [childId])

  async function guess(choice: number) {
    if (!riddle || riddle.guess || busy) return
    setBusy(true)
    const r = await guessRiddle(childId, choice)
    setBusy(false)
    if (!r.ok) return setError(r.error)
    setRiddle(r.data)
    if (r.data.guess && !r.data.already) {
      chirp(r.data.guess.correct ? 'win' : 'miss')
      onGuessed(r.data.guess.correct, r.data.scrap)
    }
  }

  const g = riddle?.guess
  return (
    <div className="info-modal" role="dialog" aria-modal="true" aria-label="Folklore riddle">
      <div className="info-panel riddle-panel">
        <p className="signup-kicker">Today&rsquo;s folklore riddle</p>
        {error ? <p className="form-error">{error}</p> : null}
        {!riddle && !error ? <p className="care-sub">{name} is thinking one up…</p> : null}
        {riddle ? (
          <>
            <h2 className="riddle-question">{riddle.question}</h2>
            <div className="riddle-options">
              {riddle.options.map((o, i) => {
                const state = g ? (i === g.answer ? ' riddle-right' : i === g.choice ? ' riddle-wrong' : '') : ''
                return (
                  <button key={o} type="button" className={`btn btn-ghost riddle-option${state}`} disabled={Boolean(g) || busy} onClick={() => void guess(i)}>
                    {o}
                  </button>
                )
              })}
            </div>
            {g ? (
              <p className="treat-note" role="status">
                {g.correct ? `Right! ${name} is fair chuffed (Mood +8).` : `Not quite. ${name} enjoyed having a go (Mood +2).`} {g.explain}
                {riddle.already ? ' (Already answered today: a new riddle comes tomorrow.)' : ''}
              </p>
            ) : (
              <p className="care-sub">One guess a day. Everyone gets the same riddle.</p>
            )}
          </>
        ) : null}
        <button type="button" className="btn btn-primary" onClick={onClose}>
          {g ? 'Done' : 'Maybe later'}
        </button>
      </div>
    </div>
  )
}
