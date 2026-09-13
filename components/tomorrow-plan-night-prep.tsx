'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import {
  AlertTriangle,
  Bell,
  BellRing,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Coffee,
  Flame,
  Moon,
  Plus,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Sun,
  Trash2,
  Utensils,
  X,
} from 'lucide-react'
import type { RecipeItem, InventoryItem, MealPlanItem } from './cooking-assistant-app'
import { cuisineFallbackImage } from '@/lib/recipe-personalization'

export type NightPrepTask = {
  id: string
  title: string
  description: string
  category: 'soak' | 'marinate' | 'defrost' | 'chop' | 'ferment' | 'custom'
  forMeal: 'breakfast' | 'lunch' | 'high_tea' | 'dinner' | 'general'
  isDone: boolean
  urgent: boolean // Must be done before the selected prep deadline
  estimatedMinutes: number
}

export type TomorrowIngredient = {
  id: string
  name: string
  amount: string
  mealSlot: 'breakfast' | 'lunch' | 'high_tea' | 'dinner' | 'general'
  inPantry: boolean
  checked: boolean
  isCustom?: boolean
}

interface TomorrowPlanNightPrepProps {
  recipes: RecipeItem[]
  mealPlans: MealPlanItem[]
  inventory: InventoryItem[]
  onRefreshPlans?: () => void
  onAddInventoryItem?: (name: string, qty: number, unit: string) => void
  onRemoveInventoryItem?: (id: string) => void
  onStartCooking?: (recipe: RecipeItem) => void
  onSelectRecipeForPlan?: (recipe: RecipeItem) => void
}

