'use client'

import { useEffect, useState } from 'react'

const resolved = new Map<string, string>()
const pending = new Map<string, Promise<string>>()
let queue: Promise<unknown> = Promise.resolve()
const generic = (url: string) => !url || /recipe-fallback-|gen-z-food-hero|\/api\/recipes\/image/.test(url)

function resolveImage(id: string, force: boolean) {
  if (resolved.has(id)) return Promise.resolve(resolved.get(id)!)
  if (pending.has(id)) return pending.get(id)!
  const job = queue.catch(() => undefined).then(async () => {
    const response = await fetch('/api/recipes/image', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipeId: id, force }),
    })
    const data = await response.json()
    if (!response.ok || !data.imageUrl || generic(data.imageUrl)) {
      throw new Error(data.error || 'Image generation failed')
    }
    resolved.set(id, data.imageUrl)
    return data.imageUrl as string
  })
  pending.set(id, job)
  queue = job.catch(() => undefined)
  void job.finally(() => pending.delete(id)).catch(() => undefined)
  return job
}

export function RecipeImage({ recipe, regenerate = false, className = '', loading = 'lazy' }: { recipe: any; regenerate?: boolean; className?: string; loading?: 'eager' | 'lazy' }) {
  const id = String(recipe?.id || '')
  const url = String(recipe?.image_url || '')
  const name = recipe?.name || recipe?.title || 'Recipe'
  const [src, setSrc] = useState<string | null>(() => resolved.get(id) || (!regenerate && !generic(url) ? url : null))
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    setFailed(false)
    const cached = resolved.get(id)
    if (cached || (!regenerate && !generic(url) && attempt === 0)) {
      setSrc(cached || url)
      return
    }
    setSrc(null)
    if (!id) { setFailed(true); return }
    resolveImage(id, regenerate || generic(url) || attempt > 0)
      .then(imageUrl => { if (active) setSrc(imageUrl) })
      .catch(() => { if (active) setFailed(true) })
    return () => { active = false }
  }, [id, url, regenerate, attempt])

  if (!src) return <div className={`flex items-center justify-center bg-[#f0ece3] p-3 text-center text-xs text-[#736e65] ${className}`} role="status">
    {failed ? <button type="button" onClick={() => setAttempt(value => value + 1)}>Image unavailable for {name}. Retry</button> : <span>Preparing image for {name}…</span>}
  </div>

  return <img src={src} alt={name} className={`block ${className}`} loading={loading} decoding="async" onError={() => {
    resolved.delete(id)
    setSrc(null)
    if (attempt === 0) setAttempt(1)
    else setFailed(true)
  }} />
}
