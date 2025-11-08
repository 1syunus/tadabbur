import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ message: 'Coming soon: Single note endpoint' }, { status: 501 })
}
