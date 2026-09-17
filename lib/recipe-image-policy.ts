export function isRecipeImage(url: unknown): url is string {
  return typeof url === 'string' && /^(https?:\/\/|\/(?!\/))/.test(url) &&
    !/recipe-fallback-|gen-z-food-hero|\/api\/recipes\/image/i.test(url)
}

export function imageRepairTargets<T extends { id: string; image_url?: string | null }>(recipes: T[]): T[] {
  const counts = new Map<string, number>()
  for (const recipe of recipes) {
    if (recipe.image_url) counts.set(recipe.image_url, (counts.get(recipe.image_url) || 0) + 1)
  }
  return recipes.filter(recipe => !isRecipeImage(recipe.image_url) || (counts.get(recipe.image_url!) || 0) > 1)
}
