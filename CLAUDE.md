# Go New Paper - Claude Code Context

## Project Overview
- Next.js 14 app (App Router) for local community news in Chariton, IA
- Deployed on Vercel (auto-deploys from `main` branch on GitHub: TheMcGooster/gonewpaper-app)
- Database: Supabase (PostgreSQL) with PostgREST API
- Push notifications: OneSignal (web push, app ID: a7951e0e-737c-42e6-bd9d-fc0931d95766)
- Email marketing: SendFox
- Payments: Stripe

## Tech Stack & Patterns
- Single-page app: most UI lives in `app/page.tsx` (large file, 2000+ lines)
- Supabase client initialized in `app/page.tsx`, service role key used in API routes
- OneSignal SDK loaded in `app/layout.tsx`, initialized via `OneSignalDeferred` pattern
- Cron jobs in `app/api/cron/` — authenticated via `CRON_SECRET` Bearer token
- Vercel Hobby plan: crons limited to daily schedules only (no `*/5` minute intervals)

## Database Notes
- `user_interests` table links users to events they're interested in
- `user_interests` FK to `public.users` was added manually (not in main schema) — see `fix-database-issues.sql`
- `event_reminders_sent` tracks which user+event combos have been notified (prevents duplicates)
- `get_daily_event_reminders(target_date)` RPC function handles the join query for event reminders
- `get_upcoming_event_reminders()` RPC exists for 25-35 min window approach (unused while on Hobby plan)
- Events use TEXT for `date` ('YYYY-MM-DD') and `time` ('9:30 AM' format)

## OneSignal Notes
- Player ID (`onesignal_player_id`) saved to `users` table on login + subscription change
- Player ID capture has 3 layers: immediate check, polling fallback (10 attempts), change listener
- Town-based targeting uses OneSignal tags (`town_id`)
- Individual targeting uses `include_subscription_ids` with player IDs
- Broadcast uses `included_segments: ['Total Subscriptions']`

## Build & TypeScript Quirks
- TypeScript target doesn't support `[...new Set()]` spread — use `Array.from(new Set())` instead
- Build with `npx next build` — always verify before pushing
- CRLF line ending warnings from git are normal on Windows

## Environment Variables (set in Vercel dashboard, not visible via CLI)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_ONESIGNAL_APP_ID`
- `ONESIGNAL_REST_API_KEY`
- `CRON_SECRET`

## Plugin Status
- See `.claude/PLUGIN-STATUS.md` for current plugin connection details
- Supabase: connected via Connectors (can Execute SQL directly)
- Vercel: CLI installed & linked (scope: `jarrett-mcgees-projects`)
- GitHub: connected via Connectors
- Stripe: skills available

## Deployment
- `git push origin main` → Vercel auto-deploys
- Or use `vercel` CLI (linked, scope: `--scope jarrett-mcgees-projects`)
- Vercel project: `jarrett-mcgees-projects/gonewpaper-app`

## Common SQL Files (run in Supabase SQL Editor)
- `database-setup.sql` — main schema (doesn't include `user_interests`)
- `event-reminders-setup.sql` — `event_reminders_sent` table + `get_upcoming_event_reminders()` RPC
- `fix-database-issues.sql` — FK constraints, type fixes
- `add-daily-event-reminders-rpc.sql` — `get_daily_event_reminders()` RPC for daily cron
