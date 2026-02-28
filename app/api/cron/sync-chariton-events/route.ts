import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const CHARITON_TOWN_ID = 1
const CALENDAR_ID = 'if5acq7qkpkngdl23evgh97h34@group.calendar.google.com'

type GoogleCalendarEvent = {
  id: string
  summary: string
  description?: string
  location?: string
  start: { date?: string; dateTime?: string }
  end?: { date?: string; dateTime?: string }
}

function parseGoogleDate(start: { date?: string; dateTime?: string }): { date: string; time: string } {
  if (start.date) {
    // All-day event: "2026-03-15"
    return { date: start.date, time: 'All Day' }
  }
  if (start.dateTime) {
    // Timed event: "2026-03-15T18:00:00-06:00"
    const dt = new Date(start.dateTime)
    const date = dt.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }) // YYYY-MM-DD
    const hours = dt.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Chicago' })
    return { date, time: hours }
  }
  return { date: '', time: 'TBD' }
}

export async function syncCharitonEvents(supabase: ReturnType<typeof createClient>): Promise<{
  eventsFound: number
  inserted: number
  updated: number
  skipped: number
  error?: string
}> {
  const apiKey = process.env.GOOGLE_CALENDAR_API_KEY
  if (!apiKey) {
    return { eventsFound: 0, inserted: 0, updated: 0, skipped: 0, error: 'GOOGLE_CALENDAR_API_KEY not set' }
  }

  // Fetch events from now through 90 days out
  const now = new Date()
  const timeMin = now.toISOString()
  const timeMax = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString()

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?key=${apiKey}&singleEvents=true&orderBy=startTime&maxResults=50&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&timeZone=America/Chicago`

  let calData: { items?: GoogleCalendarEvent[] }
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) })
    if (!response.ok) {
      const text = await response.text()
      return { eventsFound: 0, inserted: 0, updated: 0, skipped: 0, error: `Google Calendar API error ${response.status}: ${text.slice(0, 200)}` }
    }
    calData = await response.json()
  } catch (err) {
    return { eventsFound: 0, inserted: 0, updated: 0, skipped: 0, error: err instanceof Error ? err.message : 'Fetch failed' }
  }

  const items: GoogleCalendarEvent[] = calData.items || []
  let inserted = 0
  let updated = 0
  let skipped = 0

  for (const item of items) {
    if (!item.summary || !item.start) { skipped++; continue }

    const { date, time } = parseGoogleDate(item.start)
    if (!date) { skipped++; continue }

    const record = {
      title: item.summary,
      date,
      time,
      category: '📅',
      location: item.location || 'Chariton, IA',
      price: 'Free',
      source: 'Chariton Chamber / Community',
      description: item.description || '',
      verified: true,
      town_id: CHARITON_TOWN_ID,
      google_event_id: item.id,
    }

    // Upsert by google_event_id — updates existing events if they changed
    const { error } = await supabase
      .from('events')
      .upsert(record, { onConflict: 'google_event_id' })

    if (error) {
      console.error(`Upsert error for "${item.summary}":`, error)
      skipped++
    } else {
      // We can't easily distinguish insert vs update from upsert, count as inserted
      inserted++
    }
  }

  return { eventsFound: items.length, inserted, updated, skipped }
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const result = await syncCharitonEvents(supabase)

  return NextResponse.json({
    success: !result.error,
    town: 'Chariton',
    town_id: CHARITON_TOWN_ID,
    syncedAt: new Date().toISOString(),
    ...result,
  })
}
