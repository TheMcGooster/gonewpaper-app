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

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0]

    // Find all celebrations_of_life where service_date has passed
    const { data: pastObituaries, error: fetchError } = await supabase
      .from('celebrations_of_life')
      .select('id, full_name, service_date')
      .lt('service_date', today)

    if (fetchError) {
      console.error('Error fetching past obituaries:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch past obituaries', details: fetchError.message }, { status: 500 })
    }

    if (!pastObituaries || pastObituaries.length === 0) {
      return NextResponse.json({ success: true, message: 'No past obituaries to purge', deleted: 0 })
    }

    const pastIds = pastObituaries.map(o => o.id)

    // Delete past obituaries
    const { error: deleteError } = await supabase
      .from('celebrations_of_life')
      .delete()
      .in('id', pastIds)

    if (deleteError) {
      console.error('Error deleting past obituaries:', deleteError)
      return NextResponse.json({ error: 'Failed to delete past obituaries', details: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      deleted: pastIds.length,
      names: pastObituaries.map(o => o.full_name),
    })
  } catch (error) {
    console.error('Purge obituaries cron error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
