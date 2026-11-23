import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createClient } from '@libsql/client'
import { migrateTurso } from '../scripts/migrate-turso'
import { tursoSql } from '../server/turso'
import { createEmployee, getEmployee, summarize, updateSalary } from '../server/employees'
import { importBatch } from '../server/imports'
import { seed, seedCounts } from '../server/seed-data'

test('Turso migrations and adapter preserve the seeded workflow, reports and atomic import retries', async () => {
  const client = createClient({ url: ':memory:' })
  const sql = tursoSql(client)
  try {
    await migrateTurso(client)
    await migrateTurso(client)
    await seed(sql)
    await seed(sql)
    assert.deepEqual(await seedCounts(sql), { fixtures: 10000, additional: 0 })
    const filters = { q: '', country: 'India', department: 'Engineering', level: '', status: '' }
    const [before] = await summarize(sql, filters)
    const employee = await getEmployee(sql, 'EMP-00001')
    const salary = ((employee.salary_minor + 1000000) / 100).toFixed(2)
    await updateSalary(sql, employee.id, { salary, revision: employee.revision })
    assert.equal((await summarize(sql, filters))[0].totalMinor - before.totalMinor, 1000000)
    await assert.rejects(updateSalary(sql, employee.id, { salary, revision: employee.revision }), { status: 409 })
    const row = {
      name: 'Test',
      jobTitle: 'Engineer',
      department: 'Engineering',
      country: 'India',
      level: 'L2',
      salary: '1000',
    }
    const batch = { fileId: 'd'.repeat(64), offset: 0, rows: [row] }
    await importBatch(sql, batch)
    await importBatch(sql, batch)
    assert.deepEqual(await seedCounts(sql), { fixtures: 10000, additional: 1 })
    await assert.rejects(
      sql.transaction([
        { query: "UPDATE employees SET salary_minor=1 WHERE id='EMP-00001'", values: [] },
        { query: 'INSERT INTO missing_table VALUES (1)', values: [] },
      ]),
    )
    assert.equal((await getEmployee(sql, employee.id)).salary_minor, employee.salary_minor + 1000000)
    assert.equal((await createEmployee(sql, row)).id, 'EMP-10002')
  } finally {
    client.close()
  }
})
