'use client'
// Go New Paper v2.0.0 - 10 tabs: Events, Jobs, Housing, Business, Non-Profits, Clubs, In Memory, Comics, Community, Affiliates
// Last deploy: Feb 8 2025
import React, { useState, useEffect } from 'react'
import { Calendar, Briefcase, Home, ShoppingBag, Users, Bell, Search, MapPin, Clock, Star, Menu, X, Plus, Heart, Newspaper, TrendingUp, LogIn, LogOut, User, Check, HeartHandshake, UsersRound, Flower2, Trash2, Laugh, ExternalLink, Smartphone } from 'lucide-react'
import { supabase, Event, Job, Business, Housing, CommunityPost, CelebrationOfLife, MarketRecap, TopStory, Affiliate, NonProfit, Club, Comic } from '@/lib/supabase'
import { User as SupabaseUser } from '@supabase/supabase-js'
import OneSignal from 'react-onesignal'

// Format date from YYYY-MM-DD string to readable format (FIXED - no timezone shift)
const formatEventDate = (dateStr: string) => {
  try {
    // Split the date string and create date in local timezone (no UTC conversion)
    const [year, month, day] = dateStr.split('-').map(Number)
    const date = new Date(year, month - 1, day) // month is 0-indexed
    
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  } catch {
    return dateStr
  }
}

