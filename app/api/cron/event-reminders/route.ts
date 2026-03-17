import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const oneSignalAppId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || 'a7951e0e-737c-42e6-bd9d-fc0931d95766'
const oneSignalApiKey = process.env.ONESIGNAL_REST_API_KEY!

// Parse event time string (e.g. "16:00:00", "4:00 PM", "16:00") into hours and minutes
function parseEventTime(timeStr: string): { hours: number; minutes: number } | null {
  if (!timeStr) return null

  // Try 24-hour format first: "16:00:00" or "16:00"
  const match24 = timeStr.match(/^(\d{1,2}):(\d{2})/)
  if (match24) {
    const h = parseInt(match24[1], 10)
    const m = parseInt(match24[2], 10)
    // Check if it has AM/PM suffix (12-hour format like "4:00 PM")
    const ampmMatch = timeStr.match(/\s*(AM|PM)\s*$/i)
    if (ampmMatch) {
      const isPM = ampmMatch[1].toUpperCase() === 'PM'
      let hours = h
      if (isPM && h !== 12) hours += 12
      if (!isPM && h === 12) hours = 0
      return { hours, minutes: m }
    }
    // Pure 24-hour format
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return { hours: h, minutes: m }
    }
  }
  return null
}

// Get current time in Central Time as hours and minutes
// Uses Intl.DateTimeFormat.formatToParts for reliable timezone conversion
// (avoids fragile new Date(toLocaleString()) re-parsing pattern)
function getCentralTimeNow(): { hours: number; minutes: number; dateStr: string } {
  const now = new Date()

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

  const parts = formatter.formatToParts(now)
  const get = (type: string) => parts.find(p => p.type === type)?.value || '0'

  let hours = parseInt(get('hour'), 10)
  // hour12:false can return '24' for midnight in some environments — normalize
  if (hours === 24) hours = 0

  const minutes = parseInt(get('minute'), 10)
  const dateStr = `${get('year')}-${get('month')}-${get('day')}`

  console.log(`getCentralTimeNow: UTC=${now.toISOString()}, Central=${hours}:${String(minutes).padStart(2, '0')}, date=${dateStr}`)

  return { hours, minutes, dateStr }
}

