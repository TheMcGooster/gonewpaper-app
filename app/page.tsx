'use client'
// Go New Paper v2.0.0 - 10 tabs: Events, Jobs, Housing, Business, Non-Profits, Clubs, In Memory, Comics, Community, Affiliates
// Last deploy: Feb 8 2025
import React, { useState, useEffect } from 'react'
import { Calendar, Briefcase, Home, ShoppingBag, Users, Bell, Search, MapPin, Clock, Star, Menu, X, Plus, Heart, Newspaper, TrendingUp, LogIn, LogOut, User, Check, HeartHandshake, UsersRound, Flower2, Trash2, Laugh, ExternalLink, Smartphone } from 'lucide-react'
import { supabase, Event, Job, Business, Housing, CommunityPost, CelebrationOfLife, MarketRecap, TopStory, Affiliate, NonProfit, Club, Comic } from '@/lib/supabase'
import { User as SupabaseUser } from '@supabase/supabase-js'
// OneSignal SDK is loaded via CDN in layout.tsx — no npm package needed

// Format date from YYYY-MM-DD string to readable format (FIXED - no timezone shift)
const formatEventDate = (dateStr: string) => {
  try {
    // Handle ISO timestamps like "2025-01-10T00:00:00Z" — extract just the date part
    const datePart = dateStr.split('T')[0]
    const [year, month, day] = datePart.split('-').map(Number)
    if (!year || !month || !day || isNaN(year) || isNaN(month) || isNaN(day)) return dateStr
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
  const [activeTab, setActiveTabRaw] = useState('events')
  const setActiveTab = (tab: string) => {
    setActiveTabRaw(tab)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
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
  const [showInstallHelp, setShowInstallHelp] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [selectedTownId, setSelectedTownId] = useState(1) // Default to Chariton
  const [selectedTownName, setSelectedTownName] = useState('Chariton')

  // Town theme configuration — colors, branding, etc.
  const townThemes: Record<number, { name: string; mascot: string; letter: string; primaryColor: string; darkColor: string; accentClass: string; accentTextClass: string; accentBg: string; tabActiveText: string; shieldFill: string; selectorBg: string; selectorBorder: string; selectorEmoji: string; colorLabel: string }> = {
    1: { name: 'Chariton', mascot: 'Chargers', letter: 'C', primaryColor: '#DC143C', darkColor: '#A01020', accentClass: 'charger-red', accentTextClass: 'charger-red-text', accentBg: 'bg-red-600', tabActiveText: 'text-red-600', shieldFill: '#DC143C', selectorBg: 'bg-red-50', selectorBorder: 'border-red-400', selectorEmoji: '🔴', colorLabel: 'Chargers Red/White' },
    2: { name: 'Knoxville', mascot: 'Panthers', letter: 'K', primaryColor: '#D4A843', darkColor: '#1a1a1a', accentClass: 'panther-gold', accentTextClass: 'panther-gold-text', accentBg: 'bg-yellow-600', tabActiveText: 'text-yellow-700', shieldFill: '#1a1a1a', selectorBg: 'bg-yellow-50', selectorBorder: 'border-yellow-500', selectorEmoji: '🟡', colorLabel: 'Panthers Black/Gold' },
  }
  const theme = townThemes[selectedTownId] || townThemes[1]

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
        // FAST CHECK: If browser already granted permission, show green immediately
        // while we wait for OneSignal SDK to fully load and confirm subscription.
        // This prevents the button from flashing yellow on every page load for users
        // who have already enabled notifications.
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          setNotificationsEnabled(true)
        }

        // Use OneSignalDeferred to safely access SDK after it's ready
        window.OneSignalDeferred = window.OneSignalDeferred || []
        window.OneSignalDeferred.push(async (OneSignalSDK: any) => {
          // Check OneSignal subscription status (NOT just browser permission!)
          // Browser permission and OneSignal subscription are DIFFERENT things.
          // User must have a OneSignal subscription (player ID) for notifications to actually work.
          const oneSignalPermission = OneSignalSDK.Notifications.permission
          const hasSubscription = !!OneSignalSDK.User.PushSubscription.id
          console.log('OneSignal permission:', oneSignalPermission, 'Has subscription:', hasSubscription, 'Player ID:', OneSignalSDK.User.PushSubscription.id)
          setNotificationsEnabled(oneSignalPermission && hasSubscription)

          // Listen for permission changes
          OneSignalSDK.Notifications.addEventListener('permissionChange', (newPermission: boolean) => {
            console.log('Notification permission changed:', newPermission)
            const subId = OneSignalSDK.User.PushSubscription.id
            setNotificationsEnabled(newPermission && !!subId)
            if (newPermission && subId) {
              showToast('Notifications enabled!')
            }
          })

          // Listen for subscription changes (player ID created/changed)
          // Also save the player ID to the database when it first becomes available
          OneSignalSDK.User.PushSubscription.addEventListener('change', async (event: any) => {
            console.log('Subscription changed:', event.current.id, 'optedIn:', event.current.optedIn)
            if (event.current.id && event.current.optedIn) {
              setNotificationsEnabled(true)
              // Save player ID to DB - get current user session
              const { data: { session } } = await supabase.auth.getSession()
              if (session?.user) {
                const { error } = await supabase
                  .from('users')
                  .update({ onesignal_player_id: event.current.id })
                  .eq('id', session.user.id)
                if (!error) {
                  console.log('Player ID saved from status listener:', event.current.id)
                }
              }
            }
          })
        })
      } catch (error) {
        console.error('OneSignal status check error:', error)
        // Don't set notifications as enabled based on browser permission alone
        // OneSignal subscription is required for actual notification delivery
      }
    }
    checkNotificationStatus()
  }, [])

  // Save OneSignal subscription ID to Supabase
  // Uses OneSignalDeferred to safely wait for SDK to be ready (loaded async in layout.tsx)
  // Handles: immediate capture, delayed capture via polling, and subscription change events
  const saveOneSignalPlayerId = (userId: string) => {
    try {
      window.OneSignalDeferred = window.OneSignalDeferred || []
      window.OneSignalDeferred.push(async (OneSignalSDK: typeof OneSignal) => {
        try {
          const saveId = async (playerId: string) => {
            const { error } = await supabase
              .from('users')
              .update({ onesignal_player_id: playerId })
              .eq('id', userId)
            if (error) {
              console.error('Supabase update error:', error)
            } else {
              console.log('OneSignal subscription ID saved:', playerId)
            }
          }

          // Try to get player ID immediately
          const playerId = OneSignalSDK.User.PushSubscription.id
          if (playerId) {
            await saveId(playerId)
          } else {
            console.log('No subscription ID yet - will poll and listen for changes')
            // Poll a few times in case SDK is still initializing the subscription
            let attempts = 0
            const pollInterval = setInterval(async () => {
              attempts++
              const id = OneSignalSDK.User.PushSubscription.id
              if (id) {
                clearInterval(pollInterval)
                await saveId(id)
              } else if (attempts >= 10) {
                clearInterval(pollInterval)
                console.log('OneSignal: no subscription ID after polling - user may not have granted permission yet')
              }
            }, 2000)
          }

          // Always listen for subscription changes (new subscription, token refresh, etc.)
          OneSignalSDK.User.PushSubscription.addEventListener('change', async (event) => {
            const newPlayerId = event.current.id
            if (newPlayerId && event.current.optedIn) {
              console.log('Subscription changed! Saving ID:', newPlayerId)
              await saveId(newPlayerId)
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

  // Handle town selection: save to DB, set OneSignal tag, refetch data
  const handleTownChange = async (townId: number, townName: string) => {
    setSelectedTownId(townId)
    setSelectedTownName(townName)

    // Save to Supabase if logged in
    if (user) {
      await supabase.from('users').update({ town_id: townId }).eq('id', user.id)
    }

    // Save to localStorage for non-logged-in users and persistence
    localStorage.setItem('selectedTownId', String(townId))
    localStorage.setItem('selectedTownName', townName)

    // Set OneSignal tag so push notifications are filtered by town
    try {
      window.OneSignalDeferred = window.OneSignalDeferred || []
      window.OneSignalDeferred.push((OneSignalSDK: typeof OneSignal) => {
        OneSignalSDK.User.addTag('town_id', String(townId))
        console.log('OneSignal town_id tag set to:', townId)
      })
    } catch (err) {
      console.error('Error setting OneSignal town tag:', err)
    }

    showToast(`Switched to ${townName}!`)
  }

  // Load user's town from Supabase or localStorage
  const loadUserTown = async (userId?: string) => {
    if (userId) {
      const { data } = await supabase.from('users').select('town_id').eq('id', userId).single()
      if (data?.town_id) {
        setSelectedTownId(data.town_id)
        // Look up town name
        const { data: town } = await supabase.from('towns').select('name').eq('id', data.town_id).single()
        if (town?.name) setSelectedTownName(town.name)
        localStorage.setItem('selectedTownId', String(data.town_id))
        if (town?.name) localStorage.setItem('selectedTownName', town.name)
        // Set OneSignal tag
        try {
          window.OneSignalDeferred = window.OneSignalDeferred || []
          window.OneSignalDeferred.push((OneSignalSDK: typeof OneSignal) => {
            OneSignalSDK.User.addTag('town_id', String(data.town_id))
          })
        } catch (err) { /* ignore */ }
        return
      }
    }
    // Fallback to localStorage
    const savedId = localStorage.getItem('selectedTownId')
    const savedName = localStorage.getItem('selectedTownName')
    if (savedId) setSelectedTownId(Number(savedId))
    if (savedName) setSelectedTownName(savedName)
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
    // Load town from localStorage first (works for logged-out users too)
    loadUserTown()

    // Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchUserInterests(session.user.id)
        saveOneSignalPlayerId(session.user.id)
        loadUserTown(session.user.id)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchUserInterests(session.user.id)
        saveOneSignalPlayerId(session.user.id)
        loadUserTown(session.user.id)
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
        town_id: selectedTownId,
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
        town_id: selectedTownId,
        is_active: true,
        display_order: 999,
      })
      if (error) { setListingError(error.message); setListingLoading(false); return }
    }

    setListingSuccess(true)
    setListingLoading(false)
    showToast(`${listingType === 'nonprofit' ? 'Non-profit' : 'Club'} listed successfully!`)

    // Re-fetch data so the new entry appears immediately (filtered by current town)
    if (listingType === 'nonprofit') {
      const { data } = await supabase.from('nonprofits').select('*').eq('town_id', selectedTownId).eq('is_active', true).order('display_order', { ascending: true })
      if (data) setNonprofits(data)
    } else {
      const { data } = await supabase.from('clubs').select('*').eq('town_id', selectedTownId).eq('is_active', true).order('display_order', { ascending: true })
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
      town_id: selectedTownId,
      is_active: true,
    })

    if (error) { setCommunityError(error.message); setCommunityLoading(false); return }

    setCommunitySuccess(true)
    setCommunityLoading(false)
    showToast('Community post submitted!')

    // Re-fetch community posts (filtered by current town)
    const { data } = await supabase.from('community_posts').select('*').eq('town_id', selectedTownId).eq('is_active', true).order('created_at', { ascending: false }).limit(20)
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
    const { error: delError } = await supabase
      .from('user_interests')
      .delete()
      .eq('user_id', user.id)
      .eq('event_id', eventId)

    if (delError) { showToast('Something went wrong. Please try again.'); return }
    setUserInterests(prev => prev.filter(id => id !== eventId))
    showToast('Removed from your interests')
  } else {
    // Add interest
    const { error: insError } = await supabase
      .from('user_interests')
      .insert({ user_id: user.id, event_id: eventId })

    if (insError) { showToast('Something went wrong. Please try again.'); return }
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
          // Town-specific content (filtered by selectedTownId)
          supabase.from('events').select('*').eq('town_id', selectedTownId).gte('date', new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })).order('date', { ascending: true }).limit(20),
          supabase.from('jobs').select('*').eq('town_id', selectedTownId).order('created_at', { ascending: false }).limit(20),
          supabase.from('businesses').select('*').or(`town_id.eq.${selectedTownId},additional_town_ids.cs.{${selectedTownId}}`).order('featured', { ascending: false }).limit(20),
          supabase.from('housing').select('*').eq('town_id', selectedTownId).eq('is_active', true).limit(20),
          supabase.from('community_posts').select('*').eq('town_id', selectedTownId).eq('is_active', true).order('created_at', { ascending: false }).limit(20),
          supabase.from('celebrations_of_life').select('*').eq('town_id', selectedTownId).eq('is_approved', true).order('created_at', { ascending: false }).limit(10),
          // Global content (same for all towns — no town_id filter)
          supabase.from('market_recap').select('*').order('recap_date', { ascending: false }).limit(1),
          supabase.from('top_stories').select('*').order('priority', { ascending: true }).limit(5),
          supabase.from('affiliates').select('*').eq('is_active', true).order('display_order', { ascending: true }),
          // Town-specific organizations
          supabase.from('nonprofits').select('*').eq('town_id', selectedTownId).eq('is_active', true).order('display_order', { ascending: true }),
          supabase.from('clubs').select('*').eq('town_id', selectedTownId).eq('is_active', true).order('display_order', { ascending: true }),
          // Comics are global
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTownId])

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
      className={`bg-white rounded-[14px] p-5 mb-3 border-[1.5px] border-[#e8e6e1] card-hover ${className}`}
      style={{ boxShadow: '0 1px 3px rgba(26,26,46,0.06), 0 1px 2px rgba(26,26,46,0.04)' }}
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

  // Use sample data if database is empty (events always use real data — empty state shows "no events")
  const displayEvents = events
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
    <div className="min-h-screen" style={{ background: '#fafaf8' }}>
      {/* Header */}
      <header className="gnp-gradient text-white sticky top-0 z-40 safe-top" style={{ boxShadow: '0 4px 20px rgba(26,26,46,0.25)' }}>
        <div className="px-4 pt-4 pb-3">
          {/* Top Row: Town Badge + Go New Paper Logo */}
          <div className="flex items-center justify-between mb-3">
            {/* Left: Town Badge — dynamic per selected town */}
            <div className="flex items-center gap-3">
              <svg width="44" height="44" viewBox="0 0 100 100" className="shield-glow">
                <defs>
                  <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={theme.shieldFill} />
                    <stop offset="100%" stopColor={selectedTownId === 2 ? '#111' : '#A01020'} />
                  </linearGradient>
                </defs>
                <path d="M50 5 L90 15 L90 65 Q90 85 50 95 Q10 85 10 65 L10 15 Z" fill="url(#shieldGrad)" stroke="rgba(255,255,255,0.25)" strokeWidth="3"/>
                <path d="M50 14 L82 22 L82 63 Q82 78 50 86 Q18 78 18 63 L18 22 Z" fill="none" stroke={selectedTownId === 2 ? '#D4A843' : 'rgba(255,255,255,0.35)'} strokeWidth="1.5"/>
                <text x="50" y="68" fontSize="46" fontWeight="900" fill={selectedTownId === 2 ? '#D4A843' : '#fff'} textAnchor="middle" fontFamily="Archivo Black">{theme.letter}</text>
              </svg>
              <div>
                <h2 className="text-lg font-black tracking-tight font-display leading-tight">{theme.name.toUpperCase()}</h2>
                <p className="text-[10px] font-semibold text-white/50 tracking-widest uppercase">Edition</p>
              </div>
            </div>

            {/* Right: Go New Paper Logo + Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all"
              >
                <Bell className="w-4.5 h-4.5" />
              </button>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all"
              >
                <Menu className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>

          {/* Logo Bar */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <div className="bg-white text-green-600 px-2 py-0.5 rounded-md font-display text-xs font-black">GO</div>
              <span className="font-display text-base tracking-tight">NEW PAPER</span>
            </div>
            <p className="text-[9px] font-medium text-white/40 tracking-wider font-editorial italic">Everything Local, All In Your Pocket</p>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Search events, jobs, housing..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm font-medium search-input-refined text-white focus:text-gray-900 focus:outline-none"
            />
          </div>
        </div>

        {/* Tabs */}
        <nav className="flex overflow-x-auto border-t border-white/10 bg-black/15 hide-scrollbar tabs-scroll">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 whitespace-nowrap font-bold text-[11px] tracking-wider transition-all ${
                activeTab === tab.id
                  ? `bg-white/95 ${theme.tabActiveText} rounded-t-lg`
                  : 'text-white/60 hover:text-white/90 hover:bg-white/5'
              }`}
              style={activeTab === tab.id ? { boxShadow: '0 -2px 10px rgba(0,0,0,0.08)' } : undefined}
            >
              <tab.icon className="w-4 h-4" strokeWidth={activeTab === tab.id ? 2.5 : 1.8} />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </header>

      {/* Main Content */}
      <main className="px-4 pt-4 pb-24">
        {loading ? (
          <div className="space-y-3 animate-fade-in-up">
            {/* Skeleton digest card */}
            <div className="skeleton-card">
              <div className="skeleton h-5 w-48 mb-3"></div>
              <div className="skeleton h-4 w-full mb-2"></div>
              <div className="skeleton h-4 w-3/4"></div>
            </div>
            {/* Skeleton content cards */}
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton-card">
                <div className="flex items-start gap-3 mb-3">
                  <div className="skeleton w-10 h-10 rounded-lg flex-shrink-0"></div>
                  <div className="flex-1">
                    <div className="skeleton h-5 w-3/4 mb-2"></div>
                    <div className="skeleton h-3 w-1/2"></div>
                  </div>
                </div>
                <div className="skeleton h-4 w-full mb-2"></div>
                <div className="skeleton h-10 w-full rounded-lg mt-3"></div>
              </div>
            ))}
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

              // Filter to only today's events (Central Time — avoids UTC date shift before 6 AM)
              const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
              const todaysEvents = displayEvents.filter(event => {
                const eventDate = event.date.split('T')[0]
                return eventDate === today
              })

              return (
                <div className={`${theme.accentClass} text-white rounded-[16px] p-5 mb-5 digest-card animate-fade-in-up`} style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.2)' }}>
                  <div className="relative z-10">
                    <p className="text-[10px] font-bold text-white/50 tracking-[0.2em] uppercase mb-1">Today&apos;s Digest</p>
                    <h3 className="text-xl font-black tracking-tight font-display mb-3">{greeting}, {selectedTownName}!</h3>
                    <p className="text-sm font-medium mb-3 text-white/75 leading-relaxed">
                      {todaysEvents.length > 0
                        ? `Here's what's happening today:`
                        : `No events scheduled for today. Check out upcoming events below!`}
                    </p>
                    {todaysEvents.length > 0 && (
                      <ul className="text-sm font-semibold space-y-2 text-white/90">
                        {todaysEvents.map((event, idx) => (
                          <li key={idx} className="flex items-center gap-2.5">
                            <span className="w-1.5 h-1.5 bg-white rounded-full flex-shrink-0"></span>
                            <span>{event.category} {event.title}</span>
                            <span className="text-white/50 text-xs ml-auto">{event.time || formatEventTime(event.date)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* Events Tab */}
            {activeTab === 'events' && (
              <>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="text-xl font-black tracking-tight font-display">Upcoming Events</h2>
                    <p className="text-xs text-[#8a8778] font-medium mt-0.5">{displayEvents.length} events in {selectedTownName}</p>
                  </div>
                  <button className={`${theme.accentTextClass} text-xs font-bold flex items-center gap-1 tracking-wide bg-white px-3 py-1.5 rounded-lg border border-[#e8e6e1]`} style={{ boxShadow: '0 1px 3px rgba(26,26,46,0.06)' }}>
                    <Plus className="w-3.5 h-3.5" />Post
                  </button>
                </div>
                {displayEvents.map((event, idx) => (
                  <Card key={event.id} className={`animate-fade-in-up stagger-${Math.min(idx + 1, 8)}`}>
                    <div className="flex items-start gap-3 mb-3">
                      <span className="text-2xl flex-shrink-0 mt-0.5">{event.category}</span>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[15px] font-bold tracking-tight leading-snug">{event.title}</h3>
                        <p className="text-[11px] text-[#8a8778] font-semibold uppercase tracking-wider mt-0.5">{event.source}</p>
                      </div>
                      {event.price && (
                        <span className={`price-tag text-sm ${theme.accentTextClass}`}>{event.price}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-[13px] text-gray-600 font-medium mb-3">
                      <div className="flex items-center gap-1.5">
                        <Calendar className={`w-3.5 h-3.5 ${theme.accentTextClass}`} />
                        <span className="font-semibold">{formatEventDate(event.date)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className={`w-3.5 h-3.5 ${theme.accentTextClass}`} />
                        <span>{event.time || formatEventTime(event.date)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[13px] text-gray-500 font-medium mb-4">
                      <MapPin className={`w-3.5 h-3.5 ${theme.accentTextClass}`} />
                      <span>{event.location || 'TBD'}</span>
                    </div>
                    <button
                      onClick={() => handleInterestToggle(event.id)}
                      className={`btn-interest w-full py-3 rounded-xl text-sm font-bold tracking-wide uppercase flex items-center justify-center gap-2 ${
                        userInterests.includes(event.id)
                          ? 'bg-emerald-500 text-white'
                          : `${theme.accentClass} text-white`
                      }`}
                      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
                    >
                      {userInterests.includes(event.id) ? (
                        <>
                          <Check className="w-4 h-4" />
                          Interested!
                        </>
                      ) : (
                        "I'm Interested"
                      )}
                    </button>
                  </Card>
                ))}
              </>
            )}

            {/* Jobs Tab */}
            {activeTab === 'jobs' && (
              <>
                <div className="section-banner bg-emerald-50/80 border-emerald-200 mb-4 animate-fade-in-up">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span className="text-lg">🤖</span>
                    <p className="text-sm font-bold text-gray-800">AI Auto-Finding Jobs Within 50 Miles</p>
                  </div>
                  <p className="text-xs font-medium text-[#8a8778]">
                    {displayJobs.filter(j => j.auto_scraped).length} auto-discovered &bull; {displayJobs.filter(j => !j.auto_scraped).length} posted locally
                  </p>
                </div>
                {displayJobs.map((job, idx) => (
                  <Card key={job.id} className={`animate-fade-in-up stagger-${Math.min(idx + 1, 8)}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-[15px] font-bold tracking-tight">{job.title}</h3>
                          {job.auto_scraped && <span className="text-base">🤖</span>}
                        </div>
                        <p className="text-[13px] text-gray-500 font-medium">{job.company}</p>
                      </div>
                      <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200 flex-shrink-0">{job.type}</span>
                    </div>
                    <p className={`text-sm font-bold mb-3 ${theme.accentTextClass}`}>{job.pay}</p>
                    <button
                      onClick={() => job.apply_url && window.open(job.apply_url, '_blank')}
                      className={`btn-interest w-full ${theme.accentClass} text-white py-3 rounded-xl text-sm font-bold tracking-wide uppercase`}
                      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
                    >
                      Apply Now
                    </button>
                  </Card>
                ))}
              </>
            )}

            {/* Housing Tab */}
            {activeTab === 'housing' && (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-black tracking-tight font-display">Housing</h2>
                  <a
                    href="https://buy.stripe.com/14A7sM1uefZvdxx1ft5ZC09"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${theme.accentTextClass} text-xs font-bold flex items-center gap-1 tracking-wide bg-white px-3 py-1.5 rounded-lg border border-[#e8e6e1]`}
                    style={{ boxShadow: '0 1px 3px rgba(26,26,46,0.06)' }}
                  >
                    <Plus className="w-3.5 h-3.5" />Post
                  </a>
                </div>
                {/* Pricing Info Banner */}
                <div className="section-banner bg-emerald-50/80 border-emerald-200 mb-4 animate-fade-in-up">
                  <p className="text-sm font-bold text-gray-800 mb-2">Post your rental or property listing!</p>
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-[#8a8778] font-medium">Single post: <span className="price-tag text-emerald-700">$8</span> (30 days)</p>
                      <a
                        href="https://buy.stripe.com/14A7sM1uefZvdxx1ft5ZC09"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-cta bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold tracking-wide"
                        style={{ boxShadow: '0 2px 8px rgba(16,185,129,0.3)' }}
                      >
                        Post Now
                      </a>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-[#8a8778] font-medium">5-Pack: <span className="price-tag text-emerald-700">$30</span> (save $10!)</p>
                      <a
                        href="https://buy.stripe.com/eVq8wQ3Cm8x38ddgan5ZC08"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-cta bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold tracking-wide"
                        style={{ boxShadow: '0 2px 8px rgba(16,185,129,0.3)' }}
                      >
                        5-Pack
                      </a>
                    </div>
                  </div>
                </div>
                {displayHousing.map((h, idx) => (
                  <Card key={h.id} className={`animate-fade-in-up stagger-${Math.min(idx + 1, 8)}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-[15px] font-bold tracking-tight">{h.title}</h3>
                        <p className="text-[13px] text-gray-500 font-medium">{h.location}</p>
                      </div>
                      <span className={`price-tag text-lg ${theme.accentTextClass}`}>{h.price}</span>
                    </div>
                    <p className="text-[13px] text-gray-600 font-medium mb-3">{h.details}</p>
                    {h.expires_at && (
                      <p className="text-xs text-[#8a8778] font-medium mb-2">
                        Expires {new Date(h.expires_at).toLocaleDateString()}
                      </p>
                    )}
                    <button className={`btn-interest w-full ${theme.accentClass} text-white py-3 rounded-xl text-sm font-bold tracking-wide uppercase`} style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
                      Contact
                    </button>
                  </Card>
                ))}
              </>
            )}

            {/* Businesses Tab */}
            {activeTab === 'businesses' && (
              <>
                {/* SPOTLIGHT BUSINESSES SECTION */}
                <div className="section-banner bg-blue-50/70 border-blue-200 mb-4 animate-fade-in-up">
                  <p className="text-sm font-bold text-gray-800"><span className="font-black text-blue-600">Spotlight Businesses</span></p>
                  <p className="text-xs font-medium text-[#8a8778] mt-1">Featured local businesses &bull; Support local!</p>
                </div>

                {displayBusinesses.filter(b => b.tier === 'spotlight' || b.featured).map((b, idx) => (
                  <Card key={b.id} className={`cursor-pointer animate-fade-in-up stagger-${Math.min(idx + 1, 8)}`}>
                    <div className="flex items-start gap-4">
                      {b.logo_url ? (
                        <img src={b.logo_url} alt={b.name} className="w-14 h-14 rounded-xl object-cover" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />
                      ) : (
                        <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl bg-blue-50">{b.logo_emoji}</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-[15px] font-bold tracking-tight">{b.name}</h3>
                          <span className="badge bg-amber-50 text-amber-700 border border-amber-200">Spotlight</span>
                        </div>
                        <p className="text-[13px] text-gray-500 font-medium mb-2 font-editorial italic">{b.tagline}</p>
                        <div className="flex items-center gap-3 text-[11px] text-[#8a8778] font-medium mb-3">
                          <span className="bg-gray-50 px-2 py-0.5 rounded border border-[#e8e6e1]">{b.category}</span>
                          <span>{b.clicks} clicks</span>
                        </div>
                        <button
                          onClick={() => trackBusinessClick(b)}
                          className={`btn-interest btn-cta w-full ${theme.accentClass} text-white py-2.5 rounded-xl text-sm font-bold tracking-wide uppercase`}
                          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
                        >
                          Visit Website &rarr;
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}

                {/* DIGITAL BUSINESS CARDS SECTION */}
                <div className="section-divider"></div>
                <div className="section-banner bg-purple-50/70 border-purple-200 mb-4">
                  <p className="text-sm font-bold text-gray-800"><span className="font-black text-purple-600">Local Professionals</span></p>
                  <p className="text-xs font-medium text-[#8a8778] mt-1">Financial advisors, agents, services & more</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {displayBusinesses.filter(b => b.tier === 'card').map((b, idx) => (
                    <div key={b.id} className={`bg-white rounded-[14px] p-4 border-[1.5px] border-purple-100 card-hover animate-fade-in-up stagger-${Math.min(idx + 1, 8)}`} style={{ boxShadow: '0 1px 3px rgba(26,26,46,0.06)' }}>
                      <div className="flex items-center gap-3 mb-2">
                        {b.logo_url ? (
                          <img src={b.logo_url} alt={b.name} className="w-11 h-11 rounded-lg object-cover" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }} />
                        ) : (
                          <div className="w-11 h-11 rounded-lg flex items-center justify-center text-2xl bg-purple-50">{b.logo_emoji}</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold tracking-tight truncate">{b.name}</h3>
                          <span className="badge bg-purple-50 text-purple-600 border border-purple-200">{b.category}</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 font-medium mb-3 font-editorial italic">&quot;{b.tagline}&quot;</p>
                      <a
                        href={`tel:${b.phone}`}
                        className="btn-interest w-full bg-purple-600 text-white py-2 rounded-lg text-xs font-bold tracking-wide uppercase flex items-center justify-center gap-2"
                        style={{ boxShadow: '0 2px 6px rgba(147,51,234,0.25)' }}
                      >
                        <span>📞</span> {b.phone}
                      </a>
                      {b.email && (
                        <a
                          href={`mailto:${b.email}`}
                          className="w-full mt-2 bg-gray-50 text-gray-600 py-2 rounded-lg text-xs font-semibold tracking-wide hover:bg-gray-100 transition-all flex items-center justify-center gap-2 border border-[#e8e6e1]"
                        >
                          <span>✉️</span> Email
                        </a>
                      )}
                    </div>
                  ))}
                </div>

                {/* PRICING INFO */}
                <div className="section-divider"></div>
                <div className="section-banner bg-emerald-50/80 border-emerald-200">
                  <p className="text-sm font-bold text-gray-800 mb-2">Want to be listed here?</p>
                  <div className="space-y-1.5 text-xs text-[#8a8778] font-medium mb-3">
                    <p><span className="font-bold text-blue-600">Spotlight</span> &mdash; $30/mo &mdash; Full card, website link, featured</p>
                    <p><span className="font-bold text-purple-600">Digital Card</span> &mdash; $15/mo &mdash; Compact card, click-to-call</p>
                  </div>
                  <a
                    href="mailto:thenewpaperchariton@gmail.com?subject=Business%20Listing%20Inquiry&body=Hi!%20I'm%20interested%20in%20getting%20my%20business%20listed%20on%20Go%20New%20Paper.%0A%0ABusiness%20Name:%0APhone:%0APreferred%20Plan%20(Spotlight%20$30%20or%20Digital%20Card%20$15):"
                    className="btn-cta w-full bg-emerald-600 text-white py-3 rounded-xl text-sm font-bold tracking-wide flex items-center justify-center gap-2"
                    style={{ boxShadow: '0 2px 8px rgba(16,185,129,0.3)' }}
                  >
                    <span>✉️</span> Get Started
                  </a>
                </div>
              </>
            )}

            {/* Daily Laughs Tab */}
            {activeTab === 'comics' && (
              <>
                <div className="section-banner bg-amber-50/70 border-amber-200 mb-4 animate-fade-in-up">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Laugh className="w-5 h-5 text-amber-600" />
                    <p className="text-sm font-black text-gray-800">Daily Laughs</p>
                  </div>
                  <p className="text-xs font-medium text-[#8a8778]">
                    Your daily dose of humor. A new joke every day to brighten your morning!
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {displayComics.map((comic, index) => (
                    <div key={comic.id} className={`bg-white rounded-[14px] overflow-hidden card-hover animate-fade-in-up stagger-${Math.min(index + 1, 8)} ${index === 0 ? 'border-[1.5px] border-amber-300' : 'border-[1.5px] border-[#e8e6e1]'}`} style={{ boxShadow: '0 1px 3px rgba(26,26,46,0.06)' }}>
                      {comic.image_url && comic.image_url.trim() !== '' && comic.image_url.trim().startsWith('http') ? (
                        <img src={comic.image_url} alt={comic.alt_text || comic.title} className="w-full max-h-80 object-contain bg-[#f5f4f0]" />
                      ) : (
                        <div className="bg-gradient-to-br from-amber-50/80 to-white p-6">
                          <p className="text-lg font-bold text-gray-800 text-center">{comic.title}</p>
                          {comic.alt_text && (
                            <p className="text-base font-medium text-amber-700 text-center mt-3 font-editorial italic">{comic.alt_text}</p>
                          )}
                        </div>
                      )}
                      <div className="px-4 py-3 border-t border-[#e8e6e1]">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {index === 0 && <span className="badge bg-amber-50 text-amber-700 border border-amber-200">Today</span>}
                            <span className="text-xs text-[#8a8778] font-medium">{comic.publish_date}</span>
                          </div>
                          {comic.source && <span className="text-xs text-[#8a8778] font-medium">{comic.source}</span>}
                        </div>
                        {comic.artist_name && (
                          <div className="mt-1">
                            <span className="text-xs text-[#8a8778] font-medium">
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
                  <div className="empty-state animate-fade-in-up">
                    <span className="empty-state-icon">😄</span>
                    <p className="empty-state-title">No jokes yet!</p>
                    <p className="empty-state-text">Check back tomorrow for your daily laugh.</p>
                  </div>
                )}
              </>
            )}

            {/* Community Tab */}
            {activeTab === 'community' && (
              <>
                <div className="section-banner bg-emerald-50/70 border-emerald-200 mb-4 animate-fade-in-up">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Bell className="w-5 h-5 text-emerald-600" />
                    <p className="text-sm font-black text-gray-800">Community Board</p>
                  </div>
                  <p className="text-xs font-medium text-[#8a8778]">
                    Lost pets, garage sales, volunteer needs & local announcements from your neighbors.
                  </p>
                </div>

                <div className="flex justify-end mb-3">
                  <button
                    onClick={() => { resetCommunityForm(); setShowCommunityModal(true) }}
                    className="btn-cta bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 tracking-wide px-4 py-2 rounded-lg"
                    style={{ boxShadow: '0 2px 8px rgba(16,185,129,0.25)' }}
                  >
                    <Plus className="w-3.5 h-3.5" />Post
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {displayCommunity.map((post, idx) => (
                    <div key={post.id} className={`bg-white rounded-[14px] p-4 border-[1.5px] border-emerald-100 card-hover relative animate-fade-in-up stagger-${Math.min(idx + 1, 8)}`} style={{ boxShadow: '0 1px 3px rgba(26,26,46,0.06)' }}>
                      {isAdmin && (
                        <button onClick={() => handleDeleteCommunityPost(post.id, post.title)} className="absolute top-2 right-2 p-1.5 bg-red-100 hover:bg-red-200 rounded-lg transition-all" title="Remove post">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      )}
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{post.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-[15px] tracking-tight mb-1">{post.title}</h3>
                          <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200">
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
                  <div className="empty-state animate-fade-in-up">
                    <span className="empty-state-icon">📋</span>
                    <p className="empty-state-title">No posts yet!</p>
                    <p className="empty-state-text">Be the first to post something to the community board.</p>
                  </div>
                )}

                {/* CTA for community posts */}
                <div className="section-banner bg-emerald-50/80 border-emerald-200 mt-6">
                  <p className="text-sm font-bold text-gray-800 mb-1.5">Got something to share?</p>
                  <p className="text-xs text-[#8a8778] font-medium mb-3">Post lost/found pets, garage sales, volunteer needs, or announcements for free!</p>
                  <button
                    onClick={() => { resetCommunityForm(); setShowCommunityModal(true) }}
                    className="btn-cta w-full bg-emerald-600 text-white py-3 rounded-xl text-sm font-bold tracking-wide flex items-center justify-center gap-2"
                    style={{ boxShadow: '0 2px 8px rgba(16,185,129,0.25)' }}
                  >
                    <span>📝</span> Post for Free
                  </button>
                </div>
              </>
            )}

            {/* Non-Profits Tab */}
            {activeTab === 'nonprofits' && (
              <>
                <div className="section-banner bg-rose-50/70 border-rose-200 mb-4 animate-fade-in-up">
                  <div className="flex items-center gap-2 mb-1.5">
                    <HeartHandshake className="w-5 h-5 text-rose-600" />
                    <p className="text-sm font-black text-gray-800">Local Non-Profits</p>
                  </div>
                  <p className="text-xs font-medium text-[#8a8778]">
                    Support the organizations that make {selectedTownName} great. Donate directly!
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {displayNonprofits.map((np, idx) => (
                    <div key={np.id} className={`bg-white rounded-[14px] p-4 border-[1.5px] border-rose-100 card-hover relative animate-fade-in-up stagger-${Math.min(idx + 1, 8)}`} style={{ boxShadow: '0 1px 3px rgba(26,26,46,0.06)' }}>
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
                          <h3 className="text-[15px] font-bold tracking-tight">{np.name}</h3>
                          <span className="badge bg-rose-50 text-rose-600 border border-rose-200">{np.category}</span>
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
                        className={`btn-interest btn-cta w-full ${theme.accentClass} text-white py-3 rounded-xl text-sm font-bold tracking-wide uppercase flex items-center justify-center gap-2`}
                        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
                      >
                        <span>💝</span> Donate Now
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
                <div className="section-banner bg-rose-50/80 border-rose-200 mt-6">
                  <p className="text-sm font-bold text-gray-800 mb-1.5">Run a local non-profit?</p>
                  <p className="text-xs text-[#8a8778] font-medium mb-3">Get your organization listed here for free so residents can find and support you!</p>
                  <button
                    onClick={() => { resetListingForm(); setListingType('nonprofit'); setShowListingModal(true) }}
                    className={`btn-cta w-full ${theme.accentClass} text-white py-3 rounded-xl text-sm font-bold tracking-wide flex items-center justify-center gap-2`}
                    style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
                  >
                    <span>📝</span> Get Listed Free
                  </button>
                </div>
              </>
            )}

            {/* Clubs/Groups Tab */}
            {activeTab === 'clubs' && (
              <>
                <div className="section-banner bg-cyan-50/70 border-cyan-200 mb-4 animate-fade-in-up">
                  <div className="flex items-center gap-2 mb-1.5">
                    <UsersRound className="w-5 h-5 text-cyan-600" />
                    <p className="text-sm font-black text-gray-800">Clubs & Groups</p>
                  </div>
                  <p className="text-xs font-medium text-[#8a8778]">
                    Find your people! Local clubs, groups, and organizations in {selectedTownName}.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {displayClubs.map((club, idx) => (
                    <div key={club.id} className={`bg-white rounded-[14px] p-4 border-[1.5px] border-cyan-100 card-hover relative animate-fade-in-up stagger-${Math.min(idx + 1, 8)}`} style={{ boxShadow: '0 1px 3px rgba(26,26,46,0.06)' }}>
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
                          <h3 className="text-[15px] font-bold tracking-tight">{club.name}</h3>
                          <span className="badge bg-cyan-50 text-cyan-700 border border-cyan-200">{club.category}</span>
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
                          className="btn-interest flex-1 bg-cyan-600 text-white py-2 rounded-lg text-xs font-bold tracking-wide uppercase flex items-center justify-center gap-2"
                          style={{ boxShadow: '0 2px 6px rgba(8,145,178,0.25)' }}
                        >
                          <span>✉️</span> Contact
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
                <div className="section-banner bg-cyan-50/80 border-cyan-200 mt-6">
                  <p className="text-sm font-bold text-gray-800 mb-1.5">Have a local club or group?</p>
                  <p className="text-xs text-[#8a8778] font-medium mb-3">Get your club listed here for free so residents can find and join!</p>
                  <button
                    onClick={() => { resetListingForm(); setListingType('club'); setShowListingModal(true) }}
                    className={`btn-cta w-full ${theme.accentClass} text-white py-3 rounded-xl text-sm font-bold tracking-wide flex items-center justify-center gap-2`}
                    style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
                  >
                    <span>📝</span> Get Listed Free
                  </button>
                </div>
              </>
            )}

            {/* Celebrations of Life Tab */}
            {activeTab === 'celebrations' && (
              <>
                <div className="section-banner bg-purple-50/70 border-purple-200 mb-4 animate-fade-in-up">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Flower2 className="w-5 h-5 text-purple-600" />
                    <p className="text-sm font-black text-gray-800">Celebrations of Life</p>
                  </div>
                  <p className="text-xs font-medium text-[#8a8778]">
                    Honoring those we&apos;ve lost. Remembering the lives that made our community special.
                  </p>
                </div>

                {celebrations.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3">
                    {celebrations.map((c, idx) => (
                      <div key={c.id} className={`bg-white rounded-[14px] p-4 border-[1.5px] border-purple-100 card-hover animate-fade-in-up stagger-${Math.min(idx + 1, 8)}`} style={{ boxShadow: '0 1px 3px rgba(26,26,46,0.06)' }}>
                        <div className="flex items-start gap-4">
                          {c.photo_url ? (
                            <img src={c.photo_url.startsWith('http') ? c.photo_url : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public${c.photo_url}`} alt={c.full_name} className="w-20 h-20 rounded-xl object-cover shadow-md" />
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
                  <div className="empty-state animate-fade-in-up">
                    <span className="empty-state-icon">🕊️</span>
                    <p className="empty-state-title">No current listings</p>
                    <p className="empty-state-text">Celebrations of life will appear here when available.</p>
                  </div>
                )}
              </>
            )}

            {/* Affiliates Tab */}
            {activeTab === 'affiliates' && (
              <>
                <div className="section-banner bg-emerald-50/70 border-emerald-200 mb-4 animate-fade-in-up">
                  <div className="flex items-center gap-2 mb-1.5">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                    <p className="text-sm font-black text-gray-800">Market & Partners</p>
                  </div>
                  <p className="text-xs font-medium text-[#8a8778]">
                    Stock picks, trading tools & affiliate partnerships that help keep this app free!
                  </p>
                </div>

                {/* Market Snapshot */}
                <div className="mb-4">
                  <h3 className="text-lg font-black tracking-tight font-display mb-3 flex items-center gap-2">
                    <span>📈</span> Market Snapshot
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
                  <h3 className="text-lg font-black tracking-tight font-display mb-3 flex items-center gap-2">
                    <span>🤝</span> Trading Partners
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
                          <button className={`btn-interest btn-cta w-full ${theme.accentClass} text-white py-2.5 rounded-xl text-sm font-bold tracking-wide uppercase`} style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
                            Check It Out &rarr;
                          </button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Other Affiliate Partners */}
                <div className="mb-4">
                  <h3 className="text-lg font-black tracking-tight font-display mb-3 flex items-center gap-2">
                    <span>⭐</span> Partner Deals
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
                          <button className="btn-interest btn-cta w-full bg-purple-600 text-white py-2.5 rounded-xl text-sm font-bold tracking-wide uppercase" style={{ boxShadow: '0 2px 8px rgba(147,51,234,0.25)' }}>
                            Get Deal &rarr;
                          </button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                <div className="bg-white border-[1.5px] border-[#e8e6e1] p-4 rounded-[14px]">
                  <p className="text-xs text-[#8a8778] font-medium text-center font-editorial italic leading-relaxed">
                    These affiliate partnerships help keep Go New Paper free for everyone! When you sign up through our links, we may earn a small commission at no extra cost to you.
                  </p>
                </div>
              </>
            )}
          </>
        )}
        {/* Footer Links */}
        <div className="text-center py-8 pb-24 text-xs text-[#8a8778] space-x-3">
          <a href="/privacy" className="underline hover:text-gray-600 transition-colors">Privacy Policy</a>
          <span className="text-[#e8e6e1]">|</span>
          <a href="/terms" className="underline hover:text-gray-600 transition-colors">Terms of Service</a>
          <span className="text-[#e8e6e1]">|</span>
          <span>&copy; 2026 Go New Paper</span>
        </div>
      </main>

      {/* Bottom Navigation — Frosted Glass */}
      <nav className="fixed bottom-0 left-0 right-0 bottom-nav-glass z-40 safe-bottom">
        <div
          className="flex p-1.5 overflow-x-scroll hide-scrollbar"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-0.5 py-2 px-1 transition-all rounded-xl ${
                activeTab === tab.id ? `${theme.accentTextClass}` : 'text-gray-400'
              }`}
              style={{ minWidth: '68px', flexShrink: 0 }}
            >
              <tab.icon className="w-5 h-5" strokeWidth={activeTab === tab.id ? 2.5 : 1.5} />
              <span className={`text-[9px] font-bold tracking-wider uppercase ${activeTab === tab.id ? 'opacity-100' : 'opacity-60'}`}>{tab.label}</span>
              {activeTab === tab.id && (
                <div className="nav-active-dot" style={{ backgroundColor: theme.primaryColor }}></div>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Notification Panel */}
      {showNotifications && (
        <div className="fixed inset-0 modal-overlay z-50 flex items-end" onClick={() => setShowNotifications(false)}>
          <div className="bg-white w-full rounded-t-[24px] p-6 max-h-[75vh] overflow-y-auto" style={{ boxShadow: '0 -8px 40px rgba(26,26,46,0.15)' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-black tracking-tight font-display">Notifications</h2>
              <button onClick={() => setShowNotifications(false)}><X className="w-6 h-6" /></button>
            </div>
            <div className="flex flex-col items-center justify-center py-10 text-center text-gray-400">
              <Bell className="w-10 h-10 mb-3 opacity-20" />
              <p className="font-bold text-sm">You&apos;re all caught up!</p>
              <p className="text-xs mt-1">Push notifications keep you updated on events, jobs, and community news.</p>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 modal-overlay z-50 flex items-center justify-center p-4" onClick={() => setShowAuthModal(false)}>
          <div className="bg-white w-full max-w-md rounded-[20px] p-6" style={{ boxShadow: '0 16px 50px rgba(26,26,46,0.2)' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black tracking-tight font-display">
                {authMode === 'login' ? 'Welcome Back!' : 'Join Go New Paper'}
              </h2>
              <button onClick={() => setShowAuthModal(false)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
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
                  className={`w-full ${theme.accentClass} text-white py-3 rounded-lg font-black tracking-wide shadow-lg hover:shadow-xl transition-all uppercase disabled:opacity-50`}
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
                  className={`${theme.accentTextClass} font-black`}
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
        <div className="fixed inset-0 modal-overlay z-50 flex items-center justify-center p-4" onClick={() => { setShowListingModal(false); resetListingForm() }}>
          <div className="bg-white w-full max-w-md rounded-[20px] p-6 max-h-[90vh] overflow-y-auto" style={{ boxShadow: '0 16px 50px rgba(26,26,46,0.2)' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black tracking-tight font-display">
                {listingSuccess ? "You're Listed!" : 'Get Listed Free'}
              </h2>
              <button onClick={() => { setShowListingModal(false); resetListingForm() }} className="p-1 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
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
                  className={`w-full ${theme.accentClass} text-white py-3 rounded-lg font-black tracking-wide shadow-lg`}
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

                  <button type="submit" disabled={listingLoading} className={`w-full ${theme.accentClass} text-white py-3 rounded-lg font-black tracking-wide shadow-lg hover:shadow-xl transition-all uppercase disabled:opacity-50`}>
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
        <div className="fixed inset-0 modal-overlay z-50 flex items-center justify-center p-4" onClick={() => { setShowCommunityModal(false); resetCommunityForm() }}>
          <div className="bg-white w-full max-w-md rounded-[20px] p-6 max-h-[90vh] overflow-y-auto" style={{ boxShadow: '0 16px 50px rgba(26,26,46,0.2)' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black tracking-tight font-display">
                {communitySuccess ? 'Posted!' : 'Post to Community'}
              </h2>
              <button onClick={() => { setShowCommunityModal(false); resetCommunityForm() }} className="p-1 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            {communitySuccess ? (
              <div className="text-center py-6">
                <div className="text-6xl mb-4">🎉</div>
                <p className="text-lg font-black mb-2">Your post is live!</p>
                <p className="text-sm text-gray-600 font-semibold mb-6">
                  Your community post is now visible on the Community tab for all of {selectedTownName} to see!
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
        <div className="fixed inset-0 modal-overlay z-50" onClick={() => setShowMenu(false)}>
          <div className="bg-[#fafaf8] w-80 h-full ml-auto p-6 overflow-y-auto" style={{ boxShadow: '-8px 0 40px rgba(26,26,46,0.15)' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-black tracking-tight font-display">Menu</h2>
              <button onClick={() => setShowMenu(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            {/* User Account Section */}
            {user ? (
              <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white p-4 rounded-[14px] mb-4" style={{ boxShadow: '0 4px 16px rgba(16,185,129,0.25)' }}>
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
                    onClick={() => {
                      try {
                        // Use OneSignal SDK to request permission AND create push subscription
                        // This is the correct approach - Notification.requestPermission() alone
                        // only grants browser permission but does NOT create a OneSignal subscription
                        window.OneSignalDeferred = window.OneSignalDeferred || []
                        window.OneSignalDeferred.push((OneSignalSDK: typeof OneSignal) => {
                          OneSignalSDK.Notifications.requestPermission().then(() => {
                            const playerId = OneSignalSDK.User.PushSubscription.id
                            const permission = OneSignalSDK.Notifications.permission
                            console.log('OneSignal permission after request:', permission, 'Player ID:', playerId)
                            if (permission) {
                              setNotificationsEnabled(true)
                              showToast('Notifications enabled!')
                              // Save player ID to Supabase
                              if (user) {
                                saveOneSignalPlayerId(user.id)
                              }
                            } else {
                              showToast('Notifications blocked. Check browser settings.')
                            }
                          }).catch((err: any) => {
                            console.log('OneSignal permission request error:', err)
                            showToast('Could not enable notifications')
                          })
                        })
                      } catch (err) {
                        console.log('Permission request error:', err)
                        showToast('Could not request notification permission')
                      }
                    }}
                    className="w-full mt-2 bg-yellow-500 hover:bg-yellow-600 py-2 rounded-lg text-sm font-black flex items-center justify-center gap-2 transition-all text-black active:scale-95"
                  >
                    <Bell className="w-4 h-4" />
                    Enable Notifications
                  </button>
                )}
                {/* Add to Phone Apps Button */}
                {!isAppInstalled && (
                  <>
                    <button
                      onClick={() => {
                        if (deferredPrompt) {
                          deferredPrompt.prompt()
                          deferredPrompt.userChoice.then((result: any) => {
                            if (result.outcome === 'accepted') {
                              setIsAppInstalled(true)
                              showToast('App installed! Check your home screen.')
                            }
                            setDeferredPrompt(null)
                          })
                        } else {
                          setShowInstallHelp(true)
                        }
                      }}
                      className="w-full mt-2 bg-white/20 hover:bg-white/30 py-2 rounded-lg text-sm font-black flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      <Smartphone className="w-4 h-4" />
                      Add to your Phone Apps
                    </button>
                    {showInstallHelp && (
                      <div className="mt-2 bg-white/10 rounded-lg p-3 text-xs font-semibold space-y-2">
                        <p className="font-black text-sm">📲 How to install:</p>
                        {/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator as any).standalone !== undefined ? (
                          <div className="space-y-1">
                            <p>1. Tap the <strong>Share</strong> button <span className="text-lg">⬆️</span> at the bottom of Safari</p>
                            <p>2. Scroll down and tap <strong>&quot;Add to Home Screen&quot;</strong></p>
                            <p>3. Tap <strong>&quot;Add&quot;</strong> in the top right</p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <p>1. Tap the <strong>⋮ menu</strong> (3 dots) in your browser</p>
                            <p>2. Tap <strong>&quot;Add to Home Screen&quot;</strong> or <strong>&quot;Install App&quot;</strong></p>
                          </div>
                        )}
                        <button onClick={() => setShowInstallHelp(false)} className="text-xs underline opacity-70">Dismiss</button>
                      </div>
                    )}
                  </>
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
                  className={`w-full bg-white ${theme.accentTextClass} py-2 rounded-lg text-sm font-black flex items-center justify-center gap-2 hover:bg-gray-100 transition-all`}
                >
                  <LogIn className="w-4 h-4" />
                  LOG IN / SIGN UP
                </button>
                {/* Add to Phone Apps Button (not logged in) */}
                {!isAppInstalled && (
                  <>
                    <button
                      onClick={() => {
                        if (deferredPrompt) {
                          deferredPrompt.prompt()
                          deferredPrompt.userChoice.then((result: any) => {
                            if (result.outcome === 'accepted') {
                              setIsAppInstalled(true)
                              showToast('App installed! Check your home screen.')
                            }
                            setDeferredPrompt(null)
                          })
                        } else {
                          setShowInstallHelp(true)
                        }
                      }}
                      className="w-full mt-2 bg-white/20 hover:bg-white/30 py-2 rounded-lg text-sm font-black flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      <Smartphone className="w-4 h-4" />
                      Add to your Phone Apps
                    </button>
                    {showInstallHelp && (
                      <div className="mt-2 bg-white/10 rounded-lg p-3 text-xs font-semibold space-y-2">
                        <p className="font-black text-sm">📲 How to install:</p>
                        {/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator as any).standalone !== undefined ? (
                          <div className="space-y-1">
                            <p>1. Tap the <strong>Share</strong> button <span className="text-lg">⬆️</span> at the bottom of Safari</p>
                            <p>2. Scroll down and tap <strong>&quot;Add to Home Screen&quot;</strong></p>
                            <p>3. Tap <strong>&quot;Add&quot;</strong> in the top right</p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <p>1. Tap the <strong>⋮ menu</strong> (3 dots) in your browser</p>
                            <p>2. Tap <strong>&quot;Add to Home Screen&quot;</strong> or <strong>&quot;Install App&quot;</strong></p>
                          </div>
                        )}
                        <button onClick={() => setShowInstallHelp(false)} className="text-xs underline opacity-70">Dismiss</button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="bg-[#1a1a2e] text-white p-4 rounded-[14px] mb-5" style={{ boxShadow: '0 4px 16px rgba(26,26,46,0.2)' }}>
              <p className="text-[10px] font-bold mb-1.5 text-white/40 tracking-[0.15em] uppercase">Our Mission</p>
              <p className="text-sm font-medium font-editorial italic text-white/80 leading-relaxed">&quot;Bringing back the town newspaper&mdash;but faster &amp; in your pocket.&quot;</p>
            </div>

            {/* Town Selector */}
            <div className="space-y-2 mb-5">
              <h3 className="text-[10px] font-bold text-[#8a8778] tracking-[0.15em] mb-3 uppercase">Switch Town Edition</h3>

              {/* Chariton - Always available */}
              <button
                onClick={() => { handleTownChange(1, 'Chariton'); setShowMenu(false) }}
                className={`w-full p-3 rounded-[12px] text-left transition-all ${selectedTownId === 1 ? 'bg-red-50 border-[1.5px] border-red-300' : 'bg-white border-[1.5px] border-[#e8e6e1] hover:border-red-200'}`}
                style={selectedTownId === 1 ? { boxShadow: '0 2px 8px rgba(220,20,60,0.12)' } : undefined}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">🔴</span>
                  <div>
                    <p className="font-bold text-sm">Chariton</p>
                    <p className="text-[11px] text-[#8a8778] font-medium">{selectedTownId === 1 ? 'Current Edition' : 'Tap to switch'} &bull; Chargers</p>
                  </div>
                  {selectedTownId === 1 && <Check className="w-4 h-4 text-red-500 ml-auto" />}
                </div>
              </button>

              {/* Knoxville - Active */}
              <button
                onClick={() => { handleTownChange(2, 'Knoxville'); setShowMenu(false) }}
                className={`w-full p-3 rounded-[12px] text-left transition-all ${selectedTownId === 2 ? 'bg-amber-50 border-[1.5px] border-amber-300' : 'bg-white border-[1.5px] border-[#e8e6e1] hover:border-amber-200'}`}
                style={selectedTownId === 2 ? { boxShadow: '0 2px 8px rgba(212,168,67,0.15)' } : undefined}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">🟡</span>
                  <div>
                    <p className="font-bold text-sm">Knoxville</p>
                    <p className="text-[11px] text-[#8a8778] font-medium">{selectedTownId === 2 ? 'Current Edition' : 'Tap to switch'} &bull; Panthers</p>
                  </div>
                  {selectedTownId === 2 && <Check className="w-4 h-4 text-amber-500 ml-auto" />}
                </div>
              </button>

              {/* Coming Soon Towns */}
              <div className="bg-white border-[1.5px] border-[#e8e6e1] rounded-[12px] p-3">
                <p className="text-[10px] font-bold text-[#8a8778] mb-2 tracking-[0.15em] uppercase">Coming Soon</p>
                <div className="space-y-1.5 text-sm text-gray-500 font-medium">
                  <p>🔵 Indianola</p>
                  <p>🟣 Osceola</p>
                  <p>⚫ Centerville</p>
                </div>
              </div>
            </div>

            {/* Affiliates Quick Link */}
            <div className="section-divider"></div>
            <div className="mb-4">
              <button
                onClick={() => {
                  setActiveTab('affiliates')
                  setShowMenu(false)
                }}
                className="btn-cta w-full bg-emerald-600 text-white p-3 rounded-[12px] flex items-center justify-between transition-all"
                style={{ boxShadow: '0 2px 10px rgba(16,185,129,0.25)' }}
              >
                <div className="flex items-center gap-2.5">
                  <TrendingUp className="w-4 h-4" />
                  <div className="text-left">
                    <p className="text-sm font-bold">Market & Partners</p>
                    <p className="text-[11px] font-medium text-emerald-100">Stocks, Trading & Deals</p>
                  </div>
                </div>
                <span className="text-lg opacity-60">&rarr;</span>
              </button>
            </div>

            {/* Quick Links */}
            <div className="section-divider"></div>
            <div>
              <h3 className="text-[10px] font-bold text-[#8a8778] tracking-[0.15em] mb-3 uppercase">Quick Links</h3>
              <a href="https://www.charitonschools.org/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 p-3 hover:bg-white rounded-[10px] font-semibold text-sm text-gray-700 transition-all mb-1">🎓 School District</a>
              <a href="https://www.visioniitheatre.com/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 p-3 hover:bg-white rounded-[10px] font-semibold text-sm text-gray-700 transition-all">🎬 Vision II Theatre</a>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-[#1a1a2e] text-white px-6 py-3 rounded-2xl text-center text-sm font-semibold z-50 toast-enter" style={{ boxShadow: '0 8px 30px rgba(26,26,46,0.3)', maxWidth: 'calc(100% - 32px)' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
