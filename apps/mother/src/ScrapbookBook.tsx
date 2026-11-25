import { useEffect, useMemo, useRef, useState } from 'react'
import { fetchBook, fetchMyChildren } from './lib/cloud'
import { soundOn } from './lib/chirp'
import { entriesFor, KIND_ICON, paginate, scrapKind, TABS, type BookEntry } from './lib/scrapbook'
import { supabase } from './lib/supabase'

/**
 * The scrapbook book (spec ai-haggling R2): every page ever, in its own tab.
 * Owner's art (23 Nov): closed book -> opening film -> title pages -> written pages.
 * A computer shows the two-page spread; a phone shows one page at a time.
 */
const ART = {
  cover: '/art/scrapbook-cover.jpeg',
  film: '/art/scrapbook-opening.mp4',
  poster: '/art/scrapbook-opening-poster.jpeg',
  title: '/art/scrapbook-open-title.jpeg',
  blank: '/art/scrapbook-open-blank.jpeg',
  /** Owner's single page (24 Nov): the phone shows one whole page at a time. */
  page: '/art/scrapbook-page.jpeg',
}
const PER_SIDE = 4
const SEEN_KEY = 'haggis-gotchi:book-film-seen'

function useNarrow(): boolean {
  const q = '(max-width: 700px)'
  const [narrow, setNarrow] = useState(() => window.matchMedia(q).matches)
  useEffect(() => {
    const m = window.matchMedia(q)
    const on = () => setNarrow(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return narrow
}

type Side = { kind: 'title-left' } | { kind: 'title-right' } | { kind: 'title-single' } | { kind: 'entries'; entries: BookEntry[] }

export default function ScrapbookBook() {
  const params = new URLSearchParams(window.location.search)
  const [childId, setChildId] = useState(params.get('h') ?? '')
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  const [kids, setKids] = useState<{ id: string; name: string; departed_at: string | null }[]>([])
  const [book, setBook] = useState<Awaited<ReturnType<typeof fetchBook>> | null>(null)
  const [stage, setStage] = useState<'closed' | 'film' | 'open'>('closed')
  const [tab, setTab] = useState('all')
  const [at, setAt] = useState(0) // first side shown
  const narrow = useNarrow()
  const film = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (!supabase) return setSignedIn(false)
    void supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)))
  }, [])
  useEffect(() => {
    if (!signedIn) return
    void fetchMyChildren().then((k) => {
      setKids(k)
      if (!childId && k[0]) setChildId(k[0].id)
    })
  }, [signedIn])
  useEffect(() => {
    if (!signedIn || !childId) return
    setBook(null)
    void fetchBook(childId).then(setBook)
  }, [signedIn, childId])

  const born = book?.child?.born_at ?? book?.child?.created_at ?? new Date().toISOString()
  const list = useMemo(() => (book ? entriesFor(tab, book.entries, born) : []), [book, tab, born])
  const name = book?.child?.name ?? 'your Haggling'
  // Owner, 25 Nov: every page uses the single-page art (the halved spread looked chopped). A computer shows two
  // whole pages side by side; a phone shows one.
  const titles: Side[] = [{ kind: 'title-single' }]
  const sides: Side[] = [...titles, ...paginate(list, PER_SIDE).map((entries) => ({ kind: 'entries' as const, entries }))]
  const step = narrow ? 1 : 2
  const last = Math.max(0, sides.length - 1)
  const start = narrow ? Math.min(at, last) : Math.min(at - (at % 2), Math.max(0, last - (last % 2)))
  const shown = sides.slice(start, start + step)

  function openBook() {
    // The opening film once per device; after that straight to the pages (it can be replayed).
    if (localStorage.getItem(SEEN_KEY)) return setStage('open')
    setStage('film')
  }
  function filmDone() {
    localStorage.setItem(SEEN_KEY, '1')
    setStage('open')
  }

  if (signedIn === false) {
    return (
      <main className="book-page">
        <p className="care-sub">
          The scrapbook is private. Sign in first: on a phone, open <a href="/">Haggis-gotchi</a>; on a computer, open the{' '}
          <a href="/mother">mother page</a> and use <strong>Retrieve my Haggling</strong>. Then come back to this tab and refresh.
        </p>
      </main>
    )
  }

  return (
    <main className="book-page">
      <p className="brand">
        <a href="/">Haggis-gotchi</a>
      </p>
      {kids.length > 1 ? (
        <label className="field book-picker">
          <span>Whose scrapbook?</span>
          <select
            value={childId}
            onChange={(e) => {
              setChildId(e.target.value)
              setAt(0)
            }}
          >
            {kids.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
                {k.departed_at ? ' (gone to the glen)' : ''}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {stage === 'closed' ? (
        <button type="button" className="book-closed" onClick={openBook} aria-label={`Open ${name}'s scrapbook`}>
          <img src={ART.cover} alt="" />
          <span className="book-closed-label">
            <strong>{name}&rsquo;s scrapbook</strong>
            <span>{book ? `${book.entries.length} pages · tap to open` : 'Fetching the pages…'}</span>
          </span>
        </button>
      ) : null}

      {stage === 'film' ? (
        <div className="book-film">
          <video ref={film} src={ART.film} poster={ART.poster} autoPlay playsInline muted={!soundOn()} onEnded={filmDone} onError={filmDone} />
          <button type="button" className="btn btn-ghost book-skip" onClick={filmDone}>
            Skip ›
          </button>
        </div>
      ) : null}

      {stage === 'open' ? (
        <section className="book-open" aria-label={`${name}'s scrapbook`}>
          <nav className="book-tabs" aria-label="Scrapbook sections">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`book-tab${t.id === tab ? ' book-tab-on' : ''}`}
                onClick={() => {
                  setTab(t.id)
                  setAt(t.id === 'all' ? 0 : titles.length) // straight to the written pages
                }}
                aria-pressed={t.id === tab}
              >
                {t.label}
              </button>
            ))}
          </nav>
          <div className={`book-spread${narrow ? ' book-spread-one' : ''}`}>
            {shown.map((side, i) => {
              const index = start + i
              const half = 'single'
              const bg = ART.page
              return (
                <div
                  key={index}
                  className={`book-side book-side-${half}`}
                  style={{ backgroundImage: `url(${bg})` }}
                  aria-label={`Page ${index + 1}`}
                >
                  <div className="book-ink">
                    {side.kind === 'title-single' ? (
                      <div className="book-title-block book-title-single">
                        <p className="book-title-script">Haggisgotchi Scrapbook</p>
                        <p className="book-title-name">{name}</p>
                        <p>A Haggling&rsquo;s life, in their own words and yours.</p>
                        <p>{book ? `${book.entries.length} pages · ${TABS.find((t) => t.id === tab)?.label}` : 'Fetching the pages…'}</p>
                        <p className="book-hint">Turn the page ›</p>
                      </div>
                    ) : side.kind === 'title-left' ? (
                      <div className="book-title-block">
                        <p className="book-title-name">{name}</p>
                        <p>A Haggling&rsquo;s life, in their own words and yours.</p>
                      </div>
                    ) : side.kind === 'title-right' ? (
                      <div className="book-title-block">
                        <p>{book ? `${book.entries.length} pages` : 'Fetching the pages…'}</p>
                        <p>{TABS.find((t) => t.id === tab)?.label}</p>
                        <p className="book-hint">Turn the page ›</p>
                      </div>
                    ) : side.entries.length === 0 ? (
                      <p className="book-empty">Nothing on these pages yet.</p>
                    ) : (
                      <ul className="book-entries">
                        {side.entries.map((e) => {
                          const kind = scrapKind(e)
                          return (
                            <li key={e.id} className={`book-entry book-entry-${kind}`}>
                              <time dateTime={e.at}>
                                {new Date(e.at).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                              </time>
                              <p>
                                <span aria-hidden="true">{KIND_ICON[kind]} </span>
                                {e.text}
                              </p>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="book-turn">
            <button type="button" className="btn btn-ghost" disabled={start <= 0} onClick={() => setAt(Math.max(0, start - step))}>
              ‹ Back
            </button>
            <span className="care-sub">
              {narrow ? `Page ${start + 1} of ${sides.length}` : `Pages ${start + 1}-${Math.min(start + 2, sides.length)} of ${sides.length}`}
            </span>
            <button type="button" className="btn btn-ghost" disabled={start + step > last} onClick={() => setAt(start + step)}>
              Next ›
            </button>
          </div>
          <div className="cta-row">
            <button type="button" className="link-btn" onClick={() => setStage('closed')}>
              Close the book
            </button>
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                localStorage.removeItem(SEEN_KEY)
                setStage('film')
              }}
            >
              Watch it open again
            </button>
          </div>
        </section>
      ) : null}
    </main>
  )
}
