import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { cuisineMatchesPreference, favoriteIngredientScore, ingredientText, recipeContainsExcludedMeat, recipeMatchesDietPreference } from '@/lib/recipe-personalization'

export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId') || 'default_user'
    const mealTypeParam = searchParams.get('mealType') // optional

    // Fetch user preferences
    const { data: userPref } = await supabase
      .from('user_food_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    // Fetch all recipes with prep tasks and steps
    const { data: allRecipes, error: recError } = await supabase
      .from('recipes')
      .select(`
        id, name, title, description, meal_type, category, cuisine, diet_type, difficulty,
        prep_time_minutes, prep_time, cook_time_minutes, cook_time, total_time_minutes,
        default_servings, servings, image_url, calories, nutrition_score, tips, tags, ingredients
      `)
      .order('created_at', { ascending: false })

    if (recError) {
      console.error('[Recommendations API] Error fetching recipes:', recError)
    }

    const recipes = allRecipes || []

    // Map recipes to normalized structure
    const normalized = recipes.map(r => ({
      id: r.id,
      name: r.name || r.title,
      title: r.name || r.title,
      description: r.description,
      meal_type: (r.meal_type || r.category || 'dinner').toLowerCase(),
      category: r.category || 'Dinner',
      cuisine: r.cuisine || 'Global',
      diet_type: r.diet_type || 'Vegetarian',
      difficulty: r.difficulty || 'Easy',
      prep_time: r.prep_time_minutes || r.prep_time || 15,
      cook_time: r.cook_time_minutes || r.cook_time || 20,
      total_time: r.total_time_minutes || (r.prep_time_minutes || 15) + (r.cook_time_minutes || 20),
      servings: r.default_servings || r.servings || 4,
      image_url: r.image_url,
      calories: r.calories,
      nutrition_score: r.nutrition_score,
      tips: r.tips,
      ingredients: r.ingredients || [],
    }))

    const preferredCuisines = userPref?.cuisines || []
    const blockedIngredients = [
      ...(userPref?.allergies || []),
      ...(userPref?.dislikes || []),
      ...(userPref?.avoided_ingredients || []),
    ].map((value: string) => value.toLowerCase())
    const selectedDiet = String(userPref?.diet_type || '').toLowerCase()
    const filtered = normalized.filter(recipe => {
      const dietMatches = recipeMatchesDietPreference(recipe, selectedDiet)
      const cuisineMatches = cuisineMatchesPreference(recipe.cuisine, preferredCuisines)
      const timeMatches = !userPref?.max_cook_time || recipe.total_time <= userPref.max_cook_time
      const recipeIngredients = ingredientText(recipe)
      const safeForUser = !blockedIngredients.some((ingredient: string) => recipeIngredients.includes(ingredient))
      const allowedMeat = !recipeContainsExcludedMeat(recipe, userPref?.excluded_meats || [])
      return dietMatches && cuisineMatches && timeMatches && safeForUser && allowedMeat
    })
    const favorites = userPref?.favorite_ingredients || []
    const personalized = [...filtered].sort((a, b) => favoriteIngredientScore(b, favorites) - favoriteIngredientScore(a, favorites))

    // Organize by meal slot
    const breakfast = personalized.filter(r => r.meal_type === 'breakfast')
    const lunch = personalized.filter(r => r.meal_type === 'lunch')
    const high_tea = personalized.filter(r => r.meal_type === 'high_tea')
    const dinner = personalized.filter(r => r.meal_type === 'dinner')

    // Determine current time-based context
    const currentHour = new Date().getHours()
    let contextualSlot: 'breakfast' | 'lunch' | 'high_tea' | 'dinner' = 'dinner'
    let greeting = 'Good Evening'

    if (currentHour >= 5 && currentHour < 11) {
      contextualSlot = 'breakfast'
      greeting = 'Good Morning'
    } else if (currentHour >= 11 && currentHour < 16) {
      contextualSlot = 'lunch'
      greeting = 'Good Afternoon'
    } else if (currentHour >= 16 && currentHour < 19) {
      contextualSlot = 'high_tea'
      greeting = 'Good Evening'
    } else {
      contextualSlot = 'dinner'
      greeting = 'Good Evening'
    }

    // Check active meal plan for today
    const todayStr = new Date().toISOString().split('T')[0]
    const { data: activePlans } = await supabase
      .from('meal_plans')
      .select('*, recipes(id, name, title, image_url, cook_time_minutes, prep_time_minutes)')
      .eq('user_id', userId)
      .eq('planned_date', todayStr)
      .in('status', ['planned', 'preparing', 'cooking'])
      .order('planned_time', { ascending: true })

    const activePlan = activePlans && activePlans.length > 0 ? activePlans[0] : null

    // Fetch pending prep tasks for this user
    const { data: pendingTasks } = await supabase
      .from('user_preparation_tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('scheduled_at', { ascending: true })
      .limit(3)

    return NextResponse.json({
      greeting,
      userName: 'Ashish',
      contextualSlot,
      activePlan,
      pendingTasks: pendingTasks || [],
      dailySlots: {
        breakfast: breakfast[0] || personalized[0] || null,
        lunch: lunch[0] || personalized[1] || personalized[0] || null,
        high_tea: high_tea[0] || personalized[2] || personalized[0] || null,
        dinner: dinner[0] || personalized[3] || personalized[0] || null,
      },
      allSlots: {
        breakfast,
        lunch,
        high_tea,
        dinner,
      },
      userPreferences: userPref || null,
    })
  } catch (error: any) {
    console.error('[Recommendations API Exception]:', error)
    return NextResponse.json({ error: error.message || 'Failed to load recommendations' }, { status: 500 })
  }
}
