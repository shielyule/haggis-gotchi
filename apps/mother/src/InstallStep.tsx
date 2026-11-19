import { useEffect, useState } from 'react'
import { isIPhone } from './lib/device'

/** Chrome's install prompt event (not in the TypeScript DOM types). */
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/** phone-home R2: install first, so the Haggling has a home icon and reminders work. */
export function InstallStep({ onSkip }: { onSkip: () => void }) {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setPrompt(e as InstallPromptEvent)
    }
    const onInstalled = () => setInstalled(true)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  async function install() {
    if (!prompt) return
    await prompt.prompt()
    const choice = await prompt.userChoice
    if (choice.outcome === 'accepted') setInstalled(true)
    setPrompt(null)
  }

  return (
    <main className="phone-start">
      <p className="brand">Haggis-gotchi</p>
      <h1>Give your Haggling a home</h1>
      <p>
        Haggis-gotchi is a <strong>web app</strong>: it opens in your phone&rsquo;s browser,
        with no app store needed. Add it to your home screen to get an icon, and your
        Haggling can tell you when it is hungry or sleepy.
      </p>

      {installed ? (
        <p className="treat-note">
          Done! Close this tab and open <strong>Haggis-gotchi</strong> from your home screen.
        </p>
      ) : prompt ? (
        <button type="button" className="btn btn-primary" onClick={() => void install()}>
          Add to home screen
        </button>
      ) : isIPhone() ? (
        <ol className="install-steps">
          <li>Tap the <strong>Share</strong> button (square with an arrow) at the bottom.</li>
          <li>Scroll and tap <strong>Add to Home Screen</strong>, then <strong>Add</strong>.</li>
          <li>Close Safari and open <strong>Haggis-gotchi</strong> from your home screen.</li>
        </ol>
      ) : (
        <ol className="install-steps">
          <li>Tap the <strong>⋮</strong> menu at the top right of Chrome.</li>
          <li>Tap <strong>Add to Home screen</strong> (or <strong>Install app</strong>), then <strong>Install</strong>.</li>
          <li>Open <strong>Haggis-gotchi</strong> from your home screen.</li>
        </ol>
      )}

      <button type="button" className="btn btn-ghost" onClick={onSkip}>
        Carry on in the browser
      </button>
    </main>
  )
}
