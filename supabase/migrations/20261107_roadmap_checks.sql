-- Roadmap tab in the admin portal (admin.html › Roadmap). Already applied to the live database on Nov 7, 2026.
-- Items with a check_key tick themselves off: the admin function checks on every open of the tab, the uptime
-- function once an hour (supabase/functions/*/roadmap.ts). "env:NAME,..." = those secrets are set; other keys:
-- rc_keys, stripe_live, stripe_checkout, admin_mfa, aasa, assetlinks.
alter table public.roadmap_items add column if not exists check_key text, add column if not exists check_ok boolean, add column if not exists checked_at timestamptz;
