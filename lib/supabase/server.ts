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

const DEFAULT_RECIPES: Recipe[] = [
  {
    id: 'rec-1',
    title: 'Classic Shakshuka with Feta & Fresh Herbs',
    description: 'Poached eggs nestled in a spiced, simmered tomato and sweet bell pepper sauce topped with creamy feta.',
    image_url: 'https://images.unsplash.com/photo-1590412200988-a436970781fa?w=800&auto=format&fit=crop&q=80',
    category: 'Breakfast',
    prep_time: 15,
    cook_time: 20,
    servings: 2,
    difficulty: 'Easy',
  },
  {
    id: 'rec-2',
    title: 'Crispy Pan-Seared Salmon with Asparagus',
    description: 'Golden, crispy-skin salmon fillets served alongside garlic lemon butter roasted asparagus spears.',
    image_url: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&auto=format&fit=crop&q=80',
    category: 'Dinner',
    prep_time: 10,
    cook_time: 15,
    servings: 2,
    difficulty: 'Easy',
  },
  {
    id: 'rec-3',
    title: 'Mediterranean Quinoa Harvest Bowl',
    description: 'Warm fluffy quinoa, crisp Persian cucumbers, Kalamata olives, chickpeas, and a bright herb vinaigrette.',
    image_url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&auto=format&fit=crop&q=80',
    category: 'Lunch',
    prep_time: 15,
    cook_time: 10,
    servings: 2,
    difficulty: 'Easy',
  },
  {
    id: 'rec-4',
    title: 'Fluffy Ricotta & Wild Berry Pancakes',
    description: 'Cloud-like pancakes infused with whole-milk ricotta and lemon zest, drizzled with warm maple syrup.',
    image_url: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&auto=format&fit=crop&q=80',
    category: 'Breakfast',
    prep_time: 15,
    cook_time: 15,
    servings: 4,
    difficulty: 'Medium',
  },
  {
    id: 'rec-5',
    title: 'Tuscan White Bean & Lacinato Kale Soup',
    description: 'Hearty Italian vegetable stew with creamy cannellini beans, rosemary, parmesan rind, and tender kale.',
    image_url: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&auto=format&fit=crop&q=80',
    category: 'Dinner',
    prep_time: 15,
    cook_time: 25,
    servings: 4,
    difficulty: 'Easy',
  },
  {
    id: 'rec-6',
    title: 'Thai Basil Chicken (Pad Krapow Gai)',
    description: 'Fragrant minced chicken stir-fried at high heat with garlic, bird’s eye chilies, soy, and fresh holy basil.',
    image_url: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=800&auto=format&fit=crop&q=80',
    category: 'Dinner',
    prep_time: 15,
    cook_time: 12,
    servings: 3,
    difficulty: 'Medium',
  },
  {
    id: 'rec-7',
    title: 'Avocado Tartine with Soft-Boiled Egg',
    description: 'Thick toasted artisanal sourdough topped with smashed ripe avocado, microgreens, and a 6-minute jammy egg.',
    image_url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&auto=format&fit=crop&q=80',
    category: 'Breakfast',
    prep_time: 10,
    cook_time: 6,
    servings: 1,
    difficulty: 'Easy',
  },
  {
    id: 'rec-8',
    title: 'Grilled Lemon Herb Chicken Salad',
    description: 'Tender marinated chicken breast sliced over romaine, cherry tomatoes, pickled onions, and goddess dressing.',
    image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&auto=format&fit=crop&q=80',
    category: 'Lunch',
    prep_time: 15,
    cook_time: 12,
    servings: 2,
    difficulty: 'Easy',
  },
]

function createMockClient() {
  return {
    from: (_table: string) => {
      const queryObj: any = {
        _data: [...DEFAULT_RECIPES],
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
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://eqrjeuaifgolpakhafod.supabase.co'
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  return createSupabaseClient(supabaseUrl, serviceKey)
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
