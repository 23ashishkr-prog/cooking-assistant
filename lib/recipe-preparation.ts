type RecipeForPrep = {
  name?: unknown
  title?: unknown
  ingredients?: unknown
}

export type DerivedPrepTask = {
  task_name: string
  description: string
  duration_minutes: number
}

function ingredientNames(ingredients: unknown) {
  if (!Array.isArray(ingredients)) return []
  return ingredients
    .map((ingredient: any) => String(ingredient?.name || ingredient?.ingredient_name || ingredient || '').trim())
    .filter(Boolean)
}

export function deriveRecipePrepTasks(recipe: RecipeForPrep): DerivedPrepTask[] {
  const recipeName = String(recipe.name || recipe.title || 'tomorrow’s meal')
  const names = ingredientNames(recipe.ingredients)
  const findNames = (pattern: RegExp) => names.filter((name) => pattern.test(name.toLowerCase())).slice(0, 3)
  const tasks: DerivedPrepTask[] = []

  const soak = findNames(/bean|rajma|chickpea|chana|lentil|dal|rice|cashew|almond/)
  if (soak.length) {
    tasks.push({
      task_name: `Soak ${soak.join(', ')}`,
      description: `Rinse and soak for ${recipeName}; refrigerate when appropriate.`,
      duration_minutes: 8,
    })
  }

  const protein = findNames(/paneer|tofu|chicken|fish|prawn|shrimp|lamb|mutton|beef|pork/)
  if (protein.length) {
    tasks.push({
      task_name: `Season ${protein.join(', ')}`,
      description: `Portion and season for ${recipeName}, then keep covered in the refrigerator.`,
      duration_minutes: 12,
    })
  }

  const produce = findNames(/onion|tomato|potato|carrot|pepper|capsicum|spinach|cabbage|garlic|ginger|vegetable/)
  if (produce.length) {
    tasks.push({
      task_name: `Prep ${produce.join(', ')}`,
      description: `Wash and prep these ingredients for ${recipeName}; store them separately.`,
      duration_minutes: 10,
    })
  }

  if (!tasks.length) {
    const essentials = names.slice(0, 4)
    tasks.push({
      task_name: `Measure ingredients for ${recipeName}`,
      description: essentials.length
        ? `Set aside ${essentials.join(', ')} for tomorrow.`
        : `Review the recipe and set aside tomorrow’s ingredients.`,
      duration_minutes: 8,
    })
  }

  return tasks
}
