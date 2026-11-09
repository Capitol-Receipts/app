-- Row-level security tests. Runs inside one transaction that is always rolled back, so it changes nothing.
-- Any failure raises an error. Run in CI (job "rls" in .github/workflows/ci.yml, needs the SUPABASE_DB_URL secret)
-- or by hand: psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls.sql
-- When a new table is added, put it in exactly one list below; an unlisted table fails the test on purpose.
begin;

create temp table rls_expect (t text primary key, kind text not null) on commit drop;
insert into rls_expect values
  -- public records: anyone may read, nobody may write through the API
  ('app_meta','public'),('appointees','public'),('bills','public'),('careers','public'),('caucuses','public'),
  ('committees','public'),('companies','public'),('congress_votes','public'),('corrections','public'),
  ('ethics_matters','public'),('judges','public'),('light_cache','public'),('lobby_clients','public'),
  ('lobby_firms','public'),('member_extras','public'),('members','public'),('nominations','public'),
  ('outside_groups','public'),('pacs','public'),('people','public'),('photos','public'),('races','public'),
  ('roll_calls','public'),('service_status','public'),('trade_feed','public'),('vote_index','public'),
  ('vote_members','public'),('vote_rows','public'),('zip_districts','public'),
  -- a signed-in person's own rows only
  ('user_prefs','own'),('push_devices','own'),('subscriptions','own_read'),
  -- forms: anyone may add a row, nobody may read them back
  ('reports','insert_only'),('signups','insert_only'),
  -- server only: no API access at all (read and written by edge functions with the server key)
  ('admin_log','server'),('admins','server'),('alert_log','server'),('apple_tokens','server'),
  ('billing_email_log','server'),('portfolio_goals','server'),('roadmap_items','server'),('support_requests','server');

do $$
declare r record; n int; bad text := '';
begin
  -- 1. every public table has RLS on and is classified
  for r in select c.relname, c.relrowsecurity from pg_class c join pg_namespace s on s.oid = c.relnamespace
           where s.nspname = 'public' and c.relkind in ('r','p') loop
    if not r.relrowsecurity then bad := bad || format(E'\n  RLS is off on %s', r.relname); end if;
    if not exists (select 1 from rls_expect where t = r.relname) then bad := bad || format(E'\n  %s is not listed in supabase/tests/rls.sql', r.relname); end if;
  end loop;

  -- 2. policies match each table's kind
  for r in select e.t, e.kind,
             count(p.*) filter (where p.cmd = 'SELECT') sel,
             count(p.*) filter (where p.cmd in ('INSERT','UPDATE','DELETE','ALL')) wr,
             count(p.*) filter (where p.cmd in ('SELECT','ALL') and p.qual = 'true') sel_all,
             count(p.*) filter (where 'anon' = any(p.roles) and p.cmd in ('UPDATE','DELETE','ALL')) anon_change,
             count(p.*) filter (where p.permissive = 'RESTRICTIVE') restrictive,
             count(p.*) filter (where p.cmd <> 'INSERT' and coalesce(p.qual,'') <> 'true' and coalesce(p.qual,'') not like '%auth.uid()%= user_id%') odd
           from rls_expect e left join pg_policies p on p.schemaname = 'public' and p.tablename = e.t
           group by e.t, e.kind loop
    if r.anon_change > 0 then bad := bad || format(E'\n  %s lets signed-out visitors change or delete rows', r.t); end if;
    if r.kind = 'public' and (r.sel_all <> 1 or r.wr > 0) then bad := bad || format(E'\n  %s should be read-only to everyone (one SELECT true policy, no writes)', r.t); end if;
    if r.kind in ('own','own_read') and (r.sel_all > 0 or r.odd > 0) then bad := bad || format(E'\n  %s has a policy that is not limited to the signed-in person', r.t); end if;
    if r.kind = 'own_read' and r.wr > 0 then bad := bad || format(E'\n  %s should not be writable through the API', r.t); end if;
    if r.kind = 'insert_only' and (r.sel > 0 or r.wr <> 1) then bad := bad || format(E'\n  %s should allow inserts only, with no way to read rows back', r.t); end if;
    if r.kind = 'server' and (r.sel + r.wr) > 0 then bad := bad || format(E'\n  %s is server only but has an API policy', r.t); end if;
  end loop;

  -- 3. never two permissive SELECT policies on one table for the same role (they widen each other)
  for r in select tablename, rl, count(*) c from pg_policies, unnest(roles) rl
           where schemaname = 'public' and permissive = 'PERMISSIVE' and cmd in ('SELECT','ALL') group by tablename, rl having count(*) > 1 loop
    bad := bad || format(E'\n  %s has %s permissive SELECT policies for %s', r.tablename, r.c, r.rl);
  end loop;

  -- 4. SECURITY DEFINER functions callable by signed-out visitors must be meant as public API
  for r in select p.proname from pg_proc p join pg_namespace s on s.oid = p.pronamespace
           where s.nspname = 'public' and p.prosecdef and has_function_privilege('anon', p.oid, 'EXECUTE')
             and p.proname not in ('get_light', 'get_light_json', 'vote_slice', 'vote_slice_full') loop
    bad := bad || format(E'\n  signed-out visitors can run SECURITY DEFINER function %s', r.proname);
  end loop;

  if bad <> '' then raise exception 'RLS check failed:%', bad; end if;
