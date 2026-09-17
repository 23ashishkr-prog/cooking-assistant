'use client'

import { useState } from 'react'
import {
  Calendar,
  Check,
  Clock,
  Minus,
  Plus,
  Sparkles,
  Users,
  X,
  Flame,
  ChefHat,
  ArrowRight,
} from 'lucide-react'

export type SmartCookModalProps = {
  recipe: {
    id: string
    name?: string
    title?: string
    description?: string | null
    image_url?: string | null
    prep_time?: number
    cook_time?: number
    total_time?: number
    servings?: number
    meal_type?: string
  }
  onClose: () => void
  onPlanCreated?: (plan: any) => void
  onStartCookingNow?: () => void
}

export function SmartCookModal({
  recipe,
  onClose,
  onPlanCreated,
  onStartCookingNow,
}: SmartCookModalProps) {
  const recipeName = recipe.name || recipe.title || 'Selected Recipe'
  
  // Date selection: today, tomorrow, or custom
  const [dateOption, setDateOption] = useState<'today' | 'tomorrow' | 'custom'>('today')
  const [customDate, setCustomDate] = useState(() => new Date().toISOString().split('T')[0])
  
  // Default serving time: lunch ~13:00 or dinner ~20:00 depending on current time
  const currentHour = new Date().getHours()
  const defaultTime = currentHour < 13 ? '13:00' : '20:00'
  const [servingTime, setServingTime] = useState(defaultTime)
  
  // Servings
  const [servings, setServings] = useState(recipe.servings || 4)
  
  // Submission & Timeline state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [planResult, setPlanResult] = useState<any>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleCreatePlan = async () => {
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      let targetDateStr = new Date().toISOString().split('T')[0]
      if (dateOption === 'tomorrow') {
        const tom = new Date()
        tom.setDate(tom.getDate() + 1)
        targetDateStr = tom.toISOString().split('T')[0]
      } else if (dateOption === 'custom') {
        targetDateStr = customDate
      }

      const res = await fetch('/api/meal-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipe_id: recipe.id,
          meal_type: recipe.meal_type || (servingTime < '11:00' ? 'breakfast' : servingTime < '16:00' ? 'lunch' : servingTime < '19:00' ? 'high_tea' : 'dinner'),
          planned_date: targetDateStr,
          planned_time: servingTime,
          servings,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setPlanResult(data)
        if (onPlanCreated) onPlanCreated(data.plan)
      } else {
        setSubmitError(data.error || 'Could not create the plan. Please try again.')
      }
    } catch (err: any) {
      console.error('Create plan error:', err)
      setSubmitError(err?.message || 'Could not connect to the planner.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Format time display
  const formatHourMin = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const dispH = h % 12 || 12
    return `${dispH}:${String(m).padStart(2, '0')} ${ampm}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-[#fdfcf9] p-6 shadow-2xl border border-[#ded9cf] space-y-5 animate-in fade-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e8e4db] pb-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-[#faede6] text-[#b25537]">
              <ChefHat className="size-5" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#b25537]">Smart Cooking Plan</p>
              <h2 className="text-base font-bold text-[#223129] leading-tight truncate max-w-[220px]">
                {recipeName}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[#736e65] hover:bg-[#f0ece3] transition"
          >
            <X className="size-5" />
          </button>
        </div>

        {!planResult ? (
          <div className="space-y-5">
            {/* 1. When? Today / Tomorrow / Choose Date */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[#736e65] block mb-2">
                When?
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'today', label: 'Today' },
                  { id: 'tomorrow', label: 'Tomorrow' },
                  { id: 'custom', label: 'Choose Date' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDateOption(opt.id as any)}
                    className={`rounded-xl border py-2.5 px-3 text-xs font-semibold transition text-center ${
                      dateOption === opt.id
                        ? 'border-[#b25537] bg-[#fbf3ef] text-[#b25537] ring-1 ring-[#b25537]'
                        : 'border-[#ded9cf] bg-white text-[#555047] hover:border-[#b25537]/50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {dateOption === 'custom' && (
                <div className="mt-2">
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="w-full rounded-xl border border-[#ded9cf] bg-white px-3 py-2 text-xs font-medium text-[#223129] focus:border-[#b25537] focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* 2. Serving Time */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#736e65]">
                  Serving Time
                </label>
                <span className="text-xs font-medium text-[#b25537]">
                  {formatHourMin(servingTime)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={servingTime}
                  onChange={(e) => setServingTime(e.target.value)}
                  className="flex-1 rounded-xl border border-[#ded9cf] bg-white px-4 py-3 text-sm font-semibold text-[#223129] focus:border-[#b25537] focus:outline-none"
                />
              </div>
            </div>

            {/* 3. Servings [- 4 +] */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[#736e65] block mb-2">
                Servings
              </label>
              <div className="flex items-center justify-between rounded-xl border border-[#ded9cf] bg-white p-2">
                <button
                  type="button"
                  onClick={() => setServings((prev) => Math.max(1, prev - 1))}
                  className="flex size-10 items-center justify-center rounded-lg bg-[#f0ece3] text-[#555047] hover:bg-[#e4ded3] transition"
                >
                  <Minus className="size-4" />
                </button>

                <div className="flex items-center gap-2">
                  <Users className="size-4 text-[#8d887d]" />
                  <span className="text-lg font-bold text-[#223129]">{servings}</span>
                  <span className="text-xs text-[#736e65]">people</span>
                </div>

                <button
                  type="button"
                  onClick={() => setServings((prev) => prev + 1)}
                  className="flex size-10 items-center justify-center rounded-lg bg-[#f0ece3] text-[#555047] hover:bg-[#e4ded3] transition"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </div>

            {/* 4. Single Prominent Action: [ CREATE PLAN ] */}
            <div className="pt-2">
              {submitError && (
                <div className="mb-3 flex items-start justify-between gap-3 rounded-xl border border-[#fecaca] bg-[#fff1f2] p-3 text-xs text-[#9f1239]" role="alert">
                  <span>{submitError}</span>
                  <button type="button" onClick={() => setSubmitError(null)} className="shrink-0" aria-label="Dismiss error">
                    <X className="size-4" />
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={handleCreatePlan}
                disabled={isSubmitting}
                className="w-full rounded-2xl bg-[#223129] py-4 px-6 text-center text-sm font-bold tracking-wide text-white uppercase shadow-md hover:bg-[#15201a] active:scale-[0.99] transition flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Sparkles className="size-4 animate-spin text-[#df9776]" />
                    <span>Calculating Preparation...</span>
                  </>
                ) : (
                  <span>CREATE PLAN</span>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Automated Preparation Calculation Results */
          <div className="space-y-4">
            <div className="rounded-2xl bg-[#eef6f0] border border-[#c4e2cd] p-4 text-[#245e38]">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Check className="size-4" />
                <span>Cooking Plan Created & Scheduled!</span>
              </div>
              <p className="text-xs text-[#337a4c] mt-1">
                Automated preparation timeline calculated for serving at {formatHourMin(servingTime)}.
              </p>
            </div>

            {/* Preparation Schedule */}
            <div className="rounded-2xl border border-[#ded9cf] bg-white p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-[#736e65]">
                Calculated Kitchen Timeline
              </p>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#faf8f4] border border-[#f0ece3]">
                  <span className="flex items-center gap-2 font-medium text-[#223129]">
                    <span>🔔</span> Prep Reminders
                  </span>
                  <span className="text-[#b25537] font-semibold">
                    {planResult.calculatedSchedule?.preparationCount || 2} tasks ready
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-[#faf8f4] border border-[#f0ece3]">
                  <span className="flex items-center gap-2 font-medium text-[#223129]">
                    <span>🍳</span> Start Cooking
                  </span>
                  <span className="text-[#223129] font-bold">
                    {planResult.calculatedSchedule?.cookingStartTime
                      ? new Date(planResult.calculatedSchedule.cookingStartTime).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Scheduled'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-[#faf8f4] border border-[#f0ece3]">
                  <span className="flex items-center gap-2 font-medium text-[#223129]">
                    <span>🍽</span> Meal Ready on Table
                  </span>
                  <span className="text-[#223129] font-bold">{formatHourMin(servingTime)}</span>
                </div>
              </div>
            </div>

            {/* Dual Action: Start Cooking Immediately or View in Plan */}
            <div className="flex gap-2 pt-2">
              {onStartCookingNow && (
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    onStartCookingNow()
                  }}
                  className="flex-1 rounded-xl bg-[#b25537] py-3 text-xs font-bold text-white shadow-sm hover:bg-[#934329] transition flex items-center justify-center gap-2"
                >
                  <Flame className="size-4" />
                  <span>Start Cooking Now</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-[#ded9cf] px-4 py-3 text-xs font-semibold text-[#555047] hover:bg-[#f0ece3] transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
