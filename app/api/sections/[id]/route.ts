import { NextRequest, NextResponse } from 'next/server'
import { SectionsService } from '@/lib/api/sections/service'
import { UpdateSectionSchema, SectionIdSchema } from '@/lib/validation/section'
import { handleApiError } from '@/lib/api/errors'
import { requireAuth } from '@/lib/api/auth'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const {supabase} = await requireAuth()

    const { id } = await context.params

    const validationResult = SectionIdSchema.safeParse({ id })
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid section ID', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const sectionsService = new SectionsService(supabase)
    const section = await sectionsService.getSectionById(id)

    if (!section) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 })
    }

    return NextResponse.json({ section })
  } catch (error) {
    return handleApiError(error, '[GET /api/sections/[id]]:')
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const {supabase} = await requireAuth()

    const { id } = await context.params
    const body = await request.json()

    const idValidation = SectionIdSchema.safeParse({ id })
    if (!idValidation.success) {
      return NextResponse.json(
        { error: 'Invalid section ID', details: idValidation.error.issues },
        { status: 400 }
      )
    }

    const bodyValidation = UpdateSectionSchema.safeParse(body)
    if (!bodyValidation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: bodyValidation.error.issues,
        },
        { status: 400 }
      )
    }

    const sectionsService = new SectionsService(supabase)
    const section = await sectionsService.updateSection(id, bodyValidation.data)

    return NextResponse.json({ section })
  } catch (error) {
    return handleApiError(error, '[PATCH /api/sections/[id]]:')
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const {supabase} = await requireAuth()

    const { id } = await context.params

    const validationResult = SectionIdSchema.safeParse({ id })
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid section ID', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const sectionsService = new SectionsService(supabase)
    await sectionsService.deleteSection(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, '[DELETE /api/sections/[id]]:')
  }
}