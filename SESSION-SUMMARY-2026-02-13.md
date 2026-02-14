# Session Summary - February 13, 2026

## What Was Fixed This Session

### 1. Purge-Events Deleting Today's Events (DEPLOYED)
- **Bug**: String comparison `'2026-02-13' < '2026-02-13T06:00:00.000Z'` was TRUE, deleting today's events
- **Fix**: Changed to Central Time YYYY-MM-DD string comparison using `.lt('date', todayStr)`
- **File**: `app/api/cron/purge-events/route.ts`

### 2. OneSignal Push Notification Pipeline (DEPLOYED)
- **Bug**: Multiple issues preventing push notifications from working end-to-end
- **Fixes applied**:
  - Migrated from OneSignal v1 API to v2 (`Key` auth, `include_subscription_ids`, `target_channel: 'push'`)
  - Fixed `saveOneSignalPlayerId` race condition — was calling `OneSignal.User.PushSubscription.id` before SDK loaded. Now uses `window.OneSignalDeferred` pattern
  - Removed duplicate `OneSignal.init()` call (was in both layout.tsx and page.tsx)
  - Fixed daily-summary date query: `.eq('date', todayStr)` instead of broken `.gte/.lt` range
- **Files**: `app/page.tsx`, `app/layout.tsx`, `app/api/cron/daily-summary/route.ts`, `app/api/cron/event-reminders/route.ts`

### 3. Vercel Cron Schedules (DEPLOYED)
- **Added**: purge-events (0 6 * * *), daily-summary (0 12 * * *), event-reminders (0 11 * * *)
- **Note**: event-reminders changed from `*/5` to daily because Vercel Hobby only allows daily crons
- **File**: `vercel.json`

### 4. Database Fixes (RUN IN SUPABASE)
- **FK constraint**: Added `user_interests.user_id` -> `public.users.id` (needed for PostgREST joins)
- **Type fix**: `event_reminders_sent.event_id` changed from INTEGER to BIGINT
- **RPC function**: `get_upcoming_event_reminders()` updated with BIGINT return type
- **User trigger**: `on_auth_user_created` auto-creates `public.users` row on signup
- **Files**: `fix-database-issues.sql`, `create-user-trigger.sql`, `event-reminders-setup.sql`

### 5. Vercel Deployment Issues (RESOLVED)
- GitHub webhook broke after first failed build (`48b7b75` with `getUserId` error)
- Subsequent pushes never triggered new builds
- Fixed by: disconnecting/reconnecting GitHub integration, then deploying via `npx vercel --prod`
- Current live deployment: `7MWSqfdjh` (commit `e0e9926`)

## Current Architecture
```
Vercel (Hobby Plan)
├── Crons (daily only):
│   ├── purge-obituaries    0 6 * * *   (midnight Central)
│   ├── purge-events        0 6 * * *   (midnight Central)
│   ├── daily-summary       0 12 * * *  (6 AM Central)
│   └── event-reminders     0 11 * * *  (5 AM Central - backup)
├── API Routes:
│   ├── /api/cron/purge-events
│   ├── /api/cron/purge-obituaries
│   ├── /api/cron/daily-summary
│   └── /api/cron/event-reminders
└── Frontend: app/page.tsx (OneSignal SDK v16)

Activepieces (Unlimited runs)
├── Sync Chamber Events        (active)
├── Event Reminder Notifications (active - every 5 min)
├── Daily Joke Flow            (active)
├── Obituary Fieldings         (active)
├── Jobs                       (active)
├── Purge Past Events          (inactive)
└── Pierschbacher Obituary     (inactive)

OneSignal (v2 API)
├── App ID: a7951e0e-737c-42e6-bd9d-fc0931d95766
├── API Key: os_v2_app_... (in Vercel env as ONESIGNAL_REST_API_KEY)
└── SDK: v16 loaded via CDN in layout.tsx

Supabase
├── Tables: events, users, user_interests, event_reminders_sent, etc.
├── Trigger: on_auth_user_created -> handle_new_user()
├── RPC: get_upcoming_event_reminders()
└── Date/time columns are TEXT (not date/time types)
```

## TODO for Next Session

### HIGH PRIORITY
1. **Audit Activepieces flows** — User reports some are broken. Need to:
   - Screenshot/inspect each flow (especially Event Reminder Notifications, Purge Past Events)
   - Verify they're calling the right endpoints with correct auth headers
   - Check if "Event Reminder Notifications" flow passes the `CRON_SECRET` Bearer token
   - Fix any broken flows

2. **Verify OneSignal subscription ID capture is working** — After deploy:
   - Log into gonewpaper.com
   - Check browser console for "OneSignal subscription ID saved" message
   - Verify `onesignal_player_id` gets populated in Supabase `users` table
   - Test clicking "I'm Interested" on an event

3. **Test daily-summary cron** — Trigger manually:
   - `curl -H "Authorization: Bearer <CRON_SECRET>" https://www.gonewpaper.com/api/cron/daily-summary`
   - Verify it returns events and sends OneSignal notification

4. **Test event-reminders flow** — Trigger manually:
   - Need a user with `onesignal_player_id` set + interest in an upcoming event
   - Call `/api/cron/event-reminders` with Bearer token
   - Verify push notification received

### MEDIUM PRIORITY
5. **Fix Vercel GitHub webhook** — Auto-deploys aren't triggering on push
   - May need to go to Vercel Settings > Git and verify webhook is properly configured
   - Currently deploying via `npx vercel --prod` as workaround

6. **Inconsistent time formats in events table** — Some events have "12:00 PM", others have "06:30:00"
   - The `parseTimeStr()` function handles both, but should standardize going forward
   - Google Calendar sync (via Activepieces) may be the source of 24h format times

7. **DST handling** — Central Time offset is hardcoded to -6 hours
   - During Daylight Saving Time (March-November), Central is UTC-5
   - Should use `America/Chicago` timezone library instead of manual offset
   - Affects: purge-events, daily-summary, event-reminders fallback

### LOW PRIORITY
8. **Purge-past-events.sql** has same timezone issue as the original purge bug (uses `date::timestamp < NOW()`)
9. **Consider Vercel Pro** — Would unlock `*/5 * * * *` cron and faster builds
10. **Clean up empty trigger commits** — Several empty commits from debugging Vercel webhook
11. **Add `.vercel` to .gitignore** — The `npx vercel` command created a `.vercel` directory

## Key Environment Variables (Vercel)
- `CRON_SECRET` — Bearer token for cron endpoint auth
- `ONESIGNAL_REST_API_KEY` — v2 key (starts with `os_v2_app_`)
- `SUPABASE_SERVICE_ROLE_KEY` — Server-side Supabase access
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Client-side Supabase key
- `NEXT_PUBLIC_ONESIGNAL_APP_ID` — OneSignal app identifier
