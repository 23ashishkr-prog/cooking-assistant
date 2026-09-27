'use client'

import { useEffect } from 'react'

type Props = {
  onImageReady: (recipeId: string, imageUrl: string) => void
}

// This runs outside individual recipe cards. It builds the shared image catalogue
// once, persists each image to Supabase Storage, and keeps running while the app is
// open—even when the user changes tabs.
export function RecipeImageBackfill({ onImageReady }: Props) {
  useEffect(() => {
    let cancelled = false
    let idleId: number | undefined

    const pause = (milliseconds: number) => new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds))

    const repairCatalogue = async () => {
      while (!cancelled) {
        try {
          const response = await fetch('/api/recipes/image', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ repairNext: true }),
          })
          const payload = await response.json()

          if (!response.ok) {
            console.warn('[Recipe image catalogue]', payload.error || 'Image backfill paused')
            return
          }
          if (payload.complete) return
          if (payload.repairedRecipeId && payload.imageUrl) {
            onImageReady(String(payload.repairedRecipeId), String(payload.imageUrl))
          }

          // Keep requests gentle: one generated image is committed before the next.
          await pause(250)
        } catch (error) {
          console.warn('[Recipe image catalogue]', error)
          return
        }
      }
    }

    const start = () => { void repairCatalogue() }
    if ('requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(start, { timeout: 1200 })
    } else {
      idleId = window.setTimeout(start, 300)
    }

    return () => {
      cancelled = true
      if ('cancelIdleCallback' in window && idleId !== undefined) {
        window.cancelIdleCallback(idleId)
      } else if (idleId !== undefined) {
        window.clearTimeout(idleId)
      }
    }
  }, [onImageReady])

  return null
}
