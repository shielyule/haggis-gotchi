export type Temperament = {
  id: string
  label: string
  pronounce?: string
  short: string
  blurb: string
  min: number
  max: number
}

/** Chaos 0–100 → Scottish temperament bands */
export const TEMPERAMENTS: Temperament[] = [
  {
    id: 'douce',
    label: 'Douce',
    pronounce: "doos",
    short: 'Placid & angelic',
    blurb:
      "Sedate, tidy, and utterly well-behaved. The pet is curled neatly on a blanket, looking respectable, butter-wouldn't-melt innocent, and requiring zero supervision.",
    min: 0,
    max: 16,
  },
  {
    id: 'skeigh',
    label: 'Skeigh',
    pronounce: "skee-ch (guttural ch)",
    short: 'Twitchy & skittish',
    blurb:
      'High-spirited and easily startled. The pupils are slightly dilated, ears are swivelling like radar dishes, and a sudden twitch of a foot or rustle of a bag might trigger a startled leap onto the sofa back.',
    min: 17,
    max: 33,
  },
  {
    id: 'ill-trickit',
    label: 'Ill-trickit',
    short: 'Scheming mischief',
    blurb:
      'Prankish, contrary, and deliberately testing household boundaries. This is the stage where eye contact is maintained while slowly nudging a coffee mug toward the edge of a table or systematically unravelling the toilet roll.',
    min: 34,
    max: 50,
  },
  {
    id: 'ree',
    label: 'Ree',
    short: 'The full zoomies',
    blurb:
      'Overstimulated, frantic, and half-crazed with energy. Running wall-to-wall at top speed, drifting round rugs, skidding across hardwood floors, and bouncing off upholstery for no discernible reason.',
    min: 51,
    max: 66,
  },
  {
    id: 'radge',
    label: 'Radge',
    short: 'Reckless chaos',
    blurb:
      'Wild, unruly, and destructive. The creature has abandoned all social contracts. It is actively scaling the curtains, shredding cardboard, barking at invisible spectres, or attempting to climb inside the sofa cushions from behind.',
    min: 67,
    max: 83,
  },
  {
    id: 'fair-wud',
    label: 'Fair Wud',
    pronounce: 'wid',
    short: 'Utterly feral',
    blurb:
      'From the Old Scots word for mad, furious, or rabid. Total sensory overload and feral delirium. Claws out, teeth bared in goblin joy, hissing or yowling at nothing, and completely beyond the reach of human bribery, reason, or treats.',
    min: 84,
    max: 100,
  },
]

/** Drop mp4s in apps/mother/public/art/ with these exact names. */
export const HATCH_FILMS: Record<string, string> = {
  douce: '/art/haggling-hatch-douce.mp4',
  skeigh: '/art/haggling-hatch-skeigh.mp4',
  'ill-trickit': '/art/haggling-hatch-ill-trickit.mp4',
  ree: '/art/haggling-hatch-ree.mp4',
  radge: '/art/haggling-hatch-radge.mp4',
  'fair-wud': '/art/haggling-hatch-fair-wud.mp4',
}

export const HATCH_FILM_FALLBACK = '/art/haggling-hatching-1.mp4'

/** "Playing" films, unlocked 24 h after hatching (play-film spec). */
export const PLAY_FILMS: Record<string, string> = {
  douce: '/art/haggling-play-douce.mp4',
  skeigh: '/art/haggling-play-skeigh.mp4',
  'ill-trickit': '/art/haggling-play-ill-trickit.mp4',
  ree: '/art/haggling-play-ree.mp4',
  radge: '/art/haggling-play-radge.mp4',
  'fair-wud': '/art/haggling-play-fair-wud.mp4',
}

/** Care-screen portrait per temperament. Missing ones fall back to hero. */
export const CARE_PORTRAITS: Record<string, string> = {
  douce: '/art/haggling-care-douce.jpeg',
  skeigh: '/art/haggling-care-skeigh.jpeg',
  'ill-trickit': '/art/haggling-care-ill-trickit.jpeg',
  ree: '/art/haggling-care-ree.jpeg',
  radge: '/art/haggling-care-radge.jpeg',
  'fair-wud': '/art/haggling-care-fair-wud.jpeg',
}

