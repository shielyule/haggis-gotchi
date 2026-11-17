// public-feed T3
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { feedSentence, timeAgo } from '../src/lib/feed.ts'

const e = (action: string) => ({ carer_name: 'Fred', haggling_name: 'Harry', action, at: '2026-11-17T10:00:00Z' })

test('owner examples', () => {
  assert.equal(feedSentence(e('feed')), 'Fred just fed Harry')
  assert.equal(feedSentence({ ...e('cuddle'), carer_name: 'Sally', haggling_name: 'Twinkle' }), 'Sally just cuddled Twinkle')
  assert.equal(
    feedSentence({ ...e('photo_treat'), carer_name: 'Billy', haggling_name: 'Tigger' }),
    'Billy just shared a Photo Treat with Tigger',
  )
  assert.equal(
    feedSentence({ ...e('photo_treat'), carer_name: 'Billy', haggling_name: 'Tigger', treat_id: 'irn-bru' }),
    'Billy just shared a can of Irn-Bru with Tigger',
  )
  assert.equal(feedSentence(e('walk')), 'Fred just took Harry for a walk')
  assert.equal(feedSentence(e('clean')), 'Fred just cleaned up after Harry')
})

test('time ago', () => {
  const t = Date.parse('2026-11-17T10:00:00Z')
  assert.equal(timeAgo('2026-11-17T10:00:00Z', t + 20_000), 'just now')
  assert.equal(timeAgo('2026-11-17T10:00:00Z', t + 2 * 60_000), '2 min ago')
  assert.equal(timeAgo('2026-11-17T10:00:00Z', t + 61 * 60_000), '1 hour ago')
  assert.equal(timeAgo('2026-11-17T10:00:00Z', t + 5 * 3600_000), '5 hours ago')
})
