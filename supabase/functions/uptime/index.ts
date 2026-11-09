// Uptime monitor. Runs every 5 minutes (pg_cron job "uptime-check" calls this function) and checks the app, the
// website, a record page, the data proxy, the database API, sign-in and the payment function. Results go to
// public.service_status (readable by anyone, shown on /support and in the admin portal). When a service fails twice
// in a row it emails the team once; when it comes back it emails again. GitHub Actions (uptime.yml) separately checks
// that this monitor is still running.
// Needs RESEND_API_KEY. ALERT_EMAIL optional (defaults to admin@squaredawaylabs.com).
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { syncRoadmap } from "./roadmap.ts";

const URL_ = Deno.env.get("SUPABASE_URL")!;
// Server key: the new secret key (SUPABASE_SECRET_KEYS, named "default") when the project has one, else the old
// service_role key. Supabase retires the old keys before the end of 2026.
const SERVICE = (() => { try { const k = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default; if (k) return String(k); } catch { /* old key below */ } return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!; })();
const RESEND = Deno.env.get("RESEND_API_KEY") || "";
const TO = Deno.env.get("ALERT_EMAIL") || "admin@squaredawaylabs.com";

type Check = { service: string; label: string; url: string; must?: string; method?: string; headers?: Record<string, string>; ok?: (s: number) => boolean };
const CHECKS: Check[] = [
  { service: "app", label: "Web app", url: "https://app.capitolreceipts.com/", must: "Capitol" },
  { service: "website", label: "Website", url: "https://www.capitolreceipts.com/", must: "Capitol Receipts" },
  { service: "records", label: "Record pages", url: "https://www.capitolreceipts.com/member/P000197/nancy-pelosi", must: "Pelosi" },
  { service: "data", label: "Data", url: "https://app.capitolreceipts.com/api/db?q=app_meta%3Fselect%3Dkey%26key%3Deq.asOf", must: "asOf" },
  { service: "auth", label: "Sign-in", url: `${URL_}/auth/v1/health`, ok: (s) => s === 200 || s === 401 },
  { service: "payments", label: "Payments", url: `${URL_}/functions/v1/billing`, method: "OPTIONS", ok: (s) => s < 500 },
];

async function probe(c: Check) {
  const t0 = Date.now();
  try {
    const r = await fetch(c.url, { method: c.method || "GET", headers: { "User-Agent": "CapitolReceipts-Uptime/1.0", ...(c.headers || {}) }, redirect: "follow", signal: AbortSignal.timeout(15000) });
    const body = c.must ? await r.text() : (await r.body?.cancel(), "");
    const ms = Date.now() - t0;
    const good = c.ok ? c.ok(r.status) : r.status === 200 && (!c.must || body.includes(c.must));
    return { ok: good, ms, error: good ? null : c.ok ? `HTTP ${r.status}` : r.status !== 200 ? `HTTP ${r.status}` : "Page loaded without its content" };
  } catch (e) {
    return { ok: false, ms: Date.now() - t0, error: /timed? ?out|abort/i.test(String(e)) ? "No answer within 15 seconds" : "Could not connect" };
  }
}

// Is the database answering? Used when the site reports failures, and when this monitor can't read its own state.
async function dbAnswers() {
  try {
    const r = await fetch(`${URL_}/rest/v1/app_meta?select=key&limit=1`, { headers: { apikey: SERVICE, ...(SERVICE.startsWith("eyJ") ? { Authorization: `Bearer ${SERVICE}` } : {}) }, signal: AbortSignal.timeout(8000) });
    return r.ok;
  } catch { return false; }
}
// Outage email that needs no database: Resend's idempotency key allows one per hour, however often it's triggered.
async function dbDownEmail(why: string) {
  if (!RESEND) return;
  const hour = new Date().toISOString().slice(0, 13);
  await fetch("https://api.resend.com/emails", { method: "POST",
    headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json", "Idempotency-Key": `db-down-${hour}` },
    body: JSON.stringify({ from: "Capitol Receipts Monitor <alerts@capitolreceipts.com>", to: [TO], subject: "DOWN: the database isn't answering · Capitol Receipts",
      html: `<div style="font:15px/1.55 -apple-system,Segoe UI,Arial,sans-serif;color:#1f2937;max-width:560px"><p><b>The Capitol Receipts database isn't answering.</b> The app can't load records and record pages show an error until it's back.</p><p>Detected: ${why}, ${new Date().toUTCString()}.</p><p>First thing to try: Supabase dashboard › Capitol Receipts › Project Settings › General › <b>Restart project</b>. If the project shows CPU at 100%, the database is overloaded.</p><p style="color:#6b7280;font-size:13px">You get at most one of these an hour while it lasts.</p></div>` }) }).catch(() => {});
}

