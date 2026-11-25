/**
 * The Haggling's AI words (spec ai-haggling R3.7, R6).
 * Provider (25 Nov): Google Gemini (paid tier) whenever its key is set; Amazon Bedrock otherwise
 * (AWS gave the account a 0-token quota: docs/INCIDENT-2026-11-23-aws-bedrock-quota.md).
 * The game never depends on the AI: every caller passes a written fallback, used when the AI is off,
 * slow, over the daily cap, blocked by a safety filter, or writes something that fails our checks.
 *
 * Secrets: GEMINI_API_KEY (also read as `GEMINI_API_KEY\`` , the name it was first saved under),
 *          GEMINI_MODEL (optional), AWS_* (Bedrock), AI_PROVIDER=gemini|bedrock (optional),
 *          AI_TIMEOUT_MS (optional), AI_OFF=1 switches all AI off.
 */
import { AwsClient } from 'npm:aws4fetch@1.0.20'
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

export const DAILY_AI_CAP = 400
const TIMEOUT_MS = Number(Deno.env.get('AI_TIMEOUT_MS') ?? 10_000)

export type Provider = 'gemini' | 'bedrock'

function geminiKey(): string | undefined {
  return Deno.env.get('GEMINI_API_KEY') ?? Deno.env.get('GEMINI_API_KEY`') ?? undefined
}

export function provider(): Provider {
  const want = Deno.env.get('AI_PROVIDER')
  if (want === 'bedrock' || want === 'gemini') return want
  return geminiKey() ? 'gemini' : 'bedrock'
}

export function modelId(): string {
  return provider() === 'gemini'
    ? (Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.5-flash-lite')
    : (Deno.env.get('BEDROCK_MODEL') ?? 'amazon.nova-lite-v1:0')
}

/** Missing settings by name (never values). Empty = ready. */
export function aiConfigured(): string[] {
  if (Deno.env.get('AI_OFF') === '1') return ['AI_OFF']
  if (provider() === 'gemini') return geminiKey() ? [] : ['GEMINI_API_KEY']
  return [
    !Deno.env.get('AWS_ACCESS_KEY_ID') && 'AWS_ACCESS_KEY_ID',
    !Deno.env.get('AWS_SECRET_ACCESS_KEY') && 'AWS_SECRET_ACCESS_KEY',
  ].filter(Boolean) as string[]
}

/** Why the last call failed (status + error type, never content). */
export let lastFailure = ''

async function withTimeout<T>(run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    return await run(ctrl.signal)
  } finally {
    clearTimeout(timer)
  }
}

/** Gemini generateContent, with Google's safety filters at their strictest useful level. */
async function callGemini(system: string, prompt: string, maxTokens: number, temperature: number): Promise<string | null> {
  const res = await withTimeout((signal) =>
    fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelId())}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey()! },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens, temperature },
        safetySettings: ['HARM_CATEGORY_HARASSMENT', 'HARM_CATEGORY_HATE_SPEECH', 'HARM_CATEGORY_SEXUALLY_EXPLICIT', 'HARM_CATEGORY_DANGEROUS_CONTENT'].map(
          (category) => ({ category, threshold: 'BLOCK_LOW_AND_ABOVE' }),
        ),
      }),
      signal,
    }),
  )
  const body = (await res.json().catch(() => ({}))) as {
    error?: { code?: number; status?: string }
    candidates?: { finishReason?: string; content?: { parts?: { text?: string }[] } }[]
    promptFeedback?: { blockReason?: string }
  }
  if (!res.ok) {
    lastFailure = `gemini ${res.status} ${body.error?.status ?? ''}`.trim()
    return null
  }
  if (body.promptFeedback?.blockReason) {
    lastFailure = `gemini blocked ${body.promptFeedback.blockReason}`
    return null
  }
  const c = body.candidates?.[0]
  // A line cut off at the word limit is unfinished (seen live 25 Nov: a missing closing quote): fall back.
  if (c?.finishReason && c.finishReason !== 'STOP') {
    lastFailure = `gemini finish ${c.finishReason}`
    return null
  }
  const text = c?.content?.parts?.map((p) => p.text ?? '').join('').trim()
  if (!text) lastFailure = 'gemini no text'
  return text || null
}

/** Bedrock Converse (kept in case AWS lifts the zero quota). */
async function callBedrock(system: string, prompt: string, maxTokens: number, temperature: number): Promise<string | null> {
  const region = Deno.env.get('AWS_REGION') ?? 'eu-west-2'
  const aws = new AwsClient({
    accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID')!,
    secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY')!,
    region,
    service: 'bedrock',
    retries: 0, // a refusal (e.g. a daily quota) must fail fast and use the written line
  })
  const res = await withTimeout((signal) =>
    aws.fetch(`https://bedrock-runtime.${region}.amazonaws.com/model/${encodeURIComponent(modelId())}/converse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system: [{ text: system }],
        messages: [{ role: 'user', content: [{ text: prompt }] }],
        inferenceConfig: { maxTokens, temperature },
      }),
      signal,
    }),
  )
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string }
    const type = res.headers.get('x-amzn-errortype') ?? ''
    lastFailure = `bedrock ${res.status} ${type.split(':')[0]} ${String(body.message ?? '').slice(0, 80)}`.trim()
    return null
  }
  const j = (await res.json()) as { output?: { message?: { content?: { text?: string }[] } } }
  const text = j.output?.message?.content?.map((c) => c.text ?? '').join('').trim()
  if (!text) lastFailure = 'bedrock no text'
  return text || null
}

/** One call to the current provider. Returns the text, or null on any failure. */
export async function converse(system: string, prompt: string, maxTokens = 200, temperature = 0.8): Promise<string | null> {
  lastFailure = ''
  if (aiConfigured().length) {
    lastFailure = `not configured: ${aiConfigured().join(', ')}`
    return null
  }
  try {
    const text = provider() === 'gemini' ? await callGemini(system, prompt, maxTokens, temperature) : await callBedrock(system, prompt, maxTokens, temperature)
    if (!text) console.error(`ai: ${lastFailure}`)
    return text
  } catch (e) {
    lastFailure = `${provider()} call failed: ${e instanceof Error ? e.name : 'error'}`
    console.error(`ai: ${lastFailure}`)
    return null
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
 * Ask the AI for a line; keep it only if `clean(raw)` returns a good line. Otherwise the fallback.
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
  await admin.from('ai_calls').insert({
    kind,
    ok: Boolean(good),
    provider: provider(),
    reason: good ? null : (raw ? 'rejected by checks' : lastFailure || 'no text').slice(0, 120),
  })
  if (!good && raw) console.log(`ai ${kind}: rejected by checks, used fallback`)
  return good ? { text: good, source: 'ai' } : { text: fallback(), source: 'fallback' }
}
