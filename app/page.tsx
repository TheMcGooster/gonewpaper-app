'use client'
// Go New Paper v3.0.0 - 11 tabs: Events, Jobs, Housing, Business, Non-Profits, Clubs, In Memory, Comics, Community, Affiliates, Explore
// Features: Explore map, event sponsors, interest counts, community dashboard, location opt-in
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Calendar, Briefcase, Home, ShoppingBag, Users, Bell, Search, MapPin, Clock, Star, Menu, X, Plus, Heart, Newspaper, TrendingUp, LogIn, LogOut, User, Check, HeartHandshake, UsersRound, Flower2, Trash2, Laugh, ExternalLink, Smartphone, BarChart3, ChevronLeft, ChevronRight, Compass, Navigation, TreePine, Waves, Flag } from 'lucide-react'
import { supabase, Event, Job, Business, Housing, CommunityPost, CelebrationOfLife, Affiliate, NonProfit, Club, ExploreLocation } from '@/lib/supabase'
import { User as SupabaseUser } from '@supabase/supabase-js'
// OneSignal SDK is loaded via CDN in layout.tsx — no npm package needed

const isDev = process.env.NODE_ENV === 'development'

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

// Parse mixed time formats ("16:00:00", "9:30 AM", "4:00 PM") to minutes since midnight for sorting
const parseTimeToMinutes = (timeStr: string): number => {
  if (!timeStr) return 9999
  const trimmed = timeStr.trim()
  // Check for AM/PM format first
  const ampmMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1], 10)
    const m = parseInt(ampmMatch[2], 10)
    const period = ampmMatch[3].toUpperCase()
    if (period === 'AM' && h === 12) h = 0
    if (period === 'PM' && h !== 12) h += 12
    return h * 60 + m
  }
  // 24-hour format "16:00:00" or "16:00"
  const parts = trimmed.split(':')
  const h = parseInt(parts[0], 10)
  const m = parseInt(parts[1], 10)
  if (isNaN(h)) return 9999
  return h * 60 + (isNaN(m) ? 0 : m)
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

// Explore tab — category colors & labels (locations fetched from Supabase explore_locations table)
const EXPLORE_CATEGORY_COLORS: Record<string, string> = {
  state_park: '#16a34a',  // green-600
  lake: '#2563eb',        // blue-600
  trail: '#ea580c',       // orange-600
  recreation: '#9333ea',  // purple-600
  park: '#059669',        // emerald-600
}

