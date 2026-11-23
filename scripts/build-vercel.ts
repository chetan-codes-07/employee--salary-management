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
  format: 'esm',
  target: 'node20',
  packages: 'external',
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
  logLevel: 'info',
})
