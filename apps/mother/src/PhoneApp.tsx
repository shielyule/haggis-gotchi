import { useCallback, useEffect, useState } from 'react'
import { AuthBar } from './AuthBar'
import { InstallStep } from './InstallStep'
import { NestApp } from './NestApp'
import { SignupForm } from './SignupForm'
import { pullBroodFromCloud } from './lib/cloud'
import { installSkipped, isInstalled, skipInstall } from './lib/device'
import { eggSlug, loadStore, replaceLocalBrood, type EggRecord } from './lib/storage'
import { supabase } from './lib/supabase'

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
    return (
      <main className="phone-start">
        <p className="brand">Haggis-gotchi</p>
        <p>Waking the mother…</p>
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

  const mine = eggs[0]
  if (mine) return <NestApp slug={eggSlug(mine)} />

  return (
    <main className="phone-start">
      <p className="brand">Haggis-gotchi</p>
      <label className="demo-toggle">
        <input type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} />
        Demo wait (~90s instead of 30 min)
      </label>
      <SignupForm
        demoCompress={demo}
        presetEmail={email}
        onClaimed={() => setEggs(loadStore().eggs)}
      />
    </main>
  )
}
