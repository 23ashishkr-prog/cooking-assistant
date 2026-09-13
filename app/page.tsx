import { CookingAssistantApp } from '@/components/cooking-assistant-app'
import { createAdminClient, type Recipe } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

async function getRecipes(): Promise<Recipe[]> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('recipes')
      .select(`
        id, name, title, description, image_url, meal_type, category, cuisine, diet_type,
        prep_time_minutes, prep_time, cook_time_minutes, cook_time, total_time_minutes,
        default_servings, servings, difficulty, calories, nutrition_score, tips, ingredients, instructions
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('[Supabase Page] Recipe query failed:', error.message)
      return []
    }

    return (data || []).map((r: any) => ({
      ...r,
      name: r.name || r.title || 'Curated Dish',
      title: r.title || r.name || 'Curated Dish',
      meal_type: (r.meal_type || r.category || 'dinner').toLowerCase(),
      category: r.category || 'Dinner',
      prep_time: r.prep_time_minutes || r.prep_time || 15,
      cook_time: r.cook_time_minutes || r.cook_time || 20,
      total_time: r.total_time_minutes || (r.prep_time_minutes || 15) + (r.cook_time_minutes || 20),
      servings: r.default_servings || r.servings || 4,
    }))
  } catch (err: any) {
    console.error('[Supabase Page] Recipe fetch exception:', err?.message)
    return []
  }
}

export default async function Page() {
  const recipes = await getRecipes()

  return <CookingAssistantApp initialRecipes={recipes} />
}