const EXPLORE_CATEGORY_LABELS: Record<string, string> = {
  state_park: 'State Park',
  lake: 'Lake',
  trail: 'Trail',
  recreation: 'Recreation',
  park: 'City Park',
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
  const [eventInterestCounts, setEventInterestCounts] = useState<Record<number, number>>({})
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [wantNotifications, setWantNotifications] = useState(true)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isAppInstalled, setIsAppInstalled] = useState(false)
  const [showInstallHelp, setShowInstallHelp] = useState(false)
  const [showTownPickerModal, setShowTownPickerModal] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [selectedTownId, setSelectedTownId] = useState(1) // Default to Chariton
  const [selectedTownName, setSelectedTownName] = useState('Chariton')

  // Reports dashboard state
  const [showReportsModal, setShowReportsModal] = useState(false)
  const [reportData, setReportData] = useState<any>(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1)
  const [reportYear, setReportYear] = useState(new Date().getFullYear())
  const [reportAccessTownIds, setReportAccessTownIds] = useState<number[]>([])

  // Town theme configuration — colors, branding, etc.
  const townThemes: Record<number, { name: string; mascot: string; letter: string; primaryColor: string; darkColor: string; accentClass: string; accentTextClass: string; accentBg: string; tabActiveText: string; shieldFill: string; selectorBg: string; selectorBorder: string; selectorEmoji: string; colorLabel: string }> = {
    1: { name: 'Chariton', mascot: 'Chargers', letter: 'C', primaryColor: '#DC143C', darkColor: '#A01020', accentClass: 'charger-red', accentTextClass: 'charger-red-text', accentBg: 'bg-red-600', tabActiveText: 'text-red-600', shieldFill: '#DC143C', selectorBg: 'bg-red-50', selectorBorder: 'border-red-400', selectorEmoji: '🔴', colorLabel: 'Chargers Red/White' },
    2: { name: 'Knoxville', mascot: 'Panthers', letter: 'K', primaryColor: '#D4A843', darkColor: '#1a1a1a', accentClass: 'panther-gold', accentTextClass: 'panther-gold-text', accentBg: 'bg-yellow-600', tabActiveText: 'text-yellow-700', shieldFill: '#1a1a1a', selectorBg: 'bg-yellow-50', selectorBorder: 'border-yellow-500', selectorEmoji: '🟡', colorLabel: 'Panthers Black/Gold' },
    3: { name: 'Albia', mascot: 'Blue Demons', letter: 'A', primaryColor: '#1E3A8A', darkColor: '#DC2626', accentClass: 'demon-blue', accentTextClass: 'demon-blue-text', accentBg: 'bg-blue-800', tabActiveText: 'text-blue-800', shieldFill: '#1E3A8A', selectorBg: 'bg-blue-50', selectorBorder: 'border-blue-400', selectorEmoji: '🔵', colorLabel: 'Blue Demons Blue/Scarlet' },
    4: { name: 'Corydon', mascot: 'Falcons', letter: 'C', primaryColor: '#1a1a1a', darkColor: '#4B5563', accentClass: 'falcon-black', accentTextClass: 'falcon-black-text', accentBg: 'bg-gray-800', tabActiveText: 'text-gray-800', shieldFill: '#1a1a1a', selectorBg: 'bg-gray-100', selectorBorder: 'border-gray-400', selectorEmoji: '⚫', colorLabel: 'Falcons Black/Grey' },
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

  // Post Event form state
  const [showPostEventModal, setShowPostEventModal] = useState(false)
  const [postEventForm, setPostEventForm] = useState({ title: '', date: '', time: '', location: '', description: '', category: '📅', price: 'Free', sponsor_name: '', sponsor_logo_url: '' })
  const [postEventSuccess, setPostEventSuccess] = useState(false)
  const [postEventLoading, setPostEventLoading] = useState(false)

  // Edit Event form state (organizer-edit-with-notification flow)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [editEventForm, setEditEventForm] = useState({ date: '', time: '', location: '', cancelled: false })
  const [editEventMessage, setEditEventMessage] = useState('')
  const [editEventMessageDirty, setEditEventMessageDirty] = useState(false)
  const [editEventLoading, setEditEventLoading] = useState(false)
  const [editEventError, setEditEventError] = useState('')

  // Post Job form state
  const [showPostJobModal, setShowPostJobModal] = useState(false)
  const [postJobForm, setPostJobForm] = useState({ title: '', company: '', type: 'Full-Time', pay: '', description: '', apply_url: '', location: '' })
  const [postJobSuccess, setPostJobSuccess] = useState(false)
  const [postJobLoading, setPostJobLoading] = useState(false)
  const [postJobError, setPostJobError] = useState('')

  // Post Housing form state
  const [showPostHousingModal, setShowPostHousingModal] = useState(false)
  const [showSubscribePrompt, setShowSubscribePrompt] = useState(false)
  const [isSubscriber, setIsSubscriber] = useState(false)
  const [postHousingForm, setPostHousingForm] = useState({ title: '', price: '', listing_type: 'rent' as 'rent' | 'sale' | 'room', bedrooms: '', bathrooms: '', location: '', description: '', details: '', contact_name: '', contact_phone: '', contact_email: '', pets_allowed: false })
  const [postHousingSuccess, setPostHousingSuccess] = useState(false)
  const [postHousingLoading, setPostHousingLoading] = useState(false)
  const [postHousingError, setPostHousingError] = useState('')

  // Community Dashboard state
  const [showDashboard, setShowDashboard] = useState(false)
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [dashboardLoading, setDashboardLoading] = useState(false)

  // Explore tab state
  const [selectedExploreLocation, setSelectedExploreLocation] = useState<ExploreLocation | null>(null)
  const [exploreFilter, setExploreFilter] = useState<string>('all')
  const exploreMapRef = useRef<HTMLDivElement>(null)
  const leafletMapRef = useRef<any>(null)
  const leafletMarkersRef = useRef<any[]>([])

  // Submit a Spot (pin drop) state
  const [pinDropMode, setPinDropMode] = useState(false)
  const [droppedPin, setDroppedPin] = useState<{ lat: number; lng: number } | null>(null)
  const droppedPinMarkerRef = useRef<any>(null)
  const [editPinsMode, setEditPinsMode] = useState(false)
  const [showSubmitSpotModal, setShowSubmitSpotModal] = useState(false)
  const [submitSpotForm, setSubmitSpotForm] = useState({ name: '', category: 'park' as string, address: '', summary: '', emoji: '🌳' })
  const [submitSpotLoading, setSubmitSpotLoading] = useState(false)
  const [submitSpotSuccess, setSubmitSpotSuccess] = useState(false)
  const [submitSpotError, setSubmitSpotError] = useState('')
  const [pendingSpots, setPendingSpots] = useState<ExploreLocation[]>([])

  // Pending events (admin approval queue)
  const [pendingEvents, setPendingEvents] = useState<Event[]>([])

  // Business submission form
  const [showBusinessModal, setShowBusinessModal] = useState(false)
  const [businessForm, setBusinessForm] = useState({
    name: '', contactName: '', email: '', phone: '', website: '',
    category: '', tagline: '', description: '', address: '', hours: '',
    tier: '' as '' | 'card' | 'spotlight', townId: 1
  })
  const [businessLoading, setBusinessLoading] = useState(false)
  const [businessSuccess, setBusinessSuccess] = useState(false)
  const [businessError, setBusinessError] = useState('')
  const [businessLogo, setBusinessLogo] = useState<File | null>(null)
  const [businessLogoPreview, setBusinessLogoPreview] = useState<string | null>(null)
  const [submittedTier, setSubmittedTier] = useState<'card' | 'spotlight'>('card')
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('annual')
  const [submittedBilling, setSubmittedBilling] = useState<'monthly' | 'annual'>('annual')

  // Pending businesses (admin approval queue)
  const [pendingBusinesses, setPendingBusinesses] = useState<Business[]>([])

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

  const [affiliates, setAffiliates] = useState<Affiliate[]>([])
  const [nonprofits, setNonprofits] = useState<NonProfit[]>([])
  const [clubs, setClubs] = useState<Club[]>([])
  const [exploreLocations, setExploreLocations] = useState<ExploreLocation[]>([])
  const [dailyJokes, setDailyJokes] = useState<{ id: number; day_of_year: number; question: string; punchline: string; category: string }[]>([])

  // iOS detection — web push only works in installed PWA on iOS (Safari 16.4+)
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent)
  const isStandaloneMode = typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  )
  const isIOSNonPWA = isIOS && !isStandaloneMode
  // Check if browser supports push notifications at all
  const canSupportPush = typeof Notification !== 'undefined'

  // Track OneSignal notification status (SDK is initialized in layout.tsx)
  useEffect(() => {
    const checkNotificationStatus = () => {
      try {
        // FAST CHECK: If browser already granted permission, show green immediately
        if (canSupportPush && Notification.permission === 'granted') {
          setNotificationsEnabled(true)
        }

        // Use OneSignalDeferred to safely access SDK after it's ready
        window.OneSignalDeferred = window.OneSignalDeferred || []
        window.OneSignalDeferred.push(async (OneSignalSDK: any) => {
          const oneSignalPermission = OneSignalSDK.Notifications.permission
          const hasSubscription = !!OneSignalSDK.User.PushSubscription.id
          isDev && console.log('OneSignal permission:', oneSignalPermission, 'Has subscription:', hasSubscription, 'Player ID:', OneSignalSDK.User.PushSubscription.id)
          // If permission granted, show as enabled even if subscription is pending
          // (autoResubscribe will create the subscription shortly)
          // Only override to false if browser also denies — prevents OneSignal lag from clearing fast check
          if (oneSignalPermission || !(canSupportPush && Notification.permission === 'granted')) {
            setNotificationsEnabled(oneSignalPermission)
          }

          // Listen for permission changes
          OneSignalSDK.Notifications.addEventListener('permissionChange', (newPermission: boolean) => {
            isDev && console.log('Notification permission changed:', newPermission)
            setNotificationsEnabled(newPermission)
            if (newPermission) {
              showToast('🔔 Notifications enabled!')
            }
          })

          // Listen for subscription changes — save player ID + set town tag
          OneSignalSDK.User.PushSubscription.addEventListener('change', async (event: any) => {
            isDev && console.log('Subscription changed:', event.current.id, 'optedIn:', event.current.optedIn)
            if (event.current.id && event.current.optedIn) {
              setNotificationsEnabled(true)
              // Save player ID to DB
              const { data: { session } } = await supabase.auth.getSession()
              if (session?.user) {
                await supabase
                  .from('users')
                  .update({ onesignal_player_id: event.current.id })
                  .eq('id', session.user.id)
                isDev && console.log('Player ID saved from status listener:', event.current.id)
              }
              // Set town tag on new subscriptions so daily digest reaches them
              const savedTownId = localStorage.getItem('selectedTownId') || '1'
              OneSignalSDK.User.addTag('town_id', savedTownId)
              isDev && console.log('Town tag set on new subscription:', savedTownId)
            }
          })
        })
      } catch (error) {
        console.error('OneSignal status check error:', error)
      }
    }
    checkNotificationStatus()
  }, [])

  // Save OneSignal subscription ID to Supabase + ensure town tag is set
  // Also calls OneSignal.login(userId) to link ALL devices to one external_id
  const saveOneSignalPlayerId = (userId: string) => {
    try {
      window.OneSignalDeferred = window.OneSignalDeferred || []
      window.OneSignalDeferred.push(async (OneSignalSDK: typeof OneSignal) => {
        try {
          // Login with external_id so ALL of this user's devices are linked
          // This allows push notifications to reach phone + computer simultaneously
          try {
            await OneSignalSDK.login(userId)
            isDev && console.log('OneSignal.login() called with userId:', userId)
          } catch (loginErr: any) {
            // "already logged in" is fine — ignore it
            if (!loginErr?.message?.includes('already')) {
              console.error('OneSignal.login error:', loginErr)
            }
          }

          const saveId = async (playerId: string) => {
            const { error } = await supabase
              .from('users')
              .update({ onesignal_player_id: playerId })
              .eq('id', userId)
            if (error) {
              console.error('Supabase update error:', error)
            } else {
              isDev && console.log('OneSignal subscription ID saved:', playerId)
              // Always ensure town tag is set when saving player ID
              const savedTownId = localStorage.getItem('selectedTownId') || '1'
              OneSignalSDK.User.addTag('town_id', savedTownId)
            }
          }

          // Try to get player ID immediately
          const playerId = OneSignalSDK.User.PushSubscription.id
          if (playerId) {
            await saveId(playerId)
          } else {
            isDev && console.log('No subscription ID yet - will poll and listen for changes')
            let attempts = 0
            const pollInterval = setInterval(async () => {
              attempts++
              const id = OneSignalSDK.User.PushSubscription.id
              if (id) {
                clearInterval(pollInterval)
                await saveId(id)
              } else if (attempts >= 15) {
                clearInterval(pollInterval)
                isDev && console.log('OneSignal: no subscription ID after polling')
              }
            }, 2000)
          }

          // Listen for subscription changes
          OneSignalSDK.User.PushSubscription.addEventListener('change', async (event: any) => {
            const newPlayerId = event.current.id
            if (newPlayerId && event.current.optedIn) {
              isDev && console.log('Subscription changed! Saving ID:', newPlayerId)
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

  // Auto-request notification permission (called after signup/login)
  // On iOS, web push ONLY works in installed PWA (Add to Home Screen)
  const requestNotificationPermission = (userId?: string) => {
    try {
      // iOS non-PWA: web push is impossible — skip silently
      if (isIOSNonPWA) return

      // If already granted, just make sure player ID is saved (don't bail early!)
      if (canSupportPush && Notification.permission === 'granted') {
        setNotificationsEnabled(true)
        const uid = userId || user?.id
        if (uid) saveOneSignalPlayerId(uid)
        return
      }
      // Don't request if previously denied (user must manually unblock in settings)
      if (canSupportPush && Notification.permission === 'denied') return

      window.OneSignalDeferred = window.OneSignalDeferred || []
      window.OneSignalDeferred.push(async (OneSignalSDK: typeof OneSignal) => {
        if (OneSignalSDK.Notifications.permission) {
          // Already granted in OneSignal — ensure player ID is saved
          setNotificationsEnabled(true)
          const uid = userId || user?.id
          if (uid) saveOneSignalPlayerId(uid)
          return
        }

        await OneSignalSDK.Notifications.requestPermission()

        if (OneSignalSDK.Notifications.permission) {
          setNotificationsEnabled(true)
          showToast('🔔 Notifications enabled!')
          const uid = userId || user?.id
          if (uid) saveOneSignalPlayerId(uid)
        }
      })
    } catch (err) {
      isDev && console.log('Could not request notification permission:', err)
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
        isDev && console.log('OneSignal town_id tag set to:', townId)
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

    // Ensure public.users row exists + detect first login → show town picker
    const ensureUserRow = async (authUser: SupabaseUser) => {
      const { data } = await supabase
        .from('users')
        .select('id, onesignal_player_id, last_login')
        .eq('id', authUser.id)
        .single()
      if (!data) {
        // Row is missing — create it from auth metadata (brand new user)
        isDev && console.log('Public user row missing, creating...')
        await supabase.from('users').insert({
          id: authUser.id,
          email: authUser.email || 'unknown@unknown.com',
          full_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || null,
          user_type: 'resident',
          town_id: Number(localStorage.getItem('selectedTownId')) || 1,
          notification_preferences: { jobs: true, events: true, community: true, daily_digest: true },
        })
        // First-ever login — show town picker
        setShowTownPickerModal(true)
      } else if (!data.last_login) {
        // Existing user but never had last_login set — first tracked login
        setShowTownPickerModal(true)
      }
      if (data?.onesignal_player_id) {
        setNotificationsEnabled(true)
      }
      // Update last_login timestamp
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', authUser.id)
    }

    // Check if user has an active business subscription
    const checkSubscriber = async (email: string) => {
      const { data } = await supabase.from('businesses').select('id').or(`contact_email.ilike.${email},email.ilike.${email}`).eq('payment_status', 'active').limit(1)
      setIsSubscriber(!!(data && data.length > 0))
    }

    // Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        ensureUserRow(session.user)
        fetchUserInterests(session.user.id)
        saveOneSignalPlayerId(session.user.id)
        loadUserTown(session.user.id)
        if (session.user.email) checkSubscriber(session.user.email)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        ensureUserRow(session.user)
        fetchUserInterests(session.user.id)
        saveOneSignalPlayerId(session.user.id)
        loadUserTown(session.user.id)
        // Auto-request notification permission for Google OAuth redirects and email confirmations
        requestNotificationPermission(session.user.id)
        if (session.user.email) checkSubscriber(session.user.email)
      } else {
        setUserInterests([])
        setNotificationsEnabled(false)
        setIsSubscriber(false)
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
      // Auto-request notification permission on login (user gesture = click)
      requestNotificationPermission()
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
      // Auto-request notification permission while still in click handler (user gesture)
      // Permission gets granted now; player ID linked later when they confirm email & log in
      if (wantNotifications) {
        requestNotificationPermission()
      }
      alert('Check your email for a confirmation link!')
    }
    setAuthLoading(false)
  }

  // Handle logout
  const fetchDashboard = async () => {
    setDashboardLoading(true)
    try {
      const res = await fetch('/api/dashboard')
      const data = await res.json()
      if (data.dashboard) setDashboardData(data.dashboard)
    } catch (err) {
      console.error('Dashboard fetch error:', err)
    }
    setDashboardLoading(false)
  }

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
  const isAdmin = user?.email === 'jarrettcmcgee@gmail.com' || user?.email === 'jarrettmcgee@gmail.com' || user?.email === 'thenewpaperchariton@gmail.com' || user?.email === 'gonewpaper@gmail.com'

  // Check if user has access to reports (admin or chamber/city contact)
  const canViewReports = isAdmin || reportAccessTownIds.length > 0

  useEffect(() => {
    if (!user?.email) { setReportAccessTownIds([]); return }
    if (isAdmin) { setReportAccessTownIds([1, 2]); return } // Admin sees all towns
    // Check if user's email matches any town's report_email
    const checkAccess = async () => {
      const { data } = await supabase.from('towns').select('id').eq('report_email', user.email!)
      if (data && data.length > 0) setReportAccessTownIds(data.map((t: any) => t.id))
      else setReportAccessTownIds([])
    }
    checkAccess()
  }, [user?.email, isAdmin])

  // Fetch monthly engagement report
  const fetchReport = async (townId: number, year: number, month: number) => {
    setReportLoading(true)
    setReportData(null)
    try {
      const { data, error } = await supabase.rpc('generate_monthly_report', {
        p_town_id: townId, p_year: year, p_month: month
      })
      if (error) throw error
      setReportData(data)
    } catch (err: any) {
      showToast('Error loading report: ' + err.message)
    }
    setReportLoading(false)
  }

  // Navigate report months
  const changeReportMonth = (direction: number) => {
    let newMonth = reportMonth + direction
    let newYear = reportYear
    if (newMonth > 12) { newMonth = 1; newYear++ }
    if (newMonth < 1) { newMonth = 12; newYear-- }
    setReportMonth(newMonth)
    setReportYear(newYear)
    fetchReport(selectedTownId, newYear, newMonth)
  }

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

  const handleBusinessLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setBusinessError('Logo must be under 2MB')
        return
      }
      setBusinessLogo(file)
      const reader = new FileReader()
      reader.onloadend = () => setBusinessLogoPreview(reader.result as string)
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

  // Submit a Spot handler
  const handleSubmitSpot = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !droppedPin) return
    setSubmitSpotError('')
    if (!submitSpotForm.name.trim()) { setSubmitSpotError('Spot name is required'); return }
    if (!submitSpotForm.summary.trim()) { setSubmitSpotError('Please add a short description'); return }
    setSubmitSpotLoading(true)
    try {
      const { error } = await supabase.from('explore_locations').insert({
        name: submitSpotForm.name.trim(),
        lat: droppedPin.lat,
        lng: droppedPin.lng,
        category: submitSpotForm.category,
        emoji: submitSpotForm.emoji,
        address: submitSpotForm.address.trim() || `${selectedTownName}, IA`,
        summary: submitSpotForm.summary.trim(),
        town_id: selectedTownId,
        is_active: false,
        display_order: 999,
        submitted_by: user.id,
      })
      if (error) throw error
      setSubmitSpotSuccess(true)
      setPinDropMode(false)
      // Remove temporary pin marker
      if (droppedPinMarkerRef.current && leafletMapRef.current) {
        leafletMapRef.current.removeLayer(droppedPinMarkerRef.current)
        droppedPinMarkerRef.current = null
      }
    } catch (err: any) {
      setSubmitSpotError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitSpotLoading(false)
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

  const handlePostEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setPostEventLoading(true)
    try {
      const insertData: any = {
        title: postEventForm.title.trim(),
        date: postEventForm.date,
        time: postEventForm.time || 'TBD',
        location: postEventForm.location.trim() || selectedTownName,
        category: postEventForm.category,
        price: postEventForm.price || 'Free',
        description: postEventForm.description.trim(),
        verified: false,
        source: 'Community Submission',
        source_type: 'user_submitted',
        town_id: selectedTownId,
      }
      if (postEventForm.sponsor_name.trim()) insertData.sponsor_name = postEventForm.sponsor_name.trim()
      if (postEventForm.sponsor_logo_url.trim()) insertData.sponsor_logo_url = postEventForm.sponsor_logo_url.trim()
      if (user?.id) insertData.submitted_by = user.id
      const { error } = await supabase.from('events').insert(insertData)
      if (error) throw error
      setPostEventSuccess(true)
    } catch (err) {
      showToast('Something went wrong. Please try again.')
    } finally {
      setPostEventLoading(false)
    }
  }

  // Open the edit modal for an event the current user owns.
  // Pre-fills form + auto-generates a notification message based on the (empty) diff.
  const openEditEventModal = (event: Event) => {
    setEditingEvent(event)
    setEditEventForm({
      date: event.date || '',
      time: normalizeTimeForInput(event.time || ''),
      location: event.location || '',
      cancelled: !!event.cancelled,
    })
    setEditEventMessage('')
    setEditEventMessageDirty(false)
    setEditEventError('')
  }

  // Convert mixed-format time strings ("4:00 PM", "16:00:00") to HH:MM for <input type="time">.
  // Returns '' if unparseable so the field renders empty rather than crashing.
  function normalizeTimeForInput(timeStr: string): string {
    if (!timeStr || timeStr === 'TBD') return ''
    const m24 = timeStr.match(/^(\d{1,2}):(\d{2})/)
    if (!m24) return ''
    let h = parseInt(m24[1], 10)
    const min = m24[2]
    const ampm = timeStr.match(/\s*(AM|PM)\s*$/i)
    if (ampm) {
      const isPM = ampm[1].toUpperCase() === 'PM'
      if (isPM && h !== 12) h += 12
      if (!isPM && h === 12) h = 0
    }
    if (h < 0 || h > 23) return ''
    return `${String(h).padStart(2, '0')}:${min}`
  }

  // Build a human-readable auto-fill message from the diff between the original event and form state.
  // Used both as the initial value and to refresh while the user hasn't manually edited the box.
  const buildEditNotificationMessage = (original: Event, form: { date: string; time: string; location: string; cancelled: boolean }): string => {
    if (form.cancelled && !original.cancelled) {
      return `This event has been cancelled.`
    }
    const parts: string[] = []
    if (form.location.trim() && form.location.trim() !== (original.location || '').trim()) {
      parts.push(`New location: ${form.location.trim()}`)
    }
    if (form.date && form.date !== original.date) {
      parts.push(`New date: ${formatEventDate(form.date)}`)
    }
    if (form.time && form.time !== normalizeTimeForInput(original.time || '')) {
      parts.push(`New time: ${form.time}`)
    }
    if (parts.length === 0) return ''
    return parts.join(' • ')
  }

  // Refresh the auto-message when form fields change, but only if the user hasn't typed their own.
  useEffect(() => {
    if (!editingEvent) return
    if (editEventMessageDirty) return
    setEditEventMessage(buildEditNotificationMessage(editingEvent, editEventForm))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editEventForm, editingEvent])

  const handleEditEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingEvent || !user) return
    setEditEventError('')

    // Build only the changed fields
    const updates: Record<string, string | boolean> = {}
    if (editEventForm.location.trim() !== (editingEvent.location || '').trim()) {
      updates.location = editEventForm.location.trim()
    }
    if (editEventForm.date && editEventForm.date !== editingEvent.date) {
      updates.date = editEventForm.date
    }
    if (editEventForm.time && editEventForm.time !== normalizeTimeForInput(editingEvent.time || '')) {
      // <input type="time"> returns HH:MM; DB canonical format is HH:MM:SS — append seconds so
      // the event-reminders cron time parser continues to work.
      updates.time = /^\d{2}:\d{2}$/.test(editEventForm.time) ? `${editEventForm.time}:00` : editEventForm.time
    }
    if (editEventForm.cancelled !== !!editingEvent.cancelled) {
      updates.cancelled = editEventForm.cancelled
    }

    if (Object.keys(updates).length === 0) {
      setEditEventError('Nothing to update — change a field first.')
      return
    }
    if (!editEventMessage.trim()) {
      setEditEventError('Notification message is required.')
      return
    }

    setEditEventLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) {
        setEditEventError('Your session has expired. Please log in again.')
        return
      }

      const res = await fetch('/api/events/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          eventId: editingEvent.id,
          updates,
          message: editEventMessage.trim(),
        }),
      })
      const result = await res.json()
      if (!res.ok) {
        setEditEventError(result?.error || 'Failed to update event.')
        return
      }

      // Optimistically update local state so the card reflects the change immediately
      setEvents(prev => prev.map(ev =>
        ev.id === editingEvent.id ? { ...ev, ...updates } as Event : ev
      ))
      const notified = typeof result?.notified === 'number' ? result.notified : 0
      showToast(notified > 0 ? `Event updated — ${notified} interested ${notified === 1 ? 'person' : 'people'} notified.` : 'Event updated.')
      setEditingEvent(null)
    } catch (err) {
      setEditEventError('Something went wrong. Please try again.')
    } finally {
      setEditEventLoading(false)
    }
  }

  const handlePostJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setPostJobError('')
    if (!postJobForm.title.trim()) { setPostJobError('Job title is required'); return }
    if (!postJobForm.company.trim()) { setPostJobError('Company name is required'); return }
    setPostJobLoading(true)
    try {
      const { error } = await supabase.from('jobs').insert({
        title: postJobForm.title.trim(),
        company: postJobForm.company.trim(),
        type: postJobForm.type,
        pay: postJobForm.pay.trim() || 'Contact for pay',
        description: postJobForm.description.trim() || null,
        apply_url: postJobForm.apply_url.trim() || null,
        location: postJobForm.location.trim() || selectedTownName,
        auto_scraped: false,
        town_id: selectedTownId,
      })
      if (error) throw error
      setPostJobSuccess(true)
      // Re-fetch jobs
      const { data } = await supabase.from('jobs').select('*').eq('town_id', selectedTownId).order('created_at', { ascending: false }).limit(50)
      if (data) setJobs(data)
    } catch (err) {
      setPostJobError('Something went wrong. Please try again.')
    } finally {
      setPostJobLoading(false)
    }
  }

  const handlePostHousingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setPostHousingError('')
    if (!postHousingForm.title.trim()) { setPostHousingError('Title is required'); return }
    if (!postHousingForm.price.trim()) { setPostHousingError('Price is required'); return }
    if (!postHousingForm.location.trim()) { setPostHousingError('Location is required'); return }
    if (!postHousingForm.contact_phone.trim() && !postHousingForm.contact_email.trim()) { setPostHousingError('At least one contact method (phone or email) is required'); return }
    setPostHousingLoading(true)
    try {
      const { error } = await supabase.from('housing').insert({
        title: postHousingForm.title.trim(),
        price: postHousingForm.price.trim(),
        listing_type: postHousingForm.listing_type,
        bedrooms: postHousingForm.bedrooms ? parseInt(postHousingForm.bedrooms) : null,
        bathrooms: postHousingForm.bathrooms ? parseInt(postHousingForm.bathrooms) : null,
        location: postHousingForm.location.trim(),
        description: postHousingForm.description.trim() || null,
        details: postHousingForm.details.trim() || null,
        contact_name: postHousingForm.contact_name.trim() || null,
        contact_phone: postHousingForm.contact_phone.trim() || null,
        contact_email: postHousingForm.contact_email.trim() || null,
        pets_allowed: postHousingForm.pets_allowed,
        town_id: selectedTownId,
        is_active: true,
      })
      if (error) throw error
      setPostHousingSuccess(true)
      const { data } = await supabase.from('housing').select('*').eq('town_id', selectedTownId).eq('is_active', true).limit(20)
      if (data) setHousing(data)
    } catch (err) {
      setPostHousingError('Something went wrong. Please try again.')
    } finally {
      setPostHousingLoading(false)
    }
  }

  const handleBusinessSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusinessError('')
    if (!businessForm.name.trim()) { setBusinessError('Business name is required'); return }
    if (!businessForm.contactName.trim()) { setBusinessError('Contact name is required'); return }
    if (!businessForm.email.trim()) { setBusinessError('Email is required'); return }
    if (!businessForm.phone.trim()) { setBusinessError('Phone number is required'); return }
    if (!businessForm.category) { setBusinessError('Please select a category'); return }
    if (!businessForm.tagline.trim()) { setBusinessError('Tagline is required'); return }
    if (!businessForm.tier) { setBusinessError('Please select a listing plan'); return }
    setBusinessLoading(true)
    try {
      const categoryEmojis: Record<string, string> = {
        'Restaurant': '🍔', 'Cafe/Coffee Shop': '☕', 'Retail': '🛍️', 'Grocery': '🛒',
        'Auto Services': '🚗', 'Insurance': '🛡️', 'Financial Advisor': '💼',
        'Real Estate': '🏠', 'Healthcare': '🏥', 'Salon/Beauty': '💇',
        'Entertainment': '🎬', 'Event Services': '🎉', 'Professional Services': '📋',
        'Home Services': '🔧', 'Agriculture': '🌾', 'Other': '🏢'
      }
      // Upload logo if provided
      let logoUrl: string | null = null
      if (businessLogo) {
        const fileExt = businessLogo.name.split('.').pop()
        const fileName = `biz-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
        const { error: uploadError } = await supabase.storage.from('logos').upload(fileName, businessLogo)
        if (uploadError) {
          setBusinessError('Logo upload failed: ' + uploadError.message)
          setBusinessLoading(false)
          return
        }
        const { data: urlData } = supabase.storage.from('logos').getPublicUrl(fileName)
        logoUrl = urlData.publicUrl
      }
      const { error } = await supabase.from('businesses').insert({
        name: businessForm.name.trim(),
        contact_name: businessForm.contactName.trim(),
        contact_email: businessForm.email.trim(),
        email: businessForm.email.trim(),
        phone: businessForm.phone.trim(),
        website: businessForm.website.trim() || '',
        category: businessForm.category,
        tagline: businessForm.tagline.trim(),
        description: businessForm.description.trim(),
        address: businessForm.address.trim(),
        hours: businessForm.hours.trim(),
        tier: businessForm.tier,
        logo_emoji: categoryEmojis[businessForm.category] || '🏢',
        logo_url: logoUrl,
        featured: false,
        clicks: 0,
        town_id: businessForm.townId,
        payment_status: 'pending',
      })
      if (error) throw error
      setSubmittedTier(businessForm.tier)
      setSubmittedBilling(billingPeriod)
      setBusinessSuccess(true)
      setBusinessLogo(null)
      setBusinessLogoPreview(null)
    } catch (err: any) {
      setBusinessError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setBusinessLoading(false)
    }
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
    setEventInterestCounts(prev => ({ ...prev, [eventId]: Math.max((prev[eventId] || 1) - 1, 0) }))
    showToast('Removed from your interests')
  } else {
    // Add interest
    const { error: insError } = await supabase
      .from('user_interests')
      .insert({ user_id: user.id, event_id: eventId })

    if (insError) { showToast('Something went wrong. Please try again.'); return }
    setUserInterests(prev => [...prev, eventId])
    setEventInterestCounts(prev => ({ ...prev, [eventId]: (prev[eventId] || 0) + 1 }))

    // Save OneSignal subscription ID (in case it wasn't captured on login)
    saveOneSignalPlayerId(user.id)

    // Auto-prompt for notifications if not enabled (this is a user gesture = click)
    if (!notificationsEnabled && !isIOSNonPWA) {
      requestNotificationPermission(user.id)
      showToast("Marked as interested! Allow notifications to get reminders.")
    } else if (notificationsEnabled) {
      showToast("You'll be reminded about this event!")
    } else {
      showToast('Interested! Add to Phone first to get reminders.')
    }
    }
  }

  // Fetch data from Supabase on load
  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        // Calculate day-of-year for today + last 6 days in Central Time
        const getDOY = (str: string): number => {
          const [y, m, d] = str.split('-').map(Number)
          return Math.round((new Date(y, m - 1, d).getTime() - new Date(y, 0, 1).getTime()) / 86400000) + 1
        }
        const recentDoys = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(); d.setDate(d.getDate() - i)
          return getDOY(d.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }))
        })

        const [
          eventsRes,
          jobsRes,
          businessesRes,
          housingRes,
          communityRes,
          celebrationsRes,
          affiliatesRes,
          nonprofitsRes,
          clubsRes,
          jokesRes,
          exploreRes
        ] = await Promise.all([
          // Town-specific content (filtered by selectedTownId)
          supabase.from('events').select('*').eq('town_id', selectedTownId).eq('verified', true).gte('date', new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })).order('date', { ascending: true }).limit(20),
          supabase.from('jobs').select('*').eq('town_id', selectedTownId).order('created_at', { ascending: false }).limit(20),
          supabase.from('businesses').select('*').or(`town_id.eq.${selectedTownId},additional_town_ids.cs.{${selectedTownId}}`).eq('payment_status', 'active').order('featured', { ascending: false }).limit(20),
          supabase.from('housing').select('*').eq('town_id', selectedTownId).eq('is_active', true).limit(20),
          supabase.from('community_posts').select('*').eq('town_id', selectedTownId).eq('is_active', true).order('created_at', { ascending: false }).limit(20),
          supabase.from('celebrations_of_life').select('*').eq('town_id', selectedTownId).eq('is_approved', true).order('created_at', { ascending: false }).limit(10),
          supabase.from('affiliates').select('*').eq('is_active', true).order('display_order', { ascending: true }),
          // Town-specific organizations
          supabase.from('nonprofits').select('*').eq('town_id', selectedTownId).eq('is_active', true).order('display_order', { ascending: true }),
          supabase.from('clubs').select('*').eq('town_id', selectedTownId).eq('is_active', true).order('display_order', { ascending: true }),
          // Daily jokes: pre-approved, keyed by day-of-year (safe, no AI generation risk)
          supabase.from('daily_jokes').select('id,day_of_year,question,punchline,category').in('day_of_year', recentDoys).eq('is_approved', true),
          // Explore locations: parks, trails, lakes, landmarks (from DB with image support)
          supabase.from('explore_locations').select('*').eq('town_id', selectedTownId).eq('is_active', true).order('display_order', { ascending: true })
        ])

        if (eventsRes.data) {
          setEvents((eventsRes.data || []).sort((a: Event, b: Event) => {
            const dateCmp = (a.date || '').localeCompare(b.date || '')
            if (dateCmp !== 0) return dateCmp
            return parseTimeToMinutes(a.time || '') - parseTimeToMinutes(b.time || '')
          }))
          // Fetch interest counts for all events
          if (eventsRes.data.length > 0) {
            const eventIds = eventsRes.data.map((e: any) => e.id)
            const { data: counts } = await supabase.rpc('get_event_interest_counts', { event_ids: eventIds })
            if (counts) {
              const countMap: Record<number, number> = {}
              counts.forEach((c: any) => { countMap[c.event_id] = Number(c.interest_count) })
              setEventInterestCounts(countMap)
            }
          }
        }
        if (jobsRes.data) setJobs(jobsRes.data)
        if (businessesRes.data) setBusinesses(businessesRes.data)
        if (housingRes.data) setHousing(housingRes.data)
        if (communityRes.data) setCommunityPosts(communityRes.data)
        if (celebrationsRes.data) {
          const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
          const sorted = [...celebrationsRes.data].sort((a, b) => {
            const aDate = a.service_date || ''
            const bDate = b.service_date || ''
            const aUpcoming = aDate >= today
            const bUpcoming = bDate >= today
            // Upcoming/today service dates first, nearest date on top
            if (aUpcoming && !bUpcoming) return -1
            if (!aUpcoming && bUpcoming) return 1
            if (aUpcoming && bUpcoming) return aDate.localeCompare(bDate)
            // Past or no service date: sort by passing_date desc, then created_at desc
            if (aDate && bDate) return bDate.localeCompare(aDate)
            if (aDate && !bDate) return -1
            if (!aDate && bDate) return 1
            return 0
          })
          setCelebrations(sorted)
        }
        if (affiliatesRes.data) setAffiliates(affiliatesRes.data)
        if (nonprofitsRes.data) setNonprofits(nonprofitsRes.data)
        if (clubsRes.data) setClubs(clubsRes.data)
        if (exploreRes.data) setExploreLocations(exploreRes.data)
        if (jokesRes.data) {
          // Sort so today's joke is first, then yesterday, etc.
          const doyOrder = new Map(recentDoys.map((doy, i) => [doy, i]))
          setDailyJokes(jokesRes.data.sort((a: any, b: any) => (doyOrder.get(a.day_of_year) ?? 99) - (doyOrder.get(b.day_of_year) ?? 99)))
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      }
      setLoading(false)
    }
    fetchData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTownId])

  // Fetch pending (unverified) events for admin approval
  useEffect(() => {
    if (!isAdmin) return
    async function fetchPendingEvents() {
      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('town_id', selectedTownId)
        .eq('verified', false)
        .order('created_at', { ascending: false })
      if (data) setPendingEvents(data)
    }
    fetchPendingEvents()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, selectedTownId])

  // Fetch pending businesses for admin approval
  useEffect(() => {
    if (!isAdmin) return
    async function fetchPendingBusinesses() {
      const { data } = await supabase
        .from('businesses')
        .select('*')
        .eq('payment_status', 'pending')
        .order('created_at', { ascending: false })
      if (data) setPendingBusinesses(data)
    }
    fetchPendingBusinesses()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin])

  // Fetch pending explore spots for admin approval
  useEffect(() => {
    if (!isAdmin) return
    async function fetchPendingSpots() {
      const { data } = await supabase
        .from('explore_locations')
        .select('*')
        .eq('is_active', false)
        .not('submitted_by', 'is', null)
        .order('id', { ascending: false })
      if (data) setPendingSpots(data)
    }
    fetchPendingSpots()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin])

  // Track business clicks
  const trackBusinessClick = (business: Business) => {
    // Open website FIRST (must be synchronous for iOS Safari popup blocker)
    if (business.website) {
      window.open(business.website, '_blank', 'noopener,noreferrer')
    }
    // Track click count + analytics in background (fire-and-forget)
    supabase.rpc('increment_business_clicks', { b_id: business.id }).then(() => {})
    supabase.from('analytics').insert({ event_type: 'business_click', business_id: business.id, source_page: 'business_tab', user_id: user?.id || null, town_id: selectedTownId }).then(() => {})
  }

  // Track affiliate clicks
  const trackAffiliateClick = (affiliate: Affiliate) => {
    // Open link FIRST (must be synchronous for iOS Safari popup blocker)
    if (affiliate.url) {
      window.open(affiliate.url, '_blank', 'noopener,noreferrer')
    }
    // Track in background (fire-and-forget)
    supabase.rpc('increment_affiliate_clicks', { a_id: affiliate.id }).then(() => {})
    supabase.from('analytics').insert({ event_type: 'affiliate_click', affiliate_name: affiliate.name, source_page: 'menu', user_id: user?.id || null, town_id: selectedTownId }).then(() => {})
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
    { id: 1, title: 'City Council Meeting', category: '🏛️', date: 'Jan 12', time: '6:00 PM', location: 'City Hall', price: 'Free', source: 'City of Chariton', verified: true, town_id: 1 }
  ]

  const sampleJobs: Job[] = [
    { id: 1, title: 'Restaurant Server', company: 'Route 34 Grill', type: 'Part-time', pay: '$12-15/hr + tips', auto_scraped: false, created_at: '', town_id: 1 }
  ]

  const sampleBusinesses: Business[] = [
    // Community Sponsor example
    { id: 1, name: 'Go New Paper', category: 'Local News & Media', logo_emoji: '📰', logo_url: '/GoNewPaper_LOGO.png', website: 'https://www.gonewpaper.com/about', clicks: 512, featured: true, tagline: 'Everything Local, All In Your Pocket', tier: 'spotlight', phone: '', created_at: '', town_id: 1, email: 'thenewpaperchariton@gmail.com' },
  ]

  const sampleHousing: Housing[] = [
    { id: 1, title: '2BR Apartment', price: '$550/mo', location: 'Downtown', details: 'Updated kitchen, parking', listing_type: 'rent', pets_allowed: false, town_id: 1, is_active: true },
  ]

  const sampleCommunity: CommunityPost[] = [
    { id: 1, title: 'LOST: Black Lab Mix', post_type: 'lost_pet', description: 'Last seen near Yocom Park', emoji: '🔍', town_id: 1, is_active: true },
  ]

  const sampleAffiliates: Affiliate[] = [
    { id: 1, name: 'Everyday Dose', category: 'Health', logo_emoji: '☕', url: 'https://affiliate.link/everydaydose', commission: '20%', is_active: true, display_order: 1, clicks: 0 },
  ]

  const sampleNonprofits: NonProfit[] = [
    { id: 1, name: 'Chariton 4th of July Celebration', category: 'Community Events', logo_emoji: '🎆', logo_url: '/Chariton_4th_LOGO.png', tagline: 'Keeping small-town traditions alive!', donation_url: 'https://www.zeffy.com/en-US/donation-form/2026-4th-of-july-celebration', email: 'chariton4thjulycommitte@gmail.com', town_id: 1, is_active: true, display_order: 1, created_at: '' },
  ]

  const sampleClubs: Club[] = [
    { id: 1, name: 'Chariton Rock Climbers', category: 'Sports & Recreation', logo_emoji: '🧗', logo_url: '/Chariton_Rock_Climbers_LOGO.png', tagline: 'Climb higher together!', email: 'jarrettcmcgee@gmail.com', town_id: 1, is_active: true, display_order: 1, created_at: '' },
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

  // Explore map — initialize Leaflet when tab is active (data from Supabase)
  const filteredExploreLocations = exploreFilter === 'all'
    ? exploreLocations
    : exploreLocations.filter(loc => loc.category === exploreFilter)

  useEffect(() => {
    if (activeTab !== 'explore' || exploreLocations.length === 0) return
    let mapInstance: any = null

    const initMap = async () => {
      await new Promise(r => setTimeout(r, 50)) // Wait for DOM
      const container = document.getElementById('explore-map')
      if (!container || leafletMapRef.current) return

      const L = (await import('leaflet')).default

      mapInstance = L.map(container, {
        center: [41.012, -93.300],
        zoom: 13,
        zoomControl: false,
        attributionControl: false,
      })

      L.control.zoom({ position: 'topright' }).addTo(mapInstance)
      L.control.attribution({ position: 'bottomright', prefix: false }).addTo(mapInstance)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(mapInstance)

      // Add markers for all locations (from DB)
      const markers: any[] = []
      exploreLocations.forEach(loc => {
        const color = EXPLORE_CATEGORY_COLORS[loc.category] || '#6b7280'
        const marker = L.marker([loc.lat, loc.lng], {
          icon: L.divIcon({
            className: 'explore-marker',
            html: `<div style="background:${color};width:32px;height:32px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:14px;cursor:pointer;">${loc.emoji}</div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          })
        }).addTo(mapInstance)

        marker.on('click', () => {
          // Skip click if we just finished dragging (edit mode)
          if ((marker as any)._justDragged) {
            ;(marker as any)._justDragged = false
            return
          }
          setSelectedExploreLocation(loc)
          mapInstance.flyTo([loc.lat, loc.lng], 15, { duration: 0.5 })
        })

        ;(marker as any)._exploreCategory = loc.category
        ;(marker as any)._exploreLocationId = loc.id
        markers.push(marker)
      })

      leafletMapRef.current = mapInstance
      leafletMarkersRef.current = markers

      // Fix map size after render
      setTimeout(() => mapInstance.invalidateSize(), 100)
    }

    initMap()

    return () => {
      if (mapInstance) {
        mapInstance.remove()
        leafletMapRef.current = null
        leafletMarkersRef.current = []
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, exploreLocations.length])

  // Update marker visibility when filter changes
  useEffect(() => {
    if (!leafletMapRef.current || leafletMarkersRef.current.length === 0) return
    leafletMarkersRef.current.forEach((marker: any) => {
      const cat = marker._exploreCategory
      if (exploreFilter === 'all' || cat === exploreFilter) {
        marker.setOpacity(1)
      } else {
        marker.setOpacity(0.15)
      }
    })
  }, [exploreFilter])

  // Admin: toggle draggable on markers when edit pins mode changes
  useEffect(() => {
    if (!leafletMapRef.current || leafletMarkersRef.current.length === 0) return

    leafletMarkersRef.current.forEach((marker: any) => {
      if (editPinsMode) {
        marker.dragging.enable()

        const handleDragStart = () => {
          marker._justDragged = true
        }

        const handleDragEnd = async () => {
          const newLatLng = marker.getLatLng()
          const locationId = marker._exploreLocationId
          if (!locationId) return

          const { error, data } = await supabase
            .from('explore_locations')
            .update({ lat: newLatLng.lat, lng: newLatLng.lng })
            .eq('id', locationId)
            .select('id')

          if (error || !data || data.length === 0) {
            showToast('❌ Failed to save pin position')
            // Revert to original position
            const original = exploreLocations.find(l => l.id === locationId)
            if (original) marker.setLatLng([original.lat, original.lng])
          } else {
            // Update local state (won't rebuild map since we use .length dependency)
            setExploreLocations(prev =>
              prev.map(loc =>
                loc.id === locationId
                  ? { ...loc, lat: newLatLng.lat, lng: newLatLng.lng }
                  : loc
              )
            )
            showToast('📍 Pin moved!')
          }
        }

        marker.on('dragstart', handleDragStart)
        marker.on('dragend', handleDragEnd)
        marker._editDragStartHandler = handleDragStart
        marker._editDragEndHandler = handleDragEnd
      } else {
        marker.dragging.disable()
        if (marker._editDragStartHandler) {
          marker.off('dragstart', marker._editDragStartHandler)
          delete marker._editDragStartHandler
        }
        if (marker._editDragEndHandler) {
          marker.off('dragend', marker._editDragEndHandler)
          delete marker._editDragEndHandler
        }
        marker._justDragged = false
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editPinsMode])

  // Pin drop mode — add/remove map click handler
  useEffect(() => {
    const map = leafletMapRef.current
    if (!map) return

    const handleMapClick = async (e: any) => {
      if (!pinDropMode) return
      const { lat, lng } = e.latlng
      setDroppedPin({ lat, lng })

      // Remove old temp marker if any
      if (droppedPinMarkerRef.current) {
        map.removeLayer(droppedPinMarkerRef.current)
      }

      // Add pulsing red pin at clicked location
      const L = (await import('leaflet')).default
      const tempMarker = L.marker([lat, lng], {
        icon: L.divIcon({
          className: 'explore-marker',
          html: `<div style="background:#DC143C;width:36px;height:36px;border-radius:50%;border:3px solid white;box-shadow:0 0 0 4px rgba(220,20,60,0.3),0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:16px;cursor:pointer;animation:pulse 1.5s ease-in-out infinite;">📍</div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        })
      }).addTo(map)

      droppedPinMarkerRef.current = tempMarker
      map.flyTo([lat, lng], 16, { duration: 0.3 })

      // Open the submit form
      setSubmitSpotForm({ name: '', category: 'park', address: '', summary: '', emoji: '🌳' })
      setSubmitSpotError('')
      setSubmitSpotSuccess(false)
      setShowSubmitSpotModal(true)
    }

    if (pinDropMode) {
      map.on('click', handleMapClick)
      // Change cursor to crosshair
      map.getContainer().style.cursor = 'crosshair'
    } else {
      map.getContainer().style.cursor = ''
    }

    return () => {
      map.off('click', handleMapClick)
      map.getContainer().style.cursor = ''
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinDropMode])

  const tabs = [
    { id: 'events', icon: Calendar, label: 'EVENTS' },
    { id: 'businesses', icon: ShoppingBag, label: 'BUSINESS' },
    { id: 'housing', icon: Home, label: 'HOUSING' },
    { id: 'jobs', icon: Briefcase, label: 'JOBS' },
    { id: 'affiliates', icon: TrendingUp, label: 'DEALS' },
    { id: 'clubs', icon: UsersRound, label: 'CLUBS' },
    { id: 'nonprofits', icon: HeartHandshake, label: 'NON-PROFITS' },
    { id: 'community', icon: Users, label: 'COMMUNITY' },
    { id: 'comics', icon: Laugh, label: 'DAILY LAUGHS' },
    { id: 'celebrations', icon: Flower2, label: 'IN MEMORY' },
    { id: 'explore', icon: Compass, label: 'EXPLORE' }
  ]

  return (
    <div className="min-h-screen" style={{ background: '#fafaf8' }}>

      {/* Splash Screen — shown while data loads */}
      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4" style={{ background: '#2c3e50' }}>
          <img src="/icon-512.png" alt="Go New Paper" className="w-36 h-36 object-contain" style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.5))' }} />
          <div className="text-center mt-2">
            <p className="font-display font-black text-white text-xl tracking-widest">GO NEW PAPER</p>
            <p className="text-white/40 text-[10px] tracking-[0.25em] uppercase mt-1">Everything Local</p>
          </div>
          <div className="flex gap-2 mt-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '0ms' }}></span>
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
            <span className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '300ms' }}></span>
          </div>
        </div>
      )}

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

          {/* Notification + Install CTA — hidden once both are done */}
          {(user && !notificationsEnabled || !isAppInstalled) && (
            <div className="flex gap-2 mb-3">
              {user && !notificationsEnabled && (
                isIOSNonPWA ? (
                  // iOS Safari: web push requires PWA — show install-first message
                  <button
                    onClick={() => setShowInstallHelp(true)}
                    className="flex-1 bg-amber-500 hover:bg-amber-400 text-black py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all active:scale-95"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    Add to Phone for Notifications
                  </button>
                ) : (
                  // Android / Desktop / iOS PWA: can request push permission
                  <button
                    onClick={() => {
                      try {
                        window.OneSignalDeferred = window.OneSignalDeferred || []
                        window.OneSignalDeferred.push(async (OneSignalSDK: typeof OneSignal) => {
                          try {
                            await OneSignalSDK.Notifications.requestPermission()
                            const permission = OneSignalSDK.Notifications.permission
                            if (permission) {
                              setNotificationsEnabled(true)
                              showToast('🔔 Notifications enabled!')
                              if (user) saveOneSignalPlayerId(user.id)
                            } else {
                              showToast('Notifications blocked. Check browser settings.')
                            }
                          } catch {
                            showToast('Could not enable notifications. Try refreshing.')
                          }
                        })
                      } catch { showToast('Could not request notification permission') }
                    }}
                    className="flex-1 bg-yellow-400 hover:bg-yellow-300 text-black py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all active:scale-95"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    Enable Notifications
                  </button>
                )
              )}
              {!isAppInstalled && (
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
                  className="flex-1 bg-white/20 hover:bg-white/30 text-white py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all active:scale-95"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  Add to Phone
                </button>
              )}
            </div>
          )}

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
              }).sort((a, b) => {
                // Parse time string to minutes since midnight for sorting
                const parseTime = (timeStr: string | null | undefined, dateStr: string): number => {
                  if (!timeStr && dateStr.includes('T')) {
                    // Extract time from ISO date string
                    const timePart = dateStr.split('T')[1]
                    if (timePart) {
                      const [h, m] = timePart.split(':').map(Number)
                      return (h || 0) * 60 + (m || 0)
                    }
                  }
                  if (!timeStr) return 9999 // No time → sort to end
                  const t = timeStr.trim()
                  // Handle 24h format like "16:00:00"
                  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(t)) {
                    const [h, m] = t.split(':').map(Number)
                    return (h || 0) * 60 + (m || 0)
                  }
                  // Handle 12h format like "4:00 PM" or "9:30 AM"
                  const match = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
                  if (match) {
                    let h = parseInt(match[1])
                    const m = parseInt(match[2])
                    const period = match[3].toUpperCase()
                    if (period === 'PM' && h !== 12) h += 12
                    if (period === 'AM' && h === 12) h = 0
                    return h * 60 + m
                  }
                  return 9999 // Unparseable → sort to end
                }
                return parseTime(a.time, a.date) - parseTime(b.time, b.date)
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
                  <button
                    className={`${theme.accentTextClass} text-xs font-bold flex items-center gap-1 tracking-wide bg-white px-3 py-1.5 rounded-lg border border-[#e8e6e1]`}
                    style={{ boxShadow: '0 1px 3px rgba(26,26,46,0.06)' }}
                    onClick={() => {
                      if (!user) { setShowAuthModal(true); return }
                      setShowPostEventModal(true)
                      setPostEventSuccess(false)
                      setPostEventForm({ title: '', date: '', time: '', location: '', description: '', category: '📅', price: 'Free', sponsor_name: '', sponsor_logo_url: '' })
                    }}
                  >
                    <Plus className="w-3.5 h-3.5" />Post
                  </button>
                </div>
                {displayEvents.map((event, idx) => (
                  <Card key={event.id} className={`animate-fade-in-up stagger-${Math.min(idx + 1, 8)} ${event.cancelled ? 'opacity-75' : ''}`}>
                    {event.cancelled && (
                      <div className="mb-3 -mt-1 inline-flex items-center gap-1.5 bg-red-100 border border-red-300 text-red-800 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider">
                        <X className="w-3 h-3" /> Cancelled
                      </div>
                    )}
                    <div className="flex items-start gap-3 mb-3">
                      <span className="text-2xl flex-shrink-0 mt-0.5">{event.category}</span>
                      <div className="flex-1 min-w-0">
                        <h3 className={`text-[15px] font-bold tracking-tight leading-snug ${event.cancelled ? 'line-through text-gray-500' : ''}`}>{event.title}</h3>
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
                    {(event as any).sponsor_name && (
                      <div className="flex items-center gap-2 mb-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        {(event as any).sponsor_logo_url && (event as any).sponsor_logo_url.startsWith('http') && (
                          <img src={(event as any).sponsor_logo_url} alt={(event as any).sponsor_name} className="w-6 h-6 rounded object-contain" />
                        )}
                        <span className="text-xs font-bold text-amber-800">Sponsored by {(event as any).sponsor_name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { if (!event.cancelled) handleInterestToggle(event.id) }}
                        disabled={!!event.cancelled}
                        className={`btn-interest flex-1 py-3 rounded-xl text-sm font-bold tracking-wide uppercase flex items-center justify-center gap-2 ${
                          event.cancelled
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : userInterests.includes(event.id)
                              ? 'bg-emerald-500 text-white'
                              : `${theme.accentClass} text-white`
                        }`}
                        style={{ boxShadow: event.cancelled ? 'none' : '0 2px 8px rgba(0,0,0,0.12)' }}
                      >
                        {event.cancelled ? (
                          'Cancelled'
                        ) : userInterests.includes(event.id) ? (
                          <>
                            <Check className="w-4 h-4" />
                            Interested!
                          </>
                        ) : (
                          "I'm Interested"
                        )}
                      </button>
                      {user && !event.cancelled && (event.submitted_by === user.id || isAdmin) && (
                        <button
                          onClick={() => openEditEventModal(event)}
                          className="px-3 py-3 rounded-xl bg-white border-2 border-gray-200 text-gray-700 text-xs font-black uppercase tracking-wide hover:border-gray-400 transition-colors"
                          title={event.submitted_by === user.id ? 'Edit this event' : 'Edit this event (admin)'}
                        >
                          Edit
                        </button>
                      )}
                      {(eventInterestCounts[event.id] || 0) > 0 && (
                        <div className="flex items-center gap-1 px-3 py-3 rounded-xl bg-gray-100 text-gray-600">
                          <Users className="w-3.5 h-3.5" />
                          <span className="text-sm font-bold">{eventInterestCounts[event.id]}</span>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}

                {/* Admin: Pending Events Approval Panel */}
                {isAdmin && pendingEvents.length > 0 && (
                  <div className="mt-6 mb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">⏳</span>
                      <h3 className="text-base font-black tracking-tight font-display text-amber-800">Pending Approval ({pendingEvents.length})</h3>
                    </div>
                    {pendingEvents.map(event => (
                      <div key={event.id} className="bg-white rounded-[14px] p-4 mb-3 border-2 border-amber-300" style={{ boxShadow: '0 2px 8px rgba(217,119,6,0.1)' }}>
                        <div className="flex items-start gap-2 mb-2">
                          <span className="text-xl flex-shrink-0">{event.category}</span>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-[14px] font-bold tracking-tight leading-snug">{event.title}</h4>
                            <p className="text-[11px] text-amber-700 font-semibold uppercase tracking-wider mt-0.5">Community Submission</p>
                          </div>
                          {event.price && <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">{event.price}</span>}
                        </div>
                        <div className="flex items-center gap-3 text-[12px] text-gray-600 font-medium mb-2">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatEventDate(event.date)}</span>
                          {event.time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{event.time}</span>}
                        </div>
                        {event.location && (
                          <p className="text-[12px] text-gray-500 font-medium mb-2 flex items-center gap-1"><MapPin className="w-3 h-3" />{event.location}</p>
                        )}
                        {event.description && (
                          <p className="text-[12px] text-gray-600 mb-3 leading-relaxed">{event.description}</p>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              const { error } = await supabase.from('events').update({ verified: true }).eq('id', event.id)
                              if (!error) {
                                setPendingEvents(prev => prev.filter(e => e.id !== event.id))
                                setEvents(prev => [...prev, { ...event, verified: true }].sort((a, b) => {
                                  const dateCmp = (a.date || '').localeCompare(b.date || '')
                                  if (dateCmp !== 0) return dateCmp
                                  return parseTimeToMinutes(a.time || '') - parseTimeToMinutes(b.time || '')
                                }))
                                showToast('Event approved!')
                              } else {
                                showToast('Error approving event')
                              }
                            }}
                            className="flex-1 bg-emerald-500 text-white py-2 rounded-lg text-xs font-black tracking-wide uppercase"
                          >
                            Approve
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm(`Reject "${event.title}"? This will permanently delete it.`)) return
                              const { error } = await supabase.from('events').delete().eq('id', event.id)
                              if (!error) {
                                setPendingEvents(prev => prev.filter(e => e.id !== event.id))
                                showToast('Event rejected and deleted.')
                              } else {
                                showToast('Error rejecting event')
                              }
                            }}
                            className="flex-1 bg-red-500 text-white py-2 rounded-lg text-xs font-black tracking-wide uppercase"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Jobs Tab */}
            {activeTab === 'jobs' && (
              <>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="text-xl font-black tracking-tight font-display">Jobs Near {selectedTownName}</h2>
                    <p className="text-xs text-[#8a8778] font-medium mt-0.5">{displayJobs.filter(j => j.auto_scraped).length} auto-discovered 🤖, {displayJobs.filter(j => !j.auto_scraped).length} posted locally 📍</p>
                  </div>
                  <button
                    className={`${theme.accentTextClass} text-xs font-bold flex items-center gap-1 tracking-wide bg-white px-3 py-1.5 rounded-lg border border-[#e8e6e1]`}
                    style={{ boxShadow: '0 1px 3px rgba(26,26,46,0.06)' }}
                    onClick={() => {
                      if (!user) { setShowAuthModal(true); return }
                      setShowPostJobModal(true)
                      setPostJobSuccess(false)
                      setPostJobError('')
                      setPostJobForm({ title: '', company: '', type: 'Full-Time', pay: '', description: '', apply_url: '', location: '' })
                    }}
                  >
                    <Plus className="w-3.5 h-3.5" />Post
                  </button>
                </div>
                <div className="section-banner bg-emerald-50/80 border-emerald-200 mb-4 animate-fade-in-up">
                  <p className="text-xs font-medium text-[#8a8778]">
                    Local jobs are posted by employers. Auto-discovered jobs are sourced from public listings within 50 miles.
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
                  <div>
                    <h2 className="text-xl font-black tracking-tight font-display">Local Housing</h2>
                    <p className="text-xs text-[#8a8778] font-medium mt-0.5">Browse available rentals or post your property in minutes</p>
                  </div>
                  <button
                    onClick={() => {
                      if (!user) { setAuthMode('login'); setShowAuthModal(true); return }
                      if (isSubscriber || isAdmin) {
                        setPostHousingForm({ title: '', price: '', listing_type: 'rent', bedrooms: '', bathrooms: '', location: '', description: '', details: '', contact_name: '', contact_phone: '', contact_email: '', pets_allowed: false })
                        setPostHousingSuccess(false); setPostHousingError('')
                        setShowPostHousingModal(true)
                      } else {
                        setShowSubscribePrompt(true)
                      }
                    }}
                    className={`${theme.accentTextClass} text-xs font-bold flex items-center gap-1 tracking-wide bg-white px-3 py-1.5 rounded-lg border border-[#e8e6e1]`}
                    style={{ boxShadow: '0 1px 3px rgba(26,26,46,0.06)' }}
                  >
                    <Plus className="w-3.5 h-3.5" />Post
                  </button>
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
                      Inquire Now
                    </button>
                  </Card>
                ))}
              </>
            )}

            {/* Businesses Tab */}
            {activeTab === 'businesses' && (
              <>
                {/* COMMUNITY PARTNERS SECTION */}
                <div className="section-banner bg-red-50/70 border-red-200 mb-4 animate-fade-in-up">
                  <p className="text-sm font-bold text-gray-800"><span className="font-black text-red-600">Community Partners</span></p>
                  <p className="text-xs font-medium text-[#8a8778] mt-1">Proud sponsors of Go New Paper &mdash; Keeping this app free for our community</p>
                </div>

                {displayBusinesses.filter(b => b.tier === 'spotlight' || b.featured).map((b, idx) => (
                  <Card key={b.id} className={`cursor-pointer animate-fade-in-up stagger-${Math.min(idx + 1, 8)}`}>
                    <div className="flex items-start gap-4">
                      {b.logo_url ? (
                        <img src={b.logo_url} alt={b.name} className="w-14 h-14 rounded-xl object-contain bg-white p-1" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />
                      ) : (
                        <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl bg-blue-50">{b.logo_emoji}</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-[15px] font-bold tracking-tight">{b.name}</h3>
                          <span className="badge bg-red-50 text-red-700 border border-red-200">Community Partner</span>
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
                {/* FEATURED BUSINESSES SECTION */}
                <div className="section-banner bg-blue-50/70 border-blue-200 mb-4">
                  <p className="text-sm font-bold text-gray-800"><span className="font-black text-blue-600">Featured Businesses</span></p>
                  <p className="text-xs font-medium text-[#8a8778] mt-1">Highlighted local businesses and trusted services</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {displayBusinesses.filter(b => b.tier === 'card').map((b, idx) => (
                    <div key={b.id} className={`bg-white rounded-[14px] p-4 border-[1.5px] border-blue-100 card-hover animate-fade-in-up stagger-${Math.min(idx + 1, 8)}`} style={{ boxShadow: '0 1px 3px rgba(26,26,46,0.06)' }}>
                      <div className="flex items-center gap-3 mb-2">
                        {b.logo_url ? (
                          <img src={b.logo_url} alt={b.name} className="w-11 h-11 rounded-lg object-contain bg-white p-0.5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }} />
                        ) : (
                          <div className="w-11 h-11 rounded-lg flex items-center justify-center text-2xl bg-blue-50">{b.logo_emoji}</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold tracking-tight truncate">{b.name}</h3>
                          <span className="badge bg-blue-50 text-blue-600 border border-blue-200">{b.category}</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 font-medium mb-3 font-editorial italic">&quot;{b.tagline}&quot;</p>
                      <a
                        href={`tel:${b.phone}`}
                        className="btn-interest w-full bg-blue-600 text-white py-2 rounded-lg text-xs font-bold tracking-wide uppercase flex items-center justify-center gap-2"
                        style={{ boxShadow: '0 2px 6px rgba(37,99,235,0.25)' }}
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
                    <p><span className="font-bold text-blue-600">Featured Business</span> &mdash; <span className="font-bold text-emerald-700">$30/mo</span> or <span className="font-bold text-emerald-700">$250/yr</span> &mdash; Full card, website link, priority placement</p>
                    <p><span className="font-bold text-purple-600">Business Listing</span> &mdash; <span className="font-bold text-emerald-700">$15/mo</span> or <span className="font-bold text-emerald-700">$100/yr</span> &mdash; Compact card, click-to-call</p>
                  </div>
                  <button
                    onClick={() => { setBusinessForm(f => ({ ...f, townId: selectedTownId })); setBusinessSuccess(false); setBusinessError(''); setBusinessLogo(null); setBusinessLogoPreview(null); setShowBusinessModal(true) }}
                    className="btn-cta w-full bg-emerald-600 text-white py-3 rounded-xl text-sm font-bold tracking-wide flex items-center justify-center gap-2"
                    style={{ boxShadow: '0 2px 8px rgba(16,185,129,0.3)' }}
                  >
                    <span>🏪</span> List My Business
                  </button>
                </div>

                {/* ADMIN: Pending Business Submissions */}
                {isAdmin && pendingBusinesses.length > 0 && (
                  <div className="mt-6 border-2 border-emerald-300 rounded-2xl p-4 bg-emerald-50/50 animate-fade-in-up">
                    <h3 className="text-base font-black tracking-tight font-display text-emerald-800 mb-3">⏳ Pending Listings ({pendingBusinesses.length})</h3>
                    <div className="space-y-4">
                      {pendingBusinesses.map(biz => (
                        <div key={biz.id} className="bg-white rounded-xl p-4 border border-emerald-200 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-bold text-sm text-gray-900">{biz.name}</p>
                              <p className="text-xs text-gray-500">{biz.category} &bull; <span className={biz.tier === 'spotlight' ? 'text-blue-600 font-bold' : 'text-purple-600 font-bold'}>{biz.tier === 'spotlight' ? 'Featured Business $250/yr' : 'Business Listing $100/yr'}</span></p>
                            </div>
                            <span className="badge bg-amber-50 text-amber-700 border border-amber-200 text-[10px] whitespace-nowrap">Pending</span>
                          </div>
                          <p className="text-xs text-gray-500 italic">&quot;{biz.tagline}&quot;</p>
                          <div className="text-xs text-gray-500 space-y-0.5">
                            <p>📞 {biz.phone}</p>
                            {biz.contact_email && <p>✉️ {biz.contact_email}</p>}
                            {biz.contact_name && <p>👤 {biz.contact_name}</p>}
                            {biz.website && <p>🌐 {biz.website}</p>}
                            {biz.hours && <p>🕐 {biz.hours}</p>}
                          </div>
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={async () => {
                                const { error } = await supabase.from('businesses').update({ payment_status: 'active', featured: biz.tier === 'spotlight' }).eq('id', biz.id)
                                if (error) { showToast('Error: ' + error.message); return }
                                setPendingBusinesses(prev => prev.filter(b => b.id !== biz.id))
                                setBusinesses(prev => [...prev, { ...biz, payment_status: 'active', featured: biz.tier === 'spotlight' }])
                                showToast(`✅ "${biz.name}" is now live!`)
                              }}
                              className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-xs font-bold"
                            >✅ Activate</button>
                            <button
                              onClick={async () => {
                                if (!confirm(`Reject and delete "${biz.name}"?`)) return
                                const { error } = await supabase.from('businesses').delete().eq('id', biz.id)
                                if (error) { showToast('Error: ' + error.message); return }
                                setPendingBusinesses(prev => prev.filter(b => b.id !== biz.id))
                                showToast(`"${biz.name}" rejected and removed.`)
                              }}
                              className="flex-1 bg-red-50 text-red-600 border border-red-200 py-2 rounded-lg text-xs font-bold"
                            >❌ Reject</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
                    A new joke every day! Family-friendly and easy to share.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {dailyJokes.map((joke, index) => {
                    const jokeDate = new Date(); jokeDate.setDate(jokeDate.getDate() - index);
                    const label = index === 0 ? 'Today' : index === 1 ? 'Yesterday' : jokeDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    return (
                      <div key={joke.id} className={`bg-white rounded-[14px] overflow-hidden card-hover animate-fade-in-up stagger-${Math.min(index + 1, 8)} ${index === 0 ? 'border-[1.5px] border-amber-300' : 'border-[1.5px] border-[#e8e6e1]'}`} style={{ boxShadow: '0 1px 3px rgba(26,26,46,0.06)' }}>
                        <div className={`p-6 ${index === 0 ? 'bg-gradient-to-br from-amber-50/80 to-white' : 'bg-gradient-to-br from-gray-50/60 to-white'}`}>
                          <p className="text-lg font-bold text-gray-800 text-center">{joke.question}</p>
                          <p className="text-base font-medium text-amber-700 text-center mt-3 font-editorial italic">{joke.punchline}</p>
                        </div>
                        <div className="px-4 py-3 border-t border-[#e8e6e1]">
                          <div className="flex items-center justify-between">
                            <span className={`badge ${index === 0 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-gray-50 text-gray-500 border border-gray-200'}`}>{label}</span>
                            <span className="text-xs text-[#8a8778] font-medium">{label}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {dailyJokes.length === 0 && (
                  <div className="empty-state animate-fade-in-up">
                    <span className="empty-state-icon">😄</span>
                    <p className="empty-state-title">Jokes loading!</p>
                    <p className="empty-state-text">Check back in a moment for your daily laugh.</p>
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
                    Lost pets, garage sales, volunteer needs, and local announcements.
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
                    Support the organizations that make Lucas County strong. Donate directly!
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
                      <p className="text-sm text-gray-600 font-semibold mb-3 italic">{np.tagline}</p>
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
                    Find your people. Discover and join local organizations across Lucas County.
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
                      <p className="text-sm text-gray-600 font-semibold mb-3 italic">{club.tagline}</p>
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
                    Honoring those we&apos;ve lost and the lives that shaped our community.
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

            {/* Explore Tab */}
            {activeTab === 'explore' && (
              <>
                <div className="section-banner bg-teal-50/70 border-teal-200 mb-4 animate-fade-in-up">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Compass className="w-5 h-5 text-teal-600" />
                      <p className="text-sm font-black text-gray-800">Explore {selectedTownName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isAdmin && (
                        <button
                          className={`text-xs font-bold flex items-center gap-1 tracking-wide px-3 py-1.5 rounded-lg border transition-colors ${
                            editPinsMode
                              ? 'bg-amber-500 text-white border-amber-600'
                              : 'text-amber-700 bg-white border-amber-200 hover:bg-amber-50'
                          }`}
                          style={{ boxShadow: '0 1px 3px rgba(26,26,46,0.06)' }}
                          onClick={() => {
                            const entering = !editPinsMode
                            setEditPinsMode(entering)
                            if (entering && pinDropMode) {
                              setPinDropMode(false)
                              setDroppedPin(null)
                              if (droppedPinMarkerRef.current && leafletMapRef.current) {
                                leafletMapRef.current.removeLayer(droppedPinMarkerRef.current)
                                droppedPinMarkerRef.current = null
                              }
                            }
                          }}
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          {editPinsMode ? 'Done' : 'Edit Pins'}
                        </button>
                      )}
                      <button
                        className="text-teal-700 text-xs font-bold flex items-center gap-1 tracking-wide bg-white px-3 py-1.5 rounded-lg border border-teal-200"
                        style={{ boxShadow: '0 1px 3px rgba(26,26,46,0.06)' }}
                        onClick={() => {
                          if (!user) { setShowAuthModal(true); return }
                          if (editPinsMode) setEditPinsMode(false)
                          setPinDropMode(true)
                          setDroppedPin(null)
                          if (droppedPinMarkerRef.current && leafletMapRef.current) {
                            leafletMapRef.current.removeLayer(droppedPinMarkerRef.current)
                            droppedPinMarkerRef.current = null
                          }
                        }}
                      >
                        <Plus className="w-3.5 h-3.5" />Suggest
                      </button>
                    </div>
                  </div>
                  <p className="text-xs font-medium text-[#8a8778]">
                    Discover parks, trails, lakes, and landmarks across Lucas County. Tap a pin for details.
                  </p>
                </div>

                {/* Pin drop mode banner */}
                {pinDropMode && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3 animate-fade-in-up flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📍</span>
                      <div>
                        <p className="text-sm font-bold text-red-700">Tap the map to drop a pin</p>
                        <p className="text-xs text-red-500 font-medium">Choose the exact location of your spot</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setPinDropMode(false)
                        setDroppedPin(null)
                        if (droppedPinMarkerRef.current && leafletMapRef.current) {
                          leafletMapRef.current.removeLayer(droppedPinMarkerRef.current)
                          droppedPinMarkerRef.current = null
                        }
                      }}
                      className="text-xs font-bold text-red-600 bg-white px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* Edit pins mode banner (admin) */}
                {editPinsMode && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3 animate-fade-in-up flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">✏️</span>
                      <div>
                        <p className="text-sm font-bold text-amber-700">Edit Mode: Drag pins to reposition</p>
                        <p className="text-xs text-amber-500 font-medium">Changes save automatically</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setEditPinsMode(false)}
                      className="text-xs font-bold text-amber-600 bg-white px-3 py-1.5 rounded-lg border border-amber-200 hover:bg-amber-50 transition-colors"
                    >
                      Done
                    </button>
                  </div>
                )}

                {/* Category filter pills */}
                <div className="flex gap-2 overflow-x-auto hide-scrollbar mb-3 animate-fade-in-up" style={{ WebkitOverflowScrolling: 'touch' }}>
                  {[
                    { key: 'all', label: '🗺️ All', color: 'gray' },
                    { key: 'state_park', label: '🏞️ State Parks', color: 'green' },
                    { key: 'lake', label: '🎣 Lakes', color: 'blue' },
                    { key: 'trail', label: '🚴 Trails', color: 'orange' },
                    { key: 'recreation', label: '🎯 Recreation', color: 'purple' },
                    { key: 'park', label: '🌳 City Parks', color: 'emerald' },
                  ].map(cat => (
                    <button
                      key={cat.key}
                      onClick={() => setExploreFilter(cat.key)}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                        exploreFilter === cat.key
                          ? 'bg-teal-600 text-white shadow-md'
                          : 'bg-white border border-gray-200 text-gray-600 hover:border-teal-300'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Map container */}
                <div className="relative rounded-[14px] overflow-hidden border-[1.5px] border-[#e8e6e1] shadow-md animate-fade-in-up mb-3" style={{ height: '55vh', minHeight: '300px' }}>
                  <div id="explore-map" style={{ width: '100%', height: '100%' }} />
                </div>

                {/* Admin: Pending Spots Approval Panel */}
                {isAdmin && pendingSpots.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-3 animate-fade-in-up">
                    <h3 className="text-base font-black tracking-tight font-display text-amber-800 mb-3">📍 Pending Spots ({pendingSpots.length})</h3>
                    <div className="space-y-2">
                      {pendingSpots.map(spot => (
                        <div key={spot.id} className="bg-white rounded-lg p-3 border border-amber-100">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm text-gray-900">{spot.emoji} {spot.name}</p>
                              <p className="text-xs text-gray-500 font-medium">{EXPLORE_CATEGORY_LABELS[spot.category]} &bull; {spot.address}</p>
                              <p className="text-xs text-gray-600 mt-1">{spot.summary}</p>
                              <p className="text-[10px] text-gray-400 mt-1">Coords: {spot.lat.toFixed(4)}, {spot.lng.toFixed(4)}</p>
                            </div>
                            <div className="flex gap-1.5 flex-shrink-0">
                              <button
                                onClick={async () => {
                                  await supabase.from('explore_locations').update({ is_active: true }).eq('id', spot.id)
                                  setPendingSpots(prev => prev.filter(s => s.id !== spot.id))
                                  // Re-fetch explore locations to show the new spot on map
                                  const { data } = await supabase.from('explore_locations').select('*').eq('town_id', selectedTownId).eq('is_active', true).order('display_order', { ascending: true })
                                  if (data) setExploreLocations(data)
                                  showToast('Spot approved!')
                                }}
                                className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-200 transition-colors"
                              >
                                Approve
                              </button>
                              <button
                                onClick={async () => {
                                  await supabase.from('explore_locations').delete().eq('id', spot.id)
                                  setPendingSpots(prev => prev.filter(s => s.id !== spot.id))
                                  showToast('Spot rejected')
                                }}
                                className="px-3 py-1.5 bg-red-100 text-red-600 rounded-lg text-xs font-bold hover:bg-red-200 transition-colors"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Location cards list */}
                <div className="space-y-2 animate-fade-in-up">
                  <p className="text-xs font-bold text-[#8a8778] uppercase tracking-wider px-1">
                    {exploreFilter === 'all' ? 'All Locations' : EXPLORE_CATEGORY_LABELS[exploreFilter] || 'Locations'} ({filteredExploreLocations.length})
                  </p>
                  {filteredExploreLocations.map((loc, idx) => (
                    <button
                      key={loc.id}
                      onClick={() => {
                        setSelectedExploreLocation(loc)
                        if (leafletMapRef.current) {
                          leafletMapRef.current.flyTo([loc.lat, loc.lng], 15, { duration: 0.5 })
                        }
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                      }}
                      className={`w-full text-left bg-white rounded-[14px] p-4 border-[1.5px] border-[#e8e6e1] card-hover animate-fade-in-up stagger-${Math.min(idx + 1, 8)} flex items-center gap-3`}
                      style={{ boxShadow: '0 1px 3px rgba(26,26,46,0.06)' }}
                    >
                      {loc.image_url && loc.image_url.startsWith('http') ? (
                        <img
                          src={loc.image_url}
                          alt={loc.name}
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0 border-2 border-white shadow-sm"
                        />
                      ) : (
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                          style={{ backgroundColor: `${EXPLORE_CATEGORY_COLORS[loc.category]}15` }}
                        >
                          {loc.emoji}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-gray-900 truncate">{loc.name}</p>
                        <p className="text-xs text-[#8a8778] font-medium truncate">{loc.address}</p>
                      </div>
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: EXPLORE_CATEGORY_COLORS[loc.category] }}
                      />
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Affiliates Tab */}
            {activeTab === 'affiliates' && (
              <>
                <div className="section-banner bg-emerald-50/70 border-emerald-200 mb-4 animate-fade-in-up">
                  <div className="flex items-center gap-2 mb-1.5">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                    <p className="text-sm font-black text-gray-800">Discounts & Deals</p>
                  </div>
                  <p className="text-xs font-medium text-[#8a8778]">
                    Local deals and partner offers. Some links support the app at no extra cost to you.
                  </p>
                </div>

                <div className="mb-4">
                  {displayAffiliates.map(aff => {
                    const isTrading = aff.category === 'Trading' || aff.category === 'Broker'
                    const isLocal = aff.category === 'Local' || aff.category === 'Restaurant' || aff.category === 'Dining'
                    const pillLabel = isLocal ? 'Local' : 'Online'
                    const pillClass = isLocal ? 'bg-green-100 text-green-800 border-green-200' : 'bg-blue-100 text-blue-800 border-blue-200'
                    const btnText = isTrading ? 'Get Offer' : 'View Deal'
                    const btnClass = isTrading
                      ? `${theme.accentClass} text-white`
                      : 'bg-purple-600 text-white'
                    const btnShadow = isTrading
                      ? '0 2px 8px rgba(0,0,0,0.12)'
                      : '0 2px 8px rgba(147,51,234,0.25)'
                    return (
                      <Card key={aff.id} className="hover:shadow-xl transition-all cursor-pointer mb-3">
                        <div className="flex items-start gap-4" onClick={() => trackAffiliateClick(aff)}>
                          <div className="text-4xl">{aff.logo_emoji}</div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="text-lg font-black tracking-tight">{aff.name}</h3>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${pillClass}`}>{pillLabel}</span>
                            </div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-black ${isTrading ? 'bg-red-100 text-red-700' : 'bg-purple-100 text-purple-800'}`}>{aff.commission}</span>
                            </div>
                            <p className="text-sm text-gray-600 font-semibold mb-3">{aff.category === 'Trading' ? 'Trading tools and education' : aff.category === 'Health' ? 'Daily wellness and supplements' : aff.category}</p>
                            <button className={`btn-interest btn-cta w-full ${btnClass} py-2.5 rounded-xl text-sm font-bold tracking-wide uppercase`} style={{ boxShadow: btnShadow }}>
                              {btnText} &rarr;
                            </button>
                          </div>
                        </div>
                      </Card>
                    )
                  })}
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
          <a href="/about" className="underline hover:text-gray-600 transition-colors">&copy; 2026 Go New Paper</a>
        </div>
      </main>

      {/* Bottom Navigation — Frosted Glass */}
      <nav className="fixed bottom-0 left-0 right-0 bottom-nav-glass z-40 safe-bottom">
        <div
          className="flex p-1.5 overflow-x-auto hide-scrollbar"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                // Auto-scroll the clicked tab into view on mobile
                const el = document.getElementById(`nav-${tab.id}`)
                el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
              }}
              id={`nav-${tab.id}`}
              className={`flex flex-col items-center gap-0.5 py-2 px-1 transition-all rounded-xl ${
                activeTab === tab.id ? `${theme.accentTextClass}` : 'text-gray-400'
              }`}
              style={{ minWidth: '62px', flex: '1 0 auto' }}
            >
              <tab.icon className="w-5 h-5" strokeWidth={activeTab === tab.id ? 2.5 : 1.5} />
              <span className={`text-[8px] font-bold tracking-wider uppercase ${activeTab === tab.id ? 'opacity-100' : 'opacity-60'}`}>{tab.label}</span>
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

                {authMode === 'signup' && (
                  <label className="flex items-start gap-2.5 cursor-pointer bg-amber-50 border border-amber-200 rounded-lg p-3 -mt-1">
                    <input
                      type="checkbox"
                      checked={wantNotifications}
                      onChange={(e) => setWantNotifications(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-red-500 flex-shrink-0"
                    />
                    <span className="text-xs text-gray-700 leading-relaxed">
                      <span className="font-bold text-gray-900">🔔 Send me push notifications</span> about local events, jobs, and community updates
                    </span>
                  </label>
                )}

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
                      <option value="Arts & Culture">Arts & Culture</option>
                      <option value="Civic & Community">Civic & Community</option>
                      <option value="Faith-Based">Faith-Based</option>
                      <option value="Hobby & Interest">Hobby & Interest</option>
                      <option value="Sports & Recreation">Sports & Recreation</option>
                      <option value="Veterans">Veterans</option>
                      <option value="Youth">Youth</option>
                      <option value="Education">Education</option>
                      <option value="Health & Wellness">Health & Wellness</option>
                      <option value="Social Services">Social Services</option>
                      <option value="Environment">Environment</option>
                      <option value="Animal Welfare">Animal Welfare</option>
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

      {/* Community Dashboard Modal */}
      {showDashboard && (
        <div className="fixed inset-0 modal-overlay z-50 flex items-center justify-center p-4" onClick={() => setShowDashboard(false)}>
          <div className="bg-white w-full max-w-lg rounded-[20px] p-6 max-h-[85vh] overflow-y-auto" style={{ boxShadow: '0 16px 50px rgba(26,26,46,0.2)' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <div>
                <h2 className="text-xl font-black tracking-tight font-display">Community Dashboard</h2>
                <p className="text-xs text-[#8a8778] font-medium mt-0.5">{dashboardData?.date || 'Loading...'}</p>
              </div>
              <button onClick={() => setShowDashboard(false)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {dashboardLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : dashboardData ? (
              <div className="space-y-3">
                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                    <p className="text-2xl font-black text-blue-700">{dashboardData.users?.total_registered || 0}</p>
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Registered Users</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                    <p className="text-2xl font-black text-green-700">{dashboardData.engagement?.total_event_interests || 0}</p>
                    <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Event Interests</p>
                  </div>
                </div>

                {/* Events Section */}
                <div className="bg-white border-[1.5px] border-[#e8e6e1] rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-4 h-4 text-red-500" />
                    <p className="text-sm font-black">Events</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-lg font-black text-gray-900">{dashboardData.events?.today || 0}</p>
                      <p className="text-[10px] font-bold text-[#8a8778]">TODAY</p>
                    </div>
                    <div>
                      <p className="text-lg font-black text-gray-900">{dashboardData.events?.this_month || 0}</p>
                      <p className="text-[10px] font-bold text-[#8a8778]">THIS MONTH</p>
                    </div>
                    <div>
                      <p className="text-lg font-black text-gray-900">{dashboardData.events?.total_upcoming || 0}</p>
                      <p className="text-[10px] font-bold text-[#8a8778]">UPCOMING</p>
                    </div>
                  </div>
                </div>

                {/* Content Counts */}
                <div className="bg-white border-[1.5px] border-[#e8e6e1] rounded-xl p-4">
                  <p className="text-sm font-black mb-3">Content Overview</p>
                  <div className="space-y-2">
                    {[
                      { label: 'Active Jobs', value: dashboardData.jobs?.total_active, icon: '💼', color: 'text-blue-600' },
                      { label: 'Active Businesses', value: dashboardData.businesses?.total_active, icon: '🏪', color: 'text-purple-600' },
                      { label: 'Housing Listings', value: dashboardData.housing?.total_active, icon: '🏠', color: 'text-green-600' },
                      { label: 'Non-Profits', value: dashboardData.nonprofits?.total, icon: '❤️', color: 'text-red-600' },
                      { label: 'Clubs', value: dashboardData.clubs?.total, icon: '👥', color: 'text-indigo-600' },
                      { label: 'Community Posts', value: dashboardData.community?.total_posts, icon: '💬', color: 'text-amber-600' },
                      { label: 'Memorials Listed', value: dashboardData.celebrations?.currently_listed, icon: '🕊️', color: 'text-purple-600' },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{item.icon}</span>
                          <span className="text-sm font-semibold text-gray-700">{item.label}</span>
                        </div>
                        <span className={`text-sm font-black ${item.color}`}>{item.value || 0}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="text-[10px] text-center text-[#8a8778] font-medium pt-1">
                  Powered by Go New Paper &bull; Data refreshes on each view
                </p>
              </div>
            ) : (
              <p className="text-center text-gray-400 py-8 font-medium">Failed to load dashboard data</p>
            )}
          </div>
        </div>
      )}

      {/* Explore Location Detail Modal */}
      {selectedExploreLocation && (
        <div className="fixed inset-0 modal-overlay z-50 flex items-end" onClick={() => setSelectedExploreLocation(null)}>
          <div
            className="bg-white w-full rounded-t-[24px] max-h-[75vh] overflow-y-auto animate-slide-up"
            style={{ boxShadow: '0 -8px 40px rgba(26,26,46,0.15)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Location image (if available) */}
            {selectedExploreLocation.image_url && selectedExploreLocation.image_url.startsWith('http') && (
              <div className="relative w-full h-44 overflow-hidden rounded-t-[24px]">
                <img
                  src={selectedExploreLocation.image_url}
                  alt={selectedExploreLocation.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              </div>
            )}

            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
                    style={{ backgroundColor: `${EXPLORE_CATEGORY_COLORS[selectedExploreLocation.category]}15` }}
                  >
                    {selectedExploreLocation.emoji}
                  </div>
                  <div>
                    <h2 className="text-lg font-black tracking-tight font-display">{selectedExploreLocation.name}</h2>
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: EXPLORE_CATEGORY_COLORS[selectedExploreLocation.category] }}
                    >
                      {EXPLORE_CATEGORY_LABELS[selectedExploreLocation.category]}
                    </span>
                  </div>
                </div>
                <button onClick={() => setSelectedExploreLocation(null)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="flex items-start gap-2 mb-3">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-600 font-medium">{selectedExploreLocation.address}</p>
              </div>

              <p className="text-sm text-gray-700 font-medium leading-relaxed mb-5">
                {selectedExploreLocation.summary}
              </p>

              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${selectedExploreLocation.lat},${selectedExploreLocation.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`w-full ${theme.accentClass} text-white py-3 rounded-xl font-black tracking-wide shadow-lg hover:shadow-xl transition-all uppercase flex items-center justify-center gap-2`}
              >
                <Navigation className="w-4 h-4" />
                GET DIRECTIONS
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Submit a Spot Modal */}
      {showSubmitSpotModal && (
        <div className="fixed inset-0 modal-overlay z-50 flex items-center justify-center p-4" onClick={() => { setShowSubmitSpotModal(false) }}>
          <div className="bg-white w-full max-w-md rounded-[20px] p-6 max-h-[90vh] overflow-y-auto" style={{ boxShadow: '0 16px 50px rgba(26,26,46,0.2)' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black tracking-tight font-display">
                {submitSpotSuccess ? 'Submitted!' : 'Suggest a Spot'}
              </h2>
              <button onClick={() => setShowSubmitSpotModal(false)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            {submitSpotSuccess ? (
              <div className="text-center py-6">
                <div className="text-6xl mb-4">📍</div>
                <p className="text-lg font-black mb-2">Spot Submitted!</p>
                <p className="text-sm text-gray-600 font-semibold mb-6">
                  It will appear on the Explore map after review by our team. Thanks for helping us map {selectedTownName}!
                </p>
                <button
                  onClick={() => { setShowSubmitSpotModal(false); setDroppedPin(null) }}
                  className="w-full bg-teal-600 text-white py-3 rounded-lg font-black tracking-wide shadow-lg"
                >
                  CLOSE
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitSpot}>
                <div className="space-y-4">
                  {/* Pinned location indicator */}
                  {droppedPin && (
                    <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 flex items-center gap-2">
                      <span className="text-lg">📍</span>
                      <div>
                        <p className="text-xs font-bold text-teal-700">Pin Dropped</p>
                        <p className="text-xs text-teal-600 font-medium">{droppedPin.lat.toFixed(4)}, {droppedPin.lng.toFixed(4)}</p>
                      </div>
                    </div>
                  )}

                  {/* Spot Name */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Spot Name *</label>
                    <input
                      type="text"
                      value={submitSpotForm.name}
                      onChange={(e) => setSubmitSpotForm(f => ({...f, name: e.target.value}))}
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-teal-500 focus:outline-none font-semibold"
                      placeholder="e.g. Lake Morris Boat Ramp"
                      required
                      maxLength={100}
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Category *</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { key: 'park', label: 'City Park', emoji: '🌳' },
                        { key: 'lake', label: 'Lake', emoji: '🎣' },
                        { key: 'trail', label: 'Trail', emoji: '🚴' },
                        { key: 'recreation', label: 'Recreation', emoji: '🎯' },
                        { key: 'state_park', label: 'State Park', emoji: '🏞️' },
                      ].map(cat => (
                        <button
                          type="button"
                          key={cat.key}
                          onClick={() => setSubmitSpotForm(f => ({...f, category: cat.key, emoji: cat.emoji}))}
                          className={`px-3 py-2 rounded-lg text-xs font-bold border-2 transition-all ${
                            submitSpotForm.category === cat.key
                              ? 'border-teal-500 bg-teal-50 text-teal-700'
                              : 'border-gray-200 text-gray-500 hover:border-teal-300'
                          }`}
                        >
                          {cat.emoji} {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Address <span className="text-gray-400 font-medium">(optional)</span></label>
                    <input
                      type="text"
                      value={submitSpotForm.address}
                      onChange={(e) => setSubmitSpotForm(f => ({...f, address: e.target.value}))}
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-teal-500 focus:outline-none font-semibold"
                      placeholder="e.g. 21806 483rd Ln, Chariton, IA"
                      maxLength={200}
                    />
                  </div>

                  {/* Summary */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Description *</label>
                    <textarea
                      value={submitSpotForm.summary}
                      onChange={(e) => setSubmitSpotForm(f => ({...f, summary: e.target.value}))}
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-teal-500 focus:outline-none font-semibold resize-none"
                      placeholder="What makes this spot special? What can people do here?"
                      rows={3}
                      required
                      maxLength={500}
                    />
                  </div>

                  {/* Error */}
                  {submitSpotError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-xs text-red-600 font-bold">{submitSpotError}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitSpotLoading}
                    className={`w-full bg-teal-600 text-white py-3 rounded-xl font-black tracking-wide shadow-lg hover:shadow-xl transition-all uppercase flex items-center justify-center gap-2 ${submitSpotLoading ? 'opacity-50' : ''}`}
                  >
                    {submitSpotLoading ? 'Submitting...' : 'SUBMIT SPOT'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Post Event Modal */}
      {showPostEventModal && (
        <div className="fixed inset-0 modal-overlay z-50 flex items-center justify-center p-4" onClick={() => setShowPostEventModal(false)}>
          <div className="bg-white w-full max-w-md rounded-[20px] p-6 max-h-[90vh] overflow-y-auto" style={{ boxShadow: '0 16px 50px rgba(26,26,46,0.2)' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black tracking-tight font-display">
                {postEventSuccess ? 'Submitted!' : 'Submit an Event'}
              </h2>
              <button onClick={() => setShowPostEventModal(false)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            {postEventSuccess ? (
              <div className="text-center py-6">
                <div className="text-6xl mb-4">✅</div>
                <p className="text-lg font-black mb-2">Event Submitted!</p>
                <p className="text-sm text-gray-600 font-semibold mb-6">
                  It will appear in the Events tab after review by our team.
                </p>
                <button
                  onClick={() => setShowPostEventModal(false)}
                  className={`w-full ${theme.accentClass} text-white py-3 rounded-lg font-black tracking-wide shadow-lg`}
                >
                  CLOSE
                </button>
              </div>
            ) : (
              <form onSubmit={handlePostEventSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Event Name *</label>
                    <input type="text" value={postEventForm.title} onChange={(e) => setPostEventForm(f => ({...f, title: e.target.value}))} className={`w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-red-500 focus:outline-none font-semibold`} placeholder="e.g. Chariton Farmers Market" required maxLength={100} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Date *</label>
                      <input type="date" value={postEventForm.date} onChange={(e) => setPostEventForm(f => ({...f, date: e.target.value}))} className={`w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-red-500 focus:outline-none font-semibold`} required />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Time</label>
                      <input type="time" value={postEventForm.time} onChange={(e) => setPostEventForm(f => ({...f, time: e.target.value}))} className={`w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-red-500 focus:outline-none font-semibold`} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Location</label>
                    <input type="text" value={postEventForm.location} onChange={(e) => setPostEventForm(f => ({...f, location: e.target.value}))} className={`w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-red-500 focus:outline-none font-semibold`} placeholder={`e.g. Town Square, ${selectedTownName} (optional)`} maxLength={100} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Category</label>
                      <select value={postEventForm.category} onChange={(e) => setPostEventForm(f => ({...f, category: e.target.value}))} className={`w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-red-500 focus:outline-none font-semibold`}>
                        <option value="📅">📅 General</option>
                        <option value="🎵">🎵 Music</option>
                        <option value="🏈">🏈 Sports</option>
                        <option value="🎨">🎨 Arts</option>
                        <option value="🏛️">🏛️ Civic</option>
                        <option value="🎉">🎉 Festival</option>
                        <option value="🍽️">🍽️ Food</option>
                        <option value="🤝">🤝 Volunteer</option>
                        <option value="🎬">🎬 Movie</option>
                        <option value="🙏">🙏 Faith</option>
                        <option value="👶">👶 Kids</option>
                        <option value="📚">📚 Education</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Price</label>
                      <input type="text" value={postEventForm.price} onChange={(e) => setPostEventForm(f => ({...f, price: e.target.value}))} className={`w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-red-500 focus:outline-none font-semibold`} placeholder="Free" maxLength={30} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                    <textarea value={postEventForm.description} onChange={(e) => setPostEventForm(f => ({...f, description: e.target.value}))} className={`w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-red-500 focus:outline-none font-semibold`} placeholder="Tell people more about this event (optional)" rows={3} maxLength={500} />
                  </div>

                  {/* Event Sponsor Section */}
                  <div className="bg-amber-50/60 border border-amber-200 rounded-lg p-3">
                    <p className="text-xs font-bold text-amber-800 mb-2 flex items-center gap-1">
                      <Star className="w-3.5 h-3.5" /> Event Sponsor (optional)
                    </p>
                    <div className="space-y-2">
                      <input type="text" value={postEventForm.sponsor_name} onChange={(e) => setPostEventForm(f => ({...f, sponsor_name: e.target.value}))} className="w-full px-3 py-2 rounded-lg border-2 border-amber-200 focus:border-amber-500 focus:outline-none font-semibold text-sm" placeholder="Sponsor business name" maxLength={100} />
                      <input type="url" value={postEventForm.sponsor_logo_url} onChange={(e) => setPostEventForm(f => ({...f, sponsor_logo_url: e.target.value}))} className="w-full px-3 py-2 rounded-lg border-2 border-amber-200 focus:border-amber-500 focus:outline-none font-semibold text-sm" placeholder="Sponsor logo URL (https://...)" />
                    </div>
                    <p className="text-[10px] text-amber-600 mt-1.5">Sponsor logo will appear on the event card. Contact us for sponsorship info!</p>
                  </div>

                  <p className="text-xs text-[#8a8778] font-medium text-center">Events are reviewed before appearing publicly. Thank you for contributing to {selectedTownName}!</p>

                  <button type="submit" disabled={postEventLoading} className={`w-full ${theme.accentClass} text-white py-3 rounded-lg font-black tracking-wide shadow-lg hover:shadow-xl transition-all uppercase disabled:opacity-50`}>
                    {postEventLoading ? 'SUBMITTING...' : 'SUBMIT EVENT'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Edit Event Modal — organizer can update date/time/location or cancel, with push notification */}
      {editingEvent && (
        <div className="fixed inset-0 modal-overlay z-50 flex items-center justify-center p-4" onClick={() => setEditingEvent(null)}>
          <div className="bg-white w-full max-w-md rounded-[20px] p-6 max-h-[90vh] overflow-y-auto" style={{ boxShadow: '0 16px 50px rgba(26,26,46,0.2)' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-black tracking-tight font-display">Edit Event</h2>
              <button onClick={() => setEditingEvent(null)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <p className="text-xs text-[#8a8778] font-semibold mb-4">{editingEvent.title}</p>

            <form onSubmit={handleEditEventSubmit}>
              <div className="space-y-4">
                {editEventError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 font-semibold">{editEventError}</div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Date</label>
                    <input type="date" value={editEventForm.date} onChange={(e) => setEditEventForm(f => ({...f, date: e.target.value}))} disabled={editEventForm.cancelled} className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-red-500 focus:outline-none font-semibold disabled:bg-gray-50 disabled:text-gray-400" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Time</label>
                    <input type="time" value={editEventForm.time} onChange={(e) => setEditEventForm(f => ({...f, time: e.target.value}))} disabled={editEventForm.cancelled} className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-red-500 focus:outline-none font-semibold disabled:bg-gray-50 disabled:text-gray-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Location</label>
                  <input type="text" value={editEventForm.location} onChange={(e) => setEditEventForm(f => ({...f, location: e.target.value}))} disabled={editEventForm.cancelled} className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-red-500 focus:outline-none font-semibold disabled:bg-gray-50 disabled:text-gray-400" maxLength={100} />
                </div>

                <label className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editEventForm.cancelled}
                    onChange={(e) => setEditEventForm(f => ({...f, cancelled: e.target.checked}))}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-bold text-red-800">Cancel this event</span>
                </label>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Notification Message</label>
                  <textarea
                    value={editEventMessage}
                    onChange={(e) => { setEditEventMessage(e.target.value); setEditEventMessageDirty(true) }}
                    rows={3}
                    maxLength={240}
                    placeholder="What should interested people know? e.g. 'Moved indoors due to weather — now at the City Hall basement.'"
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-red-500 focus:outline-none font-semibold text-sm"
                  />
                  <p className="text-[11px] text-[#8a8778] mt-1">{editEventMessageDirty ? 'Custom message' : 'Auto-generated from changes — feel free to edit'} · {editEventMessage.length}/240</p>
                </div>

                <p className="text-xs text-[#8a8778] font-medium text-center">Everyone marked Interested in this event will get a push notification.</p>

                <button type="submit" disabled={editEventLoading} className={`w-full ${theme.accentClass} text-white py-3 rounded-lg font-black tracking-wide shadow-lg hover:shadow-xl transition-all uppercase disabled:opacity-50`}>
                  {editEventLoading ? 'SAVING...' : (editEventForm.cancelled ? 'CANCEL EVENT & NOTIFY' : 'SAVE & NOTIFY')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Post Job Modal */}
      {showPostJobModal && (
        <div className="fixed inset-0 modal-overlay z-50 flex items-center justify-center p-4" onClick={() => setShowPostJobModal(false)}>
          <div className="bg-white w-full max-w-md rounded-[20px] p-6 max-h-[90vh] overflow-y-auto" style={{ boxShadow: '0 16px 50px rgba(26,26,46,0.2)' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black tracking-tight font-display">
                {postJobSuccess ? 'Posted!' : 'Post a Job'}
              </h2>
              <button onClick={() => setShowPostJobModal(false)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            {postJobSuccess ? (
              <div className="text-center py-6">
                <div className="text-6xl mb-4">✅</div>
                <p className="text-lg font-black mb-2">Job Posted!</p>
                <p className="text-sm text-gray-600 font-semibold mb-6">
                  Your job listing is now live in the Jobs tab. Good luck finding the right candidate!
                </p>
                <button
                  onClick={() => setShowPostJobModal(false)}
                  className={`w-full ${theme.accentClass} text-white py-3 rounded-lg font-black tracking-wide shadow-lg`}
                >
                  CLOSE
                </button>
              </div>
            ) : (
              <form onSubmit={handlePostJobSubmit}>
                <div className="space-y-4">
                  {postJobError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 font-semibold">{postJobError}</div>
                  )}

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Job Title *</label>
                    <input type="text" value={postJobForm.title} onChange={(e) => setPostJobForm(f => ({...f, title: e.target.value}))} className={`w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-red-500 focus:outline-none font-semibold`} placeholder="e.g. Line Cook, Office Manager" required maxLength={100} />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Company Name *</label>
                    <input type="text" value={postJobForm.company} onChange={(e) => setPostJobForm(f => ({...f, company: e.target.value}))} className={`w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-red-500 focus:outline-none font-semibold`} placeholder="e.g. Hy-Vee, City of Chariton" required maxLength={100} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Job Type</label>
                      <select value={postJobForm.type} onChange={(e) => setPostJobForm(f => ({...f, type: e.target.value}))} className={`w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-red-500 focus:outline-none font-semibold`}>
                        <option value="Full-Time">Full-Time</option>
                        <option value="Part-Time">Part-Time</option>
                        <option value="Contract">Contract</option>
                        <option value="Seasonal">Seasonal</option>
                        <option value="Internship">Internship</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Pay/Salary</label>
                      <input type="text" value={postJobForm.pay} onChange={(e) => setPostJobForm(f => ({...f, pay: e.target.value}))} className={`w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-red-500 focus:outline-none font-semibold`} placeholder="e.g. $15/hr, $40k/yr" maxLength={30} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Location</label>
                    <input type="text" value={postJobForm.location} onChange={(e) => setPostJobForm(f => ({...f, location: e.target.value}))} className={`w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-red-500 focus:outline-none font-semibold`} placeholder={`${selectedTownName} (optional)`} maxLength={100} />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Apply URL</label>
                    <input type="url" value={postJobForm.apply_url} onChange={(e) => setPostJobForm(f => ({...f, apply_url: e.target.value}))} className={`w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-red-500 focus:outline-none font-semibold`} placeholder="https://... (optional link to apply)" />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                    <textarea value={postJobForm.description} onChange={(e) => setPostJobForm(f => ({...f, description: e.target.value}))} className={`w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-red-500 focus:outline-none font-semibold`} placeholder="Tell applicants more about this position (optional)" rows={3} maxLength={500} />
                  </div>

                  <p className="text-xs text-[#8a8778] font-medium text-center">Your job listing will appear immediately in the Jobs tab. Thank you for posting to {selectedTownName}!</p>

                  <button type="submit" disabled={postJobLoading} className={`w-full ${theme.accentClass} text-white py-3 rounded-lg font-black tracking-wide shadow-lg hover:shadow-xl transition-all uppercase disabled:opacity-50`}>
                    {postJobLoading ? 'POSTING...' : 'POST JOB'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Post Housing Modal */}
      {showPostHousingModal && (
        <div className="fixed inset-0 modal-overlay z-50 flex items-center justify-center p-4" onClick={() => setShowPostHousingModal(false)}>
          <div className="bg-white w-full max-w-md rounded-[20px] p-6 max-h-[90vh] overflow-y-auto" style={{ boxShadow: '0 16px 50px rgba(26,26,46,0.2)' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black tracking-tight font-display">
                {postHousingSuccess ? 'Posted!' : 'Post a Listing'}
              </h2>
              <button onClick={() => setShowPostHousingModal(false)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            {postHousingSuccess ? (
              <div className="text-center py-6">
                <div className="text-6xl mb-4">🏠</div>
                <p className="text-lg font-black mb-2">Listing Posted!</p>
                <p className="text-sm text-gray-600 font-semibold mb-6">
                  Your housing listing is now live in the Housing tab.
                </p>
                <button
                  onClick={() => setShowPostHousingModal(false)}
                  className={`w-full ${theme.accentClass} text-white py-3 rounded-lg font-black tracking-wide shadow-lg`}
                >
                  CLOSE
                </button>
              </div>
            ) : (
              <form onSubmit={handlePostHousingSubmit}>
                <div className="space-y-4">
                  {postHousingError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 font-semibold">{postHousingError}</div>
                  )}

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Title *</label>
                    <input type="text" value={postHousingForm.title} onChange={(e) => setPostHousingForm(f => ({...f, title: e.target.value}))} className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-red-500 focus:outline-none font-semibold" placeholder="e.g. 2BR Apartment, 3BR House" required maxLength={100} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Type</label>
                      <select value={postHousingForm.listing_type} onChange={(e) => setPostHousingForm(f => ({...f, listing_type: e.target.value as 'rent' | 'sale' | 'room'}))} className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-red-500 focus:outline-none font-semibold">
                        <option value="rent">For Rent</option>
                        <option value="sale">For Sale</option>
                        <option value="room">Room</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Price *</label>
                      <input type="text" value={postHousingForm.price} onChange={(e) => setPostHousingForm(f => ({...f, price: e.target.value}))} className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-red-500 focus:outline-none font-semibold" placeholder="e.g. $550/mo, $125k" required maxLength={30} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Bedrooms</label>
                      <input type="number" min="0" max="20" value={postHousingForm.bedrooms} onChange={(e) => setPostHousingForm(f => ({...f, bedrooms: e.target.value}))} className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-red-500 focus:outline-none font-semibold" placeholder="e.g. 2" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Bathrooms</label>
                      <input type="number" min="0" max="20" value={postHousingForm.bathrooms} onChange={(e) => setPostHousingForm(f => ({...f, bathrooms: e.target.value}))} className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-red-500 focus:outline-none font-semibold" placeholder="e.g. 1" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Location *</label>
                    <input type="text" value={postHousingForm.location} onChange={(e) => setPostHousingForm(f => ({...f, location: e.target.value}))} className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-red-500 focus:outline-none font-semibold" placeholder="e.g. Downtown, North side" required maxLength={100} />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                    <textarea value={postHousingForm.description} onChange={(e) => setPostHousingForm(f => ({...f, description: e.target.value}))} className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-red-500 focus:outline-none font-semibold" placeholder="Describe the property (optional)" rows={3} maxLength={500} />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Details/Amenities</label>
                    <input type="text" value={postHousingForm.details} onChange={(e) => setPostHousingForm(f => ({...f, details: e.target.value}))} className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-red-500 focus:outline-none font-semibold" placeholder="e.g. Updated kitchen, parking, laundry" maxLength={200} />
                  </div>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={postHousingForm.pets_allowed} onChange={(e) => setPostHousingForm(f => ({...f, pets_allowed: e.target.checked}))} className="w-4 h-4 accent-red-500" />
                    <span className="text-sm font-bold text-gray-700">Pets Allowed</span>
                  </label>

                  <div className="border-t pt-4 mt-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Contact Info</p>
                    <div className="space-y-3">
                      <input type="text" value={postHousingForm.contact_name} onChange={(e) => setPostHousingForm(f => ({...f, contact_name: e.target.value}))} className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-red-500 focus:outline-none font-semibold" placeholder="Contact name (optional)" maxLength={100} />
                      <input type="tel" value={postHousingForm.contact_phone} onChange={(e) => setPostHousingForm(f => ({...f, contact_phone: e.target.value}))} className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-red-500 focus:outline-none font-semibold" placeholder="Phone number *" maxLength={20} />
                      <input type="email" value={postHousingForm.contact_email} onChange={(e) => setPostHousingForm(f => ({...f, contact_email: e.target.value}))} className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-red-500 focus:outline-none font-semibold" placeholder="Email (optional)" maxLength={100} />
                    </div>
                  </div>

                  <p className="text-xs text-[#8a8778] font-medium text-center">Free housing posts for Go New Paper subscribers. Thank you for supporting {selectedTownName}!</p>

                  <button type="submit" disabled={postHousingLoading} className={`w-full ${theme.accentClass} text-white py-3 rounded-lg font-black tracking-wide shadow-lg hover:shadow-xl transition-all uppercase disabled:opacity-50`}>
                    {postHousingLoading ? 'POSTING...' : 'POST LISTING'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Subscribe Prompt Modal */}
      {showSubscribePrompt && (
        <div className="fixed inset-0 modal-overlay z-50 flex items-center justify-center p-4" onClick={() => setShowSubscribePrompt(false)}>
          <div className="bg-white w-full max-w-sm rounded-[20px] p-6" style={{ boxShadow: '0 16px 50px rgba(26,26,46,0.2)' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-black tracking-tight font-display">Subscriber Perk</h2>
              <button onClick={() => setShowSubscribePrompt(false)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="text-center py-2">
              <div className="text-5xl mb-4">🏠</div>
              <p className="text-sm text-gray-700 font-semibold leading-relaxed mb-1">
                Housing posts are a <span className="font-black text-gray-900">free perk</span> for Go New Paper business subscribers.
              </p>
              <p className="text-xs text-gray-500 font-medium mb-5">
                List your business to unlock free housing posts, featured placement, and more.
              </p>
              <div className="space-y-2.5">
                <button
                  onClick={() => {
                    setShowSubscribePrompt(false)
                    setBusinessForm((f: any) => ({ ...f, townId: selectedTownId }))
                    setBusinessSuccess(false); setBusinessError('')
                    setBusinessLogo(null); setBusinessLogoPreview(null)
                    setShowBusinessModal(true)
                  }}
                  className={`w-full ${theme.accentClass} text-white py-3 rounded-xl font-black tracking-wide text-sm uppercase`}
                  style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
                >
                  List My Business
                </button>
                <button
                  onClick={() => setShowSubscribePrompt(false)}
                  className="w-full bg-gray-100 text-gray-600 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors"
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* List My Business Modal */}
      {showBusinessModal && (
        <div className="fixed inset-0 modal-overlay z-50 flex items-center justify-center p-4" onClick={() => setShowBusinessModal(false)}>
          <div className="bg-white w-full max-w-md rounded-[20px] p-6 max-h-[90vh] overflow-y-auto" style={{ boxShadow: '0 16px 50px rgba(26,26,46,0.2)' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black tracking-tight font-display">
                {businessSuccess ? 'You\'re In! 🎉' : 'List My Business'}
              </h2>
              <button onClick={() => setShowBusinessModal(false)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            {businessSuccess ? (
              <div className="text-center py-4">
                <div className="text-5xl mb-4">🏪</div>
                <p className="text-lg font-black mb-2">Application Received!</p>
                <p className="text-sm text-gray-600 font-semibold mb-2">
                  Your listing is saved. Complete your {submittedBilling === 'monthly' ? 'monthly' : 'annual'} payment below to go live in the app!
                </p>
                <p className="text-xs text-gray-400 mb-6">Once payment is confirmed, your listing appears within 24 hours.</p>
                <a
                  href={submittedTier === 'spotlight'
                    ? (submittedBilling === 'monthly'
                        ? (process.env.NEXT_PUBLIC_STRIPE_SPOTLIGHT_MONTHLY_LINK || 'https://buy.stripe.com/spotlight-monthly')
                        : (process.env.NEXT_PUBLIC_STRIPE_SPOTLIGHT_LINK || 'https://buy.stripe.com/spotlight'))
                    : (submittedBilling === 'monthly'
                        ? (process.env.NEXT_PUBLIC_STRIPE_CARD_MONTHLY_LINK || 'https://buy.stripe.com/card-monthly')
                        : (process.env.NEXT_PUBLIC_STRIPE_CARD_LINK || 'https://buy.stripe.com/card'))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-emerald-600 text-white py-3.5 rounded-xl text-sm font-black tracking-wide shadow-lg mb-3"
                  style={{ boxShadow: '0 2px 8px rgba(16,185,129,0.35)' }}
                >
                  Complete Payment — {submittedTier === 'spotlight'
                    ? (submittedBilling === 'monthly' ? '$30/mo Featured Business' : '$250/yr Featured Business')
                    : (submittedBilling === 'monthly' ? '$15/mo Business Listing' : '$100/yr Business Listing')} →
                </a>
                <button onClick={() => setShowBusinessModal(false)} className="w-full bg-gray-100 text-gray-600 py-2.5 rounded-xl text-sm font-bold">
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleBusinessSubmit}>
                <div className="space-y-4">
                  {/* Plan Selection */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Choose Your Plan *</label>
                    {/* Billing Period Toggle */}
                    <div className="flex items-center justify-center bg-gray-100 rounded-xl p-1 mb-3">
                      <button type="button"
                        onClick={() => setBillingPeriod('monthly')}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all ${billingPeriod === 'monthly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                      >Monthly</button>
                      <button type="button"
                        onClick={() => setBillingPeriod('annual')}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all ${billingPeriod === 'annual' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                      >
                        Annual <span className="text-emerald-600">Save up to 44%</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button type="button"
                        onClick={() => setBusinessForm(f => ({ ...f, tier: 'card' }))}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${businessForm.tier === 'card' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}
                      >
                        <p className="text-xs font-black text-purple-600">BUSINESS LISTING</p>
                        <p className="text-lg font-black text-gray-900">
                          {billingPeriod === 'monthly' ? '$15' : '$100'}
                          <span className="text-xs font-semibold text-gray-500">{billingPeriod === 'monthly' ? '/mo' : '/yr'}</span>
                        </p>
                        {billingPeriod === 'annual' && <p className="text-[10px] text-emerald-600 font-bold">vs $180/yr monthly</p>}
                        <p className="text-[10px] text-gray-500 leading-tight mt-0.5">Compact card, click-to-call, email link</p>
                      </button>
                      <button type="button"
                        onClick={() => setBusinessForm(f => ({ ...f, tier: 'spotlight' }))}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${businessForm.tier === 'spotlight' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                      >
                        <p className="text-xs font-black text-blue-600">FEATURED BUSINESS</p>
                        <p className="text-lg font-black text-gray-900">
                          {billingPeriod === 'monthly' ? '$30' : '$250'}
                          <span className="text-xs font-semibold text-gray-500">{billingPeriod === 'monthly' ? '/mo' : '/yr'}</span>
                        </p>
                        {billingPeriod === 'annual' && <p className="text-[10px] text-emerald-600 font-bold">vs $360/yr monthly</p>}
                        <p className="text-[10px] text-gray-500 leading-tight mt-0.5">Full card, website link, priority placement</p>
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Business Info</p>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Business Name *</label>
                        <input type="text" value={businessForm.name} onChange={e => setBusinessForm(f => ({ ...f, name: e.target.value }))} className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-emerald-500 focus:outline-none font-semibold" placeholder="e.g. Chariton Hardware" required maxLength={100} />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Category *</label>
                        <select value={businessForm.category} onChange={e => setBusinessForm(f => ({ ...f, category: e.target.value }))} className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-emerald-500 focus:outline-none font-semibold" required>
                          <option value="">Select a category…</option>
                          {['Automotive','Cafe/Coffee Shop','Construction & Trades','Education & Childcare','Entertainment','Event Services','Farm & Agriculture','Financial Services','Food & Dining','Grocery','Health & Wellness','Home & Garden','Insurance','Legal Services','Pet Services','Professional Services','Real Estate','Retail & Shopping','Salon/Beauty','Technology & IT','Other'].map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Tagline / Slogan * <span className="font-normal text-gray-400">(max 60 chars)</span></label>
                        <input type="text" value={businessForm.tagline} onChange={e => setBusinessForm(f => ({ ...f, tagline: e.target.value }))} className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-emerald-500 focus:outline-none font-semibold" placeholder={"Your hometown grocer since 1952"} required maxLength={60} />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Description <span className="font-normal text-gray-400">(optional)</span></label>
                        <textarea value={businessForm.description} onChange={e => setBusinessForm(f => ({ ...f, description: e.target.value }))} className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-emerald-500 focus:outline-none font-semibold" placeholder="Tell the community about your business…" rows={2} maxLength={500} />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Business Logo</p>
                    <div>
                      {businessLogoPreview ? (
                        <div className="relative inline-block mb-2">
                          <img src={businessLogoPreview} alt="Logo preview" className="w-24 h-24 rounded-xl object-cover shadow-md border-2 border-gray-200" />
                          <button type="button" onClick={() => { setBusinessLogo(null); setBusinessLogoPreview(null) }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-black shadow">X</button>
                        </div>
                      ) : (
                        <div className="relative">
                          <input type="file" accept="image/*" onChange={handleBusinessLogoChange} className="hidden" id="business-logo-upload" />
                          <label htmlFor="business-logo-upload" className="w-full px-4 py-3 rounded-lg border-2 border-dashed border-gray-300 hover:border-emerald-400 focus:border-emerald-500 cursor-pointer flex items-center justify-center gap-2 text-gray-500 font-semibold text-sm transition-all hover:bg-gray-50">
                            <Plus className="w-4 h-4" />
                            Upload Logo (optional, max 2MB)
                          </label>
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-1">If no logo is uploaded, a category emoji will be used</p>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Contact Info</p>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Your Name *</label>
                        <input type="text" value={businessForm.contactName} onChange={e => setBusinessForm(f => ({ ...f, contactName: e.target.value }))} className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-emerald-500 focus:outline-none font-semibold" placeholder="Jane Smith" required maxLength={80} />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">Phone *</label>
                          <input type="tel" value={businessForm.phone} onChange={e => setBusinessForm(f => ({ ...f, phone: e.target.value }))} className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-emerald-500 focus:outline-none font-semibold" placeholder="(641) 555-1234" required maxLength={20} />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">Email *</label>
                          <input type="email" value={businessForm.email} onChange={e => setBusinessForm(f => ({ ...f, email: e.target.value }))} className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-emerald-500 focus:outline-none font-semibold" placeholder="you@business.com" required maxLength={100} />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Website <span className="font-normal text-gray-400">(optional)</span></label>
                        <input type="url" value={businessForm.website} onChange={e => setBusinessForm(f => ({ ...f, website: e.target.value }))} className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-emerald-500 focus:outline-none font-semibold" placeholder="https://yourbusiness.com" maxLength={200} />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Address <span className="font-normal text-gray-400">(optional)</span></label>
                        <input type="text" value={businessForm.address} onChange={e => setBusinessForm(f => ({ ...f, address: e.target.value }))} className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-emerald-500 focus:outline-none font-semibold" placeholder="123 Main St, Chariton IA" maxLength={150} />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Hours <span className="font-normal text-gray-400">(optional)</span></label>
                        <input type="text" value={businessForm.hours} onChange={e => setBusinessForm(f => ({ ...f, hours: e.target.value }))} className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-emerald-500 focus:outline-none font-semibold" placeholder="Mon–Fri 9am–5pm, Sat 10am–2pm" maxLength={150} />
                      </div>
                    </div>
                  </div>

                  {businessError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 font-semibold">{businessError}</div>
                  )}

                  <p className="text-xs text-[#8a8778] font-medium text-center">After submitting you&apos;ll be directed to complete your annual payment. Your listing goes live within 24 hours of payment.</p>

                  <button type="submit" disabled={businessLoading} className="w-full bg-emerald-600 text-white py-3.5 rounded-xl text-sm font-black tracking-wide shadow-lg hover:shadow-xl transition-all uppercase disabled:opacity-50" style={{ boxShadow: '0 2px 8px rgba(16,185,129,0.3)' }}>
                    {businessLoading ? 'SUBMITTING…' : 'SUBMIT & COMPLETE PAYMENT →'}
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
                <div className={`w-full mt-2 py-2 px-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 ${notificationsEnabled ? 'bg-green-500/30' : 'bg-white/10'}`}>
                  <Bell className="w-4 h-4" />
                  {notificationsEnabled ? 'Notifications enabled ✓' : isIOSNonPWA ? 'Add to Phone Apps below for notifications' : 'Enable notifications in the header above'}
                </div>
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
              <p className="text-sm font-medium font-editorial italic text-white/80 leading-relaxed">Helping communities stay connected by bringing local information, resources, and opportunities into one place.</p>
            </div>

            {/* Community Dashboard — Admin Only */}
            {isAdmin && (
              <button
                onClick={() => { setShowMenu(false); setShowDashboard(true); fetchDashboard(); }}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3 rounded-[12px] mb-4 flex items-center gap-3 hover:shadow-lg transition-all"
                style={{ boxShadow: '0 2px 8px rgba(79,70,229,0.25)' }}
              >
                <BarChart3 className="w-5 h-5" />
                <div className="text-left">
                  <p className="text-sm font-black">Community Dashboard</p>
                  <p className="text-[10px] font-medium text-blue-200">View app metrics & engagement</p>
                </div>
              </button>
            )}

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

              {/* Albia - Active */}
              <button
                onClick={() => { handleTownChange(3, 'Albia'); setShowMenu(false) }}
                className={`w-full p-3 rounded-[12px] text-left transition-all ${selectedTownId === 3 ? 'bg-blue-50 border-[1.5px] border-blue-300' : 'bg-white border-[1.5px] border-[#e8e6e1] hover:border-blue-200'}`}
                style={selectedTownId === 3 ? { boxShadow: '0 2px 8px rgba(30,58,138,0.12)' } : undefined}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">🔵</span>
                  <div>
                    <p className="font-bold text-sm">Albia</p>
                    <p className="text-[11px] text-[#8a8778] font-medium">{selectedTownId === 3 ? 'Current Edition' : 'Tap to switch'} &bull; Blue Demons</p>
                  </div>
                  {selectedTownId === 3 && <Check className="w-4 h-4 text-blue-600 ml-auto" />}
                </div>
              </button>

              {/* Corydon - Active */}
              <button
                onClick={() => { handleTownChange(4, 'Corydon'); setShowMenu(false) }}
                className={`w-full p-3 rounded-[12px] text-left transition-all ${selectedTownId === 4 ? 'bg-gray-100 border-[1.5px] border-gray-400' : 'bg-white border-[1.5px] border-[#e8e6e1] hover:border-gray-300'}`}
                style={selectedTownId === 4 ? { boxShadow: '0 2px 8px rgba(26,26,26,0.12)' } : undefined}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">⚫</span>
                  <div>
                    <p className="font-bold text-sm">Corydon</p>
                    <p className="text-[11px] text-[#8a8778] font-medium">{selectedTownId === 4 ? 'Current Edition' : 'Tap to switch'} &bull; Falcons</p>
                  </div>
                  {selectedTownId === 4 && <Check className="w-4 h-4 text-gray-700 ml-auto" />}
                </div>
              </button>
            </div>

            {/* Engagement Reports — replaces Market & Partners for authorized users */}
            {canViewReports && (
              <>
                <div className="section-divider"></div>
                <div className="mb-4">
                  <button
                    onClick={() => {
                      setShowMenu(false)
                      setShowReportsModal(true)
                      fetchReport(selectedTownId, reportYear, reportMonth)
                    }}
                    className="btn-cta w-full bg-indigo-600 text-white p-3 rounded-[12px] flex items-center justify-between transition-all"
                    style={{ boxShadow: '0 2px 10px rgba(99,102,241,0.3)' }}
                  >
                    <div className="flex items-center gap-2.5">
                      <BarChart3 className="w-4 h-4" />
                      <div className="text-left">
                        <p className="text-sm font-bold">Engagement Reports</p>
                        <p className="text-[11px] font-medium text-indigo-200">Monthly analytics for your town</p>
                      </div>
                    </div>
                    <span className="text-lg opacity-60">&rarr;</span>
                  </button>
                </div>
              </>
            )}

            {/* Quick Links — town-specific */}
            <div className="section-divider"></div>
            <div>
              <h3 className="text-[10px] font-bold text-[#8a8778] tracking-[0.15em] mb-3 uppercase">Quick Links</h3>
              {selectedTownId === 1 && (
                <>
                  <a href="https://www.chariton.org/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 p-3 hover:bg-white rounded-[10px] font-semibold text-sm text-gray-700 transition-all mb-1">🏛️ City of Chariton</a>
                  <a href="https://www.charitonareachambermainstreet.com/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 p-3 hover:bg-white rounded-[10px] font-semibold text-sm text-gray-700 transition-all mb-1">🤝 Chamber / Main Street</a>
                  <a href="https://www.charitonschools.org/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 p-3 hover:bg-white rounded-[10px] font-semibold text-sm text-gray-700 transition-all">🎓 Chariton Schools</a>
                </>
              )}
              {selectedTownId === 2 && (
                <>
                  <a href="https://www.knoxvilleia.gov/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 p-3 hover:bg-white rounded-[10px] font-semibold text-sm text-gray-700 transition-all mb-1">🏛️ City of Knoxville</a>
                  <a href="https://www.knoxvilleiachamber.com/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 p-3 hover:bg-white rounded-[10px] font-semibold text-sm text-gray-700 transition-all mb-1">🤝 Knoxville Chamber</a>
                  <a href="https://www.knoxville.k12.ia.us/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 p-3 hover:bg-white rounded-[10px] font-semibold text-sm text-gray-700 transition-all">🎓 Knoxville Schools</a>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Install Instructions Bottom Sheet */}
      {showInstallHelp && (
        <div className="fixed inset-0 modal-overlay z-50" onClick={() => setShowInstallHelp(false)}>
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 pb-10" style={{ boxShadow: '0 -8px 40px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5"></div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-gray-700" />
              </div>
              <div>
                <h3 className="font-black text-lg tracking-tight">Add to Your Phone</h3>
                <p className="text-sm text-gray-500 font-medium">Install Go New Paper for quick access</p>
              </div>
            </div>
            {typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) ? (
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-2xl">
                  <span className="text-2xl">1️⃣</span>
                  <p className="text-sm font-semibold text-gray-700 pt-1">Tap the <strong>Share</strong> button <span className="text-base">⬆️</span> at the bottom of your Safari browser</p>
                </div>
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-2xl">
                  <span className="text-2xl">2️⃣</span>
                  <p className="text-sm font-semibold text-gray-700 pt-1">Scroll down and tap <strong>"Add to Home Screen"</strong></p>
                </div>
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-2xl">
                  <span className="text-2xl">3️⃣</span>
                  <p className="text-sm font-semibold text-gray-700 pt-1">Tap <strong>"Add"</strong> in the top right — done!</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-2xl">
                  <span className="text-2xl">1️⃣</span>
                  <p className="text-sm font-semibold text-gray-700 pt-1">Tap the <strong>⋮ menu</strong> (3 dots) in the top right of your browser</p>
                </div>
                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-2xl">
                  <span className="text-2xl">2️⃣</span>
                  <p className="text-sm font-semibold text-gray-700 pt-1">Look for the <strong>download icon ⬇</strong> in the top icon row — tap it. If you don't see it, scroll the list and tap <strong>"Add to Home Screen"</strong></p>
                </div>
                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-2xl">
                  <span className="text-2xl">3️⃣</span>
                  <p className="text-sm font-semibold text-gray-700 pt-1">Tap <strong>"Install"</strong> or <strong>"Add"</strong> to confirm — the app icon will appear on your home screen!</p>
                </div>
              </div>
            )}
            <button onClick={() => setShowInstallHelp(false)} className="w-full mt-5 bg-gray-900 text-white py-3.5 rounded-2xl font-black text-sm tracking-wide">
              Got it!
            </button>
          </div>
        </div>
      )}

      {/* First-Login Town Picker Modal */}
      {showTownPickerModal && (
        <div className="fixed inset-0 modal-overlay z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[20px] overflow-hidden" style={{ boxShadow: '0 16px 50px rgba(26,26,46,0.25)' }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-br from-[#1a1a2e] to-[#2d2d4e] px-5 py-4 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-2">
                <div className="bg-white text-green-600 px-2 py-0.5 rounded-md font-display text-xs font-black">GO</div>
                <span className="font-display text-base tracking-tight text-white">NEW PAPER</span>
              </div>
              <h2 className="text-lg font-black tracking-tight font-display text-white mb-0.5">Welcome!</h2>
              <p className="text-white/60 text-[11px] font-medium">Pick your town to see local events, jobs & news</p>
            </div>

            {/* Town Options */}
            <div className="p-4 space-y-2.5">
              {Object.entries(townThemes).map(([id, t]) => (
                <button
                  key={id}
                  onClick={() => {
                    handleTownChange(Number(id), t.name)
                    setShowTownPickerModal(false)
                    showToast(`Welcome to ${t.name}!`)
                  }}
                  className="w-full p-3.5 rounded-2xl text-left transition-all border-2 border-[#e8e6e1] hover:border-gray-300 active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-lg font-black font-display" style={{ backgroundColor: t.primaryColor }}>
                      {t.letter}
                    </div>
                    <div className="flex-1">
                      <p className="font-black text-[15px] tracking-tight">{t.name}</p>
                      <p className="text-xs text-[#8a8778] font-medium">{t.mascot} {t.selectorEmoji}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300" />
                  </div>
                </button>
              ))}

              {/* Location opt-in */}
              <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl p-3 mt-2">
                <input
                  type="checkbox"
                  id="location-optin"
                  defaultChecked={true}
                  onChange={(e) => {
                    if (e.target.checked && navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(
                        (pos) => {
                          localStorage.setItem('gnp_location_enabled', 'true')
                          localStorage.setItem('gnp_last_lat', String(pos.coords.latitude))
                          localStorage.setItem('gnp_last_lng', String(pos.coords.longitude))
                        },
                        () => { localStorage.setItem('gnp_location_enabled', 'false') },
                        { enableHighAccuracy: false, timeout: 10000 }
                      )
                    } else {
                      localStorage.setItem('gnp_location_enabled', 'false')
                    }
                  }}
                  className="w-4 h-4 rounded text-blue-600 flex-shrink-0"
                />
                <label htmlFor="location-optin" className="text-[11px] text-blue-800 font-medium leading-tight cursor-pointer">
                  <span className="font-bold">Allow location</span> to help improve local insights and get nearby recommendations
                </label>
              </div>

              <p className="text-center text-[10px] text-[#8a8778] font-medium pt-0.5">
                You can change this anytime in the menu
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Engagement Reports Modal */}
      {showReportsModal && (
        <div className="fixed inset-0 modal-overlay z-50" onClick={() => setShowReportsModal(false)}>
          <div className="bg-[#fafaf8] w-full max-w-lg h-full ml-auto overflow-y-auto" style={{ boxShadow: '-8px 0 40px rgba(26,26,46,0.15)' }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-5 z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <BarChart3 className="w-5 h-5" />
                  <h2 className="text-lg font-black tracking-tight">Engagement Reports</h2>
                </div>
                <button onClick={() => setShowReportsModal(false)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <p className="text-indigo-200 text-xs font-semibold mb-3">{selectedTownName} Edition &bull; Monthly Analytics</p>
              {/* Month Navigator */}
              <div className="flex items-center justify-between bg-white/10 rounded-xl p-2">
                <button onClick={() => changeReportMonth(-1)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                <p className="font-black text-sm tracking-wide">
                  {new Date(reportYear, reportMonth - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>
                <button
                  onClick={() => changeReportMonth(1)}
                  disabled={reportYear === new Date().getFullYear() && reportMonth === new Date().getMonth() + 1}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-30"
                ><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4">
              {reportLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : reportData ? (
                <>
                  {/* Stat Cards */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Business Clicks', value: reportData.business_clicks?.total ?? 0, change: reportData.business_clicks?.change_pct, prev: reportData.business_clicks?.previous_month ?? 0, icon: '🏪', color: 'bg-blue-50 border-blue-200' },
                      { label: 'Event Interest', value: reportData.event_interests?.total ?? 0, change: reportData.event_interests?.change_pct, prev: reportData.event_interests?.previous_month ?? 0, icon: '📅', color: 'bg-amber-50 border-amber-200' },
                      { label: 'Notifications Sent', value: reportData.notifications?.total ?? 0, change: reportData.notifications?.change_pct, prev: reportData.notifications?.previous_month ?? 0, icon: '🔔', color: 'bg-green-50 border-green-200' },
                      { label: 'New Signups', value: reportData.new_signups?.total ?? 0, change: reportData.new_signups?.change_pct, prev: reportData.new_signups?.previous_month ?? 0, icon: '👥', color: 'bg-purple-50 border-purple-200' },
                    ].map((stat, i) => (
                      <div key={i} className={`${stat.color} border rounded-xl p-3.5`}>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="text-sm">{stat.icon}</span>
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{stat.label}</p>
                        </div>
                        <p className="text-2xl font-black text-gray-900">{stat.value.toLocaleString()}</p>
                        {stat.change !== null && stat.change !== undefined ? (
                          <p className={`text-xs font-bold mt-1 ${stat.change > 0 ? 'text-green-600' : stat.change < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                            {stat.change > 0 ? '↑' : stat.change < 0 ? '↓' : '→'} {Math.abs(stat.change).toFixed(0)}% vs last month
                          </p>
                        ) : (
                          <p className="text-xs font-medium text-gray-400 mt-1">prev: {stat.prev}</p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Top Businesses */}
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
                      <h3 className="text-xs font-black text-gray-600 uppercase tracking-wider">🏆 Top Businesses by Clicks</h3>
                    </div>
                    {reportData.top_businesses && reportData.top_businesses.length > 0 ? (
                      <div className="divide-y divide-gray-100">
                        {reportData.top_businesses.map((biz: any, i: number) => (
                          <div key={biz.id} className="flex items-center justify-between px-4 py-3">
                            <div className="flex items-center gap-3">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-gray-100 text-gray-600' : 'bg-orange-50 text-orange-600'}`}>{i + 1}</span>
                              <div>
                                <p className="text-sm font-bold text-gray-900">{biz.name}</p>
                                <p className="text-[11px] text-gray-400 font-medium">{biz.category}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-black text-indigo-600">{biz.click_count}</p>
                              <p className="text-[10px] text-gray-400">clicks</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="px-4 py-6 text-sm text-gray-400 text-center font-medium">No business clicks this month</p>
                    )}
                  </div>

                  {/* Top Events */}
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
                      <h3 className="text-xs font-black text-gray-600 uppercase tracking-wider">🎯 Top Events by Interest</h3>
                    </div>
                    {reportData.top_events && reportData.top_events.length > 0 ? (
                      <div className="divide-y divide-gray-100">
                        {reportData.top_events.map((evt: any, i: number) => (
                          <div key={evt.id} className="flex items-center justify-between px-4 py-3">
                            <div className="flex items-center gap-3">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-gray-100 text-gray-600' : 'bg-orange-50 text-orange-600'}`}>{i + 1}</span>
                              <div>
                                <p className="text-sm font-bold text-gray-900">{evt.title}</p>
                                <p className="text-[11px] text-gray-400 font-medium">{evt.date ? formatEventDate(evt.date) : ''}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-black text-indigo-600">{evt.interest_count}</p>
                              <p className="text-[10px] text-gray-400">interested</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="px-4 py-6 text-sm text-gray-400 text-center font-medium">No event interest clicks this month</p>
                    )}
                  </div>

                  {/* Footer Note */}
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-center">
                    <p className="text-xs font-semibold text-indigo-600">📊 Data refreshed in real-time from Go New Paper</p>
                    <p className="text-[11px] text-indigo-400 mt-1">Generated {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                </>
              ) : (
                <div className="text-center py-20">
                  <p className="text-gray-400 font-semibold">No report data available</p>
                  <p className="text-xs text-gray-300 mt-1">Try selecting a different month</p>
                </div>
              )}
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
