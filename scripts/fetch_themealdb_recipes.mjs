const limit = Number(process.argv[2] || 100)
const letters = 'abcdefghijklmnopqrstuvwxyz'.split('')
const meals = []

for (const letter of letters) {
  const response = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?f=${letter}`)
  if (!response.ok) throw new Error(`TheMealDB request failed for ${letter}: ${response.status}`)
  const payload = await response.json()
  for (const meal of payload.meals || []) {
    if (!meals.some((item) => item.idMeal === meal.idMeal)) meals.push(meal)
    if (meals.length >= limit) break
  }
  if (meals.length >= limit) break
}

const normalize = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9\s]/g, ' ')
  .replace(/\s+/g, ' ')

const mealType = (category) => {
  const value = String(category || '').toLowerCase()
  if (value.includes('breakfast')) return 'breakfast'
  if (value.includes('starter') || value.includes('side') || value.includes('dessert')) return 'high_tea'
  if (value.includes('pasta') || value.includes('vegan') || value.includes('vegetarian')) return 'lunch'
  return 'dinner'
}

const normalized = meals.slice(0, limit).map((meal) => {
  const ingredients = []
  for (let index = 1; index <= 20; index += 1) {
    const name = String(meal[`strIngredient${index}`] || '').trim()
    if (!name) continue
    ingredients.push({
      name,
      normalized_name: normalize(name),
      measure: String(meal[`strMeasure${index}`] || '').trim() || null,
      sequence: index,
    })
  }
  const instructions = String(meal.strInstructions || '')
    .split(/\r?\n+/)
    .map((step) => step.trim())
    .filter(Boolean)
  const vegetarian = /vegetarian|vegan/i.test(meal.strCategory || '')
  return {
    id: `themealdb-${meal.idMeal}`,
    external_id: meal.idMeal,
    source_name: 'TheMealDB',
    source_url: meal.strSource || `https://www.themealdb.com/meal/${meal.idMeal}`,
    attribution: 'Recipe and image provided by TheMealDB',
    name: meal.strMeal,
    title: meal.strMeal,
    description: `${meal.strArea || 'International'} ${meal.strCategory || 'meal'} recipe`,
    image_url: meal.strMealThumb,
    meal_type: mealType(meal.strCategory),
    category: meal.strCategory || 'Other',
    cuisine: meal.strArea || meal.strCountry || 'International',
    diet_type: vegetarian ? (String(meal.strCategory).toLowerCase() === 'vegan' ? 'Vegan' : 'Vegetarian') : 'Non-Vegetarian',
    difficulty: 'Medium',
    prep_time_minutes: 15,
    cook_time_minutes: 30,
    default_servings: 4,
    calories: null,
    nutrition_score: null,
    tips: meal.strTags ? `Tags: ${meal.strTags}` : null,
    tags: String(meal.strTags || '').split(',').map((tag) => tag.trim()).filter(Boolean),
    ingredients,
    instructions,
  }
})

if (normalized.length < limit) throw new Error(`Only found ${normalized.length} recipes; expected ${limit}`)
process.stdout.write(JSON.stringify(normalized))
