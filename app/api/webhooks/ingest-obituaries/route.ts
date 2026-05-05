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

  // Validate up front.
  const validObits: IngestObituary[] = []
  for (const obit of obituariesToProcess) {
    const validationError = validateObituary(obit)
    if (validationError) {
      results.errors.push(`"${obit.full_name || 'unknown'}": ${validationError}`)
      results.skipped++
      continue
    }
    validObits.push(obit)
  }

  if (validObits.length > 0) {
    // Batch dedup: one SELECT for all candidate names.
    // No unique constraint on full_name, so we filter in JS using a lowercase Set.
    const candidateNames = Array.from(new Set(validObits.map(o => o.full_name)))
    const { data: existingRows } = await supabase
      .from('celebrations_of_life')
      .select('full_name')
      .in('full_name', candidateNames)

    const existingLower = new Set(
      (existingRows || []).map(r => (r.full_name || '').toLowerCase())
    )

    // Also dedup within this batch (in case a scraper sends the same name twice).
    const seenInBatch = new Set<string>()
    const rowsToInsert: Record<string, unknown>[] = []
    for (const obit of validObits) {
      const key = obit.full_name.toLowerCase()
      if (existingLower.has(key) || seenInBatch.has(key)) {
        results.skipped++
        continue
      }
      seenInBatch.add(key)
      rowsToInsert.push({
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
    }

    if (rowsToInsert.length > 0) {
      const { data: inserted, error: insertError } = await supabase
        .from('celebrations_of_life')
        .insert(rowsToInsert)
        .select('id')

      if (insertError) {
        console.error('Bulk insert error:', insertError)
        results.errors.push(`Bulk insert failed: ${insertError.message}`)
        results.skipped += rowsToInsert.length
      } else {
        results.inserted = inserted?.length ?? rowsToInsert.length
      }
    }
  }

  return NextResponse.json({
    success: true,
    processed: obituariesToProcess.length,
    ...results,
  })
}
