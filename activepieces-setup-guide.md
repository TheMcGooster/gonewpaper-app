# ActivePieces Automation Setup Guide
# Go New Paper - Chariton Edition

> Last Updated: February 8, 2026
> These are step-by-step instructions for setting up ActivePieces flows.

---

## 1. DAILY JOKE GENERATOR

**What it does:** Every morning, AI generates a clean joke and posts it to the Daily Laughs tab.

### Setup Steps:

**TRIGGER: Schedule**
- Type: Schedule
- Frequency: Every Day
- Time: 6:00 AM (Central Time)

**STEP 1: OpenAI — Generate Joke**
- Piece: OpenAI (you'll need to connect your OpenAI API key)
- Action: Ask ChatGPT
- Model: gpt-3.5-turbo (cheapest, plenty good for jokes)
- Prompt:
```
Generate a single clean, family-friendly joke suitable for a small-town community newspaper app. The joke should be a simple setup and punchline format. Return ONLY a JSON object with exactly two fields, no other text:
{"setup": "the joke question or setup", "punchline": "the funny answer or punchline"}
```
- Temperature: 0.9 (more creative)

**STEP 2: Code — Parse the JSON**
- Piece: Code
- Language: JavaScript
- Code:
```javascript
const response = inputs.openai_response;
// Try to parse the JSON from the AI response
let joke;
try {
  // Handle cases where AI wraps in markdown code blocks
  const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  joke = JSON.parse(cleaned);
} catch (e) {
  // Fallback: try to extract setup/punchline manually
  joke = { setup: "Why did the chicken cross the road?", punchline: "To get to the other side!" };
}
return {
  title: joke.setup,
  punchline: joke.punchline
};
```
- Input: Map `openai_response` to the output text from Step 1

**STEP 3: HTTP Request — Insert into Supabase**
- Piece: HTTP Request
- Method: POST
- URL: `https://hsuqduzndegemopwossk.supabase.co/rest/v1/comics`
- Headers:
  - `apikey`: (your Supabase anon key from .env.local)
  - `Authorization`: `Bearer <your Supabase anon key>`
  - `Content-Type`: `application/json`
  - `Prefer`: `return=minimal`
- Body (JSON):
```json
{
  "title": "{{step2.title}}",
  "alt_text": "{{step2.punchline}}",
  "image_url": "",
  "source": "Daily Laughs",
  "publish_date": "{{trigger.date}}",
  "town_id": 1
}
```

> **IMPORTANT:** The `image_url` field has a NOT NULL constraint in the database. Always pass an empty string `""`, never null or omit it.

> **Date format:** Use the trigger's date output, or format as YYYY-MM-DD (e.g., 2026-02-08)

### Test It:
- Run the flow manually once
- Check the Daily Laughs tab on gonewpaper.com — new joke should appear at the top with a "TODAY" badge

---

## 2. OBITUARY SCRAPER — Fielding Funeral Home

**What it does:** Weekly, scrapes the Fielding Funeral Home website for new obituaries and adds them to the In Memory tab.

### Option A: Simple HTTP + Code Approach

**TRIGGER: Schedule**
- Type: Schedule
- Frequency: Every Week
- Day: Monday
- Time: 7:00 AM

**STEP 1: HTTP Request — Fetch Fielding Website**
- Piece: HTTP Request
- Method: GET
- URL: `https://www.fieldingfuneralhomes.com/listings`
- Headers: none needed

**STEP 2: Code — Parse Obituaries**
- Piece: Code
- Language: JavaScript
- Code:
```javascript
const html = inputs.html_body;
const obituaries = [];

// Fielding uses .obitname and .obitdate CSS classes inside #obitlist
// Simple regex-based parsing (works for their HTML structure)

// Match each obituary entry
const nameRegex = /class="obitname"[^>]*>([^<]+)</g;
const dateRegex = /class="obitdate"[^>]*>([^<]+)</g;
const linkRegex = /href="(\/obituary\/[^"]+)"/g;

const names = [];
const dates = [];
const links = [];

let match;
while ((match = nameRegex.exec(html)) !== null) names.push(match[1].trim());
while ((match = dateRegex.exec(html)) !== null) dates.push(match[1].trim());
while ((match = linkRegex.exec(html)) !== null) links.push(match[1].trim());

for (let i = 0; i < names.length; i++) {
  obituaries.push({
    full_name: names[i] || 'Unknown',
    passing_date: dates[i] || null,
    funeral_home: 'Fielding Funeral Home',
    funeral_home_url: links[i] ? `https://www.fieldingfuneralhomes.com${links[i]}` : 'https://www.fieldingfuneralhomes.com/listings',
    service_location: 'Chariton, IA',
    town_id: 1,
    is_approved: true
  });
}

return { obituaries: obituaries, count: obituaries.length };
```
- Input: Map `html_body` to the body/response from Step 1

**STEP 3: Loop — For Each Obituary**
- Piece: Loop
- Items: `{{step2.obituaries}}`

**STEP 3a (inside loop): HTTP Request — Check if already exists**
- Piece: HTTP Request
- Method: GET
- URL: `https://hsuqduzndegemopwossk.supabase.co/rest/v1/celebrations_of_life?full_name=eq.{{loop.item.full_name}}&town_id=eq.1`
- Headers:
  - `apikey`: (your Supabase anon key)
  - `Authorization`: `Bearer <your Supabase anon key>`

**STEP 3b (inside loop): Condition — Only insert if new**
- Piece: Branch / Condition
- Condition: Step 3a response is empty array `[]` (length = 0)

**STEP 3c (inside condition, if true): HTTP Request — Insert into Supabase**
- Piece: HTTP Request
- Method: POST
- URL: `https://hsuqduzndegemopwossk.supabase.co/rest/v1/celebrations_of_life`
- Headers:
  - `apikey`: (your Supabase anon key)
  - `Authorization`: `Bearer <your Supabase anon key>`
  - `Content-Type`: `application/json`
  - `Prefer`: `return=minimal`
- Body (JSON):
```json
{
  "full_name": "{{loop.item.full_name}}",
  "passing_date": "{{loop.item.passing_date}}",
  "funeral_home": "{{loop.item.funeral_home}}",
  "funeral_home_url": "{{loop.item.funeral_home_url}}",
  "service_location": "{{loop.item.service_location}}",
  "town_id": 1,
  "is_approved": true
}
```

### Test It:
- Run the flow manually once
- Check the In Memory tab on gonewpaper.com — new entries should appear
- Note: The deduplication check (Step 3a) prevents duplicate entries on re-runs

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
- For the comics table: `image_url` is NOT NULL — always send empty string `""`
- For celebrations_of_life: `is_approved` must be `true` for entries to show on the site
- ActivePieces date variables: use `{{trigger.date}}` or `{{formatDate(now, 'YYYY-MM-DD')}}`
