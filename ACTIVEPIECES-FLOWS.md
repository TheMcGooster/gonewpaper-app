# Activepieces Flows Reference

## Platform
- **URL**: Activepieces (Jarrett's Platform)
- **Plan**: Unlimited runs, 200 AI credits, Unlimited active flows
- **Project**: Jarrett's Project

## Active Flows (Status: ON)
1. **Sync Chamber Events** - Last modified Feb 11 - 3+ steps
2. **Event Reminder Notifications** - Last modified Feb 11 - 2+ steps
3. **Daily Joke Flow** - Last modified Feb 11 - 1+ steps
4. **Obituary Fieldings** - Last modified Feb 9 - 4+ steps
5. **Jobs** - Last modified Jan 30 - 2+ steps

## Inactive Flows (Status: OFF)
6. **Purge Past Events** - Last modified Today (Feb 13) - 2 steps
7. **Pierschbacher Obituary** - Last modified Feb 9 - 4+ steps

## Notes
- **Event Reminder Notifications** flow handles the every-5-minute check for 30-min event reminders
  - This replaces the Vercel cron `*/5 * * * *` which is blocked on Hobby plan
  - It calls the `/api/cron/event-reminders` endpoint on gonewpaper.com
- **Vercel Cron Jobs** (daily only on Hobby plan):
  - `purge-obituaries` at 6 AM UTC (midnight Central)
  - `purge-events` at 6 AM UTC (midnight Central)
  - `daily-summary` at 12 PM UTC (6 AM Central)
  - `event-reminders` at 11 AM UTC (5 AM Central) - backup/fallback
- **OneSignal App ID**: `a7951e0e-737c-42e6-bd9d-fc0931d95766`
- **OneSignal API Key**: v2 key starting with `os_v2_app_` (stored in Vercel env as ONESIGNAL_REST_API_KEY)
- **Supabase**: Uses service role key for cron routes, anon key for client
- **Timezone**: All date/time logic uses Central Time (America/Chicago) for Chariton, IA
