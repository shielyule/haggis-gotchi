# Design: birthing-ritual

## Signup fields (seed)

- Current / wished pet
- Grew up with (animals, place, weather)
- City / town / countryside
- Games played
- Comfort food
- Rainy day vs beach day
- Hills vs flat
- Family quirk or saying
- Chaos slider (calm → feral)
- Teen identity opt-in (boolean + disclaimer ack)

## Templates

Store as markdown or JSON under `apps/mother/src/data/birth-templates/`. Each has:

- `id`, `title`, `beats[]` (timed story paragraphs)
- slots: `{{comfort_food}}`, `{{place}}`, `{{quirk}}`, etc.

## Elaboration

MVP: fill slots locally. Later: Kiro/agent or API call with steering constraints from `scottish-folklore.md`.

## Demo compression

`?demo=1` or env flag: wait becomes ~60–90 seconds so the YouTube demo can show birth → baby without a real half hour.
