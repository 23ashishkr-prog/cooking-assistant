import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

export async function POST(req: NextRequest) {
  try {
    const {
      question,
      recipe_title,
      current_step_number,
      current_step_title,
      current_step_instruction,
      ingredients = [],
    } = await req.json()

    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 })
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

    const prompt = `You are an expert chef acting as an in-the-moment cooking assistant. The user is actively cooking right now with their hands busy or food on the stove.

Context:
Recipe: ${recipe_title || 'Current dish'}
Current Step: Step ${current_step_number || 1}: ${current_step_title || ''}
Step Instruction: ${current_step_instruction || ''}
Ingredients: ${ingredients.slice(0, 10).join(', ')}

User's Question/Problem: "${question}"

Instructions:
1. Answer in 1 to 3 short, direct sentences.
2. Give actionable kitchen advice immediately (e.g. adjust flame, add liquid, substitute, taste test).
3. Be clear, calm, and practical. No long preamble or fluff.`

    const modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite']
    let replyText = ''

    for (const model of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
        })
        if (response.text) {
          replyText = response.text.trim()
          break
        }
      } catch (err: any) {
        console.warn(`[Ask Chef ${model} error]:`, err?.message || err)
      }
    }

    if (!replyText) {
      // Fallback heuristics for common cooking questions
      const q = question.toLowerCase()
      if (q.includes('thick') || q.includes('too thick')) {
        replyText = 'Add 2–3 tablespoons of warm water or broth, stir well and simmer gently for 1–2 minutes until desired consistency is reached.'
      } else if (q.includes('salty') || q.includes('too salty')) {
        replyText = 'Add a squeeze of fresh lemon juice, a splash of cream or water, or drop in a peeled raw potato wedge for 5 minutes to absorb excess salt.'
      } else if (q.includes('spicy') || q.includes('too spicy')) {
        replyText = 'Swirl in a spoonful of yogurt, sour cream, butter, or a pinch of sugar to mellow out the heat instantly.'
      } else if (q.includes('stick') || q.includes('burning')) {
        replyText = 'Immediately lower the heat, move the pan off the burner, and add 2 tablespoons of water or oil to deglaze the pan.'
      } else if (q.includes('replace') || q.includes('substitute')) {
        replyText = 'You can swap with firm tofu, paneer, halloumi, or chopped mushrooms depending on your preference and dietary needs.'
      } else {
        replyText = `For ${recipe_title || 'this step'}, keep your heat at medium-low, taste for seasoning balance, and stir regularly to ensure even cooking.`
      }
    }

    return NextResponse.json({ reply: replyText })
  } catch (error: any) {
    console.error('[Ask Chef Error]:', error)
    return NextResponse.json({
      reply: 'Keep heat on medium-low and check moisture level. If in doubt, remove pan from direct heat momentarily.',
    })
  }
}
