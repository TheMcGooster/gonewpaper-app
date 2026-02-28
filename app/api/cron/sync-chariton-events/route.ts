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

  const timeMin = new Date().toISOString()
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?key=${apiKey}&singleEvents=true&orderBy=startTime&maxResults=150&timeMin=${encodeURIComponent(timeMin)}&timeZone=America/Chicago`

  let calData: { items?: GoogleCalendarEvent[] }
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) })
    if (!response.ok) {
      const text = await response.text()
      return NextResponse.json({ error: `Google Calendar API ${response.status}: ${text.slice(0, 200)}` }, { status: 500 })
    }
    calData = await response.json()
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Fetch failed' }, { status: 500 })
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
          category: '📅',
          location: item.location || 'Chariton, IA',
          price: 'Free',
          source: 'Chariton Chamber / Community',
          description: item.description || '',
          verified: true,
          town_id: CHARITON_TOWN_ID,
          google_event_id: item.id,
        },
        { onConflict: 'google_event_id' }
      )

    if (error) {
      console.error(`Upsert error for "${item.summary}":`, error)
      skipped++
    } else {
      inserted++
    }
  }

  return NextResponse.json({
    success: true,
    town: 'Chariton',
    syncedAt: new Date().toISOString(),
    eventsFound: items.length,
    inserted,
    skipped,
  })
}
