import { GoogleGenAI } from '@google/genai'
import { createAdminClient } from '@/lib/supabase/server'
import { createHash } from 'node:crypto'
import { isRecipeImage } from '@/lib/recipe-image-policy'

const IMAGE_MODELS = ['gemini-2.5-flash-image', 'gemini-3-pro-image-preview']

export async function generateAndStoreRecipeImage(recipeId: string, force = false) {
  const supabase = createAdminClient()
  const { data: recipe, error } = await supabase
    .from('recipes')
    .select('id, name, title, description, cuisine, ingredients, image_url')
    .eq('id', recipeId)
    .single()
  if (error || !recipe) throw new Error(error?.message || 'Recipe not found')
  if (isRecipeImage(recipe.image_url) && !force) return recipe.image_url
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured')

  const ingredients = Array.isArray(recipe.ingredients)
    ? recipe.ingredients.slice(0, 10).map((item: any) => item?.name || item).filter(Boolean).join(', ')
    : String(recipe.ingredients || '')
  const prompt = `Create one premium, realistic editorial food photograph of ${recipe.name || recipe.title}. Cuisine: ${recipe.cuisine || 'global'}. Key ingredients: ${ingredients}. ${recipe.description || ''} Show the finished authentic dish only, styled on a modern dining table, warm natural light, appetizing texture, overhead three-quarter angle. No text, logos, collage, people, hands, or duplicate plates. Portrait 4:3 composition.`
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  let bytes: Buffer | null = null
  let mimeType = 'image/png'

  for (const model of IMAGE_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { responseModalities: ['TEXT', 'IMAGE'] },
      })
      const parts = response.candidates?.[0]?.content?.parts || []
      const imagePart = parts.find((part: any) => part.inlineData?.data && /^image\/(png|jpeg|webp)$/.test(part.inlineData?.mimeType || ''))
      if (imagePart?.inlineData?.data) {
        bytes = Buffer.from(imagePart.inlineData.data, 'base64')
        mimeType = imagePart.inlineData.mimeType || mimeType
        break
      }
    } catch (modelError: any) {
      console.warn(`[Recipe image ${model}]`, modelError?.message || modelError)
    }
  }
  if (!bytes?.length) throw new Error('AI did not return an image')

  const { data: buckets, error: bucketListError } = await supabase.storage.listBuckets()
  if (bucketListError) throw new Error(bucketListError.message)
  if (!(buckets || []).some((bucket) => bucket.id === 'recipe-images')) {
    const { error: bucketError } = await supabase.storage.createBucket('recipe-images', {
      public: true,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
      fileSizeLimit: '10MB',
    })
    if (bucketError && !bucketError.message.toLowerCase().includes('already exists')) throw new Error(bucketError.message)
  }
  const extension = mimeType.includes('jpeg') ? 'jpg' : mimeType.includes('webp') ? 'webp' : 'png'
  const digest = createHash('sha256').update(bytes).digest('hex').slice(0, 16)
  const objectPath = `${recipeId.replace(/[^a-z0-9-_]/gi, '-')}-${digest}.${extension}`
  const { error: uploadError } = await supabase.storage.from('recipe-images').upload(objectPath, bytes, {
    contentType: mimeType,
    cacheControl: '31536000',
    upsert: true,
  })
  if (uploadError) throw new Error(uploadError.message)
  const publicUrl = supabase.storage.from('recipe-images').getPublicUrl(objectPath).data.publicUrl
  const { data: saved, error: updateError } = await supabase.from('recipes').update({ image_url: publicUrl, updated_at: new Date().toISOString() }).eq('id', recipeId).select('id').single()
  if (updateError) throw new Error(updateError.message)
  if (!saved) throw new Error('Recipe image URL was not saved')
  return publicUrl
}
