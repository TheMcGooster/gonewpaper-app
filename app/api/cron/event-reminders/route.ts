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

    // Find all users who have interests in today's events AND have push enabled
    const { data: interests, error } = await supabase
      .from('user_interests')
      .select(`
        user_id,
        event_id,
        events!inner(id, title, date, time, location),
        users!inner(id, onesignal_player_id)
      `)
      .eq('events.date', todayStr)
      .not('users.onesignal_player_id', 'is', null)

    if (error) {
      console.error('Event reminders query error:', error)
      return NextResponse.json({ error: 'Query failed', details: error.message }, { status: 500 })
    }

    if (!interests || interests.length === 0) {
      return NextResponse.json({ success: true, message: 'No users with interests in today\'s events', sent: 0 })
    }

    // Group events by user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userEvents: Record<string, { playerId: string; events: any[] }> = {}

    for (const interest of interests) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const user = interest.users as any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const event = interest.events as any
      if (!user?.onesignal_player_id) continue

      const userId = interest.user_id
      if (!userEvents[userId]) {
        userEvents[userId] = { playerId: user.onesignal_player_id, events: [] }
      }
      userEvents[userId].events.push(event)
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
          const preview = data.events.slice(0, 3).map((e: { title: string }) => e.title).join(', ')
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
        } else {
          errors.push(`Failed for user ${userId}: ${JSON.stringify(result)}`)
        }
      } catch (err) {
        errors.push(`Error for user ${userId}: ${err}`)
      }
    }

    return NextResponse.json({
      success: true,
      sent: sentCount,
      totalUsers: Object.keys(userEvents).length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Event reminders cron error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
