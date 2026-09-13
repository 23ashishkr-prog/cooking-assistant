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
