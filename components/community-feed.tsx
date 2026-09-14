'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, ChefHat, Heart, LoaderCircle, Play, Plus, Send, Share2, Users, Video, X } from 'lucide-react'
import type { RecipeItem } from './cooking-assistant-app'
import { cuisineFallbackImage } from '@/lib/recipe-personalization'

export function CommunityFeed({ profile, preferences, onCook }: { profile: any; preferences: any; onCook: (recipe: RecipeItem) => void }) {
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [composerOpen, setComposerOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [media, setMedia] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', caption: '', cuisine: 'Indian', meal_type: 'dinner', prep: '15', cook: '20', ingredients: '', steps: '' })
  const photoInput = useRef<HTMLInputElement | null>(null)
  const videoInput = useRef<HTMLInputElement | null>(null)

  const loadPosts = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/community')
      const data = await res.json()
      setPosts(data.posts || [])
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { loadPosts() }, [preferences.diet_type, JSON.stringify(preferences.excluded_meats || [])])
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const chooseMedia = (file?: File) => {
    if (!file) return
    if (preview) URL.revokeObjectURL(preview)
    setMedia(file)
    setPreview(URL.createObjectURL(file))
  }

  const publish = async () => {
    setSaving(true)
    setNotice(null)
    try {
      const payload = new FormData()
      Object.entries(form).forEach(([key, value]) => payload.append(key === 'prep' ? 'prep_time_minutes' : key === 'cook' ? 'cook_time_minutes' : key, value))
      payload.append('author_name', profile.name || 'Moaka Cook')
      payload.append('diet_type', preferences.diet_type || 'Vegetarian')
      if (media) payload.append('media', media)
      const res = await fetch('/api/community', { method: 'POST', body: payload })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not publish recipe')
      setForm({ name: '', caption: '', cuisine: 'Indian', meal_type: 'dinner', prep: '15', cook: '20', ingredients: '', steps: '' })
      setMedia(null)
      setPreview(null)
      setComposerOpen(false)
      setNotice('Recipe posted to the Moaka community.')
      await loadPosts()
    } catch (error: any) {
      setNotice(error?.message || 'Could not publish recipe.')
    } finally {
      setSaving(false)
    }
  }

  const like = async (postId: string) => {
    const res = await fetch('/api/community', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ postId }) })
    const data = await res.json()
    if (data.post) setPosts(current => current.map(post => post.id === postId ? { ...post, likes_count: data.post.likes_count } : post))
  }

  return (
    <div className="moaka-tab mx-auto max-w-2xl space-y-5">
      <section className="overflow-hidden rounded-[2rem] bg-[#20142f] p-6 text-white shadow-xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest"><Users className="size-3" /> Moaka Community</span>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Cook. Capture. Share.</h1>
            <p className="mt-2 max-w-md text-sm text-white/70">Recipes from cooks who match your {preferences.diet_type || 'food'} profile.</p>
          </div>
          <button type="button" onClick={() => setComposerOpen(true)} className="flex shrink-0 items-center gap-2 rounded-2xl bg-[#f4510b] px-4 py-3 text-xs font-black shadow-lg"><Plus className="size-4" /> Post recipe</button>
        </div>
      </section>

      {notice && <div className="rounded-2xl border border-[#f6cbb8] bg-[#fff4ee] p-3 text-xs font-bold text-[#9a3d19]">{notice}</div>}

      {loading ? <div className="flex justify-center py-16"><LoaderCircle className="size-7 animate-spin text-[#f4510b]" /></div> : posts.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#ded9cf] bg-white p-10 text-center"><ChefHat className="mx-auto size-9 text-[#f4510b]" /><h2 className="mt-3 font-serif text-xl font-bold">Be the first cook in your feed</h2><p className="mt-1 text-xs text-[#736e65]">Post a recipe that matches your food profile.</p></div>
      ) : posts.map(post => {
        const recipe = Array.isArray(post.recipes) ? post.recipes[0] : post.recipes
        return (
          <article key={post.id} className="overflow-hidden rounded-[1.75rem] border border-[#ded9cf] bg-white shadow-sm">
            <div className="flex items-center gap-3 p-4"><span className="flex size-10 items-center justify-center rounded-full bg-[#f4510b] font-black text-white">{String(post.author_name || 'M').charAt(0)}</span><div><p className="text-sm font-black">{post.author_name}</p><p className="text-[10px] uppercase tracking-wider text-[#8d887d]">{recipe?.cuisine} · {recipe?.diet_type}</p></div></div>
            <div className="relative aspect-[4/5] bg-[#20142f]">
              {post.media_type === 'video' && post.media_url ? <video src={post.media_url} controls playsInline preload="metadata" className="size-full object-cover" /> : <img src={post.media_url || recipe?.image_url || cuisineFallbackImage(recipe?.cuisine)} alt={recipe?.name || 'Community recipe'} className="size-full object-cover" />}
              {post.media_type === 'video' && <span className="absolute right-3 top-3 rounded-full bg-black/60 p-2 text-white"><Play className="size-4 fill-current" /></span>}
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between"><div className="flex gap-3"><button type="button" onClick={() => like(post.id)} className="flex items-center gap-1 text-xs font-bold"><Heart className="size-5 text-[#f4510b]" /> {post.likes_count || 0}</button><button type="button" onClick={() => navigator.share?.({ title: recipe?.name, text: post.caption }).catch(() => undefined)}><Share2 className="size-5" /></button></div><button type="button" onClick={() => onCook(recipe)} className="rounded-xl bg-[#223129] px-4 py-2 text-xs font-black text-white">Cook this</button></div>
              <h2 className="mt-4 font-serif text-xl font-black">{recipe?.name}</h2><p className="mt-1 text-sm text-[#605a52]">{post.caption || recipe?.description}</p>
              <div className="mt-3 flex gap-2 text-[10px] font-bold"><span className="rounded-full bg-[#fff0e8] px-2.5 py-1 text-[#b73708]">{recipe?.meal_type?.replace('_', ' ')}</span><span className="rounded-full bg-[#eef6f0] px-2.5 py-1 text-[#245e38]">{recipe?.prep_time_minutes || 15}m prep</span><span className="rounded-full bg-[#f3effc] px-2.5 py-1 text-[#5e3d91]">{recipe?.cook_time_minutes || 20}m cook</span></div>
            </div>
          </article>
        )
      })}

      {composerOpen && <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-[#160e20]/70 px-3 py-4 backdrop-blur-sm sm:items-center sm:p-6"><div role="dialog" aria-modal="true" aria-label="Post a community recipe" className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-[1.75rem] bg-[#fbf9f5] shadow-2xl sm:max-h-[calc(100dvh-3rem)] sm:rounded-[2rem]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#ece6dc] bg-[#fbf9f5]/95 px-5 py-4 backdrop-blur sm:px-7"><div><p className="text-[10px] font-black uppercase tracking-widest text-[#f4510b]">New community recipe</p><h2 className="font-serif text-xl font-black sm:text-2xl">Share your kitchen win</h2></div><button type="button" onClick={() => setComposerOpen(false)} className="rounded-full bg-white p-2 shadow-sm"><X className="size-5" /></button></div>
        <div className="p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:p-7">
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <input value={form.name} onChange={e => setForm({...form,name:e.target.value})} placeholder="Recipe name *" className="rounded-xl border bg-white p-3 text-sm" />
          <input value={form.caption} onChange={e => setForm({...form,caption:e.target.value})} placeholder="Tell your story" className="rounded-xl border bg-white p-3 text-sm" />
          <select value={form.cuisine} onChange={e => setForm({...form,cuisine:e.target.value})} className="rounded-xl border bg-white p-3 text-sm"><option>Indian</option><option>Italian</option><option>Asian</option><option>Global</option></select>
          <select value={form.meal_type} onChange={e => setForm({...form,meal_type:e.target.value})} className="rounded-xl border bg-white p-3 text-sm"><option value="breakfast">Breakfast</option><option value="lunch">Lunch</option><option value="high_tea">High Tea</option><option value="dinner">Dinner</option></select>
          <input value={form.prep} onChange={e => setForm({...form,prep:e.target.value})} type="number" min="1" placeholder="Prep minutes" className="rounded-xl border bg-white p-3 text-sm" />
          <input value={form.cook} onChange={e => setForm({...form,cook:e.target.value})} type="number" min="1" placeholder="Cook minutes" className="rounded-xl border bg-white p-3 text-sm" />
          <textarea value={form.ingredients} onChange={e => setForm({...form,ingredients:e.target.value})} placeholder="Ingredients, separated by commas *" className="min-h-24 rounded-xl border bg-white p-3 text-sm sm:col-span-2" />
          <textarea value={form.steps} onChange={e => setForm({...form,steps:e.target.value})} placeholder="Cooking steps, one per line *" className="min-h-28 rounded-xl border bg-white p-3 text-sm sm:col-span-2" />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2"><button type="button" onClick={() => photoInput.current?.click()} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border bg-white px-3 py-3 text-center text-xs font-black"><Camera className="size-4 shrink-0 text-[#f4510b]" /> <span>Take/upload photo</span></button><button type="button" onClick={() => videoInput.current?.click()} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border bg-white px-3 py-3 text-center text-xs font-black"><Video className="size-4 shrink-0 text-[#f4510b]" /> <span>Upload short video</span></button></div>
        <input ref={photoInput} type="file" accept="image/*" capture="environment" hidden onChange={e => chooseMedia(e.target.files?.[0])} /><input ref={videoInput} type="file" accept="video/*" capture="environment" hidden onChange={e => chooseMedia(e.target.files?.[0])} />
        {preview && <div className="mt-3 overflow-hidden rounded-2xl bg-black">{media?.type.startsWith('video/') ? <video src={preview} controls className="max-h-64 w-full object-contain" /> : <img src={preview} alt="Recipe preview" className="max-h-64 w-full object-cover" />}</div>}
        <button type="button" onClick={publish} disabled={saving || !form.name || !form.ingredients || !form.steps} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#f4510b] p-4 text-sm font-black text-white disabled:opacity-50">{saving ? <LoaderCircle className="size-5 animate-spin" /> : <Send className="size-5" />} Publish recipe</button>
        </div>
      </div></div>}
    </div>
  )
}
