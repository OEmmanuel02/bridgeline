import type { UserRole } from '@prisma/client'

export interface AuthenticatedUser {
  id: string
  role: UserRole
}

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthenticatedUser
    }
  }
}
