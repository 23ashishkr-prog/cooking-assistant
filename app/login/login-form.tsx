'use client'

import { FormEvent, useState } from 'react'
import { Eye, EyeOff, LoaderCircle, LockKeyhole, UserRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function LoginForm() {
  const [username, setUsername] = useState('ashish')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const setup = await fetch('/api/auth/bootstrap', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const setupData = await setup.json()
      if (!setup.ok) throw new Error(setupData.error || 'Login setup failed')
      const supabase = createClient()
      const { error: loginError } = await supabase.auth.signInWithPassword({ email: setupData.email, password })
      if (loginError) throw loginError
      await fetch('/api/plan/generate-week', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: setupData.userId, startDate: new Date().toLocaleDateString('en-CA') }),
      })
      window.location.assign('/')
    } catch (loginError: any) {
      setError(loginError?.message || 'Username or password is incorrect.')
    } finally { setLoading(false) }
  }

  return <main className="min-h-[100dvh] bg-[#24131a] text-white lg:grid lg:grid-cols-[1.08fr_.92fr]">
    <section className="relative hidden min-h-screen overflow-hidden lg:block">
      <img src="/moaka-login-3d.png" alt="Floating 3D Moaka paneer plate and spices" className="absolute inset-0 size-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#351019]/40 via-transparent to-[#24131a]" />
      <div className="absolute inset-x-12 bottom-12 rounded-[2rem] border border-white/15 bg-black/25 p-7 backdrop-blur-md">
        <p className="text-xs font-black uppercase tracking-[.3em] text-[#ff8a57]">Cook what you have</p>
        <h2 className="mt-2 max-w-xl font-serif text-5xl font-black leading-[.95]">Your kitchen.<br/>Your plan. Your Moaka.</h2>
      </div>
    </section>
    <section className="flex min-h-[100dvh] items-center justify-center px-5 py-10 sm:px-10">
      <form onSubmit={submit} className="w-full max-w-md">
        <div className="flex items-center gap-4"><img src="/moaka-icon.jpg" alt="Moaka" className="size-16 rounded-2xl border-2 border-white/20 shadow-2xl"/><div><p className="text-3xl font-black tracking-[-.06em]">moaka</p><p className="text-[10px] font-black uppercase tracking-[.28em] text-[#ff7440]">smart kitchen</p></div></div>
        <p className="mt-12 text-xs font-black uppercase tracking-[.3em] text-[#ff7440]">Welcome back</p>
        <h1 className="mt-3 font-serif text-5xl font-black leading-none">Good food starts here.</h1>
        <p className="mt-4 text-sm text-white/60">Sign in to load your personal meal plan, kitchen and recommendations.</p>
        <label className="mt-9 block text-xs font-bold text-white/70">Username</label>
        <div className="mt-2 flex items-center rounded-2xl border border-white/15 bg-white/7 px-4 focus-within:border-[#ff7440]"><UserRound className="size-4 text-[#ff7440]"/><input value={username} onChange={e=>setUsername(e.target.value)} autoComplete="username" required className="w-full bg-transparent px-3 py-4 text-sm text-white outline-none placeholder:text-white/35" placeholder="Your username"/></div>
        <label className="mt-5 block text-xs font-bold text-white/70">Password</label>
        <div className="mt-2 flex items-center rounded-2xl border border-white/15 bg-white/7 px-4 focus-within:border-[#ff7440]"><LockKeyhole className="size-4 text-[#ff7440]"/><input value={password} onChange={e=>setPassword(e.target.value)} type={showPassword?'text':'password'} autoComplete="current-password" required className="w-full bg-transparent px-3 py-4 text-sm text-white outline-none placeholder:text-white/35" placeholder="Enter password"/><button type="button" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?'Hide password':'Show password'}>{showPassword?<EyeOff className="size-4"/>:<Eye className="size-4"/>}</button></div>
        {error && <p className="mt-4 rounded-xl border border-red-400/25 bg-red-400/10 p-3 text-xs text-red-200">{error}</p>}
        <button disabled={loading} className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#f4510b] px-5 py-4 text-sm font-black shadow-[0_16px_40px_rgba(244,81,11,.3)] transition hover:bg-[#ff6324] disabled:opacity-60">{loading?<LoaderCircle className="size-5 animate-spin"/>:null}{loading?'Opening your kitchen…':'Enter Moaka'}</button>
        <p className="mt-8 text-center text-[10px] uppercase tracking-[.18em] text-white/35">Personal plans • Private kitchen • Smart picks</p>
      </form>
    </section>
  </main>
}
