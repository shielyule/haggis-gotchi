import { useState } from 'react'
import { chirp } from './lib/chirp'

/** Haggis Run (owner, 22 Nov): the wild haggis has longer legs on one side, so it can
 *  only run one way round the hill. Guess which way, five times. */
const ROUNDS = 5

type Way = 'clockwise' | 'anticlockwise'

type Props = {
  name: string
  onDone: (wins: number) => void
  onCancel: () => void
}

export function HaggisRun({ name, onDone, onCancel }: Props) {
  const [results, setResults] = useState<boolean[]>([])
  const [last, setLast] = useState<{ ran: Way; guess: Way } | null>(null)
  const wins = results.filter(Boolean).length
  const finished = results.length >= ROUNDS

  function guess(way: Way) {
    if (finished) return
    const ran: Way = Math.random() < 0.5 ? 'clockwise' : 'anticlockwise'
    const won = ran === way
    chirp(won ? 'win' : 'miss')
    setLast({ ran, guess: way })
    setResults((r) => [...r, won])
  }

  return (
    <div className="info-modal" role="dialog" aria-modal="true" aria-label="Haggis Run">
      <div className="info-panel haggis-run">
        <p className="signup-kicker">Haggis Run</p>
        <h2>Which way will {name} run?</h2>
        <p className="care-sub">
          A wild haggis has longer legs on one side, so it can only run one way round the hill.
          Guess which way. Round {Math.min(results.length + 1, ROUNDS)} of {ROUNDS}.
        </p>
        <div className={`run-hill${last ? ` run-${last.ran}` : ''}`} aria-hidden="true">
          <span className="run-haggis" key={results.length}>🐾</span>
          <span className="run-mound">⛰️</span>
        </div>
        {last ? (
          <p className="care-sub" role="status">
            {name} ran {last.ran === 'clockwise' ? 'clockwise ↻' : 'anticlockwise ↺'}.{' '}
            {last.ran === last.guess ? 'You got it!' : 'Missed!'}
          </p>
        ) : null}
        <p className="run-score" aria-label={`${wins} wins so far`}>
          {Array.from({ length: ROUNDS }, (_, i) => (
            <span key={i}>{i < results.length ? (results[i] ? '✅' : '❌') : '⚪'}</span>
          ))}
        </p>
        {finished ? (
          <>
            <p>
              {wins} of {ROUNDS}! {wins >= 4 ? `${name} is chuffed to bits.` : wins >= 2 ? 'Not bad at all.' : `${name} ran rings round you.`}
            </p>
            <button type="button" className="btn btn-primary" onClick={() => onDone(wins)}>
              Done
            </button>
          </>
        ) : (
          <>
            <div className="cta-row">
              <button type="button" className="btn btn-primary" onClick={() => guess('clockwise')}>
                ↻ Clockwise
              </button>
              <button type="button" className="btn btn-primary" onClick={() => guess('anticlockwise')}>
                ↺ Anticlockwise
              </button>
            </div>
            <button type="button" className="link-btn" onClick={onCancel}>
              Stop playing
            </button>
          </>
        )}
      </div>
    </div>
  )
}
