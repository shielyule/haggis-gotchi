-- Photo Treat: Scottish tablet (owner, 25 Nov). Additive: widen the allowed treat ids.
alter table public.check_ins drop constraint if exists check_ins_treat_id_check;
alter table public.check_ins add constraint check_ins_treat_id_check
  check (treat_id in ('irn-bru', 'bagpipes', 'kilt', 'heather', 'shortbread', 'tablet'));
