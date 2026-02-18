# Knoxville Data Pipeline - ActivePieces Setup Guide

## Overview

This guide walks through setting up ActivePieces automation flows to keep Knoxville event data fresh in GoNewPaper. The architecture mirrors the existing Chariton pipeline.

**Data Flow:** External Source -> ActivePieces (fetch/parse) -> Webhook API -> Supabase -> App

---

## Prerequisites

- ActivePieces account with access to HTTP, Code, and Schedule pieces
- Your `CRON_SECRET` from Vercel environment variables
- Your GoNewPaper deployment URL: `https://www.gonewpaper.com`

---

## Webhook Endpoint

All flows push data to the same endpoint:

```
POST https://www.gonewpaper.com/api/webhooks/ingest-events
Headers:
  Authorization: Bearer <YOUR_CRON_SECRET>
  Content-Type: application/json
```

### Single Event Body:
```json
{
  "title": "Event Name",
  "date": "2026-03-15",
  "time": "7:00 PM",
  "category": "📅",
  "location": "Knoxville, IA",
  "price": "Free",
  "source": "Source Name",
  "source_url": "https://...",
  "description": "Details here",
  "town_id": 2
}
```

### Batch Events Body:
```json
{
  "events": [
    { "title": "Event 1", "date": "2026-03-15", "town_id": 2, ... },
    { "title": "Event 2", "date": "2026-03-16", "town_id": 2, ... }
  ]
}
```

**Note:** `town_id` defaults to 2 (Knoxville) if not provided. The endpoint handles deduplication by title + date + town_id.

---

## Flow 1: City of Knoxville Calendar Sync (CRON)

This is handled by a Vercel cron job, NOT ActivePieces. The cron calls:
```
GET /api/cron/sync-knoxville-events
```

It fetches all 8 iCal feeds from knoxvilleia.gov and upserts events. **No ActivePieces flow needed for this source.**

To add to Vercel crons, update `vercel.json`:
```json
{
  "crons": [
    { "path": "/api/cron/daily-morning", "schedule": "0 12 * * *" },
    { "path": "/api/cron/event-reminders", "schedule": "0 11 * * *" },
    { "path": "/api/cron/sync-knoxville-events", "schedule": "0 13 * * *" }
  ]
}
```

---

## Flow 2: Knoxville Chamber Community Calendar

**Source:** Knoxville Area Chamber of Commerce (GrowthZone platform)
**URL:** https://web.knoxvilleiowa.com/events (or similar GrowthZone endpoint)
**Frequency:** Daily
**Difficulty:** Moderate (requires GrowthZone AJAX parsing)

### Steps:

1. **Trigger:** Schedule - Every day at 7:00 AM CT

2. **HTTP Request** (fetch calendar data):
   ```
   GET https://api.growthzoneapp.com/api/calendarevents?tenantId=4146
   Headers: Accept: application/json
   ```
   Note: The tenant ID 4146 was identified for Knoxville Chamber. If this endpoint doesn't work, try the alternative AJAX search endpoint:
   ```
   POST https://api.growthzoneapp.com/api/Search/AjaxSearch
   Body: { "tenantId": 4146, "type": "events", "pageSize": 50 }
   ```

3. **Code Step** (parse GrowthZone response):
   ```javascript
   // Parse the GrowthZone calendar response
   const data = inputs.httpResponse;
   const events = [];

   if (Array.isArray(data)) {
     for (const item of data) {
       events.push({
         title: item.Title || item.EventName || item.name,
         date: item.StartDate ? item.StartDate.split('T')[0] : null,
         time: item.StartDate ? new Date(item.StartDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'TBD',
         category: '🏛️',
         location: item.Location || item.VenueName || 'Knoxville, IA',
         price: item.Cost || 'Free',
         source: 'Knoxville Chamber',
         source_url: item.Url || 'https://www.knoxvilleiowa.com/events',
         description: item.Description || '',
         town_id: 2,
       });
     }
   }

   return { events: events.filter(e => e.date) };
   ```

4. **HTTP Request** (push to webhook):
   ```
   POST https://www.gonewpaper.com/api/webhooks/ingest-events
   Headers:
     Authorization: Bearer {{CRON_SECRET}}
     Content-Type: application/json
   Body: { "events": {{code_step.events}} }
   ```

---

## Flow 3: Knoxville Raceway Schedule Scraper

