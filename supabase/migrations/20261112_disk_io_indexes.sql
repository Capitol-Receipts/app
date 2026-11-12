-- Cuts full-table scans seen in pg_stat_statements (Disk IO budget warning, Nov 2026).
-- pacs: name = ANY(...) lookups, ~26k calls, ~230 ms each, seq scan of the whole table.
create index if not exists pacs_name_idx on public.pacs (name);
-- zip_districts: state = $1 and districts @> $2 order by zip, ~10k calls, ~110 ms each.
create index if not exists zip_districts_state_zip_idx on public.zip_districts (state, zip);
-- Several tables report 0 live rows to the planner, so refresh statistics.
analyze public.pacs;
analyze public.zip_districts;
analyze public.people;
analyze public.bills;
analyze public.appointees;
