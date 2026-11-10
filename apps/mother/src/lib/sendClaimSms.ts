import { supabase, supabaseConfigured } from './supabase'

export async function sendClaimSms(input: {
  to: string
  link: string
  name: string
  code: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!supabaseConfigured || !supabase) {
    return {
      ok: false,
      error: 'Cloud not configured — copy the link instead.',
    }
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) {
    return {
      ok: false,
      error: 'Sign in on Mother first, then send the text.',
    }
  }

  const { data, error } = await supabase.functions.invoke('send-claim-sms', {
    body: input,
  })

  const payload = data as { ok?: boolean; error?: string } | null
  if (payload?.ok) return { ok: true }
  if (payload?.error) return { ok: false, error: payload.error }
  if (error) {
    return { ok: false, error: error.message || 'Could not reach SMS service.' }
  }
  return { ok: false, error: 'Text was not sent.' }
}
