import { useCallback, useEffect, useState } from 'react'
import { AuthBar } from './AuthBar'
import { InstallStep } from './InstallStep'
import { NestApp } from './NestApp'
import { SignupForm } from './SignupForm'
import { pullBroodFromCloud } from './lib/cloud'
import { installSkipped, isInstalled, skipInstall } from './lib/device'
import { stagePortraitFor, temperamentForChaos } from './data/temperaments'
import { lifeStatus } from './lib/engine'
import { eggSlug, loadStore, replaceLocalBrood, savePhoneStore, type EggRecord } from './lib/storage'
import { supabase } from './lib/supabase'

const SELECTED_KEY = 'haggis-gotchi:selected-egg'

/**
 * phone-home: the Haggling is born and lives on the phone.
 * Install first -> one email code -> claim -> wait/hatch/name/care (NestApp).
 */
export function PhoneApp() {
  const [installOk, setInstallOk] = useState(() => isInstalled() || installSkipped())
  const [email, setEmail] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(!supabase)
  const [eggs, setEggs] = useState<EggRecord[]>(() => loadStore().eggs)
  const [pulled, setPulled] = useState(false)
  const [demo, setDemo] = useState(true)
  // Several Hagglings per carer (owner, 19 Nov): which one is on screen.
  const [selectedId, setSelectedId] = useState<string | null>(() => localStorage.getItem(SELECTED_KEY))

  function pick(id: string) {
    localStorage.setItem(SELECTED_KEY, id)
    setSelectedId(id)
    window.history.replaceState(null, '', '/')
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut()
    // Hagglings stay safe in the cloud; this phone forgets them until you sign in again.
    replaceLocalBrood([])
    savePhoneStore({ child: null })
    localStorage.removeItem(SELECTED_KEY)
    window.location.href = '/'
  }

  // Track the stored session ourselves, so the phone stays signed in (R3.2).
  useEffect(() => {
    if (!supabase) return
    void supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user.email ?? null)
      setAuthReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user.email ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!email) return
    setPulled(false)
    void pullBroodFromCloud().then((cloud) => {
      if (cloud) {
        replaceLocalBrood(cloud) // this account's brood only
        setEggs(cloud)
      }
      setPulled(true)
    })
  }, [email])

  const onAuthChange = useCallback((next: string | null) => setEmail(next), [])

  if (!installOk) {
    return (
      <InstallStep
        onSkip={() => {
          skipInstall()
          setInstallOk(true)
        }}
      />
    )
  }

  if (!authReady || (email && !pulled)) {
    // Start-up still: this phone's own Haggling type, if it has one.
    const known = eggs.find((e) => e.haggling)
    return (
      <main className="phone-start">
        <p className="brand">Haggis-gotchi</p>
        {known ? (
          <div className="care-stage">
            <img
              src={stagePortraitFor(
                temperamentForChaos(known.answers.chaos).id,
                lifeStatus(known.haggling?.bornAt ?? known.haggling?.hatchedAt, known.haggling?.spanEndsAt, Date.now()).stage,
              )}
              alt={known.haggling?.name ?? 'Your Haggling'}
            />
          </div>
        ) : null}
        <p>{known?.haggling ? `Waking ${known.haggling.name}…` : 'Waking the mother…'}</p>
      </main>
    )
  }

  if (!email) {
    return (
      <main className="phone-start">
        <p className="brand">Haggis-gotchi</p>
        <h1>Start here</h1>
        <p>
          Enter your email. We send a 6-digit code once, and this phone then stays
          signed in. Already have a Haggling? Same email brings them back.
        </p>
        <AuthBar onAuthChange={onAuthChange} intent="start" />
      </main>
    )
  }

  // "Claim a new egg" after a departure (lifespan-graveyard R2.3) opens /?new=1.
  const wantsNew = new URLSearchParams(window.location.search).get('new') === '1'
  const mine = eggs.find((e) => e.id === selectedId) ?? eggs[0]
  const broodBar = (
    <nav className="brood-bar" aria-label="Your Hagglings">
      {eggs.map((e) => (
        <button
          key={e.id}
          type="button"
          className={`brood-chip${e.id === mine?.id && !wantsNew ? ' brood-chip-on' : ''}`}
          onClick={() => pick(e.id)}
        >
          {e.haggling?.name ?? 'Egg'}
        </button>
      ))}
      <a className="brood-chip" href="/?new=1">
        + New egg
      </a>
      <button type="button" className="brood-chip brood-signout" onClick={() => void signOut()}>
        Sign out
      </button>
    </nav>
  )
  if (mine && !wantsNew) {
    return (
      <>
        {broodBar}
        <NestApp key={mine.id} slug={eggSlug(mine)} eggId={mine.id} />
      </>
    )
  }

  return (
    <main className="phone-start">
      {eggs.length ? broodBar : null}
      <p className="brand">Haggis-gotchi</p>
      <label className="demo-toggle">
        <input type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} />
        Demo wait (10 seconds instead of 20)
      </label>
      <SignupForm
        demoCompress={demo}
        presetEmail={email}
        onClaimed={(id) => {
          localStorage.setItem(SELECTED_KEY, id)
          setSelectedId(id)
          window.history.replaceState(null, '', '/')
          setEggs(loadStore().eggs)
        }}
      />
    </main>
  )
}
