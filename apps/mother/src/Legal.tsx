import { useEffect, useState } from 'react'
import { deleteMyAccount } from './lib/cloud'
import { supabase } from './lib/supabase'

/** Privacy notice, terms and delete-account (review 22 Nov). Plain words, short. */
const UPDATED = '25 November 2026'
const CONTACT = 'hello@haggisgotchi.com'

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="legal-page">
      <p className="brand">
        <a href="/">Haggis-gotchi</a>
      </p>
      <h1>{title}</h1>
      <p className="care-sub">Last updated {UPDATED}</p>
      {children}
      <p className="care-sub legal-links">
        <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a> · <a href="/">Back to the app</a>
      </p>
    </main>
  )
}

export function PrivacyPage() {
  return (
    <Shell title="Privacy notice">
      <p>
        Haggis-gotchi is a small game made for the Kiroween 2026 hackathon. We keep as little about you as we can.
        Questions, or want a copy of your data? Email <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>

      <h2>What we keep</h2>
      <ul>
        <li><strong>Your email address.</strong> To sign you in and to send your egg-ready link and your Haggling&rsquo;s big news. Never shown to anyone.</li>
        <li><strong>The name you give us</strong> and your sign-up answers. They write your Haggling&rsquo;s birth story.</li>
        <li><strong>Your Haggling.</strong> Its name, bars, scrapbook and what you did when (feed, cuddle and so on).</li>
        <li><strong>A random device ID</strong>, so we know which phone is your Haggling&rsquo;s home.</li>
        <li><strong>Reminders</strong> (only if you turn them on): your phone&rsquo;s notification address and time zone.</li>
        <li><strong>Weather</strong> (only if you say yes): your rough area, rounded to about 11 km, never your exact spot. Weather readings are deleted after 14 days.</li>
        <li><strong>Spam protection:</strong> scrambled (hashed) copies of your email and internet address, deleted after 2 days. We cannot turn them back into the real thing.</li>
      </ul>
      <p>
        Your phone also keeps a copy of your Haggling in its own storage, so the game works offline. Clearing the
        browser&rsquo;s site data removes it.
      </p>

      <h2>AI</h2>
      <p>
        Your Haggling&rsquo;s diary, its reaction to a photo and the daily riddle are written by an AI (Google Gemini, paid
        service). The words are checked before they reach you, and if the AI is not available a written line is used
        instead. You never chat with the AI.
      </p>

      <h2>Photos</h2>
      <p>
        A Photo Treat photo is shrunk on your phone, sent to Amazon Rekognition to spot what is in it (Irn-Bru,
        bagpipes and so on), and then thrown away. We never store your photos.
      </p>

      <h2>What other people can see</h2>
      <p>
        Nothing, unless you tick a box. The public card, the public scrapbook and the graveyard show only your first
        name (or nickname) and your Haggling&rsquo;s name. Never your email or where you live. The public card and
        scrapbook are off until you turn them on.
      </p>

      <h2>Who helps us run it</h2>
      <ul>
        <li><strong>Supabase</strong> (database and sign-in), servers in Frankfurt, Germany.</li>
        <li><strong>Resend</strong> (sends our emails).</li>
        <li><strong>Amazon Web Services: Rekognition</strong> (looks at Photo Treat photos, does not keep them).</li>
        <li>
          <strong>Google Gemini</strong> (paid service: an AI that writes your Haggling&rsquo;s nightly diary, its reaction to a
          photo, and the daily riddle). It gets only the day&rsquo;s facts: your Haggling&rsquo;s name and type, the weather, the
          nearest town, what care it had, and for a photo the names of the things seen in it (like &ldquo;dog&rdquo; or
          &ldquo;box&rdquo;). Never your name, email, exact location, the photo itself or anything you type. On the paid
          service Google does not use this to improve its products; it keeps it for a short time to check for misuse,
          and may process it outside the UK.
        </li>
        <li><strong>Open-Meteo</strong> (weather forecasts, gets your rounded area only).</li>
        <li><strong>Cloudflare</strong> (hosts the website and runs the &ldquo;I am human&rdquo; check, Turnstile).</li>
        <li><strong>Google Fonts</strong> (the lettering). Your browser fetches the fonts from Google, so Google sees your internet address.</li>
      </ul>
      <p>We do not sell your data, show adverts, or use tracking cookies.</p>

      <h2>How long we keep it</h2>
      <p>
        Until you delete your account. A Haggling lives about six weeks, then its stone stays in the graveyard until
        you delete your account.
      </p>

      <h2>Age</h2>
      <p>Haggis-gotchi is for adults: 18 and over.</p>

      <h2>Your rights</h2>
      <p>
        You can ask to see, correct or delete your data at any time (UK GDPR). Email{' '}
        <a href={`mailto:${CONTACT}`}>{CONTACT}</a>, or delete your account yourself below. If you are unhappy with
        how we handle your data you can complain to the Information Commissioner&rsquo;s Office (ico.org.uk).
      </p>

      <DeleteAccount />
    </Shell>
  )
}

