/** Sound (owner, 22 Nov): a short chirp per care action. Made with WebAudio, so no sound files to download.
 *  Off switch is saved on the device. */
const MUTE_KEY = 'haggis-gotchi:sound-off'

/** Each action gets its own wee tune: [frequency Hz, length s] notes. */
const TUNES: Record<string, [number, number][]> = {
  feed: [[660, 0.08], [880, 0.1]],
  cuddle: [[520, 0.12], [620, 0.16]],
  walk: [[700, 0.06], [760, 0.06], [820, 0.08]],
  treat: [[880, 0.06], [1100, 0.06], [1320, 0.1]],
  clean: [[900, 0.05], [700, 0.05], [900, 0.05]],
  sleep: [[600, 0.18], [450, 0.25]],
  play: [[700, 0.07], [900, 0.07], [1200, 0.12]],
  scold: [[300, 0.15], [220, 0.22]],
  win: [[880, 0.08], [1320, 0.14]],
  miss: [[400, 0.1], [330, 0.14]],
}

let ctx: AudioContext | null = null

export function soundOn(): boolean {
  return localStorage.getItem(MUTE_KEY) !== '1'
}

export function setSoundOn(on: boolean): void {
  if (on) localStorage.removeItem(MUTE_KEY)
  else localStorage.setItem(MUTE_KEY, '1')
}

export function chirp(kind: string): void {
  if (!soundOn()) return
  const tune = TUNES[kind]
  if (!tune) return
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return
    ctx ??= new Ctor()
    if (ctx.state === 'suspended') void ctx.resume()
    let t = ctx.currentTime + 0.01
    for (const [freq, len] of tune) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, t)
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.18, t + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + len)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t)
      osc.stop(t + len + 0.02)
      t += len
    }
  } catch {
    // Sound is a nice-to-have; never break care over it.
  }
}
