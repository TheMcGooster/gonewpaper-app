import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const oneSignalAppId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || 'a7951e0e-737c-42e6-bd9d-fc0931d95766'
const oneSignalApiKey = process.env.ONESIGNAL_REST_API_KEY!

// Allow-listed editable fields. Anything else in the request body is ignored.
type EditableField = 'date' | 'time' | 'location' | 'cancelled'
const EDITABLE_FIELDS: EditableField[] = ['date', 'time', 'location', 'cancelled']

// Admin allow-list — mirrors the client-side isAdmin check in page.tsx and the
// is_admin() SQL function. Admins can edit any event, including scraped ones
// (Chamber, Lucas County Economic Development, city websites) that have no submitted_by.
const ADMIN_EMAILS = new Set([
  'jarrettcmcgee@gmail.com',
  'jarrettmcgee@gmail.com',
  'goflufffactory@gmail.com',
  'thenewpaperchariton@gmail.com',
])

// POST /api/events/update
// Body: { eventId: number, updates: { date?, time?, location?, cancelled? }, message: string }
// Auth: Authorization: Bearer <supabase access token>
// Validates that the caller owns the event (events.submitted_by === auth.uid()),
// applies the update with the service role (bypassing the admin-only RLS UPDATE policy),
// then sends a OneSignal push to every user in user_interests for that event.
export async function POST(request: Request) {
  try {
    // 1. Auth: extract bearer token, resolve user via Supabase
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
    const isAdmin = ADMIN_EMAILS.has(userEmail)

    // 2. Parse + validate body
    const body = await request.json().catch(() => null) as
      | { eventId?: unknown; updates?: Record<string, unknown>; message?: unknown }
      | null
    if (!body || typeof body.eventId !== 'number' || !body.updates || typeof body.updates !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    const eventId = body.eventId
    const message = typeof body.message === 'string' ? body.message.trim() : ''
    if (!message) {
      return NextResponse.json({ error: 'Notification message is required' }, { status: 400 })
    }
    if (message.length > 240) {
      return NextResponse.json({ error: 'Notification message too long (max 240 chars)' }, { status: 400 })
    }

    // Whitelist updates
    const cleanUpdates: Record<string, string | boolean> = {}
    for (const key of EDITABLE_FIELDS) {
      if (key in body.updates) {
        const value = (body.updates as Record<string, unknown>)[key]
        if (key === 'cancelled') {
          if (typeof value !== 'boolean') {
            return NextResponse.json({ error: '`cancelled` must be a boolean' }, { status: 400 })
          }
          cleanUpdates.cancelled = value
        } else {
          if (typeof value !== 'string') {
            return NextResponse.json({ error: `\`${key}\` must be a string` }, { status: 400 })
          }
          cleanUpdates[key] = value.trim()
        }
      }
    }
    if (Object.keys(cleanUpdates).length === 0) {
      return NextResponse.json({ error: 'No editable fields supplied' }, { status: 400 })
    }

    // 3. Ownership check — fetch the event and verify submitted_by
    const { data: existing, error: fetchError } = await supabase
      .from('events')
      .select('id, title, submitted_by, date, time, location, cancelled')
      .eq('id', eventId)
      .single()
    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }
    // Owners can edit their own events; admins can edit any event (including
    // scraped ones from Chamber / Lucas County ED / city websites that have no submitted_by).
    if (existing.submitted_by !== userId && !isAdmin) {
      return NextResponse.json({ error: 'You do not own this event' }, { status: 403 })
    }

    // 4. Apply update
    const { error: updateError } = await supabase
      .from('events')
      .update(cleanUpdates)
      .eq('id', eventId)
    if (updateError) {
      console.error('Event update failed:', updateError)
      return NextResponse.json({ error: 'Failed to update event' }, { status: 500 })
    }

    // 5. Notify interested users via OneSignal (per-user, all devices via external_id alias)
    const { data: interestRows } = await supabase
      .from('user_interests')
      .select('user_id')
      .eq('event_id', eventId)

    const interestedUserIds = Array.from(new Set((interestRows || []).map(r => r.user_id))).filter(Boolean)

    let notifiedCount = 0
    const notifyErrors: string[] = []
    const heading = cleanUpdates.cancelled === true ? 'Event Cancelled' : 'Event Updated'

    if (interestedUserIds.length > 0) {
      // Filter to users who have push enabled (have a onesignal_player_id)
      const { data: pushUsers } = await supabase
        .from('users')
        .select('id')
        .in('id', interestedUserIds)
        .not('onesignal_player_id', 'is', null)

      const targetIds = (pushUsers || []).map(u => u.id)

      // Send one push per user to reach all their devices
      for (const targetUserId of targetIds) {
        try {
          const response = await fetch('https://api.onesignal.com/notifications', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Key ${oneSignalApiKey}`,
            },
            body: JSON.stringify({
              app_id: oneSignalAppId,
              target_channel: 'push',
              include_aliases: { external_id: [targetUserId] },
              headings: { en: `${heading}: ${existing.title}` },
              contents: { en: message },
              url: 'https://www.gonewpaper.com',
            }),
          })
          if (response.ok) {
            notifiedCount++
          } else {
            const result = await response.json().catch(() => ({}))
            notifyErrors.push(`user ${targetUserId}: ${JSON.stringify(result)}`)
          }
        } catch (err) {
          notifyErrors.push(`user ${targetUserId}: ${err instanceof Error ? err.message : String(err)}`)
        }
      }
    }

    // 6. Audit log (best-effort)
    try {
      await supabase.from('notifications_log').insert({
        notification_type: cleanUpdates.cancelled === true ? 'event_cancelled' : 'event_updated',
        title: `${heading}: ${existing.title}`,
        sent_at: new Date().toISOString(),
        sent_via: 'onesignal',
        recipients_count: notifiedCount,
        metadata: {
          event_id: eventId,
          updated_by: userId,
          updated_by_admin: isAdmin && existing.submitted_by !== userId,
          changed_fields: Object.keys(cleanUpdates),
          message,
          interested_users: interestedUserIds.length,
          errors: notifyErrors.length > 0 ? notifyErrors : undefined,
        },
      })
    } catch (logErr) {
      console.error('Failed to log update notification:', logErr)
    }

    return NextResponse.json({
      success: true,
      eventId,
      changedFields: Object.keys(cleanUpdates),
      interestedUsers: interestedUserIds.length,
      notified: notifiedCount,
      errors: notifyErrors.length > 0 ? notifyErrors : undefined,
    })
  } catch (error) {
    console.error('Event update API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
