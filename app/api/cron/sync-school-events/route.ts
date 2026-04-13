import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as cheerio from 'cheerio'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const oneSignalAppId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || 'a7951e0e-737c-42e6-bd9d-fc0931d95766'
const oneSignalApiKey = process.env.ONESIGNAL_REST_API_KEY!

// South Central Conference (Arbiter) school → Go New Paper town mapping
const SCHOOL_CONFIG = [
  { schoolId: 3, townId: 1, name: 'Chariton',  mascot: 'Chargers', defaultLocation: 'Chariton, IA' },
  { schoolId: 5, townId: 2, name: 'Knoxville', mascot: 'Panthers', defaultLocation: 'Knoxville, IA' },
  { schoolId: 1, townId: 3, name: 'Albia',     mascot: 'Blue Demons', defaultLocation: 'Albia, IA' },
]

const GENIE_ID = '664' // South Central Conference
const BASE_URL = 'https://www.southcentralconf.org'

// Map sport keywords to emojis for the category field
const SPORT_EMOJI_MAP: Record<string, string> = {
  'football':       '🏈',
  'basketball':     '🏀',
  'baseball':       '⚾',
  'softball':       '🥎',
  'soccer':         '⚽',
  'volleyball':     '🏐',
  'tennis':         '🎾',
  'golf':           '⛳',
  'track':          '🏃',
  'cross country':  '🏃',
  'wrestling':      '🤼',
  'swimming':       '🏊',
  'bowling':        '🎳',
  'cheer':          '📣',
  'dance':          '💃',
  'band':           '🎵',
  'chorus':         '🎵',
  'choir':          '🎵',
  'fine arts':      '🎨',
  'ffa':            '🌾',
  'academics':      '📚',
  'speech':         '🎤',
  'debate':         '🎤',
}

type ParsedEvent = {
  title: string
  sport: string
  level: string        // Varsity, JV, Middle School, etc.
  date: string         // YYYY-MM-DD
  time: string         // "4:00 PM" or "TBA"
  homeAway: 'home' | 'away' | 'neutral'
  opponent: string
  location: string
  rescheduledFrom: string | null  // "2026-04-07" if rescheduled
  cancelled: boolean
  category: string     // emoji
  rawText: string      // original text for debugging
}

function getSportEmoji(sportText: string): string {
  const lower = sportText.toLowerCase()
  for (const [keyword, emoji] of Object.entries(SPORT_EMOJI_MAP)) {
    if (lower.includes(keyword)) return emoji
  }
  return '🏈' // Default to sports
}

function parseLevel(text: string): string {
  const lower = text.toLowerCase()
  if (lower.includes('middle school') || lower.includes('ms ')) return 'Middle School'
  if (lower.includes('jv') || lower.includes('junior varsity')) return 'JV'
  if (lower.includes('freshman') || lower.includes('frosh')) return 'Freshman'
  if (lower.includes('varsity')) return 'Varsity'
  return 'Varsity' // default
}

function parseRescheduleDate(text: string): string | null {
  // Match "(Rescheduled from 04-07-26)" or "(Rescheduled from 04/07/26)"
  const match = text.match(/rescheduled\s+from\s+(\d{2})[-/](\d{2})[-/](\d{2,4})/i)
  if (!match) return null
  const month = match[1]
  const day = match[2]
  let year = match[3]
  if (year.length === 2) year = `20${year}`
  return `${year}-${month}-${day}`
}

function formatTime(rawTime: string): string {
  const trimmed = rawTime.trim()
  if (!trimmed || trimmed.toLowerCase() === 'tba' || trimmed.toLowerCase() === 'tbd') {
    return 'TBA'
  }
  // Already formatted like "4:00pm" or "4:00 PM" — normalize
  const match = trimmed.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i)
  if (match) {
    const hour = parseInt(match[1])
    const min = match[2]
    const ampm = (match[3] || 'PM').toUpperCase()
    return `${hour}:${min} ${ampm}`
  }
  return trimmed
}

// Generate a deterministic ID for dedup — using school + date + title hash
function generateEventId(schoolId: number, date: string, title: string, time: string): string {
  // Create a stable ID that survives reschedules (based on the new date)
  const normalized = `${schoolId}-${date}-${title.toLowerCase().replace(/[^a-z0-9]/g, '')}-${time.replace(/\s/g, '')}`
  return `scc-${normalized}`
}

