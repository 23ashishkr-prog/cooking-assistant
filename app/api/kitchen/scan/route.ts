import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

type ScanImage = {
  data: string
  mimeType: string
}

export async function POST(req: NextRequest) {
  try {
    const { images = [] } = (await req.json()) as { images?: ScanImage[] }

    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: 'Add at least one kitchen photo.' }, { status: 400 })
    }

    if (images.length > 8) {
      return NextResponse.json({ error: 'You can scan up to 8 photos at a time.' }, { status: 400 })
    }

    const validImages = images.filter(
      (image) =>
        typeof image?.data === 'string' &&
        image.data.length > 0 &&
        /^image\/(jpeg|png|webp|heic|heif)$/i.test(image.mimeType || '')
    )

    if (validImages.length === 0) {
      return NextResponse.json({ error: 'Use JPG, PNG, WEBP, or HEIC photos.' }, { status: 400 })
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Kitchen photo scanning is not configured yet.' }, { status: 503 })
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    const parts: any[] = [
      {
        text: `Identify every distinct edible ingredient and pantry item visible across these kitchen photos.
Combine duplicates across photos. Use short common ingredient names, not brands.
Do not identify appliances, utensils, containers, people, or uncertain objects.
Estimate quantity only when visually reasonable; otherwise use quantity 1 and unit "item".
Return JSON only:
{"items":[{"name":"Tomatoes","quantity":4,"unit":"pieces","confidence":0.95}]}`,
      },
      ...validImages.map((image) => ({
        inlineData: {
          mimeType: image.mimeType,
          data: image.data.replace(/^data:image\/[^;]+;base64,/, ''),
        },
      })),
    ]

    const models = ['gemini-3.8-flash', 'gemini-3.1-flash-lite']
    let items: any[] = []

    for (const model of models) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [{ role: 'user', parts }],
          config: { responseMimeType: 'application/json' },
        })
        const parsed = JSON.parse(response.text || '{}')
        if (Array.isArray(parsed.items)) {
          items = parsed.items
            .filter((item: any) => typeof item?.name === 'string' && item.name.trim())
            .map((item: any) => ({
              name: item.name.trim(),
              quantity: Math.max(1, Number(item.quantity) || 1),
              unit: String(item.unit || 'item').slice(0, 24),
              confidence: Math.min(1, Math.max(0, Number(item.confidence) || 0.7)),
            }))
          break
        }
      } catch (error: any) {
        console.warn(`[Kitchen Scan ${model}]`, error?.message || error)
      }
    }

    if (items.length === 0) {
      return NextResponse.json({ error: 'No clear ingredients were detected. Try brighter, closer photos.' }, { status: 422 })
    }

    return NextResponse.json({ items })
  } catch (error: any) {
    console.error('[Kitchen Scan]', error)
    return NextResponse.json({ error: error?.message || 'Photo scan failed.' }, { status: 500 })
  }
}
