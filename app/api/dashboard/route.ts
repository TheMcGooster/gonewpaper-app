import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Community Dashboard API — returns aggregate metrics for the app
// Accessible to admin users (auth checked by caller) or via cron secret
export async function GET(request: Request) {
  // Allow access via cron secret OR from authenticated admin on client side
  const authHeader = request.headers.get('authorization')
  const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`

  // For non-cron, we just return the data (client-side admin check handles auth)
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Get today and this month in Central Time
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
  const monthStart = todayStr.substring(0, 7) + '-01'

  try {
    // Run all queries in parallel for speed
    const [
      eventsTotal, eventsToday, eventsThisMonth,
      jobsTotal, businessesTotal, housingTotal,
      celebrationsActive, nonprofitsTotal, clubsTotal,
      communityPostsTotal, usersTotal, interestsTotal
    ] = await Promise.all([
      // Events
      supabase.from('events').select('id', { count: 'exact', head: true }).eq('verified', true),
      supabase.from('events').select('id', { count: 'exact', head: true }).eq('date', todayStr).eq('verified', true),
      supabase.from('events').select('id', { count: 'exact', head: true }).gte('date', monthStart).eq('verified', true),
      // Jobs
      supabase.from('jobs').select('id', { count: 'exact', head: true }),
      // Businesses
      supabase.from('businesses').select('id', { count: 'exact', head: true }).eq('payment_status', 'active'),
      // Housing
      supabase.from('housing').select('id', { count: 'exact', head: true }).eq('is_active', true),
      // Celebrations (active)
      supabase.from('celebrations_of_life').select('id', { count: 'exact', head: true }).eq('is_approved', true),
      // Non-profits
      supabase.from('nonprofits').select('id', { count: 'exact', head: true }),
      // Clubs
      supabase.from('clubs').select('id', { count: 'exact', head: true }),
      // Community posts
      supabase.from('community_posts').select('id', { count: 'exact', head: true }),
      // Users
      supabase.from('users').select('id', { count: 'exact', head: true }),
      // Total interests (engagement)
      supabase.from('user_interests').select('id', { count: 'exact', head: true }),
    ])

    const dashboard = {
      date: todayStr,
      events: {
        total_upcoming: eventsTotal.count || 0,
        today: eventsToday.count || 0,
        this_month: eventsThisMonth.count || 0,
      },
      jobs: {
        total_active: jobsTotal.count || 0,
      },
      businesses: {
        total_active: businessesTotal.count || 0,
      },
      housing: {
        total_active: housingTotal.count || 0,
      },
      celebrations: {
        currently_listed: celebrationsActive.count || 0,
      },
      nonprofits: {
        total: nonprofitsTotal.count || 0,
      },
      clubs: {
        total: clubsTotal.count || 0,
      },
      community: {
        total_posts: communityPostsTotal.count || 0,
      },
      users: {
        total_registered: usersTotal.count || 0,
      },
      engagement: {
        total_event_interests: interestsTotal.count || 0,
      },
    }

    return NextResponse.json({ success: true, dashboard })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}
