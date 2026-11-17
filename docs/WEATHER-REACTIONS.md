# Kiro - Weather reactions (generated)

**Generated from `packages/care-engine/src/weather.ts`** by `npm run docs:weather`.
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
| Sunny | 0 | 0 | 0 |
| Crisp and clear | +1 | +2 | 0 |
| Frosty | +2 | +1 | -4 |
| Hot | -6 | -4 | -2 |
| Dreich (grey) | 0 | 0 | 0 |
| Rain | +4 | 0 | 0 |
| Storm | +6 | +2 | 0 |
| Snow | +2 | +2 | -4 |
| Blowy | +1 | +2 | 0 |
| Close and muggy | -3 | -3 | 0 |
| Mist and fog | +8 | +2 | 0 |
| Haar (sea fog) | +10 | +3 | 0 |

## By temperament

| Temperament | Loves | Sulks in |
| --- | --- | --- |
| Douce | Rain, Dreich (grey) | Hot, Storm |
| Skeigh | Crisp and clear, Blowy | Close and muggy, Hot, Storm |
| Ill-trickit | Storm, Blowy | Dreich (grey) |
| Ree | Frosty, Crisp and clear | Storm |
| Radge | Storm, Blowy | Hot, Close and muggy |
| Fair Wud | Storm, Snow, Blowy, Frosty | Sunny, Crisp and clear |

Fair Wud also gets **+4 Mood when the weather changes** and **-4 when "nice" weather (sunny, crisp, dreich) repeats**.

## Full table: Mood / Energy / Hunger per reading

😍 = big happy swing, 😠 = big sulk.

| Weather | Douce | Skeigh | Ill-trickit | Ree | Radge | Fair Wud |
| --- | --- | --- | --- | --- | --- | --- |
| Sunny | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | -6 / -3 😠 |
| Crisp and clear | +1 / +2 | +7 / +5 | +1 / +2 | +7 / +5 | +1 / +2 | -5 / -1 |
| Frosty | +2 / +1 / -4 | +2 / +1 / -4 | +2 / +1 / -4 | +8 / +4 / -4 😍 | +2 / +1 / -4 | +8 / +4 / -4 😍 |
| Hot | -12 / -6 / -2 😠 | -12 / -6 / -2 😠 | -6 / -4 / -2 😠 | -6 / -4 / -2 😠 | -12 / -6 / -2 😠 | -6 / -4 / -2 😠 |
| Dreich (grey) | +6 / +3 | 0 / 0 | -6 / -3 😠 | 0 / 0 | 0 / 0 | 0 / 0 |
| Rain | +10 / +3 😍 | +4 / 0 | +4 / 0 | +4 / 0 | +4 / 0 | +4 / 0 |
| Storm | 0 / -1 | 0 / -1 | +12 / +5 😍 | 0 / -1 | +12 / +5 😍 | +12 / +5 😍 |
| Snow | +2 / +2 / -4 | +2 / +2 / -4 | +2 / +2 / -4 | +2 / +2 / -4 | +2 / +2 / -4 | +8 / +5 / -4 😍 |
| Blowy | +1 / +2 | +7 / +5 | +7 / +5 | +1 / +2 | +7 / +5 | +7 / +5 |
| Close and muggy | -3 / -3 | -9 / -6 😠 | -3 / -3 | -3 / -3 | -9 / -6 😠 | -3 / -3 |
| Mist and fog | +8 / +2 😍 | +8 / +2 😍 | +8 / +2 😍 | +8 / +2 😍 | +8 / +2 😍 | +8 / +2 😍 |
| Haar (sea fog) | +10 / +3 😍 | +10 / +3 😍 | +10 / +3 😍 | +10 / +3 😍 | +10 / +3 😍 | +10 / +3 😍 |

## What the scrapbook says (example name "Wee Yin")

| Weather | Line |
| --- | --- |
| Sunny | Sunshine. Wee Yin squinted at it, suspicious. |
| Crisp and clear | A crisp, bright day. Wee Yin wants a walk in the hills. |
| Frosty | Frost! Wee Yin skated across the kitchen floor at full speed. |
| Hot | Far too hot. Wee Yin lay flat on the cold flags and glared at the sun. |
| Dreich (grey) | A dreich day. Wee Yin pulled the blanket up and said nothing. |
| Rain | Wee Yin sat at the window and listened to the rain. Fair chuffed. |
| Storm | Wee Yin watched the storm roll in, ears up, delighted. |
| Snow | Snow! Wee Yin ate some. Then wanted porridge. |
| Blowy | Blowing a hoolie. Wee Yin leaned into the wind like a wee sail. |
| Close and muggy | Close and muggy. Wee Yin lay flat on the cool floor. |
| Mist and fog | Mist down to the doorstep. Wee Yin vanished into it, giggling. |
| Haar (sea fog) | The haar rolled in off the sea. Wee Yin breathed it in like a homecoming. |

Special lines for some temperaments:

- **Douce, Rain:** Wee Yin curled up by the window to the sound of rain. Pure contentment.
- **Skeigh, Storm:** Thunder! Wee Yin shot under the sofa and stayed there.
- **Ill-trickit, Storm:** Wee Yin cackled at the thunder and knocked a mug off the table to celebrate.
- **Ree, Frosty:** Frost! Wee Yin skated across the kitchen floor at full speed.
- **Radge, Hot:** Wee Yin is roasting and furious about it. Keep well back.
- **Fair Wud, Storm:** Wee Yin met the thunder head-on and had to be talked down off the dresser.
