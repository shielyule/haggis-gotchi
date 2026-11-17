import { useEffect, useState } from 'react'
import { carePortraitFor, hatchFilmFor, TEMPERAMENTS } from './data/temperaments'
import { lifeLevel } from './lib/engine'
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
}

export function readCardIdFromPath(pathname = window.location.pathname): string | null {
  const m = pathname.match(/^\/h\/([a-f0-9]{10})\/?$/)
  return m ? m[1] : null
}

function Bar({ label, value }: { label: string; value: number }) {
  const v = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div className="meter">
      <div className="meter-top">
        <span>{label}</span>
        <span>{v}</span>
      </div>
      <div className="meter-track" aria-hidden="true">
        <div className="meter-fill" style={{ width: `${v}%` }} />
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

  return (
    <main className="phone-start public-card">
      <p className="brand">Haggis-gotchi</p>
      <h1>{card.name}</h1>
      <p className="care-sub">
        {temp?.label ?? card.temperament_id} Haggling · {temp?.short} · Level {level.level} ·{' '}
        {days === 0 ? 'hatched today' : `${days} day${days === 1 ? '' : 's'} old`}
      </p>
      <div className="care-stage">
        <img src={carePortraitFor(card.temperament_id)} alt={`${card.name}, a ${temp?.label ?? ''} Haggling`} />
      </div>
      <div className="care-meters">
        <Bar label="Health XP" value={card.health_xp ?? 50} />
        <Bar label="Hunger" value={card.hunger ?? 0} />
        <Bar label="Mood" value={card.mood ?? 0} />
        <Bar label="Energy" value={card.energy ?? 0} />
        <Bar label="Mess" value={card.mess ?? 0} />
      </div>
      <h3>The hatching</h3>
      <video className="watch-film" controls playsInline preload="metadata" poster="/art/haggis-hero.jpg">
        <source src={hatchFilmFor(card.temperament_id)} type="video/mp4" />
      </video>
      {getEgg}
    </main>
  )
}
