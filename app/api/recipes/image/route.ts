import { NextRequest, NextResponse } from 'next/server'
import { generateAndStoreRecipeImage } from '@/lib/recipe-image-generation'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { recipeId, force = false, repairNext = false } = await req.json()
    if (repairNext) {
      const { createAdminClient } = await import('@/lib/supabase/server')
      const supabase = createAdminClient()
      const { data: recipes, error } = await supabase.from('recipes').select('id, image_url').eq('published', true).order('id')
      if (error) throw error
      const counts = (recipes || []).reduce<Record<string, number>>((result, recipe) => {
        if (recipe.image_url) result[recipe.image_url] = (result[recipe.image_url] || 0) + 1
        return result
      }, {})
      const seen = new Set<string>()
      const target = (recipes || []).find((recipe) => {
        if (!recipe.image_url) return true
        if ((counts[recipe.image_url] || 0) < 2) return false
        if (!seen.has(recipe.image_url)) { seen.add(recipe.image_url); return false }
        return true
      })
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
