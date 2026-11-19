# Adding a hotspot (step by step)
The list lives in `apps/mother/src/graveyard/hotspots.json`. It starts empty (`[]`), so the live page shows no hotspots until you add some.

## 1. Draw the shape
1. In Terminal: `cd ~/Desktop/haggis-gotchi-kirkyard/apps/mother` then `npm run dev`.
2. Open `http://localhost:5173/haggis-graveyard?edit=1` (the tool only exists on your computer, never on the live site).
3. Pick the view you want (Day/Night, Above/Below).
4. Click around the thing you want to highlight, one click per corner (3 or more). Undo and Clear fix mistakes.
5. Type a Title. Tick "Only this view" if it should appear on just this painting. Leave it unticked to show the same area on all four.
6. Press **Copy JSON**.

## 2. Add it to the list
Open `hotspots.json` and paste inside the square brackets. Separate entries with commas. Then replace `"Write the lore here."` with your text. A blank line (`\n\n` inside the quotes) starts a new paragraph. Plain text only, no HTML.

Optional fields on an entry:
- `"image": "/graveyard/hotspots/the-kirk.webp"` and `"imageAlt": "A short description"`
- `"video": "/graveyard/hotspots/the-kirk.mp4"` and `"poster": "/graveyard/hotspots/the-kirk.webp"` (video wins if both are given; keep each file under 3 MB)

Put the files in `apps/mother/public/graveyard/hotspots/`. Paths must start with `/graveyard/`.

## 3. Check it
Reload the page. A gold dot marks each hotspot. Hover (or tab to it) to see the outline and name; click to open the pop-up. Share a hotspot with `?open=<id>`, for example `/haggis-graveyard?open=the-kirk`.

If an entry is wrong (bad id, fewer than 3 points, no title), it is skipped and the dev console says why.