export function TomorrowPlanNightPrep({
  recipes,
  mealPlans,
  inventory,
  onRefreshPlans,
  onAddInventoryItem,
  onRemoveInventoryItem,
  onStartCooking,
  onSelectRecipeForPlan,
}: TomorrowPlanNightPrepProps) {
  // Use UTC and an explicit locale so the server and browser render the same date.
  const tomorrowDate = useMemo(() => {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() + 1)
    return d
  }, [])

  const tomorrowStr = useMemo(() => {
    return tomorrowDate.toISOString().split('T')[0]
  }, [tomorrowDate])

  const tomorrowFormatted = useMemo(() => {
    return tomorrowDate.toLocaleDateString('en-US', {
      timeZone: 'UTC',
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    })
  }, [tomorrowDate])

  // Tomorrow's Meals selection state
  const [tomorrowMeals, setTomorrowMeals] = useState<{
    breakfast: RecipeItem | null
    lunch: RecipeItem | null
    high_tea: RecipeItem | null
    dinner: RecipeItem | null
  }>({ breakfast: null, lunch: null, high_tea: null, dinner: null })

  // Synchronize when recipes or mealPlans load
  useEffect(() => {
    const tomorrowPlans = mealPlans.filter((plan) => plan.planned_date === tomorrowStr)
    const plannedRecipe = (slot: string) => {
      const plan = tomorrowPlans.find((item) => item.meal_type === slot)
      if (!plan) return null
      return (plan.recipes as RecipeItem | undefined) || recipes.find((recipe) => recipe.id === plan.recipe_id) || null
    }
    setTomorrowMeals({
      breakfast: plannedRecipe('breakfast'),
      lunch: plannedRecipe('lunch'),
      high_tea: plannedRecipe('high_tea'),
      dinner: plannedRecipe('dinner'),
    })
  }, [recipes, mealPlans, tomorrowStr])

  // Active sub-tab inside this component
  const [subTab, setSubTab] = useState<'prep' | 'items' | 'plan'>('prep')

  // Night Prep Tasks State
  const defaultNightTasks: NightPrepTask[] = useMemo(() => mealPlans
    .filter((plan) => plan.planned_date === tomorrowStr)
    .flatMap((plan) => (plan.tasks || []).map((task) => ({
      id: task.id,
      title: task.task_name,
      description: task.description || `Prepare for tomorrow's ${plan.meal_type}.`,
      category: 'custom' as const,
      forMeal: plan.meal_type as NightPrepTask['forMeal'],
      isDone: task.status === 'completed',
      urgent: true,
      estimatedMinutes: 10,
    }))), [mealPlans, tomorrowStr])

  const [nightTasks, setNightTasks] = useState<NightPrepTask[]>([])

  useEffect(() => {
    setNightTasks((current) => defaultNightTasks.map((task) => ({
      ...task,
      isDone: current.find((item) => item.id === task.id)?.isDone ?? task.isDone,
    })))
  }, [defaultNightTasks])

  // Save tasks to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`moaka_night_prep_${tomorrowStr}`, JSON.stringify(nightTasks))
      } catch (e) {
        console.warn('Failed to save night prep tasks', e)
      }
    }
  }, [nightTasks, tomorrowStr])

  // New task input state
  const [showAddTask, setShowAddTask] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDesc, setNewTaskDesc] = useState('')
  const [newTaskMeal, setNewTaskMeal] = useState<'breakfast' | 'lunch' | 'high_tea' | 'dinner' | 'general'>('lunch')

  // Item Checklist for Tomorrow State
  const defaultItems: TomorrowIngredient[] = useMemo(() => {
    const seen = new Set<string>()
    return (Object.entries(tomorrowMeals) as [TomorrowIngredient['mealSlot'], RecipeItem | null][])
      .flatMap(([mealSlot, recipe]) => (recipe?.ingredients || []).map((ingredient: any, index) => {
        const name = String(ingredient?.name || ingredient?.ingredient_name || ingredient || '').trim()
        return {
          id: `${recipe?.id}-${index}`,
          name,
          amount: String(ingredient?.measure || ingredient?.quantity || 'as needed'),
          mealSlot,
          inPantry: false,
          checked: false,
        }
      }))
      .filter((item) => item.name && !seen.has(item.name.toLowerCase()) && seen.add(item.name.toLowerCase()))
  }, [tomorrowMeals])

  const [itemsChecklist, setItemsChecklist] = useState<TomorrowIngredient[]>([])

  useEffect(() => {
    setItemsChecklist((current) => defaultItems.map((item) => ({
      ...item,
      checked: current.find((saved) => saved.name.toLowerCase() === item.name.toLowerCase())?.checked || false,
    })))
  }, [defaultItems])

  // Save items to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`moaka_tomorrow_items_${tomorrowStr}`, JSON.stringify(itemsChecklist))
      } catch (e) {
        console.warn('Failed to save tomorrow items', e)
      }
    }
  }, [itemsChecklist, tomorrowStr])

  // Sync availability to the actual inventory. This intentionally supports rollback.
  useEffect(() => {
    setItemsChecklist((prev) =>
      prev.map((item) => {
        const matchingInv = inventory.find((inv) =>
          item.name.toLowerCase().includes(inv.ingredient_name.toLowerCase()) ||
          inv.ingredient_name.toLowerCase().includes(item.name.toLowerCase())
        )
        return { ...item, inPantry: !!matchingInv }
      })
    )
  }, [inventory])

  // New item input state
  const [newItemName, setNewItemName] = useState('')
  const [newItemAmount, setNewItemAmount] = useState('')
  const [newItemMeal, setNewItemMeal] = useState<'breakfast' | 'lunch' | 'high_tea' | 'dinner' | 'general'>('general')

  // The selected prep deadline is the source of truth for the countdown and alert copy.
  const [reminderTime, setReminderTime] = useState('23:00')
  const deadlineOptions = [
    { value: '20:00', label: '8:00 PM' },
    { value: '20:30', label: '8:30 PM' },
    { value: '21:00', label: '9:00 PM' },
    { value: '21:30', label: '9:30 PM' },
    { value: '22:00', label: '10:00 PM' },
    { value: '22:30', label: '10:30 PM' },
    { value: '23:00', label: '11:00 PM' },
    { value: '23:30', label: '11:30 PM' },
    { value: '23:45', label: '11:45 PM' },
  ] as const

  const reminderTimeLabel = useMemo(() => {
    const [hours, minutes] = reminderTime.split(':').map(Number)
    const date = new Date(Date.UTC(2000, 0, 1, hours, minutes))
    return date.toLocaleTimeString('en-US', {
      timeZone: 'UTC',
      hour: 'numeric',
      minute: '2-digit',
    })
  }, [reminderTime])

  const updateReminderTime = (value: string) => {
    if (!/^([01]\\d|2[0-3]):[0-5]\\d$/.test(value)) return
    setReminderTime(value)
    setReminderNotificationFired(false)
    setReminderTriggerNotice(null)
  }
  const [timeLeftToReminder, setTimeLeftToReminder] = useState({ hours: 0, minutes: 0, seconds: 0 })
  const reminderCountdownReady = useRef(false)

  useEffect(() => {
    try {
      const savedTime = localStorage.getItem('mise_reminder_time')
      if (savedTime && /^([01]\\d|2[0-3]):[0-5]\\d$/.test(savedTime)) setReminderTime(savedTime)
    } catch (e) {
      console.warn('Failed to load reminder time', e)
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('mise_reminder_time', reminderTime)
    } catch (e) {
      console.warn('Failed to save reminder time', e)
    }
  }, [reminderTime])

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date()
      const [hours, minutes] = reminderTime.split(':').map(Number)
      const target = new Date(now)
      target.setHours(hours, minutes, 0, 0)
      if (target <= now) target.setDate(target.getDate() + 1)
      const totalSecs = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000))
      setTimeLeftToReminder({
        hours: Math.floor(totalSecs / 3600),
        minutes: Math.floor((totalSecs % 3600) / 60),
        seconds: totalSecs % 60,
      })
    }

    calculateTimeLeft()
    reminderCountdownReady.current = true
    const interval = setInterval(calculateTimeLeft, 1000)
    return () => clearInterval(interval)
  }, [reminderTime])

  // Reminder Alert Settings & State
  const [reminderEnabled, setReminderEnabled] = useState(true)
  const [reminderNotificationFired, setReminderNotificationFired] = useState(false)
  const [reminderTriggerNotice, setReminderTriggerNotice] = useState<string | null>(null)

  // Web Audio Chime player
  const playGentleChime = () => {
    if (typeof window === 'undefined') return
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioContextClass) return
      const audioCtx = new AudioContextClass()

      // Two-tone pleasant notification chime
      const now = audioCtx.currentTime

      const osc1 = audioCtx.createOscillator()
      const gain1 = audioCtx.createGain()
      osc1.type = 'sine'
      osc1.frequency.setValueAtTime(587.33, now) // D5
      gain1.gain.setValueAtTime(0.18, now)
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45)
      osc1.connect(gain1)
      gain1.connect(audioCtx.destination)
      osc1.start(now)
      osc1.stop(now + 0.45)

      const osc2 = audioCtx.createOscillator()
      const gain2 = audioCtx.createGain()
      osc2.type = 'sine'
      osc2.frequency.setValueAtTime(880, now + 0.15) // A5
      gain2.gain.setValueAtTime(0.2, now + 0.15)
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.75)
      osc2.connect(gain2)
      gain2.connect(audioCtx.destination)
      osc2.start(now + 0.15)
      osc2.stop(now + 0.75)
    } catch (err) {
      console.warn('Audio chime warning:', err)
    }
  }

  // Pending counts
  const pendingTasksCount = useMemo(() => nightTasks.filter((t) => !t.isDone).length, [nightTasks])
  const pendingItemsCount = useMemo(() => itemsChecklist.filter((i) => !i.checked).length, [itemsChecklist])
  const missingPantryCount = useMemo(() => itemsChecklist.filter((i) => !i.inPantry).length, [itemsChecklist])

  // Keep reminders inline so opening the page never interrupts the user.
  const handleTriggerReminder = () => {
    playGentleChime()
    setReminderNotificationFired(true)
    setReminderTriggerNotice(`Prep check: ${pendingTasksCount} tasks and ${pendingItemsCount} items before ${reminderTimeLabel}.`)
  }

  useEffect(() => {
    if (!reminderCountdownReady.current || !reminderEnabled || reminderNotificationFired) return
    if (timeLeftToReminder.hours === 0 && timeLeftToReminder.minutes === 0 && timeLeftToReminder.seconds === 0) {
      handleTriggerReminder()
    }
  }, [timeLeftToReminder, reminderEnabled, reminderNotificationFired])

  // Toggle night task completion
  const handleToggleTask = (id: string) => {
    setNightTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isDone: !t.isDone } : t))
    )
  }

  // Add custom night task
  const handleAddCustomTask = () => {
    if (!newTaskTitle.trim()) return
    const newTask: NightPrepTask = {
      id: `task-custom-${Date.now()}`,
      title: newTaskTitle.trim(),
      description: newTaskDesc.trim() || 'Custom night preparation task for tomorrow.',
      category: 'custom',
      forMeal: newTaskMeal,
      isDone: false,
      urgent: true,
      estimatedMinutes: 5,
    }
    setNightTasks((prev) => [newTask, ...prev])
    setNewTaskTitle('')
    setNewTaskDesc('')
    setShowAddTask(false)
  }

  // Delete night task
  const handleDeleteTask = (id: string) => {
    setNightTasks((prev) => prev.filter((t) => t.id !== id))
  }

  // Toggle item check
  const handleToggleItem = (id: string) => {
    setItemsChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    )
  }

  // Add custom item
  const handleAddCustomItem = () => {
    if (!newItemName.trim()) return
    const newItem: TomorrowIngredient = {
      id: `item-custom-${Date.now()}`,
      name: newItemName.trim(),
      amount: newItemAmount.trim() || '1 portion',
      mealSlot: newItemMeal,
      inPantry: true,
      checked: false,
      isCustom: true,
    }
    setItemsChecklist((prev) => [newItem, ...prev])
    setNewItemName('')
    setNewItemAmount('')
  }

  // Mark item as added to pantry
  const handleMarkItemInPantry = (item: TomorrowIngredient) => {
    setItemsChecklist((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, inPantry: true } : i))
    )
    if (onAddInventoryItem) {
      onAddInventoryItem(item.name, 1, 'portion')
    }
  }

  const handleMarkItemMissing = (item: TomorrowIngredient) => {
    setItemsChecklist((prev) =>
      prev.map((entry) => (entry.id === item.id ? { ...entry, inPantry: false, checked: false } : entry))
    )

    const matchingInventory = inventory.find((inventoryItem) =>
      item.name.toLowerCase().includes(inventoryItem.ingredient_name.toLowerCase()) ||
      inventoryItem.ingredient_name.toLowerCase().includes(item.name.toLowerCase())
    )

    if (matchingInventory) {
      onRemoveInventoryItem?.(matchingInventory.id)
    }
  }

  // Mark all items as checked/ready
  const handleMarkAllItemsReady = () => {
    setItemsChecklist((prev) => prev.map((i) => ({ ...i, checked: true })))
  }

  // Mark all night tasks as done
  const handleMarkAllTasksDone = () => {
    setNightTasks((prev) => prev.map((t) => ({ ...t, isDone: true })))
  }

  // Change a tomorrow meal slot
  const handleSwapTomorrowMeal = (slot: 'breakfast' | 'lunch' | 'high_tea' | 'dinner', recipe: RecipeItem) => {
    setTomorrowMeals((prev) => ({ ...prev, [slot]: recipe }))
  }

  return (
    <div
      id="tomorrow-plan-night-prep-section"
      className="mise-prep-panel rounded-3xl border border-[#ded9cf] bg-white p-5 sm:p-7 shadow-xs space-y-5"
    >
      {/* 1. Header with Live Prep Deadline Countdown & Reminder Status */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-[#f0ece3] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-[#faede6] text-[#b25537]">
              <Moon className="size-4 text-[#b25537]" />
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-[#b25537]">
              Night Prep &amp; Tomorrow Readiness
            </span>
            <span className="rounded-full bg-[#223129] px-2.5 py-0.5 text-[10px] font-bold text-white uppercase">
              {tomorrowFormatted}
            </span>
          </div>

          <h2 className="mt-1 font-serif text-xl sm:text-2xl font-bold tracking-tight text-[#223129]">
            Prep tonight. Cruise tomorrow.
          </h2>
          <p className="mt-1 text-xs text-[#736e65] max-w-2xl">
            Finish the essentials before your deadline.
          </p>
        </div>

                  {/* Prep Deadline Reminder Card & Trigger */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
          {/* Realtime Countdown pill */}
          <div
            id="prep-deadline-countdown-badge"
            className={`rounded-2xl border px-3.5 py-2 flex items-center gap-2.5 shadow-xs ${
              pendingTasksCount > 0
                ? 'border-[#f2cebe] bg-[#fef6f2] text-[#934329]'
                : 'border-[#c4e2cd] bg-[#eef6f0] text-[#245e38]'
            }`}
          >
            <Clock className="size-4 shrink-0" />
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider">
                {pendingTasksCount > 0 ? `Prep Deadline: ${reminderTimeLabel}` : 'All Prepped for Night'}
              </div>
              <div className="font-mono text-xs font-bold">
                {pendingTasksCount > 0 ? (
                  <>
                    {String(timeLeftToReminder.hours).padStart(2, '0')}h :{' '}
                    {String(timeLeftToReminder.minutes).padStart(2, '0')}m :{' '}
                    {String(timeLeftToReminder.seconds).padStart(2, '0')}s to {reminderTime}
                  </>
                ) : (
                  <span>Ready for a peaceful sleep</span>
                )}
              </div>
            </div>
          </div>

          <div className="mise-deadline-select flex items-center gap-2 rounded-2xl border border-[#ded9cf] bg-[#fffdf9] px-3 py-2">
            <label htmlFor="night-reminder-time" className="text-[10px] font-bold uppercase tracking-wider text-[#736e65]">
              Deadline
            </label>
            <select
              id="night-reminder-time"
              value={reminderTime}
              onChange={(event) => updateReminderTime(event.target.value)}
              aria-label="Choose prep deadline"
              className="cursor-pointer bg-transparent pr-6 text-xs font-extrabold text-[#223129] outline-none"
            >
              {deadlineOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          {/* Test / Manual Reminder Button */}
          <button
            type="button"
            id="test-prep-deadline-reminder-btn"
            onClick={handleTriggerReminder}
            className="rounded-2xl bg-[#223129] hover:bg-[#15201a] text-white px-3.5 py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs"
            title="Show prep reminder"
          >
            <BellRing className="size-3.5 text-[#df9776]" />
            <span>Check prep</span>
          </button>
        </div>
      </div>

      {/* Reminder Notification Banner if Alert is Fired */}
      {reminderTriggerNotice && (
        <div
          id="prep-deadline-reminder-banner"
          className="rounded-2xl bg-[#fff7ed] border border-[#ffedd5] p-3.5 flex items-center justify-between gap-3 text-xs text-[#9a3412]"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-xl bg-[#fed7aa] text-[#c2410c] shrink-0">
              <Bell className="size-4 animate-bounce" />
            </span>
            <div>
              <p className="font-bold text-[#7c2d12]">{reminderTriggerNotice}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setReminderTriggerNotice(null)}
            className="text-[#9a3412] hover:text-[#7c2d12] p-1"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* 2. Sub-tab Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f0ece3] pb-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            id="tab-night-prep-tasks"
            onClick={() => setSubTab('prep')}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
              subTab === 'prep'
                ? 'bg-[#223129] text-white shadow-xs'
                : 'bg-[#f0ece3] text-[#555047] hover:bg-[#e4ded3]'
            }`}
          >
            <Moon className="size-3.5" />
            <span>Pre-Ready Tonight</span>
            {pendingTasksCount > 0 && (
              <span className="size-4 rounded-full bg-[#b25537] text-white text-[10px] flex items-center justify-center font-mono">
                {pendingTasksCount}
              </span>
            )}
          </button>

          <button
            type="button"
            id="tab-item-checklist"
            onClick={() => setSubTab('items')}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
              subTab === 'items'
                ? 'bg-[#223129] text-white shadow-xs'
                : 'bg-[#f0ece3] text-[#555047] hover:bg-[#e4ded3]'
            }`}
          >
            <ShoppingBag className="size-3.5" />
            <span>Tomorrow Items Checklist</span>
            {missingPantryCount > 0 ? (
              <span className="rounded-full bg-[#fbeae5] px-1.5 py-0.2 text-[10px] font-bold text-[#b25537]">
                {missingPantryCount} missing
              </span>
            ) : (
              <span className="size-4 rounded-full bg-[#2e7d32] text-white text-[10px] flex items-center justify-center">
                ✓
              </span>
            )}
          </button>

          <button
            type="button"
            id="tab-tomorrow-plan"
            onClick={() => setSubTab('plan')}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
              subTab === 'plan'
                ? 'bg-[#223129] text-white shadow-xs'
                : 'bg-[#f0ece3] text-[#555047] hover:bg-[#e4ded3]'
            }`}
          >
            <Calendar className="size-3.5" />
            <span>Tomorrow&apos;s Menu (4 Slots)</span>
          </button>
        </div>

        {/* Quick Batch Action */}
        {subTab === 'prep' && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddTask((prev) => !prev)}
              className="rounded-xl border border-[#ded9cf] bg-white px-2.5 py-1 text-xs font-semibold text-[#555047] hover:border-[#b25537] hover:text-[#b25537] transition flex items-center gap-1"
            >
              <Plus className="size-3" />
              <span>Add Night Task</span>
            </button>
            <button
              type="button"
              onClick={handleMarkAllTasksDone}
              className="text-xs text-[#2e7d32] font-semibold hover:underline"
            >
              Mark All Done ✓
            </button>
          </div>
        )}

        {subTab === 'items' && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleMarkAllItemsReady}
              className="text-xs text-[#2e7d32] font-semibold hover:underline"
            >
              Mark All Have ✓
            </button>
          </div>
        )}
      </div>

      {/* ======================= VIEW 1: PRE-READY TONIGHT (NIGHT TASKS) ======================= */}
      {subTab === 'prep' && (
        <div className="space-y-4">
          {/* Progress Card */}
          <div className="rounded-2xl border border-[#ded9cf] bg-[#faf8f4] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#223129]">Night Prep Progress</span>
                <span className="text-xs text-[#736e65]">
                  ({nightTasks.length - pendingTasksCount} of {nightTasks.length} tasks ready)
                </span>
              </div>
              <p className="text-[11px] text-[#736e65] mt-0.5">
                Priority prep for tomorrow.
              </p>
            </div>

            {/* Progress bar */}
            <div className="flex items-center gap-3 sm:w-48">
              <div className="h-2 w-full rounded-full bg-[#ded9cf] overflow-hidden">
                <div
                  className="h-full bg-[#b25537] transition-all duration-300"
                  style={{
                    width: `${nightTasks.length > 0 ? ((nightTasks.length - pendingTasksCount) / nightTasks.length) * 100 : 0}%`,
                  }}
                />
              </div>
              <span className="font-mono text-xs font-bold text-[#223129]">
                {nightTasks.length > 0
                  ? Math.round(((nightTasks.length - pendingTasksCount) / nightTasks.length) * 100)
                  : 0}
                %
              </span>
            </div>
          </div>

          {/* Add custom night prep task box */}
          {showAddTask && (
            <div className="rounded-2xl border border-[#faede6] bg-[#fdfaf7] p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#223129]">Add Custom Night Prep Task</h4>
                <button
                  type="button"
                  onClick={() => setShowAddTask(false)}
                  className="text-xs text-[#736e65] hover:text-[#223129]"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Task title (e.g., Boil 4 potatoes for morning sandwich)"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="sm:col-span-2 rounded-xl border border-[#ded9cf] bg-white px-3 py-1.5 text-xs text-[#223129] focus:outline-none focus:border-[#b25537]"
                />
                <select
                  value={newTaskMeal}
                  onChange={(e: any) => setNewTaskMeal(e.target.value)}
                  className="rounded-xl border border-[#ded9cf] bg-white px-3 py-1.5 text-xs text-[#223129] focus:outline-none focus:border-[#b25537]"
                >
                  <option value="breakfast">For Tomorrow Breakfast</option>
                  <option value="lunch">For Tomorrow Lunch</option>
                  <option value="high_tea">For Tomorrow High Tea</option>
                  <option value="dinner">For Tomorrow Dinner</option>
                  <option value="general">General Pantry Prep</option>
                </select>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Brief note or instructions (optional)"
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  className="flex-1 rounded-xl border border-[#ded9cf] bg-white px-3 py-1.5 text-xs text-[#223129] focus:outline-none focus:border-[#b25537]"
                />
                <button
                  type="button"
                  onClick={handleAddCustomTask}
                  className="rounded-xl bg-[#b25537] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#934329] transition shrink-0"
                >
                  Save Task
                </button>
              </div>
            </div>
          )}

          {/* List of Night Tasks */}
          <div className="space-y-2.5">
            {nightTasks.map((task) => {
              const mealBadge =
                task.forMeal === 'breakfast'
                  ? 'bg-[#fef3c7] text-[#b45309]'
                  : task.forMeal === 'lunch'
                  ? 'bg-[#d1fae5] text-[#065f46]'
                  : task.forMeal === 'high_tea'
                  ? 'bg-[#fef3c7] text-[#92400e]'
                  : task.forMeal === 'dinner'
                  ? 'bg-[#e0e7ff] text-[#3730a3]'
                  : 'bg-[#f0ece3] text-[#555047]'

              return (
                <div
                  key={task.id}
                  className={`rounded-2xl border p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                    task.isDone
                      ? 'border-[#e4ded3] bg-[#f9f8f6] opacity-75'
                      : 'border-[#ded9cf] bg-white hover:border-[#b25537]/50 shadow-xs'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggleTask(task.id)}
                      className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-lg border transition ${
                        task.isDone
                          ? 'border-[#2e7d32] bg-[#2e7d32] text-white'
                          : 'border-[#ded9cf] hover:border-[#b25537] bg-white'
                      }`}
                      aria-label={task.isDone ? 'Mark task as pending' : 'Mark task as done'}
                    >
                      {task.isDone && <Check className="size-3.5" />}
                    </button>

                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`text-xs font-bold ${
                            task.isDone ? 'line-through text-[#8d887d]' : 'text-[#223129]'
                          }`}
                        >
                          {task.title}
                        </span>
                        <span className={`rounded-full px-2 py-0.2 text-[10px] font-bold uppercase ${mealBadge}`}>
                          {task.forMeal}
                        </span>
                        {task.urgent && !task.isDone && (
                          <span className="rounded-full bg-[#faede6] px-2 py-0.2 text-[10px] font-bold uppercase text-[#b25537]">
                            Before 11:59 PM
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[11px] text-[#736e65]">{task.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#f0ece3]">
                    <span className="text-[11px] text-[#736e65]">⏱ ~{task.estimatedMinutes} min</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggleTask(task.id)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                          task.isDone
                            ? 'bg-[#eef6f0] text-[#245e38] hover:bg-[#d5ecd8]'
                            : 'bg-[#223129] text-white hover:bg-[#b25537]'
                        }`}
                      >
                        {task.isDone ? 'Done ✓' : '[ Mark Done ]'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-[#8d887d] hover:text-[#b25537] p-1 transition"
                        title="Remove task"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Quick explanation box */}
          <div className="rounded-2xl border border-[#faede6] bg-[#fdfaf7] p-3.5 flex items-center gap-3 text-xs text-[#736e65]">
            <Sparkles className="size-4 text-[#df9776] shrink-0" />
            <p>
              Tomorrow&apos;s preparation and ingredients will appear here after a meal is planned.
            </p>
          </div>
        </div>
      )}

      {/* ======================= VIEW 2: TOMORROW ITEMS CHECKLIST ======================= */}
      {subTab === 'items' && (
        <div className="space-y-4">
          {/* Header info & Add Item input */}
          <div className="rounded-2xl border border-[#ded9cf] bg-[#faf8f4] p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#223129]">
                  Required Ingredients for Tomorrow
                </h4>
                <p className="text-[11px] text-[#736e65]">
                  Cross-referenced with your kitchen inventory. Items with ⚠️ are missing or need checking.
                </p>
              </div>
              <span className="text-xs font-bold text-[#b25537]">
                {missingPantryCount > 0 ? `${missingPantryCount} items missing from pantry` : 'All items in stock!'}
              </span>
            </div>

            {/* Quick Add Custom Item bar */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-[#ded9cf]/60">
              <input
                type="text"
                placeholder="Add ingredient (e.g. Kasuri Methi, Lemon, Bread)..."
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddCustomItem()
                }}
                className="flex-1 rounded-xl border border-[#ded9cf] bg-white px-3 py-1.5 text-xs text-[#223129] focus:outline-none focus:border-[#b25537]"
              />
              <input
                type="text"
                placeholder="Qty / Amount (e.g. 250g)"
                value={newItemAmount}
                onChange={(e) => setNewItemAmount(e.target.value)}
                className="w-28 rounded-xl border border-[#ded9cf] bg-white px-3 py-1.5 text-xs text-[#223129] focus:outline-none focus:border-[#b25537]"
              />
              <select
                value={newItemMeal}
                onChange={(e: any) => setNewItemMeal(e.target.value)}
                className="rounded-xl border border-[#ded9cf] bg-white px-3 py-1.5 text-xs text-[#223129] focus:outline-none focus:border-[#b25537]"
              >
                <option value="general">General</option>
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="high_tea">High Tea</option>
                <option value="dinner">Dinner</option>
              </select>
              <button
                type="button"
                onClick={handleAddCustomItem}
                className="rounded-xl bg-[#223129] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#15201a] transition flex items-center justify-center gap-1 shrink-0"
              >
                <Plus className="size-3.5" />
                <span>Add Item</span>
              </button>
            </div>
          </div>

          {/* Checklist Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {itemsChecklist.map((item) => (
              <div
                key={item.id}
                className={`rounded-xl border p-3 flex items-center justify-between gap-2.5 transition ${
                  item.checked
                    ? 'border-[#c4e2cd] bg-[#f7faf8]'
                    : !item.inPantry
                    ? 'border-[#f2cebe] bg-[#fdf8f5]'
                    : 'border-[#ded9cf] bg-white'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleToggleItem(item.id)}
                    className={`flex size-5 shrink-0 items-center justify-center rounded-md border transition ${
                      item.checked
                        ? 'border-[#2e7d32] bg-[#2e7d32] text-white'
                        : 'border-[#ded9cf] hover:border-[#b25537] bg-white'
                    }`}
                  >
                    {item.checked && <Check className="size-3.5" />}
                  </button>

                  <div className="min-w-0">
                    <span
                      className={`text-xs font-bold truncate block ${
                        item.checked ? 'line-through text-[#8d887d]' : 'text-[#223129]'
                      }`}
                    >
                      {item.name}
                    </span>
                    <div className="flex items-center gap-1.5 text-[10px] text-[#736e65]">
                      <span>{item.amount}</span>
                      <span>•</span>
                      <span className="capitalize">{item.mealSlot}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {item.inPantry ? (
                    <button
                      type="button"
                      onClick={() => handleMarkItemMissing(item)}
                      className="rounded-md bg-[#eef6f0] px-2 py-0.5 text-[10px] font-semibold text-[#245e38] hover:bg-[#fee2e2] hover:text-[#991b1b]"
                      title="Mark as missing"
                    >
                      In Kitchen ✓ · Undo
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleMarkItemInPantry(item)}
                      className="rounded-md bg-[#faede6] px-2 py-0.5 text-[10px] font-bold text-[#b25537] hover:bg-[#b25537] hover:text-white transition"
                      title="Click to mark as in stock"
                    >
                      + Have It
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================= VIEW 3: TOMORROW'S MENU (4 DAILY SLOTS) ======================= */}
      {subTab === 'plan' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#223129]">
                Tomorrow&apos;s 4 Daily Meal Slots
              </h4>
              <p className="text-[11px] text-[#736e65]">
                Scheduled dishes for tomorrow. Click &quot;Cook&quot; to begin anytime or swap with another recipe.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (onRefreshPlans) onRefreshPlans()
              }}
              className="flex items-center gap-1 text-xs text-[#736e65] hover:text-[#223129]"
            >
              <RefreshCw className="size-3" />
              <span>Refresh Menu</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                slot: 'BREAKFAST',
                key: 'breakfast' as const,
                icon: Sun,
                time: '8:30 AM',
                badgeColor: 'text-[#d97706] bg-[#fef3c7]',
                recipe: tomorrowMeals.breakfast,
              },
              {
                slot: 'LUNCH',
                key: 'lunch' as const,
                icon: Utensils,
                time: '1:30 PM',
                badgeColor: 'text-[#059669] bg-[#d1fae5]',
                recipe: tomorrowMeals.lunch,
              },
              {
                slot: 'HIGH TEA',
                key: 'high_tea' as const,
                icon: Coffee,
                time: '5:00 PM',
                badgeColor: 'text-[#b45309] bg-[#fef3c7]',
                recipe: tomorrowMeals.high_tea,
              },
              {
                slot: 'DINNER',
                key: 'dinner' as const,
                icon: Moon,
                time: '8:30 PM',
                badgeColor: 'text-[#4338ca] bg-[#e0e7ff]',
                recipe: tomorrowMeals.dinner,
              },
            ].map(({ slot, key, icon: SlotIcon, time, badgeColor, recipe }) => {
              if (!recipe) return null
              return (
                <div
                  key={slot}
                  className="rounded-2xl border border-[#ded9cf] bg-white p-3.5 flex flex-col justify-between hover:border-[#b25537]/60 transition shadow-xs group"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${badgeColor}`}
                      >
                        <SlotIcon className="size-3" />
                        {slot}
                      </span>
                      <span className="text-[10px] font-medium text-[#736e65]">⏱ {time}</span>
                    </div>

                    {/* Image */}
                    {(
                      <div className="relative mb-2.5 h-24 w-full overflow-hidden rounded-xl bg-[#f0ece3]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={recipe.image_url || cuisineFallbackImage(recipe.cuisine)}
                          alt={recipe.name}
                          className="size-full object-cover group-hover:scale-105 transition duration-300"
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.onerror = null
                            event.currentTarget.src = cuisineFallbackImage(recipe.cuisine)
                          }}
                        />
                      </div>
                    )}

                    <h4 className="font-serif text-xs font-bold text-[#223129] line-clamp-1">
                      {recipe.name}
                    </h4>
                    <p className="mt-1 text-[10px] text-[#736e65] line-clamp-2">
                      {recipe.description || 'Homestyle nutritious recipe.'}
                    </p>

                    <div className="mt-2 text-[10px] font-semibold text-[#b25537]">
                      Prep: {recipe.prep_time}m • Cook: {recipe.cook_time}m
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-[#f0ece3] flex items-center justify-between gap-1.5">
                    {/* Swap selector */}
                    <select
                      value={recipe.id}
                      onChange={(e) => {
                        const nextRec = recipes.find((r) => r.id === e.target.value)
                        if (nextRec) handleSwapTomorrowMeal(key, nextRec)
                      }}
                      className="text-[10px] rounded-lg border border-[#ded9cf] bg-[#fbf9f5] px-1.5 py-1 text-[#555047] focus:outline-none max-w-[100px] truncate"
                    >
                      {recipes.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => {
                        if (onStartCooking) onStartCooking(recipe)
                      }}
                      className="rounded-lg bg-[#b25537] px-2.5 py-1 text-[10px] font-bold text-white hover:bg-[#934329] transition flex items-center gap-1 shadow-xs"
                    >
                      <Flame className="size-3" />
                      <span>Cook</span>
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
}
