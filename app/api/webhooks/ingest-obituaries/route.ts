import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Webhook endpoint for ActivePieces to push obituaries into Supabase
// Supports single obituary or batch of obituaries
// Auth: Bearer token using CRON_SECRET (same as cron jobs for simplicity)
//
// Usage from ActivePieces:
// POST /api/webhooks/ingest-obituaries
// Headers: { Authorization: Bearer <CRON_SECRET>, Content-Type: application/json }
// Body (single): { "full_name": "John Doe", "passing_date": "2026-03-01", ... }
// Body (batch):  { "obituaries": [{ "full_name": "...", ... }, ...] }

type IngestObituary = {
  full_name: string
  birth_date?: string | null     // YYYY-MM-DD format
  passing_date?: string | null   // YYYY-MM-DD format
  age?: number | null
  photo_url?: string | null
  obituary?: string | null       // full obituary text
  service_date?: string | null   // YYYY-MM-DD format
  service_time?: string | null   // e.g. "2:00 PM"
  service_location?: string | null
  funeral_home?: string | null
  funeral_home_url?: string | null
  town_id?: number
  submitted_by?: string | null   // uuid
}

// Reject obituaries with passing_date older than this many days
const MAX_OBITUARY_AGE_DAYS = 21

function validateObituary(obit: IngestObituary): string | null {
  if (!obit.full_name || typeof obit.full_name !== 'string') return 'Missing or invalid full_name'

  // Reject obituaries with a passing_date older than 21 days
  // This prevents scrapers from re-inserting very old obituaries
  if (obit.passing_date) {
    const passingDate = new Date(obit.passing_date)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - MAX_OBITUARY_AGE_DAYS)
    if (passingDate < cutoff) {
      return `passing_date ${obit.passing_date} is older than ${MAX_OBITUARY_AGE_DAYS} days`
    }
  }

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

  // Support both single obituary and batch
  const obituariesToProcess: IngestObituary[] = []

  if (Array.isArray(body.obituaries)) {
    obituariesToProcess.push(...(body.obituaries as IngestObituary[]))
  } else if (body.full_name) {
    obituariesToProcess.push(body as unknown as IngestObituary)
  } else {
    return NextResponse.json({
      error: 'Invalid body. Expected { full_name, ... } or { obituaries: [...] }',
    }, { status: 400 })
  }

  const results: { inserted: number; skipped: number; errors: string[] } = {
    inserted: 0,
    skipped: 0,
    errors: [],
  }

  for (const obit of obituariesToProcess) {
    const validationError = validateObituary(obit)
    if (validationError) {
      results.errors.push(`"${obit.full_name || 'unknown'}": ${validationError}`)
      results.skipped++
      continue
    }

    // Dedup: case-insensitive check by full_name
    const { data: existing } = await supabase
      .from('celebrations_of_life')
      .select('id')
      .ilike('full_name', obit.full_name)
      .limit(1)

    if (existing && existing.length > 0) {
      results.skipped++
      continue
    }

    const { error: insertError } = await supabase
      .from('celebrations_of_life')
      .insert({
        full_name: obit.full_name,
        birth_date: obit.birth_date || null,
        passing_date: obit.passing_date || null,
        age: obit.age || null,
        photo_url: obit.photo_url || null,
        obituary: obit.obituary || null,
        service_date: obit.service_date || null,
        service_time: obit.service_time || null,
        service_location: obit.service_location || null,
        funeral_home: obit.funeral_home || null,
        funeral_home_url: obit.funeral_home_url || null,
        town_id: obit.town_id || 1,
        submitted_by: obit.submitted_by || null,
        is_approved: true, // Scraped obituaries are auto-approved
      })

    if (insertError) {
      console.error(`Insert error for "${obit.full_name}":`, insertError)
      results.errors.push(`"${obit.full_name}": ${insertError.message}`)
      results.skipped++
    } else {
      results.inserted++
    }
  }

  return NextResponse.json({
    success: true,
    processed: obituariesToProcess.length,
    ...results,
  })
}
