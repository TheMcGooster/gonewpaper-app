import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

function getDayOfYear(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  const start = new Date(y, 0, 1)
  const target = new Date(y, m - 1, d)
  return Math.round((target.getTime() - start.getTime()) / 86400000) + 1
}

function formatTime(time: string | null): string {
  if (!time) return 'TBD'
  // Handle 24hr format like "16:00:00"
  const match24 = time.match(/^(\d{1,2}):(\d{2})/)
  if (match24) {
    let h = parseInt(match24[1])
    const m = match24[2]
    if (h > 12) {
      return `${h - 12}:${m} PM`
    } else if (h === 12) {
      return `12:${m} PM`
    } else if (h === 0) {
      return `12:${m} AM`
    }
    return `${h}:${m} AM`
  }
  return time
}

// Get day of week name
function getDayName(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long' })
}

// Get formatted display date
function getDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  })
}

export async function GET(request: Request) {
  // Auth check
  const authHeader = request.headers.get('authorization')
  const url = new URL(request.url)
  const token = url.searchParams.get('token')

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Get today in Central Time
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
  const dayName = getDayName(todayStr)
  const displayDate = getDisplayDate(todayStr)
  const doy = getDayOfYear(todayStr)

  // Fetch today's events for Chariton (town_id = 1)
  const { data: events } = await supabase
    .from('events')
    .select('title, time, location, category')
    .eq('date', todayStr)
    .eq('town_id', 1)
    .order('time', { ascending: true })

  // Fetch today's joke
  const { data: joke } = await supabase
    .from('daily_jokes')
    .select('question, punchline')
    .eq('day_of_year', doy)
    .eq('is_approved', true)
    .single()

  // Build the Facebook post
  const lines: string[] = []

  // Header
  lines.push(`GOOD MORNING, CHARITON! ☀️`)
  lines.push(`📅 ${displayDate}`)
  lines.push('')

  // Events section
  if (events && events.length > 0) {
    lines.push(`Here's what's happening today:`)
    lines.push('')

    for (const event of events) {
      const timeStr = formatTime(event.time)
      const locationStr = event.location ? ` @ ${event.location}` : ''
      lines.push(`• ${event.title} — ${timeStr}${locationStr}`)
    }
  } else {
    lines.push(`No events scheduled for today — enjoy your ${dayName}!`)
  }

  // Joke section
  if (joke) {
    lines.push('')
    lines.push(`😂 Daily Laugh:`)
    lines.push(`${joke.question}`)
    lines.push(`👉 ${joke.punchline}`)
  }

  // Footer / CTA
  lines.push('')
  lines.push(`📱 See all events, jobs, housing & more on Go New Paper!`)
  lines.push(`🔗 www.gonewpaper.com`)
  lines.push('')
  lines.push(`#Chariton #Iowa #LucasCounty #LocalEvents #GoNewPaper`)

  const postText = lines.join('\n')

  return NextResponse.json({
    post: postText,
    meta: {
      date: todayStr,
      eventCount: events?.length || 0,
      hasJoke: !!joke,
    },
  })
}
