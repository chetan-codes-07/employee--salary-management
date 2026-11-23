import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { Router, type Request, type CookieOptions } from 'express'
import type { Sql } from './database'

export interface AuthConfig {
  HR_EMAIL?: string
  HR_PASSWORD?: string
  hosted?: boolean
}

const lifetime = 8 * 60 * 60 * 1000
const attemptWindow = 15 * 60 * 1000
const cookieName = 'acme_hr_session'
const hash = (value: string) => createHash('sha256').update(value).digest()

function minimumPasswordLength(config: AuthConfig) {
  return config.hosted || process.env.NODE_ENV === 'production' ? 16 : 1
}

function authConfigured(config: AuthConfig) {
  return Boolean(
    config.HR_EMAIL &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.HR_EMAIL.trim()) &&
    config.HR_PASSWORD &&
    config.HR_PASSWORD.length >= minimumPasswordLength(config),
  )
}

export function requireAuthConfig(config: AuthConfig) {
  if (!authConfigured(config))
    throw new Error(
      `Configure HR_EMAIL and HR_PASSWORD of at least ${minimumPasswordLength(config)} characters before starting the service.`,
    )
}

export function authRouter(db: Sql, config: AuthConfig = {}) {
  const router = Router()
  const email = config.HR_EMAIL?.trim().toLowerCase()
  const password = config.HR_PASSWORD
  const configured = authConfigured(config)
  const cookie: CookieOptions = {
    httpOnly: true,
    sameSite: 'strict',
    secure: !!config.hosted || process.env.NODE_ENV === 'production',
    path: '/',
  }
  // Rotation of either account setting also invalidates existing sessions.
  const digest = (token: string) =>
    createHmac('sha256', password!)
      .update(email! + ':' + token)
      .digest('hex')
  function tokenFrom(req: Request) {
    return req
      .get('cookie')
      ?.split(';')
      .map((s) => s.trim())
      .find((s) => s.startsWith(cookieName + '='))
      ?.slice(cookieName.length + 1)
  }
  async function valid(req: Request) {
    const token = tokenFrom(req)
    if (!configured || !token || !/^[a-f0-9]{64}$/.test(token)) return false
    const rows = await db.all('SELECT 1 FROM hr_sessions WHERE digest=? AND expires_at>?', [digest(token), Date.now()])
    return rows.length > 0
  }

  router.get('/auth/session', async (req, res) => {
    res.json({ authenticated: await valid(req) })
  })
  router.post('/auth/login', async (req, res) => {
    if (!configured) {
      res.status(503).json({ error: 'Sign-in is not configured. Contact the workspace administrator.' })
      return
    }
    const address = config.hosted ? req.get('cf-connecting-ip') : req.socket.remoteAddress
    const client = hash(address || 'unknown').toString('hex')
    const now = Date.now()
    await db.run('DELETE FROM login_attempts WHERE expires_at<=?', [now])
    const attempts = await db.all<{ attempts: number }>(
      'INSERT INTO login_attempts(client,attempts,expires_at) VALUES (?,1,?) ON CONFLICT(client) DO UPDATE SET attempts=attempts+1 WHERE attempts<10 RETURNING attempts',
      [client, now + attemptWindow],
    )
    if (!attempts.length) {
      res.status(429).json({ error: 'Too many sign-in attempts. Try again in 15 minutes.' })
      return
    }
    const enteredPassword = typeof req.body?.password === 'string' ? req.body.password : ''
    const correct = timingSafeEqual(hash(enteredPassword), hash(password!))
    if (!correct || typeof req.body?.email !== 'string' || req.body.email.trim().toLowerCase() !== email) {
      res.status(401).json({ error: 'Email or password is incorrect.' })
      return
    }
    await db.run('DELETE FROM login_attempts WHERE client=?', [client])
    await db.run('DELETE FROM hr_sessions WHERE expires_at<=?', [now])
    const token = randomBytes(32).toString('hex')
    await db.run('INSERT INTO hr_sessions(digest,expires_at) VALUES (?,?)', [digest(token), now + lifetime])
    res.cookie(cookieName, token, { ...cookie, maxAge: lifetime }).json({ authenticated: true })
  })
  router.post('/auth/logout', async (req, res) => {
    const token = tokenFrom(req)
    if (configured && token) await db.run('DELETE FROM hr_sessions WHERE digest=?', [digest(token)])
    res.clearCookie(cookieName, cookie).sendStatus(204)
  })
  router.use(async (req, res, next) => {
    if (await valid(req)) {
      next()
      return
    }
    res.status(401).json({ error: 'Sign in to access this workspace.' })
  })
  return router
}