async function email(subject: string, lines: string[]) {
  if (!RESEND) return;
  const html = `<div style="font:15px/1.55 -apple-system,Segoe UI,Arial,sans-serif;color:#1f2937;max-width:560px">${lines.map((l) => `<p style="margin:0 0 10px">${l}</p>`).join("")}
<p style="margin:16px 0 0;color:#6b7280;font-size:13px">Checked every 5 minutes. Live status: <a href="https://admin.capitolreceipts.com/">admin portal</a> · <a href="https://www.capitolreceipts.com/support">public status</a>.</p></div>`;
  await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "Capitol Receipts Monitor <alerts@capitolreceipts.com>", to: [TO], subject, html }) }).catch(() => {});
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  // The website calls ?db=1 when its database requests fail. Confirm before alerting, so a stray call can't send email.
  if (url.searchParams.get("db") === "1") {
    if (await dbAnswers()) return Response.json({ db: "ok" });
    await dbDownEmail("pages on the site started failing");
    return Response.json({ db: "down", alerted: true });
  }
  const db = createClient(URL_, SERVICE, { auth: { persistSession: false } });
  const { data: prev, error: readErr } = await db.from("service_status").select("*");
  if (readErr && !(await dbAnswers())) { await dbDownEmail("the 5-minute check couldn't reach it"); return Response.json({ db: "down" }, { status: 503 }); }
  const before = new Map((prev || []).map((r: any) => [r.service, r]));
  // at most one run a minute, however often this is called
  const last = Math.max(0, ...(prev || []).map((r: any) => new Date(r.checked_at).getTime()));
  if (Date.now() - last < 55e3) return Response.json({ skipped: "ran less than a minute ago" });

  const results = await Promise.all(CHECKS.map(async (c) => ({ c, r: await probe(c) })));
  const now = new Date().toISOString();
  const down: string[] = [], up: string[] = [], downNames: string[] = [];
  const rows = results.map(({ c, r }) => {
    const p: any = before.get(c.service);
    const fails = r.ok ? 0 : (p?.fails || 0) + 1;
    let alerted = p?.alerted || false;
    if (!r.ok && fails >= 2 && !alerted) { alerted = true; downNames.push(c.label); down.push(`<b>${c.label}</b> is down: ${r.error}. <a href="${c.url}">${c.url}</a>`); }
    if (r.ok && alerted) { alerted = false; up.push(`<b>${c.label}</b> is back up (${r.ms} ms).`); }
    const changed = !p || p.ok !== r.ok;
    return { service: c.service, label: c.label, ok: r.ok, fails, alerted, last_ms: r.ms, last_error: r.error, checked_at: now, changed_at: changed ? now : p.changed_at };
  });
  // once an hour, tick off roadmap items whose checks now pass (secrets set, store files filled in, first real payment)
  if (new Date(now).getUTCMinutes() < 5) await syncRoadmap(db).catch(() => {});
  const { error } = await db.from("service_status").upsert(rows);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (down.length) await email(`DOWN: ${downNames.join(", ")} · Capitol Receipts`, [...down, "It failed two checks in a row (5 minutes apart). You'll get another email when it recovers."]);
  if (up.length) await email(`Recovered · Capitol Receipts`, up);
  return Response.json({ ok: rows.every((r) => r.ok), rows: rows.map((r) => [r.service, r.ok, r.last_ms]) });
});
