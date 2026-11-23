import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
export type Value = string | number | null
export type Statement = { query: string; values: Value[] }
export interface Sql {
  transaction(statements: Statement[]): Promise<void>
  all<T>(sql: string, values?: Value[]): Promise<T[]>
  run(sql: string, values?: Value[]): Promise<number>
  batch(sql: string, values: Value[][]): Promise<void>
}
export function openLocal(path = process.env.DATABASE_PATH || '.data/acme.sqlite') {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
  const db = new Database(path)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  const sql: Sql = {
    async all<T>(query: string, values: Value[] = []) {
      return db.prepare(query).all(...values) as T[]
    },
    async run(query, values = []) {
      return db.prepare(query).run(...values).changes
    },
    async transaction(statements) {
      db.transaction(() => {
        for (const { query, values } of statements) db.prepare(query).run(...values)
      })()
    },
    async batch(query, rows) {
      const insert = db.prepare(query)
      db.transaction(() => {
        for (const row of rows) insert.run(...row)
      })()
    },
  }
  return { sql, close: () => db.close(), db }
}
