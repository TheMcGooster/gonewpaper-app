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

  // Get today's date in Central Time — en-CA gives YYYY-MM-DD, auto-handles DST
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

  const results: {
    dailySummary?: Record<string, unknown>
    purgeObituaries?: Record<string, unknown>
    purgeEvents?: Record<string, unknown>
    purgeHousing?: Record<string, unknown>
    interestReports?: Record<string, unknown>
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

  // --- 2. Soft-Delete Old Obituaries ---
  // Uses soft-delete (is_approved = false) instead of hard-delete so that
  // the dedup check in ingest-obituaries still finds the name and skips re-insertion.
  // This prevents the cycle: purge deletes → scraper re-inserts → purge deletes again.
  try {
    // Calculate cutoff dates — 21 days covers even delayed memorial services
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 21)
    const cutoffStr = cutoffDate.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
    const cutoffISO = cutoffDate.toISOString()

    // Only soft-delete entries that are currently visible (is_approved = true)
    // Rule 1: service_date has passed
    const { data: pastByService } = await supabase
      .from('celebrations_of_life')
      .select('id, full_name')
      .eq('is_approved', true)
      .lt('service_date', todayStr)

    // Rule 2: passing_date is 21+ days ago AND no future service_date
    // (If service_date exists, Rule 1 handles it — don't hide someone whose service hasn't happened yet)
    const { data: pastByPassing } = await supabase
      .from('celebrations_of_life')
      .select('id, full_name')
      .eq('is_approved', true)
      .lt('passing_date', cutoffStr)
      .is('service_date', null)

    // Rule 3: NULL dates — use created_at as fallback (catches scraper entries with broken date parsing)
    const { data: pastByCreated } = await supabase
      .from('celebrations_of_life')
      .select('id, full_name')
      .eq('is_approved', true)
      .is('service_date', null)
      .is('passing_date', null)
      .lt('created_at', cutoffISO)

    // Combine all lists, dedup by id
    const allPast = [...(pastByService || []), ...(pastByPassing || []), ...(pastByCreated || [])]
    const uniqueIds = Array.from(new Set(allPast.map(o => o.id)))
    const uniqueNames = Array.from(new Set(allPast.map(o => o.full_name)))

    if (uniqueIds.length === 0) {
      results.purgeObituaries = { success: true, message: 'No past obituaries to soft-delete', hidden: 0 }
    } else {
      // Soft-delete: set is_approved = false (keeps record for dedup, hides from frontend)
      const { error: updateError } = await supabase
        .from('celebrations_of_life')
        .update({ is_approved: false })
        .in('id', uniqueIds)

      if (updateError) {
        console.error('Error soft-deleting past obituaries:', updateError)
        results.purgeObituaries = { error: 'Failed to soft-delete past obituaries', details: updateError.message }
      } else {
        results.purgeObituaries = {
          success: true,
          hidden: uniqueIds.length,
          hiddenByServiceDate: (pastByService || []).length,
          hiddenByPassingDate: (pastByPassing || []).length,
          hiddenByCreatedAt: (pastByCreated || []).length,
          names: uniqueNames,
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

  // --- 5. Day-of Interest Reports for Event Organizers ---
  // For today's events submitted by users, notify the submitter with interest count
  try {
    const { data: todayEvents } = await supabase
      .from('events')
      .select('id, title, submitted_by')
      .eq('date', todayStr)
      .not('submitted_by', 'is', null)

    if (todayEvents && todayEvents.length > 0) {
      const eventIds = todayEvents.map(e => e.id)
      const { data: counts } = await supabase.rpc('get_event_interest_counts', { event_ids: eventIds })
      const countMap: Record<number, number> = {}
      if (counts) {
        counts.forEach((c: any) => { countMap[c.event_id] = Number(c.interest_count) })
      }

      const sent: string[] = []
      for (const event of todayEvents) {
        const count = countMap[event.id] || 0
        if (count === 0) continue // Only notify if there are interests

        // Send push to the submitter via external_id (all their devices)
        const response = await fetch('https://api.onesignal.com/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Key ${oneSignalApiKey}`,
          },
          body: JSON.stringify({
            app_id: oneSignalAppId,
            target_channel: 'push',
            include_aliases: { external_id: [event.submitted_by] },
            headings: { en: `Your Event is Today!` },
            contents: { en: `"${event.title}" has ${count} ${count === 1 ? 'person' : 'people'} interested! Good luck today!` },
            url: 'https://www.gonewpaper.com',
          }),
        })

        if (response.ok) {
          sent.push(`${event.title}: ${count} interested`)
        }
      }

      results.interestReports = { success: true, sent }
    } else {
      results.interestReports = { success: true, message: 'No user-submitted events today' }
    }
  } catch (error) {
    console.error('Interest reports error:', error)
    results.interestReports = { error: 'Interest reports failed' }
  }

  return NextResponse.json({ success: true, ...results })
}
