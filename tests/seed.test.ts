import { test } from 'node:test'
import assert from 'node:assert/strict'
import { openLocal } from '../server/database'
import { migrate } from '../server/migrate'
import { employees, seed } from '../server/seed-data'
test('fixed seed produces exactly 10,000 stable IDs and balanced countries', () => {
  const rows = employees()
  assert.equal(rows.length, 10_000)
  assert.equal(new Set(rows.map((r) => r.id)).size, 10_000)
  assert.deepEqual(rows, employees())
  for (const c of ['INR', 'USD', 'GBP', 'EUR']) assert.equal(rows.filter((r) => r.currency === c).length, 2500)
  assert.equal(rows[0].id, 'EMP-00001')
  assert.equal(rows.at(-1)?.id, 'EMP-10000')
})
test('two seed runs preserve exact row count and a salary edit', async () => {
  const db = openLocal(':memory:')
  try {
    migrate(db.db)
    await seed(db.sql)
    await db.sql.run('UPDATE employees SET salary_minor=123456789,revision=1 WHERE id=?', ['EMP-00001'])
    await seed(db.sql)
    assert.deepEqual(await db.sql.all('SELECT COUNT(*) AS count FROM employees'), [{ count: 10000 }])
    assert.deepEqual(await db.sql.all('SELECT salary_minor,revision FROM employees WHERE id=?', ['EMP-00001']), [
      { salary_minor: 123456789, revision: 1 },
    ])
  } finally {
    db.close()
  }
})
