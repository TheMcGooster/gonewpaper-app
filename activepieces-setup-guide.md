# ActivePieces Automation Setup Guide
# Go New Paper - Chariton Edition

> Last Updated: February 9, 2026
> These are step-by-step instructions for setting up ActivePieces flows.

---

## 0. DATABASE PREP (One-Time)

Before setting up the Daily Joke flow, run this SQL in **Supabase SQL Editor**:

```sql
-- Allow NULL on image_url (text-only jokes don't need an image)
ALTER TABLE comics ALTER COLUMN image_url DROP NOT NULL;
```

This lets ActivePieces leave `image_url` blank. The app displays text-only jokes as styled cards automatically.

---

## 1. DAILY JOKE GENERATOR (Free — No API Key Needed!)

**What it does:** Every morning, fetches a clean joke from JokeAPI (free) and posts it to the Daily Laughs tab.
**Cost:** $0 — uses the free JokeAPI, no API key required.
**Uses:** ActivePieces native Supabase "Create Row" piece (no raw HTTP needed).

### Setup Steps:

**TRIGGER: Schedule**
- Type: Schedule
- Frequency: Every Day
- Time: 6:00 AM (Central Time)

**STEP 1: HTTP Request — Fetch Joke from JokeAPI**
- Piece: HTTP Request (GET)
- Method: GET
- URL: `https://sv443.net/jokeapi/v2/joke/Any?blacklistFlags=racist,sexist,explicit,religious&type=twopart`
- Headers: none needed
- Returns JSON with `body.setup` (the question) and `body.delivery` (the punchline)

**STEP 2: Supabase — Create Row in `comics` table**
- Piece: Supabase → Create Row
- Connection: Your existing Supabase connection
- Table: `comics`
- Field mapping:
  - `title` → `{{step_1.body.setup}}`
  - `alt_text` → `{{step_1.body.delivery}}`
  - `image_url` → **leave blank** (NULL is allowed — app shows text card)
  - `source` → `Daily Laughs`
  - `publish_date` → today's date (use ActivePieces expression for current date in `YYYY-MM-DD` format)
  - `town_id` → `1`
  - `id` → **leave blank** (auto-generated)

> **Mapping the joke fields:** JokeAPI returns `setup` (the question) and `delivery` (the punchline). Map `setup` → `title` and `delivery` → `alt_text`.

### Test It:
- Run the flow manually once
- Check the Daily Laughs tab on gonewpaper.com — new joke should appear at the top with a "TODAY" badge
- The joke displays as a yellow/amber text card (no image needed)

---

## 2. OBITUARY SCRAPER — Fielding Funeral Home

**What it does:** Daily, scrapes the Fielding Funeral Home website for new obituaries and adds them to the In Memory tab.
**Deduplication:** Checks by name before inserting, so re-runs are safe.
**Uses:** HTTP Request, Code piece, Loop, and native Supabase pieces.

### Setup Steps:

**TRIGGER: Schedule**
- Type: Schedule
- Frequency: Every Day
- Time: 7:00 AM (Central Time)

**STEP 1: HTTP Request — Fetch Fielding Website**
- Piece: HTTP Request (GET)
- Method: GET
- URL: `https://www.fieldingfuneralhomes.com/listings`
- Headers: none needed
- This fetches the first page of obituary listings (most recent)

