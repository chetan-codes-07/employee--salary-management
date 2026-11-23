import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync, readdirSync } from 'node:fs'
import { openLocal } from '../server/database'
import { migrate } from '../server/migrate'
import { createEmployee, deleteEmployee, getEmployee, updateEmployee, updateSalary } from '../server/employees'
import { importBatch } from '../server/imports'
import { csvEmployees, IMPORT_BATCH_SIZE } from '../shared/import-csv'
import { requireAuthConfig } from '../server/auth'
import { seed, seedCounts } from '../server/seed-data'

const employee = {
  name: 'Ada',
  country: 'India',
  department: 'Engineering',
  jobTitle: 'Engineer',
  salary: '1000',
  level: 'L2',
}
function fixture() {
  const local = openLocal(':memory:')
  migrate(local.db)
  return local
}

test('history failure rolls back the salary, revision and report total; reading a profile performs no writes', async () => {
  const local = fixture()
  try {
    const row = await createEmployee(local.sql, employee)
    local.db.exec(
      `CREATE TRIGGER reject_history BEFORE INSERT ON salary_history BEGIN SELECT raise(ABORT, 'history unavailable'); END;`,
    )
    await assert.rejects(updateSalary(local.sql, row.id, { salary: '11000', revision: 0 }), /history unavailable/)
    local.db.pragma('query_only = ON')
    const detail = await getEmployee(local.sql, row.id)
    assert.deepEqual(
      [detail.salary_minor, detail.revision, detail.history.length, detail.history[0].salary_minor],
      [100000, 0, 1, 100000],
    )
    assert.equal(local.db.prepare('SELECT SUM(salary_minor) AS total FROM employees').pluck().get(), 100000)
  } finally {
    local.close()
  }
})

test('concurrent creations allocate unique IDs and deleting the highest ID never reassigns it', async () => {
  const local = fixture()
  try {
    const rows = await Promise.all(Array.from({ length: 12 }, () => createEmployee(local.sql, employee)))
    assert.equal(new Set(rows.map((row) => row.id)).size, 12)
    await deleteEmployee(local.sql, 'EMP-10012')
    assert.equal((await createEmployee(local.sql, employee)).id, 'EMP-10013')
  } finally {
    local.close()
  }
})

test('stale profile and salary writers cannot overwrite an intervening edit', async () => {
  const local = fixture()
  try {
    const row = await createEmployee(local.sql, employee)
    await updateEmployee(local.sql, row.id, { status: 'Inactive', revision: 0 })
    await assert.rejects(updateEmployee(local.sql, row.id, { email: 'new@example.test', revision: 0 }), { status: 409 })
    await assert.rejects(updateSalary(local.sql, row.id, { salary: '200', revision: 0 }), { status: 409 })
    const detail = await getEmployee(local.sql, row.id)
    assert.deepEqual([detail.email, detail.revision, detail.status], [row.email, 1, 'Inactive'])
  } finally {
    local.close()
  }
})

test('all 10,000 CSV rows import exactly once across bounded requests, even after replay', async () => {
  const local = fixture()
  try {
    const rows = csvEmployees(
      [
        'name,job title,department,country,level,salary',
        ...Array.from({ length: 10000 }, (_, i) => `Person ${i},Engineer,Engineering,India,L2,1000`),
      ].join('\n'),
    )
    const fileId = 'a'.repeat(64)
    for (let offset = 0; offset < rows.length; offset += IMPORT_BATCH_SIZE) {
      const batch = { offset, rows: rows.slice(offset, offset + IMPORT_BATCH_SIZE), fileId }
      assert.deepEqual(await importBatch(local.sql, batch), { created: 100, errors: [] })
      assert.deepEqual(await importBatch(local.sql, batch), { created: 100, errors: [] })
    }
    assert.deepEqual(local.db.prepare('SELECT COUNT(*) AS n, MIN(id) AS first, MAX(id) AS last FROM employees').get(), {
      n: 10000,
      first: 'EMP-10001',
      last: 'EMP-20000',
    })
    assert.equal(local.db.prepare('SELECT COUNT(*) FROM salary_history').pluck().get(), 10000)
    await assert.rejects(importBatch(local.sql, { offset: 0, fileId, rows: [employee] }), { status: 409 })
    await assert.rejects(importBatch(local.sql, { offset: 0, fileId, rows: rows.slice(0, 101) }), { status: 400 })
  } finally {
    local.close()
  }
})

