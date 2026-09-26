'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { isRecipeImage } from '@/lib/recipe-image-policy'

type RepairJob = {
  recipeId: string
  force: boolean
  resolve: (url: string) => void
  reject: (error: Error) => void
}

const MAX_CONCURRENT_REPAIRS = 2
const repairQueue: RepairJob[] = []
const repairsInFlight = new Map<string, Promise<string>>()
let activeRepairs = 0

function drainRepairQueue() {
  while (activeRepairs < MAX_CONCURRENT_REPAIRS && repairQueue.length) {
    const job = repairQueue.shift()
    if (!job) return
    activeRepairs += 1

    fetch('/api/recipes/image', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ recipeId: job.recipeId, force: job.force }),
    })
      .then(async (response) => {
        const payload = await response.json()
        if (!response.ok || !payload.imageUrl) {
          throw new Error(payload.error || 'Recipe image generation failed')
        }
        return String(payload.imageUrl)
      })
      .then(job.resolve, job.reject)
      .finally(() => {
        activeRepairs -= 1
        repairsInFlight.delete(`${job.recipeId}:${job.force}`)
        drainRepairQueue()
      })
  }
}

function queueRecipeImageRepair(recipeId: string, force: boolean) {
  const key = `${recipeId}:${force}`
  const existing = repairsInFlight.get(key)
  if (existing) return existing

  const task = new Promise<string>((resolve, reject) => {
    repairQueue.push({ recipeId, force, resolve, reject })
    drainRepairQueue()
  })
  repairsInFlight.set(key, task)
  return task
}

// A missing or duplicate image is repaired once in the background and persisted to
// Supabase Storage. Cards never use a visual fallback for a different recipe.
export function RecipeImage({
  recipe,
  regenerate = false,
  className = '',
  loading = 'lazy',
}: {
  recipe: any
  regenerate?: boolean
  className?: string
  loading?: 'eager' | 'lazy'
}) {
  const storedUrl = String(recipe?.image_url || '')
  const recipeId = String(recipe?.id || '')
  const name = recipe?.name || recipe?.title || 'Recipe'
  const [imageUrl, setImageUrl] = useState(() => (isRecipeImage(storedUrl) && !regenerate ? storedUrl : ''))
  const [repairFailed, setRepairFailed] = useState(false)

  useEffect(() => {
    if (isRecipeImage(storedUrl) && !regenerate) {
      setImageUrl(storedUrl)
      return
    }
    if (!recipeId || repairFailed) return

    let mounted = true
    queueRecipeImageRepair(recipeId, regenerate && isRecipeImage(storedUrl))
      .then((url) => {
        if (mounted) setImageUrl(url)
      })
      .catch(() => {
        if (mounted) setRepairFailed(true)
      })
    return () => {
      mounted = false
    }
  }, [recipeId, storedUrl, regenerate, repairFailed])

  const repairBrokenImage = () => {
    if (!recipeId || repairFailed) return
    setImageUrl('')
    queueRecipeImageRepair(recipeId, true)
      .then(setImageUrl)
      .catch(() => setRepairFailed(true))
  }

  if (!imageUrl) {
    return (
      <div
        className={`block ${className} animate-pulse bg-[#e8e4db]`}
        role="status"
        aria-label={repairFailed ? `Image generation failed for ${name}` : `Generating image for ${name}`}
      />
    )
  }

  const optimizable =
    imageUrl.startsWith('/') ||
    imageUrl.startsWith('https://www.themealdb.com/images/media/meals/') ||
    imageUrl.startsWith('https://ohnwifpgdoimydddjiwa.supabase.co/storage/v1/object/public/recipe-images/')

  if (!optimizable) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className={`block ${className}`}
        loading={loading}
        decoding="async"
        onError={repairBrokenImage}
      />
    )
  }

  return (
    <Image
      src={imageUrl}
      alt={name}
      width={640}
      height={480}
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      className={`block ${className}`}
      loading={loading}
      onError={repairBrokenImage}
    />
  )
}
