// Run once after deployment, or after importing recipes. Reruns skip saved images.
// RECIPE_IMAGE_REPAIR_URL=https://your-app/api/recipes/image
// RECIPE_IMAGE_REPAIR_SECRET must match the server's private environment variable.
const url = process.env.RECIPE_IMAGE_REPAIR_URL
const secret = process.env.RECIPE_IMAGE_REPAIR_SECRET
if (!url || !secret) throw new Error('Set RECIPE_IMAGE_REPAIR_URL and RECIPE_IMAGE_REPAIR_SECRET')
const endpoint = new URL(url)
if (endpoint.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(endpoint.hostname)) {
  throw new Error('HTTPS is required for remote repair')
}
let repaired = 0
while (true) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { authorization: `Bearer ${secret}`, 'content-type': 'application/json' },
    body: JSON.stringify({ repairNext: true }),
    signal: AbortSignal.timeout(120000),
    redirect: 'error',
  })
  if (!response.ok) throw new Error(`Repair failed (HTTP ${response.status}); inspect server logs, then rerun`)
  const result = await response.json()
  if (result.complete) { console.log(`Complete: ${repaired} images repaired`); break }
  if (!result.repairedRecipeId || !result.imageUrl) throw new Error('Invalid repair response')
  console.log(`Saved image for ${result.repairedRecipeId}`)
  repaired++
}
