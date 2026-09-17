'use client'

import { useState } from 'react'
import Image from 'next/image'
import { isRecipeImage } from '@/lib/recipe-image-policy'
import { cuisineFallbackImage, generatedRecipeImage } from '@/lib/recipe-personalization'

// Image generation belongs to the backend repair task, never a card render.
export function RecipeImage({ recipe, regenerate = false, className = '', loading = 'lazy' }: { recipe: any; regenerate?: boolean; className?: string; loading?: 'eager' | 'lazy' }) {
  const url = String(recipe?.image_url || '')
  const name = recipe?.name || recipe?.title || 'Recipe'
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const [originalUrl, setOriginalUrl] = useState<string | null>(null)
  const fallbackUrl = generatedRecipeImage(recipe) || cuisineFallbackImage(recipe?.cuisine)
  const displayUrl = regenerate || !isRecipeImage(url) || failedUrl === url ? fallbackUrl : url
  const optimizable = displayUrl.startsWith('/') || displayUrl.startsWith('https://www.themealdb.com/images/media/meals/') || displayUrl.startsWith('https://ohnwifpgdoimydddjiwa.supabase.co/storage/v1/object/public/recipe-images/')
  if (!optimizable || originalUrl === displayUrl) {
    return <img src={displayUrl} alt={name} className={`block ${className}`} loading={loading} decoding="async" onError={() => setFailedUrl(displayUrl)} />
  }
  return <Image src={displayUrl} alt={name} width={640} height={480}
    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
    className={`block ${className}`} loading={loading} decoding="async"
    onError={() => setOriginalUrl(displayUrl)} />
}
