import assert from 'node:assert/strict'
import test from 'node:test'
import { applyAuthorCredit } from '../server/author-credit'

const page = '<!doctype html><html><body><div id="root"></div></body></html>'

test('author credit is injected into HTML', () => {
  const html = applyAuthorCredit(page, false)
  assert.match(html, /acme-author-credit/)
  assert.match(html, /chetangehlot\.com/)
  assert.match(html, /Made by/)
})

test('author credit can be omitted', () => {
  const html = applyAuthorCredit(page, true)
  assert.doesNotMatch(html, /acme-author-credit/)
})
