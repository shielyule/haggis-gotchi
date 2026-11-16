-- One-off clean slate requested by the owner on 16 Nov 2026 (test data only).
-- NOT a migration. Kiro runs it once, after taking a JSON backup into
-- backups/ (git-ignored, contains emails). Keeps carers and sign-in accounts.

begin;
delete from public.check_ins;
delete from public.scrapbook_entries;
delete from public.children;
delete from public.eggs;
delete from public.claim_attempts;
commit;

select
  (select count(*) from public.eggs) as eggs,
  (select count(*) from public.children) as children,
  (select count(*) from public.scrapbook_entries) as scrapbook,
  (select count(*) from public.check_ins) as check_ins;