// Format time from 24-hour format (HH:MM:SS) to 12-hour AM/PM
const formatEventTime = (timeStr: string) => {
  try {
    if (!timeStr) return ''
    
    // Parse 24-hour time format "16:00:00" or "16:00"
    const [hours24, minutes] = timeStr.split(':')
    const hours = parseInt(hours24, 10)
    const ampm = hours >= 12 ? 'PM' : 'AM'
    const hour12 = hours % 12 || 12
    
    return `${hour12}:${minutes} ${ampm}`
  } catch {
    return timeStr
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
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isAppInstalled, setIsAppInstalled] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // Listing form state
  const [showListingModal, setShowListingModal] = useState(false)
  const [listingType, setListingType] = useState<'nonprofit' | 'club'>('nonprofit')
  const [listingForm, setListingForm] = useState({
    name: '', category: '', tagline: '', email: '',
    donation_url: '', description: '', website: '', phone: '',
    meeting_schedule: '', meeting_location: '',
  })
  const [listingError, setListingError] = useState('')
  const [listingLoading, setListingLoading] = useState(false)
  const [listingSuccess, setListingSuccess] = useState(false)
  const [listingLogo, setListingLogo] = useState<File | null>(null)
  const [listingLogoPreview, setListingLogoPreview] = useState<string | null>(null)

  // Community post form state
  const [showCommunityModal, setShowCommunityModal] = useState(false)
  const [communityForm, setCommunityForm] = useState({
    title: '', post_type: '' as string, description: '', location: '', start_date: '', end_date: '', hours: '', contact_info: '',
  })
  const [communityError, setCommunityError] = useState('')
  const [communityLoading, setCommunityLoading] = useState(false)
  const [communitySuccess, setCommunitySuccess] = useState(false)

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
  const [comics, setComics] = useState<Comic[]>([])

  // Track OneSignal notification status (SDK is initialized in layout.tsx)
  useEffect(() => {
    const checkNotificationStatus = () => {
      try {
        // Use OneSignalDeferred to safely access SDK after it's ready
        window.OneSignalDeferred = window.OneSignalDeferred || []
        window.OneSignalDeferred.push(async (OneSignalSDK: typeof OneSignal) => {
          // Check current notification permission status
          const oneSignalPermission = OneSignalSDK.Notifications.permission
          const browserPermission = 'Notification' in window ? Notification.permission === 'granted' : false
          const hasPermission = oneSignalPermission || browserPermission
          console.log('Notification permission - OneSignal:', oneSignalPermission, 'Browser:', browserPermission)
          setNotificationsEnabled(hasPermission)

          // Listen for permission changes
          OneSignalSDK.Notifications.addEventListener('permissionChange', (newPermission: boolean) => {
            console.log('Notification permission changed:', newPermission)
            setNotificationsEnabled(newPermission)
            if (newPermission) {
              showToast('Notifications enabled!')
            }
          })
        })
      } catch (error) {
        console.error('OneSignal status check error:', error)
        // Even if OneSignal fails, check native browser permission
        if ('Notification' in window && Notification.permission === 'granted') {
          setNotificationsEnabled(true)
        }
      }
    }
    checkNotificationStatus()
  }, [])

  // Save OneSignal subscription ID to Supabase when user logs in
  // Uses OneSignalDeferred to safely wait for SDK to be ready (loaded async in layout.tsx)
  const saveOneSignalPlayerId = (userId: string) => {
    try {
      window.OneSignalDeferred = window.OneSignalDeferred || []
      window.OneSignalDeferred.push(async (OneSignalSDK: typeof OneSignal) => {
        try {
          const playerId = OneSignalSDK.User.PushSubscription.id

          if (playerId) {
            const { error } = await supabase
              .from('users')
              .update({ onesignal_player_id: playerId })
              .eq('id', userId)

            if (error) {
              console.error('Supabase update error:', error)
            } else {
              console.log('OneSignal subscription ID saved:', playerId)
            }
          } else {
            console.log('No subscription ID yet - waiting for user to allow notifications')
          }

          // Always listen for subscription changes (new subscription, token refresh, etc.)
          OneSignalSDK.User.PushSubscription.addEventListener('change', async (event) => {
            const newPlayerId = event.current.id
            if (newPlayerId && event.current.optedIn) {
              console.log('Subscription changed! Saving ID:', newPlayerId)
              const { error } = await supabase
                .from('users')
                .update({ onesignal_player_id: newPlayerId })
                .eq('id', userId)
              if (!error) {
                console.log('OneSignal subscription ID saved after change:', newPlayerId)
              }
            }
          })
        } catch (innerErr) {
          console.error('Error inside OneSignal deferred callback:', innerErr)
        }
      })
    } catch (error) {
      console.error('Error setting up OneSignal player ID save:', error)
    }
  }

  // Listen for PWA install prompt
  useEffect(() => {
    // Only hide the button if CURRENTLY running as installed PWA (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true  // iOS Safari
    if (isStandalone) {
      setIsAppInstalled(true)
    }

    const handler = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // Listen for successful install
    window.addEventListener('appinstalled', () => {
      setIsAppInstalled(true)
      setDeferredPrompt(null)
    })

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

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

  // Admin check
  const isAdmin = user?.email === 'jarrettcmcgee@gmail.com' || user?.email === 'goflufffactory@gmail.com' || user?.email === 'thenewpaperchariton@gmail.com'

  const handleDeleteListing = async (table: 'nonprofits' | 'clubs', id: number, name: string) => {
    if (!confirm(`Remove "${name}" from the site?`)) return
    const { error } = await supabase.from(table).update({ is_active: false }).eq('id', id)
    if (error) { showToast('Error: ' + error.message); return }
    showToast(`"${name}" removed`)
    if (table === 'nonprofits') {
      setNonprofits(prev => prev.filter(n => n.id !== id))
    } else {
      setClubs(prev => prev.filter(c => c.id !== id))
    }
  }

  // Listing form helpers
  const resetListingForm = () => {
    setListingForm({
      name: '', category: '', tagline: '', email: '',
      donation_url: '', description: '', website: '', phone: '',
      meeting_schedule: '', meeting_location: '',
    })
    setListingError('')
    setListingSuccess(false)
    setListingType('nonprofit')
    setListingLogo(null)
    setListingLogoPreview(null)
  }

  const resetCommunityForm = () => {
    setCommunityForm({
      title: '', post_type: '', description: '', location: '', start_date: '', end_date: '', hours: '', contact_info: '',
    })
    setCommunityError('')
    setCommunitySuccess(false)
    setCommunityLoading(false)
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setListingError('Logo must be under 2MB')
        return
      }
      setListingLogo(file)
      const reader = new FileReader()
      reader.onloadend = () => setListingLogoPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleListingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setListingLoading(true)
    setListingError('')

    if (!listingForm.name.trim()) { setListingError('Organization name is required'); setListingLoading(false); return }
    if (!listingForm.category) { setListingError('Please select a category'); setListingLoading(false); return }
    if (!listingForm.tagline.trim()) { setListingError('Tagline is required'); setListingLoading(false); return }
    if (!listingForm.email.trim()) { setListingError('Email is required'); setListingLoading(false); return }
    if (listingType === 'nonprofit' && !listingForm.donation_url.trim()) { setListingError('Donation URL is required for non-profits'); setListingLoading(false); return }

    let logoUrl: string | null = null
    if (listingLogo) {
      const fileExt = listingLogo.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, listingLogo)
      if (uploadError) {
        setListingError('Logo upload failed: ' + uploadError.message)
        setListingLoading(false)
        return
      }
      const { data: urlData } = supabase.storage.from('logos').getPublicUrl(fileName)
      logoUrl = urlData.publicUrl
    }

    if (listingType === 'nonprofit') {
      const { error } = await supabase.from('nonprofits').insert({
        name: listingForm.name.trim(),
        category: listingForm.category,
        logo_emoji: '🏛️',
        logo_url: logoUrl,
        tagline: listingForm.tagline.trim(),
        email: listingForm.email.trim(),
        donation_url: listingForm.donation_url.trim(),
        description: listingForm.description.trim() || null,
        website: listingForm.website.trim() || null,
        phone: listingForm.phone.trim() || null,
        town_id: 1,
        is_active: true,
        display_order: 999,
      })
      if (error) { setListingError(error.message); setListingLoading(false); return }
    } else {
      const { error } = await supabase.from('clubs').insert({
        name: listingForm.name.trim(),
        category: listingForm.category,
        logo_emoji: '👥',
        logo_url: logoUrl,
        tagline: listingForm.tagline.trim(),
        email: listingForm.email.trim(),
        description: listingForm.description.trim() || null,
        website: listingForm.website.trim() || null,
        phone: listingForm.phone.trim() || null,
        meeting_schedule: listingForm.meeting_schedule.trim() || null,
        meeting_location: listingForm.meeting_location.trim() || null,
        town_id: 1,
        is_active: true,
        display_order: 999,
      })
      if (error) { setListingError(error.message); setListingLoading(false); return }
    }

    setListingSuccess(true)
    setListingLoading(false)
    showToast(`${listingType === 'nonprofit' ? 'Non-profit' : 'Club'} listed successfully!`)

    // Re-fetch data so the new entry appears immediately
    if (listingType === 'nonprofit') {
      const { data } = await supabase.from('nonprofits').select('*').eq('is_active', true).order('display_order', { ascending: true })
      if (data) setNonprofits(data)
    } else {
      const { data } = await supabase.from('clubs').select('*').eq('is_active', true).order('display_order', { ascending: true })
      if (data) setClubs(data)
    }
  }

  const handleCommunitySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCommunityLoading(true)
    setCommunityError('')

    if (!communityForm.title.trim()) { setCommunityError('Title is required'); setCommunityLoading(false); return }
    if (!communityForm.post_type) { setCommunityError('Please select a post type'); setCommunityLoading(false); return }

    const emojiMap: Record<string, string> = {
      lost_pet: '\u{1F50D}',
      found_pet: '\u{1F43E}',
      garage_sale: '\u{1F3F7}\uFE0F',
      volunteer: '\u{1F91D}',
      announcement: '\u{1F4E2}',
      other: '\u{1F4AC}',
    }

    const { error } = await supabase.from('community_posts').insert({
      title: communityForm.title.trim(),
      post_type: communityForm.post_type,
      emoji: emojiMap[communityForm.post_type] || '\u{1F4AC}',
      description: communityForm.description.trim() || null,
      location: communityForm.location.trim() || null,
      date: communityForm.start_date ? (communityForm.end_date ? `${communityForm.start_date} to ${communityForm.end_date}` : communityForm.start_date) : null,
      time: communityForm.hours.trim() || null,
      contact_info: communityForm.contact_info.trim() || null,
      image_url: null,
      town_id: 1,
      is_active: true,
    })

    if (error) { setCommunityError(error.message); setCommunityLoading(false); return }

    setCommunitySuccess(true)
    setCommunityLoading(false)
    showToast('Community post submitted!')

    // Re-fetch community posts
    const { data } = await supabase.from('community_posts').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(20)
    if (data) setCommunityPosts(data)
  }

  const handleDeleteCommunityPost = async (id: number, title: string) => {
    if (!confirm(`Remove "${title}" from community posts?`)) return
    const { error } = await supabase.from('community_posts').update({ is_active: false }).eq('id', id)
    if (error) { showToast('Error: ' + error.message); return }
    showToast(`"${title}" removed`)
    setCommunityPosts(prev => prev.filter(p => p.id !== id))
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

    // Also save OneSignal subscription ID (in case it wasn't captured on login)
    saveOneSignalPlayerId(user.id)

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
          clubsRes,
          comicsRes
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
          supabase.from('clubs').select('*').eq('is_active', true).order('display_order', { ascending: true }),
          supabase.from('comics').select('*').order('publish_date', { ascending: false }).limit(10)
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
        if (comicsRes.data) setComics(comicsRes.data)
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

  const sampleComics: Comic[] = [
    { id: 1, title: 'Why did the scarecrow win an award?', alt_text: 'Because he was outstanding in his field! 🌾', source: 'Daily Laughs', publish_date: new Date().toISOString().split('T')[0], town_id: 1, created_at: '' },
    { id: 2, title: 'What do you call a fake noodle?', alt_text: 'An impasta! 🍝', source: 'Daily Laughs', publish_date: new Date(Date.now() - 86400000).toISOString().split('T')[0], town_id: 1, created_at: '' },
    { id: 3, title: 'Why don\'t scientists trust atoms?', alt_text: 'Because they make up everything! ⚛️', source: 'Daily Laughs', publish_date: new Date(Date.now() - 172800000).toISOString().split('T')[0], town_id: 1, created_at: '' },
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
  const displayComics = comics.length > 0 ? comics : sampleComics
  const displayStocks = marketRecap?.hot_stocks || sampleStocks

  const tabs = [
    { id: 'events', icon: Calendar, label: 'EVENTS' },
    { id: 'jobs', icon: Briefcase, label: 'JOBS' },
    { id: 'housing', icon: Home, label: 'HOUSING' },
    { id: 'businesses', icon: ShoppingBag, label: 'BUSINESS' },
    { id: 'nonprofits', icon: HeartHandshake, label: 'NON-PROFITS' },
    { id: 'clubs', icon: UsersRound, label: 'CLUBS' },
    { id: 'celebrations', icon: Flower2, label: 'IN MEMORY' },
    { id: 'comics', icon: Laugh, label: 'DAILY LAUGHS' },
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

            {/* Daily Laughs Tab */}
            {activeTab === 'comics' && (
              <>
                <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-200 p-4 rounded-xl mb-4 shadow-md">
                  <div className="flex items-center gap-2 mb-2">
                    <Laugh className="w-6 h-6 text-yellow-600" />
                    <p className="text-lg font-black text-gray-800">DAILY LAUGHS</p>
                  </div>
                  <p className="text-xs font-semibold text-gray-600">
                    Your daily dose of humor. A new joke every day to brighten your morning!
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {displayComics.map((comic, index) => (
                    <div key={comic.id} className={`bg-white rounded-xl shadow-md border-2 overflow-hidden ${index === 0 ? 'border-yellow-300' : 'border-gray-100'}`}>
                      {comic.image_url && comic.image_url.trim() !== '' && comic.image_url.trim().startsWith('http') ? (
                        <img src={comic.image_url} alt={comic.alt_text || comic.title} className="w-full max-h-80 object-contain bg-gray-50" />
                      ) : (
                        <div className="bg-gradient-to-br from-yellow-50 to-amber-50 p-6">
                          <p className="text-lg font-black text-gray-800 text-center">{comic.title}</p>
                          {comic.alt_text && (
                            <p className="text-base font-bold text-yellow-700 text-center mt-3">{comic.alt_text}</p>
                          )}
                        </div>
                      )}
                      <div className="px-4 py-3 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {index === 0 && <span className="bg-yellow-100 text-yellow-800 text-xs font-black px-2 py-0.5 rounded">TODAY</span>}
                            <span className="text-xs text-gray-500 font-semibold">{comic.publish_date}</span>
                          </div>
                          {comic.source && <span className="text-xs text-gray-400 font-semibold">{comic.source}</span>}
                        </div>
                        {comic.artist_name && (
                          <div className="mt-1">
                            <span className="text-xs text-gray-500 font-semibold">
                              By {comic.artist_url ? (
                                <a href={comic.artist_url} target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:text-amber-800 underline">{comic.artist_name}</a>
                              ) : comic.artist_name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {displayComics.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-4">😄</div>
                    <p className="text-lg font-black text-gray-700 mb-2">No jokes yet!</p>
                    <p className="text-sm text-gray-500 font-semibold">Check back tomorrow for your daily laugh.</p>
                  </div>
                )}
              </>
            )}

            {/* Community Tab */}
            {activeTab === 'community' && (
              <>
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 p-4 rounded-xl mb-4 shadow-md">
                  <div className="flex items-center gap-2 mb-2">
                    <Bell className="w-6 h-6 text-green-600" />
                    <p className="text-lg font-black text-gray-800">COMMUNITY BOARD</p>
                  </div>
                  <p className="text-xs font-semibold text-gray-600">
                    Lost pets, garage sales, volunteer needs & local announcements from your neighbors.
                  </p>
                </div>

                <div className="flex justify-end mb-3">
                  <button
                    onClick={() => { resetCommunityForm(); setShowCommunityModal(true) }}
                    className="bg-green-600 text-white text-sm font-black flex items-center gap-1 tracking-wide px-4 py-2 rounded-lg shadow hover:bg-green-700 transition-all"
                  >
                    <Plus className="w-4 h-4" />POST
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {displayCommunity.map(post => (
                    <div key={post.id} className="bg-white rounded-xl p-4 shadow-md border-2 border-green-100 hover:shadow-lg hover:border-green-300 transition-all relative">
                      {isAdmin && (
                        <button onClick={() => handleDeleteCommunityPost(post.id, post.title)} className="absolute top-2 right-2 p-1.5 bg-red-100 hover:bg-red-200 rounded-lg transition-all" title="Remove post">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      )}
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{post.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-black text-base tracking-tight mb-1">{post.title}</h3>
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold">
                            {post.post_type === 'lost_pet' ? 'Lost Pet' : post.post_type === 'found_pet' ? 'Found Pet' : post.post_type === 'garage_sale' ? 'Garage Sale' : post.post_type === 'volunteer' ? 'Volunteer' : post.post_type === 'announcement' ? 'Announcement' : 'Other'}
                          </span>
                          {post.description && (
                            <p className="text-sm font-semibold text-gray-700 mt-2">{post.description}</p>
                          )}
                          {post.location && (
                            <div className="flex items-center gap-2 text-xs text-gray-600 font-semibold mt-2">
                              <MapPin className="w-3 h-3 text-green-600" />
                              <span>{post.location}</span>
                            </div>
                          )}
                          {(post.date || post.time) && (
                            <div className="flex items-center gap-2 text-xs text-gray-600 font-semibold mt-1">
                              <Clock className="w-3 h-3 text-green-600" />
                              <span>{post.date}{post.date && post.time ? ' at ' : ''}{post.time}</span>
                            </div>
                          )}
                          {post.contact_info && (
                            <div className="flex items-center gap-2 text-xs text-gray-600 font-semibold mt-1">
                              <User className="w-3 h-3 text-green-600" />
                              <span>{post.contact_info}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {displayCommunity.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-4">📋</div>
                    <p className="text-lg font-black text-gray-700 mb-2">No posts yet!</p>
                    <p className="text-sm text-gray-500 font-semibold">Be the first to post something to the community board.</p>
                  </div>
                )}

                {/* CTA for community posts */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 p-4 rounded-xl mt-6">
                  <p className="text-sm font-bold text-gray-800 mb-2">📢 Got something to share?</p>
                  <p className="text-xs text-gray-600 font-semibold mb-3">Post lost/found pets, garage sales, volunteer needs, or announcements for free!</p>
                  <button
                    onClick={() => { resetCommunityForm(); setShowCommunityModal(true) }}
                    className="w-full bg-green-600 text-white py-3 rounded-lg text-sm font-black shadow-lg hover:bg-green-700 transition-all flex items-center justify-center gap-2"
                  >
                    <span>📝</span> POST FOR FREE
                  </button>
                </div>
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
                    <div key={np.id} className="bg-white rounded-xl p-4 shadow-md border-2 border-rose-100 hover:shadow-lg hover:border-rose-300 transition-all relative">
                      {isAdmin && (
                        <button onClick={() => handleDeleteListing('nonprofits', np.id, np.name)} className="absolute top-2 right-2 p-1.5 bg-red-100 hover:bg-red-200 rounded-lg transition-all" title="Remove listing">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      )}
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
                  <button
                    onClick={() => { resetListingForm(); setListingType('nonprofit'); setShowListingModal(true) }}
                    className="w-full bg-rose-600 text-white py-3 rounded-lg text-sm font-black shadow-lg hover:bg-rose-700 transition-all flex items-center justify-center gap-2"
                  >
                    <span>📝</span> GET LISTED FREE
                  </button>
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
                    <div key={club.id} className="bg-white rounded-xl p-4 shadow-md border-2 border-cyan-100 hover:shadow-lg hover:border-cyan-300 transition-all relative">
                      {isAdmin && (
                        <button onClick={() => handleDeleteListing('clubs', club.id, club.name)} className="absolute top-2 right-2 p-1.5 bg-red-100 hover:bg-red-200 rounded-lg transition-all" title="Remove listing">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      )}
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
                  <button
                    onClick={() => { resetListingForm(); setListingType('club'); setShowListingModal(true) }}
                    className="w-full bg-cyan-600 text-white py-3 rounded-lg text-sm font-black shadow-lg hover:bg-cyan-700 transition-all flex items-center justify-center gap-2"
                  >
                    <span>📝</span> GET LISTED FREE
                  </button>
                </div>
              </>
            )}

            {/* Celebrations of Life Tab */}
            {activeTab === 'celebrations' && (
              <>
                <div className="bg-gradient-to-r from-purple-50 to-violet-50 border-2 border-purple-200 p-4 rounded-xl mb-4 shadow-md">
                  <div className="flex items-center gap-2 mb-2">
                    <Flower2 className="w-6 h-6 text-purple-600" />
                    <p className="text-lg font-black text-gray-800">CELEBRATIONS OF LIFE</p>
                  </div>
                  <p className="text-xs font-semibold text-gray-600">
                    Honoring those we&apos;ve lost. Remembering the lives that made our community special.
                  </p>
                </div>

                {celebrations.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3">
                    {celebrations.map(c => (
                      <div key={c.id} className="bg-white rounded-xl p-4 shadow-md border-2 border-purple-100 hover:shadow-lg transition-all">
                        <div className="flex items-start gap-4">
                          {c.photo_url ? (
                            <img src={c.photo_url} alt={c.full_name} className="w-20 h-20 rounded-xl object-cover shadow-md" />
                          ) : (
                            <div className="w-20 h-20 rounded-xl bg-purple-50 flex items-center justify-center">
                              <span className="text-3xl">🕯️</span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-black tracking-tight mb-1">{c.full_name}</h3>
                            {(() => {
                              const displayAge = c.age ?? (c.birth_date && c.passing_date ? Math.floor((new Date(c.passing_date).getTime() - new Date(c.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null)
                              return displayAge != null ? <p className="text-sm text-gray-600 font-semibold">Age {displayAge}</p> : null
                            })()}
                            {(c.birth_date || c.passing_date) ? (
                              <p className="text-xs text-gray-500 font-semibold mt-1">
                                {c.birth_date && `Born: ${c.birth_date}`}
                                {c.birth_date && c.passing_date && ' • '}
                                {c.passing_date && `Passed: ${c.passing_date}`}
                              </p>
                            ) : (
                              <p className="text-xs text-gray-400 italic font-semibold mt-1">Dates unavailable</p>
                            )}
                          </div>
                        </div>
                        {c.obituary && (
                          <p className="text-sm text-gray-600 font-semibold mt-3 line-clamp-3">{c.obituary}</p>
                        )}
                        {(c.service_date || c.service_location) && (
                          <div className="bg-purple-50 rounded-lg p-3 mt-3">
                            <p className="text-xs font-black text-purple-800 uppercase tracking-wider mb-1">Service Details</p>
                            {c.service_date && (
                              <div className="flex items-center gap-2 text-sm text-gray-700 font-semibold">
                                <Calendar className="w-3.5 h-3.5 text-purple-600" />
                                <span>{c.service_date}{c.service_time ? ` at ${c.service_time}` : ''}</span>
                              </div>
                            )}
                            {c.service_location && (
                              <div className="flex items-center gap-2 text-sm text-gray-700 font-semibold mt-1">
                                <MapPin className="w-3.5 h-3.5 text-purple-600" />
                                <span>{c.service_location}</span>
                              </div>
                            )}
                          </div>
                        )}
                        {(c.funeral_home || c.funeral_home_url) && (
                          <div className="mt-3 flex items-center justify-between">
                            {c.funeral_home && (
                              <p className="text-xs text-gray-500 font-semibold">{c.funeral_home}</p>
                            )}
                            {c.funeral_home_url && (
                              <a
                                href={c.funeral_home_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors"
                              >
                                View Full Obituary
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-4">🕊️</div>
                    <p className="text-lg font-black text-gray-700 mb-2">No current listings</p>
                    <p className="text-sm text-gray-500 font-semibold">Celebrations of life will appear here when available.</p>
                  </div>
                )}
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
              <span className="text-xs font-black tracking-wider uppercase">{tab.label}</span>
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

      {/* Listing Submission Modal */}
      {showListingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center backdrop-blur-sm p-4" onClick={() => { setShowListingModal(false); resetListingForm() }}>
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black tracking-tight font-display">
                {listingSuccess ? "YOU'RE LISTED!" : 'GET LISTED FREE'}
              </h2>
              <button onClick={() => { setShowListingModal(false); resetListingForm() }}><X className="w-6 h-6" /></button>
            </div>

            {listingSuccess ? (
              <div className="text-center py-6">
                <div className="text-6xl mb-4">🎉</div>
                <p className="text-lg font-black mb-2">{listingType === 'nonprofit' ? 'Non-Profit' : 'Club'} Added!</p>
                <p className="text-sm text-gray-600 font-semibold mb-6">
                  Your listing is now live on Go New Paper. Check the {listingType === 'nonprofit' ? 'Non-Profits' : 'Clubs'} tab!
                </p>
                <button
                  onClick={() => { setShowListingModal(false); resetListingForm(); setActiveTab(listingType === 'nonprofit' ? 'nonprofits' : 'clubs') }}
                  className="w-full bg-red-600 text-white py-3 rounded-lg font-black tracking-wide shadow-lg"
                >
                  VIEW MY LISTING
                </button>
              </div>
            ) : (
              <form onSubmit={handleListingSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Type</label>
                    <select value={listingType} onChange={(e) => setListingType(e.target.value as 'nonprofit' | 'club')} className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-red-500 focus:outline-none font-semibold">
                      <option value="nonprofit">Non-Profit Organization</option>
                      <option value="club">Club or Group</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Organization Name *</label>
                    <input type="text" value={listingForm.name} onChange={(e) => setListingForm(f => ({...f, name: e.target.value}))} className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-red-500 focus:outline-none font-semibold" placeholder="e.g. Chariton Community Garden" required maxLength={80} />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Category *</label>
                    <select value={listingForm.category} onChange={(e) => setListingForm(f => ({...f, category: e.target.value}))} className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-red-500 focus:outline-none font-semibold" required>
                      <option value="">Select a category...</option>
                      <option value="General">General</option>
                      <option value="Community Events">Community Events</option>
                      <option value="Sports & Recreation">Sports & Recreation</option>
                      <option value="Arts & Culture">Arts & Culture</option>
                      <option value="Youth">Youth</option>
                      <option value="Education">Education</option>
                      <option value="Faith-Based">Faith-Based</option>
                      <option value="Health & Wellness">Health & Wellness</option>
                      <option value="Veterans">Veterans</option>
                      <option value="Social Services">Social Services</option>
                      <option value="Environment">Environment</option>
                      <option value="Animal Welfare">Animal Welfare</option>
                      <option value="Civic/Government">Civic/Government</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Tagline *</label>
                    <input type="text" value={listingForm.tagline} onChange={(e) => setListingForm(f => ({...f, tagline: e.target.value}))} className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-red-500 focus:outline-none font-semibold" placeholder="One sentence about your organization" required maxLength={100} />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Logo / Image</label>
                    {listingLogoPreview ? (
                      <div className="relative mb-2">
                        <img src={listingLogoPreview} alt="Logo preview" className="w-24 h-24 rounded-xl object-cover shadow-md border-2 border-gray-200" />
                        <button type="button" onClick={() => { setListingLogo(null); setListingLogoPreview(null) }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-black shadow">X</button>
                      </div>
                    ) : (
                      <div className="relative">
                        <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" id="logo-upload" />
                        <label htmlFor="logo-upload" className="w-full px-4 py-3 rounded-lg border-2 border-dashed border-gray-300 hover:border-red-400 focus:border-red-500 cursor-pointer flex items-center justify-center gap-2 text-gray-500 font-semibold text-sm transition-all hover:bg-gray-50">
                          <Plus className="w-4 h-4" />
                          Upload Logo (optional, max 2MB)
                        </label>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Contact Email *</label>
                    <input type="email" value={listingForm.email} onChange={(e) => setListingForm(f => ({...f, email: e.target.value}))} className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-red-500 focus:outline-none font-semibold" placeholder="you@example.com" required />
                  </div>

                  {listingType === 'nonprofit' && (
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Donation Link *</label>
                      <input type="url" value={listingForm.donation_url} onChange={(e) => setListingForm(f => ({...f, donation_url: e.target.value}))} className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-red-500 focus:outline-none font-semibold" placeholder="https://donate.example.com" required />
                    </div>
                  )}

                  {listingType === 'club' && (
                    <>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Meeting Schedule</label>
                        <input type="text" value={listingForm.meeting_schedule} onChange={(e) => setListingForm(f => ({...f, meeting_schedule: e.target.value}))} className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-red-500 focus:outline-none font-semibold" placeholder="e.g. Every Tuesday at 6 PM (optional)" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Meeting Location</label>
                        <input type="text" value={listingForm.meeting_location} onChange={(e) => setListingForm(f => ({...f, meeting_location: e.target.value}))} className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-red-500 focus:outline-none font-semibold" placeholder="e.g. Community Center (optional)" />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                    <textarea value={listingForm.description} onChange={(e) => setListingForm(f => ({...f, description: e.target.value}))} className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-red-500 focus:outline-none font-semibold" placeholder="Tell people more about your organization (optional)" rows={3} maxLength={500} />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Website</label>
                    <input type="url" value={listingForm.website} onChange={(e) => setListingForm(f => ({...f, website: e.target.value}))} className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-red-500 focus:outline-none font-semibold" placeholder="https://... (optional)" />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Phone</label>
                    <input type="tel" value={listingForm.phone} onChange={(e) => setListingForm(f => ({...f, phone: e.target.value}))} className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-red-500 focus:outline-none font-semibold" placeholder="(641) 555-1234 (optional)" />
                  </div>

                  {listingError && <p className="text-red-600 text-sm font-bold">{listingError}</p>}

                  <button type="submit" disabled={listingLoading} className="w-full bg-red-600 text-white py-3 rounded-lg font-black tracking-wide shadow-lg hover:shadow-xl transition-all uppercase disabled:opacity-50">
                    {listingLoading ? 'SUBMITTING...' : 'SUBMIT LISTING'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Community Post Modal */}
      {showCommunityModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center backdrop-blur-sm p-4" onClick={() => { setShowCommunityModal(false); resetCommunityForm() }}>
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black tracking-tight font-display">
                {communitySuccess ? 'POSTED!' : 'POST TO COMMUNITY'}
              </h2>
              <button onClick={() => { setShowCommunityModal(false); resetCommunityForm() }}><X className="w-6 h-6" /></button>
            </div>

            {communitySuccess ? (
              <div className="text-center py-6">
                <div className="text-6xl mb-4">🎉</div>
                <p className="text-lg font-black mb-2">Your post is live!</p>
                <p className="text-sm text-gray-600 font-semibold mb-6">
                  Your community post is now visible on the Community tab for all of Chariton to see!
                </p>
                <button
                  onClick={() => { setShowCommunityModal(false); resetCommunityForm(); setActiveTab('community') }}
                  className="w-full bg-green-600 text-white py-3 rounded-lg font-black tracking-wide shadow-lg"
                >
                  VIEW MY POST
                </button>
              </div>
            ) : (
              <form onSubmit={handleCommunitySubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Post Type *</label>
                    <select value={communityForm.post_type} onChange={(e) => setCommunityForm(f => ({...f, post_type: e.target.value}))} className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-green-500 focus:outline-none font-semibold" required>
                      <option value="">Select a type...</option>
                      <option value="lost_pet">Lost Pet</option>
                      <option value="found_pet">Found Pet</option>
                      <option value="garage_sale">Garage Sale</option>
                      <option value="volunteer">Volunteer Needed</option>
                      <option value="announcement">Announcement</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Title *</label>
                    <input type="text" value={communityForm.title} onChange={(e) => setCommunityForm(f => ({...f, title: e.target.value}))} className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-green-500 focus:outline-none font-semibold" placeholder="e.g. Lost Golden Retriever near Town Square" required maxLength={100} />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                    <textarea value={communityForm.description} onChange={(e) => setCommunityForm(f => ({...f, description: e.target.value}))} className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-green-500 focus:outline-none font-semibold" placeholder="Add more details (optional)" rows={3} maxLength={500} />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Location</label>
                    <input type="text" value={communityForm.location} onChange={(e) => setCommunityForm(f => ({...f, location: e.target.value}))} className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-green-500 focus:outline-none font-semibold" placeholder="e.g. 123 Main St, Chariton (optional)" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Start Date</label>
                      <input type="date" value={communityForm.start_date} onChange={(e) => setCommunityForm(f => ({...f, start_date: e.target.value}))} className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-green-500 focus:outline-none font-semibold" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">End Date</label>
                      <input type="date" value={communityForm.end_date} onChange={(e) => setCommunityForm(f => ({...f, end_date: e.target.value}))} className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-green-500 focus:outline-none font-semibold" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Hours / Schedule</label>
                    <input type="text" value={communityForm.hours} onChange={(e) => setCommunityForm(f => ({...f, hours: e.target.value}))} className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-green-500 focus:outline-none font-semibold" placeholder="e.g. Fri 10-2, Sat 8-5, Sun 10-2 (optional)" />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Contact Info</label>
                    <input type="text" value={communityForm.contact_info} onChange={(e) => setCommunityForm(f => ({...f, contact_info: e.target.value}))} className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-green-500 focus:outline-none font-semibold" placeholder="Phone, email, or social media (optional)" />
                  </div>

                  {communityError && <p className="text-red-600 text-sm font-bold">{communityError}</p>}

                  <button type="submit" disabled={communityLoading} className="w-full bg-green-600 text-white py-3 rounded-lg font-black tracking-wide shadow-lg hover:shadow-xl transition-all uppercase disabled:opacity-50">
                    {communityLoading ? 'SUBMITTING...' : 'SUBMIT POST'}
                  </button>
                </div>
              </form>
            )}
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
                {/* Add to Phone Apps Button */}
                {!isAppInstalled && (
                  <button
                    onClick={async () => {
                      if (deferredPrompt) {
                        deferredPrompt.prompt()
                        const { outcome } = await deferredPrompt.userChoice
                        if (outcome === 'accepted') {
                          setIsAppInstalled(true)
                          showToast('App installed! Check your home screen.')
                        }
                        setDeferredPrompt(null)
                      } else {
                        // Fallback instructions for iOS or when prompt isn't available
                        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
                        if (isIOS) {
                          showToast('Tap the Share button ⬆️ then "Add to Home Screen"')
                        } else {
                          showToast('Open browser menu ⋮ then "Add to Home Screen"')
                        }
                      }
                    }}
                    className="w-full mt-2 bg-white/20 hover:bg-white/30 py-2 rounded-lg text-sm font-black flex items-center justify-center gap-2 transition-all"
                  >
                    <Smartphone className="w-4 h-4" />
                    Add to your Phone Apps
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
                {/* Add to Phone Apps Button (not logged in) */}
                {!isAppInstalled && (
                  <button
                    onClick={async () => {
                      if (deferredPrompt) {
                        deferredPrompt.prompt()
                        const { outcome } = await deferredPrompt.userChoice
                        if (outcome === 'accepted') {
                          setIsAppInstalled(true)
                          showToast('App installed! Check your home screen.')
                        }
                        setDeferredPrompt(null)
                      } else {
                        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
                        if (isIOS) {
                          showToast('Tap the Share button ⬆️ then "Add to Home Screen"')
                        } else {
                          showToast('Open browser menu ⋮ then "Add to Home Screen"')
                        }
                      }
                    }}
                    className="w-full mt-2 bg-white/20 hover:bg-white/30 py-2 rounded-lg text-sm font-black flex items-center justify-center gap-2 transition-all"
                  >
                    <Smartphone className="w-4 h-4" />
                    Add to your Phone Apps
                  </button>
                )}
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
