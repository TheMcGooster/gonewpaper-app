# Go New Paper — Features

> One-stop community hub for small Iowa towns. Live at [gonewpaper.com](https://www.gonewpaper.com). Currently serving Chariton, Knoxville, Albia, and Corydon.

A pitch sheet for sponsors, partners, and new town launches. Pull bullets from this file for sales conversations, the website "About" page, and outreach emails.

---

## The 30-Second Pitch

Go New Paper is the local newspaper, calendar, classifieds, business directory, and town crier — in one app on every resident's phone. Built specifically for small towns where Facebook is the only competitor and it's a noisy mess of ads.

- Town-specific feeds (Chariton residents see Chariton, Knoxville sees Knoxville)
- Push notifications for civic alerts, daily digests, and event reminders
- Auto-pulls events from the Chamber of Commerce, school sports, funeral homes, and local job boards — no manual data entry
- Free for residents. Paid sponsorships start at **$100/year**.

---

## What residents get (free)

### 📅 Events tab
- Complete calendar of everything happening in town — Chamber events, school sports (every team, every game), city council, library, civic, church, festivals
- "Today's Digest" hero card with a personalized morning summary
- One-tap **"Add to Calendar"** — exports a .ics file that drops into Apple Calendar, Google Calendar, Outlook
- "I'm Interested" RSVP — get a 30-minute-before-event push notification so you actually show up
- Search across every tab from one search bar
- Submit your own event for free (admin-reviewed)

### 🚨 Civic Alerts (NEW)
- Town-wide push for boil water orders, severe weather, road closures, utility outages
- Color-coded banner appears at the top of every tab while active
- Auto-expires (admin chooses 2 hours to 1 week)
- Owns the "official town announcement" channel that currently only exists on the sheriff's Facebook page

### 🐾 Lost & Found Pets (NEW)
- Photo cards for lost pets with description, last-seen location, and one-tap call/email to the owner
- Auto-expires after 14 days; "Mark as Found" button when reunited
- Lives on the Explore tab so the whole town can see it at a glance

### 🏪 Business Directory
- Every local business with hours, contact info, deals, and tap-to-call
- Featured "Community Sponsor" placement at the top
- Free submission for new businesses (admin-reviewed)

### 💼 Jobs
- Auto-scraped local job postings refreshed daily
- Post your own opening from the app (admin-reviewed)
- 30-day auto-expiry — listings always fresh

### 🏠 Housing
- Rentals, for-sale, and rooms listed locally
- Direct contact, no middlemen

### 💰 Deals
- Featured affiliate deals and local business specials

### 👥 Clubs & Non-Profits
- Searchable directory of every local club, sports group, civic org, and non-profit
- "Contact" button goes straight to the org's email

### 💬 Community Board
- Garage sales, lost & found, asks-and-offers, gratitude posts
- Town-scoped — Chariton residents don't see Knoxville posts and vice versa

### 🌹 In Memory
- Auto-scraped obituaries from local funeral homes (Fielding, Pierschbacher) — typically same-day as the funeral home website
- Service date, time, and location at a glance
- One-tap email to send condolences

### 😂 Daily Laughs
- A new family-friendly clean joke every day (366 pre-curated, no AI surprises)

### 🗺️ Explore
- Interactive map of parks, trails, lakes, landmarks
- City Parks, State Parks, Lakes, Trails, Recreation — all filterable

### 📲 Add to Phone
- Install as a PWA in two taps from any phone — no app store required
- Push notifications work on iOS and Android once installed

---

## What businesses get (paid)

### Community Professional — $100/year (or $15/month)
For solo professionals, freelancers, contractors, and one-person operations.
- Dedicated business card listing in the Business directory
- Tap-to-call, tap-to-email contact buttons
- Searchable in the global town search
- Logo placement
- Renews annually

### Community Sponsor — $250/year (or $30/month)
For full businesses, restaurants, retailers, services.
- Everything in Community Professional, plus:
- **Top-of-list placement** in the Business directory
- "Community Sponsor" badge of distinction
- Logo + tagline + full description
- Address, phone, hours, website
- Free Deals tab listing for current promotions
- Sponsor Event slot — sponsor a community event with logo placement on the event card
- Renews annually

> **Why "Sponsor" not "Advertiser"?**  
> A $250/year listing in a town of 4,000 isn't an ad buy — it's sponsoring the town's daily information channel. Businesses that buy in are recognized as community supporters, not just vendors.

### Affiliate Deals
- Commission-based deals on the Deals tab, no upfront cost — generate revenue when residents click through
- Apply via the Deals submission form

---

## What's automatic (no-touch content engine)

The app refreshes itself overnight. Day-to-day admin time: ~zero.

- **Chamber events** — synced daily from the Chariton Chamber of Commerce calendar
- **School sports** — every game, every team, every school in the South Central Conference, refreshed daily (3-week rolling window)
- **Local jobs** — scraped daily from local employer job boards
- **Obituaries** — scraped from Fielding & Pierschbacher Funeral Homes, typically same-day
- **Daily morning digest** — automatic push notification with the day's events to every subscriber
- **Event reminders** — automatic 30-minute-before-event push for users who tapped "I'm Interested"

---

## Why hyperlocal works in towns of 4,000

- Facebook is unbearable. Every post is buried under recipes, AI slop, and engagement bait. A town-only app with one purpose cuts through.
- Push notifications have ~10x the open rate of email. The morning digest is read.
- One person knows another. A "Featured Business" placement in front of 2,000 residents is direct mailbox in their pocket — not a banner ad on a CNN article.
- The local newspaper already costs $50/year and arrives on Wednesday. Go New Paper is real-time, free for residents, and accessible on the phone they already have in hand.

---

## Technical highlights (for partners and integrations)

- Built on Next.js, hosted on Vercel — fast, mobile-first, installable PWA
- OneSignal for push (works on iOS once added to Home Screen)
- Real-time data from Supabase (Postgres) with row-level security
- Multi-town architecture — adding a new town is a config change, not a fork
- Custom-domain Supabase auth (no spam folder for sign-in emails)
- Indexed in Google with rich structured data and per-town SEO

---

## Currently serving

| Town | County | Mascot | Status |
|------|--------|--------|--------|
| Chariton | Lucas | Chargers | Active |
| Knoxville | Marion | Panthers | Active |
| Albia | Monroe | Blue Demons | Active |
| Corydon | Wayne | Falcons | Active |

Want your town next? Email [contact@gonewpaper.com](mailto:thenewpaperchariton@gmail.com).
