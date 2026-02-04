# Go New Paper - Chariton Edition

Everything Local, All In Your Pocket.

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Run development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000)

---

## Deployment

### Hosting: Vercel
- **Live URL**: https://www.gonewpaper.com
- **GitHub Repo**: Connected to Vercel for auto-deploy
- **Deploy**: Push to `main` branch triggers auto-deployment

### How to Deploy:
1. Push changes to GitHub
2. Vercel auto-deploys from main branch
3. Check Vercel dashboard for deploy status

---

## Environment Variables

Copy `.env.local` and update with your keys:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `NEXT_PUBLIC_ONESIGNAL_APP_ID` | OneSignal App ID: `a7951e0e-737c-42e6-bd9d-fc0931d95766` |

**Important**: These must also be set in Vercel Dashboard → Settings → Environment Variables

---

## OneSignal Push Notifications Setup

### How It Works:
1. User visits the app → OneSignal SDK initializes
2. User allows notifications → OneSignal generates a **Player ID** (one per device)
3. User logs in → App saves Player ID to Supabase `users.onesignal_player_id`
4. ActivePieces automation → Queries Supabase for Player IDs → Sends push via OneSignal API

### OneSignal Dashboard:
- **Login**: https://onesignal.com
- **App ID**: `a7951e0e-737c-42e6-bd9d-fc0931d95766`

### Required Files for Web Push:
- `public/OneSignalSDKWorker.js` - Service worker (must be in public folder)

### Vercel Configuration for OneSignal:
The service worker must be accessible at the root. Add to `vercel.json` if needed:
```json
{
  "rewrites": [
    { "source": "/OneSignalSDKWorker.js", "destination": "/OneSignalSDKWorker.js" }
  ]
}
```

### Troubleshooting OneSignal:
1. **Bell icon not showing?**
   - Check browser console for errors
   - Verify `OneSignalSDKWorker.js` is accessible at `https://gonewpaper.com/OneSignalSDKWorker.js`

2. **Player ID is null?**
   - User must allow notifications first
   - Check notification permission in browser settings

3. **Testing Player ID:**
   - Log in → Menu → Click "TEST: Get My Player ID" button

---

## ActivePieces Automation (Event Reminders)

### Flow:
```
1. Every X Minutes (Trigger)
      ↓
2. HTTP Request (Supabase - get upcoming events)
      ↓
3. Branch (if results exist)
      ↓ TRUE
4. Loop on Items
      ↓
   5. HTTP Request (OneSignal - send push)
      ↓
   6. HTTP Request (Supabase - log reminder sent)
```

### OneSignal API Call (Step 5):
```json
{
  "app_id": "a7951e0e-737c-42e6-bd9d-fc0931d95766",
  "include_player_ids": [
    "{{onesignal_player_id}}"
  ],
  "headings": {
    "en": "Event Reminder!"
  },
  "contents": {
    "en": "{{event_title}} is starting soon!"
  }
}
```

**IMPORTANT**: The player_id must be in quotes! `"{{onesignal_player_id}}"`

---

## Database (Supabase)

### Key Tables:
- `users` - User profiles with `onesignal_player_id`
- `events` - Community events
- `user_interests` - Which events users are interested in
- `event_reminders_sent` - Tracks sent notifications (prevents duplicates)

### Supabase Dashboard:
- **URL**: https://supabase.com/dashboard
- **Project**: Go New Paper

---

## Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth)
- **Push Notifications**: OneSignal (Web Push)
- **Automation**: ActivePieces
- **Hosting**: Vercel
- **Domain**: gonewpaper.com

---

## Local Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

---

## Contacts & Accounts

| Service | Purpose |
|---------|---------|
| Vercel | Hosting & Deployment |
| Supabase | Database & Auth |
| OneSignal | Push Notifications |
| ActivePieces | Automation |
| GitHub | Code Repository |
