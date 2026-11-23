import { test } from 'node:test'
import assert from 'node:assert/strict'
import { openLocal } from '../server/database'
import { migrate } from '../server/migrate'
import { createEmployee, deleteEmployee, getEmployee, updateEmployee, updateSalary } from '../server/employees'
import { importCsvRequest as importEmployees } from '../server/imports'
import { usdMinor } from '../server/profile'
import { SEED_SQL } from '../server/seed-data'

test('USD display rates match the fictional 15 Nov 2026 table', () => {
  assert.equal(usdMinor(320_000_000, 'INR'), 3_840_000)
  assert.equal(usdMinor(92_000_00, 'EUR'), 99_360_00)
  assert.equal(usdMinor(64_000_00, 'GBP'), 81_280_00)
  assert.equal(usdMinor(118_000_00, 'USD'), 118_000_00)
})

test('employee detail keeps salary history and a saved raise', async () => {
  const db = openLocal(':memory:')
  try {
    migrate(db.db)
    await db.sql.batch(SEED_SQL, [['EMP-00001', 'Priya Sharma', 'Engineering', 'India', 'INR', 10_000_000, 0]])
    const detail = await getEmployee(db.sql, 'EMP-00001')
    assert.equal(detail.history.at(-1)?.salary_minor, 10_000_000)
    assert.equal(detail.history[0].reason, 'Hire')
    assert.equal(detail.job_title.length > 0, true)
    const saved = await updateSalary(db.sql, 'EMP-00001', { salary: '110000.00', revision: 0 })
    assert.equal(saved.usd_minor, usdMinor(11_000_000, 'INR'))
    const next = await getEmployee(db.sql, 'EMP-00001')
    assert.equal(next.history.at(-1)?.reason, 'Salary update')
    assert.equal(next.history.at(-1)?.salary_minor, 11_000_000)
    const inactive = await updateEmployee(db.sql, 'EMP-00001', { status: 'Inactive', revision: saved.revision })
    assert.equal(inactive.status, 'Inactive')
  } finally {
    db.close()
  }
})

test('legacy CSV endpoint accepts small files and rejects an oversized directory', async () => {
  const db = openLocal(':memory:')
  try {
    migrate(db.db)
    const header = 'name,job title,department,country,level,salary'
    const row = 'Alex Gupta,Software Engineer,Engineering,India,L2,100000'
    const over = [header, ...Array.from({ length: 10_001 }, () => row)].join('\n')
    await assert.rejects(() => importEmployees(db.sql, over), {
      message: 'Import up to 10,000 employees at a time.',
    })
    const batch = [
      header,
      ...Array.from({ length: 2 }, (_, index) => `Person ${index},Software Engineer,Engineering,India,L2,100000`),
    ].join('\n')
    const saved = await importEmployees(db.sql, batch)
    assert.equal(saved.created, 2)
    assert.equal(saved.errors.length, 0)
  } finally {
    db.close()
  }
})

test('removing an employee deletes the record and salary history', async () => {
  const db = openLocal(':memory:')
  try {
    migrate(db.db)
    const row = await createEmployee(db.sql, {
      name: 'Alex Gupta',
      jobTitle: 'Software Engineer',
      department: 'Engineering',
      country: 'India',
      level: 'L2',
      salary: '100000',
    })
    const removed = await deleteEmployee(db.sql, row.id)
    assert.equal(removed.id, row.id)
    assert.equal(removed.name, 'Alex Gupta')
    await assert.rejects(() => getEmployee(db.sql, row.id), { status: 404 })
    assert.deepEqual(await db.sql.all('SELECT COUNT(*) AS count FROM salary_history WHERE employee_id = ?', [row.id]), [
      { count: 0 },
    ])
    await assert.rejects(() => deleteEmployee(db.sql, 'EMP-99999'), { status: 404 })
  } finally {
    db.close()
  }
})

test('adding an employee keeps the currency tied to the country', async () => {
  const db = openLocal(':memory:')
  try {
    migrate(db.db)
    const row = await createEmployee(db.sql, {
      name: 'Alex Gupta',
      jobTitle: 'Software Engineer',
      department: 'Engineering',
      country: 'India',
      level: 'L4',
      salary: '1200000',
    })
    assert.equal(row.id, 'EMP-10001')
    assert.equal(row.currency, 'INR')
    assert.equal(row.salary_minor, 120_000_000)
    await assert.rejects(
      () =>
        createEmployee(db.sql, {
          name: 'Alex Gupta',
          jobTitle: 'Software Engineer',
          department: 'Engineering',
          country: 'India',
          level: 'L9',
          salary: '1000',
        }),
      { status: 400 },
    )
  } finally {
    db.close()
  }
})
