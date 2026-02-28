import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const KNOXVILLE_TOWN_ID = 2

// City of Knoxville iCal feed URLs (CivicPlus platform)
const ICAL_FEEDS = [
  { name: 'Main Calendar', url: 'https://knoxvilleia.gov/common/modules/iCalendar/iCalendar.aspx?catID=14&feed=calendar', category: '📅' },
  { name: 'Library', url: 'https://knoxvilleia.gov/common/modules/iCalendar/iCalendar.aspx?catID=27&feed=calendar', category: '📚' },
  { name: 'Parks & Recreation', url: 'https://knoxvilleia.gov/common/modules/iCalendar/iCalendar.aspx?catID=24&feed=calendar', category: '🏞️' },
  { name: 'City Manager', url: 'https://knoxvilleia.gov/common/modules/iCalendar/iCalendar.aspx?catID=25&feed=calendar', category: '🏛️' },
  { name: 'Mayor & City Council', url: 'https://knoxvilleia.gov/common/modules/iCalendar/iCalendar.aspx?catID=23&feed=calendar', category: '🏛️' },
  { name: 'Community Garage Sales', url: 'https://knoxvilleia.gov/common/modules/iCalendar/iCalendar.aspx?catID=31&feed=calendar', category: '🏷️' },
  { name: 'Fire Department', url: 'https://knoxvilleia.gov/common/modules/iCalendar/iCalendar.aspx?catID=28&feed=calendar', category: '🚒' },
  { name: 'Economic Development', url: 'https://knoxvilleia.gov/common/modules/iCalendar/iCalendar.aspx?catID=22&feed=calendar', category: '💼' },
]

// Simple iCal parser — extracts VEVENT blocks from ICS text
function parseICalEvents(icsText: string): Array<{
  uid: string
  summary: string
  dtstart: string
  dtend?: string
  location?: string
  description?: string
}> {
  const events: Array<{
    uid: string
    summary: string
    dtstart: string
    dtend?: string
    location?: string
    description?: string
  }> = []

  // Split into VEVENT blocks
  const eventBlocks = icsText.split('BEGIN:VEVENT')
  // Skip first element (before first VEVENT)
  for (let i = 1; i < eventBlocks.length; i++) {
    const block = eventBlocks[i].split('END:VEVENT')[0]
    if (!block) continue

    const getField = (name: string): string | undefined => {
      // Handle multi-line values (continuation lines start with space/tab)
      const regex = new RegExp(`^${name}[;:](.*)`, 'm')
      const match = block.match(regex)
      if (!match) return undefined
      let value = match[1]
      // Handle parameter values like DTSTART;VALUE=DATE:20260401
      if (value.includes(':')) {
        value = value.split(':').pop() || value
      }
      // Unfold continuation lines
      value = value.replace(/\r?\n[ \t]/g, '')
      // Unescape iCal special chars
      value = value.replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\\\/g, '\\')
      return value.trim()
    }

    const uid = getField('UID') || `knoxville-${Date.now()}-${i}`
    const summary = getField('SUMMARY')
    const dtstart = getField('DTSTART')
    const dtend = getField('DTEND')
    const location = getField('LOCATION')
    const description = getField('DESCRIPTION')

    if (summary && dtstart) {
      events.push({ uid, summary, dtstart, dtend, location, description })
    }
  }

  return events
}

// Convert iCal date (YYYYMMDD or YYYYMMDDTHHMMSS or YYYYMMDDTHHMMSSZ) to our format
function parseICalDate(dtStr: string): { date: string; time: string } {
  const raw = dtStr.trim()

  // Date-only: YYYYMMDD (no timezone conversion needed)
  if (raw.length === 8 && !raw.includes('T')) {
    const year = raw.substring(0, 4)
    const month = raw.substring(4, 6)
    const day = raw.substring(6, 8)
    return { date: `${year}-${month}-${day}`, time: '' }
  }

  if (raw.includes('T')) {
    // UTC timestamp (ends with Z) — convert to Central Time properly
    if (raw.endsWith('Z')) {
      const iso = `${raw.substring(0, 4)}-${raw.substring(4, 6)}-${raw.substring(6, 8)}T${raw.substring(9, 11)}:${raw.substring(11, 13)}:${raw.substring(13, 15)}Z`
      const dt = new Date(iso)
      const date = dt.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
      const time = dt.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Chicago' })
      return { date, time }
    }

    // Local timestamp: YYYYMMDDTHHMMSS — treat as Central Time directly
    const clean = raw.replace('Z', '')
    const datePart = clean.split('T')[0]
    const timePart = clean.split('T')[1]
    const year = datePart.substring(0, 4)
    const month = datePart.substring(4, 6)
    const day = datePart.substring(6, 8)
    const hours = parseInt(timePart.substring(0, 2), 10)
    const minutes = timePart.substring(2, 4)
    const ampm = hours >= 12 ? 'PM' : 'AM'
    const hour12 = hours % 12 || 12
    return { date: `${year}-${month}-${day}`, time: `${hour12}:${minutes} ${ampm}` }
  }

  // Fallback
  return { date: raw, time: '' }
}

