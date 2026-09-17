const ASIAN_CUISINES = new Set([
  'china', 'chinese', 'japan', 'japanese', 'thailand', 'thai',
  'malaysia', 'malaysian', 'vietnam', 'vietnamese', 'south korea', 'korean',
  'india', 'indian', 'bangladesh', 'bangladeshi', 'cambodia', 'cambodian',
  'laos', 'laotian', 'philippines', 'filipino', 'indonesia', 'indonesian',
  'singapore', 'singaporean',
])

export function cuisineMatchesPreference(recipeCuisine: unknown, preferences: unknown[] = []) {
  if (!preferences.length) return true
  const recipe = String(recipeCuisine || '').trim().toLowerCase()

  return preferences.some(value => {
    const preference = String(value || '').trim().toLowerCase()
    if (recipe === preference) return true
    if (['north indian', 'south indian', 'indian'].includes(preference)) {
      return recipe === 'india' || recipe === 'indian'
    }
    if (preference === 'italian') return recipe === 'italy' || recipe === 'italian'
    if (preference === 'asian') return ASIAN_CUISINES.has(recipe)
    return false
  })
}

export function ingredientText(recipe: { ingredients?: unknown }) {
  return JSON.stringify(recipe.ingredients || []).toLowerCase()
}

export function recipeContainsExcludedMeat(
  recipe: { name?: unknown; title?: unknown; diet_type?: unknown; ingredients?: unknown },
  excludedMeats: unknown[] = [],
) {
  const haystack = [
    recipe.name,
    recipe.title,
    recipe.diet_type,
    ingredientText(recipe),
  ].join(' ').toLowerCase()

  return excludedMeats.some((meat) => {
    const value = String(meat || '').trim().toLowerCase()
    if (!value) return false
    const aliases: Record<string, string[]> = {
      pork: ['pork', 'bacon', 'ham', 'prosciutto', 'pepperoni', 'sausage'],
      beef: ['beef', 'steak', 'veal'],
      'lamb/mutton': ['lamb', 'mutton'],
      chicken: ['chicken'],
      seafood: ['seafood', 'fish', 'prawn', 'shrimp', 'salmon', 'tuna', 'crab', 'lobster'],
    }
    return (aliases[value] || [value]).some((term) => haystack.includes(term))
  })
}

export function recipeMatchesDietPreference(
  recipe: { diet_type?: unknown },
  preference: unknown,
) {
  const selected = String(preference || '').trim().toLowerCase()
  const recipeDiet = String(recipe.diet_type || '').trim().toLowerCase()

  if (!selected || selected.includes('flexible')) return true
  if (selected === 'vegetarian') {
    return recipeDiet === 'vegetarian' || recipeDiet === 'vegan'
  }
  if (selected === 'non-vegetarian') return recipeDiet === 'non-vegetarian'
  return recipeDiet === selected
}

export function favoriteIngredientScore(recipe: { ingredients?: unknown }, favorites: unknown[] = []) {
  const haystack = ingredientText(recipe)
  return favorites.reduce<number>((score, favorite) => {
    const value = String(favorite || '').trim().toLowerCase()
    return score + (value && haystack.includes(value) ? 1 : 0)
  }, 0)
}

export function cuisineFallbackImage(cuisine: unknown) {
  const value = String(cuisine || '').toLowerCase()
  if (value.includes('india')) return '/recipe-fallback-indian.webp'
  if (value.includes('ital')) return '/recipe-fallback-italian.webp'
  if (ASIAN_CUISINES.has(value)) return '/recipe-fallback-asian.webp'
  return '/gen-z-food-hero.jpg'
}

export function generatedRecipeImage(recipe: { name?: unknown; title?: unknown }) {
  const name = String(recipe.name || recipe.title || '').toLowerCase()
  if (name.includes('arunachal')) return '/recipe-arunachal-zan.png'
  if (name.includes('uttaranchal') || name.includes('uttarakhand')) return '/recipe-uttarakhand-aloo.png'
  if (name.includes('mizoram')) return '/recipe-mizoram-bai.png'
  return null
}
