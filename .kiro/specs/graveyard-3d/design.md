# Kiro - Design: graveyard-3d (Tier A)
- `apps/mother/src/graveyard/`: `views.ts` (view keys, file names, alt text, query parsing), `GraveyardPage.tsx` (page and switcher), `graveyard.css` (plain CSS).
- `App.tsx`: one early return for `/haggis-graveyard`, `React.lazy` + `Suspense`. `_redirects` already serves the SPA.
- Images in `apps/mother/public/graveyard/` as WebP, `srcset` 1600w and 2400w (total about 1.8 MB for all four views at both sizes).
- Fade: the new image animates in over the old one for 450 ms, then the old one is removed.
- Layout: the picture is a square sized with container query units (`min(100cqw, 100cqh)`), edges feathered by a CSS mask, page background matched per view.
- Phase 2: `hotspots.json` per view (polygons in percent), SVG overlay, popup as a real dialog, dev-only draw tool.
- Phase 3: `ghosts.json` (image, view, path points, duration, delay), Web Animations API.
- Phase 4: `slots.json` for the Lower Brae, stone sprites cropped from the stone sheet, earth-mound sprite.
