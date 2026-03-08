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

  for (const job of jobsToProcess) {
    const validationError = validateJob(job)
    if (validationError) {
      results.errors.push(`"${job.title || 'unknown'}": ${validationError}`)
      results.skipped++
      continue
    }

    // Dedup: check by apply_url (has unique constraint in DB)
    const { data: existing } = await supabase
      .from('jobs')
      .select('id')
      .eq('apply_url', job.apply_url!)
      .limit(1)

    if (existing && existing.length > 0) {
      results.skipped++
      continue
    }

    // Set expiry to 30 days from now if not provided
    const expiresAt = job.expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    const { error: insertError } = await supabase
      .from('jobs')
      .insert({
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
        expires_at: expiresAt,
      })

    if (insertError) {
      console.error(`Insert error for "${job.title}":`, insertError)
      results.errors.push(`"${job.title}": ${insertError.message}`)
      results.skipped++
    } else {
      results.inserted++
    }
  }

  return NextResponse.json({
    success: true,
    processed: jobsToProcess.length,
    ...results,
  })
}
