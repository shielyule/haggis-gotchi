import { useEffect, useState } from 'react'
import { carePortraitFor, ghostPortraitFor, hatchFilmFor, stagePortraitFor, TEMPERAMENTS } from './data/temperaments'
import { monthDayOf, portraitFor } from './data/costumes'
import { lifeLevel, lifeStatus } from './lib/engine'
import { supabase } from './lib/supabase'

/** share-card: public, read-only Haggling card at /h/<public id>. */
type Card = {
  name: string | null
  temperament_id: string | null
  life_xp: number | null
  hunger: number | null
  mood: number | null
  energy: number | null
  mess: number | null
  health_xp: number | null
  hatched_at: string | null
  share_enabled: boolean
  departed_at?: string | null
  epitaph?: string | null
  ghost?: boolean | null
}

export function readCardIdFromPath(pathname = window.location.pathname): string | null {
  const m = pathname.match(/^\/h\/([a-f0-9]{10})\/?$/)
  return m ? m[1] : null
}

function Bar({ label, value, bad = false }: { label: string; value: number; bad?: boolean }) {
  const v = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div className="meter">
      <div className="meter-top">
        <span>{label}</span>
        <span>{v}</span>
      </div>
      <div className="meter-track" aria-hidden="true">
        <div
          className={`meter-fill meter-traffic${bad ? ' meter-traffic-bad' : ''}`}
          style={{ width: `${v}%`, backgroundSize: v > 0 ? `${10000 / v}% 100%` : undefined }}
        />
      </div>
    </div>
  )
}

export function PublicCard({ id }: { id: string }) {
  const [card, setCard] = useState<Card | null | 'missing'>(null)

  useEffect(() => {
    if (!supabase) {
      setCard('missing')
      return
    }
    void supabase.rpc('public_haggling', { p_public_id: id }).then(({ data, error }) => {
      const row = Array.isArray(data) ? (data[0] as Card | undefined) : undefined
      setCard(error || !row ? 'missing' : row)
    })
  }, [id])

  const getEgg = (
    <a className="btn btn-primary" href="/">
      Get your own egg
    </a>
  )

  if (card === null) {
    return (
      <main className="phone-start">
        <p className="brand">Haggis-gotchi</p>
        <p>Finding this Haggling…</p>
      </main>
    )
  }
  if (card === 'missing' || !card.share_enabled || !card.name || !card.temperament_id) {
    return (
      <main className="phone-start">
        <p className="brand">Haggis-gotchi</p>
        <h1>{card === 'missing' ? 'No Haggling here' : 'This Haggling is keeping to themselves'}</h1>
        <p>Every Haggling is born on its carer&rsquo;s phone. Start your own.</p>
        {getEgg}
      </main>
    )
  }

  const temp = TEMPERAMENTS.find((t) => t.id === card.temperament_id)
  const level = lifeLevel(Number(card.life_xp ?? 0))
  const days = card.hatched_at
    ? Math.max(0, Math.floor((Date.now() - Date.parse(card.hatched_at)) / 86_400_000))
    : 0

  // lifespan-graveyard R4.1: departed Hagglings' cards become memorials.
  if (card.departed_at) {
    return (
      <main className="phone-start public-card">
        <p className="brand">Haggis-gotchi</p>
        <p className="signup-kicker">In memory of</p>
        <h1>{card.name}</h1>
        <div className="care-stage">
          <img
            className={card.ghost ? '' : 'ghost-portrait'}
            src={card.ghost ? ghostPortraitFor(card.temperament_id) : carePortraitFor(card.temperament_id)}
            alt={card.ghost ? `The ghost of ${card.name}` : `${card.name}, remembered`}
          />
        </div>
        <p className="epitaph">{card.epitaph}</p>
        <p className="care-sub">
          {temp?.label} Haggling · Level {level.level}
          {card.ghost ? ' · a wee ghost still drifts in the graveyard' : ''}
        </p>
        <a className="btn btn-ghost" href="/mother">
          Visit the graveyard
        </a>
        {getEgg}
      </main>
    )
  }

  return (
    <main className="phone-start public-card">
      <p className="brand">Haggis-gotchi</p>
      <h1>{card.name}</h1>
      <p className="care-sub">
        {temp?.label ?? card.temperament_id} Haggling · {temp?.short} · Level {level.level} ·{' '}
        {days === 0 ? 'hatched today' : `${days} day${days === 1 ? '' : 's'} old`}
      </p>
      <div className="care-stage">
        <img
          src={(() => {
            // Seasonal costume by date only (no demo preview for visitors).
            const st = lifeStatus(card.hatched_at ?? undefined, undefined, Date.now()).stage
            return portraitFor(card.temperament_id, st, monthDayOf(Date.now()), null, stagePortraitFor(card.temperament_id, st))
          })()}
          alt={`${card.name}, a ${temp?.label ?? ''} Haggling`}
        />
      </div>
      <div className="care-meters">
        <Bar label="Health XP" value={card.health_xp ?? 50} />
        <Bar label="Hunger" value={card.hunger ?? 0} />
        <Bar label="Mood" value={card.mood ?? 0} />
        <Bar label="Energy" value={card.energy ?? 0} />
        <Bar label="Mess" value={card.mess ?? 0} bad />
      </div>
      <h3>The hatching</h3>
      <video className="watch-film" controls playsInline preload="metadata" poster={carePortraitFor(card.temperament_id)}>
        <source src={hatchFilmFor(card.temperament_id)} type="video/mp4" />
      </video>
      {getEgg}
    </main>
  )
}
