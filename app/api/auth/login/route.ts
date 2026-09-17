import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const fail = () => NextResponse.json({ error: 'Username/email or password is incorrect.' }, { status: 401 })
  if (req.headers.get('origin') && req.headers.get('origin') !== req.nextUrl.origin) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
  }
  try {
    const body = await req.json()
    if (typeof body.username !== 'string' || typeof body.password !== 'string' || !body.password || body.password.length > 1024) return fail()
    const username = body.username.trim().toLowerCase()
    if (!username || username.length > 254) return fail()
    let email = username
    if (!username.includes('@')) {
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SECRET_KEY) {
        return NextResponse.json({ error: 'Username login is not configured. Please use your full email address.' }, { status: 503 })
      }
      const { data, error } = await createAdminClient().from('login_usernames').select('email').eq('username', username).maybeSingle()
      // Ambiguous usernames fail closed; full email login remains available.
      if (error || !data?.email) return fail()
      email = data.email
    }
    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password: body.password })
    if (error) return fail()
    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'Unable to sign in. Please try again.' }, { status: 503 })
  }
}
