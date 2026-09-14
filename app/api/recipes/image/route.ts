import { NextRequest, NextResponse } from 'next/server'
import { generateAndStoreRecipeImage } from '@/lib/recipe-image-generation'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { recipeId, force = false } = await req.json()
    if (!recipeId) return NextResponse.json({ error: 'recipeId is required' }, { status: 400 })
    const imageUrl = await generateAndStoreRecipeImage(String(recipeId), Boolean(force))
    return NextResponse.json({ imageUrl })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Could not generate recipe image' }, { status: 500 })
  }
}
