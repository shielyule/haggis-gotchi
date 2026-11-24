/** Material Symbols icon (owner's design, 24 Nov). Decorative: always next to words. Names must be in index.html's icon list. */
export function Icon({ name, className = '' }: { name: string; className?: string }) {
  return (
    <span className={`material-symbols-outlined icon ${className}`.trim()} aria-hidden="true">
      {name}
    </span>
  )
}
