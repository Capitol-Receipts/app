// Fails (exit 1) when any edge function returned server errors in the last hour, so GitHub emails the repo owner.
// Needs SUPABASE_ACCESS_TOKEN (a personal access token). Prints only counts, never secrets.
const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.env.SUPABASE_PROJECT_REF || 'hxgckcriehvrolwnabpd';
const limit = Number(process.env.MAX_ERRORS_PER_HOUR || 3);
if (!token) { console.log('::notice::SUPABASE_ACCESS_TOKEN is not set; skipping the function error check'); process.exit(0); }

const end = new Date(), start = new Date(end - 3600e3);
const sql = `select m.function_id as fn, count(*) as n
  from function_edge_logs cross join unnest(metadata) as m cross join unnest(m.response) as r
  where r.status_code >= 500 group by fn order by n desc`;
const url = `https://api.supabase.com/v1/projects/${ref}/analytics/endpoints/logs.all?` +
  new URLSearchParams({ sql, iso_timestamp_start: start.toISOString(), iso_timestamp_end: end.toISOString() });
const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
if (!res.ok) { console.log(`::error::Supabase logs API answered ${res.status}`); process.exit(1); }
const rows = (await res.json()).result || [];
let names = {};
try {
  const fr = await fetch(`https://api.supabase.com/v1/projects/${ref}/functions`, { headers: { Authorization: `Bearer ${token}` } });
  if (fr.ok) names = Object.fromEntries((await fr.json()).map((f) => [f.id, f.slug]));
} catch {}
const bad = rows.filter((r) => Number(r.n) >= limit);
for (const r of rows) console.log(`${names[r.fn] || r.fn}: ${r.n} server error(s) in the last hour`);
if (bad.length) { console.log(`::error::${bad.length} function(s) failing: ${bad.map((r) => names[r.fn] || r.fn).join(', ')}`); process.exit(1); }
console.log('No edge function is failing.');
