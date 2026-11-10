import { temperamentForChaos } from './temperaments'
import type { SignupAnswers } from '../lib/storage'

export type BirthStory = {
  id: string
  /** Matches Temperament.id */
  band: string
  beats: [string, string, string]
}

/** From Kiroween/Haggling BIRTH_STORIES.md — 20 skeletons, picked by chaos band. */
export const BIRTH_STORIES: BirthStory[] = [
  {
    id: 'douce-blanket-snug',
    band: 'douce',
    beats: [
      'The wee shell sits tucked among woollen clouts, neat as a fresh loaf on a cooling wire. Not a whisper, not a pebble loose.',
      'Something stirs within the wool, and {{name}} becomes aware the Haggling is hatching.',
      'A tidy seam parts down the middle, greeting the world {{temperament}}, sedate, and entirely content to wait its turn.',
    ],
  },
  {
    id: 'douce-hearth-basking',
    band: 'douce',
    beats: [
      'Resting on the hearthrug without a scratch or a blemish, the egg looks far too respectable to contain an unhatched beastie.',
      'Something stirs by the warm hearth, and {{name}} becomes quietly aware that the Haggling is hatching.',
      'A gentle crack yawns open, revealing a douce bundle ready to doze quietly for an hour before bothering anyone for breakfast.',
    ],
  },
  {
    id: 'douce-tattie-dream',
    band: 'douce',
    beats: [
      'The egg sits placidly by the dresser, so still you would mistake it for an ornamental stone from the burn.',
      'Something stirs with a sleepy, gentle rustle, and {{name}} becomes aware the Haggling is hatching.',
      "The shell slides apart like a butter dish, revealing a creature so {{temperament}} that butter wouldn't melt in its mouth.",
    ],
  },
  {
    id: 'skeigh-kettle-shiver',
    band: 'skeigh',
    beats: [
      'The shell sits balanced on the sofa edge, tilted sharply like a radio aerial catching static.',
      'Something stirs with a sharp tremor, and {{name}} becomes suddenly aware the Haggling is hatching.',
      'It bursts open with a skittish flinch, entirely {{temperament}}, ears twitching before its feet have even touched the rug.',
    ],
  },
  {
    id: 'skeigh-shadow-scritch',
    band: 'skeigh',
    beats: [
      'Perched high up out of reach, the egg quivers every time a cloud passes the window.',
      'Something stirs behind a veil of shadows, and {{name}} becomes nervously aware the Haggling is hatching.',
      'A hair-thin crack zips around the belly, popping open a wee face that is skeigh to the bone and startled by its own shadow.',
    ],
  },
  {
    id: 'skeigh-floorboard-startle',
    band: 'skeigh',
    beats: [
      'The speckled shell is completely motionless, though its surface feels cool and tightly wound as a clockwork spring.',
      'Something stirs at the creak of a floorboard, and {{name}} becomes alertly aware the Haggling is hatching.',
      'The egg leaps straight into the air and cracks mid-flight, tumbling out {{temperament}} and ready to hide under the nearest armchair.',
    ],
  },
  {
    id: 'ill-trickit-cup-edge',
    band: 'ill-trickit',
    beats: [
      'The egg sits innocent as a boiled egg, though it has somehow crept three inches closer to the edge of the sideboard.',
      'Something stirs on the sly, and {{name}} becomes warily aware the Haggling is hatching.',
      'It pokes one claw out through the opening, testing how fragile things are, unmistakably ill-trickit from head to tail.',
    ],
  },
  {
    id: 'ill-trickit-draught-scooter',
    band: 'ill-trickit',
    beats: [
      'The shell sits dead-still in a corner, waiting for someone to drop their guard.',
      'Something stirs in the draughty shadows, and {{name}} becomes suspiciously aware the Haggling is hatching.',
      'The top lifts off like a hinged dustbin lid, peering out with a scheming, {{temperament}} twinkle that promises stolen pens and unrolled towels.',
    ],
  },
  {
    id: 'ill-trickit-shoe-stealer',
    band: 'ill-trickit',
    beats: [
      'A dark, mottled egg rests beside the coat rack, perfectly quiet and completely blameless.',
      'Something stirs with a quiet scrape, and {{name}} becomes immediately aware the Haggling is hatching.',
      'A hairline crack opens on the sly, and an ill-trickit snout nudges one shoe firmly under the hallway chest.',
    ],
  },
  {
    id: 'ree-carpet-spinner',
    band: 'ree',
    beats: [
      'The egg sits humming like a beehive under a blanket, vibrating until the tea saucers clatter.',
      'Something stirs into frantic motion, and {{name}} becomes dizzily aware the Haggling is hatching.',
      'The shell shatters into thirty neat shards as the bairn shoots out {{temperament}}, banking off the skirting board at full gallop.',
    ],
  },
  {
    id: 'ree-zoomie-skid',
    band: 'ree',
    beats: [
      'The shell is rocking back and forth on its rounded end, picking up speed like a rolling pin down a hill.',
      'Something stirs with frantic momentum, and {{name}} becomes breathless as they realise the Haggling is hatching.',
      'It splits clean open on the turn, tossing out a wee ree cyclone that immediately attempts to run up the wall.',
    ],
  },
  {
    id: 'ree-curtain-clatter',
    band: 'ree',
    beats: [
      'There is a wild scuffling inside the calcium, like an energetic moth trapped in a biscuit tin.',
      'Something stirs with a violent bounce, and {{name}} becomes startled to find the Haggling is hatching.',
      'Out it pops, entirely {{temperament}}, tumbling across the floor, skidding on a mat, and bouncing upright like a cork.',
    ],
  },
  {
    id: 'radge-cardboard-crunch',
    band: 'radge',
    beats: [
      'The egg sits wedged inside a cardboard box, radiating menace and low-frequency intent.',
      'Something stirs with a bruising thump, and {{name}} becomes braced for impact as the Haggling begins hatching.',
      'The casing splinters under sheer brute enthusiasm, and a radge wee face emerges, chewing aggressively on the packing tape.',
    ],
  },
  {
    id: 'radge-sofa-shredder',
    band: 'radge',
    beats: [
      'A rumbling, thumping egg rolls menacingly against the back of the settee.',
      'Something stirs with reckless force, and {{name}} becomes alarmed to see the Haggling is hatching.',
      'It blows apart with a sharp snap, completely {{temperament}}, immediately abandoning all polite decorum to tackle the armchair fringe.',
    ],
  },
  {
    id: 'radge-bannock-batter',
    band: 'radge',
    beats: [
      'The shell has cracks radiating outward like a smashed windscreen, held together through stubborn grit alone.',
      'Something stirs like a piston, and {{name}} becomes fully aware the Haggling is violently hatching.',
      'The baby kicks its way out sideways, thoroughly radge, glaring at the light fixtures and ready to shred the nearest newspaper.',
    ],
  },
  {
    id: 'radge-fender-ram',
    band: 'radge',
    beats: [
      'Sitting by the hearth, the egg looks heavily armoured and entirely unrepentant.',
      'Something stirs with an unholy clatter, and {{name}} becomes hastily aware the Haggling is hatching.',
      'A sudden heave snaps the shell, casting out an untamable, {{temperament}} rascal that immediately barks at the coal bucket.',
    ],
  },
  {
    id: 'fair-wud-goblin-spree',
    band: 'fair-wud',
    beats: [
      'The shell is vibrating so fiercely that dust dances on the sideboard around it.',
      'Something stirs with feral intensity, and {{name}} becomes terrified and delighted to see the Haggling is hatching.',
      'The casing detonates in sheer joy, releasing a fair wud terror that screams at the ceiling and attempts to scale the wall drapery.',
    ],
  },
  {
    id: 'fair-wud-tempest-born',
    band: 'fair-wud',
    beats: [
      'The egg sits boiling hot to the touch, rattling its cradle like a kettle with the lid stuck on.',
      'Something stirs in absolute bedlam, and {{name}} becomes acutely aware the Haggling is hatching.',
      'It fractures with a roar, tumbling into existence {{temperament}}: utterly feral, claws out, and intoxicated by pure, unbridled madness.',
    ],
  },
  {
    id: 'fair-wud-clootie-wrath',
    band: 'fair-wud',
    beats: [
      'Two manic little eyes are already glaring through a tiny pecked hole in the shell.',
      'Something stirs with manic fury, and {{name}} becomes instantly aware the Haggling is hatching.',
      'The casing explodes outwards, unleashing a fair wud creature whose toothy grin proves it is entirely beyond the reach of reason or treats.',
    ],
  },
  {
    id: 'fair-wud-kitchen-whirl',
    band: 'fair-wud',
    beats: [
      'The egg is rocking with violent, rhythmic force, carving grooves into the tabletop.',
      'Something stirs like a runaway engine, and {{name}} becomes helplessly aware the Haggling is hatching.',
      'It tears its own shell to ribbons, landing belly-down and spitting joyous fury, entirely {{temperament}} and proud of it.',
    ],
  },
]

