import { NextRequest, NextResponse } from 'next/server'
import { SectionsService } from '@/lib/api/sections/service'
import { UpdateSectionSchema, SectionIdSchema } from '@/lib/validation/section'
import { BadRequestError, handleApiError, NotFoundError } from '@/lib/api/errors'
import { requireAuth } from '@/lib/api/auth'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const {supabase} = await requireAuth()

    const { id } = await context.params

    const validationResult = SectionIdSchema.safeParse({ id })
    if (!validationResult.success) {
      throw new BadRequestError('Invalid section ID')
    }

    const sectionsService = new SectionsService(supabase)
    const section = await sectionsService.getSectionById(id)

    if (!section) {
      throw new NotFoundError('Section not found')
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
      throw new BadRequestError('Invalid section ID')
    }

    const bodyValidation = UpdateSectionSchema.safeParse(body)
    if (!bodyValidation.success) {
      throw new BadRequestError('Validation failed')
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
      throw new BadRequestError('Invalid section ID')
    }

    const sectionsService = new SectionsService(supabase)
    await sectionsService.deleteSection(id)

    return NextResponse.json({ success: true }, {status: 200})
  } catch (error) {
    return handleApiError(error, '[DELETE /api/sections/[id]]:')
  }
}