import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const oneSignalAppId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || 'a7951e0e-737c-42e6-bd9d-fc0931d95766'
const oneSignalApiKey = process.env.ONESIGNAL_REST_API_KEY!

// Combined daily morning cron: runs at noon UTC (~6-7 AM Central)
// Handles: daily summary notification, purge old obituaries, purge past events
export async function GET(request: Request) {
  // Verify this is called by Vercel Cron (not a random visitor)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Get today's date in Central Time — auto-handles DST
  const centralTimeStr = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })
  const centralTime = new Date(centralTimeStr)
  const todayStr = centralTime.toISOString().split('T')[0]

  const results: {
    dailySummary?: Record<string, unknown>
    purgeObituaries?: Record<string, unknown>
    purgeEvents?: Record<string, unknown>
    purgeHousing?: Record<string, unknown>
  } = {}

  // --- 1. Daily Summary Notification (Per-Town) ---
  try {
    // Get all active towns
    const { data: activeTowns, error: townsError } = await supabase
      .from('towns')
      .select('id, name')
      .eq('is_active', true)

    if (townsError) {
      console.error('Error fetching towns:', townsError)
      results.dailySummary = { error: 'Failed to fetch towns', details: townsError.message }
    } else {
      const townResults: Record<string, unknown>[] = []

      for (const town of (activeTowns || [])) {
        // Fetch today's events for this town
        const { data: todaysEvents, error: eventsError } = await supabase
          .from('events')
          .select('title, time, location, category')
          .eq('date', todayStr)
          .eq('town_id', town.id)
          .order('time', { ascending: true })

        if (eventsError) {
          console.error(`Error fetching events for ${town.name}:`, eventsError)
          townResults.push({ town: town.name, error: eventsError.message })
          continue
        }

        const eventCount = todaysEvents?.length || 0

        // Build notification message
        const heading = `Good Morning ${town.name}!`
        let message: string

        if (eventCount === 0) {
          message = 'No events scheduled for today. Check out upcoming events in the app!'
        } else if (eventCount === 1) {
          const e = todaysEvents![0]
          const cat = e.category ? `${e.category} ` : ''
          message = `Today: ${cat}${e.title} at ${e.time || 'TBD'}${e.location ? ` - ${e.location}` : ''}`
        } else {
          const preview = todaysEvents!.slice(0, 3).map(e => {
            const cat = e.category ? `${e.category} ` : ''
            return `${cat}${e.title}`
          }).join(', ')
          message = `${eventCount} events today: ${preview}${eventCount > 3 ? ` +${eventCount - 3} more` : ''}`
        }

        // Send push notification filtered by town_id tag
        // Users get tagged with town_id when they select their town in the app
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
              { field: 'tag', key: 'town_id', relation: '=', value: String(town.id) }
            ],
            headings: { en: heading },
            contents: { en: message },
            url: 'https://www.gonewpaper.com',
          }),
        })

        const result = await response.json()

        if (!response.ok) {
          console.error(`OneSignal API error for ${town.name}:`, result)
          townResults.push({ town: town.name, error: 'OneSignal send failed', details: result })
        } else {
          townResults.push({ town: town.name, success: true, eventCount, message, oneSignalResponse: result })
        }
      }

      results.dailySummary = { success: true, towns: townResults }
    }
  } catch (error) {
    console.error('Daily summary error:', error)
    results.dailySummary = { error: 'Daily summary failed' }
  }

  // --- 2. Purge Old Obituaries ---
  try {
    const today = todayStr

    // Calculate the date 14 days ago (in Central Time)
    const fourteenDaysAgo = new Date(centralTime)
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
    const cutoffDate = fourteenDaysAgo.toISOString().split('T')[0]

    // Rule 1: Find entries where service_date has passed
    const { data: pastByService, error: serviceError } = await supabase
      .from('celebrations_of_life')
      .select('id, full_name, service_date, passing_date')
      .lt('service_date', today)

    if (serviceError) {
      console.error('Error fetching past obituaries by service_date:', serviceError)
      results.purgeObituaries = { error: 'Failed to fetch past obituaries', details: serviceError.message }
    } else {
      // Rule 2: Find entries where passing_date is 14+ days ago
      const { data: pastByPassing, error: passingError } = await supabase
        .from('celebrations_of_life')
        .select('id, full_name, service_date, passing_date')
        .lt('passing_date', cutoffDate)

      if (passingError) {
        console.error('Error fetching past obituaries by passing_date:', passingError)
        results.purgeObituaries = { error: 'Failed to fetch stale obituaries', details: passingError.message }
      } else {
        // Combine both lists, dedup by id
        const allPast = [...(pastByService || []), ...(pastByPassing || [])]
        const uniqueIds = Array.from(new Set(allPast.map(o => o.id)))
        const uniqueNames = Array.from(new Set(allPast.map(o => o.full_name)))

        if (uniqueIds.length === 0) {
          results.purgeObituaries = { success: true, message: 'No past obituaries to purge', deleted: 0 }
        } else {
          const { error: deleteError } = await supabase
            .from('celebrations_of_life')
            .delete()
            .in('id', uniqueIds)

          if (deleteError) {
            console.error('Error deleting past obituaries:', deleteError)
            results.purgeObituaries = { error: 'Failed to delete past obituaries', details: deleteError.message }
          } else {
            results.purgeObituaries = {
              success: true,
              deleted: uniqueIds.length,
              purgedByServiceDate: (pastByService || []).length,
              purgedByPassingDate: (pastByPassing || []).length,
              names: uniqueNames,
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Purge obituaries error:', error)
    results.purgeObituaries = { error: 'Purge obituaries failed' }
  }

  // --- 3. Purge Past Events ---
  try {
    const { data: pastEvents, error: fetchError } = await supabase
      .from('events')
      .select('id')
      .lt('date', todayStr)

    if (fetchError) {
      console.error('Error fetching past events:', fetchError)
      results.purgeEvents = { error: 'Failed to fetch past events', details: fetchError.message }
    } else if (!pastEvents || pastEvents.length === 0) {
      results.purgeEvents = { success: true, message: 'No past events to purge', deleted: 0 }
    } else {
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
        results.purgeEvents = { error: 'Failed to delete past events', details: deleteError.message }
      } else {
        results.purgeEvents = {
          success: true,
          deleted: pastEventIds.length,
          interests_cleaned: !interestsError,
          reminders_cleaned: !remindersError,
        }
      }
    }
  } catch (error) {
    console.error('Purge events error:', error)
    results.purgeEvents = { error: 'Purge events failed' }
  }

  // --- 4. Purge Expired Housing Listings ---
  try {
    const { data: expiredHousing, error: fetchError } = await supabase
      .from('housing')
      .select('id, title')
      .lt('expires_at', new Date().toISOString())
      .eq('is_active', true)

    if (fetchError) {
      console.error('Error fetching expired housing:', fetchError)
      results.purgeHousing = { error: 'Failed to fetch expired housing', details: fetchError.message }
    } else if (!expiredHousing || expiredHousing.length === 0) {
      results.purgeHousing = { success: true, message: 'No expired housing to purge', deactivated: 0 }
    } else {
      const expiredIds = expiredHousing.map(h => h.id)

      // Soft-delete: deactivate and mark as expired (keeps data for records)
      const { error: updateError } = await supabase
        .from('housing')
        .update({ is_active: false, payment_status: 'expired' })
        .in('id', expiredIds)

      if (updateError) {
        console.error('Error deactivating expired housing:', updateError)
        results.purgeHousing = { error: 'Failed to deactivate expired housing', details: updateError.message }
      } else {
        results.purgeHousing = {
          success: true,
          deactivated: expiredIds.length,
          titles: expiredHousing.map(h => h.title),
        }
      }
    }
  } catch (error) {
    console.error('Purge housing error:', error)
    results.purgeHousing = { error: 'Purge housing failed' }
  }

  return NextResponse.json({ success: true, ...results })
}
