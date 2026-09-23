import { MoakaPlannerApp } from '@/components/moaka-planner-app'
import { createAdminClient, type Recipe } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

async function getRecipes(): Promise<Recipe[]> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('recipes')
      .select('id, name, title, description, image_url, meal_type, category, cuisine, diet_type, prep_time_minutes, prep_time, cook_time_minutes, cook_time, total_time_minutes, default_servings, servings, difficulty, tips, ingredients, instructions')
      .order('created_at', { ascending: false })
      .limit(80)

    if (error) return []
    return (data || []).map((recipe: any) => ({
      ...recipe,
      name: recipe.name || recipe.title || 'Curated Dish',
      title: recipe.title || recipe.name || 'Curated Dish',
      meal_type: (recipe.meal_type || recipe.category || 'dinner').toLowerCase(),
      prep_time: recipe.prep_time_minutes || recipe.prep_time || 15,
      cook_time: recipe.cook_time_minutes || recipe.cook_time || 20,
      total_time: recipe.total_time_minutes || (recipe.prep_time_minutes || 15) + (recipe.cook_time_minutes || 20),
    }))
  } catch {
    return []
  }
}

export default async function Page() {
  return <MoakaPlannerApp initialRecipes={await getRecipes()} />
}