async function fetchWeekPage(schoolId: number, dateStr: string): Promise<string> {
  const url = `${BASE_URL}/public/genie/${GENIE_ID}/school/${schoolId}/date/${dateStr}/view/week/`
  console.log(`Fetching: ${url}`)
  const response = await fetch(url, {
    signal: AbortSignal.timeout(20000),
    headers: {
      'User-Agent': 'GoNewPaper-EventSync/1.0',
    },
  })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for school ${schoolId} date ${dateStr}`)
  }
  return await response.text()
}

function parseDateHeader(text: string): string | null {
  const dateMatch = text.match(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(\w+)\s+(\d{1,2}),?\s+(\d{4})/i)
  if (!dateMatch) return null
  const monthName = dateMatch[1]
  const day = parseInt(dateMatch[2])
  const year = parseInt(dateMatch[3])
  const monthNum = new Date(`${monthName} 1, 2000`).getMonth() + 1
  return `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function parseWeekPage(html: string, schoolId: number, schoolName: string, defaultLocation: string): ParsedEvent[] {
  const $ = cheerio.load(html)
  const events: ParsedEvent[] = []

  // Remove hidden "location" spans that pollute text extraction
  $('span[style*="display:none"]').remove()

  // Arbiter HTML structure (confirmed from live site):
  //   <h2>Monday, April 13, 2026</h2>
  //   <table class="responsive-tbl">
  //     <tr class="table-data-styles">
  //       <td data-title="Time">4:00pm</td>
  //       <td data-title="Event"><a aria-label="Away, Tennis: Boys Varsity Match">Tennis: Boys Varsity Match</a></td>
  //       <td data-title="Location">vs. Trenton <a>Trenton Missouri High School</a></td>
  //     </tr>
  //   </table>

  let currentDate = ''

  // Walk through all h2 elements and their following tables
  $('h2').each((_, h2El) => {
    const headerText = $(h2El).text().trim()
    const parsedDate = parseDateHeader(headerText)
    if (parsedDate) {
      currentDate = parsedDate
    }
  })

  // Strategy: iterate all table rows with class "table-data-styles"
  // Track current date by finding the nearest preceding h2 with a date
  // We do this by iterating the raw HTML body and tracking date context

  const bodyHtml = $('body').html() || ''
  const dayPattern = /(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(\w+)\s+(\d{1,2}),?\s+(\d{4})/gi
  const dayMatches: RegExpExecArray[] = []
  let dayMatch: RegExpExecArray | null
  while ((dayMatch = dayPattern.exec(bodyHtml)) !== null) {
    dayMatches.push(dayMatch)
  }

  if (dayMatches.length === 0) {
    console.warn(`No date headers found for school ${schoolId}`)
    return events
  }

  // For each day section, load the HTML chunk and parse table rows with proper selectors
  for (let i = 0; i < dayMatches.length; i++) {
    const match = dayMatches[i]
    const dateStr = parseDateHeader(match[0])
    if (!dateStr) continue

    const startIdx = match.index! + match[0].length
    const endIdx = i + 1 < dayMatches.length ? dayMatches[i + 1].index! : bodyHtml.length
    const daySectionHtml = bodyHtml.slice(startIdx, endIdx)
    const $day = cheerio.load(`<div>${daySectionHtml}</div>`)

    // Remove hidden spans in day section too
    $day('span[style*="display:none"]').remove()

    // Target actual event rows
    $day('tr.table-data-styles, tr[class*="table-data"]').each((_, row) => {
      // --- TIME ---
      const timeCell = $day(row).find('td[data-title="Time"]')
      const rawTime = timeCell.text().trim()
      const time = formatTime(rawTime)

      // --- EVENT (sport + level) ---
      const eventCell = $day(row).find('td[data-title="Event"]')
      const eventLink = eventCell.find('a[aria-label]')
      const ariaLabel = eventLink.attr('aria-label') || ''
      const eventText = eventLink.text().trim() || eventCell.text().trim()

      // Skip empty/junk rows
      if (!eventText || eventText.length < 3) return
      // Skip login forms, nav elements
      if (eventText.toLowerCase().includes('login') || eventText.toLowerCase().includes('password')) return
      if (eventText.toLowerCase().includes('forgot')) return

      // --- HOME/AWAY from aria-label ---
      // aria-label format: "Away, Tennis: Boys Varsity Match" or "Home, Soccer: Girls Varsity"
      let homeAway: 'home' | 'away' | 'neutral' = 'neutral'
      if (ariaLabel.toLowerCase().startsWith('away')) {
        homeAway = 'away'
      } else if (ariaLabel.toLowerCase().startsWith('home')) {
        homeAway = 'home'
      }

      // --- SPORT + LEVEL + GENDER ---
      // eventText is like "Tennis: Boys Varsity Match" or "FFA State Convention"
      let sport = ''
      let eventDetails = eventText
      const sportMatch = eventText.match(/^([\w\s/]+?):\s*(.*)/i)
      if (sportMatch) {
        sport = sportMatch[1].trim()
        eventDetails = sportMatch[2].trim()
      }

      // Fallback sport detection for events without colon (e.g., "FFA State Convention")
      if (!sport) {
        const etLower = eventText.toLowerCase()
        for (const keyword of Object.keys(SPORT_EMOJI_MAP)) {
          if (etLower.startsWith(keyword)) {
            sport = eventText.slice(0, keyword.length)
            eventDetails = eventText.slice(keyword.length).trim()
            break
          }
        }
      }

      const level = parseLevel(eventDetails)
      const emoji = sport ? getSportEmoji(sport) : '📅'

      // Detect gender from event details
      let gender = ''
      const detailsLower = eventDetails.toLowerCase()
      if (detailsLower.includes('girls') || detailsLower.includes('girl')) gender = 'Girls'
      else if (detailsLower.includes('boys') || detailsLower.includes('boy')) gender = 'Boys'

      // --- LOCATION CELL (opponent + venue) ---
      const locationCell = $day(row).find('td[data-title="Location"]')
      const locationText = locationCell.text().trim()

      // Opponent: text before the @/venue div
      // Format: "vs. Trenton @ Trenton Missouri High School" or "vs. Multiple Schools.. @ Clarke High School"
      let opponent = ''
      const vsMatch = locationText.match(/vs\.?\s+(.+?)(?:\s+@\s+|$)/i)
      if (vsMatch) {
        opponent = vsMatch[1].trim()
          .replace(/multiple\s+schools\.*/i, 'Multiple Schools')
          .replace(/\s+/g, ' ')
      }

      // Venue/location: the <a> tag inside the location cell (after @ symbol)
      const venueLink = locationCell.find('a.table-data-styles-bold, a[data-url]')
      let location = venueLink.text().trim() || defaultLocation
      // Clean up venue — remove trailing whitespace/artifacts
      location = location.replace(/\s+/g, ' ').trim()
      if (!location) location = defaultLocation

      // Check for reschedule and cancellation in the full row text
      const fullRowText = $day(row).text().trim()
      const rescheduledFrom = parseRescheduleDate(fullRowText)
      const cancelled = /cancel(?:l)?ed/i.test(fullRowText)

      // --- BUILD TITLE ---
      // Include gender to avoid duplicate titles (Boys Track vs Girls Track)
      let title = ''
      if (sport) {
        title = `${schoolName} ${gender ? gender + ' ' : ''}${sport}`
        if (level !== 'Varsity') title += ` (${level})`
        if (opponent && opponent !== 'Multiple Schools') {
          title += homeAway === 'home' ? ` vs. ${opponent}` : ` @ ${opponent}`
        } else if (opponent === 'Multiple Schools') {
          if (eventDetails.toLowerCase().includes('invitational')) {
            title += ' Invitational'
          } else if (eventDetails.toLowerCase().includes('tournament')) {
            title += ' Tournament'
          } else {
            // For JV/Varsity multi-school meets, show the level context
            title += ' Meet'
          }
        } else if (eventDetails.toLowerCase().includes('invitational')) {
          title += ' Invitational'
        } else if (eventDetails.toLowerCase().includes('tournament')) {
          title += ' Tournament'
        } else if (eventDetails.toLowerCase().includes('meet') || eventDetails.toLowerCase().includes('dual')) {
          title += ' Meet'
        } else if (eventDetails.toLowerCase().includes('match')) {
          // already implied by sport name
        } else if (eventDetails.toLowerCase().includes('convention') || eventDetails.toLowerCase().includes('conference')) {
          title += ` - ${eventDetails}`
        } else {
          title += ` - ${eventDetails}`
        }
      } else {
        title = `${schoolName} - ${eventText}`
      }

      // Trim overly long titles
      if (title.length > 120) title = title.slice(0, 117) + '...'

      events.push({
        title,
        sport: sport || 'General',
        level,
        date: dateStr,
        time,
        homeAway,
        opponent,
        location,
        rescheduledFrom,
        cancelled,
        category: emoji,
        rawText: fullRowText.slice(0, 200),
      })
    })
  }

  return events
}

// Send a push notification to a specific town about a schedule change
async function sendScheduleChangeNotification(
  townId: number,
  townName: string,
  title: string,
  oldDate: string,
  newDate: string,
  newTime: string,
  cancelled: boolean
): Promise<boolean> {
  if (!oneSignalApiKey) {
    console.warn('ONESIGNAL_REST_API_KEY not set — skipping schedule change notification')
    return false
  }

  // Format dates for readability: "2026-04-07" → "Apr 7"
  const formatShortDate = (d: string) => {
    const [y, m, day] = d.split('-').map(Number)
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    return `${months[m - 1]} ${day}`
  }

  let message: string
  const emoji = cancelled ? '❌' : '📅'

  if (cancelled) {
    message = `${emoji} Cancelled: ${title} (was ${formatShortDate(oldDate)})`
  } else {
    message = `${emoji} Schedule Change: ${title} moved from ${formatShortDate(oldDate)} → ${formatShortDate(newDate)} at ${newTime}`
  }

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
        filters: [
          { field: 'tag', key: 'town_id', relation: '=', value: String(townId) }
        ],
        headings: { en: `${townName} Schedule Change` },
        contents: { en: message },
        url: 'https://www.gonewpaper.com',
      }),
    })

    if (!response.ok) {
      const err = await response.json()
      console.error(`OneSignal error for schedule change:`, err)
      return false
    }
    return true
  } catch (err) {
    console.error('Failed to send schedule change notification:', err)
    return false
  }
}