const HOME_WORDS: Record<string, string> = {
  city: 'the city',
  town: 'a town',
  countryside: 'the countryside',
  seaside: 'the seaside',
}

const DAY_WORDS: Record<string, string> = {
  rainy: 'a rainy day',
  beach: 'a beach day',
  forest: 'a forest walk',
}

export function storiesForBand(band: string): BirthStory[] {
  const pool = BIRTH_STORIES.filter((story) => story.band === band)
  return pool.length > 0 ? pool : BIRTH_STORIES
}

export function pickStory(answers: SignupAnswers): BirthStory {
  const pool = storiesForBand(temperamentForChaos(answers.chaos).id)
  return pool[Math.floor(Math.random() * pool.length)]
}

export function storyForAnswers(answers: SignupAnswers, storyId?: string): BirthStory {
  const chosen = storyId ? BIRTH_STORIES.find((story) => story.id === storyId) : undefined
  if (chosen) return chosen
  const pool = storiesForBand(temperamentForChaos(answers.chaos).id)
  return pool[0]
}

export function fillBeat(template: string, answers: SignupAnswers): string {
  const temp = temperamentForChaos(answers.chaos)
  const slots: Record<string, string> = {
    name: answers.displayName.trim() || 'the carer',
    pet: answers.pet.trim() || 'a creature they have not met yet',
    home: HOME_WORDS[answers.place] || 'home',
    games: answers.games.trim() || 'no particular game',
    food: answers.comfortFood.trim() || 'tattie scones',
    day: DAY_WORDS[answers.weatherDay] || 'an ordinary day',
    quirk: answers.familyQuirk.trim() || 'a saying the family never wrote down',
    temperament: temp.label,
  }
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => slots[key] ?? '')
}

export function filledBeats(answers: SignupAnswers, storyId?: string): string[] {
  return storyForAnswers(answers, storyId).beats.map((beat) => fillBeat(beat, answers))
}

/** 0, 1, or 2 — which beat to show given how far through the wait we are. */
export function beatIndex(createdAt: string, readyAt: string, now: number): number {
  const start = new Date(createdAt).getTime()
  const end = new Date(readyAt).getTime()
  const span = Math.max(1, end - start)
  const t = Math.min(1, Math.max(0, (now - start) / span))
  if (t < 0.34) return 0
  if (t < 0.67) return 1
  return 2
}
