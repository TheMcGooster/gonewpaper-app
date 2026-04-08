-- Migration: sync_is_admin_email_list
-- Created: 2026-04-08
-- The SQL is_admin() function was missing 'jarrettmcgee@gmail.com', so that
-- admin account could see the Approve button client-side but UPDATEs on the
-- events table were silently rejected by the events_update_admin RLS policy
-- (0 rows changed, no error). This syncs the SQL allow-list with the client
-- isAdmin check in app/page.tsx and the ADMIN_EMAILS list in
-- app/api/events/update/route.ts.

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    auth.role() = 'authenticated'
    AND (auth.jwt() ->> 'email') = ANY(ARRAY[
      'jarrettcmcgee@gmail.com',
      'jarrettmcgee@gmail.com',
      'goflufffactory@gmail.com',
      'thenewpaperchariton@gmail.com'
    ]),
    false
  );
$function$;