export async function GET(request: Request) {
  // Verify this is called by Vercel Cron or manually with CRON_SECRET
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const results: {
    icalFeeds: Array<{ name: string; eventsFound: number; inserted: number; skipped: number; error?: string }>
    totalInserted: number
    totalSkipped: number
  } = {
    icalFeeds: [],
    totalInserted: 0,
    totalSkipped: 0,
  }

  // Get today's date for filtering past events (en-CA = YYYY-MM-DD, auto-handles DST)
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

  // --- Sync iCal Feeds from City of Knoxville ---
  for (const feed of ICAL_FEEDS) {
    try {
      const response = await fetch(feed.url, {
        headers: { 'Accept': 'text/calendar' },
        signal: AbortSignal.timeout(10000), // 10s timeout per feed
      })

      if (!response.ok) {
        results.icalFeeds.push({ name: feed.name, eventsFound: 0, inserted: 0, skipped: 0, error: `HTTP ${response.status}` })
        continue
      }

      const icsText = await response.text()
      const parsedEvents = parseICalEvents(icsText)

      let inserted = 0
      let skipped = 0

      for (const event of parsedEvents) {
        const { date, time } = parseICalDate(event.dtstart)

        // Skip past events
        if (date < todayStr) {
          skipped++
          continue
        }

        // Upsert by matching title + date + town_id to avoid duplicates
        // Use google_event_id field to store the iCal UID for dedup
        const { error: upsertError } = await supabase
          .from('events')
          .upsert(
            {
              title: event.summary,
              category: feed.category,
              date: date,
              time: time || 'TBD',
              location: event.location || 'Knoxville, IA',
              price: 'Free',
              source: `City of Knoxville - ${feed.name}`,
              verified: true,
              town_id: KNOXVILLE_TOWN_ID,
              description: event.description || '',
              google_event_id: event.uid,
            },
            { onConflict: 'google_event_id' }
          )

        if (upsertError) {
          // If onConflict fails (column not unique), try insert with dedup check
          const { data: existing } = await supabase
            .from('events')
            .select('id')
            .eq('title', event.summary)
            .eq('date', date)
            .eq('town_id', KNOXVILLE_TOWN_ID)
            .limit(1)

          if (existing && existing.length > 0) {
            skipped++
          } else {
            const { error: insertError } = await supabase
              .from('events')
              .insert({
                title: event.summary,
                category: feed.category,
                date: date,
                time: time || 'TBD',
                location: event.location || 'Knoxville, IA',
                price: 'Free',
                source: `City of Knoxville - ${feed.name}`,
                source_url: 'https://knoxvilleia.gov/calendar.aspx',
                verified: true,
                town_id: KNOXVILLE_TOWN_ID,
                description: event.description || '',
                google_event_id: event.uid,
              })

            if (insertError) {
              console.error(`Insert error for "${event.summary}":`, insertError)
              skipped++
            } else {
              inserted++
            }
          }
        } else {
          inserted++
        }
      }

      results.icalFeeds.push({
        name: feed.name,
        eventsFound: parsedEvents.length,
        inserted,
        skipped,
      })
      results.totalInserted += inserted
      results.totalSkipped += skipped
    } catch (error) {
      console.error(`Error fetching iCal feed ${feed.name}:`, error)
      results.icalFeeds.push({
        name: feed.name,
        eventsFound: 0,
        inserted: 0,
        skipped: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return NextResponse.json({
    success: true,
    town: 'Knoxville',
    town_id: KNOXVILLE_TOWN_ID,
    syncedAt: new Date().toISOString(),
    ...results,
  })
}
