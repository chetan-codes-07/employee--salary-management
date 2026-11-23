import assert from 'node:assert/strict'
import { test } from 'node:test'
import { once } from 'node:events'
import type { AddressInfo } from 'node:net'
import { createApp } from '../server/app'
import { openLocal } from '../server/database'
import { migrate } from '../server/migrate'

test('private API requires a live HR session and rejects expired or revoked cookies', async () => {
  const local = openLocal(':memory:')
  migrate(local.db)
  const credentials = { email: 'tester@example.test', password: 'test-only-password-123' }
  const server = createApp(local.sql, {
    auth: { HR_EMAIL: credentials.email, HR_PASSWORD: credentials.password },
  }).listen(0, '127.0.0.1')
  try {
    await once(server, 'listening')
    const base = 'http://127.0.0.1:' + (server.address() as AddressInfo).port
    const login = (password: string) =>
      fetch(base + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...credentials, password }),
      })
    for (const path of ['options', 'summary', 'employees', 'employees/export', 'charts'])
      assert.equal((await fetch(base + '/api/' + path)).status, 401)
    assert.equal((await fetch(base + '/api/employees/EMP-00001', { method: 'DELETE' })).status, 401)
    assert.equal((await login('incorrect')).status, 401)
    const response = await login(credentials.password)
    assert.equal(response.status, 200)
    const header = response.headers.get('set-cookie')!
    assert.match(header, /HttpOnly/i)
    assert.match(header, /SameSite=Strict/i)
    const issued = header.split(';')[0]
    const options = (cookie: string) => fetch(base + '/api/options', { headers: { cookie } })
    assert.equal((await options(issued)).status, 200)
    const logout = await fetch(base + '/api/auth/logout', { method: 'POST', headers: { cookie: issued } })
    assert.equal(logout.status, 204)
    assert.equal((await options(issued)).status, 401)
    const second = (await login(credentials.password)).headers.get('set-cookie')!.split(';')[0]
    await local.sql.run('UPDATE hr_sessions SET expires_at=0')
    assert.equal((await options(second)).status, 401)
    assert.equal((await fetch(base + '/api/admin/seed', { method: 'POST', headers: { cookie: second } })).status, 401)
    for (let i = 0; i < 10; i++) assert.equal((await login('wrong')).status, 401)
    assert.equal((await login(credentials.password)).status, 429)
  } finally {
    server.closeAllConnections()
    server.close()
    local.close()
  }
})
