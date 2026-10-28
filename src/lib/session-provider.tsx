import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ApiRequestError,
  loginAccount,
  logoutAccount,
  refreshAccount,
  registerAccount,
  type SessionUser,
} from './api'
import { SessionContext } from './session-context'

export function SessionProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [accessTokenExpiresAt, setAccessTokenExpiresAt] = useState<number | null>(null)
  const [user, setUser] = useState<SessionUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sessionError, setSessionError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void refreshAccount()
      .then((session) => {
        if (!active) return
        if (!session) {
          setAccessToken(null)
          setAccessTokenExpiresAt(null)
          setUser(null)
          return
        }
        setAccessToken(session.accessToken)
        setAccessTokenExpiresAt(Date.now() + session.expiresIn * 1000)
        setUser(session.user)
      })
      .catch((error: unknown) => {
        if (!active) return
        setAccessToken(null)
        setAccessTokenExpiresAt(null)
        setUser(null)
        if (!(error instanceof ApiRequestError) || error.status !== 401) {
          setSessionError(
            error instanceof Error
              ? error.message
              : 'The account service could not be reached.',
          )
        }
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!accessToken || accessTokenExpiresAt === null) return
    const refreshIn = Math.max(1000, accessTokenExpiresAt - Date.now() - 30_000)
    const timer = window.setTimeout(() => {
      void refreshAccount()
        .then((session) => {
          if (!session) {
            setAccessToken(null)
            setAccessTokenExpiresAt(null)
            setUser(null)
            setSessionError('Your session expired. Sign in again.')
            return
          }
          setAccessToken(session.accessToken)
          setAccessTokenExpiresAt(Date.now() + session.expiresIn * 1000)
          setUser(session.user)
          setSessionError(null)
        })
        .catch((error: unknown) => {
          setAccessToken(null)
          setAccessTokenExpiresAt(null)
          setUser(null)
          setSessionError(
            error instanceof ApiRequestError && error.status === 401
              ? 'Your session expired. Sign in again.'
              : error instanceof Error
                ? error.message
                : 'The account service could not be reached.',
          )
        })
    }, refreshIn)
    return () => window.clearTimeout(timer)
  }, [accessToken, accessTokenExpiresAt])

  async function signIn(email: string, password: string) {
    setSessionError(null)
    const session = await loginAccount({ email, password })
    setAccessToken(session.accessToken)
    setAccessTokenExpiresAt(Date.now() + session.expiresIn * 1000)
    setUser(session.user)
  }

  async function register(
    kind: 'candidate' | 'employer',
    values: Record<string, string | boolean>,
  ) {
    setSessionError(null)
    const session = await registerAccount(kind, values)
    setAccessToken(session.accessToken)
    setAccessTokenExpiresAt(Date.now() + session.expiresIn * 1000)
    setUser(session.user)
  }

  async function signOut() {
    setSessionError(null)
    try {
      await logoutAccount()
      setAccessToken(null)
      setAccessTokenExpiresAt(null)
      setUser(null)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Sign out could not be completed. Try again.'
      setSessionError(message)
      throw error
    }
  }

  const value = useMemo(
    () => ({
      accessToken,
      accessTokenExpiresAt,
      user,
      isLoading,
      sessionError,
      signIn,
      register,
      signOut,
    }),
    [accessToken, accessTokenExpiresAt, user, isLoading, sessionError],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
