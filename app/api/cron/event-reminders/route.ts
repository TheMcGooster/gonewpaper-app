import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const oneSignalAppId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || 'a7951e0e-737c-42e6-bd9d-fc0931d95766'
const oneSignalApiKey = process.env.ONESIGNAL_REST_API_KEY!

// Morning event reminder: sends each user a personalized push listing the events
// they marked "I'm Interested" in for today. Runs once daily at 11 UTC (~5-6 AM Central).
export async function GET(request: Request) {
  // Verify this is called by Vercel Cron
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get today's date in Central Time
    const centralTimeStr = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })
    const centralTime = new Date(centralTimeStr)
    const todayStr = centralTime.toISOString().split('T')[0]

    // Use a raw SQL query to avoid PostgREST FK constraint issues.
    // This joins user_interests, events, and users directly.
    const { data: rows, error } = await supabase.rpc('get_daily_event_reminders', {
      target_date: todayStr,
    })

    // If the RPC function doesn't exist yet, fall back to separate queries
    let interests = rows
    if (error) {
      console.log('RPC not available, using fallback queries:', error.message)

      // Fallback: query user_interests, then fetch related data separately
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
        })
      }

      const todayEventIds = new Set(todayEvents.map(e => e.id))
      const relevantInterests = interestRows.filter(r => todayEventIds.has(r.event_id))

      // Get users with player IDs
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

      // Check which reminders have already been sent
      const { data: alreadySent } = await supabase
        .from('event_reminders_sent')
        .select('user_id, event_id')
        .in('user_id', userIds)
        .in('event_id', Array.from(todayEventIds))

      const sentSet = new Set((alreadySent || []).map(r => `${r.user_id}:${r.event_id}`))

      // Build the combined result
      const userMap = new Map(usersWithPush.map(u => [u.id, u.onesignal_player_id]))
      const eventMap = new Map(todayEvents.map(e => [e.id, e]))

      interests = relevantInterests
        .filter(r => userMap.has(r.user_id) && !sentSet.has(`${r.user_id}:${r.event_id}`))
        .map(r => ({
          user_id: r.user_id,
          onesignal_player_id: userMap.get(r.user_id),
          event_id: r.event_id,
          event_title: eventMap.get(r.event_id)?.title,
          event_time: eventMap.get(r.event_id)?.time,
          event_location: eventMap.get(r.event_id)?.location,
        }))
    }

    if (!interests || interests.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No reminders to send (no interested users with push for today\'s events, or already sent)',
        sent: 0,
        date: todayStr,
      })
    }

    // Group events by user
    const userEvents: Record<string, { playerId: string; events: { id: number; title: string; time: string; location: string }[] }> = {}

    for (const row of interests) {
      const userId = row.user_id
      const playerId = row.onesignal_player_id
      if (!playerId) continue

      if (!userEvents[userId]) {
        userEvents[userId] = { playerId, events: [] }
      }
      userEvents[userId].events.push({
        id: row.event_id,
        title: row.event_title,
        time: row.event_time,
        location: row.event_location,
      })
    }

    let sentCount = 0
    const errors: string[] = []

    // Send one personalized push per user
    for (const [userId, data] of Object.entries(userEvents)) {
      try {
        const eventCount = data.events.length
        let message: string

        if (eventCount === 1) {
          const e = data.events[0]
          message = `Reminder: ${e.title} today at ${e.time || 'TBD'}${e.location ? ` - ${e.location}` : ''}`
        } else {
          const preview = data.events.slice(0, 3).map(e => e.title).join(', ')
          message = `You have ${eventCount} events today: ${preview}${eventCount > 3 ? ` +${eventCount - 3} more` : ''}`
        }

        const response = await fetch('https://api.onesignal.com/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Key ${oneSignalApiKey}`,
          },
          body: JSON.stringify({
            app_id: oneSignalAppId,
            target_channel: 'push',
            include_subscription_ids: [data.playerId],
            headings: { en: 'Your Events Today' },
            contents: { en: message },
            url: 'https://www.gonewpaper.com',
          }),
        })

        const result = await response.json()

        if (response.ok) {
          // Mark all these events as reminded for this user
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
        type: 'event_reminder',
        sent_at: new Date().toISOString(),
        details: {
          date: todayStr,
          sent: sentCount,
          totalUsers: Object.keys(userEvents).length,
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
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Event reminders cron error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
