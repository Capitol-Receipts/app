-- NOT APPLIED YET: needs the owner's OK to run on production (see docs/SEO-REPORT.md, owner to-dos).
-- Sitemap dates: updated_at now moves only when a record's content really changes. The daily loader upserts every row
-- without sending updated_at, so before this the column kept the first-insert date and the sitemap lastmod was stale.
-- Rows whose content is identical keep their old date, so search engines only re-crawl pages that changed.
-- Indexes on bills and vote_index let the sitemap index read the newest date quickly.
create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin
  if to_jsonb(new) - 'updated_at' is distinct from to_jsonb(old) - 'updated_at' then new.updated_at := now();
  else new.updated_at := old.updated_at; end if;
  return new;
end $$;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['members','people','appointees','nominations','judges','bills','vote_index','pacs','lobby_clients',
                           'lobby_firms','companies','committees','caucuses','races','outside_groups','ethics_matters'] loop
    execute format('drop trigger if exists touch_updated_at on public.%I', t);
    execute format('create trigger touch_updated_at before update on public.%I for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

create index if not exists bills_updated_at_idx on public.bills (updated_at desc);
create index if not exists vote_index_updated_at_idx on public.vote_index (updated_at desc);
