'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Calendar, Briefcase, Home, ShoppingBag, Users, Bell, MapPin,
  TrendingUp, HeartHandshake, Laugh, Flower2, ArrowRight, Check,
  ChevronDown, Mail, ExternalLink, Smartphone, Building2, Landmark,
  BarChart3, Globe, Megaphone, UsersRound, Star, Zap, Shield, Compass,
  CloudRain, Edit3, Clock
} from 'lucide-react'

export default function AboutPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const features = [
    { icon: Calendar, label: 'Events', desc: 'Auto-synced community calendar' },
    { icon: TrendingUp, label: 'Deals', desc: 'Discounts & local offers' },
    { icon: ShoppingBag, label: 'Business', desc: 'Searchable directory' },
    { icon: Home, label: 'Housing', desc: 'Rentals & listings' },
    { icon: Briefcase, label: 'Jobs', desc: 'Local job board' },
    { icon: UsersRound, label: 'Clubs', desc: 'Groups & organizations' },
    { icon: HeartHandshake, label: 'Non-Profits', desc: 'Support local causes' },
    { icon: Users, label: 'Community', desc: 'Lost pets, sales, & more' },
    { icon: Laugh, label: 'Daily Laughs', desc: 'A joke every day' },
    { icon: Flower2, label: 'In Memory', desc: 'Celebrations of life' },
    { icon: Compass, label: 'Explore', desc: 'Interactive map of local spots' },
  ]

  const stats = [
    { value: '11', label: 'Community Tabs' },
    { value: '24/7', label: 'Always Available' },
    { value: '$0', label: 'Free for Residents' },
    { value: '∞', label: 'Scalable to Any Town' },
  ]

  const faqs = [
    {
      q: 'How much does it cost for our town to use Go New Paper?',
      a: 'Community Hero partnership pricing is based on population — starting at $2,477/yr for towns under 10,000. Additional revenue comes from self-service business listing tiers — Community Professional ($100/yr) and Community Sponsor ($250/yr). The app is always free for residents.'
    },
    {
      q: 'How do events get into the app?',
      a: 'Events auto-sync from community calendars (Chamber, city, school iCal feeds). Community members can also submit events through the app, which are reviewed before publishing. No manual data entry needed from your staff.'
    },
    {
      q: 'Can we customize it for our town?',
      a: 'Absolutely. Each town gets its own themed experience with local colors, mascots, and branding. The multi-town architecture means your community gets a dedicated space while benefiting from the shared platform.'
    },
    {
      q: 'What about towns that already have a website or Facebook page?',
      a: 'Go New Paper complements your existing presence. It consolidates scattered information (Facebook groups, city website, Chamber page, school calendar) into one pocket-sized hub. Think of it as the front door to everything local.'
    },
    {
      q: 'How are push notifications used?',
      a: 'Residents opt-in to receive daily digests of new events, jobs, and community updates. Event reminders fire automatically. The system is designed to inform, not annoy — no spam, no irrelevant alerts.'
    },
  ]

  return (
    <div className="min-h-screen" style={{ background: 'var(--gnp-paper)' }}>

      {/* ========== STICKY NAV ========== */}
      <nav className="sticky top-0 z-50" style={{
        background: 'linear-gradient(160deg, #1a1a2e 0%, #2c3e50 40%, #34495e 100%)',
        boxShadow: '0 2px 20px rgba(0,0,0,0.3)'
      }}>
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <img src="/GoNewPaper_LOGO.png" alt="Go New Paper" className="h-9 rounded-lg object-contain" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.3)', width: 'auto' }} />
            <span className="font-display text-white text-sm tracking-tight">GO NEW PAPER</span>
          </Link>
          <div className="flex items-center gap-3">
            <a href="#contact" className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white/80 hover:text-white transition-colors">
              Contact
            </a>
            <Link href="/" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-white/10 text-white hover:bg-white/20 transition-all border border-white/10">
              <Smartphone className="w-3.5 h-3.5" />
              Open App
            </Link>
          </div>
        </div>
      </nav>

      {/* ========== HERO ========== */}
      <section className="relative overflow-hidden" style={{
        background: 'linear-gradient(160deg, #1a1a2e 0%, #2c3e50 40%, #34495e 100%)',
      }}>
        {/* Decorative circles */}
        <div className="absolute top-[-15%] right-[-8%] w-[500px] h-[500px] rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, white 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(circle, white 0%, transparent 70%)' }} />

        <div className="max-w-5xl mx-auto px-5 pt-16 pb-20 md:pt-24 md:pb-28 relative">
          <div className="max-w-2xl">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6" style={{ background: 'rgba(220,20,60,0.15)', border: '1px solid rgba(220,20,60,0.25)' }}>
              <MapPin className="w-3.5 h-3.5 text-red-400" />
              <span className="text-xs font-bold text-red-300 tracking-wide">BUILT FOR SMALL TOWNS</span>
            </div>

            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-white leading-[1.05] tracking-tight mb-5">
              Everything Local,<br />
              <span className="font-editorial italic" style={{ color: '#DC143C' }}>All In Your Pocket</span>
            </h1>

            <p className="text-lg md:text-xl text-white/65 font-medium leading-relaxed mb-8 max-w-lg">
              Go New Paper is the hyperlocal community hub that puts your town&apos;s events, businesses, jobs, and news into one beautiful, free app.
            </p>

            <div className="flex flex-wrap gap-3">
              <a href="#for-chambers" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white btn-cta" style={{ background: 'linear-gradient(135deg, #DC143C 0%, #B91232 100%)', boxShadow: '0 4px 15px rgba(220,20,60,0.4)' }}>
                Learn More
                <ArrowRight className="w-4 h-4" />
              </a>
              <a href="#contact" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white/90 hover:text-white transition-colors" style={{ background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.15)' }}>
                <Mail className="w-4 h-4" />
                Get In Touch
              </a>
            </div>
          </div>
        </div>

        {/* Wave separator */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full" preserveAspectRatio="none" style={{ display: 'block', height: '40px' }}>
            <path d="M0 60V30C240 10 480 0 720 10C960 20 1200 40 1440 30V60H0Z" fill="var(--gnp-paper)" />
          </svg>
        </div>
      </section>

      {/* ========== STATS BAR ========== */}
      <section className="max-w-5xl mx-auto px-5 -mt-2 mb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <div key={i} className="text-center py-6 px-4 rounded-2xl bg-white" style={{ border: '1.5px solid var(--gnp-border-light)', boxShadow: 'var(--gnp-shadow-sm)' }}>
              <div className="font-display text-3xl md:text-4xl tracking-tight mb-1" style={{ color: '#DC143C' }}>{s.value}</div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ========== THE PROBLEM ========== */}
      <section className="max-w-5xl mx-auto px-5 mb-20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-2xl md:text-3xl tracking-tight mb-5" style={{ color: 'var(--gnp-ink)' }}>
            Small Towns Deserve Better Than <span className="font-editorial italic" style={{ color: '#DC143C' }}>Scattered Information</span>
          </h2>
          <p className="text-gray-500 font-medium leading-relaxed mb-6">
            Local newspapers are disappearing. Facebook algorithms bury community posts. City websites cover government meetings but not daily life. Your residents are left piecing together information from a dozen different sources just to know what&apos;s happening in their own town.
          </p>
          <p className="text-gray-500 font-medium leading-relaxed mb-6">
            Traditional municipal platforms cost <strong className="text-gray-700">$15,000&ndash;$25,000+ per year</strong> and only cover government business. They don&apos;t tell you who&apos;s hiring, who passed away, or what events are coming up this weekend.
          </p>
          <p className="font-bold text-gray-700">
            Go New Paper changes that. One app. Everything local. Free for every resident.
          </p>
        </div>
      </section>

      {/* ========== 11 TABS SHOWCASE ========== */}
      <section className="max-w-5xl mx-auto px-5 mb-20">
        <div className="text-center mb-10">
          <h2 className="font-display text-2xl md:text-3xl tracking-tight mb-3" style={{ color: 'var(--gnp-ink)' }}>
            One App. Eleven Tabs. Your Whole Town.
          </h2>
          <p className="text-gray-500 font-medium max-w-lg mx-auto">
            Every piece of your community&apos;s daily life, organized and accessible.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {features.map((f, i) => (
            <div key={i} className="group relative bg-white rounded-2xl p-4 text-center card-hover cursor-default" style={{ border: '1.5px solid var(--gnp-border-light)', boxShadow: 'var(--gnp-shadow-sm)' }}>
              <div className="w-11 h-11 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(220,20,60,0.08) 0%, rgba(220,20,60,0.04) 100%)' }}>
                <f.icon className="w-5 h-5" style={{ color: '#DC143C' }} />
              </div>
              <div className="font-bold text-sm mb-0.5" style={{ color: 'var(--gnp-ink)' }}>{f.label}</div>
              <div className="text-xs text-gray-400 font-medium">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ========== FOR CHAMBERS ========== */}
      <section id="for-chambers" className="relative py-16 mb-2" style={{ background: 'var(--gnp-paper-warm)' }}>
        <div className="max-w-5xl mx-auto px-5">
          <div className="md:flex md:items-center md:gap-14">
            <div className="md:w-1/2 mb-8 md:mb-0">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5" style={{ background: 'rgba(220,20,60,0.08)', border: '1px solid rgba(220,20,60,0.12)' }}>
                <Building2 className="w-3.5 h-3.5" style={{ color: '#DC143C' }} />
                <span className="text-xs font-bold tracking-wide" style={{ color: '#DC143C' }}>FOR CHAMBERS OF COMMERCE</span>
              </div>

              <h2 className="font-display text-2xl md:text-3xl tracking-tight mb-4" style={{ color: 'var(--gnp-ink)' }}>
                Your Member Businesses,<br />
                <span className="font-editorial italic" style={{ color: '#DC143C' }}>Front and Center</span>
              </h2>

              <p className="text-gray-500 font-medium leading-relaxed mb-6">
                Stop competing with Facebook algorithms to reach your own community. Go New Paper gives Chamber members a permanent, searchable home in every resident&apos;s pocket.
              </p>

              <ul className="space-y-3">
                {[
                  'Events auto-sync from your Chamber calendar — zero staff time',
                  'Member businesses get priority placement in the Business tab',
                  'Revenue share opportunity through business listing tiers',
                  'Push notifications drive attendance to Chamber events',
                  'Analytics show which businesses and events get the most engagement',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5" style={{ background: 'rgba(220,20,60,0.1)' }}>
                      <Check className="w-3 h-3" style={{ color: '#DC143C' }} />
                    </div>
                    <span className="text-sm font-medium text-gray-600">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="md:w-1/2">
              <div className="bg-white rounded-2xl p-6 md:p-8" style={{ border: '1.5px solid var(--gnp-border)', boxShadow: 'var(--gnp-shadow-lg)' }}>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Chamber Benefits</div>
                <div className="space-y-4">
                  {[
                    { icon: Megaphone, title: 'Amplify Events', desc: 'Push notifications reach residents who opted-in — better than social media posts that reach 5% of followers.' },
                    { icon: ShoppingBag, title: 'Grow Member Value', desc: 'Offer listing tiers as a Chamber membership perk. Members get visibility; you get a modern value proposition.' },
                    { icon: BarChart3, title: 'Engagement Data', desc: 'See what your community cares about. Which events get clicks? Which businesses get traffic? Real data, not guesses.' },
                  ].map((b, i) => (
                    <div key={i} className="flex gap-4 p-4 rounded-xl" style={{ background: 'var(--gnp-paper)', border: '1px solid var(--gnp-border-light)' }}>
                      <div className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1a1a2e, #2c3e50)' }}>
                        <b.icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="font-bold text-sm mb-0.5" style={{ color: 'var(--gnp-ink)' }}>{b.title}</div>
                        <div className="text-xs text-gray-500 leading-relaxed">{b.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== FOR CITIES ========== */}
      <section className="relative py-16 mb-2" style={{ background: 'white' }}>
        <div className="max-w-5xl mx-auto px-5">
          <div className="md:flex md:items-center md:gap-14 md:flex-row-reverse">
            <div className="md:w-1/2 mb-8 md:mb-0">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5" style={{ background: 'rgba(26,26,46,0.06)', border: '1px solid rgba(26,26,46,0.1)' }}>
                <Landmark className="w-3.5 h-3.5" style={{ color: 'var(--gnp-ink)' }} />
                <span className="text-xs font-bold tracking-wide" style={{ color: 'var(--gnp-ink)' }}>FOR CITY OFFICIALS</span>
              </div>

              <h2 className="font-display text-2xl md:text-3xl tracking-tight mb-4" style={{ color: 'var(--gnp-ink)' }}>
                Engage Your Residents<br />
                <span className="font-editorial italic" style={{ color: '#DC143C' }}>Where They Already Are</span>
              </h2>

              <p className="text-gray-500 font-medium leading-relaxed mb-6">
                City websites get visited once a year for utility bills. Go New Paper gets opened daily. Put your city&apos;s events, announcements, and resources where people actually look.
              </p>

              <ul className="space-y-3">
                {[
                  'City events and meetings auto-populate from your calendar',
                  'Community tab handles lost pets, garage sales, volunteer calls',
                  'Housing tab helps residents find local rentals and homes',
                  'Zero IT overhead — no servers, no maintenance, no staff time',
                  'Multi-town ready — neighboring cities can join the platform',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5" style={{ background: 'rgba(26,26,46,0.06)' }}>
                      <Check className="w-3 h-3" style={{ color: 'var(--gnp-ink)' }} />
                    </div>
                    <span className="text-sm font-medium text-gray-600">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="md:w-1/2">
              <div className="rounded-2xl p-6 md:p-8 relative overflow-hidden" style={{
                background: 'linear-gradient(160deg, #1a1a2e 0%, #2c3e50 40%, #34495e 100%)',
                boxShadow: 'var(--gnp-shadow-xl)',
              }}>
                <div className="absolute top-[-30%] right-[-15%] w-[300px] h-[300px] rounded-full opacity-[0.06]" style={{ background: 'radial-gradient(circle, white 0%, transparent 70%)' }} />
                <div className="relative">
                  <div className="text-xs font-bold text-white/40 uppercase tracking-widest mb-5">Why cities choose us</div>
                  <div className="space-y-5">
                    {[
                      { num: '$207', label: 'Per month', sub: 'Less than a part-time intern' },
                      { num: '0', label: 'Staff hours required', sub: 'Everything auto-syncs' },
                      { num: '1', label: 'App for everything', sub: 'Replaces fragmented tools' },
                    ].map((s, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <div className="font-display text-3xl text-white" style={{ minWidth: '60px' }}>{s.num}</div>
                        <div>
                          <div className="text-sm font-bold text-white/90">{s.label}</div>
                          <div className="text-xs text-white/45 font-medium">{s.sub}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <p className="text-sm text-white/50 font-medium italic leading-relaxed">
                      &ldquo;Small towns deserve modern tools without big-city price tags.&rdquo;
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== FOR ECONOMIC DEV ========== */}
      <section className="relative py-16" style={{ background: 'var(--gnp-paper-warm)' }}>
        <div className="max-w-5xl mx-auto px-5">
          <div className="md:flex md:items-center md:gap-14">
            <div className="md:w-1/2 mb-8 md:mb-0">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
                <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-xs font-bold tracking-wide text-emerald-700">FOR ECONOMIC DEVELOPMENT</span>
              </div>

              <h2 className="font-display text-2xl md:text-3xl tracking-tight mb-4" style={{ color: 'var(--gnp-ink)' }}>
                Attract Talent. Retain Residents.<br />
                <span className="font-editorial italic text-emerald-600">Grow Your Town.</span>
              </h2>

              <p className="text-gray-500 font-medium leading-relaxed mb-6">
                Young families research towns online before moving. Go New Paper makes your community look alive, connected, and worth relocating to.
              </p>

              <ul className="space-y-3">
                {[
                  'Job board showcases local employment opportunities',
                  'Housing tab helps newcomers find rentals and homes',
                  'Business directory proves your main street is thriving',
                  'Events calendar shows an active, vibrant community',
                  'Data on what residents engage with helps inform decisions',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5" style={{ background: 'rgba(16,185,129,0.1)' }}>
                      <Check className="w-3 h-3 text-emerald-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-600">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="md:w-1/2">
              <div className="bg-white rounded-2xl p-6 md:p-8" style={{ border: '1.5px solid var(--gnp-border)', boxShadow: 'var(--gnp-shadow-lg)' }}>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-5">The Relocation Test</div>
                <p className="text-sm text-gray-500 font-medium leading-relaxed mb-5">
                  When a young family Googles your town, what do they find? Go New Paper gives them an instant window into community life:
                </p>
                <div className="space-y-3">
                  {[
                    { emoji: '📅', text: 'Active events calendar — "There\'s stuff to do here"' },
                    { emoji: '💼', text: 'Local job board — "I can find work here"' },
                    { emoji: '🏠', text: 'Housing listings — "I can find a home here"' },
                    { emoji: '🏪', text: 'Business directory — "Main street is alive"' },
                    { emoji: '🤝', text: 'Clubs & non-profits — "This community cares"' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--gnp-paper)', border: '1px solid var(--gnp-border-light)' }}>
                      <span className="text-xl">{item.emoji}</span>
                      <span className="text-sm font-medium text-gray-600">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== HOW IT WORKS ========== */}
      <section className="py-16" style={{ background: 'white' }}>
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-12">
            <h2 className="font-display text-2xl md:text-3xl tracking-tight mb-3" style={{ color: 'var(--gnp-ink)' }}>
              Up and Running in Days, Not Months
            </h2>
            <p className="text-gray-500 font-medium max-w-md mx-auto">
              No lengthy onboarding. No IT department needed. Here&apos;s how it works.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: '01', icon: Globe, title: 'We Set Up Your Town', desc: 'We configure your town\'s theme, colors, and branding. Your community gets its own space on the platform.' },
              { step: '02', icon: Calendar, title: 'Calendars Auto-Sync', desc: 'Point us to your community calendar feeds (iCal, Google Calendar). Events flow in automatically — daily.' },
              { step: '03', icon: Bell, title: 'Residents Discover It', desc: 'Share the link. Residents bookmark it, enable notifications, and start exploring what\'s happening locally.' },
              { step: '04', icon: TrendingUp, title: 'Community Grows', desc: 'Businesses list themselves. Jobs get posted. Housing goes up. The app becomes the town\'s daily companion.' },
            ].map((s, i) => (
              <div key={i} className="relative">
                <div className="text-5xl font-display mb-4 leading-none" style={{ color: 'rgba(220,20,60,0.08)' }}>{s.step}</div>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: 'rgba(220,20,60,0.06)' }}>
                  <s.icon className="w-5 h-5" style={{ color: '#DC143C' }} />
                </div>
                <h3 className="font-bold text-sm mb-2" style={{ color: 'var(--gnp-ink)' }}>{s.title}</h3>
                <p className="text-xs text-gray-400 font-medium leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== PRICING ========== */}
      <section className="py-16" style={{ background: 'var(--gnp-paper-warm)' }}>
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-10">
            <h2 className="font-display text-2xl md:text-3xl tracking-tight mb-3" style={{ color: 'var(--gnp-ink)' }}>
              Simple, Transparent Pricing
            </h2>
            <p className="text-gray-500 font-medium max-w-lg mx-auto">
              One partnership tier for organizations. Two self-service tiers for local businesses.
            </p>
          </div>

          {/* Community Hero — Population-Based Tiers */}
          <div className="max-w-3xl mx-auto mb-8">
            <div className="relative rounded-2xl overflow-hidden" style={{
              background: 'linear-gradient(160deg, #1a1a2e 0%, #2c3e50 40%, #34495e 100%)',
              boxShadow: '0 12px 40px rgba(26,26,46,0.35)',
            }}>
              <div className="absolute top-[-20%] right-[-10%] w-[350px] h-[350px] rounded-full opacity-[0.05]" style={{ background: 'radial-gradient(circle, white 0%, transparent 70%)' }} />
              <div className="absolute bottom-[-15%] left-[-8%] w-[250px] h-[250px] rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(circle, white 0%, transparent 70%)' }} />

              <div className="relative p-8 md:p-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'rgba(220,20,60,0.15)', border: '1px solid rgba(220,20,60,0.25)' }}>
                    <Landmark className="w-3.5 h-3.5 text-red-400" />
                    <span className="text-xs font-bold text-red-300 tracking-wide">FOR ORGANIZATIONS</span>
                  </div>
                  <div className="flex gap-1">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  </div>
                </div>

                <h3 className="font-display text-xl md:text-2xl text-white tracking-tight mb-2">Community Hero</h3>
                <p className="text-white/45 text-sm font-medium mb-6">For Chambers of Commerce, Cities & Economic Development Organizations</p>

                {/* Population-based pricing tiers */}
                <div className="grid sm:grid-cols-3 gap-3 mb-8">
                  {/* Small Town */}
                  <div className="rounded-xl p-5 text-center relative" style={{ background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.1)' }}>
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide" style={{ background: 'rgba(220,20,60,0.9)', color: 'white' }}>MOST POPULAR</div>
                    <div className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3 mt-1">Small Town</div>
                    <div className="font-display text-3xl md:text-4xl text-white tracking-tight mb-1">$2,477</div>
                    <div className="text-xs text-white/35 font-bold mb-3">/year</div>
                    <div className="text-xs text-white/50 font-medium leading-relaxed" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px' }}>
                      Under <span className="text-white/70 font-bold">10,000</span> population
                    </div>
                    <div className="text-[10px] text-white/30 font-medium mt-1">~$207/month</div>
                  </div>

                  {/* Mid-Size */}
                  <div className="rounded-xl p-5 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.08)' }}>
                    <div className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">Mid-Size</div>
                    <div className="font-display text-3xl md:text-4xl text-white tracking-tight mb-1">$4,977</div>
                    <div className="text-xs text-white/35 font-bold mb-3">/year</div>
                    <div className="text-xs text-white/50 font-medium leading-relaxed" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px' }}>
                      <span className="text-white/70 font-bold">10K &ndash; 50K</span> population
                    </div>
                    <div className="text-[10px] text-white/30 font-medium mt-1">~$415/month</div>
                  </div>

                  {/* City */}
                  <div className="rounded-xl p-5 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.08)' }}>
                    <div className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">City</div>
                    <div className="font-display text-3xl md:text-4xl text-white tracking-tight mb-1">$9,977</div>
                    <div className="text-xs text-white/35 font-bold mb-3">/year</div>
                    <div className="text-xs text-white/50 font-medium leading-relaxed" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px' }}>
                      <span className="text-white/70 font-bold">50K+</span> population
                    </div>
                    <div className="text-[10px] text-white/30 font-medium mt-1">~$832/month</div>
                  </div>
                </div>

                {/* Features included in all tiers */}
                <div className="mb-6">
                  <div className="text-xs font-bold text-white/30 uppercase tracking-widest mb-4">All tiers include</div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {[
                      'Dedicated town hub on the platform',
                      'Automatic calendar event syncing',
                      'Custom town branding & colors',
                      'Push notifications to all residents',
                      'Business directory management',
                      'Housing & job board for your town',
                      'Community posts & announcements',
                      'Analytics dashboard & engagement data',
                      'Priority support & onboarding',
                      'Revenue share on business listings',
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-white/70 font-medium">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <a
                    href="mailto:gonewpaper@gmail.com?subject=Community Hero Inquiry"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white btn-cta"
                    style={{ background: 'linear-gradient(135deg, #DC143C 0%, #B91232 100%)', boxShadow: '0 4px 15px rgba(220,20,60,0.4)' }}
                  >
                    <Mail className="w-4 h-4" />
                    Schedule a Conversation
                  </a>
                  <div className="flex items-center justify-center gap-2 text-white/30 text-xs font-medium">
                    <Shield className="w-3.5 h-3.5" />
                    Still a fraction of what typical city apps charge
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px" style={{ background: 'var(--gnp-border)' }} />
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Business Listing Tiers</span>
              <div className="flex-1 h-px" style={{ background: 'var(--gnp-border)' }} />
            </div>
            <p className="text-center text-xs text-gray-400 font-medium mt-2">
              Self-service tiers for local businesses — this is how the platform sustains itself.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Community Professional */}
            <div className="bg-white rounded-2xl p-6" style={{ border: '1.5px solid var(--gnp-border)', boxShadow: 'var(--gnp-shadow-md)' }}>
              <div className="inline-block px-3 py-1 rounded-full text-xs font-bold mb-4" style={{ background: 'rgba(124,58,237,0.08)', color: '#7c3aed' }}>
                Community Professional
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="font-display text-3xl tracking-tight" style={{ color: 'var(--gnp-ink)' }}>$100</span>
                <span className="text-sm text-gray-400 font-bold">/year</span>
              </div>
              <p className="text-xs text-gray-400 font-medium mb-5">Perfect for solo professionals & freelancers</p>
              <ul className="space-y-2.5">
                {['Compact business card listing', 'Click-to-call button', 'Email link', 'Category placement'].map((item, i) => (
                  <li key={i} className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-purple-500 flex-shrink-0" />
                    <span className="text-sm text-gray-600 font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Community Sponsor */}
            <div className="bg-white rounded-2xl p-6 relative" style={{ border: '1.5px solid var(--gnp-border)', boxShadow: 'var(--gnp-shadow-md)' }}>
              <div className="absolute top-3 right-3">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              </div>
              <div className="inline-block px-3 py-1 rounded-full text-xs font-bold mb-4" style={{ background: 'rgba(251,191,36,0.08)', color: '#d97706' }}>
                Community Sponsor
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="font-display text-3xl tracking-tight" style={{ color: 'var(--gnp-ink)' }}>$250</span>
                <span className="text-sm text-gray-400 font-bold">/year</span>
              </div>
              <p className="text-xs text-gray-400 font-medium mb-5">Full featured for established businesses</p>
              <ul className="space-y-2.5">
                {['Full business card with logo', 'Website link & click tracking', 'Priority placement', 'Sponsor badge', 'Description & hours display'].map((item, i) => (
                  <li key={i} className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <span className="text-sm text-gray-600 font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ========== DIFFERENTIATOR ========== */}
      <section className="py-16" style={{ background: 'white' }}>
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-10">
            <h2 className="font-display text-2xl md:text-3xl tracking-tight mb-3" style={{ color: 'var(--gnp-ink)' }}>
              Not Another City App. Something Better.
            </h2>
          </div>

          <div className="max-w-2xl mx-auto">
            <div className="grid grid-cols-3 gap-0 rounded-2xl overflow-hidden" style={{ border: '1.5px solid var(--gnp-border)', boxShadow: 'var(--gnp-shadow-md)' }}>
              {/* Header */}
              <div className="p-4 bg-gray-50 border-b" style={{ borderColor: 'var(--gnp-border-light)' }}>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Feature</span>
              </div>
              <div className="p-4 border-b border-l text-center" style={{ borderColor: 'var(--gnp-border-light)', background: 'rgba(220,20,60,0.02)' }}>
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#DC143C' }}>Go New Paper</span>
              </div>
              <div className="p-4 bg-gray-50 border-b border-l text-center" style={{ borderColor: 'var(--gnp-border-light)' }}>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Typical City App</span>
              </div>

              {/* Rows */}
              {[
                ['Cost to city', '$2.5K-10K/yr', '$5K-50K/yr'],
                ['Setup time', 'Days', 'Months'],
                ['Staff needed', 'None', '1-2 people'],
                ['Event sync', 'Automatic', 'Manual entry'],
                ['Business listings', 'Self-service', 'Admin managed'],
                ['Push notifications', 'Included', 'Extra cost'],
                ['Multi-town', 'Built-in', 'Not available'],
              ].map(([feature, gnp, other], i) => (
                <div key={i} className="contents">
                  <div className="p-3 px-4 border-b flex items-center" style={{ borderColor: 'var(--gnp-border-light)' }}>
                    <span className="text-xs font-semibold text-gray-600">{feature}</span>
                  </div>
                  <div className="p-3 border-b border-l flex items-center justify-center" style={{ borderColor: 'var(--gnp-border-light)', background: 'rgba(220,20,60,0.02)' }}>
                    <span className="text-xs font-bold" style={{ color: '#DC143C' }}>{gnp}</span>
                  </div>
                  <div className="p-3 border-b border-l flex items-center justify-center" style={{ borderColor: 'var(--gnp-border-light)' }}>
                    <span className="text-xs font-medium text-gray-400">{other}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ========== ANALYTICS SHOWCASE ========== */}
      <section className="py-16" style={{ background: 'var(--gnp-paper-warm)' }}>
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
              <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-xs font-bold tracking-wide text-indigo-700">BUILT-IN ANALYTICS</span>
            </div>
            <h2 className="font-display text-2xl md:text-3xl tracking-tight mb-3" style={{ color: 'var(--gnp-ink)' }}>
              Real Data. Real Engagement.<br />
              <span className="font-editorial italic text-indigo-600">Right at Your Fingertips.</span>
            </h2>
            <p className="text-gray-500 font-medium max-w-lg mx-auto">
              Every town gets a Community Dashboard and monthly Engagement Reports — no extra cost, no third-party tools.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mt-10">
            {/* Community Dashboard Mockup */}
            <div className="rounded-2xl overflow-hidden" style={{ border: '1.5px solid var(--gnp-border)', boxShadow: 'var(--gnp-shadow-xl)' }}>
              <div className="bg-white p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="font-display text-lg tracking-tight" style={{ color: 'var(--gnp-ink)' }}>Community Dashboard</h3>
                    <p className="text-xs text-gray-400 font-medium mt-0.5">Live snapshot of your town</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.1)' }}>
                    <BarChart3 className="w-4 h-4 text-emerald-600" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="rounded-xl p-4 text-center" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                    <div className="font-display text-2xl text-white">17</div>
                    <div className="text-[10px] font-bold text-white/70 uppercase tracking-wider">Registered Users</div>
                  </div>
                  <div className="rounded-xl p-4 text-center" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}>
                    <div className="font-display text-2xl text-white">14</div>
                    <div className="text-[10px] font-bold text-white/70 uppercase tracking-wider">Event Interests</div>
                  </div>
                </div>

                <div className="rounded-xl p-4 mb-4" style={{ border: '1px solid var(--gnp-border-light)', background: 'var(--gnp-paper)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs font-bold text-gray-500">Events</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <div className="font-display text-xl" style={{ color: 'var(--gnp-ink)' }}>3</div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase">Today</div>
                    </div>
                    <div>
                      <div className="font-display text-xl" style={{ color: 'var(--gnp-ink)' }}>121</div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase">This Month</div>
                    </div>
                    <div>
                      <div className="font-display text-xl" style={{ color: 'var(--gnp-ink)' }}>121</div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase">Upcoming</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl p-4" style={{ border: '1px solid var(--gnp-border-light)', background: 'var(--gnp-paper)' }}>
                  <div className="text-xs font-bold text-gray-500 mb-3">Content Overview</div>
                  <div className="space-y-2.5">
                    {[
                      { label: 'Active Jobs', value: '101', color: '#DC143C' },
                      { label: 'Active Businesses', value: '10', color: '#6366f1' },
                      { label: 'Non-Profits', value: '2', color: '#f59e0b' },
                      { label: 'Clubs', value: '3', color: '#10b981' },
                      { label: 'Memorials Listed', value: '1', color: '#8b5cf6' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                          <span className="text-xs font-medium text-gray-600">{item.label}</span>
                        </div>
                        <span className="text-xs font-bold" style={{ color: item.color }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Engagement Reports Mockup */}
            <div className="rounded-2xl overflow-hidden" style={{ border: '1.5px solid var(--gnp-border)', boxShadow: 'var(--gnp-shadow-xl)' }}>
              <div className="p-6 text-white" style={{ background: 'linear-gradient(160deg, #4338ca 0%, #6366f1 50%, #818cf8 100%)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 className="w-4 h-4" />
                  <h3 className="font-display text-lg tracking-tight">Engagement Reports</h3>
                </div>
                <p className="text-xs text-white/60 font-medium">Monthly Analytics</p>
                <div className="mt-4 flex items-center justify-center gap-4">
                  <ChevronDown className="w-4 h-4 text-white/40 rotate-90" />
                  <span className="text-sm font-bold">March 2026</span>
                  <ChevronDown className="w-4 h-4 text-white/40 -rotate-90" />
                </div>
              </div>
              <div className="bg-white p-6">
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {[
                    { label: 'Business Clicks', value: '34', icon: '🏪', change: null },
                    { label: 'Event Interest', value: '13', icon: '📅', change: null },
                    { label: 'Notifications Sent', value: '13', icon: '🔔', change: null },
                    { label: 'New Signups', value: '3', icon: '👥', change: '▼ 79% vs last month' },
                  ].map((s, i) => (
                    <div key={i} className="rounded-xl p-3.5" style={{ border: '1.5px solid var(--gnp-border-light)', background: i === 3 ? 'rgba(251,191,36,0.04)' : 'var(--gnp-paper)' }}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-sm">{s.icon}</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{s.label}</span>
                      </div>
                      <div className="font-display text-2xl" style={{ color: 'var(--gnp-ink)' }}>{s.value}</div>
                      {s.change ? (
                        <div className="text-[10px] font-bold text-red-400 mt-0.5">{s.change}</div>
                      ) : (
                        <div className="text-[10px] font-medium text-gray-300 mt-0.5">prev: 0</div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="rounded-xl p-4 mb-4" style={{ border: '1px solid var(--gnp-border-light)', background: 'var(--gnp-paper)' }}>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">🏆 Top Businesses by Clicks</div>
                  <div className="space-y-2.5">
                    {[
                      { rank: 1, name: 'Knoxville Chamber of Commerce', cat: 'Community', clicks: 31 },
                      { rank: 2, name: 'City of Chariton', cat: 'Government', clicks: 2 },
                      { rank: 3, name: 'Chariton Area Chamber', cat: 'Community', clicks: 1 },
                    ].map((b, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ background: i === 0 ? '#DC143C' : i === 1 ? '#6366f1' : '#9ca3af' }}>{b.rank}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold truncate" style={{ color: 'var(--gnp-ink)' }}>{b.name}</div>
                          <div className="text-[10px] text-gray-400">{b.cat}</div>
                        </div>
                        <div className="text-xs font-bold text-indigo-500">{b.clicks}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl p-4" style={{ border: '1px solid var(--gnp-border-light)', background: 'var(--gnp-paper)' }}>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">🎯 Top Events by Interest</div>
                  <div className="space-y-2.5">
                    {[
                      { rank: 1, name: 'LEGOs @ Chariton Public Library', date: 'Wed, Mar 25', interested: 1 },
                      { rank: 2, name: 'Midweek Bible Study', date: 'Wed, Mar 25', interested: 1 },
                      { rank: 3, name: 'ICC Food Pantry Open', date: 'Wed, Mar 25', interested: 1 },
                    ].map((e, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ background: i === 0 ? '#DC143C' : i === 1 ? '#6366f1' : '#9ca3af' }}>{e.rank}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold truncate" style={{ color: 'var(--gnp-ink)' }}>{e.name}</div>
                          <div className="text-[10px] text-gray-400">{e.date}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-bold text-indigo-500">{e.interested}</div>
                          <div className="text-[10px] text-gray-400">interested</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-8">
            <p className="text-sm text-gray-400 font-medium italic">
              Real data from Chariton, Iowa — the first Go New Paper community.
            </p>
          </div>
        </div>
      </section>

      {/* ========== LIVE EVENT UPDATES SPOTLIGHT ========== */}
      <section id="live-updates" className="max-w-5xl mx-auto px-5 py-20 scroll-mt-20">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4" style={{ background: 'rgba(220,20,60,0.08)', border: '1px solid rgba(220,20,60,0.18)' }}>
            <Zap className="w-3.5 h-3.5" style={{ color: '#DC143C' }} />
            <span className="text-xs font-bold tracking-wide" style={{ color: '#DC143C' }}>NEW · LIVE EVENT UPDATES</span>
          </div>
          <h2 className="font-display text-2xl md:text-3xl tracking-tight mb-4" style={{ color: 'var(--gnp-ink)' }}>
            Weather Moves Your Concert Indoors?<br />
            <span className="font-editorial italic" style={{ color: '#DC143C' }}>Residents Know in Seconds.</span>
          </h2>
          <p className="text-gray-500 font-medium leading-relaxed max-w-2xl mx-auto">
            Organizers and community admins can update any event&apos;s location, date, or time — or cancel it outright — and every resident who marked &ldquo;Interested&rdquo; gets an instant push notification. No scrambling on Facebook. No missed updates.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-10 items-center">
          {/* Left: narrative + bullets */}
          <div>
            <div className="rounded-2xl p-6 mb-5" style={{ background: 'var(--gnp-paper-warm)', border: '1.5px solid var(--gnp-border-light)' }}>
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: 'rgba(37,99,235,0.08)' }}>
                  <CloudRain className="w-5 h-5" style={{ color: '#2563eb' }} />
                </div>
                <div>
                  <p className="text-sm font-bold mb-1" style={{ color: 'var(--gnp-ink)' }}>The Saturday scenario</p>
                  <p className="text-xs text-gray-500 font-medium leading-relaxed">
                    It&apos;s 4:00 PM. Your 6:00 PM concert in the park just got rained out. The old way: panic-post to Facebook, hope people see it, field a dozen phone calls. The Go New Paper way: open the event, tap Edit, type the new location, hit Save &amp; Notify.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { icon: Edit3, title: 'Organizers edit their own events', desc: 'Anyone who posted an event through the app can update it anytime — no back-and-forth with an admin.' },
                { icon: Building2, title: 'Admins cover scraped events too', desc: 'Chamber, Lucas County ED, and city-calendar events get the same live-update powers through community admins.' },
                { icon: Bell, title: 'Smart push notifications', desc: 'Only residents who marked &ldquo;Interested&rdquo; get notified — auto-filled with the change, editable before sending.' },
                { icon: Clock, title: 'From weather call to notified — under a minute', desc: 'Edits and notifications happen in real time. No emails, no approval delays, no phone trees.' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: 'rgba(220,20,60,0.08)' }}>
                    <item.icon className="w-4 h-4" style={{ color: '#DC143C' }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold mb-0.5" style={{ color: 'var(--gnp-ink)' }}>{item.title}</p>
                    <p className="text-xs text-gray-500 font-medium leading-relaxed" dangerouslySetInnerHTML={{ __html: item.desc }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Visual mockup — before/after event cards + push notification */}
          <div className="relative">
            {/* Phone-like frame */}
            <div className="relative rounded-[28px] p-4 mx-auto" style={{
              background: 'linear-gradient(160deg, #1a1a2e 0%, #2c3e50 100%)',
              boxShadow: '0 20px 60px rgba(26,26,46,0.3)',
              maxWidth: '360px',
            }}>
              <div className="rounded-[20px] p-3" style={{ background: 'var(--gnp-paper)' }}>
                {/* BEFORE card */}
                <div className="mb-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 pl-1">Before</p>
                  <div className="bg-white rounded-[14px] p-4" style={{ border: '1.5px solid var(--gnp-border-light)', boxShadow: 'var(--gnp-shadow-sm)' }}>
                    <div className="flex items-start gap-2 mb-2">
                      <span className="text-xl flex-shrink-0">🎵</span>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[13px] font-bold leading-snug" style={{ color: 'var(--gnp-ink)' }}>Summer Concert in the Park</h4>
                        <p className="text-[9px] font-semibold uppercase tracking-wider mt-0.5" style={{ color: '#8a8778' }}>Chariton Chamber</p>
                      </div>
                      <span className="text-[10px] font-bold" style={{ color: '#DC143C' }}>Free</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-gray-600 font-medium mb-1.5">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" style={{ color: '#DC143C' }} />Sat, Jun 14</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" style={{ color: '#DC143C' }} />6:00 PM</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-gray-500 font-medium">
                      <MapPin className="w-3 h-3" style={{ color: '#DC143C' }} />
                      <span>Pin Oak Park Amphitheater</span>
                    </div>
                  </div>
                </div>

                {/* Arrow + "Edit & Notify" pill */}
                <div className="flex items-center justify-center gap-2 my-2">
                  <div className="h-px flex-1" style={{ background: 'var(--gnp-border-light)' }} />
                  <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #DC143C 0%, #B91232 100%)', boxShadow: '0 2px 6px rgba(220,20,60,0.35)' }}>
                    <Edit3 className="w-2.5 h-2.5" />
                    EDIT &amp; NOTIFY
                  </div>
                  <div className="h-px flex-1" style={{ background: 'var(--gnp-border-light)' }} />
                </div>

                {/* AFTER card */}
                <div className="mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5 pl-1" style={{ color: '#DC143C' }}>After · Updated 4:02 PM</p>
                  <div className="bg-white rounded-[14px] p-4" style={{ border: '2px solid rgba(220,20,60,0.3)', boxShadow: '0 4px 16px rgba(220,20,60,0.12)' }}>
                    <div className="flex items-start gap-2 mb-2">
                      <span className="text-xl flex-shrink-0">🎵</span>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[13px] font-bold leading-snug" style={{ color: 'var(--gnp-ink)' }}>Summer Concert in the Park</h4>
                        <p className="text-[9px] font-semibold uppercase tracking-wider mt-0.5" style={{ color: '#8a8778' }}>Chariton Chamber</p>
                      </div>
                      <span className="text-[10px] font-bold" style={{ color: '#DC143C' }}>Free</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-gray-600 font-medium mb-1.5">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" style={{ color: '#DC143C' }} />Sat, Jun 14</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" style={{ color: '#DC143C' }} />6:00 PM</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] font-bold">
                      <MapPin className="w-3 h-3" style={{ color: '#DC143C' }} />
                      <span style={{ color: '#DC143C' }}>MOVED: Carpenter&apos;s Hall (indoor)</span>
                    </div>
                  </div>
                </div>

                {/* Push notification toast */}
                <div className="rounded-[12px] p-3 flex items-start gap-2.5" style={{ background: 'linear-gradient(160deg, #1a1a2e 0%, #2c3e50 100%)', boxShadow: '0 6px 20px rgba(26,26,46,0.25)' }}>
                  <div className="w-7 h-7 rounded-lg flex-shrink-0 overflow-hidden bg-white flex items-center justify-center" style={{ border: '1px solid rgba(255,255,255,0.15)' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/GoNewPaper_LOGO.png" alt="Go New Paper" className="w-full h-full object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className="text-[11px] font-bold text-white">Go New Paper</p>
                      <p className="text-[9px] text-white/40 font-medium">now</p>
                    </div>
                    <p className="text-[11px] font-bold text-white leading-tight mb-0.5">Event Updated: Summer Concert in the Park</p>
                    <p className="text-[10px] text-white/60 font-medium leading-snug">Moved indoors due to weather — now at Carpenter&apos;s Hall, 6 PM.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating "47 residents notified" badge */}
            <div className="absolute -right-2 -top-2 md:-right-4 md:-top-3 rounded-full px-3 py-2 flex items-center gap-2" style={{
              background: 'white',
              border: '1.5px solid var(--gnp-border-light)',
              boxShadow: '0 8px 24px rgba(26,26,46,0.12)',
            }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(5,150,105,0.1)' }}>
                <Check className="w-3.5 h-3.5" style={{ color: '#059669' }} />
              </div>
              <div>
                <p className="text-[10px] font-bold leading-none mb-0.5" style={{ color: 'var(--gnp-ink)' }}>47 residents</p>
                <p className="text-[9px] text-gray-400 font-medium leading-none">notified instantly</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== FAQ ========== */}
      <section className="py-16" style={{ background: 'var(--gnp-paper-warm)' }}>
        <div className="max-w-2xl mx-auto px-5">
          <div className="text-center mb-10">
            <h2 className="font-display text-2xl md:text-3xl tracking-tight mb-3" style={{ color: 'var(--gnp-ink)' }}>
              Common Questions
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white rounded-xl overflow-hidden transition-all" style={{ border: '1.5px solid var(--gnp-border-light)', boxShadow: openFaq === i ? 'var(--gnp-shadow-md)' : 'var(--gnp-shadow-sm)' }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <span className="text-sm font-bold pr-4" style={{ color: 'var(--gnp-ink)' }}>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 flex-shrink-0 text-gray-400 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                <div className={`overflow-hidden transition-all duration-200 ${openFaq === i ? 'max-h-60' : 'max-h-0'}`}>
                  <p className="px-4 pb-4 text-sm text-gray-500 font-medium leading-relaxed">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== CTA / CONTACT ========== */}
      <section id="contact" className="relative py-20 overflow-hidden" style={{
        background: 'linear-gradient(160deg, #1a1a2e 0%, #2c3e50 40%, #34495e 100%)',
      }}>
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, white 0%, transparent 70%)' }} />

        <div className="max-w-2xl mx-auto px-5 text-center relative">
          <img src="/GoNewPaper_LOGO.png" alt="Go New Paper" className="h-16 rounded-2xl mx-auto mb-6 object-contain" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.3)', width: 'auto' }} />

          <h2 className="font-display text-3xl md:text-4xl text-white tracking-tight mb-4">
            Bring Go New Paper<br />
            <span className="font-editorial italic" style={{ color: '#DC143C' }}>To Your Town</span>
          </h2>

          <p className="text-white/50 font-medium leading-relaxed mb-8 max-w-md mx-auto">
            Whether you&apos;re a Chamber director, city administrator, or economic development officer — we&apos;d love to show you what Go New Paper can do for your community.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="mailto:gonewpaper@gmail.com?subject=Go New Paper for Our Town"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-bold text-white btn-cta w-full sm:w-auto justify-center"
              style={{ background: 'linear-gradient(135deg, #DC143C 0%, #B91232 100%)', boxShadow: '0 4px 15px rgba(220,20,60,0.4)' }}
            >
              <Mail className="w-4 h-4" />
              Email Us
            </a>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-bold text-white/80 hover:text-white transition-colors w-full sm:w-auto justify-center"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.15)' }}
            >
              <ExternalLink className="w-4 h-4" />
              See It Live
            </Link>
            <a
              href="#live-updates"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-bold text-white/80 hover:text-white transition-colors w-full sm:w-auto justify-center"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.15)' }}
            >
              <Zap className="w-4 h-4" />
              See Live Updates
            </a>
          </div>

          <p className="text-white/30 text-xs font-medium mt-6">
            gonewpaper@gmail.com
          </p>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="py-6 text-center" style={{ background: '#151525' }}>
        <div className="max-w-5xl mx-auto px-5">
          <p className="text-xs text-white/25 font-medium">
            &copy; {new Date().getFullYear()} Go New Paper &middot; Built with care for small towns everywhere.
          </p>
        </div>
      </footer>
    </div>
  )
}
