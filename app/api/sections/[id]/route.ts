import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ message: 'Coming soon: Single section endpoint' }, { status: 501 })
}
