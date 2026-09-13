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

function createMockClient() {
  return {
    from: (_table: string) => {
      const queryObj: any = {
        _data: [],
        select(_fields?: string) {
          return queryObj
        },
        order(_column: string, _options?: { ascending?: boolean }) {
          return queryObj
        },
        limit(count: number) {
          queryObj._data = queryObj._data.slice(0, count)
          return queryObj
        },
        then(resolve: (val: { data: Recipe[]; error: null }) => void) {
          return Promise.resolve({ data: queryObj._data, error: null }).then(resolve)
        },
      }
      return queryObj
    },
  }
}

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  return createSupabaseClient(supabaseUrl || 'http://localhost:54321', serviceKey || 'missing-server-key')
}

export async function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    return createMockClient() as any
  }

  try {
    const cookieStore = await cookies()

    return createServerClient(
      supabaseUrl,
      supabaseKey,
      {
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
      },
    )
  } catch {
    return createMockClient() as any
  }
}