**STEP 2: Code — Parse Obituaries from HTML**
- Piece: Code
- Language: JavaScript
- Inputs: Map `html_body` → `{{step_1.body}}` (the HTTP response body from Step 1)
- Code:
```javascript
const html = inputs.html_body;
const obituaries = [];
const seen = new Set();

// Fielding uses links like: <a href="/obituary/Byron-Clark">Byron Dean Clark</a>
// Extract all obituary links and their display names
const linkRegex = /<a[^>]+href="(\/obituary\/([^"]+))"[^>]*>([^<]+)<\/a>/gi;

let match;
while ((match = linkRegex.exec(html)) !== null) {
  const path = match[1].trim();          // /obituary/Byron-Clark
  const fullName = match[3].trim();       // Byron Dean Clark

  // Skip duplicates (same name may appear multiple times on page)
  // Also skip generic links like "View" or "Send Flowers"
  if (seen.has(fullName) || fullName === 'View' || fullName === 'Send Flowers' || fullName.length < 3) {
    continue;
  }
  seen.add(fullName);

  obituaries.push({
    full_name: fullName,
    funeral_home: 'Fielding Funeral Home',
    funeral_home_url: 'https://www.fieldingfuneralhomes.com' + path,
    service_location: 'Chariton, IA',
    town_id: 1,
    is_approved: true
  });
}

return { obituaries: obituaries, count: obituaries.length };
```

**STEP 3: Loop — For Each Obituary**
- Piece: Loop on Items
- Items: `{{step_2.obituaries}}`

**STEP 3a (inside loop): Supabase — Find Rows (check if exists)**
- Piece: Supabase → Find Rows
- Connection: Your Supabase connection
- Table: `celebrations_of_life`
- Filter: `full_name` equals `{{loop.item.full_name}}`
- This returns matching rows (empty if new person)

**STEP 3b (inside loop): Condition — Only insert if new**
- Piece: Branch / Condition
- Condition: Step 3a result count equals `0` (no existing rows found)

**STEP 3c (inside condition, TRUE branch): Supabase — Create Row**
- Piece: Supabase → Create Row
- Connection: Your Supabase connection
- Table: `celebrations_of_life`
- Field mapping:
  - `full_name` → `{{loop.item.full_name}}`
  - `funeral_home` → `{{loop.item.funeral_home}}`
  - `funeral_home_url` → `{{loop.item.funeral_home_url}}`
  - `service_location` → `{{loop.item.service_location}}`
  - `town_id` → `1`
  - `is_approved` → `true`
  - All other fields → **leave blank** (birth_date, passing_date, photo_url, obituary, service_date, service_time)

### Test It:
- Run the flow manually once
- Check the In Memory tab on gonewpaper.com — new entries should appear
- Run again — no duplicates should be created (dedup by full_name)
- Note: Only page 1 (most recent) of Fielding's site is scraped each run

---

## 3. EVENT PURGE (Already Set Up!)

- Endpoint: `https://www.gonewpaper.com/api/cron/purge-events`
- Schedule: Every 30 minutes
- Header: `Authorization: Bearer <CRON_SECRET>`

---

## 4. EVENT REMINDERS (Already Set Up!)

- Endpoint: `https://www.gonewpaper.com/api/cron/event-reminders`
- Schedule: Every 5 minutes
- Header: `Authorization: Bearer <CRON_SECRET>`

---

## Supabase REST API Quick Reference

**Base URL:** `https://hsuqduzndegemopwossk.supabase.co/rest/v1/`

**Required Headers for ALL Supabase requests:**
```
apikey: <your SUPABASE_ANON_KEY>
Authorization: Bearer <your SUPABASE_ANON_KEY>
```

**To INSERT a row:**
- Method: POST
- URL: `<base>/<table_name>`
- Extra header: `Content-Type: application/json`
- Extra header: `Prefer: return=minimal`
- Body: JSON object with column values

**To SELECT/CHECK if exists:**
- Method: GET
- URL: `<base>/<table_name>?column=eq.value`
- Returns: JSON array (empty `[]` if no matches)

---

## Tips

- Your Supabase anon key is in `.env.local` (the `NEXT_PUBLIC_SUPABASE_ANON_KEY` value)
- For the comics table: `image_url` allows NULL — leave blank for text-only jokes (app shows styled text card)
- For celebrations_of_life: `is_approved` must be `true` for entries to show on the site
- ActivePieces date variables: use `{{trigger.date}}` or `{{formatDate(now, 'YYYY-MM-DD')}}`
