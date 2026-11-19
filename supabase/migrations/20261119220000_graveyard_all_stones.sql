-- Owner decision 19 Nov 2026: the public graveyard shows ALL stones.
-- A stone shows only the Haggling's name, type, days lived, tone and epitaph; never the carer.
-- (The public scrapbook opt-in no longer hides stones.) Memorial links still follow the
-- carer's public-card choice.
create or replace function public.public_graveyard()
returns table (
  name text, temperament_id text, days_lived int, tone text, epitaph text,
  departed_at timestamptz, public_id text, ghost boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select g.name, g.temperament_id, g.days_lived, g.tone, g.epitaph, g.departed_at,
         case when c.share_enabled then c.public_id end, coalesce(c.ghost_opt_in, false)
    from public.graveyard_entries g
    join public.children c on c.id = g.child_id
   order by g.departed_at desc
   limit 100
$$;
revoke execute on function public.public_graveyard() from public;
grant execute on function public.public_graveyard() to anon, authenticated;
