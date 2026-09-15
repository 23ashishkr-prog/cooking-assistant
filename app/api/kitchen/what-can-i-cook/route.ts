import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { userId = 'default_user' } = await req.json()
    const { data: inventory, error: inventoryError } = await supabase.from('kitchen_inventory').select('ingredient_name').eq('user_id', userId)
    if (inventoryError) return NextResponse.json({ error: inventoryError.message }, { status: 500 })
    if (!inventory?.length) return NextResponse.json({ empty: true, message: 'Add or scan kitchen items to find recipe matches.', suggestions: [] })

    const { data: matches, error: matchError } = await supabase.rpc('recipe_matches_for_user', { p_user_id: userId, p_min_match: 0.8 })
    if (matchError) return NextResponse.json({ error: matchError.message }, { status: 500 })
    const recipeIds = (matches || []).slice(0, 12).map((match: any) => match.recipe_id)
    const { data: recipes, error: recipeError } = recipeIds.length
      ? await supabase.from('recipes').select('id, total_time_minutes').in('id', recipeIds)
      : { data: [], error: null }
    if (recipeError) return NextResponse.json({ error: recipeError.message }, { status: 500 })
    const recipeById = new Map((recipes || []).map((recipe: any) => [recipe.id, recipe]))

    const suggestions = (matches || []).slice(0, 12).map((match: any) => ({
      recipe_id: match.recipe_id,
      title: match.recipe_name,
      image_url: match.image_url,
      meal_type: match.meal_type,
      time_minutes: (recipeById.get(match.recipe_id) as any)?.total_time_minutes || 35,
      match_percent: Math.round(Number(match.match_ratio) * 100),
      reason: `${Math.round(Number(match.match_ratio) * 100)}% of required ingredients are in your kitchen.`,
      used_ingredients_count: Number(match.matched_count),
      required_ingredients_count: Number(match.required_count),
      missing_items: match.missing_ingredients || [],
    }))
    return NextResponse.json({ availableIngredients: inventory.map((item) => item.ingredient_name), minimumMatchPercent: 80, suggestions })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Could not match kitchen recipes.' }, { status: 500 })
  }
}
