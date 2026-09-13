'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  ArrowRight,
  BookmarkCheck,
  Calendar,
  Check,
  CheckCircle2,
  ChefHat,
  Clock,
  Flame,
  Heart,
  Layers,
  LoaderCircle,
  Minus,
  Moon,
  Plus,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  Sun,
  Trash2,
  User,
  Users,
  Utensils,
  X,
  Coffee,
  CalendarDays,
  ShoppingBag,
  SlidersHorizontal,
  Camera,
  Images,
  ScanLine,
} from 'lucide-react'
import { CookingMode, type CookingStep } from './cooking-mode'
import { SmartCookModal } from './smart-cook-modal'
import { TomorrowPlanNightPrep } from './tomorrow-plan-night-prep'
import { withDefaultRecipes } from '@/lib/default-recipes'

export type RecipeItem = {
  id: string
  name: string
  title?: string
  description: string | null
  image_url: string | null
  meal_type: string
  category?: string | null
  cuisine?: string | null
  diet_type?: string | null
  difficulty?: string | null
  prep_time: number
  cook_time: number
  total_time?: number
  servings?: number
  tips?: string | null
  ingredients?: any[] | null
  instructions?: any[] | null
  preparationTasks?: any[]
  stepsList?: CookingStep[]
}

export type InventoryItem = {
  id: string
  ingredient_name: string
  quantity: number
  unit: string
  expiry_date?: string | null
}

export type MealPlanItem = {
  id: string
  recipe_id: string
  meal_type: string
  planned_date: string
  planned_time: string
  servings: number
  status: string
  recipes?: any
  tasks?: {
    id: string
    task_name: string
    description: string
    scheduled_at: string
    status: string
  }[]
}

export type ActiveTab = 'home' | 'plan' | 'kitchen' | 'favorites' | 'profile'

const QUICK_SEARCHES = [
  'Authentic Tonkotsu Ramen',
  'Butter Chicken Masala',
  'Baja Fish Tacos',
  'Crispy Falafel Bowl',
  'Classic Tiramisu',
]

