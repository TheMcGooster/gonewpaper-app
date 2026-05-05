import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Webhook endpoint for ActivePieces to push scraped jobs into Supabase
// Deduplicates by apply_url to prevent unique constraint violations
// Auth: Bearer token using CRON_SECRET
//
// Usage from ActivePieces:
// POST /api/webhooks/ingest-jobs
// Headers: { Authorization: Bearer <CRON_SECRET>, Content-Type: application/json }
// Body (single): { "title": "...", "company": "...", "apply_url": "..." }
// Body (batch):  { "jobs": [{ "title": "...", ... }, ...] }

type IngestJob = {
  title?: string | null
  company?: string | null
  type?: string | null           // employment type (Full-time, Part-time, etc.)
  pay?: string | null             // salary/pay info
  description?: string | null
  apply_url?: string | null       // unique job link
  town?: string | null            // location text
  location?: string | null        // detailed location
  distance_miles?: number | null
  town_id?: number
  auto_scraped?: boolean
  expires_at?: string | null      // ISO date
}

function validateJob(job: IngestJob): string | null {
  if (!job.apply_url || typeof job.apply_url !== 'string') return 'Missing or invalid apply_url'
  if (!job.title || typeof job.title !== 'string') return 'Missing or invalid title'
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

  // Support both single job and batch
  const jobsToProcess: IngestJob[] = []

  if (Array.isArray(body.jobs)) {
    jobsToProcess.push(...(body.jobs as IngestJob[]))
  } else if (body.apply_url || body.title) {
    jobsToProcess.push(body as unknown as IngestJob)
  } else {
    return NextResponse.json({
      error: 'Invalid body. Expected { title, apply_url, ... } or { jobs: [...] }',
    }, { status: 400 })
  }

  const results: { inserted: number; skipped: number; errors: string[] } = {
    inserted: 0,
    skipped: 0,
    errors: [],
  }

  // Validate up front; collect rows to insert.
  const defaultExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  const validRows: Record<string, unknown>[] = []
  for (const job of jobsToProcess) {
    const validationError = validateJob(job)
    if (validationError) {
      results.errors.push(`"${job.title || 'unknown'}": ${validationError}`)
      results.skipped++
      continue
    }
    validRows.push({
      title: job.title || null,
      company: job.company || null,
      type: job.type || null,
      pay: job.pay || null,
      description: job.description || null,
      apply_url: job.apply_url || null,
      town: job.town || null,
      location: job.location || null,
      distance_miles: job.distance_miles || null,
      town_id: job.town_id || 1,
      auto_scraped: job.auto_scraped !== undefined ? job.auto_scraped : true,
      expires_at: job.expires_at || defaultExpiry,
    })
  }

  if (validRows.length > 0) {
    // Single ON CONFLICT DO NOTHING upsert. apply_url has a unique constraint —
    // duplicates are silently dropped, returned data lists only newly-inserted rows.
    const { data: inserted, error: upsertError } = await supabase
      .from('jobs')
      .upsert(validRows, { onConflict: 'apply_url', ignoreDuplicates: true })
      .select('id')

    if (upsertError) {
      console.error('Bulk upsert error:', upsertError)
      results.errors.push(`Bulk upsert failed: ${upsertError.message}`)
      results.skipped += validRows.length
    } else {
      results.inserted = inserted?.length ?? 0
      results.skipped += validRows.length - results.inserted
    }
  }

  return NextResponse.json({
    success: true,
    processed: jobsToProcess.length,
    ...results,
  })
}