// Event reminder: sends each user a push 15-45 min before their interested events.
// Called every 30 min by ActivePieces (or Vercel Cron as backup).
// Uses OneSignal external_id (via login) to reach ALL devices per user.
export async function GET(request: Request) {
  // Verify this is called by Vercel Cron or ActivePieces
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { hours: nowHours, minutes: nowMinutes, dateStr: todayStr } = getCentralTimeNow()
    const nowTotalMinutes = nowHours * 60 + nowMinutes

    console.log(`Event reminders running at ${nowHours}:${String(nowMinutes).padStart(2, '0')} Central (${todayStr})`)

    // Fetch all today's events that users have marked interest in
    const { data: interestRows, error: intError } = await supabase
      .from('user_interests')
      .select('user_id, event_id')

    if (intError || !interestRows || interestRows.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No user interests found',
        sent: 0,
        debug: intError?.message,
      })
    }

    // Get today's events
    const eventIds = Array.from(new Set(interestRows.map(r => r.event_id)))
    const { data: todayEvents } = await supabase
      .from('events')
      .select('id, title, date, time, location')
      .eq('date', todayStr)
      .in('id', eventIds)

    if (!todayEvents || todayEvents.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No interested events happening today',
        sent: 0,
        date: todayStr,
        currentTime: `${nowHours}:${String(nowMinutes).padStart(2, '0')} Central`,
      })
    }

    // Filter events to ONLY those starting within the next 15-45 minute window
    // This means: event time is 15 to 45 minutes from now
    const upcomingEvents = todayEvents.filter(event => {
      const parsed = parseEventTime(event.time)
      if (!parsed) {
        // If event has no parseable time, skip it (don't send premature reminder)
        console.log(`Skipping event "${event.title}" — unparseable time: ${event.time}`)
        return false
      }
      const eventTotalMinutes = parsed.hours * 60 + parsed.minutes
      const minutesUntilEvent = eventTotalMinutes - nowTotalMinutes

      console.log(`Event "${event.title}" at ${event.time} → ${minutesUntilEvent} min from now`)

      // Send reminder if event is 15 to 45 minutes away
      return minutesUntilEvent >= 15 && minutesUntilEvent <= 45
    })

    if (upcomingEvents.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No events starting in the next 15-45 minutes',
        sent: 0,
        date: todayStr,
        currentTime: `${nowHours}:${String(nowMinutes).padStart(2, '0')} Central`,
        todayEventCount: todayEvents.length,
        todayEvents: todayEvents.map(e => ({ title: e.title, time: e.time })),
      })
    }

    const upcomingEventIds = new Set(upcomingEvents.map(e => e.id))
    const relevantInterests = interestRows.filter(r => upcomingEventIds.has(r.event_id))

    // Get users (we target by external_id now, but still need to verify they have push enabled)
    const userIds = Array.from(new Set(relevantInterests.map(r => r.user_id)))
    const { data: usersWithPush } = await supabase
      .from('users')
      .select('id, onesignal_player_id')
      .in('id', userIds)
      .not('onesignal_player_id', 'is', null)

    if (!usersWithPush || usersWithPush.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No interested users have push notifications enabled',
        sent: 0,
        date: todayStr,
        interestedUsers: userIds.length,
      })
    }

    // Check which reminders have already been sent (dedup)
    const { data: alreadySent } = await supabase
      .from('event_reminders_sent')
      .select('user_id, event_id')
      .in('user_id', userIds)
      .in('event_id', Array.from(upcomingEventIds))

    const sentSet = new Set((alreadySent || []).map(r => `${r.user_id}:${r.event_id}`))

    // Build per-user event lists
    const userSet = new Set(usersWithPush.map(u => u.id))
    const eventMap = new Map(upcomingEvents.map(e => [e.id, e]))

    const userEvents: Record<string, { events: { id: number; title: string; time: string; location: string }[] }> = {}

    for (const r of relevantInterests) {
      if (!userSet.has(r.user_id)) continue
      if (sentSet.has(`${r.user_id}:${r.event_id}`)) continue
      const event = eventMap.get(r.event_id)
      if (!event) continue

      if (!userEvents[r.user_id]) {
        userEvents[r.user_id] = { events: [] }
      }
      userEvents[r.user_id].events.push({
        id: event.id,
        title: event.title,
        time: event.time,
        location: event.location,
      })
    }

    if (Object.keys(userEvents).length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All reminders already sent for upcoming events',
        sent: 0,
        date: todayStr,
      })
    }

    let sentCount = 0
    const errors: string[] = []

    // Send one personalized push per user — target ALL devices via external_id
    for (const [userId, data] of Object.entries(userEvents)) {
      try {
        const eventCount = data.events.length
        let message: string

        if (eventCount === 1) {
          const e = data.events[0]
          // Format time for display
          const displayTime = e.time ? formatTime(e.time) : 'soon'
          message = `Starting soon: ${e.title} at ${displayTime}${e.location ? ` — ${e.location}` : ''}`
        } else {
          const preview = data.events.slice(0, 3).map(e => e.title).join(', ')
          message = `${eventCount} events starting soon: ${preview}${eventCount > 3 ? ` +${eventCount - 3} more` : ''}`
        }

        // Use include_aliases with external_id to reach ALL of the user's devices
        // This works because page.tsx now calls OneSignal.login(userId) linking devices
        const response = await fetch('https://api.onesignal.com/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Key ${oneSignalApiKey}`,
          },
          body: JSON.stringify({
            app_id: oneSignalAppId,
            target_channel: 'push',
            include_aliases: { external_id: [userId] },
            headings: { en: 'Event Starting Soon!' },
            contents: { en: message },
            url: 'https://www.gonewpaper.com',
          }),
        })

        const result = await response.json()

        if (response.ok) {
          // Mark these events as reminded for this user (dedup)
          for (const event of data.events) {
            await supabase
              .from('event_reminders_sent')
              .upsert({
                user_id: userId,
                event_id: event.id,
              }, {
                onConflict: 'user_id,event_id',
              })
          }
          sentCount++
          console.log(`Sent reminder to user ${userId}: ${message}`)
        } else {
          errors.push(`Failed for user ${userId}: ${JSON.stringify(result)}`)
        }
      } catch (err) {
        errors.push(`Error for user ${userId}: ${err}`)
      }
    }

    // Log to notifications_log
    try {
      await supabase.from('notifications_log').insert({
        notification_type: 'event_reminder',
        title: 'Event Reminders (30 min before)',
        sent_at: new Date().toISOString(),
        sent_via: 'onesignal',
        town_id: 1,
        recipients_count: sentCount,
        metadata: {
          date: todayStr,
          currentTime: `${nowHours}:${String(nowMinutes).padStart(2, '0')} Central`,
          sent: sentCount,
          totalUsers: Object.keys(userEvents).length,
          upcomingEvents: upcomingEvents.map(e => ({ title: e.title, time: e.time })),
          errors: errors.length > 0 ? errors : undefined,
        },
      })
    } catch (logErr) {
      console.error('Failed to log notification:', logErr)
    }

    return NextResponse.json({
      success: true,
      sent: sentCount,
      totalUsers: Object.keys(userEvents).length,
      date: todayStr,
      currentTime: `${nowHours}:${String(nowMinutes).padStart(2, '0')} Central`,
      upcomingEvents: upcomingEvents.map(e => ({ title: e.title, time: e.time })),
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Event reminders cron error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Format time from "16:00:00" to "4:00 PM"
function formatTime(timeStr: string): string {
  try {
    if (!timeStr) return ''
    const [hours24, minutes] = timeStr.split(':')
    const hours = parseInt(hours24, 10)
    const ampm = hours >= 12 ? 'PM' : 'AM'
    const hour12 = hours % 12 || 12
    return `${hour12}:${minutes} ${ampm}`
  } catch {
    return timeStr
  }
}