export function CookingAssistantApp({ initialRecipes = [] }: { initialRecipes: any[] }) {
  // Navigation
  const [activeTab, setActiveTab] = useState<ActiveTab>('home')

  // Recipes State
  const [recipes, setRecipes] = useState<RecipeItem[]>(() =>
    withDefaultRecipes(
      initialRecipes.map((r) => ({
        id: r.id,
        name: r.name || r.title || 'Curated Dish',
        title: r.name || r.title || 'Curated Dish',
        description: r.description,
        image_url: r.image_url,
        meal_type: (r.meal_type || r.category || 'dinner').toLowerCase(),
        category: r.category || 'Dinner',
        cuisine: r.cuisine || 'Global',
        diet_type: r.diet_type || 'Vegetarian',
        difficulty: r.difficulty || 'Easy',
        prep_time: r.prep_time_minutes || r.prep_time || 15,
        cook_time: r.cook_time_minutes || r.cook_time || 20,
        total_time: r.total_time_minutes || (r.prep_time_minutes || 15) + (r.cook_time_minutes || 20),
        servings: r.default_servings || r.servings || 4,
        tips: r.tips,
        ingredients: r.ingredients || [],
        instructions: r.instructions || [],
      }))
    )
  )

  // Current Context Greeting
  const [greeting, setGreeting] = useState('Good Evening')
  const [contextualSlot, setContextualSlot] = useState<'breakfast' | 'lunch' | 'high_tea' | 'dinner'>('dinner')
  const [userName, setUserName] = useState('Ashish')

  // Search & Filters on Home
  const [searchQuery, setSearchQuery] = useState('')
  const [homeFilter, setHomeFilter] = useState<'all' | 'breakfast' | 'lunch' | 'high_tea' | 'dinner'>('all')
  const [searchingInternet, setSearchingInternet] = useState(false)
  const [internetStatus, setInternetStatus] = useState<string | null>(null)

  // Modals & Cooking Mode State
  const [selectedRecipeForPlan, setSelectedRecipeForPlan] = useState<RecipeItem | null>(null)
  const [activeCookingRecipe, setActiveCookingRecipe] = useState<RecipeItem | null>(null)
  const [activeMealPlanId, setActiveMealPlanId] = useState<string | undefined>(undefined)

  // Plan State
  const [mealPlans, setMealPlans] = useState<MealPlanItem[]>([])
  const [loadingPlans, setLoadingPlans] = useState(false)
  const [isGeneratingWeek, setIsGeneratingWeek] = useState(false)
  const [weekGeneratedNotice, setWeekGeneratedNotice] = useState(false)
  const [weekGenerateError, setWeekGenerateError] = useState<string | null>(null)

  // Kitchen Inventory State
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loadingInventory, setLoadingInventory] = useState(false)
  const [whatCanICookSuggestions, setWhatCanICookSuggestions] = useState<any[] | null>(null)
  const [loadingWhatCanICook, setLoadingWhatCanICook] = useState(false)
  const [newIngredientName, setNewIngredientName] = useState('')
  const [newIngredientQty, setNewIngredientQty] = useState('1')
  const [newIngredientUnit, setNewIngredientUnit] = useState('pieces')
  const [kitchenPhotos, setKitchenPhotos] = useState<Array<{ name: string; data: string; mimeType: string }>>([])
  const [scanningKitchen, setScanningKitchen] = useState(false)
  const [kitchenScanStatus, setKitchenScanStatus] = useState<string | null>(null)
  const [detectedKitchenItems, setDetectedKitchenItems] = useState<any[]>([])

  // Favorites & Feedback State
  const [feedbackHistory, setFeedbackHistory] = useState<any[]>([])
  const [cookCounts, setCookCounts] = useState<Record<string, number>>({})

  // User Profile & Preferences
  const [userProfile, setUserProfile] = useState<any>({
    name: 'Ashish',
    family_size: 4,
    cooking_skill: 'Intermediate',
    preferred_cooking_time: 30,
  })
  const [foodPreferences, setFoodPreferences] = useState<any>({
    diet_type: 'Vegetarian / Flexible',
    spice_level: 'Medium',
    cuisines: ['North Indian', 'South Indian', 'Italian', 'Asian'],
    allergies: [],
    favorite_ingredients: ['Paneer', 'Tomatoes', 'Basmati Rice', 'Garlic'],
  })

  // Admin Recipe Creation Form
  const [adminName, setAdminName] = useState('')
  const [adminMealType, setAdminMealType] = useState('dinner')
  const [adminCuisine, setAdminCuisine] = useState('North Indian')
  const [adminPrepTime, setAdminPrepTime] = useState('15')
  const [adminCookTime, setAdminCookTime] = useState('20')
  const [adminImageUrl, setAdminImageUrl] = useState('')
  const [adminIngredients, setAdminIngredients] = useState('Paneer, Tomatoes, Cashews, Cream, Ghee')
  const [adminSteps, setAdminSteps] = useState('Heat ghee and sauté aromatics\nAdd pureed tomato cashew sauce and simmer\nFold in paneer and finish with kasuri methi')
  const [adminSaving, setAdminSaving] = useState(false)
  const [adminNotice, setAdminNotice] = useState<string | null>(null)

  // Fetch initial context & recommendations
  useEffect(() => {
    async function fetchRecommendations() {
      try {
        const res = await fetch('/api/recommendations')
        const data = await res.json()
        if (data.greeting) setGreeting(data.greeting)
        if (data.userName) setUserName(data.userName)
        if (data.contextualSlot) setContextualSlot(data.contextualSlot)
      } catch (err) {
        console.warn('Recommendation fetch error:', err)
      }
    }
    fetchRecommendations()
  }, [])

  // Keep the hero recommendation aligned to the user's current local time.
  useEffect(() => {
    const updateCurrentMeal = () => {
      const hour = new Date().getHours()
      const slot = hour >= 5 && hour < 11 ? 'breakfast'
        : hour >= 11 && hour < 15 ? 'lunch'
        : hour >= 15 && hour < 19 ? 'high_tea'
        : 'dinner'
      const nextGreeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'
      setContextualSlot(slot)
      setGreeting(nextGreeting)
    }
    updateCurrentMeal()
    const timer = window.setInterval(updateCurrentMeal, 60_000)
    return () => window.clearInterval(timer)
  }, [])

  // Fetch meal plans
  const loadMealPlans = async () => {
    setLoadingPlans(true)
    try {
      const res = await fetch('/api/meal-plans')
      const data = await res.json()
      if (res.ok && data.plans?.length) {
        setMealPlans(data.plans)
      } else {
        const saved = window.localStorage.getItem('moaka-week-plan')
        if (saved) setMealPlans(JSON.parse(saved))
      }
    } catch (err) {
      console.warn('Load plans error:', err)
      const saved = window.localStorage.getItem('moaka-week-plan')
      if (saved) setMealPlans(JSON.parse(saved))
    } finally {
      setLoadingPlans(false)
    }
  }

  // Fetch inventory
  const loadInventory = async () => {
    setLoadingInventory(true)
    try {
      const res = await fetch('/api/kitchen/inventory')
      const data = await res.json()
      if (data.items) setInventory(data.items)
    } catch (err) {
      console.warn('Load inventory error:', err)
    } finally {
      setLoadingInventory(false)
    }
  }

  // Fetch feedback & favorites
  const loadFavorites = async () => {
    try {
      const res = await fetch('/api/feedback')
      const data = await res.json()
      if (data.feedback) setFeedbackHistory(data.feedback)
      if (data.cookCounts) setCookCounts(data.cookCounts)
    } catch (err) {
      console.warn('Load favorites error:', err)
    }
  }

  // Fetch profile
  const loadProfile = async () => {
    try {
      const res = await fetch('/api/profile')
      const data = await res.json()
      if (data.profile) setUserProfile(data.profile)
      if (data.preferences) setFoodPreferences(data.preferences)
    } catch (err) {
      console.warn('Load profile error:', err)
    }
  }

  useEffect(() => {
    loadMealPlans()
    loadInventory()
    loadFavorites()
    loadProfile()
  }, [])

  // Filtered recipes for Home
  const filteredRecipes = useMemo(() => {
    let list = recipes
    if (homeFilter !== 'all') {
      list = list.filter((r) => r.meal_type === homeFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.description && r.description.toLowerCase().includes(q)) ||
          (r.cuisine && r.cuisine.toLowerCase().includes(q))
      )
    }
    return list
  }, [recipes, homeFilter, searchQuery])

  // Contextual meal slot items for Section 16 & 17
  const breakfastSlot = useMemo(() => recipes.find((r) => r.meal_type === 'breakfast') || recipes[0], [recipes])
  const lunchSlot = useMemo(() => recipes.find((r) => r.meal_type === 'lunch') || recipes[1] || recipes[0], [recipes])
  const highTeaSlot = useMemo(() => recipes.find((r) => r.meal_type === 'high_tea') || recipes[2] || recipes[0], [recipes])
  const dinnerSlot = useMemo(() => recipes.find((r) => r.meal_type === 'dinner') || recipes[3] || recipes[0], [recipes])

  // Contextual priority slot
  const priorityMeal = useMemo(() => {
    if (contextualSlot === 'breakfast') return { slot: 'BREAKFAST', icon: Sun, item: breakfastSlot }
    if (contextualSlot === 'lunch') return { slot: 'LUNCH', icon: Utensils, item: lunchSlot }
    if (contextualSlot === 'high_tea') return { slot: 'HIGH TEA', icon: Coffee, item: highTeaSlot }
    return { slot: 'DINNER', icon: Moon, item: dinnerSlot }
  }, [contextualSlot, breakfastSlot, lunchSlot, highTeaSlot, dinnerSlot])

  // Active or upcoming plan for today
  const todayStr = new Date().toISOString().split('T')[0]
  const todayPlans = useMemo(() => mealPlans.filter((p) => p.planned_date === todayStr), [mealPlans, todayStr])
  const activePlanToday = todayPlans.find((p) => p.status === 'planned' || p.status === 'cooking' || p.status === 'preparing')

  // Search Internet & Add Recipe
  const handleSearchInternet = async (queryToSearch: string) => {
    const q = queryToSearch.trim()
    if (!q) return

    setSearchingInternet(true)
    setInternetStatus(`Searching culinary sources for "${q}"...`)

    try {
      const res = await fetch('/api/recipes/search-internet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      })
      const data = await res.json()

      if (data.recipe) {
        const newRec: RecipeItem = {
          id: data.recipe.id,
          name: data.recipe.name || data.recipe.title,
          title: data.recipe.name || data.recipe.title,
          description: data.recipe.description,
          image_url: data.recipe.image_url,
          meal_type: (data.recipe.meal_type || data.recipe.category || 'dinner').toLowerCase(),
          category: data.recipe.category || 'Dinner',
          cuisine: data.recipe.cuisine || 'Global',
          diet_type: data.recipe.diet_type || 'Vegetarian',
          difficulty: data.recipe.difficulty || 'Medium',
          prep_time: data.recipe.prep_time || 15,
          cook_time: data.recipe.cook_time || 25,
          total_time: (data.recipe.prep_time || 15) + (data.recipe.cook_time || 25),
          servings: data.recipe.servings || 4,
          tips: data.recipe.tips,
          ingredients: data.recipe.ingredients || [],
          instructions: data.recipe.instructions || [],
        }

        setRecipes((prev) => [newRec, ...prev.filter((r) => r.id !== newRec.id)])
        setInternetStatus(`Added "${newRec.name}" to your Supabase table!`)
        setTimeout(() => setInternetStatus(null), 3500)
      } else {
        setInternetStatus(data.error || 'Could not retrieve recipe.')
        setTimeout(() => setInternetStatus(null), 3500)
      }
    } catch (err: any) {
      setInternetStatus('Network error searching recipe.')
      setTimeout(() => setInternetStatus(null), 3500)
    } finally {
      setSearchingInternet(false)
    }
  }

  // Start Cooking direct trigger
  const handleStartCooking = async (recipeItem: RecipeItem, planId?: string) => {
    try {
      // Fetch full recipe details including structured steps from Supabase
      const res = await fetch(`/api/recipes/details?id=${recipeItem.id}`)
      const data = await res.json()
      if (data.recipe) {
        setActiveCookingRecipe({
          ...recipeItem,
          ...data.recipe,
        })
      } else {
        setActiveCookingRecipe(recipeItem)
      }
    } catch {
      setActiveCookingRecipe(recipeItem)
    }
    setActiveMealPlanId(planId)
  }

  // Toggle Preparation Task Done
  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed'
    try {
      await fetch('/api/meal-plans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: taskId,
          status: nextStatus,
        }),
      })
      loadMealPlans()
    } catch (err) {
      console.warn('Task toggle error:', err)
    }
  }

  // Generate My Week
  const buildLocalWeek = () => {
    const slots = [
      { type: 'breakfast', time: '08:30' },
      { type: 'lunch', time: '13:00' },
      { type: 'high_tea', time: '17:00' },
      { type: 'dinner', time: '20:30' },
    ]
    const plans: MealPlanItem[] = []
    const base = new Date()
    for (let day = 0; day < 7; day++) {
      const date = new Date(base)
      date.setDate(base.getDate() + day)
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      slots.forEach((slot, slotIndex) => {
        const matching = recipes.filter(recipe => recipe.meal_type === slot.type)
        const recipe = matching[day % Math.max(matching.length, 1)] || recipes[(day * 4 + slotIndex) % recipes.length]
        if (!recipe) return
        plans.push({
          id: `local-${dateStr}-${slot.type}`,
          recipe_id: recipe.id,
          meal_type: slot.type,
          planned_date: dateStr,
          planned_time: slot.time,
          servings: 4,
          status: 'planned',
          recipes: recipe,
          tasks: [],
        })
      })
    }
    window.localStorage.setItem('moaka-week-plan', JSON.stringify(plans))
    setMealPlans(plans)
    return plans
  }

  const handleGenerateWeek = async () => {
    setIsGeneratingWeek(true)
    setWeekGenerateError(null)
    try {
      const res = await fetch('/api/plan/generate-week', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Could not generate your weekly plan.')
      }
      if (data.success) {
        if (data.plans?.length) {
          setMealPlans(data.plans)
          window.localStorage.setItem('moaka-week-plan', JSON.stringify(data.plans))
        }
        setWeekGeneratedNotice(true)
        setTimeout(() => setWeekGeneratedNotice(false), 4000)
      }
    } catch (err: any) {
      console.error('Generate week error:', err)
      const localPlans = buildLocalWeek()
      if (localPlans.length) {
        setWeekGeneratedNotice(true)
        setWeekGenerateError(null)
        setTimeout(() => setWeekGeneratedNotice(false), 4000)
      } else {
        setWeekGenerateError(err?.message || 'Could not generate your weekly plan. Please try again.')
      }
    } finally {
      setIsGeneratingWeek(false)
    }
  }

  // What Can I Cook?
  const handleWhatCanICook = async () => {
    setLoadingWhatCanICook(true)
    try {
      const res = await fetch('/api/kitchen/what-can-i-cook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      setWhatCanICookSuggestions(data.suggestions || [])
    } catch (err) {
      console.error('What can I cook error:', err)
    } finally {
      setLoadingWhatCanICook(false)
    }
  }

  // Add Inventory Item
  const handleAddInventory = async () => {
    if (!newIngredientName.trim()) return
    try {
      await fetch('/api/kitchen/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredient_name: newIngredientName.trim(),
          quantity: Number(newIngredientQty) || 1,
          unit: newIngredientUnit,
        }),
      })
      setNewIngredientName('')
      loadInventory()
    } catch (err) {
      console.error('Add inventory error:', err)
    }
  }

  // Delete Inventory Item
  const handleDeleteInventory = async (id: string) => {
    try {
      await fetch(`/api/kitchen/inventory?id=${id}`, { method: 'DELETE' })
      setInventory((prev) => prev.filter((i) => i.id !== id))
    } catch (err) {
      console.error('Delete inventory error:', err)
    }
  }

  const prepareKitchenPhoto = (file: File) =>
    new Promise<{ name: string; data: string; mimeType: string }>((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(new Error(`Could not read ${file.name}`))
      reader.onload = () => {
        const image = new Image()
        image.onerror = () => reject(new Error(`Could not process ${file.name}`))
        image.onload = () => {
          const maxEdge = 1280
          const scale = Math.min(1, maxEdge / Math.max(image.width, image.height))
          const canvas = document.createElement('canvas')
          canvas.width = Math.max(1, Math.round(image.width * scale))
          canvas.height = Math.max(1, Math.round(image.height * scale))
          canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height)
          resolve({
            name: file.name,
            data: canvas.toDataURL('image/jpeg', 0.76),
            mimeType: 'image/jpeg',
          })
        }
        image.src = String(reader.result)
      }
      reader.readAsDataURL(file)
    })

  const handleKitchenPhotos = async (files: FileList | null) => {
    if (!files?.length) return
    setKitchenScanStatus(null)
    try {
      const remaining = Math.max(0, 8 - kitchenPhotos.length)
      const selected = Array.from(files).slice(0, remaining)
      const prepared = await Promise.all(selected.map(prepareKitchenPhoto))
      setKitchenPhotos((current) => [...current, ...prepared].slice(0, 8))
    } catch (error: any) {
      setKitchenScanStatus(error?.message || 'Could not prepare those photos.')
    }
  }

  const handleScanKitchen = async () => {
    if (kitchenPhotos.length === 0) return
    setScanningKitchen(true)
    setKitchenScanStatus('Scanning your kitchen…')
    try {
      const response = await fetch('/api/kitchen/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: kitchenPhotos.map(({ data, mimeType }) => ({ data, mimeType })) }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Kitchen scan failed.')

      const detected = Array.isArray(result.items) ? result.items : []
      const existingNames = new Set(inventory.map((item) => item.ingredient_name.trim().toLowerCase()))
      const newItems = detected.filter((item: any) => !existingNames.has(String(item.name).trim().toLowerCase()))

      await Promise.all(
        newItems.map((item: any) =>
          fetch('/api/kitchen/inventory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ingredient_name: item.name,
              quantity: item.quantity || 1,
              unit: item.unit || 'item',
            }),
          })
        )
      )

      setDetectedKitchenItems(detected)
      setKitchenScanStatus(`Found ${detected.length} items · added ${newItems.length} new`)
      setKitchenPhotos([])
      await loadInventory()
    } catch (error: any) {
      setKitchenScanStatus(error?.message || 'Kitchen scan failed. Try clearer photos.')
    } finally {
      setScanningKitchen(false)
    }
  }

  // Admin Save Recipe
  const handleAdminSaveRecipe = async () => {
    if (!adminName.trim()) return
    setAdminSaving(true)
    try {
      const parsedIngredients = adminIngredients
        .split(',')
        .map((i) => i.trim())
        .filter(Boolean)
      const parsedSteps = adminSteps
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((instruction, idx) => ({
          step_number: idx + 1,
          title: `Step ${idx + 1}`,
          instruction,
          duration_seconds: 180,
          temperature: 'Medium',
          visual_check: 'Proper aroma and color development.',
          tip: 'Taste for seasoning.',
        }))

      const res = await fetch('/api/admin/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: adminName.trim(),
          meal_type: adminMealType,
          cuisine: adminCuisine,
          prep_time_minutes: Number(adminPrepTime) || 15,
          cook_time_minutes: Number(adminCookTime) || 20,
          image_url:
            adminImageUrl ||
            'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&auto=format&fit=crop&q=80',
          ingredients: parsedIngredients,
          steps: parsedSteps,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setAdminNotice(`Recipe "${adminName}" saved to Supabase!`)
        setAdminName('')
        setTimeout(() => setAdminNotice(null), 3500)
        // Refresh recipes
        window.location.reload()
      }
    } catch (err) {
      console.error('Admin save error:', err)
    } finally {
      setAdminSaving(false)
    }
  }

  return (
    <div className="mise-app min-h-screen bg-[#fbf9f5] text-[#223129] pb-24 font-sans">
      {/* Moaka brand bar */}
      <header className="mise-header sticky top-0 z-30 border-b border-[#ded9cf] bg-[#fbf9f5]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="mise-logo flex size-12 items-center justify-center overflow-hidden rounded-2xl shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/moaka-icon.jpg" alt="Moaka M logo with Indian spices" className="size-full object-cover" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black tracking-[-.06em] text-[#25212a]">moaka</span>
                <span className="rounded-full bg-[#fff0e8] px-2 py-0.5 text-[9px] font-black text-[#f4510b] uppercase tracking-wider">
                  smart kitchen
                </span>
              </div>
              <p className="text-[11px] text-[#817c82]">cook what you have ✦</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('kitchen')}
              className="flex items-center gap-1.5 rounded-xl border border-[#ded9cf] bg-white px-3 py-1.5 text-xs font-semibold text-[#555047] hover:border-[#b25537] hover:text-[#b25537] transition shadow-xs"
            >
              <Sparkles className="size-3.5 text-[#b25537]" />
              <span className="hidden sm:inline">What Can I Cook?</span>
              <span className="sm:hidden">Pantry</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content by Active Tab */}
      <main className="mx-auto max-w-5xl px-4 pt-4 sm:px-6">
        {/* ===================== TAB 1: 🏠 HOME ===================== */}
        {activeTab === 'home' && (
          <div className="moaka-tab space-y-6">
            {/* Section 16 & 17: Context-Aware Greeting Banner */}
            <section className="mise-hero relative overflow-hidden rounded-[2rem] border p-5 sm:p-8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/gen-z-food-hero.jpg"
                alt="A vibrant bowl of spicy noodles with fresh herbs and dumplings"
                className="mise-hero-art"
              />
              <div className="relative z-10 flex min-h-[30rem] flex-col justify-between sm:min-h-[32rem]">
                <div className="max-w-xl">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#b25537]">
                    {greeting}, {userName} <span aria-hidden="true">✦</span>
                  </p>
                  <h1 className="mt-3 font-bold tracking-tight">
                    Crave it.<br />Cook it.<br /><em>Own it.</em>
                  </h1>
                  <p className="mt-4 max-w-sm text-sm font-medium text-[#554b60]">
                    Your next delicious move, picked from what you love and what is already in your kitchen.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <span className="mise-chip">⚡ Fast picks</span>
                    <span className="mise-chip">🥬 Pantry-aware</span>
                    <span className="mise-chip">✨ AI guided</span>
                  </div>
                </div>

                {/* Quick 1-Click Priority Action if Lunch/Dinner is Approaching */}
                {priorityMeal.item && (
                  <div className="mise-ready-card self-end rounded-2xl border p-3.5 flex items-center justify-between gap-4 sm:min-w-[280px]">
                    <div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#b25537]">
                        <priorityMeal.icon className="size-3 text-[#b25537]" />
                        {priorityMeal.slot} • BEST RIGHT NOW
                      </span>
                      <p className="font-serif text-sm font-bold text-[#223129] truncate max-w-[150px]">
                        {priorityMeal.item.name}
                      </p>
                      <span className="text-[11px] text-[#736e65]">
                        ⏱ {priorityMeal.item.cook_time} min
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleStartCooking(priorityMeal.item)}
                      className="rounded-xl bg-[#b25537] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#934329] transition flex items-center gap-1.5 shrink-0"
                    >
                      <Flame className="size-3.5" />
                      <span>Cook</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Active Plan Priority Banner (if user already scheduled a meal for today) */}
              {activePlanToday && (
                <div className="relative z-10 mt-4 rounded-2xl bg-[#223129] text-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-white/10 text-[#df9776]">
                      <Clock className="size-5" />
                    </span>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#df9776]">
                        Scheduled For Today • {activePlanToday.planned_time}
                      </p>
                      <h2 className="text-sm sm:text-base font-bold text-white">
                        {activePlanToday.recipes?.name || activePlanToday.recipes?.title || 'Today’s Meal'}
                      </h2>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const targetRec =
                          recipes.find((r) => r.id === activePlanToday.recipe_id) || activePlanToday.recipes
                        if (targetRec) handleStartCooking(targetRec, activePlanToday.id)
                      }}
                      className="rounded-xl bg-[#b25537] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#934329] transition flex items-center gap-1.5"
                    >
                      <Flame className="size-3.5" />
                      <span>START COOKING</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('plan')}
                      className="rounded-xl border border-white/20 px-3 py-2 text-xs font-medium text-white/80 hover:bg-white/10 transition"
                    >
                      Prep Timeline
                    </button>
                  </div>
                </div>
              )}
            </section>

            <div className="mise-flavor-ticker" aria-label="Food inspiration">
              <span>comfort bowls</span><b>✦</b><span>crispy bites</span><b>✦</b><span>desi classics</span><b>✦</b><span>weeknight wins</span><b>✦</b><span>made for you</span>
            </div>

            {/* Section 16: Four Core Daily Slot Cards */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#7841e7]">Today&apos;s edit</p><h2 className="text-2xl font-black tracking-tight text-[#191522]">Four moods. One hungry you.</h2></div>
                <span className="rounded-full bg-[#191522] px-3 py-1.5 text-[10px] font-bold text-white">tap → cook</span>
              </div>

              <div className="mise-meal-grid">
                {[
                  {
                    slot: 'BREAKFAST',
                    icon: Sun,
                    item: breakfastSlot,
                    badgeColor: 'text-[#d97706] bg-[#fef3c7]',
                  },
                  {
                    slot: 'LUNCH',
                    icon: Utensils,
                    item: lunchSlot,
                    badgeColor: 'text-[#059669] bg-[#d1fae5]',
                  },
                  {
                    slot: 'HIGH TEA',
                    icon: Coffee,
                    item: highTeaSlot,
                    badgeColor: 'text-[#b45309] bg-[#fef3c7]',
                  },
                  {
                    slot: 'DINNER',
                    icon: Moon,
                    item: dinnerSlot,
                    badgeColor: 'text-[#4338ca] bg-[#e0e7ff]',
                  },
                ].map(({ slot, icon: SlotIcon, item, badgeColor }, index) => {
                  if (!item) return null
                  return (
                    <div
                      key={slot}
                      className={`mise-meal-card mise-meal-card-${index + 1} group`}
                    >
                      <div>
                        {/* Slot Header */}
                        <div className="mise-meal-meta flex items-center justify-between">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${badgeColor}`}
                          >
                            <SlotIcon className="size-3" />
                            {slot}
                          </span>
                          <span className="text-[11px] font-medium text-[#736e65]">
                            {item.total_time || item.cook_time} min
                          </span>
                        </div>

                        {/* Image Thumbnail */}
                        {(
                          <div className="mise-meal-photo">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.image_url || '/gen-z-food-hero.jpg'}
                              alt={item.name}
                              className="size-full object-cover group-hover:scale-105 transition duration-300"
                              loading="lazy"
                              onError={(event) => {
                                event.currentTarget.onerror = null
                                event.currentTarget.src = '/gen-z-food-hero.jpg'
                              }}
                            />
                          </div>
                        )}

                        {/* Title */}
                        <h3 className="mise-meal-title line-clamp-1">
                          {item.name}
                        </h3>
                        <p className="mt-1 text-xs text-[#736e65] line-clamp-2">
                          {item.description || 'Nutritious homestyle recipe with fresh ingredients.'}
                        </p>
                      </div>

                      {/* Cook Button */}
                      <div className="mt-4 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedRecipeForPlan(item)}
                          className="flex-1 rounded-xl bg-[#223129] py-2 text-center text-xs font-bold text-white hover:bg-[#b25537] transition shadow-xs"
                        >
                          Cook this
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartCooking(item)}
                          title="Start cooking immediately"
                          className="flex size-8 items-center justify-center rounded-xl border border-[#ded9cf] text-[#b25537] hover:bg-[#faede6] transition"
                        >
                          <Flame className="size-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

          </div>
        )}

        {/* ===================== TAB 2: 📅 PLAN ===================== */}
        {activeTab === 'plan' && (
          <div className="moaka-tab space-y-6">
            {/* Header with Generate My Week */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-[#ded9cf] bg-white p-5 sm:p-7 shadow-xs">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#b25537]">Weekly Meal Calendar</p>
                <h1 className="mt-1 font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#223129]">
                  Smart Meal Plans &amp; Prep
                </h1>
                <p className="mt-1 text-xs text-[#736e65]">
                  Automated preparation timeline: the system tells you when to soak, chop, and start cooking.
                </p>
              </div>

              <button
                type="button"
                onClick={handleGenerateWeek}
                disabled={isGeneratingWeek}
                className="rounded-2xl bg-[#223129] px-5 py-3 text-xs font-bold text-white shadow-md hover:bg-[#15201a] transition flex items-center justify-center gap-2 shrink-0"
              >
                {isGeneratingWeek ? (
                  <>
                    <Sparkles className="size-4 animate-spin text-[#df9776]" />
                    <span>Planning Your Week...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4 text-[#df9776]" />
                    <span>✨ Generate My Week</span>
                  </>
                )}
              </button>
            </div>

            {weekGeneratedNotice && (
              <div className="rounded-2xl bg-[#eef6f0] border border-[#c4e2cd] p-4 text-[#245e38] flex items-center gap-2 text-xs font-semibold">
                <CheckCircle2 className="size-4 text-[#2e7d32]" />
                <span>Generated a balanced 7-day meal plan across Breakfast, Lunch, High Tea, and Dinner!</span>
              </div>
            )}

            {weekGenerateError && (
              <div role="alert" className="rounded-2xl border border-[#ffc8b2] bg-[#fff3ed] p-4 text-xs font-semibold text-[#a73508] flex items-center justify-between gap-3">
                <span>{weekGenerateError}</span>
                <button type="button" onClick={handleGenerateWeek} className="rounded-full bg-[#f4510b] px-3 py-1.5 font-bold text-white">Try again</button>
              </div>
            )}

            <TomorrowPlanNightPrep
              recipes={recipes}
              mealPlans={mealPlans}
              inventory={inventory}
              onRefreshPlans={loadMealPlans}
              onAddInventoryItem={(name, qty, unit) => {
                fetch('/api/kitchen/inventory', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ ingredient_name: name, quantity: qty, unit }),
                }).then(() => loadInventory())
              }}
              onRemoveInventoryItem={handleDeleteInventory}
              onStartCooking={(rec) => handleStartCooking(rec)}
              onSelectRecipeForPlan={(rec) => setSelectedRecipeForPlan(rec)}
            />

            {/* List of Scheduled Meals & Preparation Tasks */}
            {mealPlans.length === 0 ? (
              <div className="rounded-3xl border border-[#ded9cf] bg-white p-10 text-center space-y-3">
                <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#faede6] text-[#b25537]">
                  <CalendarDays className="size-7" />
                </div>
                <h3 className="font-serif text-lg font-bold text-[#223129]">No Meals Planned Yet</h3>
                <p className="text-xs text-[#736e65] max-w-sm mx-auto">
                  Click &ldquo;Generate My Week&rdquo; to let your AI assistant map out all your meals, or click [ Cook ] on any dish from Home.
                </p>
                <button
                  type="button"
                  onClick={handleGenerateWeek}
                  className="rounded-xl bg-[#b25537] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#934329] transition"
                >
                  Generate 7-Day Plan
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {mealPlans.map((plan) => {
                  const rec = plan.recipes || recipes.find((r) => r.id === plan.recipe_id)
                  const recName = rec?.name || rec?.title || 'Planned Dish'
                  return (
                    <div
                      key={plan.id}
                      className="rounded-2xl border border-[#ded9cf] bg-white p-5 shadow-xs space-y-4"
                    >
                      {/* Plan Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#f0ece3] pb-3">
                        <div className="flex items-center gap-3">
                          <span className="rounded-full bg-[#faede6] px-2.5 py-1 text-[11px] font-bold uppercase text-[#b25537]">
                            {plan.meal_type}
                          </span>
                          <div>
                            <h3 className="font-serif text-base font-bold text-[#223129]">{recName}</h3>
                            <p className="text-xs text-[#736e65]">
                              📅 {plan.planned_date} at ⏱ {plan.planned_time} • {plan.servings} servings
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              plan.status === 'completed'
                                ? 'bg-[#eef6f0] text-[#245e38]'
                                : plan.status === 'cooking'
                                ? 'bg-[#faede6] text-[#b25537] animate-pulse'
                                : 'bg-[#f0ece3] text-[#736e65]'
                            }`}
                          >
                            {plan.status}
                          </span>
                          {rec && (
                            <button
                              type="button"
                              onClick={() => handleStartCooking(rec, plan.id)}
                              className="rounded-xl bg-[#b25537] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#934329] transition flex items-center gap-1 shadow-xs"
                            >
                              <Flame className="size-3.5" />
                              <span>Start Cooking</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Automated Preparation Tasks (Section 20 & 21) */}
                      {plan.tasks && plan.tasks.length > 0 && (
                        <div className="rounded-xl bg-[#faf8f4] border border-[#f0ece3] p-3.5 space-y-2">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-[#736e65] flex items-center gap-1.5">
                            <span>🔔</span> Actionable Preparation Tasks
                          </p>

                          <div className="space-y-1.5">
                            {plan.tasks.map((task) => {
                              const isDone = task.status === 'completed'
                              return (
                                <div
                                  key={task.id}
                                  className="flex items-center justify-between gap-3 p-2 rounded-lg bg-white border border-[#ded9cf]/60"
                                >
                                  <div className="flex items-center gap-2.5">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleTask(task.id, task.status)}
                                      className={`flex size-5 items-center justify-center rounded-md border transition ${
                                        isDone
                                          ? 'border-[#2e7d32] bg-[#2e7d32] text-white'
                                          : 'border-[#ded9cf] hover:border-[#b25537]'
                                      }`}
                                    >
                                      {isDone && <Check className="size-3.5" />}
                                    </button>
                                    <div>
                                      <span
                                        className={`text-xs font-semibold ${
                                          isDone ? 'line-through text-[#8d887d]' : 'text-[#223129]'
                                        }`}
                                      >
                                        {task.task_name}
                                      </span>
                                      <span className="text-[11px] text-[#736e65] block">
                                        {task.description}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-mono text-[#8d887d]">
                                      {task.scheduled_at
                                        ? new Date(task.scheduled_at).toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                          })
                                        : 'Prep'}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleTask(task.id, task.status)}
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition ${
                                        isDone
                                          ? 'bg-[#eef6f0] text-[#245e38]'
                                          : 'bg-[#b25537] text-white hover:bg-[#934329]'
                                      }`}
                                    >
                                      {isDone ? 'Done ✓' : '[ Done ]'}
                                    </button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ===================== TAB 3: 🛒 KITCHEN ===================== */}
        {activeTab === 'kitchen' && (
          <div className="moaka-tab space-y-6">
            {/* Header & What Can I Cook trigger */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-[#ded9cf] bg-white p-5 sm:p-7 shadow-xs">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#b25537]">Pantry &amp; Fridge Inventory</p>
                <h1 className="mt-1 font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#223129]">
                  Kitchen Inventory
                </h1>
                <p className="mt-1 text-xs text-[#736e65]">
                  Track what you have at home. The AI recommends dishes using your available ingredients.
                </p>
              </div>

              {/* Specification 37: "✨ What Can I Cook?" */}
              <button
                type="button"
                onClick={handleWhatCanICook}
                disabled={loadingWhatCanICook}
                className="rounded-2xl bg-[#b25537] px-5 py-3 text-xs font-bold text-white shadow-md hover:bg-[#934329] transition flex items-center justify-center gap-2 shrink-0"
              >
                {loadingWhatCanICook ? (
                  <>
                    <Sparkles className="size-4 animate-spin text-white" />
                    <span>Analyzing Pantry...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4 text-white" />
                    <span>✨ What Can I Cook?</span>
                  </>
                )}
              </button>
            </div>

            {/* Camera and multi-photo pantry scan */}
            <section className="mise-kitchen-scan overflow-hidden rounded-3xl border border-[#ded9cf] bg-white p-5 sm:p-6 shadow-xs">
              <div className="mise-scan-layout">
                <div className="mise-scan-photo">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/premium-pantry.jpg" alt="A well-stocked refrigerator and pantry ready to scan" />
                  <span>AI pantry vision</span>
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-[#7841e7] text-white shadow-md">
                    <ScanLine className="size-5" />
                  </span>
                  <div>
                    <h2 className="text-base font-extrabold text-[#223129]">Scan your kitchen</h2>
                    <p className="text-xs text-[#736e65]">Snap shelves or upload up to 8 photos.</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <label className="cursor-pointer rounded-xl border border-[#ded9cf] bg-white px-3.5 py-2 text-xs font-bold text-[#223129] hover:border-[#7841e7] hover:text-[#7841e7]">
                    <span className="flex items-center gap-1.5"><Camera className="size-4" /> Take photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="sr-only"
                      onChange={(event) => {
                        handleKitchenPhotos(event.target.files)
                        event.currentTarget.value = ''
                      }}
                    />
                  </label>
                  <label className="cursor-pointer rounded-xl border border-[#ded9cf] bg-white px-3.5 py-2 text-xs font-bold text-[#223129] hover:border-[#7841e7] hover:text-[#7841e7]">
                    <span className="flex items-center gap-1.5"><Images className="size-4" /> Add photos</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="sr-only"
                      onChange={(event) => {
                        handleKitchenPhotos(event.target.files)
                        event.currentTarget.value = ''
                      }}
                    />
                  </label>
                </div>
              </div>

              {kitchenPhotos.length > 0 && (
                <div className="mt-4">
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-8">
                    {kitchenPhotos.map((photo, index) => (
                      <div key={`${photo.name}-${index}`} className="group relative aspect-square overflow-hidden rounded-xl bg-[#eee8f8]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photo.data} alt={`Kitchen photo ${index + 1}`} className="size-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setKitchenPhotos((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                          className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/65 text-white"
                          aria-label={`Remove kitchen photo ${index + 1}`}
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleScanKitchen}
                    disabled={scanningKitchen}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#7841e7] px-4 py-3 text-xs font-extrabold text-white shadow-md hover:bg-[#6330cc] disabled:opacity-60"
                  >
                    {scanningKitchen ? <LoaderCircle className="size-4 animate-spin" /> : <ScanLine className="size-4" />}
                    {scanningKitchen ? 'Identifying items…' : `Scan ${kitchenPhotos.length} photo${kitchenPhotos.length > 1 ? 's' : ''}`}
                  </button>
                </div>
              )}

              {kitchenScanStatus && (
                <p className="mt-3 text-xs font-bold text-[#6330cc]" role="status">{kitchenScanStatus}</p>
              )}

              {detectedKitchenItems.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {detectedKitchenItems.map((item, index) => (
                    <span key={`${item.name}-${index}`} className="rounded-full bg-[#efffd4] px-2.5 py-1 text-[10px] font-bold text-[#314b08]">
                      {item.name} ✓
                    </span>
                  ))}
                </div>
              )}
                </div>
              </div>
            </section>

            {/* AI "What Can I Cook?" Suggestions Result */}
            {whatCanICookSuggestions && (
              <div className="rounded-3xl border border-[#faede6] bg-[#fdfaf7] p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-[#b25537] text-white">
                      <Sparkles className="size-4" />
                    </span>
                    <h3 className="font-serif text-base font-bold text-[#223129]">
                      AI Dishes Matching Your Kitchen
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setWhatCanICookSuggestions(null)}
                    className="text-xs text-[#736e65] hover:text-[#223129]"
                  >
                    Clear
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {whatCanICookSuggestions.map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-[#e8e4db] bg-white p-4 shadow-xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold uppercase text-[#b25537]">
                            {item.meal_type || 'Dinner'} • ⏱ {item.time_minutes || 25}m
                          </span>
                        </div>
                        <h4 className="font-serif text-sm font-bold text-[#223129]">{item.title}</h4>
                        <p className="text-xs text-[#736e65] mt-1">{item.reason}</p>

                        {/* Used Ingredients */}
                        {item.used_ingredients && item.used_ingredients.length > 0 && (
                          <div className="mt-2.5 flex flex-wrap gap-1">
                            <span className="text-[10px] font-semibold text-[#245e38]">Uses:</span>
                            {item.used_ingredients.map((ing: string, i: number) => (
                              <span
                                key={i}
                                className="rounded bg-[#eef6f0] px-1.5 py-0.5 text-[10px] font-medium text-[#245e38]"
                              >
                                {ing}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="mt-3 pt-2 border-t border-[#f0ece3] flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            handleSearchInternet(item.title)
                            setActiveTab('home')
                          }}
                          className="rounded-xl bg-[#223129] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#b25537] transition"
                        >
                          Cook This Dish
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add New Ingredient Bar */}
            <div className="rounded-2xl border border-[#ded9cf] bg-white p-4 shadow-xs">
              <p className="text-xs font-bold uppercase tracking-wider text-[#736e65] mb-2">
                Add Ingredient to Kitchen
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Ingredient name (e.g., Paneer, Potatoes, Garlic)..."
                  value={newIngredientName}
                  onChange={(e) => setNewIngredientName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddInventory()
                  }}
                  className="flex-1 rounded-xl border border-[#ded9cf] bg-[#fbf9f5] px-3 py-2 text-xs text-[#223129] focus:border-[#b25537] focus:outline-none"
                />
                <input
                  type="number"
                  placeholder="Qty"
                  value={newIngredientQty}
                  onChange={(e) => setNewIngredientQty(e.target.value)}
                  className="w-20 rounded-xl border border-[#ded9cf] bg-[#fbf9f5] px-3 py-2 text-xs text-[#223129] focus:border-[#b25537] focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Unit (g, cups, pieces)"
                  value={newIngredientUnit}
                  onChange={(e) => setNewIngredientUnit(e.target.value)}
                  className="w-28 rounded-xl border border-[#ded9cf] bg-[#fbf9f5] px-3 py-2 text-xs text-[#223129] focus:border-[#b25537] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddInventory}
                  className="rounded-xl bg-[#223129] px-4 py-2 text-xs font-bold text-white hover:bg-[#15201a] transition flex items-center justify-center gap-1 shrink-0"
                >
                  <Plus className="size-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {/* Inventory List */}
            <div className="rounded-3xl border border-[#ded9cf] bg-white p-5 sm:p-6 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-base font-bold text-[#223129]">
                  Pantry Items ({inventory.length})
                </h3>
                <span className="text-xs text-[#736e65]">Synced to Supabase</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {inventory.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border border-[#e8e4db] bg-[#faf8f4] p-2.5 text-xs group"
                  >
                    <div>
                      <span className="font-bold text-[#223129] block truncate max-w-[120px]">
                        {item.ingredient_name}
                      </span>
                      <span className="text-[11px] text-[#736e65]">
                        {item.quantity} {item.unit}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteInventory(item.id)}
                      title="Remove item"
                      className="text-[#8d887d] hover:text-[#b25537] transition p-1"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 4: ❤️ FAVORITES ===================== */}
        {activeTab === 'favorites' && (
          <div className="moaka-tab space-y-6">
            <div className="rounded-3xl border border-[#ded9cf] bg-white p-5 sm:p-7 shadow-xs">
              <p className="text-xs font-bold uppercase tracking-widest text-[#b25537]">Cooking History</p>
              <h1 className="mt-1 font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#223129]">
                ❤️ Your Favorites &amp; Cook Again
              </h1>
              <p className="mt-1 text-xs text-[#736e65]">
                Recipes you love with frequent cook counts and past culinary taste feedback.
              </p>
            </div>

            {/* Frequent Cook Again Cards */}
            <div>
              <h3 className="font-serif text-base font-bold text-[#223129] mb-3">Cook Again</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {recipes.slice(0, 6).map((rec) => {
                  const cookedTimes = cookCounts[rec.id] || (rec.id.includes('paneer') ? 5 : rec.id.includes('dal') ? 3 : 1)
                  return (
                    <div
                      key={rec.id}
                      className="rounded-2xl border border-[#ded9cf] bg-white p-4 shadow-xs flex flex-col justify-between"
                    >
                      <div>
                        {(
                          <div className="relative mb-2 h-24 w-full overflow-hidden rounded-xl bg-[#e8e4db]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={rec.image_url || '/gen-z-food-hero.jpg'}
                              alt={rec.name}
                              className="size-full object-cover"
                              loading="lazy"
                              onError={(event) => {
                                event.currentTarget.onerror = null
                                event.currentTarget.src = '/gen-z-food-hero.jpg'
                              }}
                            />
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase text-[#b25537]">
                            Cooked {cookedTimes} times
                          </span>
                          <span className="text-[11px] text-[#736e65]">⏱ {rec.cook_time}m</span>
                        </div>
                        <h4 className="font-serif text-sm font-bold text-[#223129] mt-1 line-clamp-1">
                          {rec.name}
                        </h4>
                      </div>

                      <div className="mt-3 pt-2 border-t border-[#f0ece3] flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedRecipeForPlan(rec)}
                          className="flex-1 rounded-xl bg-[#223129] py-2 text-center text-xs font-bold text-white hover:bg-[#b25537] transition shadow-xs"
                        >
                          [ Cook Again ]
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartCooking(rec)}
                          className="flex size-8 items-center justify-center rounded-xl border border-[#ded9cf] text-[#b25537] hover:bg-[#faede6] transition"
                        >
                          <Flame className="size-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Feedback History */}
            {feedbackHistory.length > 0 && (
              <div className="rounded-3xl border border-[#ded9cf] bg-white p-5 shadow-xs space-y-3">
                <h3 className="font-serif text-base font-bold text-[#223129]">Past Recipe Reviews</h3>
                <div className="space-y-2">
                  {feedbackHistory.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-[#f0ece3] bg-[#faf8f4] p-3 text-xs flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-[#223129]">
                          {item.recipes?.name || item.recipes?.title || 'Recipe'}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-yellow-600 font-bold">
                            {'★'.repeat(item.rating || 5)}
                          </span>
                          {item.feedback_tags &&
                            item.feedback_tags.map((t: string) => (
                              <span
                                key={t}
                                className="rounded bg-[#faede6] px-1.5 py-0.5 text-[10px] font-semibold text-[#b25537]"
                              >
                                {t}
                              </span>
                            ))}
                        </div>
                      </div>
                      <span className="text-[11px] text-[#8d887d]">
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===================== TAB 5: 👤 PROFILE & ADMIN ===================== */}
        {activeTab === 'profile' && (
          <div className="moaka-tab space-y-6">
            <div className="rounded-3xl border border-[#ded9cf] bg-white p-5 sm:p-7 shadow-xs">
              <p className="text-xs font-bold uppercase tracking-widest text-[#b25537]">Preferences &amp; Management</p>
              <h1 className="mt-1 font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#223129]">
                User Profile &amp; Food Persona
              </h1>
              <p className="mt-1 text-xs text-[#736e65]">
                Tailoring your assistant&apos;s recommendations to your dietary lifestyle and family size.
              </p>
            </div>

            {/* Profile Summary Card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-[#ded9cf] bg-white p-5 shadow-xs space-y-3">
                <h3 className="font-serif text-base font-bold text-[#223129]">Cooking Profile</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-[#f0ece3]">
                    <span className="text-[#736e65]">Name:</span>
                    <span className="font-bold text-[#223129]">{userProfile.name}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#f0ece3]">
                    <span className="text-[#736e65]">Family Size:</span>
                    <span className="font-bold text-[#223129]">{userProfile.family_size} people</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#f0ece3]">
                    <span className="text-[#736e65]">Cooking Skill:</span>
                    <span className="font-bold text-[#223129]">{userProfile.cooking_skill}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[#736e65]">Target Prep/Cook Time:</span>
                    <span className="font-bold text-[#223129]">
                      ~{userProfile.preferred_cooking_time} minutes
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#ded9cf] bg-white p-5 shadow-xs space-y-3">
                <h3 className="font-serif text-base font-bold text-[#223129]">Dietary Persona</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-[#f0ece3]">
                    <span className="text-[#736e65]">Diet:</span>
                    <span className="font-bold text-[#223129]">{foodPreferences.diet_type}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#f0ece3]">
                    <span className="text-[#736e65]">Spice Level:</span>
                    <span className="font-bold text-[#223129]">{foodPreferences.spice_level}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#f0ece3]">
                    <span className="text-[#736e65]">Preferred Cuisines:</span>
                    <span className="font-bold text-[#223129]">
                      {(foodPreferences.cuisines || []).join(', ')}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[#736e65]">Favorites:</span>
                    <span className="font-bold text-[#223129]">
                      {(foodPreferences.favorite_ingredients || []).join(', ')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Specification 44: Admin Recipe Management Area */}
            <div className="rounded-3xl border border-[#ded9cf] bg-white p-5 sm:p-7 shadow-xs space-y-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#b25537]">Admin Area</p>
                <h3 className="font-serif text-xl font-bold text-[#223129]">
                  Manage &amp; Add Custom Recipes
                </h3>
                <p className="text-xs text-[#736e65]">
                  Admins can add new recipes with preparation tasks and steps directly into Supabase without code changes.
                </p>
              </div>

              {adminNotice && (
                <div className="rounded-xl bg-[#eef6f0] border border-[#c4e2cd] p-3 text-xs font-semibold text-[#245e38]">
                  {adminNotice}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-bold text-[#736e65] block mb-1">Recipe Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Kashmiri Dum Aloo"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="w-full rounded-xl border border-[#ded9cf] bg-[#fbf9f5] p-2.5 text-[#223129] focus:outline-none focus:border-[#b25537]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#736e65] block mb-1">Meal Type</label>
                  <select
                    value={adminMealType}
                    onChange={(e) => setAdminMealType(e.target.value)}
                    className="w-full rounded-xl border border-[#ded9cf] bg-[#fbf9f5] p-2.5 text-[#223129] focus:outline-none focus:border-[#b25537]"
                  >
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="high_tea">High Tea</option>
                    <option value="dinner">Dinner</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-[#736e65] block mb-1">Cuisine</label>
                  <input
                    type="text"
                    placeholder="North Indian, Italian, etc."
                    value={adminCuisine}
                    onChange={(e) => setAdminCuisine(e.target.value)}
                    className="w-full rounded-xl border border-[#ded9cf] bg-[#fbf9f5] p-2.5 text-[#223129] focus:outline-none focus:border-[#b25537]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-[#736e65] block mb-1">Prep Time (min)</label>
                    <input
                      type="number"
                      value={adminPrepTime}
                      onChange={(e) => setAdminPrepTime(e.target.value)}
                      className="w-full rounded-xl border border-[#ded9cf] bg-[#fbf9f5] p-2.5 text-[#223129] focus:outline-none focus:border-[#b25537]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[#736e65] block mb-1">Cook Time (min)</label>
                    <input
                      type="number"
                      value={adminCookTime}
                      onChange={(e) => setAdminCookTime(e.target.value)}
                      className="w-full rounded-xl border border-[#ded9cf] bg-[#fbf9f5] p-2.5 text-[#223129] focus:outline-none focus:border-[#b25537]"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="font-bold text-[#736e65] block mb-1">Image URL</label>
                  <input
                    type="text"
                    placeholder="https://images.unsplash.com/..."
                    value={adminImageUrl}
                    onChange={(e) => setAdminImageUrl(e.target.value)}
                    className="w-full rounded-xl border border-[#ded9cf] bg-[#fbf9f5] p-2.5 text-[#223129] focus:outline-none focus:border-[#b25537]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-bold text-[#736e65] block mb-1">Ingredients (comma-separated)</label>
                  <input
                    type="text"
                    value={adminIngredients}
                    onChange={(e) => setAdminIngredients(e.target.value)}
                    className="w-full rounded-xl border border-[#ded9cf] bg-[#fbf9f5] p-2.5 text-[#223129] focus:outline-none focus:border-[#b25537]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-bold text-[#736e65] block mb-1">Cooking Steps (one per line)</label>
                  <textarea
                    rows={3}
                    value={adminSteps}
                    onChange={(e) => setAdminSteps(e.target.value)}
                    className="w-full rounded-xl border border-[#ded9cf] bg-[#fbf9f5] p-2.5 text-[#223129] focus:outline-none focus:border-[#b25537]"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleAdminSaveRecipe}
                  disabled={adminSaving || !adminName.trim()}
                  className="rounded-xl bg-[#b25537] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#934329] disabled:opacity-40 transition flex items-center gap-1.5"
                >
                  <Plus className="size-4" />
                  <span>{adminSaving ? 'Saving to Supabase...' : 'Save Recipe to Supabase'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ===================== BOTTOM NAVIGATION (Section 33) ===================== */}
      <nav
        aria-label="Bottom Navigation"
        className="mise-nav fixed bottom-0 left-0 right-0 z-40 border-t border-[#ded9cf] bg-[#fbf9f5]/95 backdrop-blur-md"
      >
        <div className="mx-auto flex max-w-md items-center justify-around px-2 py-2">
          {[
            { id: 'home', label: 'Discover', icon: ChefHat },
            { id: 'plan', label: 'Plan', icon: Calendar },
            { id: 'kitchen', label: 'Kitchen', icon: ShoppingBag },
            { id: 'favorites', label: 'Favorites', icon: Heart },
            { id: 'profile', label: 'Profile', icon: User },
          ].map(({ id, label, icon: TabIcon }) => {
            const isActive = activeTab === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id as ActiveTab)}
                className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition min-w-[56px] ${
                  isActive ? 'text-[#b25537] font-bold' : 'text-[#736e65] hover:text-[#223129]'
                }`}
              >
                {id === 'kitchen' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src="/moaka-icon.jpg" alt="" className={`moaka-nav-logo ${isActive ? 'is-active' : ''}`} />
                ) : (
                  <TabIcon className={`size-5 transition ${isActive ? 'scale-110 text-[#f4510b]' : ''}`} />
                )}
                <span className="text-[10px] mt-0.5">{label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* ===================== SMART COOK BOTTOM SHEET (Section 19) ===================== */}
      {selectedRecipeForPlan && (
        <SmartCookModal
          recipe={selectedRecipeForPlan}
          onClose={() => setSelectedRecipeForPlan(null)}
          onPlanCreated={() => loadMealPlans()}
          onStartCookingNow={() => {
            const r = selectedRecipeForPlan
            setSelectedRecipeForPlan(null)
            handleStartCooking(r)
          }}
        />
      )}

      {/* ===================== DISTRACTION-FREE COOKING MODE (Section 22-25) ===================== */}
      {activeCookingRecipe && (
        <CookingMode
          recipe={activeCookingRecipe}
          mealPlanId={activeMealPlanId}
          onClose={() => setActiveCookingRecipe(null)}
          onCompleted={() => {
            loadMealPlans()
            loadFavorites()
          }}
        />
      )}
    </div>
  )
}
