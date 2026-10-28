import { createContext } from 'react'
import type { SessionUser } from './api'

export interface SessionContextValue {
  accessToken: string | null
  accessTokenExpiresAt: number | null
  user: SessionUser | null
  isLoading: boolean
  sessionError: string | null
  signIn: (email: string, password: string) => Promise<void>
  register: (
    kind: 'candidate' | 'employer',
    values: Record<string, string | boolean>,
  ) => Promise<void>
  signOut: () => Promise<void>
}

export const SessionContext = createContext<SessionContextValue | null>(null)