export const CARE_PORTRAIT_FALLBACK = '/art/mother-haggis.jpeg'

export function hatchFilmFor(temperamentId: string): string {
  return HATCH_FILMS[temperamentId] ?? HATCH_FILM_FALLBACK
}

export function carePortraitFor(temperamentId: string): string {
  return CARE_PORTRAITS[temperamentId] ?? CARE_PORTRAIT_FALLBACK
}

/** A clip the carer can rewatch (hatch now; growth films later). */
export type MemoryFilm = {
  id: string
  title: string
  src: string
}

/** Built-in + any unlocked extras stored on the Haggling. */
export function memoryFilmsFor(
  temperamentId: string,
  extras: MemoryFilm[] = [],
  opts: { playUnlocked?: boolean } = {},
): MemoryFilm[] {
  const temp =
    TEMPERAMENTS.find((t) => t.id === temperamentId) ??
    TEMPERAMENTS[TEMPERAMENTS.length - 1]
  const hatch: MemoryFilm = {
    id: `hatch-${temperamentId}`,
    title: `Hatching — ${temp.label}`,
    src: hatchFilmFor(temperamentId),
  }
  const seen = new Set<string>([hatch.id])
  const more: MemoryFilm[] = []
  for (const film of extras) {
    if (seen.has(film.id)) continue
    seen.add(film.id)
    more.push(film)
  }
  const play: MemoryFilm[] =
    opts.playUnlocked && PLAY_FILMS[temperamentId]
      ? [{ id: `play-${temperamentId}`, title: `Playing: ${temp.label}`, src: PLAY_FILMS[temperamentId] }]
      : []
  // Newest first (owner, 18 Nov): later growth films come before the hatch film.
  return [...[...more].reverse(), ...play, hatch]
}

export function temperamentForChaos(chaos: number): Temperament {
  const n = Math.max(0, Math.min(100, Math.round(chaos)))
  return (
    TEMPERAMENTS.find((t) => n >= t.min && n <= t.max) ??
    TEMPERAMENTS[TEMPERAMENTS.length - 1]
  )
}

/**
 * Stage portraits (lifespan-graveyard). Owner is making teen/adult/elder images:
 * add entries here as `haggling-<stage>-<temperament>.jpeg` lands in public/art.
 * Missing stages fall back to the baby portrait (the care screen shows a stage badge).
 */
export const STAGE_PORTRAITS: Record<string, Record<string, string>> = {
  child: {
    'douce': '/art/haggling-child-douce.jpeg',
    'skeigh': '/art/haggling-child-skeigh.jpeg',
    'ill-trickit': '/art/haggling-child-ill-trickit.jpeg',
    'ree': '/art/haggling-child-ree.jpeg',
    'radge': '/art/haggling-child-radge.jpeg',
    'fair-wud': '/art/haggling-child-fair-wud.jpeg',
  },
  teen: {
    'douce': '/art/haggling-teen-douce.jpeg',
    'skeigh': '/art/haggling-teen-skeigh.jpeg',
    'ill-trickit': '/art/haggling-teen-ill-trickit.jpeg',
    'ree': '/art/haggling-teen-ree.jpeg',
    'radge': '/art/haggling-teen-radge.jpeg',
    'fair-wud': '/art/haggling-teen-fair-wud.jpeg',
  },
}

export function stagePortraitFor(temperamentId: string, stage: string): string {
  return STAGE_PORTRAITS[stage]?.[temperamentId] ?? carePortraitFor(temperamentId)
}

/** Ghost portraits (owner's art, 18 Nov). Used for departed Hagglings that kept a ghost. */
export const GHOST_PORTRAITS: Record<string, string> = {
  douce: '/art/haggling-ghost-douce.jpeg',
  skeigh: '/art/haggling-ghost-skeigh.jpeg',
  'ill-trickit': '/art/haggling-ghost-ill-trickit.jpeg',
  ree: '/art/haggling-ghost-ree.jpeg',
  radge: '/art/haggling-ghost-radge.jpeg',
  'fair-wud': '/art/haggling-ghost-fair-wud.jpeg',
}

export function ghostPortraitFor(temperamentId: string): string {
  return GHOST_PORTRAITS[temperamentId] ?? carePortraitFor(temperamentId)
}
