import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const runtime = 'edge'
export const maxDuration = 60

function getDayOfYear(): number {
  const now = new Date()
  const centralDate = now.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
  const [y, m, d] = centralDate.split('-').map(Number)
  const start = new Date(y, 0, 1)
  const target = new Date(y, m - 1, d)
  return Math.round((target.getTime() - start.getTime()) / 86400000) + 1
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const doy = getDayOfYear()

  const { data: joke, error } = await supabase
    .from('daily_jokes')
    .select('question, punchline, category')
    .eq('day_of_year', doy)
    .eq('is_approved', true)
    .single()

  if (error || !joke) {
    return new Response(JSON.stringify({ error: 'No joke found for today', doy }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // JSON mode — return joke text for captions
  const format = url.searchParams.get('format')
  if (format === 'json') {
    return new Response(JSON.stringify({
      question: joke.question,
      punchline: joke.punchline,
      category: joke.category,
      day_of_year: doy,
    }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Build image generation prompt
  const prompt = `Single-panel newspaper comic strip, colorful cartoon illustration, two funny cartoon characters talking. First character has a speech bubble saying exactly "${joke.question}" and second character responds with a speech bubble saying exactly "${joke.punchline}". Bright playful art style like a Sunday newspaper comic. Small "Go New Paper" text in bottom corner. Square format.`

  // Use a seed based on day-of-year so the same joke always produces the same image
  const seed = doy * 1000 + new Date().getFullYear()

  const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&seed=${seed}&nologo=true`

  // URL mode — return the Pollinations URL for Facebook to fetch directly
  if (format === 'url') {
    return new Response(JSON.stringify({ image_url: pollinationsUrl }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Default: fetch the image and return as PNG
  const imageRes = await fetch(pollinationsUrl)

  if (!imageRes.ok) {
    return new Response(JSON.stringify({ error: 'Image generation failed', status: imageRes.status }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const imageBuffer = await imageRes.arrayBuffer()

  return new Response(imageBuffer, {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
