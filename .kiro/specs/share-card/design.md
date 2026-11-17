# Kiro - Design: share-card

## Data
- `children.public_id text unique` set by the insert trigger (10 chars, `[a-z0-9]`, from `gen_random_bytes`); backfill existing rows.
- `children.share_enabled boolean not null default true`; owner toggles through RPC `set_share_enabled(child, bool)`.
- `public_haggling(p_public_id text)` security definer, anon execute: returns name, temperament_id, life_xp, hunger, mood, energy, mess, health_xp, created_at, share_enabled (other fields nulled when disabled).

## Web
- SPA route: `/h/<id>` (two path parts, so it never clashes with nest slugs) -> `PublicCard` component.
- Link previews: crawlers do not run JavaScript, so a **Cloudflare Pages Function** `apps/mother/functions/h/[id].ts` fetches `index.html`, calls `public_haggling` with the publishable key, and injects `og:title`, `og:description`, `og:image` (temperament portrait, absolute URL) with `HTMLRewriter`. Everything else is served as now.
- "Share on social" uses `navigator.share({ url: origin + '/h/' + publicId })`, else copies the link.

## Tests
SQL: anon reads card fields only; disabled card hides stats; ids unique and not derived from names. Function: preview tags present for a real id; unknown id returns the page with default tags.
