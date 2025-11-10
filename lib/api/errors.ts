import { NextResponse } from "next/server"

export class AuthError extends Error {
  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'AuthError';
  }
}

export function handleApiError(error: unknown, context: string) {
  console.error(context, error)

  if (error instanceof AuthError) {
    return NextResponse.json({error: error.message}, {status: 401})
  }
  
  const message = process.env.NODE_ENV === 'development' && error instanceof Error
    ? error.message
    : 'Internal server error'
  return NextResponse.json({ error: message }, { status: 500 })
}