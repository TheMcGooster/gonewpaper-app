import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const oneSignalAppId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || 'a7951e0e-737c-42e6-bd9d-fc0931d95766'
const oneSignalApiKey = process.env.ONESIGNAL_REST_API_KEY!

const ADMIN_EMAILS = new Set([
  'jarrettcmcgee@gmail.com',
  'jarrettmcgee@gmail.com',
  'goflufffactory@gmail.com',
  'thenewpaperchariton@gmail.com',
])

const VALID_CATEGORIES = new Set(['weather', 'utility', 'road', 'general'])

// Town names mirror page.tsx — used in push title.
const TOWN_NAMES: Record<number, string> = {
  1: 'Chariton',
  2: 'Knoxville',
  3: 'Albia',
  4: 'Corydon',
}

// POST /api/admin/civic-alert
// Body: { townId, category, title, message, expiresInHours?, sendPush? }
// Auth: Authorization: Bearer <supabase access token>
//
// Inserts a row into civic_alerts and (if sendPush) immediately fires a
// OneSignal push to every subscriber tagged with that town_id.
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) {
      return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { data: userData, error: userError } = await supabase.auth.getUser(token)
    if (userError || !userData?.user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }
    const userId = userData.user.id
    const userEmail = (userData.user.email || '').toLowerCase()
    if (!ADMIN_EMAILS.has(userEmail)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json().catch(() => null) as
      | { townId?: unknown; category?: unknown; title?: unknown; message?: unknown; expiresInHours?: unknown; sendPush?: unknown }
      | null
    if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

    const townId = typeof body.townId === 'number' ? body.townId : 1
    const category = typeof body.category === 'string' ? body.category : 'general'
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const message = typeof body.message === 'string' ? body.message.trim() : ''
    const expiresInHours = typeof body.expiresInHours === 'number' ? body.expiresInHours : 24
    const sendPush = body.sendPush !== false // default true

    if (!VALID_CATEGORIES.has(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }
    if (!title || title.length > 80) {
      return NextResponse.json({ error: 'title required (max 80 chars)' }, { status: 400 })
    }
    if (!message || message.length > 280) {
      return NextResponse.json({ error: 'message required (max 280 chars)' }, { status: 400 })
    }
    if (!TOWN_NAMES[townId]) {
      return NextResponse.json({ error: 'Invalid townId' }, { status: 400 })
    }

    const expiresAt = new Date(Date.now() + Math.max(1, Math.min(168, expiresInHours)) * 60 * 60 * 1000).toISOString()

    const { data: inserted, error: insertError } = await supabase
      .from('civic_alerts')
      .insert({
        town_id: townId,
        category,
        title,
        message,
        expires_at: expiresAt,
        created_by: userId,
        is_active: true,
      })
      .select('*')
      .single()

    if (insertError || !inserted) {
      console.error('civic_alerts insert failed:', insertError)
      return NextResponse.json({ error: 'Failed to save alert' }, { status: 500 })
    }

    let pushResult: unknown = { skipped: true }
    if (sendPush && oneSignalApiKey) {
      const categoryEmoji: Record<string, string> = {
        weather: '⛈️',
        utility: '💡',
        road: '🚧',
        general: '🚨',
      }
      const heading = `${categoryEmoji[category] || '🚨'} ${TOWN_NAMES[townId]} Alert: ${title}`

      const response = await fetch('https://api.onesignal.com/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Key ${oneSignalApiKey}`,
        },
        body: JSON.stringify({
          app_id: oneSignalAppId,
          target_channel: 'push',
          filters: [
            { field: 'tag', key: 'town_id', relation: '=', value: String(townId) },
          ],
          headings: { en: heading },
          contents: { en: message },
          url: 'https://www.gonewpaper.com',
          priority: 10,
        }),
      })
      pushResult = await response.json().catch(() => ({ error: 'unparseable response' }))
      if (!response.ok) {
        console.error('OneSignal civic-alert push failed:', pushResult)
      }
    }

    return NextResponse.json({ success: true, alert: inserted, push: pushResult })
  } catch (e) {
    console.error('civic-alert POST error:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// DELETE /api/admin/civic-alert?id=<n>
// Soft-dismisses an active alert (sets is_active=false). Admin only.
export async function DELETE(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 })

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { data: userData, error: userError } = await supabase.auth.getUser(token)
    if (userError || !userData?.user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }
    if (!ADMIN_EMAILS.has((userData.user.email || '').toLowerCase())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const url = new URL(request.url)
    const id = Number(url.searchParams.get('id'))
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }

    const { error } = await supabase
      .from('civic_alerts')
      .update({ is_active: false })
      .eq('id', id)

    if (error) {
      console.error('civic_alerts dismiss error:', error)
      return NextResponse.json({ error: 'Failed to dismiss' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('civic-alert DELETE error:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
