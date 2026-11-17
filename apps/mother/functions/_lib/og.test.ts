// share-card T3: preview tags
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ogTags } from './og.ts'

test('shows the Haggling when the card is on', () => {
  const t = ogTags({ name: 'Firecracker', temperament_id: 'radge', share_enabled: true }, 'https://haggisgotchi.com/', 'abcdef0123')
  assert.match(t, /og:title" content="Firecracker the Radge Haggling"/)
  assert.match(t, /og:image" content="https:\/\/haggisgotchi.com\/og\/radge.jpg"/)
  assert.match(t, /og:url" content="https:\/\/haggisgotchi.com\/h\/abcdef0123"/)
})

test('switched off or unknown: no name, generic image', () => {
  for (const card of [null, { name: null, temperament_id: null, share_enabled: false }]) {
    const t = ogTags(card, 'https://haggisgotchi.com', 'abcdef0123')
    assert.match(t, /og:title" content="Haggis-gotchi"/)
    assert.match(t, /icon-512.png/)
  }
})

test('names are escaped in the tags', () => {
  const t = ogTags({ name: '"><script>x</script>', temperament_id: 'douce', share_enabled: true }, 'https://haggisgotchi.com', 'abcdef0123')
  assert.ok(!t.includes('<script>'))
})