export function TermsPage() {
  return (
    <Shell title="Terms">
      <ul>
        <li>Haggis-gotchi is a free game for adults (18 and over).</li>
        <li>It is a hackathon project. It may change, break or close, and your Haggling may be lost. We will try to warn you first.</li>
        <li>
          Clean fun: the game never swears. A joke about the carer&rsquo;s whisky only turns up once a Haggling is
          grown up, and the Haggling sticks to Irn-Bru.
        </li>
        <li>Be kind. Do not give your Haggling a name meant to hurt someone. We can remove names, stones and accounts that break this.</li>
        <li>Do not try to break, overload or misuse the service.</li>
        <li>
          Haggis-gotchi is not linked to, or endorsed by, A.G. Barr (Irn-Bru) or any other brand named in the game.
          Names are used only to describe the Photo Treats.
        </li>
        <li>
          Weather data comes from Open-Meteo (open-meteo.com) under CC BY 4.0. It is a free service for
          non-commercial use.
        </li>
        <li>
          Our privacy notice explains what we keep and why: <a href="/privacy">privacy notice</a>.
        </li>
        <li>
          Questions: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
        </li>
      </ul>
    </Shell>
  )
}

function DeleteAccount() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<{ text: string; good: boolean } | null>(null)
  useEffect(() => {
    if (!supabase) return setSignedIn(false)
    void supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)))
  }, [])

  async function run() {
    setBusy(true)
    setNote(null)
    const r = await deleteMyAccount()
    setBusy(false)
    if (!r.ok) {
      setNote({ good: false, text: r.error ?? 'Could not delete the account.' })
      return
    }
    // Clear this phone's copy too.
    for (const k of Object.keys(localStorage)) if (k.startsWith('haggis-gotchi:')) localStorage.removeItem(k)
    await supabase?.auth.signOut()
    setSignedIn(false)
    setNote({ good: true, text: 'Done. Your account and all your Hagglings have been deleted from our servers and this phone.' })
  }

  return (
    <section className="transfer-card delete-account" id="delete">
      <h2>Delete my account</h2>
      {note ? <p className={note.good ? 'treat-note' : 'form-error'}>{note.text}</p> : null}
      {signedIn === null ? null : !signedIn ? (
        note?.good ? null : (
          <p className="care-sub">
            Sign in on the <a href="/">app</a> first, then come back here. Or email{' '}
            <a href={`mailto:${CONTACT}`}>{CONTACT}</a> and we will do it for you.
          </p>
        )
      ) : (
        <>
          <p className="care-sub">
            This deletes your account, every Haggling, scrapbook, graveyard stone and reminder. It cannot be undone.
          </p>
          <label className="field">
            <span>Type DELETE to confirm</span>
            <input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          </label>
          <button type="button" className="btn btn-primary" disabled={typed !== 'DELETE' || busy} onClick={() => void run()}>
            {busy ? 'Deleting…' : 'Delete everything'}
          </button>
        </>
      )}
    </section>
  )
}
