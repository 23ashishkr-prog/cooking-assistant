import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export type Recipe = {
  id: string
  name?: string
  title: string
  description: string | null
  image_url: string | null
  meal_type?: string | null
  category: string | null
  cuisine?: string | null
  diet_type?: string | null
  prep_time_minutes?: number | null
  prep_time: number | null
  cook_time_minutes?: number | null
  cook_time: number | null
  total_time_minutes?: number | null
  default_servings?: number | null
  servings: number | null
  difficulty: string | null
  tips?: string | null
  ingredients?: any[] | null
  instructions?: any[] | null
}

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase is not configured')
  return { url, key }
}

export function createAdminClient() {
  const { url, key } = getSupabaseConfig()
  return createSupabaseClient(url, key)
}

export async function createClient() {
  const { url, key } = getSupabaseConfig()
  const cookieStore = await cookies()

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Server Components cannot always write cookies; proxy handles refresh.
        }
      },
    },
  })
}

export function getSupabaseErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Supabase request failed'
}

export { getSupabaseConfig }
