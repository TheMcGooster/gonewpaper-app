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

    // Get today's date in Central Time — auto-handles DST
    const centralTimeStr = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })
    const centralTime = new Date(centralTimeStr)
    const today = centralTime.toISOString().split('T')[0]

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
      return NextResponse.json({ error: 'Failed to fetch past obituaries', details: serviceError.message }, { status: 500 })
    }

    // Rule 2: Find entries where passing_date is 14+ days ago (service likely already happened)
    const { data: pastByPassing, error: passingError } = await supabase
      .from('celebrations_of_life')
      .select('id, full_name, service_date, passing_date')
      .lt('passing_date', cutoffDate)

    if (passingError) {
      console.error('Error fetching past obituaries by passing_date:', passingError)
      return NextResponse.json({ error: 'Failed to fetch stale obituaries', details: passingError.message }, { status: 500 })
    }

    // Combine both lists, dedup by id
    const allPast = [...(pastByService || []), ...(pastByPassing || [])]
    const uniqueIds = Array.from(new Set(allPast.map(o => o.id)))
    const uniqueNames = Array.from(new Set(allPast.map(o => o.full_name)))

    if (uniqueIds.length === 0) {
      return NextResponse.json({ success: true, message: 'No past obituaries to purge', deleted: 0 })
    }

    // Delete past obituaries
    const { error: deleteError } = await supabase
      .from('celebrations_of_life')
      .delete()
      .in('id', uniqueIds)

    if (deleteError) {
      console.error('Error deleting past obituaries:', deleteError)
      return NextResponse.json({ error: 'Failed to delete past obituaries', details: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      deleted: uniqueIds.length,
      purgedByServiceDate: (pastByService || []).length,
      purgedByPassingDate: (pastByPassing || []).length,
      names: uniqueNames,
    })
  } catch (error) {
    console.error('Purge obituaries cron error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}