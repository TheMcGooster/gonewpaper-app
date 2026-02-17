import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Type definitions for our database tables
export type Town = {
  id: number
  name: string
  slug: string
  mascot: string
  primary_color: string
  secondary_color: string
  state: string
  county: string
  population: number
  is_active: boolean
}

export type Event = {
  id: number
  title: string
  category: string
  date: string
  time: string
  location: string
  price: string
  source: string
  verified: boolean
  town_id: number
  image_url?: string
  description?: string
  google_event_id?: string
  end_date?: string
  source_url?: string
}

export type Job = {
  id: number
  created_at: string
  title: string
  company: string
  type: string
  pay: string
  description?: string
  auto_scraped: boolean
  apply_url?: string
  town_id: number
  location?: string
  distance_miles?: number
}

export type Business = {
  id: number
  created_at: string
  name: string
  category: string
  website: string
  phone: string
  tagline: string
  featured: boolean
  logo_emoji: string
  logo_url?: string
  clicks: number
  tier: 'free' | 'card' | 'spotlight' | 'premium'
  town_id: number
  description?: string
  address?: string
  email?: string
  hours?: string
}

export type Housing = {
  id: number
  title: string
  price: string
  listing_type: 'rent' | 'sale' | 'room'
  bedrooms?: number
  bathrooms?: number
  location: string
  address?: string
  description?: string
  details?: string
  image_url?: string
  contact_name?: string
  contact_phone?: string
  contact_email?: string
  pets_allowed: boolean
  town_id: number
  is_active: boolean
  created_at?: string
  expires_at?: string
  payment_status?: string
}

export type CommunityPost = {
  id: number
  title: string
  post_type: 'lost_pet' | 'found_pet' | 'garage_sale' | 'volunteer' | 'announcement' | 'other'
  description?: string
  location?: string
  date?: string
  time?: string
  contact_info?: string
  image_url?: string
  emoji: string
  town_id: number
  is_active: boolean
}

export type CelebrationOfLife = {
  id: number
  full_name: string
  birth_date?: string
  passing_date?: string
  age?: number
  photo_url?: string
  obituary?: string
  service_date?: string
  service_time?: string
  service_location?: string
  funeral_home?: string
  funeral_home_url?: string
  town_id: number
  is_approved: boolean
}

export type MarketRecap = {
  id: number
  recap_date: string
  summary?: string
  hot_stocks: { symbol: string; price: number; change: number; changePercent: number }[]
  indices: { name: string; value: number; change: number }[]
  ag_prices: { name: string; price: number; change: number }[]
}

export type TopStory = {
  id: number
  title: string
  summary?: string
  source_name?: string
  source_url?: string
  image_url?: string
  category: 'local' | 'state' | 'national' | 'sports' | 'weather'
  story_date: string
  priority: number
  is_featured: boolean
}

export type Affiliate = {
  id: number
  name: string
  category: string
  logo_emoji: string
  url: string
  commission: string
  description?: string
  is_active: boolean
  display_order: number
  clicks: number
}

export type NonProfit = {
  id: number
  name: string
  category: string
  logo_emoji: string
  logo_url?: string
  tagline: string
  description?: string
  donation_url: string
  website?: string
  email: string
  phone?: string
  town_id: number
  is_active: boolean
  display_order: number
  created_at: string
}

export type Club = {
  id: number
  name: string
  category: string
  logo_emoji: string
  logo_url?: string
  tagline: string
  description?: string
  website?: string
  email: string
  phone?: string
  meeting_schedule?: string
  meeting_location?: string
  town_id: number
  is_active: boolean
  display_order: number
  created_at: string
}

export type Comic = {
  id: number
  title: string
  image_url?: string
  alt_text?: string
  source?: string
  artist_name?: string
  artist_url?: string
  publish_date: string
  town_id: number
  created_at: string
}
