import { useId, useState } from 'react'

/** Small "i" button that shows a one-line explanation under the field (owner, 19 Nov). */
export function InfoTip({ text, label = 'More about this' }: { text: string; label?: string }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <>
      <button
        type="button"
        className="info-tip-btn"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen((v) => !v)
        }}
      >
        i
      </button>
      {open ? (
        <span id={id} className="info-tip-text" role="note">
          {text}
        </span>
      ) : null}
    </>
  )
}
