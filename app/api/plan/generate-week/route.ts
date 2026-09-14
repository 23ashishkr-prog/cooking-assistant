import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { cuisineMatchesPreference, favoriteIngredientScore, ingredientText, recipeContainsExcludedMeat } from '@/lib/recipe-personalization'

export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { userId = 'default_user', startDate } = await req.json()

    // 1. Fetch user preferences
    const { data: userPref } = await supabase
      .from('user_food_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    // 2. Fetch available recipes in Supabase
    const { data: recipes } = await supabase
      .from('recipes')
      .select('id, name, title, meal_type, category, cuisine, diet_type, prep_time_minutes, cook_time_minutes, total_time_minutes, ingredients')
      .eq('published', true)
      .limit(100)

    const selectedDiet = String(userPref?.diet_type || '').toLowerCase()
    const preferredCuisines = userPref?.cuisines || []
    const blocked = [...(userPref?.allergies || []), ...(userPref?.dislikes || []), ...(userPref?.avoided_ingredients || [])].map((value: string) => value.toLowerCase())
    const eligibleRecipes = (recipes || []).filter((recipe: any) => {
      const dietMatches = !selectedDiet || selectedDiet.includes('flexible') || String(recipe.diet_type || '').toLowerCase() === selectedDiet
      const cuisineMatches = cuisineMatchesPreference(recipe.cuisine, preferredCuisines)
      const timeMatches = !userPref?.max_cook_time || recipe.total_time_minutes <= userPref.max_cook_time
      const safe = !blocked.some((ingredient: string) => ingredientText(recipe).includes(ingredient))
      const allowedMeat = !recipeContainsExcludedMeat(recipe, userPref?.excluded_meats || [])
      return dietMatches && cuisineMatches && timeMatches && safe && allowedMeat
    })
    const favorites = userPref?.favorite_ingredients || []
    const recipePool = [...eligibleRecipes]
      .sort((a, b) => favoriteIngredientScore(b, favorites) - favoriteIngredientScore(a, favorites))
      .map(r => ({
      id: r.id,
      name: r.name || r.title,
      meal_type: (r.meal_type || r.category || 'dinner').toLowerCase(),
      }))

    const baseDate = startDate ? new Date(startDate) : new Date()
    const createdPlans = []

    if (recipePool.length === 0) {
      return NextResponse.json({ error: 'No published recipes are available in Supabase.' }, { status: 503 })
    }

    // Generate 7 days of plans
    for (let i = 0; i < 7; i++) {
      const planDate = new Date(baseDate)
      planDate.setDate(baseDate.getDate() + i)
      const dateStr = planDate.toISOString().split('T')[0]

      const slots = [
        { type: 'breakfast', time: '08:30' },
        { type: 'lunch', time: '13:00' },
        { type: 'high_tea', time: '17:00' },
        { type: 'dinner', time: '20:30' },
      ]

      for (const slot of slots) {
        // Pick recipe matching meal_type or default
        const matches = recipePool.filter(r => r.meal_type === slot.type)
        // Always use a real database recipe ID so foreign-key inserts cannot fail.
        const chosen = matches.length > 0
          ? matches[i % matches.length]
          : recipePool[(i * slots.length + slots.indexOf(slot)) % recipePool.length]

        const { data: newPlan, error: planError } = await supabase
          .from('meal_plans')
          .upsert({
            user_id: userId,
            recipe_id: chosen.id,
            meal_type: slot.type,
            planned_date: dateStr,
            planned_time: slot.time,
            servings: 4,
            status: 'planned',
          }, { onConflict: 'user_id,planned_date,meal_type' })
          .select()
          .single()

        if (planError) {
          console.error('[Generate Week Insert Error]:', planError)
          return NextResponse.json({
            error: planError.message || `Could not create ${slot.type} for ${dateStr}`,
            totalMealsCreated: createdPlans.length,
          }, { status: 500 })
        }
        if (newPlan) {
          createdPlans.push(newPlan)
          const [hour, minute] = slot.time.split(':').map(Number)
          const readyAt = new Date(`${dateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`)
          const prepMinutes = Number((recipes || []).find((recipe: any) => recipe.id === chosen.id)?.prep_time_minutes || 15)
          const cookMinutes = Number((recipes || []).find((recipe: any) => recipe.id === chosen.id)?.cook_time_minutes || 25)
          const scheduledAt = new Date(readyAt.getTime() - (prepMinutes + cookMinutes) * 60_000)
          await supabase.from('user_preparation_tasks').delete().eq('meal_plan_id', newPlan.id)
          const { error: taskError } = await supabase.from('user_preparation_tasks').insert({
            user_id: userId,
            meal_plan_id: newPlan.id,
            task_name: 'Mise en place',
            description: `Gather and prepare ingredients for ${chosen.name}`,
            scheduled_at: scheduledAt.toISOString(),
            status: 'pending',
          })
          if (taskError) {
            console.error('[Generate Week Prep Task Error]:', taskError)
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Generated complete 7-day meal plan for the week',
      totalMealsCreated: createdPlans.length,
      plans: createdPlans,
    })
  } catch (error: any) {
    console.error('[Generate Week Error]:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
