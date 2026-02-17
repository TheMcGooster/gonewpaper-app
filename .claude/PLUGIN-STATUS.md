# Claude Code Plugin Status

Last updated: 2026-02-17

## Working Plugins
- **Supabase** - ✅ CONNECTED & ENABLED via Connectors. Has 18 read-only tools + 11 write tools (Execute SQL, Apply migration, Create/Delete/Merge branch, Deploy Edge Function, etc.). Set to "Needs approval" mode.
- **Vercel** - ✅ CLI INSTALLED & LINKED. Vercel CLI 50.18.0, logged in, linked to `jarrett-mcgees-projects/gonewpaper-app`. Commands: `/deploy`, `/logs`, `/setup`. Also auto-deploys on git push to main. Scope: `--scope jarrett-mcgees-projects`. Note: env vars are set in Vercel dashboard, not visible via CLI.
- **Playwright** - Browser automation (headless), fully functional
- **Claude in Chrome** - Browser automation (user's Chrome), requires Chrome extension to be connected first
- **MCP Registry** - Connector search, functional
- **Stripe** - Skills for error codes, test cards, best practices (via Skill tool)

## All Plugins Verified ✅
- GitHub connector is enabled under Plugins → Github → Connectors → GitHub
- Also have `gh` CLI available via Bash as additional workaround

## Key Notes
- Supabase connector is under Plugins → Connectors → Supabase
- All Supabase write tools need user approval before executing
- For quick SQL, can use the Execute SQL tool directly instead of navigating to the Supabase dashboard
- Vercel project is linked at `.vercel/` directory in the project root
- Vercel deploys automatically when pushing to `main` on GitHub (TheMcGooster/gonewpaper-app)
