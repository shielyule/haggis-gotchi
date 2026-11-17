# Kiro - Tasks: share-card

- [x] T1 Migration: `public_id`, `share_enabled`, `public_haggling()`, `set_share_enabled()`; backfill; SQL test in rollback
- [~] T2 `PublicCard` page at `/h/<id>` (read-only bars, level, hatch film, Get your own egg)
- [x] T3 Pages Function for link previews (Open Graph tags)
- [~] T4 Share button uses the card link; on/off toggle on the care screen
- [ ] T5 Owner test: share to WhatsApp on Android, preview shows the Haggling

Status 17 Nov: migration live (6 checks + regressions pass). Pages Function compiled with wrangler and run locally against the live database: /h/<id> returns "Firecracker the Ree Haggling" with the Ree preview image; unknown id gets generic tags; other pages untouched. Preview images 60-105 KB (WhatsApp-friendly). T2/T4 built, phone test pending; T5 needs a real WhatsApp share after push.
Legend: [x] verified, [~] built, phone test pending.
