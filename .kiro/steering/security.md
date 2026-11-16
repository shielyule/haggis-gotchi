# Security (always applies, every spec, every change)

The browser is untrusted. The Supabase anon key is public by design and protects nothing.
Row level security, input validation and Edge Functions do the protecting.

## Rules
1. **Secrets** never in code, specs, logs, URLs or chat. Server secrets live only in Supabase Edge Function secrets or Vault. `.env.local`, `.env.*` (except `.env.example`) and `supabase/.temp/` are never committed.
2. **Every table has RLS on.** Every update policy has `with check`. New tables ship with an RLS test (user A cannot see user B).
3. **Validate at the trust boundary** (Edge Functions and SQL functions): allow-list fields, enforce types and lengths, reject unknown keys. Never trust the client for ownership, time, lifespan or meters.
4. **Public write endpoints** need a bot check and rate limits. Do not grant `anon` execute on functions that write.
5. **Output encoding.** Escape user text in HTML emails. Build URLs only from validated slugs. No personal data in URLs, QR codes or share text.
6. **Data minimisation.** Store the least needed. Coarse location only (0.1 degree), only with consent, deletable. Email stored once.
7. **No third party sees user data** without being named in the CSP `connect-src` and in the spec's security section.
8. **Fail closed.** Unknown caller, expired code, bad token: refuse with one uniform message.
9. **Every new spec** has a "Security considerations" section in requirements.md. A spec without one is not ready for approval.
10. **Dependencies:** `npm audit` must pass high severity. Prefer own small code over unvetted packages (especially MCP servers run via npx).

## Review prompt before approving a task
Who can call this? What if the input is hostile? What does it log? What does it cost if abused?
