import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const oneSignalAppId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || 'a7951e0e-737c-42e6-bd9d-fc0931d95766'
const oneSignalApiKey = process.env.ONESIGNAL_REST_API_KEY!

export async function GET(request: Request) {
  // Verify this is called by Vercel Cron
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Find events starting in 25-35 minutes where users have marked interest
    // and haven't been notified yet
    const { data: reminders, error: remindersError } = await supabase
      .rpc('get_upcoming_event_reminders')

    if (remindersError) {
      console.error('Error fetching reminders:', remindersError)
      // If the function doesn't exist yet, try manual query
      return await fallbackReminderQuery(supabase)
    }

    if (!reminders || reminders.length === 0) {
      return NextResponse.json({ success: true, message: 'No reminders to send', sent: 0 })
    }

    let sentCount = 0
    const errors: string[] = []

    // Send individual notifications to each user
    for (const reminder of reminders) {
      if (!reminder.onesignal_player_id) continue

      try {
        const response = await fetch('https://onesignal.com/api/v1/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${oneSignalApiKey}`,
          },
          body: JSON.stringify({
            app_id: oneSignalAppId,
            include_player_ids: [reminder.onesignal_player_id],
            headings: { en: 'Event Starting Soon!' },
            contents: {
              en: `${reminder.event_title} starts in ~30 minutes${reminder.event_location ? ` at ${reminder.event_location}` : ''}`,
            },
            url: 'https://www.gonewpaper.com',
          }),
        })

        const result = await response.json()

        if (response.ok) {
          // Record that we sent this reminder so we don't send it again
          await supabase
            .from('event_reminders_sent')
            .upsert({
              user_id: reminder.user_id,
              event_id: reminder.event_id,
            }, {
              onConflict: 'user_id,event_id',
            })
          sentCount++
        } else {
          errors.push(`Failed for user ${reminder.user_id}: ${JSON.stringify(result)}`)
        }
      } catch (err) {
        errors.push(`Error for user ${reminder.user_id}: ${err}`)
      }
    }

    return NextResponse.json({
      success: true,
      sent: sentCount,
      total: reminders.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Event reminders cron error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Fallback if the Supabase RPC function hasn't been created yet
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fallbackReminderQuery(supabase: any) {
  try {
    // Calculate the time window: events starting in 25-35 minutes from now
    const now = new Date()
    const from = new Date(now.getTime() + 25 * 60000)
    const to = new Date(now.getTime() + 35 * 60000)

    // Get user interests joined with events and users
    const { data: interests, error } = await supabase
      .from('user_interests')
      .select(`
        user_id,
        event_id,
        events!inner(id, title, date, time, location),
        users!inner(id, onesignal_player_id)
      `)
      .gte('events.date', from.toISOString())
      .lte('events.date', to.toISOString())
      .not('users.onesignal_player_id', 'is', null)

    if (error) {
      console.error('Fallback query error:', error)
      return NextResponse.json({ error: 'Fallback query failed', details: error }, { status: 500 })
    }

    if (!interests || interests.length === 0) {
      return NextResponse.json({ success: true, message: 'No reminders to send (fallback)', sent: 0 })
    }

    let sentCount = 0
    const oneSignalApiKey = process.env.ONESIGNAL_REST_API_KEY!
    const oneSignalAppId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || 'a7951e0e-737c-42e6-bd9d-fc0931d95766'

    for (const interest of interests) {
      const event = interest.events as any
      const user = interest.users as any
      if (!user?.onesignal_player_id) continue

      // Check if already sent
      const { data: alreadySent } = await supabase
        .from('event_reminders_sent')
        .select('id')
        .eq('user_id', interest.user_id)
        .eq('event_id', interest.event_id)
        .limit(1)

      if (alreadySent && alreadySent.length > 0) continue

      const response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${oneSignalApiKey}`,
        },
        body: JSON.stringify({
          app_id: oneSignalAppId,
          include_player_ids: [user.onesignal_player_id],
          headings: { en: 'Event Starting Soon!' },
          contents: {
            en: `${event.title} starts in ~30 minutes${event.location ? ` at ${event.location}` : ''}`,
          },
          url: 'https://www.gonewpaper.com',
        }),
      })

      if (response.ok) {
        await supabase
          .from('event_reminders_sent')
          .upsert({
            user_id: interest.user_id,
            event_id: interest.event_id,
          }, {
            onConflict: 'user_id,event_id',
          })
        sentCount++
      }
    }

    return NextResponse.json({ success: true, sent: sentCount, method: 'fallback' })
  } catch (err) {
    console.error('Fallback error:', err)
    return NextResponse.json({ error: 'Fallback failed' }, { status: 500 })
  }
}
