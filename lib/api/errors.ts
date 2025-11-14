import { NextResponse } from "next/server"

/** ------------------------------------------------------------------
 * Custom error classes
 * ------------------------------------------------------------------ */

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = new.target.name
    this.status = status
  }
}

export class AuthError extends ApiError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

export class NotFoundError extends ApiError {
  constructor(message = 'Resource not found') {
    super(message, 404)
  }
}

export class BadRequestError extends ApiError {
  constructor(message = 'Bad request') {
    super(message, 400)
  }
}

/** ------------------------------------------------------------------
 * Centralized handler
 * ------------------------------------------------------------------ */

export function handleApiError(error: unknown, context: string) {
  console.error(context, error)

  if (error instanceof ApiError) {
    return NextResponse.json({error: error.message}, {status: error.status})
  }

  const message = process.env.NODE_ENV === 'development' && error instanceof Error
    ? error.message
    : 'Internal server error'
  return NextResponse.json({ error: message }, { status: 500 })
}