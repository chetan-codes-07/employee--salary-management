import { createClient, type Client } from '@libsql/client'
import type { Sql, Value } from './sql'

export function tursoSql(client: Client): Sql {
  return {
    async all<T>(sql: string, args: Value[] = []) {
      const result = await client.execute({ sql, args })
      return result.rows as unknown as T[]
    },
    async run(sql, args = []) {
      return (await client.execute({ sql, args })).rowsAffected
    },
    async batch(sql, rows) {
      await client.batch(
        rows.map((args) => ({ sql, args })),
        'write',
      )
    },
    async transaction(statements) {
      await client.batch(
        statements.map(({ query: sql, values: args }) => ({ sql, args })),
        'write',
      )
    },
  }
}

export function openTurso() {
  const url = process.env.TURSO_DATABASE_URL?.trim()
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim()
  if (!url || !/^(libsql|https):\/\//.test(url) || !authToken)
    throw new Error('Configure TURSO_DATABASE_URL and TURSO_AUTH_TOKEN for the hosted database.')
  const client = createClient({ url, authToken })
  return { sql: tursoSql(client), client }
}
