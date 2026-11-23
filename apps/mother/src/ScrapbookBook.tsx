import { useEffect, useMemo, useState } from 'react'
import { fetchBook, fetchMyChildren } from './lib/cloud'
import { entriesFor, KIND_ICON, paginate, scrapKind, TABS, type BookEntry } from './lib/scrapbook'
import { supabase } from './lib/supabase'

/** The scrapbook book (spec ai-haggling R2): every page ever, in its own tab. */
const COVER_SRC = '/art/scrapbook-cover.jpeg'
const PER_PAGE = 6

export default function ScrapbookBook() {
  const params = new URLSearchParams(window.location.search)
  const [childId, setChildId] = useState(params.get('h') ?? '')
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  const [kids, setKids] = useState<{ id: string; name: string; departed_at: string | null }[]>([])
  const [book, setBook] = useState<Awaited<ReturnType<typeof fetchBook>> | null>(null)
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('all')
  const [page, setPage] = useState(0)
  const [coverArt, setCoverArt] = useState(true)

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
  const pages = paginate(list, PER_PAGE)
  const current = pages[Math.min(page, pages.length - 1)] ?? []
  const name = book?.child?.name ?? 'your Haggling'

  if (signedIn === false) {
    return (
      <main className="book-page">
        <p className="care-sub">
          The scrapbook is private. Open <a href="/">Haggis-gotchi</a> on this device and sign in, then come back.
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
              setPage(0)
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

      {!open ? (
        <button type="button" className="book-cover" onClick={() => setOpen(true)} aria-label={`Open ${name}'s scrapbook`}>
          {coverArt ? <img src={COVER_SRC} alt="" onError={() => setCoverArt(false)} /> : null}
          <span className="book-cover-title">
            <span className="book-cover-kicker">The Scrapbook of</span>
            <span className="book-cover-name">{name}</span>
            <span className="book-cover-hint">{book ? `${book.entries.length} pages · tap to open` : 'Fetching the pages…'}</span>
          </span>
        </button>
      ) : (
        <section className="book-open" aria-label={`${name}'s scrapbook`}>
          <nav className="book-tabs" aria-label="Scrapbook sections">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`book-tab${t.id === tab ? ' book-tab-on' : ''}`}
                onClick={() => {
                  setTab(t.id)
                  setPage(0)
                }}
                aria-pressed={t.id === tab}
              >
                {t.label}
              </button>
            ))}
          </nav>
          <div className="book-leaf">
            <h1 className="book-leaf-title">
              {name}
              <span>{TABS.find((t) => t.id === tab)?.label}</span>
            </h1>
            {current.length === 0 ? (
              <p className="book-empty">Nothing on these pages yet.</p>
            ) : (
              <ul className="book-entries">
                {current.map((e: BookEntry) => {
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
            <div className="book-turn">
              <button type="button" className="btn btn-ghost" disabled={page <= 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                ‹ Back
              </button>
              <span className="care-sub">
                Page {Math.min(page, pages.length - 1) + 1} of {pages.length}
              </span>
              <button type="button" className="btn btn-ghost" disabled={page >= pages.length - 1} onClick={() => setPage((p) => Math.min(pages.length - 1, p + 1))}>
                Next ›
              </button>
            </div>
          </div>
          <button type="button" className="link-btn" onClick={() => setOpen(false)}>
            Close the book
          </button>
        </section>
      )}
    </main>
  )
}
