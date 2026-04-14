import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const runtime = 'edge'

function getDayOfYear(): number {
  const now = new Date()
  // Get Central Time date string (YYYY-MM-DD)
  const centralDate = now.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
  const [y, m, d] = centralDate.split('-').map(Number)
  const start = new Date(y, 0, 1)
  const target = new Date(y, m - 1, d)
  return Math.round((target.getTime() - start.getTime()) / 86400000) + 1
}

export async function GET(request: Request) {
  // Optional auth — allow public access for image URLs, but also support Bearer token
  const authHeader = request.headers.get('authorization')
  const url = new URL(request.url)
  const token = url.searchParams.get('token')

  // Allow access with Bearer token, query param token, or no auth (public image)
  const isAuthed = authHeader === `Bearer ${process.env.CRON_SECRET}` ||
                   token === process.env.CRON_SECRET

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

  // Check if caller wants JSON metadata instead of image
  const format = url.searchParams.get('format')
  if (format === 'json') {
    return new Response(JSON.stringify({
      question: joke.question,
      punchline: joke.punchline,
      category: joke.category,
      day_of_year: doy,
      image_url: `${url.origin}/api/comic/daily?t=${Date.now()}`,
    }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Generate comic-style image (1080x1080 for Facebook/Instagram)
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #FFF8E7 0%, #FFF3CD 50%, #FFE8A1 100%)',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Comic halftone dots decoration */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            opacity: 0.06,
            background: 'radial-gradient(circle, #000 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />

        {/* Header banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#8B4513',
            color: 'white',
            padding: '16px 48px',
            borderRadius: '12px',
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: '2px',
            marginBottom: '40px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          }}
        >
          GO NEW PAPER — DAILY LAUGHS
        </div>

        {/* Question speech bubble */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'white',
            border: '4px solid #333',
            borderRadius: '30px',
            padding: '36px 52px',
            maxWidth: '880px',
            position: 'relative',
            boxShadow: '6px 6px 0 #333',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              fontSize: 42,
              fontWeight: 700,
              color: '#1a1a1a',
              textAlign: 'center',
              lineHeight: 1.3,
              display: 'flex',
            }}
          >
            {joke.question}
          </div>
        </div>

        {/* Arrow / connector */}
        <div
          style={{
            display: 'flex',
            fontSize: 40,
            marginBottom: '12px',
            color: '#333',
          }}
        >
          ▼
        </div>

        {/* Punchline speech bubble */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: '#D35400',
            border: '4px solid #333',
            borderRadius: '30px',
            padding: '36px 52px',
            maxWidth: '880px',
            position: 'relative',
            boxShadow: '6px 6px 0 #333',
          }}
        >
          <div
            style={{
              fontSize: 46,
              fontWeight: 800,
              fontStyle: 'italic',
              color: 'white',
              textAlign: 'center',
              lineHeight: 1.3,
              display: 'flex',
            }}
          >
            {joke.punchline}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginTop: '40px',
            fontSize: 22,
            color: '#666',
            fontWeight: 600,
          }}
        >
          www.gonewpaper.com — A new joke every day!
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1080,
    },
  )
}
