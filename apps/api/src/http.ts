import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { config } from './config.js'

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

export function asyncRoute(
  handler: (request: Request, response: Response) => Promise<void>,
) {
  return (request: Request, response: Response, next: NextFunction) => {
    void handler(request, response).catch(next)
  }
}

export function errorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    error.type === 'entity.parse.failed'
  ) {
    response.status(400).json({
      error: { code: 'INVALID_JSON', message: 'The request body must be valid JSON.' },
    })
    return
  }

  if (error instanceof ZodError) {
    response.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Check the submitted fields and try again.',
        details: error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      },
    })
    return
  }

  if (error instanceof HttpError) {
    response.status(error.status).json({
      error: { code: error.code, message: error.message },
    })
    return
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  ) {
    response.status(409).json({
      error: {
        code: 'CONFLICT',
        message: 'This account could not be created with the details provided.',
      },
    })
    return
  }

  console.error('Unhandled API error', {
    name: error instanceof Error ? error.name : 'UnknownError',
    message:
      config.NODE_ENV === 'production'
        ? 'An internal error occurred.'
        : error instanceof Error
          ? error.message
          : 'An internal error occurred.',
  })
  response.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
  })
}
