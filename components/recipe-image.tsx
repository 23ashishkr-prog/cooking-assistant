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
const MAX_REPAIR_ATTEMPTS = 3
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

// Missing or duplicate images are generated from the recipe name and details, then
// persisted in Supabase Storage. A card never substitutes another recipe's picture.
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
  const [attempt, setAttempt] = useState(0)
  const [repairError, setRepairError] = useState('')

  useEffect(() => {
    if (isRecipeImage(storedUrl) && !regenerate) {
      setImageUrl(storedUrl)
      setRepairError('')
      return
    }
    if (!recipeId) return

    let mounted = true
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    queueRecipeImageRepair(recipeId, regenerate && isRecipeImage(storedUrl))
      .then((url) => {
        if (!mounted) return
        setImageUrl(url)
        setRepairError('')
      })
      .catch((error: Error) => {
        if (!mounted) return
        if (attempt + 1 < MAX_REPAIR_ATTEMPTS) {
          retryTimer = setTimeout(() => setAttempt((current) => current + 1), 1200 * (attempt + 1))
          return
        }
        setRepairError(error.message || 'Recipe photo could not be prepared yet.')
      })

    return () => {
      mounted = false
      if (retryTimer) clearTimeout(retryTimer)
    }
  }, [recipeId, storedUrl, regenerate, attempt])

  const retryRepair = () => {
    if (!recipeId) return
    setImageUrl('')
    setRepairError('')
    setAttempt(0)
    // Change the input to the effect even if the previous retry counter was already zero.
    setAttempt((current) => current + 1)
  }

  const repairBrokenImage = () => {
    if (!recipeId) return
    setImageUrl('')
    setRepairError('')
    setAttempt((current) => current + 1)
  }

  if (!imageUrl) {
    return (
      <div
        className={`relative block ${className} ${repairError ? 'bg-[#e8e4db]' : 'animate-pulse bg-[#e8e4db]'}`}
        role="status"
        aria-label={repairError ? `Image generation failed for ${name}` : `Preparing an image for ${name}`}
      >
        {repairError && (
          <button
            type="button"
            onClick={retryRepair}
            className="absolute inset-0 grid place-items-center px-3 text-center text-xs font-semibold text-[#5c554a]"
            aria-label={`Retry image generation for ${name}`}
          >
            Prepare recipe photo
          </button>
        )}
      </div>
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
