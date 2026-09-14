'use client'

import { useEffect, useState } from 'react'
import { cuisineFallbackImage } from '@/lib/recipe-personalization'

export function RecipeImage({ recipe, regenerate = false, className = '', loading = 'lazy' }: { recipe: any; regenerate?: boolean; className?: string; loading?: 'eager' | 'lazy' }) {
  const fallback = cuisineFallbackImage(recipe.cuisine)
  const [src, setSrc] = useState(recipe.image_url || fallback)

  useEffect(() => {
    if (!regenerate && recipe.image_url) return
    let active = true
    fetch('/api/recipes/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipeId: recipe.id, force: regenerate }),
    }).then(response => response.json()).then(data => {
      if (active && data.imageUrl) setSrc(data.imageUrl)
    }).catch(() => undefined)
    return () => { active = false }
  }, [recipe.id, recipe.image_url, regenerate])

  useEffect(() => { setSrc(recipe.image_url || fallback) }, [recipe.image_url, fallback])

  return <img src={src} alt={recipe.name || recipe.title || 'Recipe'} className={className} loading={loading} onError={() => setSrc(fallback)} />
}
