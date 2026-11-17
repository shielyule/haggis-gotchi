/**
 * Cloudflare Pages Function: /h/<id> serves the app page with link-preview tags
 * (WhatsApp, Instagram, X and Facebook do not run JavaScript). share-card T3.
 * Uses only PUBLIC values: the Supabase URL and the publishable key (both already
 * in the site's JavaScript). If anything fails, the plain page is served.
 */
import { ogTags, type CardRow } from '../_lib/og.ts'

const SUPABASE_URL = 'https://zsiqrfckfjunackmxcpe.supabase.co'
const PUBLISHABLE_KEY = 'sb_publishable_DohxOMOyhaCBY8oZ9ZeQsA_4KSjIi5X'

type Ctx = { request: Request; params: { id?: string | string[] }; next: () => Promise<Response> }

export const onRequestGet = async (context: Ctx): Promise<Response> => {
  const page = await context.next() // index.html via _redirects
  const raw = context.params.id
  const id = Array.isArray(raw) ? raw[0] : raw
  if (!id || !/^[a-f0-9]{10}$/.test(id)) return page
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/public_haggling`, {
      method: 'POST',
      headers: { apikey: PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_public_id: id }),
    })
    const rows = res.ok ? ((await res.json()) as CardRow[]) : []
    const tags = ogTags(rows[0] ?? null, new URL(context.request.url).origin, id)
    // @ts-expect-error HTMLRewriter is provided by the Cloudflare runtime
    return new HTMLRewriter()
      .on('head', { element: (el: { append: (h: string, o: { html: boolean }) => void }) => el.append(tags, { html: true }) })
      .transform(page)
  } catch {
    return page
  }
}