function getWeekStartDates(): string[] {
  // Current week + next 2 weeks (3 weeks of coverage)
  const dates: string[] = []
  const now = new Date()
  // Use Central Time
  const centralNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }))

  for (let weekOffset = 0; weekOffset < 3; weekOffset++) {
    const d = new Date(centralNow)
    d.setDate(d.getDate() + weekOffset * 7)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    dates.push(`${yyyy}-${mm}-${dd}`)
  }
  return dates
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const weekDates = getWeekStartDates()

  const results: Array<{
    school: string
    townId: number
    weeksProcessed: number
    eventsFound: number
    inserted: number
    updated: number
    skipped: number
    reschedulesDetected: number
    cancellationsDetected: number
    notificationsSent: number
    errors: string[]
  }> = []

  for (const school of SCHOOL_CONFIG) {
    const schoolResult = {
      school: school.name,
      townId: school.townId,
      weeksProcessed: 0,
      eventsFound: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      reschedulesDetected: 0,
      cancellationsDetected: 0,
      notificationsSent: 0,
      errors: [] as string[],
    }

    for (const weekDate of weekDates) {
      try {
        const html = await fetchWeekPage(school.schoolId, weekDate)
        const events = parseWeekPage(html, school.schoolId, school.name, school.defaultLocation)
        schoolResult.weeksProcessed++
        schoolResult.eventsFound += events.length

        for (const event of events) {
          const eventId = generateEventId(school.schoolId, event.date, event.title, event.time)

          // If this event was rescheduled from another date, try to cancel the old one
          if (event.rescheduledFrom) {
            schoolResult.reschedulesDetected++
            const oldEventId = generateEventId(school.schoolId, event.rescheduledFrom, event.title, event.time)

            // Check if we already know about this reschedule (event already exists at new date)
            const { data: alreadyRescheduled } = await supabase
              .from('events')
              .select('id')
              .eq('google_event_id', eventId)
              .limit(1)

            const isNewReschedule = !alreadyRescheduled || alreadyRescheduled.length === 0

            // Mark old event as cancelled
            await supabase
              .from('events')
              .update({ cancelled: true })
              .eq('google_event_id', oldEventId)
              .eq('town_id', school.townId)

            // Also try matching by title + old date (in case ID format changed)
            await supabase
              .from('events')
              .update({ cancelled: true })
              .ilike('title', `%${event.sport}%`)
              .eq('date', event.rescheduledFrom)
              .eq('town_id', school.townId)
              .eq('source_type', 'arbiter')

            // Send push notification for NEW reschedules only (avoid re-notifying every sync)
            if (isNewReschedule) {
              const sent = await sendScheduleChangeNotification(
                school.townId,
                school.name,
                event.title,
                event.rescheduledFrom,
                event.date,
                event.time,
                false
              )
              if (sent) schoolResult.notificationsSent++
            }
          }

          if (event.cancelled) {
            schoolResult.cancellationsDetected++

            // Check if this is a newly detected cancellation
            const { data: existingEvent } = await supabase
              .from('events')
              .select('id, cancelled')
              .eq('google_event_id', eventId)
              .limit(1)

            const isNewCancellation = existingEvent && existingEvent.length > 0 && !existingEvent[0].cancelled

            if (isNewCancellation) {
              const sent = await sendScheduleChangeNotification(
                school.townId,
                school.name,
                event.title,
                event.date,
                event.date,
                event.time,
                true
              )
              if (sent) schoolResult.notificationsSent++
            }
          }

          // Upsert the event
          const { data: existing } = await supabase
            .from('events')
            .select('id, cancelled, date, time')
            .eq('google_event_id', eventId)
            .limit(1)

          if (existing && existing.length > 0) {
            // Event exists — update it (handles reschedules to new dates/times)
            const { error: updateError } = await supabase
              .from('events')
              .update({
                title: event.title,
                date: event.date,
                time: event.time,
                location: event.location,
                cancelled: event.cancelled,
                category: event.category,
                description: event.rescheduledFrom
                  ? `Rescheduled from ${event.rescheduledFrom}`
                  : undefined,
              })
              .eq('id', existing[0].id)

            if (updateError) {
              schoolResult.errors.push(`Update error: ${event.title} - ${updateError.message}`)
              schoolResult.skipped++
            } else {
              schoolResult.updated++
            }
          } else {
            // New event — insert
            const { error: insertError } = await supabase
              .from('events')
              .insert({
                title: event.title,
                date: event.date,
                time: event.time,
                category: event.category,
                location: event.location,
                price: 'Free',
                source: `SCC - ${school.name} ${school.mascot}`,
                description: event.rescheduledFrom
                  ? `Rescheduled from ${event.rescheduledFrom}`
                  : `${event.sport} ${event.level}${event.opponent ? ` - ${event.opponent}` : ''}`,
                verified: true,
                town_id: school.townId,
                google_event_id: eventId,
                source_type: 'arbiter',
                cancelled: event.cancelled,
              })

            if (insertError) {
              // Might be a dedup collision — try title+date check
              const { data: dupCheck } = await supabase
                .from('events')
                .select('id')
                .eq('title', event.title)
                .eq('date', event.date)
                .eq('town_id', school.townId)
                .limit(1)

              if (dupCheck && dupCheck.length > 0) {
                schoolResult.skipped++ // Already exists via different ID
              } else {
                schoolResult.errors.push(`Insert error: ${event.title} - ${insertError.message}`)
                schoolResult.skipped++
              }
            } else {
              schoolResult.inserted++
            }
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        schoolResult.errors.push(`Week ${weekDate}: ${msg}`)
        console.error(`Error scraping ${school.name} week ${weekDate}:`, err)
      }
    }

    results.push(schoolResult)
  }

  const totalInserted = results.reduce((sum, r) => sum + r.inserted, 0)
  const totalUpdated = results.reduce((sum, r) => sum + r.updated, 0)
  const totalEvents = results.reduce((sum, r) => sum + r.eventsFound, 0)
  const totalReschedules = results.reduce((sum, r) => sum + r.reschedulesDetected, 0)
  const totalNotifications = results.reduce((sum, r) => sum + r.notificationsSent, 0)

  return NextResponse.json({
    success: true,
    syncedAt: new Date().toISOString(),
    conference: 'South Central Conference',
    schoolsProcessed: SCHOOL_CONFIG.length,
    weeksPerSchool: weekDates.length,
    weekDates,
    totalEventsFound: totalEvents,
    totalInserted,
    totalUpdated,
    totalReschedules,
    totalNotificationsSent: totalNotifications,
    results,
  })
}