test('a failed import rolls back every row and its receipt and can be retried', async () => {
  const local = fixture()
  try {
    const batch = {
      fileId: 'b'.repeat(64),
      offset: 100,
      rows: [employee, { ...employee, name: 'Grace' }, { ...employee, salary: 'invalid' }],
    }
    local.db.exec(
      `CREATE TRIGGER fail_second BEFORE INSERT ON employees WHEN NEW.name = 'Grace' BEGIN SELECT raise(ABORT,'temporarily unavailable'); END;`,
    )
    await assert.rejects(importBatch(local.sql, batch), /temporarily unavailable/)
    for (const table of ['employees', 'salary_history', 'import_receipts'])
      assert.equal(
        local.db
          .prepare('SELECT count(*) FROM ' + table)
          .pluck()
          .get(),
        0,
      )
    local.db.exec('DROP TRIGGER fail_second')
    const result = await importBatch(local.sql, batch)
    assert.equal(result.created, 2)
    assert.deepEqual(
      result.errors.map((error) => error.line),
      [104],
    )
  } finally {
    local.close()
  }
})

test('seed verification distinguishes all fixture IDs from additional employees', async () => {
  const local = fixture()
  try {
    await createEmployee(local.sql, employee)
    await seed(local.sql)
    assert.deepEqual(await seedCounts(local.sql), { fixtures: 10000, additional: 1 })
    await deleteEmployee(local.sql, 'EMP-00001')
    assert.deepEqual(await seedCounts(local.sql), { fixtures: 9999, additional: 1 })
  } finally {
    local.close()
  }
})

test('startup rejects an unusable account before serving requests', () => {
  for (const config of [
    {},
    { HR_EMAIL: 'broken', HR_PASSWORD: 'a'.repeat(20) },
    { HR_EMAIL: 'hr@example.test', HR_PASSWORD: 'short', hosted: true },
  ])
    assert.throws(() => requireAuthConfig(config), /Configure HR_EMAIL/)
  assert.doesNotThrow(() => requireAuthConfig({ HR_EMAIL: 'hr@example.test', HR_PASSWORD: 'a'.repeat(20) }))
})

test('upgrading a populated directory preserves legacy rows and repairs a missing history baseline at the next raise', async () => {
  const local = openLocal(':memory:')
  try {
    // Model the database a reviewer may already have before the integrity migration.
    local.db.exec('CREATE TABLE schema_migrations (name TEXT PRIMARY KEY)')
    for (const name of readdirSync('drizzle')
      .filter((name) => /^000[0-2]_.*\.sql$/.test(name))
      .sort()) {
      local.db.exec(readFileSync('drizzle/' + name, 'utf8'))
      local.db.prepare('INSERT INTO schema_migrations VALUES (?)').run(name)
    }
    await local.sql.run(
      "INSERT INTO employees(id,name,department,country,currency,salary_minor) VALUES ('EMP-38888','Legacy','Engineering','India','INR',100000)",
    )
    migrate(local.db)
    const original = await getEmployee(local.sql, 'EMP-38888')
    assert.equal(original.history.at(-1)?.salary_minor, 100000)
    assert.equal(local.db.prepare('SELECT COUNT(*) FROM salary_history').pluck().get(), 0)
    await updateSalary(local.sql, original.id, { salary: '1100', revision: 0 })
    assert.deepEqual(
      (await getEmployee(local.sql, original.id)).history.map((e) => e.salary_minor),
      [100000, 110000],
    )
    await deleteEmployee(local.sql, original.id)
    assert.equal((await createEmployee(local.sql, employee)).id, 'EMP-38889')
  } finally {
    local.close()
  }
})

test('short demo passwords work locally while hosted configuration requires sixteen characters', () => {
  assert.doesNotThrow(() => requireAuthConfig({ HR_EMAIL: 'hr@example.test', HR_PASSWORD: 'demo' }))
  assert.throws(
    () => requireAuthConfig({ HR_EMAIL: 'hr@example.test', HR_PASSWORD: 'demo', hosted: true }),
    /16 characters/,
  )
})
