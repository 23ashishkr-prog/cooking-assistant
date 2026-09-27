'use client'

import { ChangeEvent, useRef, useState } from 'react'
import { Camera, LoaderCircle, X } from 'lucide-react'
import { DADI_AVATAR_SRC } from '@/lib/dadi-avatar'

type CheckIn = { description: string; calories: number; protein_g: number; carbs_g: number; fat_g: number; today_calories: number; calorie_target: number; remaining_calories: number; impact: string; next_step: string; note: string }

export function DadiMealCheckin() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [photo, setPhoto] = useState<File | null>(null)
  const [result, setResult] = useState<CheckIn | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const choosePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setPhoto(file); setResult(null); setError(null)
  }
  const analyse = async () => {
    if (!photo) return inputRef.current?.click()
    setLoading(true); setError(null)
    try {
      const body = new FormData(); body.append('photo', photo)
      const response = await fetch('/api/dadi/meal-checkin', { method: 'POST', body })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Dadi could not analyse that photo.')
      setResult(data)
    } catch (e: any) { setError(e?.message || 'Please try another clear food photo.') } finally { setLoading(false) }
  }
  return <>
    <button type="button" onClick={() => setOpen(true)} className="fixed bottom-24 right-5 z-30 flex items-center gap-2 rounded-full border border-[#f2c9b9] bg-white py-1.5 pl-1.5 pr-3 shadow-lg transition hover:-translate-y-0.5" aria-label="Ask Dadi to check a meal">
      <img src={DADI_AVATAR_SRC} alt="Dadi" className="size-11 rounded-full bg-[#fff3e9] object-cover object-top" />
      <span className="text-xs font-bold text-[#8e3f22]">Ask Dadi</span>
    </button>
    {open && <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#223129]/45 p-3 sm:items-center" role="dialog" aria-modal="true" aria-label="Dadi meal check-in">
      <div className="w-full max-w-md rounded-[2rem] bg-[#fffdf9] p-5 shadow-2xl">
        <div className="flex items-start gap-3"><img src={DADI_AVATAR_SRC} alt="Dadi" className="size-16 rounded-full bg-[#fff3e9] object-cover object-top" /><div className="flex-1"><p className="text-xs font-bold uppercase tracking-widest text-[#b25537]">Dadi&apos;s plate check</p><h2 className="font-serif text-xl font-bold text-[#223129]">Show me what you ate.</h2><p className="mt-1 text-xs text-[#736e65]">I&apos;ll estimate this meal, log it for today, and adjust your next meal.</p></div><button type="button" className="rounded-full p-1 text-[#736e65]" onClick={() => setOpen(false)} aria-label="Close"><X className="size-5" /></button></div>
        {!result && <div className="mt-5 rounded-2xl border border-dashed border-[#dfb49f] bg-[#fff6ef] p-5 text-center"><input ref={inputRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={choosePhoto} /><Camera className="mx-auto size-7 text-[#b25537]" /><p className="mt-2 text-sm font-bold text-[#223129]">{photo ? photo.name : 'Take or choose a clear food photo'}</p><button type="button" onClick={analyse} disabled={loading} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#f4510b] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60">{loading ? <LoaderCircle className="size-4 animate-spin" /> : <Camera className="size-4" />}{loading ? 'Dadi is checking…' : photo ? 'Analyse my meal' : 'Add food photo'}</button></div>}
        {error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">{error}</p>}
        {result && <div className="mt-5 space-y-3 text-sm"><div className="rounded-2xl bg-[#fff0e8] p-4"><p className="font-bold text-[#223129]">{result.description}</p><p className="mt-1 text-[#8e3f22]"><b>≈ {result.calories} kcal</b> · {result.protein_g}g protein · {result.carbs_g}g carbs</p></div><div className="grid grid-cols-2 gap-3"><div className="rounded-xl border border-[#e8dfd4] p-3"><p className="text-[10px] font-bold uppercase text-[#736e65]">Today logged</p><p className="font-serif text-lg font-bold text-[#223129]">{result.today_calories} kcal</p></div><div className="rounded-xl border border-[#e8dfd4] p-3"><p className="text-[10px] font-bold uppercase text-[#736e65]">Still available</p><p className="font-serif text-lg font-bold text-[#223129]">{Math.max(0,result.remaining_calories)} kcal</p></div></div><p className="rounded-xl bg-[#edf6ee] p-3 text-xs text-[#245e38]"><b>Plan impact:</b> {result.impact}</p><p className="rounded-xl bg-[#f3f0ff] p-3 text-xs text-[#514587]"><b>Going forward:</b> {result.next_step}</p><p className="text-[10px] text-[#736e65]">{result.note}</p><button type="button" onClick={() => { setResult(null); setPhoto(null); inputRef.current && (inputRef.current.value='') }} className="w-full rounded-xl border border-[#ded9cf] py-2 text-xs font-bold text-[#223129]">Check another plate</button></div>}
      </div>
    </div>}
  </>
}
