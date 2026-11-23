import { readdirSync,readFileSync } from 'node:fs';
import type Database from 'better-sqlite3';
export function migrate(db:Database.Database) {
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY)');
  for(const name of readdirSync('drizzle').filter(n=>n.endsWith('.sql')).sort()) {
    if(db.prepare('SELECT 1 FROM schema_migrations WHERE name = ?').get(name))continue;
    db.transaction(()=>{db.exec(readFileSync(`drizzle/${name}`,'utf8')); db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run(name);})();
  }
}
