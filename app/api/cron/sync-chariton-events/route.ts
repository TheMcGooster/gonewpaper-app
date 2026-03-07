import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const CHARITON_TOWN_ID = 1

// Hardcoded fallback in case calendar_sources table doesn't exist yet
const FALLBACK_CALENDAR_ID = 'charitoncc@gmail.com'
const FALLBACK_SOURCE_NAME = 'Chariton Chamber of Commerce'

type CalendarSource = {
  id: number
  town_id: number
  calendar_id: string
  source_name: string
  source_type: string
  category_emoji: string
}

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
    return { date: start.date, time: 'All Day' }
  }
  if (start.dateTime) {
    const dt = new Date(start.dateTime)
    const date = dt.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
    const time = dt.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Chicago' })
    return { date, time }
  }
  return { date: '', time: 'TBD' }
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.GOOGLE_CALENDAR_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GOOGLE_CALENDAR_API_KEY not set' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // --- Fetch active Google Calendar sources for Chariton from calendar_sources table ---
  let sources: CalendarSource[] = []
  let usingFallback = false

  try {
    const { data, error } = await supabase
      .from('calendar_sources')
      .select('id, town_id, calendar_id, source_name, source_type, category_emoji')
      .eq('town_id', CHARITON_TOWN_ID)
      .eq('is_active', true)
      .eq('source_type', 'google_calendar')

    if (error || !data || data.length === 0) {
      if (error) console.warn('calendar_sources query failed, using hardcoded fallback:', error.message)
      else console.warn('No active calendar sources found, using hardcoded fallback')
      usingFallback = true
    } else {
      sources = data as CalendarSource[]
    }
  } catch (err) {
    console.warn('calendar_sources fetch threw, using hardcoded fallback:', err)
    usingFallback = true
  }

  // Build the list of calendars to sync
  if (usingFallback || sources.length === 0) {
    sources = [{
      id: 0,
      town_id: CHARITON_TOWN_ID,
      calendar_id: FALLBACK_CALENDAR_ID,
      source_name: FALLBACK_SOURCE_NAME,
      source_type: 'google_calendar',
      category_emoji: '🏛️',
    }]
  }

  // --- Sync each calendar source ---
  const details: Array<{ sourceName: string; eventsFound: number; inserted: number; skipped: number; error?: string }> = []
  let totalInserted = 0
  let totalSkipped = 0
  let totalEventsFound = 0

  for (const source of sources) {
    const timeMin = new Date().toISOString()
    const calUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(source.calendar_id)}/events?key=${apiKey}&singleEvents=true&orderBy=startTime&maxResults=150&timeMin=${encodeURIComponent(timeMin)}&timeZone=America/Chicago`

    let calData: { items?: GoogleCalendarEvent[] }
    try {
      const response = await fetch(calUrl, { signal: AbortSignal.timeout(15000) })
      if (!response.ok) {
        const text = await response.text()
        details.push({
          sourceName: source.source_name,
          eventsFound: 0,
          inserted: 0,
          skipped: 0,
          error: `Google Calendar API ${response.status}: ${text.slice(0, 200)}`,
        })
        continue
      }
      calData = await response.json()
    } catch (err) {
      details.push({
        sourceName: source.source_name,
        eventsFound: 0,
        inserted: 0,
        skipped: 0,
        error: err instanceof Error ? err.message : 'Fetch failed',
      })
      continue
    }

    const items: GoogleCalendarEvent[] = calData.items || []
    let inserted = 0
    let skipped = 0

    for (const item of items) {
      if (!item.summary || !item.start) { skipped++; continue }

      const { date, time } = parseGoogleDate(item.start)
      if (!date) { skipped++; continue }

      const { error } = await supabase
        .from('events')
        .upsert(
          {
            title: item.summary,
            date,
            time,
            category: source.category_emoji || '📅',
            location: item.location || 'Chariton, IA',
            price: 'Free',
            source: source.source_name,
            description: item.description || '',
            verified: true,
            town_id: source.town_id,
            google_event_id: item.id,
            source_type: 'google_calendar',
          },
          { onConflict: 'google_event_id' }
        )

      if (error) {
        console.error(`Upsert error for "${item.summary}" (source: ${source.source_name}):`, error)
        skipped++
      } else {
        inserted++
      }
    }

    // Update last_synced_at on the calendar_sources row (skip for fallback entries with id=0)
    if (source.id > 0) {
      await supabase
        .from('calendar_sources')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', source.id)
    }

    totalEventsFound += items.length
    totalInserted += inserted
    totalSkipped += skipped

    details.push({
      sourceName: source.source_name,
      eventsFound: items.length,
      inserted,
      skipped,
    })
  }

  return NextResponse.json({
    success: true,
    town: 'Chariton',
    syncedAt: new Date().toISOString(),
    sourcesProcessed: sources.length,
    usingFallback,
    totalEventsFound,
    totalInserted,
    totalSkipped,
    details,
  })
}