end $$;

-- 5. what a signed-out visitor can actually read
set local role anon;
do $$
declare t text; n bigint;
begin
  foreach t in array array['subscriptions','user_prefs','push_devices','reports','signups','admin_log','admins','alert_log',
                           'apple_tokens','billing_email_log','portfolio_goals','roadmap_items','support_requests'] loop
    begin
      execute format('select count(*) from public.%I', t) into n;
      if n > 0 then raise exception 'signed-out visitors can read % row(s) of %', n, t; end if;
    exception when insufficient_privilege then null; -- no grant at all is fine too
    end;
  end loop;
  -- writes a visitor must not be able to make
  begin
    insert into public.user_prefs(user_id) values (gen_random_uuid());
    raise exception 'signed-out visitors can insert into user_prefs';
  exception when insufficient_privilege or check_violation or foreign_key_violation then null;
  end;
  begin
    insert into public.members(id, name, party, state, chamber, data) values ('ZZTEST', 'x', 'x', 'x', 'x', '{}');
    raise exception 'signed-out visitors can insert into members';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- 6. two different signed-in people only ever see their own rows
create temp table rls_people on commit drop as
  select (select user_id from public.user_prefs order by updated_at desc limit 1) a,
         (select user_id from public.user_prefs order by updated_at asc limit 1) b,
         (select count(*) from public.user_prefs) total;
grant select on rls_people to authenticated;
do $$
declare a uuid; b uuid; total bigint; n bigint; other bigint;
begin
  select rls_people.a, rls_people.b, rls_people.total into a, b, total from rls_people;
  if a is null then raise notice 'no saved preferences yet; skipping the two-person test'; return; end if;

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*), count(*) filter (where user_id <> a) into n, other from public.user_prefs;
  if other > 0 then raise exception 'a signed-in person can read % other people''s preferences', other; end if;
  if n <> 1 then raise exception 'a signed-in person sees % of their own preference rows (expected 1)', n; end if;
  select count(*) filter (where user_id <> a) into other from public.subscriptions;
  if other > 0 then raise exception 'a signed-in person can read other people''s subscriptions'; end if;
  select count(*) filter (where user_id <> a) into other from public.push_devices;
  if other > 0 then raise exception 'a signed-in person can read other people''s devices'; end if;
  if b is not null and b <> a then
    update public.user_prefs set zip = zip where user_id = b;
    get diagnostics n = row_count;
    if n > 0 then raise exception 'a signed-in person can change someone else''s preferences'; end if;
    delete from public.push_devices where user_id = b;
    get diagnostics n = row_count;
    if n > 0 then raise exception 'a signed-in person can delete someone else''s devices'; end if;
  end if;

  -- a stranger with no rows sees nothing
  perform set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
  select count(*) into n from public.user_prefs;
  if n > 0 then raise exception 'a new account can read % preference rows', n; end if;
  raise notice 'RLS checks passed (% people with saved preferences)', total;
end $$;
reset role;

rollback;
