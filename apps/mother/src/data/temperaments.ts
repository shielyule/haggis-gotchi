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

/** Care-screen portrait per temperament. Missing ones fall back to hero. */
export const CARE_PORTRAITS: Record<string, string> = {
  douce: '/art/haggling-care-douce.jpeg',
  skeigh: '/art/haggling-care-skeigh.jpeg',
  'ill-trickit': '/art/haggling-care-ill-trickit.jpeg',
  ree: '/art/haggling-care-ree.jpeg',
  radge: '/art/haggling-care-radge.jpeg',
  'fair-wud': '/art/haggling-care-fair-wud.jpeg',
}

export const CARE_PORTRAIT_FALLBACK = '/art/haggis-hero.jpg'

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
  return [hatch, ...more]
}

export function temperamentForChaos(chaos: number): Temperament {
  const n = Math.max(0, Math.min(100, Math.round(chaos)))
  return (
    TEMPERAMENTS.find((t) => n >= t.min && n <= t.max) ??
    TEMPERAMENTS[TEMPERAMENTS.length - 1]
  )
}
