import { build } from 'esbuild'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { applyAuthorCredit } from '../server/author-credit'

const indexPath = 'dist/client/index.html'
writeFileSync(indexPath, applyAuthorCredit(readFileSync(indexPath, 'utf8')))

mkdirSync('api', { recursive: true })
await build({
  entryPoints: ['server/vercel-api.ts'],
  outfile: 'api/index.js',
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  packages: 'external',
  logLevel: 'info',
})
