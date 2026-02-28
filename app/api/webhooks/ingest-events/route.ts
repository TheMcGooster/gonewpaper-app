import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Webhook endpoint for ActivePieces to push events into Supabase
// Supports single event or batch of events
// Auth: Bearer token using CRON_SECRET (same as cron jobs for simplicity)
//
// Usage from ActivePieces:
// POST /api/webhooks/ingest-events
// Headers: { Authorization: Bearer <CRON_SECRET>, Content-Type: application/json }
// Body (single): { "title": "...", "date": "2026-03-15", ... }
// Body (batch):  { "events": [{ "title": "...", ... }, ...] }

type IngestEvent = {
  title: string
  date: string          // YYYY-MM-DD format
  time?: string         // "7:00 PM" format or "TBD"
  category?: string     // emoji like "🏎️" or text
  location?: string
  price?: string
  source?: string       // e.g. "Knoxville Raceway", "Chamber of Commerce"
  description?: string
  town_id?: number      // defaults to 2 (Knoxville) if not provided
  verified?: boolean    // defaults to true
  google_event_id?: string  // unique ID for dedup
  source_type?: string  // origin: google_calendar | ical | eventbrite | user_submitted | manual
}

function validateEvent(event: IngestEvent): string | null {
  if (!event.title || typeof event.title !== 'string') return 'Missing or invalid title'
  if (!event.date || !/^\d{4}-\d{2}-\d{2}$/.test(event.date)) return 'Missing or invalid date (expected YYYY-MM-DD)'
  return null
}

export async function POST(request: Request) {
  // Verify authorization
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Support both single event and batch
  const eventsToProcess: IngestEvent[] = []

  if (Array.isArray(body.events)) {
    eventsToProcess.push(...(body.events as IngestEvent[]))
  } else if (body.title) {
    eventsToProcess.push(body as unknown as IngestEvent)
  } else {
    return NextResponse.json({
      error: 'Invalid body. Expected { title, date, ... } or { events: [...] }',
    }, { status: 400 })
  }

  const results: { inserted: number; skipped: number; errors: string[] } = {
    inserted: 0,
    skipped: 0,
    errors: [],
  }

  for (const event of eventsToProcess) {
    const validationError = validateEvent(event)
    if (validationError) {
      results.errors.push(`"${event.title || 'unknown'}": ${validationError}`)
      results.skipped++
      continue
    }

    const townId = event.town_id || 2 // Default to Knoxville

    // Check for duplicate by title + date + town_id
    const { data: existing } = await supabase
      .from('events')
      .select('id')
      .eq('title', event.title)
      .eq('date', event.date)
      .eq('town_id', townId)
      .limit(1)

    if (existing && existing.length > 0) {
      results.skipped++
      continue
    }

    const { error: insertError } = await supabase
      .from('events')
      .insert({
        title: event.title,
        date: event.date,
        time: event.time || 'TBD',
        category: event.category || '📅',
        location: event.location || 'Knoxville, IA',
        price: event.price || 'Free',
        source: event.source || 'ActivePieces',
        description: event.description || '',
        verified: event.verified !== false,
        town_id: townId,
        google_event_id: event.google_event_id || '',
        source_type: event.source_type || 'manual',
      })

    if (insertError) {
      console.error(`Insert error for "${event.title}":`, insertError)
      results.errors.push(`"${event.title}": ${insertError.message}`)
      results.skipped++
    } else {
      results.inserted++
    }
  }

  return NextResponse.json({
    success: true,
    processed: eventsToProcess.length,
    ...results,
  })
}
