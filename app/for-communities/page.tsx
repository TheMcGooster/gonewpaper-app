'use client'

import Link from 'next/link'
import {
  Calendar, Briefcase, Home, ShoppingBag, Users, MapPin,
  TrendingUp, HeartHandshake, Laugh, Flower2, ArrowRight, Check,
  Mail, ExternalLink, Smartphone, Building2, Landmark,
  BarChart3, UsersRound, Zap, Bell, Compass,
  Rocket, DollarSign
} from 'lucide-react'

export default function ForCommunitiesPage() {

  const features = [
    { icon: Calendar, label: 'Events', desc: 'Auto-synced from city, chamber, school & church calendars' },
    { icon: Briefcase, label: 'Jobs', desc: 'Community-wide job board with automated scraping' },
    { icon: Home, label: 'Housing', desc: 'Local rentals, listings & housing resources' },
    { icon: ShoppingBag, label: 'Business', desc: 'Searchable directory with paid sponsorship tiers' },
    { icon: TrendingUp, label: 'Deals', desc: 'Local discounts & partner offers' },
    { icon: UsersRound, label: 'Clubs', desc: 'Groups, organizations & community clubs' },
    { icon: HeartHandshake, label: 'Non-Profits', desc: 'Local nonprofits & causes directory' },
    { icon: Users, label: 'Community', desc: 'Lost pets, garage sales & community posts' },
    { icon: Laugh, label: 'Daily Laughs', desc: 'A clean joke every day — keeps people coming back' },
    { icon: Flower2, label: 'In Memory', desc: 'Celebrations of life, auto-updated from funeral homes' },
    { icon: Compass, label: 'Explore', desc: 'Interactive map of parks, trails & landmarks' },
  ]

  const comparisonRows = [
    { feature: 'Community events (all sources)', gnp: true, trad: 'Gov only' },
    { feature: 'Local job board (all employers)', gnp: true, trad: false },
    { feature: 'Housing & rental listings', gnp: true, trad: false },
    { feature: 'Business directory with sponsorships', gnp: true, trad: false },
    { feature: 'Obituaries & memorials', gnp: true, trad: false },
    { feature: 'Push notifications (community-wide)', gnp: true, trad: 'Extra $$' },
    { feature: 'Daily engagement content', gnp: true, trad: false },
    { feature: 'Automated content scraping', gnp: true, trad: false },
    { feature: 'Mobile-first design (PWA)', gnp: true, trad: 'Add-on' },
    { feature: 'Annual cost', gnp: '$2,477', trad: '$15,000–$25,000+' },
    { feature: 'Setup time', gnp: 'Days', trad: 'Months' },
  ]

  const partnerCards = [
    {
      icon: Landmark,
      title: 'For Cities',
      color: '#2563eb',
      bg: 'rgba(37,99,235,0.08)',
      border: 'rgba(37,99,235,0.15)',
      points: [
        'Keep residents informed about everything happening in town — not just government meetings',
        'Zero IT burden — we handle setup, hosting, and ongoing updates',
        'Automated event syncing from your existing city calendar',
        'Push notifications reach residents directly on their phones',
        'Complements your existing city website — no replacement needed',
      ]
    },
    {
      icon: Building2,
      title: 'For Chambers',
      color: '#DC143C',
      bg: 'rgba(220,20,60,0.08)',
      border: 'rgba(220,20,60,0.15)',
      points: [
        'Business directory gives members a visible, searchable presence',
        'Sponsorship tiers ($100–$250/yr) create additional revenue for the chamber',
        'Community event calendar promotes chamber events alongside everything else',
        'Attract new members by offering digital visibility as a membership perk',
        'Consolidated platform replaces scattered Facebook groups and email chains',
      ]
    },
    {
      icon: BarChart3,
      title: 'For Economic Development',
      color: '#059669',
      bg: 'rgba(5,150,105,0.08)',
      border: 'rgba(5,150,105,0.15)',
      points: [
        'Local job board shows the community there are opportunities here',
        'Housing listings help attract and retain residents',
        'Business directory showcases your town\'s economic landscape',
        'Data on community engagement, popular events, and growth trends',
        'A modern digital presence that signals your town is thriving',
      ]
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
            <Link href="/about" className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white/80 hover:text-white transition-colors">
              About
            </Link>
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
        <div className="absolute top-[-15%] right-[-8%] w-[500px] h-[500px] rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, white 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(circle, white 0%, transparent 70%)' }} />

        <div className="max-w-5xl mx-auto px-5 pt-16 pb-20 md:pt-24 md:pb-28 relative">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6" style={{ background: 'rgba(220,20,60,0.15)', border: '1px solid rgba(220,20,60,0.25)' }}>
              <HeartHandshake className="w-3.5 h-3.5 text-red-400" />
              <span className="text-xs font-bold text-red-300 tracking-wide">PARTNER WITH US</span>
            </div>

            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-white leading-[1.05] tracking-tight mb-5">
              Bring Go New Paper<br />
              <span className="font-editorial italic" style={{ color: '#DC143C' }}>To Your Community</span>
            </h1>

            <p className="text-lg md:text-xl text-white/65 font-medium leading-relaxed mb-8 max-w-lg">
              The all-in-one digital hub that keeps your residents connected — to events, jobs, businesses, and each other. Free for every resident. Shared investment for the community.
            </p>

            <div className="flex flex-wrap gap-3">
              <a href="#pricing" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white btn-cta" style={{ background: 'linear-gradient(135deg, #DC143C 0%, #B91232 100%)', boxShadow: '0 4px 15px rgba(220,20,60,0.4)' }}>
                See Pricing
                <ArrowRight className="w-4 h-4" />
              </a>
              <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white/90 hover:text-white transition-colors" style={{ background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.15)' }}>
                <ExternalLink className="w-4 h-4" />
                See It Live
              </Link>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full" preserveAspectRatio="none" style={{ display: 'block', height: '40px' }}>
            <path d="M0 60V30C240 10 480 0 720 10C960 20 1200 40 1440 30V60H0Z" fill="var(--gnp-paper)" />
          </svg>
        </div>
      </section>

      {/* ========== STATS BAR ========== */}
      <section className="max-w-5xl mx-auto px-5 -mt-2 mb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { value: '11', label: 'Community Tabs' },
            { value: '$0', label: 'Cost to Residents' },
            { value: '$2,477', label: 'Per Year' },
            { value: '3', label: 'Orgs Share the Cost' },
          ].map((s, i) => (
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

      {/* ========== WHAT YOUR COMMUNITY GETS ========== */}
      <section className="py-16 mb-2" style={{ background: 'var(--gnp-paper-warm)' }}>
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-10">
            <h2 className="font-display text-2xl md:text-3xl tracking-tight mb-3" style={{ color: 'var(--gnp-ink)' }}>
              What Your Community Gets
            </h2>
            <p className="text-gray-500 font-medium max-w-lg mx-auto">
              Eleven tabs of organized, automated, always-fresh community content — all in one pocket-sized hub.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
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
        </div>
      </section>

      {/* ========== HOW IT'S DIFFERENT ========== */}
      <section className="max-w-5xl mx-auto px-5 py-16 mb-2">
        <div className="text-center mb-10">
          <h2 className="font-display text-2xl md:text-3xl tracking-tight mb-3" style={{ color: 'var(--gnp-ink)' }}>
            How It&apos;s <span className="font-editorial italic" style={{ color: '#DC143C' }}>Different</span>
          </h2>
          <p className="text-gray-500 font-medium max-w-lg mx-auto">
            Go New Paper covers the full spectrum of community life — not just government business.
          </p>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ border: '1.5px solid var(--gnp-border)' }}>
          {/* Header */}
          <div className="grid grid-cols-3">
            <div className="p-3 md:p-4 bg-gray-50 border-b text-xs font-bold text-gray-500 uppercase tracking-wider" style={{ borderRight: '1px solid var(--gnp-border-light)' }}>Feature</div>
            <div className="p-3 md:p-4 border-b text-xs font-bold uppercase tracking-wider text-center" style={{ background: 'rgba(220,20,60,0.04)', color: '#DC143C', borderRight: '1px solid var(--gnp-border-light)' }}>Go New Paper</div>
            <div className="p-3 md:p-4 bg-gray-50 border-b text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Traditional Platforms</div>
          </div>
          {/* Rows */}
          {comparisonRows.map((row, i) => (
            <div key={i} className={`grid grid-cols-3 ${i < comparisonRows.length - 1 ? 'border-b' : ''}`} style={{ borderColor: 'var(--gnp-border-light)' }}>
              <div className="p-3 md:p-4 text-xs font-semibold text-gray-600" style={{ borderRight: '1px solid var(--gnp-border-light)' }}>{row.feature}</div>
              <div className="p-3 md:p-4 text-center flex items-center justify-center" style={{ borderRight: '1px solid var(--gnp-border-light)' }}>
                {row.gnp === true ? (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'rgba(220,20,60,0.1)' }}>
                    <Check className="w-3 h-3" style={{ color: '#DC143C' }} />
                  </div>
                ) : (
                  <span className="text-xs font-bold" style={{ color: '#DC143C' }}>{row.gnp}</span>
                )}
              </div>
              <div className="p-3 md:p-4 text-center flex items-center justify-center">
                {row.trad === false ? (
                  <span className="text-xs font-medium text-gray-300">&mdash;</span>
                ) : (
                  <span className="text-xs font-medium text-gray-400">{row.trad}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ========== HOW IT WORKS ========== */}
      <section className="py-16 mb-2" style={{ background: 'var(--gnp-paper-warm)' }}>
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-10">
            <h2 className="font-display text-2xl md:text-3xl tracking-tight mb-3" style={{ color: 'var(--gnp-ink)' }}>
              How It Works
            </h2>
            <p className="text-gray-500 font-medium max-w-lg mx-auto">
              From partnership to launch in days — not months.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: '01', icon: HeartHandshake, title: 'Partner', desc: 'Your City, Chamber, and Economic Development org share a simple annual investment.' },
              { step: '02', icon: Rocket, title: 'We Build', desc: 'We configure your town edition — local branding, data sources, calendar feeds, and scraper automations.' },
              { step: '03', icon: Bell, title: 'Launch', desc: 'Residents access the free community hub from any device. Push notifications keep them engaged.' },
              { step: '04', icon: TrendingUp, title: 'Grow', desc: 'Automated content stays fresh. Business sponsorships create sustainable local revenue.' },
            ].map((s, i) => (
              <div key={i} className="relative bg-white rounded-2xl p-6 text-center" style={{ border: '1.5px solid var(--gnp-border-light)', boxShadow: 'var(--gnp-shadow-sm)' }}>
                <div className="font-display text-5xl tracking-tight mb-3" style={{ color: 'rgba(220,20,60,0.08)' }}>{s.step}</div>
                <div className="w-10 h-10 rounded-lg mx-auto mb-3 flex items-center justify-center" style={{ background: 'rgba(220,20,60,0.06)' }}>
                  <s.icon className="w-5 h-5" style={{ color: '#DC143C' }} />
                </div>
                <div className="font-bold text-sm mb-2" style={{ color: 'var(--gnp-ink)' }}>{s.title}</div>
                <div className="text-xs text-gray-400 font-medium leading-relaxed">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== PRICING ========== */}
      <section id="pricing" className="max-w-5xl mx-auto px-5 py-16 mb-2">
        <div className="text-center mb-10">
          <h2 className="font-display text-2xl md:text-3xl tracking-tight mb-3" style={{ color: 'var(--gnp-ink)' }}>
            Simple, Shared <span className="font-editorial italic" style={{ color: '#DC143C' }}>Investment</span>
          </h2>
          <p className="text-gray-500 font-medium max-w-lg mx-auto">
            One partnership. Three organizations. An entire community connected.
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="relative rounded-2xl overflow-hidden p-8 md:p-10" style={{
            background: 'linear-gradient(160deg, #1a1a2e 0%, #2c3e50 40%, #34495e 100%)',
            boxShadow: '0 12px 40px rgba(26,26,46,0.35)',
          }}>
            <div className="absolute top-[-15%] right-[-10%] w-[300px] h-[300px] rounded-full opacity-[0.05]" style={{ background: 'radial-gradient(circle, white 0%, transparent 70%)' }} />

            <div className="relative text-center mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4" style={{ background: 'rgba(220,20,60,0.2)', border: '1px solid rgba(220,20,60,0.3)' }}>
                <MapPin className="w-3.5 h-3.5 text-red-400" />
                <span className="text-xs font-bold text-red-300 tracking-wide">COMMUNITY PARTNERSHIP</span>
              </div>

              <div className="font-display text-5xl md:text-6xl text-white tracking-tight mb-2">$2,477<span className="text-xl text-white/50">/yr</span></div>

              <p className="text-white/50 font-medium text-sm max-w-md mx-auto">
                Shared investment between your City, Chamber of Commerce, and Economic Development organization.
              </p>

              <p className="text-white/30 text-xs font-medium mt-3">
                That&apos;s less than $7/day for your entire community.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 mb-8">
              {[
                'Dedicated town edition with local branding',
                'All 11 community tabs fully configured',
                'Automated event, job & obituary scraping',
                'Push notifications for every resident',
                'Business directory with sponsorship revenue',
                'Interactive explore map with local landmarks',
                'Daily content that keeps residents engaged',
                'Ongoing platform updates & support',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-white/70 font-medium">{item}</span>
                </div>
              ))}
            </div>

            <div className="text-center">
              <a
                href="mailto:gonewpaper@gmail.com?subject=Community Partnership Inquiry"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-bold text-white btn-cta"
                style={{ background: 'linear-gradient(135deg, #DC143C 0%, #B91232 100%)', boxShadow: '0 4px 15px rgba(220,20,60,0.4)' }}
              >
                <Mail className="w-4 h-4" />
                Get Started
              </a>
            </div>
          </div>

          {/* Additional revenue note */}
          <div className="mt-6 rounded-xl p-5 text-center" style={{ background: 'var(--gnp-paper-warm)', border: '1.5px solid var(--gnp-border-light)' }}>
            <p className="text-sm font-bold text-gray-700 mb-1">
              <DollarSign className="w-4 h-4 inline-block mb-0.5" style={{ color: '#059669' }} /> Business Sponsorships Create Additional Revenue
            </p>
            <p className="text-xs text-gray-500 font-medium leading-relaxed">
              Local businesses can self-enroll as Community Professionals ($100/yr) or Community Sponsors ($250/yr) for premium directory visibility. This revenue helps sustain the platform and keeps the partnership cost low.
            </p>
          </div>
        </div>
      </section>

      {/* ========== FOR EACH PARTNER ========== */}
      <section className="py-16 mb-2" style={{ background: 'var(--gnp-paper-warm)' }}>
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-10">
            <h2 className="font-display text-2xl md:text-3xl tracking-tight mb-3" style={{ color: 'var(--gnp-ink)' }}>
              Built for <span className="font-editorial italic" style={{ color: '#DC143C' }}>Every Stakeholder</span>
            </h2>
            <p className="text-gray-500 font-medium max-w-lg mx-auto">
              Each partner organization gets unique value from the same platform.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {partnerCards.map((card, i) => (
              <div key={i} className="bg-white rounded-2xl p-6" style={{ border: '1.5px solid var(--gnp-border-light)', boxShadow: 'var(--gnp-shadow-sm)' }}>
                <div className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center" style={{ background: card.bg }}>
                  <card.icon className="w-6 h-6" style={{ color: card.color }} />
                </div>
                <h3 className="font-display text-lg tracking-tight mb-4" style={{ color: 'var(--gnp-ink)' }}>{card.title}</h3>
                <div className="space-y-3">
                  {card.points.map((point, j) => (
                    <div key={j} className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5" style={{ background: card.bg }}>
                        <Check className="w-3 h-3" style={{ color: card.color }} />
                      </div>
                      <span className="text-xs text-gray-600 font-medium leading-relaxed">{point}</span>
                    </div>
                  ))}
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
            Ready to Connect<br />
            <span className="font-editorial italic" style={{ color: '#DC143C' }}>Your Community?</span>
          </h2>

          <p className="text-white/50 font-medium leading-relaxed mb-8 max-w-md mx-auto">
            Whether you&apos;re a mayor, Chamber director, or economic development officer — let&apos;s talk about bringing Go New Paper to your town.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="mailto:gonewpaper@gmail.com?subject=Go New Paper Community Partnership"
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
              See It Live in Chariton
            </Link>
          </div>

          <p className="text-white/30 text-xs font-medium mt-6">
            gonewpaper@gmail.com
          </p>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="py-6 text-center" style={{ background: '#151525' }}>
        <p className="text-xs text-white/25 font-medium">
          &copy; {new Date().getFullYear()} Go New Paper &middot; Everything Local, All In Your Pocket
        </p>
      </footer>
    </div>
  )
}
