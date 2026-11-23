import { useEffect, useState, type FormEvent } from 'react'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { App } from './App'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

type Session = 'checking' | 'signed-in' | 'signed-out' | 'unavailable'

export function AuthGate() {
  const [session, setSession] = useState<Session>('checking')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/auth/session', { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error()
        const data = (await response.json()) as { authenticated: boolean }
        if (!controller.signal.aborted) setSession(data.authenticated ? 'signed-in' : 'signed-out')
      })
      .catch(() => {
        if (!controller.signal.aborted) setSession('unavailable')
      })
    function expired() {
      setShowPassword(false)
      setSession('signed-out')
      setError('Your session ended. Sign in again.')
    }
    window.addEventListener('session-ended', expired)
    return () => {
      controller.abort()
      window.removeEventListener('session-ended', expired)
    }
  }, [attempt])

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.get('email'), password: data.get('password') }),
      })
      const payload = (await response.json()) as { authenticated?: boolean; error?: string }
      if (!response.ok || !payload.authenticated) throw new Error(payload.error || 'Unable to sign in.')
      setShowPassword(false)
      setSession('signed-in')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in. Try again.')
    } finally {
      setBusy(false)
    }
  }

  async function signOut() {
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' })
      if (!response.ok) throw new Error()
      setShowPassword(false)
      setSession('signed-out')
    } catch {
      setError('Could not sign out. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (session === 'signed-in') return <App onSignOut={signOut} signingOut={busy} signOutError={error} />
  return (
    <main className="grid min-h-svh place-items-center bg-muted/40 p-5">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardDescription>ACME · People Operations</CardDescription>
          <CardTitle>
            <h1 className="text-2xl">Sign in to Compensation</h1>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {session === 'checking' && <p role="status">Checking your session…</p>}
          {session === 'unavailable' && (
            <div className="grid gap-4">
              <p role="alert">The workspace is unavailable.</p>
              <Button
                onClick={() => {
                  setSession('checking')
                  setAttempt((n) => n + 1)
                }}
              >
                Try again
              </Button>
            </div>
          )}
          {session === 'signed-out' && (
            <form onSubmit={signIn}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="hr-email">Email address</FieldLabel>
                  <Input
                    id="hr-email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    required
                    autoCapitalize="none"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="hr-password">Password</FieldLabel>
                  <div className="relative">
                    <Input
                      id="hr-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      className="h-11 pr-12"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute inset-y-0 right-0 h-11 w-11"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-controls="hr-password"
                      onClick={() => setShowPassword((shown) => !shown)}
                    >
                      {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                    </Button>
                  </div>
                </Field>
                {error && (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                )}
                <Button type="submit" disabled={busy}>
                  <LogIn data-icon="inline-start" />
                  {busy ? 'Signing in…' : 'Sign in'}
                </Button>
              </FieldGroup>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