**Source:** Knoxville Raceway (MyRacePass platform)
**URL:** https://www.knoxvilleraceway.com/schedule/
**Frequency:** Weekly (schedule doesn't change often)
**Difficulty:** Moderate (HTML scraping)

**NOTE:** The 2026 Raceway schedule has already been seeded via SQL (see `knoxville-seed-data.sql`). This flow is for ongoing updates and new additions.

### Steps:

1. **Trigger:** Schedule - Every Monday at 6:00 AM CT

2. **HTTP Request** (fetch schedule page):
   ```
   GET https://www.knoxvilleraceway.com/schedule/
   Headers: User-Agent: GoNewPaper-Bot/1.0
   ```

3. **Code Step** (parse HTML schedule):
   ```javascript
   const html = inputs.httpResponse;
   const events = [];

   // MyRacePass schedule uses structured HTML with date/event blocks
   // Look for patterns like:
   // <div class="schedule-event">
   //   <span class="date">Apr 17</span>
   //   <span class="name">Practice Night</span>
   // </div>

   // Use regex to extract schedule entries
   const eventRegex = /<div[^>]*class="[^"]*event[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
   const dateRegex = /(\w{3}\s+\d{1,2})/;
   const titleRegex = /class="[^"]*name[^"]*"[^>]*>([^<]+)/;

   let match;
   while ((match = eventRegex.exec(html)) !== null) {
     const block = match[1];
     const dateMatch = block.match(dateRegex);
     const titleMatch = block.match(titleRegex);

     if (dateMatch && titleMatch) {
       // Convert "Apr 17" to "2026-04-17"
       const months = { Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',
                        Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12' };
       const [mon, day] = dateMatch[1].split(' ');
       const monthNum = months[mon];
       const paddedDay = day.padStart(2, '0');

       events.push({
         title: titleMatch[1].trim(),
         date: `2026-${monthNum}-${paddedDay}`,
         time: '7:00 PM',
         category: '🏎️',
         location: 'Knoxville Raceway',
         price: 'Varies',
         source: 'Knoxville Raceway',
         source_url: 'https://www.knoxvilleraceway.com/schedule/',
         town_id: 2,
       });
     }
   }

   return { events };
   ```

4. **HTTP Request** (push to webhook) - same as Flow 2

---

## Flow 4: kville.org Community Events

**Source:** kville.org community website
**URL:** https://kville.org/community-events/
**Frequency:** Daily
**Difficulty:** Low-Moderate (WordPress, plain text parsing)

### Steps:

1. **Trigger:** Schedule - Every day at 7:30 AM CT

2. **HTTP Request** (fetch events page):
   ```
   GET https://kville.org/community-events/
   ```

3. **Code Step** (parse WordPress content):
   ```javascript
   const html = inputs.httpResponse;
   const events = [];

   // kville.org uses plain text event listings
   // Look for date patterns and event titles in the content
   // This may need LLM-assisted parsing for unstructured text

   // Basic pattern: lines with dates followed by event descriptions
   const lines = html.replace(/<[^>]+>/g, '\n').split('\n').filter(l => l.trim());
   const datePattern = /(\w+day,?\s+\w+\s+\d{1,2}(?:,?\s+\d{4})?)/i;

   let currentDate = null;
   for (const line of lines) {
     const dateMatch = line.match(datePattern);
     if (dateMatch) {
       currentDate = new Date(dateMatch[1]);
       if (!isNaN(currentDate.getTime())) {
         currentDate = currentDate.toISOString().split('T')[0];
       } else {
         currentDate = null;
       }
     } else if (currentDate && line.trim().length > 5) {
       events.push({
         title: line.trim().substring(0, 200),
         date: currentDate,
         category: '📅',
         location: 'Knoxville, IA',
         source: 'kville.org',
         source_url: 'https://kville.org/community-events/',
         town_id: 2,
       });
     }
   }

   return { events };
   ```

4. **HTTP Request** (push to webhook) - same pattern

---

## Monitoring & Debugging

### Check sync results:
- Vercel Function Logs: Check `/api/cron/sync-knoxville-events` output
- Webhook Logs: Check `/api/webhooks/ingest-events` responses
- Supabase: `SELECT * FROM events WHERE town_id = 2 ORDER BY date;`

### Manual trigger:
```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://www.gonewpaper.com/api/cron/sync-knoxville-events
```

### Test webhook:
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Event","date":"2026-06-15","time":"3:00 PM","town_id":2}' \
  https://www.gonewpaper.com/api/webhooks/ingest-events
```

---

## Data Source Summary

| Source | Method | Frequency | Priority | Status |
|--------|--------|-----------|----------|--------|
| City of Knoxville iCal | Vercel Cron | Daily | HIGH | Built (route created) |
| Knoxville Raceway | SQL Seed + Weekly AP | Weekly | HIGH | Seeded (SQL ready) |
| Knoxville Chamber | ActivePieces HTTP | Daily | MEDIUM | Flow template ready |
| kville.org | ActivePieces HTTP | Daily | LOW | Flow template ready |
| Knoxville Library | City iCal Feed | Daily | MEDIUM | Included in iCal sync |
