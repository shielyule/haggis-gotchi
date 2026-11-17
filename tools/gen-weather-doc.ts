// Generates docs/WEATHER-REACTIONS.md from the care engine's own tables.
// Run: npm run docs:weather   (regenerate whenever weather.ts changes)
import { writeFileSync } from 'node:fs'
import {
  TEMPERAMENT_WEATHER,
  WEATHER_BASE,
  WEATHER_BUCKETS,
  WEATHER_LABEL,
  weatherDelta,
  weatherLine,
} from '../packages/care-engine/src/weather.ts'

const T = Object.keys(TEMPERAMENT_WEATHER)
const NAMES: Record<string, string> = {
  douce: 'Douce', skeigh: 'Skeigh', 'ill-trickit': 'Ill-trickit', ree: 'Ree', radge: 'Radge', 'fair-wud': 'Fair Wud',
}
const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`)
const cell = (b: (typeof WEATHER_BUCKETS)[number], t: string) => {
  const d = weatherDelta(b, t)
  const face = d.mood >= 8 ? ' 😍' : d.mood <= -6 ? ' 😠' : ''
  return `${sign(d.mood)} / ${sign(d.energy)}${d.hunger ? ` / ${sign(d.hunger)}` : ''}${face}`
}

let md = `# Kiro - Weather reactions (generated)

**Generated from \`packages/care-engine/src/weather.ts\`** by \`npm run docs:weather\`.
Do not edit by hand: change the engine, then regenerate. The app, the server and
this table all use the same numbers.

## How weather reaches a Haggling
- Readings at **6am, 1pm and 7pm** carer-local time (or when the app opens).
- Each reading is sorted into one of 10 kinds of weather, then nudges **Mood / Energy / Hunger**.
- Limits per reading: Mood +/-12, Energy +/-6, Hunger 0 to -6. **Weather never changes Health XP.**
- A scrapbook line is written when Mood moves 8 or more, or the weather changes.
- **Morning swing banner:** the weather flipped overnight, or Mood moved a lot.

## Every Haggling (base)
All Haggis love rain, mist, fog and **haar** (sea fog: weather from the seaside home place), and all of them wilt in the heat, some more than others.

| Weather | Mood | Energy | Hunger |
| --- | --- | --- | --- |
`
for (const b of WEATHER_BUCKETS) {
  const d = WEATHER_BASE[b]
  md += `| ${WEATHER_LABEL[b]} | ${sign(d.mood)} | ${sign(d.energy)} | ${sign(d.hunger)} |\n`
}

md += `\n## By temperament\n\n| Temperament | Loves | Sulks in |\n| --- | --- | --- |\n`
for (const t of T) {
  const { loves, sulks } = TEMPERAMENT_WEATHER[t]
  md += `| ${NAMES[t]} | ${loves.map((b) => WEATHER_LABEL[b]).join(', ')} | ${sulks.map((b) => WEATHER_LABEL[b]).join(', ')} |\n`
}
md += `\nFair Wud also gets **+4 Mood when the weather changes** and **-4 when "nice" weather (sunny, crisp, dreich) repeats**.\n`

md += `\n## Full table: Mood / Energy / Hunger per reading\n\n😍 = big happy swing, 😠 = big sulk.\n\n| Weather | ${T.map((t) => NAMES[t]).join(' | ')} |\n| --- |${T.map(() => ' --- |').join('')}\n`
for (const b of WEATHER_BUCKETS) md += `| ${WEATHER_LABEL[b]} | ${T.map((t) => cell(b, t)).join(' | ')} |\n`

md += `\n## What the scrapbook says (example name "Wee Yin")\n\n| Weather | Line |\n| --- | --- |\n`
for (const b of WEATHER_BUCKETS) md += `| ${WEATHER_LABEL[b]} | ${weatherLine('Wee Yin', b, 'ree')} |\n`
md += `\nSpecial lines for some temperaments:\n\n`
const special: [string, (typeof WEATHER_BUCKETS)[number]][] = [
  ['douce', 'rain'], ['skeigh', 'storm'], ['ill-trickit', 'storm'], ['ree', 'frost'], ['radge', 'hot'], ['fair-wud', 'storm'],
]
for (const [t, b] of special) md += `- **${NAMES[t]}, ${WEATHER_LABEL[b]}:** ${weatherLine('Wee Yin', b, t)}\n`

writeFileSync(new URL('../docs/WEATHER-REACTIONS.md', import.meta.url), md)
console.log('wrote docs/WEATHER-REACTIONS.md')
