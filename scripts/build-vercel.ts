import { readFileSync, writeFileSync } from 'node:fs'
import { applyAuthorCredit } from '../server/author-credit'

const indexPath = 'dist/client/index.html'
writeFileSync(indexPath, applyAuthorCredit(readFileSync(indexPath, 'utf8')))
