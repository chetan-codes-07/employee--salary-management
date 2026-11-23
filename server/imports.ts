import { createHash } from 'node:crypto'
import { csvEmployees, IMPORT_BATCH_SIZE } from '../shared/import-csv'
import type { Sql } from './sql'
import { employeeValues } from './employees'
import { InputError } from './money'

const hash = (text: string) => createHash('sha256').update(text).digest('hex')

// Materialize the starting ID before employee insert triggers advance the sequence.
const insertBatch = `
  WITH start AS MATERIALIZED (SELECT last_issued FROM employee_id_floor)
  INSERT INTO employees (id, name, department, country, currency, salary_minor, job_title, email, level, hired_on)
  SELECT printf('EMP-%05d', start.last_issued + item.key + 1), value->>'name', value->>'department',
         value->>'country', value->>'currency', value->>'minor', value->>'jobTitle', value->>'email',
         value->>'level', date('now')
  FROM start, json_each(?) AS item
  WHERE NOT EXISTS (SELECT 1 FROM import_receipts WHERE batch_key = ?)`

export async function importBatch(db: Sql, body: unknown) {
  if (!body || typeof body !== 'object') throw new InputError('Provide an import batch.')
  const { fileId, offset, rows } = body as Record<string, unknown>
  if (
    typeof fileId !== 'string' ||
    !/^[a-f0-9]{64}$/.test(fileId) ||
    typeof offset !== 'number' ||
    !Number.isInteger(offset) ||
    offset < 0 ||
    offset % IMPORT_BATCH_SIZE !== 0 ||
    !Array.isArray(rows) ||
    !rows.length ||
    rows.length > IMPORT_BATCH_SIZE ||
    offset + rows.length > 10000
  )
    throw new InputError('Invalid import batch or row range.')
  const valid = []
  const errors: { line: number; message: string }[] = []
  for (const [index, employee] of rows.entries()) {
    try {
      valid.push(employeeValues(employee))
    } catch (error) {
      if (!(error instanceof InputError)) throw error
      errors.push({ line: offset + index + 2, message: error.message })
    }
  }
  const key = fileId + ':' + offset
  const digest = hash(JSON.stringify(rows))
  try {
    await db.transaction([
      { query: insertBatch, values: [JSON.stringify(valid), key] },
      {
        query: 'INSERT INTO import_receipts(batch_key, digest) VALUES (?, ?) ON CONFLICT(batch_key) DO NOTHING',
        values: [key, digest],
      },
    ])
  } catch (error) {
    if (error instanceof Error && error.message.includes('employee ID space exhausted'))
      throw new InputError('The employee directory is full.', 409)
    throw error
  }
  const [receipt] = await db.all<{ digest: string }>('SELECT digest FROM import_receipts WHERE batch_key = ?', [key])
  if (receipt.digest !== digest) throw new InputError('This import batch was already used with different data.', 409)
  return { created: valid.length, errors }
}

// Older callers can still submit a small text/csv body directly.
export async function importCsvRequest(db: Sql, text: string) {
  let rows
  try {
    rows = csvEmployees(text)
  } catch (error) {
    throw new InputError(error instanceof Error ? error.message : 'Invalid CSV file.')
  }
  if (rows.length > IMPORT_BATCH_SIZE) throw new InputError('Use the directory upload for files over 100 employees.')
  return importBatch(db, { fileId: hash(text), offset: 0, rows })
}
