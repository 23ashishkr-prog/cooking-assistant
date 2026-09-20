import { NextRequest, NextResponse } from 'next/server'
import { generateAndStoreRecipeImage } from '@/lib/recipe-image-generation'
import { createAdminClient } from '@/lib/supabase/server'
import { imageRepairTargets, isRecipeImage } from '@/lib/recipe-image-policy'

export const maxDuration = 60

export async function GET(req: NextRequest) {
  const recipeId = req.nextUrl.searchParams.get('recipeId')
  if (!recipeId) return NextResponse.json({ error: 'recipeId is required' }, { status: 400 })

  try {
    const supabase = createAdminClient()
    const { data: recipe } = await supabase
      .from('recipes')
      .select('image_url')
      .eq('id', recipeId)
      .single()
    const currentUrl = recipe?.image_url || ''

    if (isRecipeImage(currentUrl)) {
      return NextResponse.redirect(new URL(currentUrl, req.url), 307)
    }

    return NextResponse.json({ error: 'Recipe image is not available' }, { status: 404 })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Could not generate recipe image' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const secret = process.env.RECIPE_IMAGE_REPAIR_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { recipeId, force = false, repairNext = false } = await req.json()
    if (repairNext) {
      const supabase = createAdminClient()
      const { data: recipes, error } = await supabase.from('recipes').select('id, image_url').order('id')
      if (error) throw error
      const target = imageRepairTargets(recipes || [])[0]
      if (!target) return NextResponse.json({ complete: true })
      const imageUrl = await generateAndStoreRecipeImage(String(target.id), true)
      return NextResponse.json({ complete: false, repairedRecipeId: target.id, imageUrl })
    }
    if (!recipeId) return NextResponse.json({ error: 'recipeId is required' }, { status: 400 })
    const imageUrl = await generateAndStoreRecipeImage(String(recipeId), Boolean(force))
    return NextResponse.json({ imageUrl })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Could not generate recipe image' }, { status: 500 })
  }
}
