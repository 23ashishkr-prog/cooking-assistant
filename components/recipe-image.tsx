'use client'

import { useState } from 'react'
import { isRecipeImage } from '@/lib/recipe-image-policy'

// Image generation belongs to the backend repair task, never a card render.
export function RecipeImage({ recipe, regenerate = false, className = '', loading = 'lazy' }: { recipe: any; regenerate?: boolean; className?: string; loading?: 'eager' | 'lazy' }) {
  const url = String(recipe?.image_url || '')
  const name = recipe?.name || recipe?.title || 'Recipe'
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  if (regenerate || !isRecipeImage(url) || failedUrl === url) {
    return <div className={`flex items-center justify-center bg-[#f0ece3] p-3 text-center text-xs text-[#736e65] ${className}`} role="img" aria-label={`Photo unavailable for ${name}`} />
  }
  return <img src={url} alt={name} className={`block ${className}`} loading={loading} decoding="async" onError={() => setFailedUrl(url)} />
}
