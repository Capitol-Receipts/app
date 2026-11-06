-- Vote pages read one small pre-built row per vote (vote_rows) instead of a whole Congress (up to 260 KB, 40-80 ms CPU).
-- Applied Nov 6, 2026. vote_slice keeps its signature and output; vote_slice_full is the old whole-Congress read,
-- used as the fallback while a Congress is being rebuilt.
create table if not exists public.vote_rows (
  cid text not null, i int not null, roll int, rc jsonb not null, v text not null, primary key (cid, i));
create index if not exists vote_rows_cid_roll on public.vote_rows (cid, roll);
create table if not exists public.vote_members (cid text primary key, m jsonb not null);
alter table public.vote_rows enable row level security;
alter table public.vote_members enable row level security;
create policy "Public read" on public.vote_rows for select to anon, authenticated using (true);
create policy "Public read" on public.vote_members for select to anon, authenticated using (true);
grant select on public.vote_rows, public.vote_members to anon, authenticated;
-- refresh_vote_rows(cid): rebuilds one Congress (about 5 s); congress_votes_sync trigger keeps the tables in step.
-- PENDING (needs approval): move the rebuild out of the trigger into a 5-minute pg_cron job (vote_rows_dirty queue),
-- so a daily load that changes several Congresses at once can't hit the 8 s API statement timeout.
-- See the live definitions with: select pg_get_functiondef('public.vote_slice(text,integer)'::regprocedure);
