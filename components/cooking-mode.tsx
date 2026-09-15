'use client'

import { useState, useEffect, useRef } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Flame,
  HelpCircle,
  Mic,
  MicOff,
  Pause,
  Play,
  RotateCcw,
  Send,
  Sparkles,
  Volume2,
  X,
} from 'lucide-react'

export type CookingStep = {
  id?: string
  step_number: number
  title: string
  instruction: string
  duration_seconds?: number
  temperature?: string
  quantity?: string
  visual_check?: string
  tip?: string
}

export type CookingModeProps = {
  recipe: {
    id: string
    name?: string
    title?: string
    description?: string | null
    image_url?: string | null
    prep_time?: number
    cook_time?: number
    ingredients?: any[] | null
    stepsList?: CookingStep[]
    tips?: string | null
  }
  mealPlanId?: string
  onClose: () => void
  onCompleted?: () => void
}

export function CookingMode({ recipe, mealPlanId, onClose, onCompleted }: CookingModeProps) {
  const recipeName = recipe.name || recipe.title || 'Selected Recipe'
  
  // Prepare steps
  const steps: CookingStep[] = (recipe.stepsList && recipe.stepsList.length > 0)
    ? recipe.stepsList
    : [
        {
          step_number: 1,
          title: 'Prepare Mise en Place',
          instruction: 'Gather all ingredients, clean cutting board, and measure out seasonings.',
          duration_seconds: 180,
          temperature: 'Room Temp',
          visual_check: 'All vegetables chopped uniformly, pans clean and ready.',
          tip: 'Having everything prepped prevents burning aromatics later.',
        },
        {
          step_number: 2,
          title: 'Heat Cookware & Aromatics',
          instruction: 'Place pan over medium heat with oil or butter. Sauté aromatics until fragrant and translucent.',
          duration_seconds: 240,
          temperature: 'Medium',
          visual_check: 'Gentle sizzle with golden edges; onions translucent and sweet smelling.',
          tip: 'Do not let garlic brown too quickly or it turns bitter.',
        },
        {
          step_number: 3,
          title: 'Simmer Main Dish',
          instruction: 'Add the main ingredients and sauce/broth. Bring to a gentle simmer so flavors meld together completely.',
          duration_seconds: 480,
          temperature: 'Medium-Low',
          visual_check: 'Even gentle bubbles across the surface and rich appetizing aroma.',
          tip: 'Stir occasionally along bottom to ensure heat transfers evenly.',
        },
        {
          step_number: 4,
          title: 'Final Seasoning & Rest',
          instruction: 'Taste and adjust salt, pepper, or lemon juice. Turn off flame and let rest for 2 minutes before serving.',
          duration_seconds: 120,
          temperature: 'Off Heat',
          visual_check: 'Glossy sauce, vibrant colors, ready to plate piping hot.',
          tip: 'A splash of fresh herbs right at the end brightens up the dish.',
        },
      ]

  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const currentStep = steps[currentStepIndex] || steps[0]
  const totalSteps = steps.length
  const progressPercent = Math.round(((currentStepIndex + 1) / totalSteps) * 100)

  // Timer state
  const stepDuration = currentStep.duration_seconds || 180
  const [timeLeft, setTimeLeft] = useState(stepDuration)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [timerFinished, setTimerFinished] = useState(false)

  // AI Assistant Drawer state
  const [isAiOpen, setIsAiOpen] = useState(false)
  const [aiQuestion, setAiQuestion] = useState('')
  const [aiAnswer, setAiAnswer] = useState<string | null>(null)
  const [isAiLoading, setIsAiLoading] = useState(false)

  // Voice Assistant state
  const [isVoiceActive, setIsVoiceActive] = useState(false)
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const speechRecognitionRef = useRef<any>(null)
  const swipeStartX = useRef<number | null>(null)
  const ingredientName = (item: any) => String(item?.name || item?.ingredient_name || item || '').trim()
  const ingredientEmoji = (name: string) => {
    const value = name.toLowerCase()
    if (value.includes('tomato')) return '🍅'
    if (value.includes('potato')) return '🥔'
    if (value.includes('onion')) return '🧅'
    if (value.includes('garlic')) return '🧄'
    if (value.includes('chilli') || value.includes('pepper')) return '🌶️'
    if (value.includes('rice')) return '🍚'
    if (value.includes('paneer') || value.includes('cheese')) return '🧀'
    if (value.includes('egg')) return '🥚'
    if (value.includes('milk') || value.includes('cream')) return '🥛'
    if (value.includes('lemon') || value.includes('lime')) return '🍋'
    if (value.includes('carrot')) return '🥕'
    if (value.includes('leaf') || value.includes('spinach') || value.includes('coriander')) return '🌿'
    return '🥣'
  }
  const visibleIngredients = (Array.isArray(recipe.ingredients) ? recipe.ingredients : []).slice(0, 10)

  // Completion / Feedback state
  const [isCompleted, setIsCompleted] = useState(false)
  const [selectedRating, setSelectedRating] = useState<'loved' | 'good' | 'okay' | 'disliked' | null>(null)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [feedbackComment, setFeedbackComment] = useState('')
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false)
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)

  // Initialize cooking session in Supabase
  useEffect(() => {
    let mounted = true
    async function initSession() {
      try {
        const res = await fetch('/api/cooking-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipe_id: recipe.id,
            meal_plan_id: mealPlanId,
          }),
        })
        const data = await res.json()
        if (mounted && data.session) {
          setSessionId(data.session.id)
          if (data.session.current_step && data.session.current_step <= totalSteps) {
            setCurrentStepIndex(data.session.current_step - 1)
          }
        }
      } catch (err) {
        console.warn('[CookingMode] Session sync error:', err)
      }
    }
    initSession()
    return () => {
      mounted = false
    }
  }, [recipe.id, mealPlanId, totalSteps])

  // Reset timer on step change
  useEffect(() => {
    const dur = currentStep.duration_seconds || 180
    setTimeLeft(dur)
    setIsTimerRunning(false)
    setTimerFinished(false)
  }, [currentStepIndex, currentStep.duration_seconds])

  // Timer countdown loop
  useEffect(() => {
    if (!isTimerRunning) return

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsTimerRunning(false)
          setTimerFinished(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isTimerRunning])

  // Web Speech API for hands-free voice commands
  useEffect(() => {
    if (typeof window === 'undefined') return

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onresult = (event: any) => {
      const last = event.results.length - 1
      const text = event.results[last][0].transcript.trim().toLowerCase()
      setVoiceTranscript(text)

      if (text.includes('next') || text.includes('done') || text.includes('continue')) {
        handleStepDone()
      } else if (text.includes('start timer') || text.includes('start the timer')) {
        setIsTimerRunning(true)
      } else if (text.includes('pause') || text.includes('stop timer')) {
        setIsTimerRunning(false)
      } else if (text.includes('repeat') || text.includes('read step')) {
        readStepAloud()
      } else if (text.includes('salt') || text.includes('replace') || text.includes('thick')) {
        handleAskAi(text)
      }
    }

    recognition.onerror = () => {
      setIsVoiceActive(false)
    }

    recognition.onend = () => {
      if (isVoiceActive) {
        try {
          recognition.start()
        } catch {}
      }
    }

    speechRecognitionRef.current = recognition

    if (isVoiceActive) {
      try {
        recognition.start()
      } catch {}
    } else {
      try {
        recognition.stop()
      } catch {}
    }

    return () => {
      try {
        recognition.stop()
      } catch {}
    }
  }, [isVoiceActive, currentStepIndex])

  const readStepAloud = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(
      `Step ${currentStep.step_number}: ${currentStep.title}. ${currentStep.instruction}. ${currentStep.visual_check || ''}`
    )
    utterance.rate = 0.95
    window.speechSynthesis.speak(utterance)
  }

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  // Next / Done handler
  const handleStepDone = async () => {
    if (sessionId) {
      fetch('/api/cooking-session', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          current_step: currentStepIndex + 2,
          step_id: currentStep.id,
        }),
      }).catch(() => {})
    }

    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex((prev) => prev + 1)
    } else {
      // Finished all steps
      setIsCompleted(true)
      if (sessionId) {
        fetch('/api/cooking-session', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionId,
            status: 'completed',
          }),
        }).catch(() => {})
      }
    }
  }

  // Ask AI handler
  const handleAskAi = async (customQ?: string) => {
    const q = customQ || aiQuestion
    if (!q.trim()) return

    setIsAiLoading(true)
    setIsAiOpen(true)
    try {
      const res = await fetch('/api/ask-chef', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          recipe_title: recipeName,
          current_step_number: currentStep.step_number,
          current_step_title: currentStep.title,
          current_step_instruction: currentStep.instruction,
          ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
        }),
      })
      const data = await res.json()
      setAiAnswer(data.reply || 'Check temperature and add 2 tbsp liquid if gravy appears too dry.')
    } catch {
      setAiAnswer('Keep heat steady at medium-low and check moisture level. Stir gently to avoid sticking.')
    } finally {
      setIsAiLoading(false)
    }
  }

  // Save Feedback
  const handleSubmitFeedback = async () => {
    setIsSubmittingFeedback(true)
    try {
      const ratingMap = { loved: 5, good: 4, okay: 3, disliked: 2 }
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipe_id: recipe.id,
          rating: selectedRating ? ratingMap[selectedRating] : 5,
          liked: selectedRating === 'loved' || selectedRating === 'good',
          comment: feedbackComment,
          feedback_tags: selectedTags,
        }),
      })
      setFeedbackSubmitted(true)
      setTimeout(() => {
        if (onCompleted) onCompleted()
        onClose()
      }, 1200)
    } catch (err) {
      console.error('Feedback save error:', err)
      onClose()
    } finally {
      setIsSubmittingFeedback(false)
    }
  }

  // Celebration / Feedback View
  if (isCompleted) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[#fdfcf9] text-[#223129] overflow-y-auto">
        <div className="mx-auto w-full max-w-lg p-6 my-auto text-center">
          <div className="mx-auto mb-4 flex size-20 items-center justify-center rounded-full bg-[#faede6] text-[#b25537] shadow-inner">
            <Sparkles className="size-10 text-[#b25537] animate-pulse" />
          </div>

          <p className="text-xs font-semibold tracking-widest text-[#b25537] uppercase">Cooking Complete</p>
          <h1 className="mt-1 text-3xl font-serif font-bold tracking-tight text-[#223129]">
            {recipeName} Ready!
          </h1>
          <p className="mt-2 text-sm text-[#736e65]">
            Delicious food prepared with care. Take a moment to record your taste notes so your AI assistant learns your preferences.
          </p>

          {!feedbackSubmitted ? (
            <div className="mt-8 rounded-2xl border border-[#e8e4db] bg-white p-6 shadow-sm text-left">
              <h2 className="text-base font-semibold text-[#223129]">How was it?</h2>
              
              {/* Rating selection */}
              <div className="mt-3 grid grid-cols-4 gap-2">
                {[
                  { id: 'loved', label: 'Loved it', emoji: '❤️' },
                  { id: 'good', label: 'Good', emoji: '👍' },
                  { id: 'okay', label: 'Okay', emoji: '😐' },
                  { id: 'disliked', label: 'Didn’t like', emoji: '👎' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedRating(item.id as any)}
                    className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-3 text-xs font-medium transition ${
                      selectedRating === item.id
                        ? 'border-[#b25537] bg-[#fbf3ef] text-[#b25537] font-semibold ring-2 ring-[#b25537]/20'
                        : 'border-[#e8e4db] bg-[#faf8f4] text-[#555047] hover:border-[#ded9cf]'
                    }`}
                  >
                    <span className="text-xl">{item.emoji}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>

              {/* Tag options */}
              <div className="mt-5">
                <p className="text-xs font-semibold text-[#736e65] uppercase tracking-wider mb-2">Flavor & Experience Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {['Perfect', 'Too spicy', 'Too salty', 'Too oily', 'Too complicated', 'Cook Again'].map((tag) => {
                    const active = selectedTags.includes(tag)
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          setSelectedTags((prev) =>
                            active ? prev.filter((t) => t !== tag) : [...prev, tag]
                          )
                        }}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                          active
                            ? 'bg-[#b25537] text-white'
                            : 'bg-[#f0ece3] text-[#555047] hover:bg-[#e6e1d6]'
                        }`}
                      >
                        {tag}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Optional comment */}
              <div className="mt-4">
                <input
                  type="text"
                  placeholder="Notes for next time (e.g., used slightly less chili)..."
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  className="w-full rounded-xl border border-[#ded9cf] bg-[#fdfcf9] px-3.5 py-2.5 text-xs text-[#223129] placeholder-[#8d887d] focus:border-[#b25537] focus:outline-none"
                />
              </div>

              {/* Save button */}
              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSubmitFeedback}
                  disabled={isSubmittingFeedback}
                  className="flex-1 rounded-xl bg-[#b25537] py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-[#934329] transition flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="size-4" />
                  {isSubmittingFeedback ? 'Saving to Supabase...' : 'Save & Finish'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-[#ded9cf] px-4 py-3.5 text-sm font-medium text-[#736e65] hover:bg-[#f0ece3] transition"
                >
                  Skip
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-8 rounded-2xl bg-[#eef6f0] border border-[#c4e2cd] p-6 text-[#245e38]">
              <Check className="size-8 mx-auto mb-2 text-[#245e38]" />
              <p className="font-semibold text-base">Feedback Saved to Supabase!</p>
              <p className="text-xs mt-1 text-[#337a4c]">Your AI recommendations have been updated.</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#fdfcf9] text-[#223129] select-none">
      {/* 1. Header with Distraction-Free Navigation */}
      <header className="flex items-center justify-between border-b border-[#e8e4db] px-4 py-3 bg-white/80 backdrop-blur-md">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#736e65] hover:text-[#223129] transition py-1 px-2 rounded-lg"
        >
          <ArrowLeft className="size-4" />
          <span>Exit</span>
        </button>

        <div className="text-center truncate px-2 max-w-[200px] sm:max-w-md">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#b25537]">Cooking Mode</p>
          <h1 className="text-sm font-bold text-[#223129] truncate">{recipeName}</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Voice Command Button */}
          <button
            type="button"
            onClick={() => setIsVoiceActive(!isVoiceActive)}
            title={isVoiceActive ? 'Voice listening active' : 'Turn on voice control'}
            className={`flex size-9 items-center justify-center rounded-xl transition ${
              isVoiceActive
                ? 'bg-[#b25537] text-white shadow-sm ring-2 ring-[#b25537]/30 animate-pulse'
                : 'bg-[#f0ece3] text-[#736e65] hover:bg-[#e4ded3]'
            }`}
          >
            {isVoiceActive ? <Mic className="size-4" /> : <MicOff className="size-4" />}
          </button>

          {/* Read Step Aloud */}
          <button
            type="button"
            onClick={readStepAloud}
            title="Read step aloud"
            className="flex size-9 items-center justify-center rounded-xl bg-[#f0ece3] text-[#736e65] hover:bg-[#e4ded3] transition"
          >
            <Volume2 className="size-4" />
          </button>
        </div>
      </header>

      {/* 2. Visual Progress Bar */}
      <div className="w-full bg-[#eae5db] h-1.5">
        <div
          className="h-1.5 bg-[#b25537] transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Voice Status Pill if active */}
      {isVoiceActive && (
        <div className="bg-[#b25537]/10 border-b border-[#b25537]/20 px-4 py-1.5 flex items-center justify-between text-xs text-[#b25537]">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="size-2 rounded-full bg-[#b25537] animate-ping" />
            Voice active: say &quot;Next step&quot;, &quot;Start timer&quot;, or &quot;Repeat&quot;
          </span>
          {voiceTranscript && (
            <span className="text-[11px] italic truncate max-w-[140px] opacity-80">&ldquo;{voiceTranscript}&rdquo;</span>
          )}
        </div>
      )}

      {/* 3. Main Stage: Focused Current Step Card */}
      <main className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,#fff4ed_0,#fdfcf9_44%)] px-4 py-5 sm:py-7 max-w-4xl mx-auto w-full flex flex-col justify-between gap-5">
        <div className="space-y-4" onTouchStart={(event) => { swipeStartX.current = event.touches[0]?.clientX ?? null }} onTouchEnd={(event) => {
          if (swipeStartX.current === null) return
          const distance = event.changedTouches[0].clientX - swipeStartX.current
          if (distance < -55 && currentStepIndex < totalSteps - 1) handleStepDone()
          if (distance > 55 && currentStepIndex > 0) setCurrentStepIndex(index => index - 1)
          swipeStartX.current = null
        }}>
          {/* Step Number & Visual Status */}
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#faede6] text-[#b25537] text-xs font-bold uppercase tracking-wider">
              Step {currentStep.step_number} of {totalSteps}
            </span>

            {currentStep.temperature && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-[#736e65] bg-[#f0ece3] px-2.5 py-1 rounded-full">
                <Flame className="size-3.5 text-[#b25537]" />
                {currentStep.temperature}
              </span>
            )}
          </div>

          <section className="group relative h-52 overflow-hidden rounded-[2rem] bg-[#21151e] shadow-[0_18px_50px_rgba(71,35,25,.2)] sm:h-72">
            <img src={recipe.image_url || '/moaka-login-3d.png'} alt={recipeName} className="size-full object-cover opacity-80 transition duration-500 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-7">
              <p className="text-[10px] font-black uppercase tracking-[.25em] text-[#ff8a57]">Swipe for the next step →</p>
              <h2 className="mt-2 max-w-2xl font-serif text-2xl font-black leading-tight sm:text-4xl">{currentStep.title}</h2>
            </div>
          </section>

          {/* Core Instruction */}
          <p className="text-base sm:text-lg text-[#3b3730] leading-relaxed font-sans bg-white border border-[#e8e4db] rounded-2xl p-5 shadow-sm">
            {currentStep.instruction}
          </p>

          {/* Visual Check / Sensory Cue */}
          {currentStep.visual_check && (
            <div className="rounded-xl bg-[#f5f8f5] border border-[#d6e5d8] p-3.5 flex items-start gap-2.5 text-xs text-[#245e38]">
              <CheckCircle2 className="size-4 text-[#2e7d32] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block text-[11px] uppercase tracking-wider text-[#1e582d]">
                  Visual Check / Look For:
                </span>
                <span className="text-[#2b4c34] font-medium leading-relaxed">{currentStep.visual_check}</span>
              </div>
            </div>
          )}

          {/* Chef Tip */}
          {currentStep.tip && (
            <div className="rounded-xl bg-[#fffaf2] border border-[#fae6cc] p-3 flex items-start gap-2 text-xs text-[#8c5914]">
              <span className="font-bold text-sm">💡</span>
              <span className="font-medium leading-relaxed">{currentStep.tip}</span>
            </div>
          )}

          {visibleIngredients.length > 0 && <section className="relative -mt-8 rounded-[2rem] border border-[#eadfd4] bg-white p-4 shadow-[0_-10px_35px_rgba(47,31,24,.12)] sm:p-5">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[#ddd5cd]"/><div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.22em] text-[#f4510b]">Fridge</p><h3 className="mt-1 text-sm font-black text-[#251f27]">Ready for this step</h3></div><span className="rounded-full bg-[#eef6f0] px-2.5 py-1 text-[10px] font-bold text-[#287044]">✓ {visibleIngredients.length} items</span></div>
            <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
              {visibleIngredients.map((item, index) => { const name = ingredientName(item); return <div key={`${name}-${index}`} className="min-w-20 text-center"><div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#fff8f1] to-[#f3e8dc] text-3xl shadow-inner ring-1 ring-[#eadfd4]">{ingredientEmoji(name)}</div><p className="mt-2 line-clamp-2 text-[10px] font-bold leading-tight text-[#514a50]">{name}</p></div> })}
            </div>
          </section>}

          {/* Step Countdown Timer Block */}
          <div className="rounded-2xl border border-[#ded9cf] bg-white p-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`flex size-12 items-center justify-center rounded-xl transition ${
                  timerFinished
                    ? 'bg-[#b25537] text-white animate-bounce'
                    : isTimerRunning
                    ? 'bg-[#faede6] text-[#b25537]'
                    : 'bg-[#f0ece3] text-[#736e65]'
                }`}
              >
                <Clock className="size-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-wider uppercase text-[#8d887d]">
                  {timerFinished ? "⏰ TIME'S UP - CHECK FOOD" : 'Step Timer'}
                </p>
                <p
                  className={`text-2xl font-mono font-bold ${
                    timerFinished ? 'text-[#b25537]' : isTimerRunning ? 'text-[#223129]' : 'text-[#736e65]'
                  }`}
                >
                  {formatTimer(timeLeft)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition ${
                  isTimerRunning
                    ? 'bg-[#736e65] text-white hover:bg-[#555047]'
                    : 'bg-[#b25537] text-white hover:bg-[#934329]'
                }`}
              >
                {isTimerRunning ? (
                  <>
                    <Pause className="size-3.5" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="size-3.5" />
                    <span>{timerFinished ? 'Restart' : 'Start'}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setTimeLeft(stepDuration)
                  setIsTimerRunning(false)
                  setTimerFinished(false)
                }}
                title="Reset timer"
                className="flex size-10 items-center justify-center rounded-xl border border-[#ded9cf] text-[#736e65] hover:bg-[#f0ece3] transition"
              >
                <RotateCcw className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 4. Giant [ ✓ DONE ] Primary Action & In-Cooking AI Trigger */}
        <div className="pt-6 space-y-3">
          {/* Ask AI button right above Done */}
          <button
            type="button"
            onClick={() => setIsAiOpen(true)}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#ded9cf] bg-white py-2.5 text-xs font-semibold text-[#b25537] hover:bg-[#fbf7f4] transition shadow-xs"
          >
            <span className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-black shadow-[0_0_20px_rgba(41,220,176,.24)]">
              <img src="/moaka-ai-orb.gif" alt="" aria-hidden="true" className="size-full object-cover" />
            </span>
            <span>Ask Moaka AI</span>
          </button>

          {/* Giant DONE button */}
          <button
            type="button"
            onClick={handleStepDone}
            className="w-full rounded-2xl bg-[#223129] py-5 px-6 text-center text-lg sm:text-xl font-bold text-white shadow-lg hover:bg-[#15201a] active:scale-[0.99] transition flex items-center justify-center gap-3"
          >
            <Check className="size-6 text-[#df9776]" />
            <span>{currentStepIndex === totalSteps - 1 ? '✓ COMPLETE RECIPE' : '✓ DONE — NEXT STEP'}</span>
          </button>

          {/* Quick step navigation bar */}
          <div className="flex items-center justify-between text-xs text-[#736e65] px-1 pt-1">
            <button
              type="button"
              disabled={currentStepIndex === 0}
              onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
              className="flex items-center gap-1 disabled:opacity-30 hover:text-[#223129] transition"
            >
              <ArrowLeft className="size-3.5" />
              <span>Previous Step</span>
            </button>

            <span className="font-mono text-[11px] text-[#8d887d]">
              {currentStepIndex + 1} / {totalSteps}
            </span>

            <button
              type="button"
              disabled={currentStepIndex === totalSteps - 1}
              onClick={() => setCurrentStepIndex((prev) => Math.min(totalSteps - 1, prev + 1))}
              className="flex items-center gap-1 disabled:opacity-30 hover:text-[#223129] transition"
            >
              <span>Skip Ahead</span>
              <ArrowRight className="size-3.5" />
            </button>
          </div>
        </div>
      </main>

      {/* 5. In-Cooking AI Drawer Modal */}
      {isAiOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-5 shadow-2xl border border-[#ded9cf] space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#f0ece3] pb-3">
              <div className="flex items-center gap-2">
                <span className="flex size-10 items-center justify-center overflow-hidden rounded-xl bg-black">
                  <img src="/moaka-ai-orb.gif" alt="" aria-hidden="true" className="size-full object-cover" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[#223129]">Chef AI Assistant</h3>
                  <p className="text-[11px] text-[#736e65]">Focused guidance for Step {currentStep.step_number}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAiOpen(false)
                  setAiAnswer(null)
                  setAiQuestion('')
                }}
                className="rounded-full p-1.5 text-[#736e65] hover:bg-[#f0ece3]"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Quick Prompt Chips */}
            <div className="flex flex-wrap gap-1.5">
              {[
                'My gravy is too thick',
                'Tastes too salty',
                'Burning or sticking',
                'Can I substitute paneer?',
                'How much salt to add?',
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => {
                    setAiQuestion(chip)
                    handleAskAi(chip)
                  }}
                  className="rounded-full bg-[#faf7f2] border border-[#e8e4db] px-2.5 py-1 text-[11px] font-medium text-[#555047] hover:border-[#b25537] hover:text-[#b25537] transition"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Answer Display */}
            {isAiLoading ? (
              <div className="rounded-xl bg-[#faf7f2] p-4 text-center text-xs text-[#736e65]">
                <Sparkles className="size-5 text-[#b25537] animate-spin mx-auto mb-2" />
                <span>Chef is reviewing your dish context...</span>
              </div>
            ) : aiAnswer ? (
              <div className="rounded-xl bg-[#fbf5ee] border border-[#fae4d2] p-4 space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#b25537]">Chef Advice</p>
                <p className="text-xs text-[#3b3730] leading-relaxed font-medium">{aiAnswer}</p>
              </div>
            ) : null}

            {/* Question Input */}
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                placeholder="Ask what to adjust..."
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAskAi()
                }}
                className="flex-1 rounded-xl border border-[#ded9cf] bg-[#fdfcf9] px-3 py-2 text-xs text-[#223129] focus:border-[#b25537] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleAskAi()}
                disabled={isAiLoading || !aiQuestion.trim()}
                className="flex size-9 items-center justify-center rounded-xl bg-[#b25537] text-white hover:bg-[#934329] disabled:opacity-40 transition shrink-0"
              >
                <Send className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
