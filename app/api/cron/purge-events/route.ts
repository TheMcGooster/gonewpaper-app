import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(request: Request) {
  // Verify authorization
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Find all events from past days (keep today's events even if the time has passed)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const startOfToday = today.toISOString()

    const { data: pastEvents, error: fetchError } = await supabase
      .from('events')
      .select('id')
      .lt('date', startOfToday)

    if (fetchError) {
      console.error('Error fetching past events:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch past events', details: fetchError.message }, { status: 500 })
    }

    if (!pastEvents || pastEvents.length === 0) {
      return NextResponse.json({ success: true, message: 'No past events to purge', deleted: 0 })
    }

    const pastEventIds = pastEvents.map(e => e.id)

    // Clean up related user_interests for these events
    const { error: interestsError } = await supabase
      .from('user_interests')
      .delete()
      .in('event_id', pastEventIds)

    if (interestsError) {
      console.error('Error cleaning up user_interests:', interestsError)
      // Continue anyway — don't block event deletion
    }

    // Clean up related event_reminders_sent for these events
    const { error: remindersError } = await supabase
      .from('event_reminders_sent')
      .delete()
      .in('event_id', pastEventIds)

    if (remindersError) {
      console.error('Error cleaning up event_reminders_sent:', remindersError)
      // Continue anyway
    }

    // Delete the past events
    const { error: deleteError } = await supabase
      .from('events')
      .delete()
      .in('id', pastEventIds)

    if (deleteError) {
      console.error('Error deleting past events:', deleteError)
      return NextResponse.json({ error: 'Failed to delete past events', details: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      deleted: pastEventIds.length,
      interests_cleaned: !interestsError,
      reminders_cleaned: !remindersError,
    })
  } catch (error) {
    console.error('Purge events cron error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
