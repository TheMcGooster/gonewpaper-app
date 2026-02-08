'use client'
// Go New Paper v2.0.0 - 8 tabs: Events, Jobs, Housing, Business, Non-Profits, Clubs, Community, Affiliates
// Last deploy: Feb 8 2025
import React, { useState, useEffect } from 'react'
import { Calendar, Briefcase, Home, ShoppingBag, Users, Bell, Search, MapPin, Clock, Star, Menu, X, Plus, Heart, Newspaper, TrendingUp, LogIn, LogOut, User, Check, HeartHandshake, UsersRound } from 'lucide-react'
import { supabase, Event, Job, Business, Housing, CommunityPost, CelebrationOfLife, MarketRecap, TopStory, Affiliate, NonProfit, Club } from '@/lib/supabase'
import { User as SupabaseUser } from '@supabase/supabase-js'
import OneSignal from 'react-onesignal'

// Format date from ISO string to readable format
const formatEventDate = (dateStr: string) => {
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  } catch {
    return dateStr
  }
}

// Format time from ISO string
const formatEventTime = (dateStr: string) => {
  try {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  } catch {
    return ''
  }
}

export default function GoNewPaper() {
  const [activeTab, setActiveTab] = useState('events')
  const [showNotifications, setShowNotifications] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [loading, setLoading] = useState(true)

  // Auth state
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [userInterests, setUserInterests] = useState<number[]>([])
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // Toast helper function
  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  // Data from Supabase
  const [events, setEvents] = useState<Event[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [housing, setHousing] = useState<Housing[]>([])
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([])
  const [celebrations, setCelebrations] = useState<CelebrationOfLife[]>([])
  const [marketRecap, setMarketRecap] = useState<MarketRecap | null>(null)
  const [topStories, setTopStories] = useState<TopStory[]>([])
  const [affiliates, setAffiliates] = useState<Affiliate[]>([])
  const [nonprofits, setNonprofits] = useState<NonProfit[]>([])
  const [clubs, setClubs] = useState<Club[]>([])

  // Initialize OneSignal and track notification status
  useEffect(() => {
    const initOneSignal = async () => {
      try {
        await OneSignal.init({
          appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || 'a7951e0e-737c-42e6-bd9d-fc0931d95766',
          allowLocalhostAsSecureOrigin: true,
        })
        console.log('OneSignal initialized successfully')

        // Check current notification permission status
        // Use both OneSignal and native browser API for reliability
        const oneSignalPermission = OneSignal.Notifications.permission
        const browserPermission = 'Notification' in window ? Notification.permission === 'granted' : false
        const hasPermission = oneSignalPermission || browserPermission
        console.log('Notification permission - OneSignal:', oneSignalPermission, 'Browser:', browserPermission)
        setNotificationsEnabled(hasPermission)

        // Listen for permission changes
        OneSignal.Notifications.addEventListener('permissionChange', (newPermission: boolean) => {
          console.log('Notification permission changed:', newPermission)
          setNotificationsEnabled(newPermission)
          if (newPermission) {
            showToast('Notifications enabled!')
          }
        })

      } catch (error) {
        console.error('OneSignal initialization error:', error)
        // Even if OneSignal fails, check native browser permission
        if ('Notification' in window && Notification.permission === 'granted') {
          setNotificationsEnabled(true)
        }
      }
    }
    initOneSignal()
  }, [])

  // Save OneSignal player ID to Supabase when user logs in
  const saveOneSignalPlayerId = async (userId: string) => {
    try {
      // New OneSignal SDK uses User.PushSubscription.id instead of getUserId()
      const playerId = OneSignal.User.PushSubscription.id

      if (playerId) {
        const { error } = await supabase
          .from('users')
          .upsert({
            id: userId,
            onesignal_player_id: playerId
          }, {
            onConflict: 'id'
          })

        if (error) {
          console.error('Supabase upsert error:', error)
        } else {
          console.log('OneSignal player ID saved:', playerId)
        }
      } else {
        console.log('No player ID yet - user may not have allowed notifications')

        // Listen for when user subscribes to notifications
        OneSignal.User.PushSubscription.addEventListener('change', async (event) => {
          const newPlayerId = event.current.id
          if (newPlayerId && event.current.optedIn) {
            console.log('User subscribed! Saving player ID:', newPlayerId)
            const { error } = await supabase
              .from('users')
              .upsert({
                id: userId,
                onesignal_player_id: newPlayerId
              }, {
                onConflict: 'id'
              })
            if (!error) {
              console.log('OneSignal player ID saved after subscription:', newPlayerId)
            }
          }
        })
      }
    } catch (error) {
      console.error('Error saving OneSignal player ID:', error)
    }
  }

  // Check auth state on load
  useEffect(() => {
    // Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchUserInterests(session.user.id)
        saveOneSignalPlayerId(session.user.id)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchUserInterests(session.user.id)
        saveOneSignalPlayerId(session.user.id)
      } else {
        setUserInterests([])
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Fetch user's interested events
  const fetchUserInterests = async (userId: string) => {
    const { data } = await supabase
      .from('user_interests')
      .select('event_id')
      .eq('user_id', userId)

    if (data) {
      setUserInterests(data.map(d => d.event_id))
    }
  }

  // Handle login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError('')

    const { error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: authPassword,
    })

    if (error) {
      setAuthError(error.message)
    } else {
      setShowAuthModal(false)
      setAuthEmail('')
      setAuthPassword('')
    }
    setAuthLoading(false)
  }

  // Handle signup
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError('')

    const { error } = await supabase.auth.signUp({
      email: authEmail,
      password: authPassword,
    })

    if (error) {
      setAuthError(error.message)
    } else {
      setAuthError('')
      setAuthMode('login')
      alert('Check your email for a confirmation link!')
    }
    setAuthLoading(false)
  }

  // Handle logout
  const handleLogout = async () => {
    await supabase.auth.signOut()
    setShowMenu(false)
  }

  // Handle Google Sign-in
  const handleGoogleSignIn = async () => {
    setAuthLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    })
    if (error) {
      setAuthError(error.message)
    }
    setAuthLoading(false)
  }

  // Handle interest toggle
  const handleInterestToggle = async (eventId: number) => {
    if (!user) {
      setShowAuthModal(true)
      return
    }

    const isInterested = userInterests.includes(eventId)

    if (isInterested) {
      // Remove interest
      await supabase
        .from('user_interests')
        .delete()
        .eq('user_id', user.id)
        .eq('event_id', eventId)

      setUserInterests(prev => prev.filter(id => id !== eventId))
      showToast('Removed from your interests')
    } else {
      // Add interest
      await supabase
        .from('user_interests')
        .insert({ user_id: user.id, event_id: eventId })

      setUserInterests(prev => [...prev, eventId])

      // Show appropriate toast based on notification status
      if (notificationsEnabled) {
        showToast("You'll be reminded about this event!")
      } else {
        showToast('Interested! Enable notifications to get reminders')
      }
    }
  }

  // Fetch data from Supabase on load
  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const [
          eventsRes,
          jobsRes,
          businessesRes,
          housingRes,
          communityRes,
          celebrationsRes,
          marketRes,
          storiesRes,
          affiliatesRes,
          nonprofitsRes,
          clubsRes
        ] = await Promise.all([
          supabase.from('events').select('*').gte('date', new Date().toISOString().split('T')[0]).order('date', { ascending: true }).limit(20),
          supabase.from('jobs').select('*').order('created_at', { ascending: false }).limit(20),
          supabase.from('businesses').select('*').order('featured', { ascending: false }).limit(20),
          supabase.from('housing').select('*').eq('is_active', true).limit(20),
          supabase.from('community_posts').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(20),
          supabase.from('celebrations_of_life').select('*').eq('is_approved', true).order('created_at', { ascending: false }).limit(10),
          supabase.from('market_recap').select('*').order('recap_date', { ascending: false }).limit(1),
          supabase.from('top_stories').select('*').order('priority', { ascending: true }).limit(5),
          supabase.from('affiliates').select('*').eq('is_active', true).order('display_order', { ascending: true }),
          supabase.from('nonprofits').select('*').eq('is_active', true).order('display_order', { ascending: true }),
          supabase.from('clubs').select('*').eq('is_active', true).order('display_order', { ascending: true })
        ])

        if (eventsRes.data) setEvents(eventsRes.data)
        if (jobsRes.data) setJobs(jobsRes.data)
        if (businessesRes.data) setBusinesses(businessesRes.data)
        if (housingRes.data) setHousing(housingRes.data)
        if (communityRes.data) setCommunityPosts(communityRes.data)
        if (celebrationsRes.data) setCelebrations(celebrationsRes.data)
        if (marketRes.data && marketRes.data[0]) setMarketRecap(marketRes.data[0])
        if (storiesRes.data) setTopStories(storiesRes.data)
        if (affiliatesRes.data) setAffiliates(affiliatesRes.data)
        if (nonprofitsRes.data) setNonprofits(nonprofitsRes.data)
        if (clubsRes.data) setClubs(clubsRes.data)
      } catch (error) {
        console.error('Error fetching data:', error)
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  // Track business clicks
  const trackBusinessClick = async (business: Business) => {
    // Update click count in database
    await supabase
      .from('businesses')
      .update({ clicks: business.clicks + 1 })
      .eq('id', business.id)

    // Log analytics
    await supabase.from('analytics').insert({
      event_type: 'business_click',
      business_id: business.id,
      source_page: 'business_tab'
    })

    // Open website
    window.open(business.website, '_blank')
  }

  // Track affiliate clicks
  const trackAffiliateClick = async (affiliate: Affiliate) => {
    await supabase
      .from('affiliates')
      .update({ clicks: affiliate.clicks + 1 })
      .eq('id', affiliate.id)

    await supabase.from('analytics').insert({
      event_type: 'affiliate_click',
      affiliate_name: affiliate.name,
      source_page: 'menu'
    })

    window.open(affiliate.url, '_blank')
  }

  const Card = ({ children, className = '', onClick }: { children: React.ReactNode, className?: string, onClick?: () => void }) => (
    <div
      className={`bg-white rounded-xl p-4 mb-3 shadow-md border-2 border-gray-100 card-hover ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )

  // Sample data for when database is empty
  const sampleEvents: Event[] = [
    { id: 1, title: 'David - Movie', category: '🎵', date: 'Jan 10', time: '7:00 PM', location: 'Vision II Theatre', price: '$6', source: 'Vision II', verified: true, town_id: 1 },
    { id: 2, title: 'Avatar: Fire & Ash', category: '🎵', date: 'Jan 10', time: '6:30 PM', location: 'Vision II Theatre', price: '$6', source: 'Vision II', verified: true, town_id: 1 },
    { id: 3, title: 'City Council Meeting', category: '🏛️', date: 'Jan 12', time: '6:00 PM', location: 'City Hall', price: 'Free', source: 'City of Chariton', verified: true, town_id: 1 },
    { id: 4, title: 'HS Basketball vs Albia', category: '🏈', date: 'Jan 15', time: '7:00 PM', location: 'Chariton HS', price: '$5', source: 'Chariton Schools', verified: true, town_id: 1 }
  ]

  const sampleJobs: Job[] = [
    { id: 1, title: 'Restaurant Server', company: 'Route 34 Grill', type: 'Part-time', pay: '$12-15/hr + tips', auto_scraped: false, created_at: '', town_id: 1 },
    { id: 2, title: 'Retail Associate', company: 'Hardware Store', type: 'Full-time', pay: '$15/hr', auto_scraped: false, created_at: '', town_id: 1 },
    { id: 3, title: 'RN - Lucas County Hospital', company: 'Lucas County Health', type: 'Full-time', pay: '$32/hr', auto_scraped: true, created_at: '', town_id: 1 },
    { id: 4, title: 'CDL Driver', company: 'Midwest Transport', type: 'Full-time', pay: '$55k/yr', auto_scraped: true, created_at: '', town_id: 1 }
  ]

  const sampleBusinesses: Business[] = [
    // Spotlight Businesses (full cards)
    { id: 1, name: 'Go New Paper', category: 'Local News & Media', logo_emoji: '📰', website: 'https://www.gonewpaper.com', clicks: 512, featured: true, tagline: 'Everything Local, All In Your Pocket', tier: 'spotlight', phone: '', created_at: '', town_id: 1, email: 'thenewpaperchariton@gmail.com' },
    { id: 2, name: "Piper's Old Fashion Grocery", category: 'Grocery', logo_emoji: '🛒', website: 'https://pipersgrocery.com', clicks: 234, featured: true, tagline: 'Your hometown grocer since 1952', tier: 'spotlight', phone: '(641) 774-5411', created_at: '', town_id: 1 },
    { id: 3, name: 'Vision II Theatre', category: 'Entertainment', logo_emoji: '🎬', website: 'https://visioniitheatre.com', clicks: 456, featured: true, tagline: 'Latest movies, small-town prices', tier: 'spotlight', phone: '(641) 774-4444', created_at: '', town_id: 1 },
    { id: 4, name: 'Route 34 Grill', category: 'Restaurant', logo_emoji: '🍔', website: 'https://route34grill.com', clicks: 189, featured: true, tagline: 'Best burgers in Lucas County', tier: 'spotlight', phone: '(641) 774-2233', created_at: '', town_id: 1 },
    { id: 5, name: 'Main Street Coffee', category: 'Cafe', logo_emoji: '☕', website: 'https://mainstreetcoffee.com', clicks: 312, featured: true, tagline: 'Community hub & fresh brews', tier: 'spotlight', phone: '(641) 774-1122', created_at: '', town_id: 1 },
    // Digital Business Cards ($15/mo tier)
    { id: 6, name: 'The Fluff Factory', category: 'Event Services', logo_emoji: '🍭', website: '', clicks: 78, featured: false, tagline: 'Mobile cotton candy for parties & events!', tier: 'card', phone: '(641) 203-0045', created_at: '', town_id: 1 },
    { id: 7, name: 'Sarah Mitchell - State Farm', category: 'Insurance', logo_emoji: '🛡️', website: '', clicks: 45, featured: false, tagline: 'Your local insurance agent', tier: 'card', phone: '(641) 774-5678', created_at: '', town_id: 1, email: 'sarah.mitchell@statefarm.com' },
    { id: 8, name: "Mike's Mobile Detailing", category: 'Auto Services', logo_emoji: '🚗', website: '', clicks: 23, featured: false, tagline: 'We come to you!', tier: 'card', phone: '(641) 203-4567', created_at: '', town_id: 1 },
    { id: 9, name: 'Johnson Financial Group', category: 'Financial Advisor', logo_emoji: '💼', website: '', clicks: 67, featured: false, tagline: 'Retirement & investment planning', tier: 'card', phone: '(641) 774-9012', created_at: '', town_id: 1, email: 'info@johnsonfinancial.com' },
    { id: 10, name: 'Lucas County Realty - Tom Baker', category: 'Real Estate', logo_emoji: '🏠', website: '', clicks: 89, featured: false, tagline: 'Helping families find home', tier: 'card', phone: '(641) 774-3456', created_at: '', town_id: 1 }
  ]

  const sampleHousing: Housing[] = [
    { id: 1, title: '2BR Apartment', price: '$550/mo', location: 'Downtown', details: 'Updated kitchen, parking', listing_type: 'rent', pets_allowed: false, town_id: 1, is_active: true },
    { id: 2, title: '3BR House', price: '$750/mo', location: 'Near schools', details: 'Large yard, garage, pets OK', listing_type: 'rent', pets_allowed: true, town_id: 1, is_active: true },
    { id: 3, title: 'Room for Rent', price: '$300/mo', location: 'North Chariton', details: 'Utilities included', listing_type: 'room', pets_allowed: false, town_id: 1, is_active: true }
  ]

  const sampleCommunity: CommunityPost[] = [
    { id: 1, title: 'LOST: Black Lab Mix', post_type: 'lost_pet', description: 'Last seen near Yocom Park', emoji: '🔍', town_id: 1, is_active: true },
    { id: 2, title: 'FOOD PANTRY VOLUNTEERS', post_type: 'volunteer', description: 'Help needed Tuesdays 2-5pm', emoji: '🤝', town_id: 1, is_active: true },
    { id: 3, title: 'Multi-Family Garage Sale', post_type: 'garage_sale', description: 'Sat, Jan 11, 8am-2pm', location: '215 Oak St', emoji: '🏷️', town_id: 1, is_active: true }
  ]

  const sampleAffiliates: Affiliate[] = [
    { id: 1, name: 'Everyday Dose', category: 'Health', logo_emoji: '☕', url: 'https://affiliate.link/everydaydose', commission: '20%', is_active: true, display_order: 1, clicks: 0 },
    { id: 2, name: 'Take Profit Trader', category: 'Trading', logo_emoji: '📈', url: 'https://affiliate.link/takeprofit', commission: '15%', is_active: true, display_order: 2, clicks: 0 },
    { id: 3, name: 'TD Ameritrade', category: 'Broker', logo_emoji: '💹', url: 'https://affiliate.link/tdameritrade', commission: '$50/signup', is_active: true, display_order: 3, clicks: 0 }
  ]

  const sampleNonprofits: NonProfit[] = [
    { id: 1, name: 'Chariton 4th of July Celebration', category: 'Community Events', logo_emoji: '🎆', logo_url: '/Chariton_4th_LOGO.png', tagline: 'Keeping small-town traditions alive!', donation_url: 'https://www.zeffy.com/en-US/donation-form/2026-4th-of-july-celebration', email: 'chariton4thjulycommitte@gmail.com', town_id: 1, is_active: true, display_order: 1, created_at: '' },
  ]

  const sampleClubs: Club[] = [
    { id: 1, name: 'Chariton Rock Climbers', category: 'Sports & Recreation', logo_emoji: '🧗', logo_url: '/Chariton_Rock_Climbers_LOGO.png', tagline: 'Climb higher together!', email: 'jarrettcmcgee@gmail.com', town_id: 1, is_active: true, display_order: 1, created_at: '' },
  ]

  const sampleStocks = [
    { symbol: 'AAPL', price: 178.52, change: 2.34, changePercent: 1.33 },
    { symbol: 'TSLA', price: 242.18, change: -5.67, changePercent: -2.29 },
    { symbol: 'NVDA', price: 495.22, change: 8.91, changePercent: 1.83 },
    { symbol: 'SPY', price: 478.36, change: 1.22, changePercent: 0.26 }
  ]

  // Use sample data if database is empty
  const displayEvents = events.length > 0 ? events : sampleEvents
  const displayJobs = jobs.length > 0 ? jobs : sampleJobs
  const displayBusinesses = businesses.length > 0 ? businesses : sampleBusinesses
  const displayHousing = housing.length > 0 ? housing : sampleHousing
  const displayCommunity = communityPosts.length > 0 ? communityPosts : sampleCommunity
  const displayAffiliates = affiliates.length > 0 ? affiliates : sampleAffiliates
  const displayNonprofits = nonprofits.length > 0 ? nonprofits : sampleNonprofits
  const displayClubs = clubs.length > 0 ? clubs : sampleClubs
  const displayStocks = marketRecap?.hot_stocks || sampleStocks

  const tabs = [
    { id: 'events', icon: Calendar, label: 'EVENTS' },
    { id: 'jobs', icon: Briefcase, label: 'JOBS' },
    { id: 'housing', icon: Home, label: 'HOUSING' },
    { id: 'businesses', icon: ShoppingBag, label: 'BUSINESS' },
    { id: 'nonprofits', icon: HeartHandshake, label: 'NON-PROFITS' },
    { id: 'clubs', icon: UsersRound, label: 'CLUBS' },
    { id: 'community', icon: Users, label: 'COMMUNITY' },
    { id: 'affiliates', icon: TrendingUp, label: 'AFFILIATES' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="gnp-gradient text-white sticky top-0 z-40 shadow-2xl safe-top">
        <div className="p-4">
          {/* Top Row: Town Badge + Go New Paper Logo */}
          <div className="flex items-center justify-between mb-3">
            {/* Left: Chariton Badge */}
            <div className="flex items-center gap-3">
              <svg width="50" height="50" viewBox="0 0 100 100" className="drop-shadow-xl">
                <path d="M50 5 L90 15 L90 65 Q90 85 50 95 Q10 85 10 65 L10 15 Z" fill="#DC143C" stroke="#000" strokeWidth="4"/>
                <path d="M50 12 L83 20 L83 65 Q83 80 50 88 Q17 80 17 65 L17 20 Z" fill="#DC143C" stroke="#fff" strokeWidth="3"/>
                <text x="50" y="72" fontSize="52" fontWeight="900" fill="#fff" textAnchor="middle" fontFamily="Archivo Black" stroke="#000" strokeWidth="2">C</text>
                <text x="50" y="72" fontSize="52" fontWeight="900" fill="#fff" textAnchor="middle" fontFamily="Archivo Black">C</text>
              </svg>
              <div>
                <h2 className="text-xl font-black tracking-tight font-display">CHARITON EDITION</h2>
              </div>
            </div>

            {/* Right: Go New Paper Logo */}
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1">
                <div className="bg-white text-green-600 px-2 py-1 rounded font-display text-sm font-black">GO</div>
                <span className="font-display text-lg">NEW PAPER</span>
              </div>
              <p className="text-[9px] font-bold text-gray-300 mt-0.5 tracking-wide">Everything Local &bull; All In Your Pocket</p>
            </div>
          </div>

          {/* Second Row: Bell + Menu */}
          <div className="flex items-center justify-end gap-2 mb-3">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 bg-white/10 backdrop-blur-sm hover:bg-white/20 rounded-lg transition-all"
            >
              <Bell className="w-5 h-5" />
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-black shadow-lg">3</div>
            </button>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 bg-white/10 backdrop-blur-sm hover:bg-white/20 rounded-lg transition-all"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search events, jobs, housing..."
              className="w-full pl-10 pr-4 py-3 rounded-xl text-gray-900 font-semibold placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-white/30 shadow-lg"
            />
          </div>
        </div>

        {/* Tabs */}
        <nav className="flex overflow-x-auto border-t-2 border-white/20 bg-black/20 hide-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 whitespace-nowrap font-black text-xs tracking-wider transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-red-600 shadow-lg'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </header>

      {/* Main Content */}
      <main className="p-4 pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-charger-red"></div>
          </div>
        ) : (
          <>
            {/* Daily Digest */}
            {activeTab === 'events' && (() => {
              // Get time-aware greeting
              const hour = new Date().getHours()
              let greeting = 'GOOD MORNING'
              if (hour >= 12 && hour < 17) {
                greeting = 'GOOD AFTERNOON'
              } else if (hour >= 17) {
                greeting = 'GOOD EVENING'
              }

              // Filter to only today's events
              const today = new Date().toISOString().split('T')[0]
              const todaysEvents = displayEvents.filter(event => {
                const eventDate = event.date.split('T')[0]
                return eventDate === today
              })

              return (
                <div className="charger-red text-white rounded-xl p-5 mb-4 shadow-xl border-2 border-white/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Bell className="w-6 h-6" />
                    <h3 className="text-lg font-black tracking-tight font-display">{greeting} CHARITON!</h3>
                  </div>
                  <p className="text-sm font-semibold mb-3 text-red-50">
                    {todaysEvents.length > 0
                      ? `Here's what's happening today:`
                      : `No events scheduled for today. Check out upcoming events below!`}
                  </p>
                  {todaysEvents.length > 0 && (
                    <ul className="text-sm font-bold space-y-2 text-white">
                      {todaysEvents.map((event, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-white rounded-full"></span>
                          {event.category} {event.title}, {event.time || formatEventTime(event.date)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })()}

            {/* Events Tab */}
            {activeTab === 'events' && (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-black tracking-tight font-display">UPCOMING EVENTS</h2>
                  <button className="charger-red-text text-sm font-black flex items-center gap-1 tracking-wide">
                    <Plus className="w-4 h-4" />POST
                  </button>
                </div>
                {displayEvents.map(event => (
                  <Card key={event.id}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{event.category}</span>
                        <div>
                          <h3 className="text-lg font-black tracking-tight">{event.title}</h3>
                          <p className="text-xs text-gray-600 font-bold uppercase tracking-wide">{event.source}</p>
                        </div>
                      </div>
                                          </div>
                    <div className="text-sm text-gray-700 space-y-2 font-semibold">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 charger-red-text" />
                        <span className="font-bold">{formatEventDate(event.date)}</span>
                        <span className="mx-1 text-gray-400">&bull;</span>
                        <Clock className="w-4 h-4 charger-red-text" />
                        <span className="font-bold">{event.time || formatEventTime(event.date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 charger-red-text" />
                        <span>{event.location || 'TBD'}</span>
                        {event.price && (
                          <>
                            <span className="mx-1 text-gray-400">&bull;</span>
                            <span className="font-black charger-red-text">{event.price}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleInterestToggle(event.id)}
                      className={`w-full mt-4 py-3 rounded-lg text-sm font-black tracking-wide shadow-lg hover:shadow-xl transition-all uppercase flex items-center justify-center gap-2 ${
                        userInterests.includes(event.id)
                          ? 'bg-green-600 text-white'
                          : 'charger-red text-white'
                      }`}
                    >
                      {userInterests.includes(event.id) ? (
                        <>
                          <Check className="w-5 h-5" />
                          INTERESTED!
                        </>
                      ) : (
                        "I'M INTERESTED"
                      )}
                    </button>
                  </Card>
                ))}
              </>
            )}

            {/* Jobs Tab */}
            {activeTab === 'jobs' && (
              <>
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 p-4 rounded-xl mb-4 shadow-md">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🤖</span>
                    <p className="text-sm font-bold text-gray-800">AI Auto-Finding Jobs Within 50 Miles</p>
                  </div>
                  <p className="text-xs font-semibold text-gray-600">
                    {displayJobs.filter(j => j.auto_scraped).length} jobs auto-discovered from Indeed &bull; {displayJobs.filter(j => !j.auto_scraped).length} posted locally
                  </p>
                </div>
                {displayJobs.map(job => (
                  <Card key={job.id}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-black tracking-tight">{job.title}</h3>
                          {job.auto_scraped && <span className="text-xl">🤖</span>}
                        </div>
                        <p className="text-sm text-gray-700 font-bold">{job.company}</p>
                      </div>
                      <span className="text-xs bg-green-100 text-green-800 px-3 py-1 rounded-full font-black uppercase tracking-wide">{job.type}</span>
                    </div>
                    <p className="text-sm font-bold mb-3 charger-red-text">{job.pay}</p>
                    <button
                      onClick={() => job.apply_url && window.open(job.apply_url, '_blank')}
                      className="w-full charger-red text-white py-3 rounded-lg text-sm font-black tracking-wide shadow-lg hover:shadow-xl transition-all uppercase"
                    >
                      APPLY NOW
                    </button>
                  </Card>
                ))}
              </>
            )}

            {/* Housing Tab */}
            {activeTab === 'housing' && (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-black tracking-tight font-display">HOUSING</h2>
                  <button className="charger-red-text text-sm font-black flex items-center gap-1 tracking-wide">
                    <Plus className="w-4 h-4" />POST
                  </button>
                </div>
                {displayHousing.map(h => (
                  <Card key={h.id}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-lg font-black tracking-tight">{h.title}</h3>
                        <p className="text-sm text-gray-700 font-bold">{h.location}</p>
                      </div>
                      <span className="text-xl font-black charger-red-text">{h.price}</span>
                    </div>
                    <p className="text-sm text-gray-700 font-semibold mb-3">{h.details}</p>
                    <button className="w-full charger-red text-white py-3 rounded-lg text-sm font-black tracking-wide shadow-lg hover:shadow-xl transition-all uppercase">
                      CONTACT
                    </button>
                  </Card>
                ))}
              </>
            )}

            {/* Businesses Tab */}
            {activeTab === 'businesses' && (
              <>
                {/* SPOTLIGHT BUSINESSES SECTION */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 p-4 rounded-xl mb-4 shadow-md">
                  <p className="text-sm font-bold text-gray-800"><span className="font-black text-blue-600">SPOTLIGHT BUSINESSES</span></p>
                  <p className="text-xs font-semibold text-gray-600 mt-1">Featured local businesses &bull; Support local!</p>
                </div>

                {displayBusinesses.filter(b => b.tier === 'spotlight' || b.featured).map(b => (
                  <Card key={b.id} className="hover:shadow-xl transition-all cursor-pointer border-blue-200">
                    <div className="flex items-start gap-4">
                      {b.logo_url ? (
                        <img src={b.logo_url} alt={b.name} className="w-16 h-16 rounded-xl object-cover shadow-md" />
                      ) : (
                        <div className="text-5xl">{b.logo_emoji}</div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-black tracking-tight">{b.name}</h3>
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-black">SPOTLIGHT</span>
                        </div>
                        <p className="text-sm text-gray-600 font-semibold mb-2">{b.tagline}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-500 font-semibold mb-3">
                          <span className="bg-gray-100 px-2 py-1 rounded">{b.category}</span>
                          <span>{b.clicks} clicks this month</span>
                        </div>
                        <button
                          onClick={() => trackBusinessClick(b)}
                          className="w-full charger-red text-white py-3 rounded-lg text-sm font-black tracking-wide shadow-lg hover:shadow-xl transition-all uppercase"
                        >
                          VISIT WEBSITE &rarr;
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}

                {/* DIGITAL BUSINESS CARDS SECTION */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 p-4 rounded-xl mb-4 mt-6 shadow-md">
                  <p className="text-sm font-bold text-gray-800"><span className="font-black text-purple-600">LOCAL PROFESSIONALS</span></p>
                  <p className="text-xs font-semibold text-gray-600 mt-1">Financial advisors, agents, services & more</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {displayBusinesses.filter(b => b.tier === 'card').map(b => (
                    <div key={b.id} className="bg-white rounded-xl p-4 shadow-md border-2 border-purple-100 hover:shadow-lg hover:border-purple-300 transition-all">
                      <div className="flex items-center gap-3 mb-2">
                        {b.logo_url ? (
                          <img src={b.logo_url} alt={b.name} className="w-12 h-12 rounded-lg object-cover shadow" />
                        ) : (
                          <div className="text-3xl">{b.logo_emoji}</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-black tracking-tight truncate">{b.name}</h3>
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-bold">{b.category}</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 font-semibold mb-3 italic">&quot;{b.tagline}&quot;</p>
                      <a
                        href={`tel:${b.phone}`}
                        className="w-full bg-purple-600 text-white py-2 rounded-lg text-xs font-black tracking-wide shadow hover:shadow-lg transition-all uppercase flex items-center justify-center gap-2"
                      >
                        <span>📞</span> {b.phone}
                      </a>
                      {b.email && (
                        <a
                          href={`mailto:${b.email}`}
                          className="w-full mt-2 bg-gray-100 text-gray-700 py-2 rounded-lg text-xs font-bold tracking-wide hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                        >
                          <span>✉️</span> Email
                        </a>
                      )}
                    </div>
                  ))}
                </div>

                {/* PRICING INFO */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 p-4 rounded-xl mt-6">
                  <p className="text-sm font-bold text-gray-800 mb-2">📣 Want to be listed here?</p>
                  <div className="space-y-2 text-xs text-gray-600 font-semibold mb-3">
                    <p><span className="font-black text-blue-600">Spotlight Business</span> - $30/month - Full card, website link, featured placement</p>
                    <p><span className="font-black text-purple-600">Digital Business Card</span> - $15/month - Compact card, click-to-call</p>
                  </div>
                  <a
                    href="mailto:thenewpaperchariton@gmail.com?subject=Business%20Listing%20Inquiry&body=Hi!%20I'm%20interested%20in%20getting%20my%20business%20listed%20on%20Go%20New%20Paper.%0A%0ABusiness%20Name:%0APhone:%0APreferred%20Plan%20(Spotlight%20$30%20or%20Digital%20Card%20$15):"
                    className="w-full bg-green-600 text-white py-3 rounded-lg text-sm font-black shadow-lg hover:bg-green-700 transition-all flex items-center justify-center gap-2"
                  >
                    <span>✉️</span> GET STARTED
                  </a>
                </div>
              </>
            )}

            {/* Community Tab */}
            {activeTab === 'community' && (
              <>
                {/* Celebrations of Life Section */}
                {celebrations.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Heart className="w-5 h-5 charger-red-text" />
                      <h2 className="text-xl font-black tracking-tight font-display">CELEBRATIONS OF LIFE</h2>
                    </div>
                    {celebrations.map(c => (
                      <Card key={c.id} className="border-gray-200 bg-gray-50">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">🕯️</span>
                          <div>
                            <h3 className="font-black text-base tracking-tight mb-1">{c.full_name}</h3>
                            {c.age && <p className="text-sm text-gray-600 font-semibold">Age {c.age}</p>}
                            {c.service_location && (
                              <p className="text-sm font-semibold text-gray-700 mt-2">
                                Service: {c.service_location}
                              </p>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-black tracking-tight font-display">COMMUNITY</h2>
                  <button className="charger-red-text text-sm font-black flex items-center gap-1 tracking-wide">
                    <Plus className="w-4 h-4" />POST
                  </button>
                </div>

                {displayCommunity.map(post => (
                  <Card key={post.id}>
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{post.emoji}</span>
                      <div>
                        <h3 className="font-black text-base tracking-tight mb-1">{post.title}</h3>
                        <p className="text-sm font-semibold text-gray-700">{post.description}</p>
                        {post.location && (
                          <p className="text-sm font-semibold text-gray-500 mt-1">📍 {post.location}</p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </>
            )}

            {/* Non-Profits Tab */}
            {activeTab === 'nonprofits' && (
              <>
                <div className="bg-gradient-to-r from-rose-50 to-orange-50 border-2 border-rose-200 p-4 rounded-xl mb-4 shadow-md">
                  <div className="flex items-center gap-2 mb-2">
                    <HeartHandshake className="w-6 h-6 text-rose-600" />
                    <p className="text-lg font-black text-gray-800">LOCAL NON-PROFITS</p>
                  </div>
                  <p className="text-xs font-semibold text-gray-600">
                    Support the organizations that make Chariton great. Donate directly!
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {displayNonprofits.map(np => (
                    <div key={np.id} className="bg-white rounded-xl p-4 shadow-md border-2 border-rose-100 hover:shadow-lg hover:border-rose-300 transition-all">
                      <div className="flex items-center gap-4 mb-3">
                        {np.logo_url ? (
                          <img src={np.logo_url} alt={np.name} className="w-16 h-16 rounded-xl object-cover shadow-md" />
                        ) : (
                          <div className="text-5xl">{np.logo_emoji}</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-black tracking-tight">{np.name}</h3>
                          <span className="text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded font-bold">{np.category}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 font-semibold mb-3 italic">&quot;{np.tagline}&quot;</p>
                      {np.description && (
                        <p className="text-xs text-gray-500 font-semibold mb-3">{np.description}</p>
                      )}
                      <a
                        href={np.donation_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-rose-600 text-white py-3 rounded-lg text-sm font-black tracking-wide shadow-lg hover:bg-rose-700 transition-all uppercase flex items-center justify-center gap-2"
                      >
                        <span>💝</span> DONATE NOW
                      </a>
                      <div className="flex gap-2 mt-2">
                        <a
                          href={`mailto:${np.email}`}
                          className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-xs font-bold tracking-wide hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                        >
                          <span>✉️</span> Email
                        </a>
                        {np.website && (
                          <a
                            href={np.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-xs font-bold tracking-wide hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                          >
                            <span>🌐</span> Website
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* CTA for nonprofits */}
                <div className="bg-gradient-to-r from-rose-50 to-orange-50 border-2 border-rose-300 p-4 rounded-xl mt-6">
                  <p className="text-sm font-bold text-gray-800 mb-2">🏛️ Run a local non-profit?</p>
                  <p className="text-xs text-gray-600 font-semibold mb-3">Get your organization listed here for free so residents can find and support you!</p>
                  <a
                    href="mailto:thenewpaperchariton@gmail.com?subject=Non-Profit%20Listing%20Request&body=Hi!%20I'd%20like%20to%20list%20our%20non-profit%20on%20Go%20New%20Paper.%0A%0AOrganization%20Name:%0ADonation%20Link:%0AContact%20Email:"
                    className="w-full bg-rose-600 text-white py-3 rounded-lg text-sm font-black shadow-lg hover:bg-rose-700 transition-all flex items-center justify-center gap-2"
                  >
                    <span>✉️</span> GET LISTED FREE
                  </a>
                </div>
              </>
            )}

            {/* Clubs/Groups Tab */}
            {activeTab === 'clubs' && (
              <>
                <div className="bg-gradient-to-r from-cyan-50 to-sky-50 border-2 border-cyan-200 p-4 rounded-xl mb-4 shadow-md">
                  <div className="flex items-center gap-2 mb-2">
                    <UsersRound className="w-6 h-6 text-cyan-600" />
                    <p className="text-lg font-black text-gray-800">CLUBS & GROUPS</p>
                  </div>
                  <p className="text-xs font-semibold text-gray-600">
                    Find your people! Local clubs, groups, and organizations in Chariton.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {displayClubs.map(club => (
                    <div key={club.id} className="bg-white rounded-xl p-4 shadow-md border-2 border-cyan-100 hover:shadow-lg hover:border-cyan-300 transition-all">
                      <div className="flex items-center gap-4 mb-3">
                        {club.logo_url ? (
                          <img src={club.logo_url} alt={club.name} className="w-16 h-16 rounded-xl object-cover shadow-md" />
                        ) : (
                          <div className="text-5xl">{club.logo_emoji}</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-black tracking-tight">{club.name}</h3>
                          <span className="text-xs bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded font-bold">{club.category}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 font-semibold mb-3 italic">&quot;{club.tagline}&quot;</p>
                      {club.description && (
                        <p className="text-xs text-gray-500 font-semibold mb-3">{club.description}</p>
                      )}
                      {club.meeting_schedule && (
                        <div className="flex items-center gap-2 text-xs text-gray-600 font-semibold mb-2">
                          <Clock className="w-3 h-3 text-cyan-600" />
                          <span>{club.meeting_schedule}</span>
                        </div>
                      )}
                      {club.meeting_location && (
                        <div className="flex items-center gap-2 text-xs text-gray-600 font-semibold mb-3">
                          <MapPin className="w-3 h-3 text-cyan-600" />
                          <span>{club.meeting_location}</span>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <a
                          href={`mailto:${club.email}`}
                          className="flex-1 bg-cyan-600 text-white py-2 rounded-lg text-xs font-black tracking-wide shadow hover:bg-cyan-700 transition-all uppercase flex items-center justify-center gap-2"
                        >
                          <span>✉️</span> CONTACT
                        </a>
                        {club.website && (
                          <a
                            href={club.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-xs font-bold tracking-wide hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                          >
                            <span>🌐</span> Website
                          </a>
                        )}
                        {club.phone && (
                          <a
                            href={`tel:${club.phone}`}
                            className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-xs font-bold tracking-wide hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                          >
                            <span>📞</span> Call
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* CTA for clubs */}
                <div className="bg-gradient-to-r from-cyan-50 to-sky-50 border-2 border-cyan-300 p-4 rounded-xl mt-6">
                  <p className="text-sm font-bold text-gray-800 mb-2">👥 Have a local club or group?</p>
                  <p className="text-xs text-gray-600 font-semibold mb-3">Get your club listed here for free so residents can find and join!</p>
                  <a
                    href="mailto:thenewpaperchariton@gmail.com?subject=Club%20Listing%20Request&body=Hi!%20I'd%20like%20to%20list%20our%20club/group%20on%20Go%20New%20Paper.%0A%0AClub%20Name:%0ACategory:%0AContact%20Email:%0AMeeting%20Schedule:"
                    className="w-full bg-cyan-600 text-white py-3 rounded-lg text-sm font-black shadow-lg hover:bg-cyan-700 transition-all flex items-center justify-center gap-2"
                  >
                    <span>✉️</span> GET LISTED FREE
                  </a>
                </div>
              </>
            )}

            {/* Affiliates Tab */}
            {activeTab === 'affiliates' && (
              <>
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 p-4 rounded-xl mb-4 shadow-md">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                    <p className="text-lg font-black text-gray-800">MARKET & PARTNERS</p>
                  </div>
                  <p className="text-xs font-semibold text-gray-600">
                    Stock picks, trading tools & affiliate partnerships that help keep this app free!
                  </p>
                </div>

                {/* Market Snapshot */}
                <div className="mb-4">
                  <h3 className="text-xl font-black tracking-tight font-display mb-3 flex items-center gap-2">
                    <span>📈</span> MARKET SNAPSHOT
                  </h3>
                  <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
                    <div className="space-y-2">
                      {displayStocks.map((stock: any) => (
                        <div key={stock.symbol} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm border border-gray-100">
                          <span className="font-black text-lg">{stock.symbol}</span>
                          <span className="font-bold text-gray-700">${stock.price}</span>
                          <span className={`font-black px-3 py-1 rounded-full text-sm ${stock.change >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {stock.change >= 0 ? '▲' : '▼'} {Math.abs(stock.changePercent)}%
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-3 text-center font-semibold">
                      Data for educational purposes only • Not financial advice
                    </p>
                  </Card>
                </div>

                {/* Trading Partners */}
                <div className="mb-4">
                  <h3 className="text-xl font-black tracking-tight font-display mb-3 flex items-center gap-2">
                    <span>🤝</span> TRADING PARTNERS
                  </h3>
                  {displayAffiliates.filter(a => a.category === 'Trading' || a.category === 'Broker').map(aff => (
                    <Card key={aff.id} className="border-blue-200 hover:shadow-xl transition-all cursor-pointer">
                      <div className="flex items-start gap-4" onClick={() => trackAffiliateClick(aff)}>
                        <div className="text-4xl">{aff.logo_emoji}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-black tracking-tight">{aff.name}</h3>
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-black">{aff.commission}</span>
                          </div>
                          <p className="text-sm text-gray-600 font-semibold mb-3">{aff.category}</p>
                          <button className="w-full charger-red text-white py-2 rounded-lg text-sm font-black tracking-wide shadow-lg hover:shadow-xl transition-all uppercase">
                            CHECK IT OUT &rarr;
                          </button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Other Affiliate Partners */}
                <div className="mb-4">
                  <h3 className="text-xl font-black tracking-tight font-display mb-3 flex items-center gap-2">
                    <span>⭐</span> PARTNER DEALS
                  </h3>
                  {displayAffiliates.filter(a => a.category !== 'Trading' && a.category !== 'Broker').map(aff => (
                    <Card key={aff.id} className="border-purple-200 hover:shadow-xl transition-all cursor-pointer">
                      <div className="flex items-start gap-4" onClick={() => trackAffiliateClick(aff)}>
                        <div className="text-4xl">{aff.logo_emoji}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-black tracking-tight">{aff.name}</h3>
                            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-black">{aff.commission}</span>
                          </div>
                          <p className="text-sm text-gray-600 font-semibold mb-3">{aff.category}</p>
                          <button className="w-full bg-purple-600 text-white py-2 rounded-lg text-sm font-black tracking-wide shadow-lg hover:shadow-xl transition-all uppercase">
                            GET DEAL &rarr;
                          </button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                <div className="bg-gray-100 border-2 border-gray-300 p-4 rounded-xl">
                  <p className="text-xs text-gray-600 font-semibold text-center italic">
                    These affiliate partnerships help keep Go New Paper free for everyone! When you sign up through our links, we may earn a small commission at no extra cost to you.
                  </p>
                </div>
              </>
            )}
          </>
        )}
        {/* Footer Links */}
        <div className="text-center py-8 pb-24 text-xs text-gray-400 space-x-3">
          <a href="/privacy" className="underline hover:text-gray-600">Privacy Policy</a>
          <span>|</span>
          <a href="/terms" className="underline hover:text-gray-600">Terms of Service</a>
          <span>|</span>
          <span>© 2025 Go New Paper</span>
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-4 border-red-600 z-40 shadow-2xl safe-bottom">
        <div
          className="flex p-2 overflow-x-scroll"
          style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 p-2 transition-all ${
                activeTab === tab.id ? 'text-red-600 scale-110' : 'text-gray-500'
              }`}
              style={{ minWidth: '72px', flexShrink: 0 }}
            >
              <tab.icon className="w-6 h-6" strokeWidth={activeTab === tab.id ? 3 : 2} />
              <span className="text-xs font-black tracking-wider uppercase">{tab.id}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Notification Panel */}
      {showNotifications && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-end backdrop-blur-sm" onClick={() => setShowNotifications(false)}>
          <div className="bg-white w-full rounded-t-3xl p-6 max-h-[75vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-black tracking-tight font-display">NOTIFICATIONS</h2>
              <button onClick={() => setShowNotifications(false)}><X className="w-6 h-6" /></button>
            </div>
            <div className="space-y-3">
              <Card className="border-green-200 bg-green-50">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">🤖</span>
                  <div className="flex-1">
                    <p className="font-black text-sm mb-1">AI Correction Applied</p>
                    <p className="text-xs font-semibold text-gray-700">City Council meeting time updated: 5:00 PM &rarr; 6:00 PM based on city website</p>
                    <p className="text-xs text-gray-500 mt-1">2 hours ago</p>
                  </div>
                </div>
              </Card>
              <Card>
                <p className="text-sm font-bold"><span className="font-black">2 new jobs</span> found within 50 miles 🤖</p>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center backdrop-blur-sm p-4" onClick={() => setShowAuthModal(false)}>
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black tracking-tight font-display">
                {authMode === 'login' ? 'WELCOME BACK!' : 'JOIN GO NEW PAPER'}
              </h2>
              <button onClick={() => setShowAuthModal(false)}><X className="w-6 h-6" /></button>
            </div>

            <form onSubmit={authMode === 'login' ? handleLogin : handleSignup}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-red-500 focus:outline-none font-semibold"
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-red-500 focus:outline-none font-semibold"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>

                {authError && (
                  <p className="text-red-600 text-sm font-bold">{authError}</p>
                )}

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full charger-red text-white py-3 rounded-lg font-black tracking-wide shadow-lg hover:shadow-xl transition-all uppercase disabled:opacity-50"
                >
                  {authLoading ? 'LOADING...' : (authMode === 'login' ? 'LOG IN' : 'SIGN UP')}
                </button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500 font-semibold">or</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={authLoading}
                  className="w-full bg-white border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-bold flex items-center justify-center gap-3 hover:bg-gray-50 transition-all disabled:opacity-50"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </button>
              </div>
            </form>

            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600 font-semibold">
                {authMode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                <button
                  onClick={() => {
                    setAuthMode(authMode === 'login' ? 'signup' : 'login')
                    setAuthError('')
                  }}
                  className="charger-red-text font-black"
                >
                  {authMode === 'login' ? 'Sign Up' : 'Log In'}
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Menu Sidebar */}
      {showMenu && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 backdrop-blur-sm" onClick={() => setShowMenu(false)}>
          <div className="bg-white w-80 h-full ml-auto p-6 shadow-2xl overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-black tracking-tight font-display">MENU</h2>
              <button onClick={() => setShowMenu(false)}><X className="w-6 h-6" /></button>
            </div>

            {/* User Account Section */}
            {user ? (
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-4 rounded-xl mb-4">
                <div className="flex items-center gap-3 mb-2">
                  <img
                    src={(() => {
                      // Try Google profile picture first, then fall back to DiceBear
                      const googleAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture;
                      if (googleAvatar) return googleAvatar;

                      // Fallback to DiceBear random avatar
                      const styles = ['bottts-neutral', 'avataaars', 'pixel-art', 'fun-emoji', 'thumbs', 'lorelei', 'notionists', 'adventurer'];
                      const seed = user.email || user.id;
                      const styleIndex = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % styles.length;
                      return `https://api.dicebear.com/7.x/${styles[styleIndex]}/svg?seed=${encodeURIComponent(seed)}`;
                    })()}
                    alt="Avatar"
                    className="w-12 h-12 rounded-full bg-white/20 object-cover"
                  />
                  <div>
                    <p className="text-xs font-bold text-green-100">LOGGED IN AS</p>
                    <p className="text-sm font-black truncate max-w-[180px]">{user.user_metadata?.full_name || user.email}</p>
                  </div>
                </div>
                <p className="text-xs font-semibold text-green-100 mb-2">
                  {userInterests.length} events marked as interested
                </p>
                <button
                  onClick={handleLogout}
                  className="w-full bg-white/20 hover:bg-white/30 py-2 rounded-lg text-sm font-black flex items-center justify-center gap-2 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  LOG OUT
                </button>
                {/* Notification Status */}
                {notificationsEnabled ? (
                  <div className="w-full mt-2 bg-green-500/30 py-2 px-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2">
                    <Bell className="w-4 h-4" />
                    Notifications enabled
                  </div>
                ) : (
                  <button
                    onClick={async () => {
                      try {
                        // Use native browser API first (more reliable), then OneSignal picks it up
                        if ('Notification' in window) {
                          const permission = await Notification.requestPermission()
                          console.log('Browser notification permission:', permission)
                          if (permission === 'granted') {
                            setNotificationsEnabled(true)
                            showToast('Notifications enabled!')
                            // OneSignal will detect the permission change automatically
                            // Also try to save player ID now
                            if (user) {
                              saveOneSignalPlayerId(user.id)
                            }
                          } else if (permission === 'denied') {
                            showToast('Notifications blocked. Check browser settings.')
                          }
                        } else {
                          // Fallback to OneSignal method
                          await OneSignal.Notifications.requestPermission()
                        }
                      } catch (err) {
                        console.log('Permission request error:', err)
                        showToast('Could not request notification permission')
                      }
                    }}
                    className="w-full mt-2 bg-yellow-500 hover:bg-yellow-600 py-2 rounded-lg text-sm font-black flex items-center justify-center gap-2 transition-all text-black"
                  >
                    <Bell className="w-4 h-4" />
                    Enable Notifications
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-4 rounded-xl mb-4">
                <p className="text-xs font-bold text-red-100 mb-1">JOIN GO NEW PAPER</p>
                <p className="text-sm font-semibold mb-3">Track events, save jobs & more!</p>
                <button
                  onClick={() => {
                    setShowMenu(false)
                    setShowAuthModal(true)
                    setAuthMode('login')
                  }}
                  className="w-full bg-white text-red-600 py-2 rounded-lg text-sm font-black flex items-center justify-center gap-2 hover:bg-gray-100 transition-all"
                >
                  <LogIn className="w-4 h-4" />
                  LOG IN / SIGN UP
                </button>
              </div>
            )}

            <div className="bg-gradient-to-r from-gray-800 to-gray-700 text-white p-4 rounded-xl mb-4">
              <p className="text-xs font-bold mb-2 text-gray-300">OUR MISSION</p>
              <p className="text-sm font-semibold italic">&quot;Bringing back the town newspaper&mdash;but faster &amp; in your pocket.&quot;</p>
            </div>

            {/* Town Selector */}
            <div className="space-y-2 mb-6">
              <h3 className="text-xs font-black text-gray-500 tracking-wider mb-3 uppercase">Switch Town Edition</h3>

              <div className="p-3 bg-red-50 border-2 border-red-200 rounded-xl">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🔴</span>
                  <div>
                    <p className="font-black text-sm">Chariton</p>
                    <p className="text-xs text-gray-600 font-semibold">Current &bull; Chargers Red/White</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3">
                <p className="text-xs font-black text-blue-800 mb-2 uppercase">Coming Soon</p>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>🔵 Indianola</p>
                  <p>🟣 Osceola</p>
                  <p>🟢 Knoxville</p>
                  <p>⚫ Centerville</p>
                </div>
              </div>
            </div>

            {/* Affiliates Quick Link */}
            <div className="border-t-2 border-gray-200 pt-4 mb-4">
              <button
                onClick={() => {
                  setActiveTab('affiliates')
                  setShowMenu(false)
                }}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white p-3 rounded-xl flex items-center justify-between hover:from-green-700 hover:to-emerald-700 transition-all"
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  <div className="text-left">
                    <p className="text-sm font-black">Market & Partners</p>
                    <p className="text-xs font-semibold text-green-100">Stocks, Trading & Deals</p>
                  </div>
                </div>
                <span className="text-xl">&rarr;</span>
              </button>
            </div>

            {/* Quick Links */}
            <div className="border-t-2 border-gray-200 pt-4">
              <h3 className="text-xs font-black text-gray-500 tracking-wider mb-3 uppercase">Quick Links - Chariton</h3>
              <a href="https://www.charitonschools.org/" target="_blank" rel="noopener noreferrer" className="block p-3 hover:bg-red-50 rounded-xl font-bold text-gray-800 transition-all mb-2">🎓 School District</a>
              <a href="https://www.visioniitheatre.com/" target="_blank" rel="noopener noreferrer" className="block p-3 hover:bg-red-50 rounded-xl font-bold text-gray-800 transition-all">🎬 Vision II Theatre</a>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-24 left-4 right-4 bg-gray-900 text-white p-4 rounded-xl shadow-2xl text-center font-bold z-50 animate-pulse">
          {toast}
        </div>
      )}
    </div>
  )
}
