/**
 * Amazon Bedrock (Amazon Nova Lite, Europe (London)) for the Haggling's words.
 * Spec: .kiro/specs/ai-haggling R3.7, R6. The game never depends on it: every caller
 * passes a written fallback, used when the AI is off, slow, over the daily cap, or
 * writes something that fails the checks.
 * Secrets: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION (shared with Rekognition;
 * the IAM user needs bedrock:InvokeModel, docs/AWS-BEDROCK-SETUP.md). AI_OFF=1 switches it off.
 */
import { AwsClient } from 'npm:aws4fetch@1.0.20'
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

export const DAILY_AI_CAP = 400
const TIMEOUT_MS = 10_000

export function modelId(): string {
  return Deno.env.get('BEDROCK_MODEL') ?? 'amazon.nova-lite-v1:0'
}

/** Missing settings by name (never values). Empty = ready. */
export function aiConfigured(): string[] {
  if (Deno.env.get('AI_OFF') === '1') return ['AI_OFF']
  return [
    !Deno.env.get('AWS_ACCESS_KEY_ID') && 'AWS_ACCESS_KEY_ID',
    !Deno.env.get('AWS_SECRET_ACCESS_KEY') && 'AWS_SECRET_ACCESS_KEY',
  ].filter(Boolean) as string[]
}

/** One Converse call. Returns the text, or null on any failure (logged by status and AWS error type only). */
export async function converse(system: string, prompt: string, maxTokens = 200, temperature = 0.8): Promise<string | null> {
  if (aiConfigured().length) return null
  const region = Deno.env.get('AWS_REGION') ?? 'eu-west-2'
  const aws = new AwsClient({
    accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID')!,
    secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY')!,
    region,
    service: 'bedrock',
  })
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await aws.fetch(`https://bedrock-runtime.${region}.amazonaws.com/model/${encodeURIComponent(modelId())}/converse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system: [{ text: system }],
        messages: [{ role: 'user', content: [{ text: prompt }] }],
        inferenceConfig: { maxTokens, temperature },
      }),
      signal: ctrl.signal,
    })
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string }
      const type = res.headers.get('x-amzn-errortype') ?? ''
      console.error(`bedrock: ${res.status} ${type.split(':')[0]} ${String(body.message ?? '').slice(0, 120)}`)
      return null
    }
    const j = (await res.json()) as { output?: { message?: { content?: { text?: string }[] } } }
    const text = j.output?.message?.content?.map((c) => c.text ?? '').join('').trim()
    return text || null
  } catch (e) {
    console.error('bedrock: call failed', e instanceof Error ? e.name : 'error')
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** R6.1: under the game-wide daily cap? */
export async function underCap(admin: SupabaseClient): Promise<boolean> {
  const since = new Date(Date.now() - 24 * 3600_000).toISOString()
  const { count, error } = await admin.from('ai_calls').select('id', { count: 'exact', head: true }).gte('at', since)
  return !error && (count ?? 0) < DAILY_AI_CAP
}

export type AiResult = { text: string; source: 'ai' | 'fallback' }

/**
 * Ask the AI for a line; keep it only if `accept(cleaned)` says it is good. Otherwise the fallback.
 * `clean` tidies the raw text first.
 */
export async function aiLine(
  admin: SupabaseClient,
  kind: 'diary' | 'reaction' | 'riddle',
  opts: { system: string; prompt: string; maxTokens?: number; temperature?: number },
  clean: (raw: string) => string | null,
  fallback: () => string,
): Promise<AiResult> {
  if (aiConfigured().length || !(await underCap(admin))) return { text: fallback(), source: 'fallback' }
  const raw = await converse(opts.system, opts.prompt, opts.maxTokens ?? 200, opts.temperature ?? 0.8)
  const good = raw ? clean(raw) : null
  await admin.from('ai_calls').insert({ kind, ok: Boolean(good) })
  if (!good && raw) console.log(`ai ${kind}: rejected by checks, used fallback`)
  return good ? { text: good, source: 'ai' } : { text: fallback(), source: 'fallback' }
}
