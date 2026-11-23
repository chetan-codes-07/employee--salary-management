import { readFileSync, readdirSync } from 'node:fs'
import type { Client } from '@libsql/client'

export async function migrateTurso(client: Client) {
  await client.execute('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY)')
  const applied = await client.execute('SELECT name FROM schema_migrations')
  const names = new Set(applied.rows.map((row) => row.name))
  for (const name of readdirSync('drizzle')
    .filter((name) => name.endsWith('.sql'))
    .sort()) {
    if (names.has(name)) continue
    const statements = readFileSync('drizzle/' + name, 'utf8')
      .split('--> statement-breakpoint')
      .map((statement) => statement.trim())
      .filter(Boolean)
    await client.batch(
      [
        ...statements.map((sql) => ({ sql, args: [] })),
        { sql: 'INSERT INTO schema_migrations (name) VALUES (?)', args: [name] },
      ],
      'write',
    )
  }
}
