'use client'

import { ChangeEvent, FormEvent, useRef, useState } from 'react'
import { Camera, LoaderCircle, Send } from 'lucide-react'
import { DADI_AVATAR_SRC } from '@/lib/dadi-avatar'

type Message = { role: 'dadi' | 'user'; text: string }

export function DadiMealCheckin() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [messages, setMessages] = useState<Message[]>([{ role: 'dadi', text: 'Aao beta, tell me—what are you planning to have now? You can type it, or show me a photo of the plate.' }])
  const [intention, setIntention] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const choosePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setPhoto(file)
    setError(null)
  }
  const send = async (event?: FormEvent) => {
    event?.preventDefault()
    if ((!intention.trim() && !photo) || loading) return
    const userText = intention.trim() || `Here is my ${photo?.name || 'food'}.`
    setMessages(current => [...current, { role: 'user', text: userText }])
    setIntention('')
    setLoading(true); setError(null)
    try {
      const body = new FormData()
      if (intention.trim()) body.append('intention', intention.trim())
      if (photo) body.append('photo', photo)
      const response = await fetch('/api/dadi/meal-checkin', { method: 'POST', body })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Dadi could not answer right now.')
      setMessages(current => [...current, { role: 'dadi', text: data.reply }])
      setPhoto(null)
      if (inputRef.current) inputRef.current.value = ''
    } catch (e: any) {
      setError(e?.message || 'Please try once more, beta.')
    } finally { setLoading(false) }
  }

  return <div className="moaka-tab mx-auto max-w-2xl space-y-5">
    <section className="relative overflow-hidden rounded-[2rem] border border-[#ead7ca] bg-[#fff8f1] p-5 sm:p-7">
      <img src={DADI_AVATAR_SRC} alt="Dadi" className="absolute -right-5 -bottom-8 h-48 w-48 object-contain sm:h-60 sm:w-60" />
      <div className="relative max-w-sm"><p className="text-xs font-bold uppercase tracking-widest text-[#b25537]">Dadi&apos;s daily check-in</p><h1 className="mt-2 font-serif text-3xl font-bold text-[#223129]">Let&apos;s think through your meal.</h1><p className="mt-2 text-sm text-[#736e65]">Tell Dadi what you want to have, or show her a photo. She will keep today&apos;s plan in mind.</p></div>
    </section>

    <section className="rounded-[2rem] border border-[#ded9cf] bg-white p-4 shadow-xs sm:p-5">
      <div className="space-y-4" aria-live="polite">
        {messages.map((message, index) => <div key={index} className={message.role === 'dadi' ? 'flex items-end gap-2' : 'flex justify-end'}>
          {message.role === 'dadi' && <img src={DADI_AVATAR_SRC} alt="Dadi" className="size-9 shrink-0 rounded-full bg-[#fff3e9] object-cover object-top" />}
          <p className={message.role === 'dadi' ? 'max-w-[82%] rounded-2xl rounded-bl-sm bg-[#f5f1eb] px-4 py-3 text-sm leading-6 text-[#34312d]' : 'max-w-[82%] rounded-2xl rounded-br-sm bg-[#f4510b] px-4 py-3 text-sm leading-6 text-white'}>{message.text}</p>
        </div>)}
        {loading && <div className="flex items-center gap-2 text-sm text-[#736e65]"><img src={DADI_AVATAR_SRC} alt="" className="size-8 rounded-full bg-[#fff3e9] object-cover object-top" /><LoaderCircle className="size-4 animate-spin" /> Dadi is thinking…</div>}
      </div>
      {photo && <p className="mt-4 rounded-xl bg-[#fff6ef] px-3 py-2 text-xs font-semibold text-[#8e3f22]">Photo ready: {photo.name}</p>}
      {error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">{error}</p>}
      <form onSubmit={send} className="mt-5 flex items-end gap-2 border-t border-[#f0ece3] pt-4">
        <input ref={inputRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={choosePhoto} />
        <button type="button" onClick={() => inputRef.current?.click()} className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[#ded9cf] text-[#b25537] hover:bg-[#fff0e9]" aria-label="Take or choose food photo"><Camera className="size-5" /></button>
        <label className="sr-only" htmlFor="dadi-meal-message">What are you planning to have?</label>
        <textarea id="dadi-meal-message" value={intention} onChange={event => setIntention(event.target.value)} rows={1} placeholder="Dadi, I am thinking of having…" className="max-h-28 min-h-11 flex-1 resize-none rounded-xl border border-[#ded9cf] bg-[#fbf9f5] px-3 py-2.5 text-sm text-[#223129] outline-none focus:border-[#b25537]" />
        <button type="submit" disabled={loading || (!intention.trim() && !photo)} className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#f4510b] text-white disabled:opacity-40" aria-label="Send to Dadi"><Send className="size-4" /></button>
      </form>
    </section>
  </div>
}
