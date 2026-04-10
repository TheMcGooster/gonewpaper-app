import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const SHEET_ID = '1_D5d2s1vxXgVZziBBm_Dw4MT0SZaVS1581QypvBb9dI'
const GID = '1220329812'

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split('\n').filter(line => line.trim())
  if (lines.length < 2) return []

  // Parse header row
  const headers = parseCSVLine(lines[0])
  const rows: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h.trim()] = (values[idx] || '').trim()
    })
    rows.push(row)
  }
  return rows
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

export async function GET(request: Request) {
  // Auth check
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch Google Sheet as CSV
    const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`
    const response = await fetch(csvUrl, { redirect: 'follow' })
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch Google Sheet', status: response.status }, { status: 500 })
    }

    const csvText = await response.text()
    const rows = parseCSV(csvText)

    if (rows.length === 0) {
      return NextResponse.json({ message: 'No rows found in sheet', synced: 0 })
    }

    let synced = 0
    let skipped = 0
    const errors: string[] = []

    for (const row of rows) {
      const name = row['Name']
      if (!name) { skipped++; continue }

      const isActive = (row['Active'] || '').toUpperCase() === 'TRUE'
      const affiliateUrl = row['Affiliate URL'] || ''
      if (!affiliateUrl) { skipped++; continue }

      const displayOrder = parseInt(row['Display Order'] || '0', 10) || 0
      const imageUrl = row['Image URL'] || null
      const commission = row['Commission'] || ''
      const description = row['Description'] || ''
      const category = row['Category'] || 'General'

      // Upsert by name
      const { error } = await supabase
        .from('affiliates')
        .upsert(
          {
            name,
            category,
            image_url: imageUrl,
            url: affiliateUrl,
            commission,
            description,
            is_active: isActive,
            display_order: displayOrder,
            logo_emoji: '',
          },
          { onConflict: 'name' }
        )

      if (error) {
        errors.push(`${name}: ${error.message}`)
      } else {
        synced++
      }
    }

    return NextResponse.json({
      message: `Synced ${synced} affiliates from Google Sheet`,
      synced,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
