import { NextRequest, NextResponse } from 'next/server'
import { SectionsService } from '@/lib/api/sections/service'
import { CreateSectionSchema } from '@/lib/validation/section'
import { handleApiError } from '@/lib/api/errors'
import { requireAuth } from '@/lib/api/auth'

export async function GET() {
  try {
    const {supabase} = await requireAuth()

    const sectionsService = new SectionsService(supabase)
    const sections = await sectionsService.getAllSections()

    return NextResponse.json({ sections })
  } catch (error) {
    return handleApiError(error, '[GET /api/sections]:')
  }
}

export async function POST(request: NextRequest) {
  try {
    const {supabase, user} = await requireAuth()
    
    const body = await request.json()

    const validationResult = CreateSectionSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.issues,
        },
        { status: 400 }
      )
    }

    const sectionsService = new SectionsService(supabase)
    const section = await sectionsService.createSection({
      user_id: user.id,
      ...validationResult.data,
    })

    return NextResponse.json({ section }, { status: 201 })
  } catch (error) {
    return handleApiError(error, '[POST /api/sections]:')
  }
}