-- Applied to production Nov 9, 2026 (uptime cron confirmed working afterwards).
-- Move pg_net out of the public schema (security advisor: extension_in_public).
-- pg_net cannot be relocated with ALTER EXTENSION ... SET SCHEMA, so it is dropped and recreated in "extensions".
-- Its functions always live in the "net" schema, so cron jobs that call net.http_post(...) keep working unchanged.
-- Only requests queued in the few milliseconds of the swap are lost; the next cron run sends them again.
-- Apply in a quiet minute (not on the hour, when the uptime and alert jobs fire).
begin;
do $$
begin
  if exists (select 1 from pg_extension e join pg_namespace n on n.oid = e.extnamespace
             where e.extname = 'pg_net' and n.nspname = 'public') then
    drop extension pg_net;
    create extension pg_net schema extensions;
  end if;
end $$;
-- Same grants Supabase gives a fresh project, so edge-function webhooks and cron keep permission to call it.
grant usage on schema net to postgres, service_role;
grant execute on all functions in schema net to postgres, service_role;
commit;

-- After applying, confirm:
--   select n.nspname from pg_extension e join pg_namespace n on n.oid = e.extnamespace where e.extname = 'pg_net';  -- extensions
--   select jobname, command from cron.job where command ilike '%net.http%';  -- unchanged, and the next run succeeds
