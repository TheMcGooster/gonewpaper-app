import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const oneSignalAppId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || 'a7951e0e-737c-42e6-bd9d-fc0931d95766'
const oneSignalApiKey = process.env.ONESIGNAL_REST_API_KEY!

export async function GET(request: Request) {
  // Verify this is called by Vercel Cron (not a random visitor)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get today's date in Central Time (UTC-6)
    const now = new Date()
    const centralOffset = -6 * 60
    const centralTime = new Date(now.getTime() + (centralOffset - now.getTimezoneOffset()) * 60000)
    const todayStr = centralTime.toISOString().split('T')[0]

    // Fetch today's events
    const { data: todaysEvents, error: eventsError } = await supabase
      .from('events')
      .select('title, time, location, category')
      .gte('date', todayStr)
      .lt('date', todayStr + 'T23:59:59')
      .order('date', { ascending: true })

    if (eventsError) {
      console.error('Error fetching events:', eventsError)
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
    }

    const eventCount = todaysEvents?.length || 0

    // Build notification message
    let heading = 'Good Morning Chariton!'
    let message: string

    if (eventCount === 0) {
      message = 'No events scheduled for today. Check out upcoming events in the app!'
    } else if (eventCount === 1) {
      const e = todaysEvents![0]
      message = `Today: ${e.category} ${e.title} at ${e.time || 'TBD'}${e.location ? ` - ${e.location}` : ''}`
    } else {
      // List first 2-3 events, mention total
      const preview = todaysEvents!.slice(0, 3).map(e => `${e.category} ${e.title}`).join(', ')
      message = `${eventCount} events today: ${preview}${eventCount > 3 ? ` +${eventCount - 3} more` : ''}`
    }

    // Send push notification to all subscribed users via OneSignal
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${oneSignalApiKey}`,
      },
      body: JSON.stringify({
        app_id: oneSignalAppId,
        included_segments: ['Subscribed Users'],
        headings: { en: heading },
        contents: { en: message },
        url: 'https://www.gonewpaper.com',
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('OneSignal API error:', result)
      return NextResponse.json({ error: 'OneSignal send failed', details: result }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      eventCount,
      message,
      oneSignalResponse: result,
    })
  } catch (error) {
    console.error('Daily summary cron error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
