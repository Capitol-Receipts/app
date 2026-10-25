// Alert emails, called after each data update (GitHub Actions) with the project's service key.
// Free accounts: a weekly summary for up to 5 people they follow.
// Pro: an email within hours of new trade reports landing (or once a day, if they prefer) — people they follow, stocks
// they watch, bills they watch, and the conflict radar (trades tied to a member's own committees, and trades over $250K).
// The data update runs several times a weekday and calls this after each run; Pro users get at most one email per run.
// {"mode":"briefing"} sends the weekly Pro briefing instead (Fridays, from .github/workflows/weekly-briefing.yml).
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SECRET_KEYS = (() => { try { return Object.values(JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}")) as string[]; } catch { return []; } })();
const RESEND = Deno.env.get("RESEND_API_KEY") || "";
const FROM = "Capitol Receipts <alerts@capitolreceipts.com>";
const APP = "https://app.capitolreceipts.com";
const DAY = 20 * 36e5, SOON = 75 * 60e3, WEEK = 6.5 * 864e5, FREE_FOLLOWS = 5, BIG = 250001;

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const money = (n: number) => n >= 1e6 ? `$${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M` : n >= 1e3 ? `$${Math.round(n / 1e3)}K` : `$${n}`;
const fmtDate = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const monthName = (ym: string) => new Date(ym + "-15T12:00:00Z").toLocaleDateString("en-US", { month: "long" });
const font = "-apple-system,Segoe UI,Arial,sans-serif";

// Only the project's own privileged key may trigger sends. A key that matches the function's env is accepted
// directly; any other key (e.g. a newer sb_secret_ key the daily job uses) is accepted only if Supabase itself
// lets it list users, which publishable and user keys cannot do.
async function authorized(req: Request) {
  const h = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || req.headers.get("apikey") || "";
  if (!h || h.startsWith("sb_publishable_")) return false;
  if (h === SERVICE || SECRET_KEYS.includes(h)) return true;
  const r = await fetch(`${URL_}/auth/v1/admin/users?per_page=1`, { headers: { apikey: h, Authorization: `Bearer ${h}` } });
  return r.ok;
}
// iPhone push alerts (APNs). Needs APNS_KEY (the .p8 key text), APNS_KEY_ID and APNS_TEAM_ID; APNS_TOPIC is the
// app's bundle id. Until they're set, alerts go by email only.
const APNS = { key: Deno.env.get("APNS_KEY") || "", kid: Deno.env.get("APNS_KEY_ID") || "", team: Deno.env.get("APNS_TEAM_ID") || "",
  topic: Deno.env.get("APNS_TOPIC") || "com.capitolreceipts.app", host: Deno.env.get("APNS_ENV") === "sandbox" ? "api.sandbox.push.apple.com" : "api.push.apple.com" };
let apnsJwt = { t: "", at: 0 };
const b64u = (b: ArrayBuffer | Uint8Array | string) => btoa(typeof b === "string" ? b : String.fromCharCode(...new Uint8Array(b as ArrayBuffer))).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
async function apnsToken() {
  if (apnsJwt.t && Date.now() - apnsJwt.at < 40 * 60e3) return apnsJwt.t;
  const pem = APNS.key.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const k = await crypto.subtle.importKey("pkcs8", der, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const head = b64u(JSON.stringify({ alg: "ES256", kid: APNS.kid })), body = b64u(JSON.stringify({ iss: APNS.team, iat: Math.floor(Date.now() / 1000) }));
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, k, new TextEncoder().encode(`${head}.${body}`));
  apnsJwt = { t: `${head}.${body}.${b64u(sig)}`, at: Date.now() };
  return apnsJwt.t;
}
async function pushTo(db: any, userId: string, title: string, body: string, data: Record<string, string>) {
  if (!APNS.key || !APNS.kid || !APNS.team) return 0;
  const { data: devs } = await db.from("push_devices").select("token").eq("user_id", userId);
  if (!devs?.length) return 0;
  const jwt = await apnsToken(); let ok = 0;
  for (const d of devs) {
    const r = await fetch(`https://${APNS.host}/3/device/${d.token}`, { method: "POST",
      headers: { authorization: `bearer ${jwt}`, "apns-topic": APNS.topic, "apns-push-type": "alert", "apns-priority": "10" },
      body: JSON.stringify({ aps: { alert: { title, body }, sound: "default" }, ...data }) });
    if (r.ok) ok++; else if (r.status === 410 || r.status === 400) await db.from("push_devices").delete().eq("token", d.token); // uninstalled or bad token
  }
  return ok;
}
const plain = (s: string) => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
type Trade = { key: string; member_id: string; name: string; party: string; state: string; chamber: string; district: number | null; tdate: string; kind: string; ticker: string | null; asset: string | null; lo: number; hi: number; owner: string | null; comm: string | null; first_seen: string };
const who = (t: Trade) => `${t.chamber === "Senate" ? "Sen." : "Rep."} ${esc(t.name)} (${esc(t.party?.[0] || "")}-${esc(t.state)})`;
const assetName = (t: Trade) => ((t.asset || t.ticker || "stock").split(" - ")[0].replace(/\s*\(The\)/i, "").replace(/\s*\([A-Z.\-]{1,8}\)\s*$/, "").replace(/\b(New\s+)?(Common|Ordinary|Class [A-Z]|Series [A-Z])\b.*$/i, "").replace(/[,\s]+(Inc|Corp|Corporation|Co|Ltd|plc|Incorporated|Holdings|Company)\.?\s*$/i, "").replace(/[,\s]+(Inc|Corp|Corporation|Co|Ltd|plc)\.?\s*$/i, "").trim() || t.ticker || "stock").slice(0, 60);
const what = (t: Trade) => `${/Sell/i.test(t.kind) ? "sold" : /Exchange/i.test(t.kind) ? "exchanged" : "bought"} ${esc(assetName(t))}${t.ticker ? ` (${esc(t.ticker)})` : ""} · ${money(+t.lo)}–${money(+t.hi)}`;
const tradeLine = (t: Trade, withWho: boolean) => `${withWho ? `<a href="${APP}/member/${t.member_id}" style="color:#0f1f40;font-weight:600;text-decoration:none">${who(t)}</a> ` : ""}${withWho ? what(t) : what(t).replace(/^./, (c) => c.toUpperCase())} · ${fmtDate(t.tdate)}${t.owner && t.owner !== "Self" ? ` · ${esc(t.owner)}` : ""}${t.comm ? ` <span style="color:#b0244f;font-weight:600">· ${esc(t.comm)}, which their committee oversees</span>` : ""}`;
const section = (title: string, sub: string, lines: string[]) => `<tr><td style="padding:16px 0;border-top:1px solid #e6e8ec"><div style="font:700 17px/1.3 ${font};color:#0f1f40">${title}</div>${sub ? `<div style="font:13px ${font};color:#6b7280;margin-top:2px">${sub}</div>` : ""}
  <ul style="margin:8px 0 0;padding-left:18px;font:14px/1.6 ${font};color:#1f2937">${lines.map((l) => `<li style="margin-bottom:4px">${l}</li>`).join("")}</ul></td></tr>`;

const shell = (pro: boolean, title: string, intro: string, parts: string[], foot: string) => `<div style="background:#f3f4f6;padding:24px 12px"><table role="presentation" width="100%" style="max-width:600px;margin:0 auto;background:#fff;border-radius:14px;padding:24px 28px">
      <tr><td><div style="font:800 20px Arial,sans-serif"><span style="background:#c8323a;color:#fff;padding:2px 6px;border-radius:4px">Capitol</span> Receipts${pro ? ` <span style="font:700 11px Arial;background:#0f1f40;color:#fff;padding:3px 7px;border-radius:999px;vertical-align:middle">PRO</span>` : ""}</div>
      <h1 style="font:800 24px/1.25 ${font};color:#0f1f40;margin:18px 0 4px">${title}</h1>
      <p style="font:15px/1.5 Arial,sans-serif;color:#4b5563;margin:0 0 6px">${intro}</p></td></tr>
      ${parts.join("")}
      <tr><td style="padding-top:18px;font:12.5px/1.5 Arial,sans-serif;color:#6b7280">${foot}</td></tr></table></div>`;

// bills: '119-hr-1' -> 'H.R. 1' and the key used in the lobbying summary ('HR1')
const BTY: Record<string, string> = { hr: "H.R.", s: "S.", hjres: "H.J.Res.", sjres: "S.J.Res.", hres: "H.Res.", sres: "S.Res.", hconres: "H.Con.Res.", sconres: "S.Con.Res." };
const billLabel = (k: string) => { const [, t, n] = k.split("-"); return `${BTY[t] || t.toUpperCase()} ${n}`; };
const lobKey = (k: string) => { const [c, t, n] = k.split("-"); return c === "119" ? `${t.toUpperCase()}${n}` : ""; };
type BillSnap = { a: string; v: number; l: number };
function billSnap(b: any, lob: any): BillSnap {
  const la = b?.la || [];
  return { a: `${la[0] || ""}|${la[1] || ""}`, v: Array.isArray(b?.votes) ? b.votes.length : 0, l: lob?.[lobKey(b.key)]?.n || 0 };
}
function billLines(b: any, was: BillSnap | undefined, now: BillSnap): string[] {
  if (!was) return [];
  const out: string[] = [];
  const title = esc(b.title || billLabel(b.key));
  if (now.a !== was.a && b.la?.[1]) out.push(`<b>${esc(billLabel(b.key))}</b> ${title}: ${esc(b.la[1])}${b.la[0] ? ` (${fmtDate(b.la[0])})` : ""}`);
  if (now.v > was.v) {
    const v = (b.votes || [])[0];
    if (v) out.push(`<b>${esc(billLabel(b.key))}</b> got a new ${v[0] === "S" ? "Senate" : "House"} vote: ${esc(v[5] || "vote")}, ${esc(v[4] || "")} ${v[2]}–${v[3]} (${fmtDate(v[1])}). <a href="${APP}/bill/${b.key}" style="color:#2557a8">See how your reps voted</a>`);
  }
  if (now.l > was.l) out.push(`<b>${esc(billLabel(b.key))}</b>: ${now.l - was.l} more organization${now.l - was.l === 1 ? "" : "s"} reported lobbying on it (${now.l.toLocaleString()} in all)`);
  return out;
}
async function loadBills(db: any, keys: string[]) {
  if (!keys.length) return new Map();
  const { data } = await db.from("bills").select("key,title,light->1,detail->12,detail->13").in("key", keys.slice(0, 2000));
  return new Map((data || []).map((r: any) => [r.key, { key: r.key, title: r["1"] || r.title, la: r["12"], votes: r["13"] }]));
}
const weekKey = (d = new Date()) => { const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day); const y = t.getUTCFullYear(); return `${y}-W${String(Math.ceil(((+t - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7)).padStart(2, "0")}`; };

// The weekly Pro briefing: one shared email for every Pro subscriber who hasn't turned it off.
async function briefing(db: any, dry: boolean) {
  const now = Date.now(), wk = weekKey();
  const { data: prefs } = await db.from("user_prefs").select("user_id,alerts").filter("alerts->>email", "eq", "true");
  const uids = (prefs || []).filter((u: any) => (u.alerts || {}).briefing !== false).map((u: any) => u.user_id);
  if (!uids.length) return { users: 0, sent: 0 };
  const [{ data: subs }, { data: logs }] = await Promise.all([
    db.from("subscriptions").select("user_id,status,trial_ends,period_end").in("user_id", uids),
    db.from("alert_log").select("*").in("user_id", uids),
  ]);
  const pro = new Set((subs || []).filter((s: any) => (s.status === "trialing" && s.trial_ends && new Date(s.trial_ends).getTime() > now) ||
    ((s.status === "active" || s.status === "past_due") && (!s.period_end || new Date(s.period_end).getTime() > now))).map((s: any) => s.user_id));
  const logBy = new Map((logs || []).map((l: any) => [l.user_id, l]));
  const targets = uids.filter((id: string) => pro.has(id) && (logBy.get(id)?.state || {}).briefing !== wk);
  if (!targets.length) return { users: uids.length, sent: 0, note: "nobody due" };

  const since = new Date(now - 7 * 864e5).toISOString();
  const { data: feed } = await db.from("trade_feed").select("*").gte("first_seen", since).order("hi", { ascending: false }).limit(2000);
  const trades = (feed || []) as Trade[];
  const { data: lastRc } = await db.from("roll_calls").select("voted_on").order("voted_on", { ascending: false }).limit(1);
  const rcFrom = lastRc?.[0]?.voted_on ? new Date(new Date(lastRc[0].voted_on).getTime() - 6 * 864e5).toISOString().slice(0, 10) : since.slice(0, 10);
  const { data: rcs } = await db.from("roll_calls").select("id,chamber,voted_on,bill,question,result,yeas,nays").gte("voted_on", rcFrom).limit(500);
  const close = (rcs || []).filter((r: any) => r.yeas != null && r.nays != null && r.yeas + r.nays > 50).sort((a: any, b: any) => Math.abs(a.yeas - a.nays) - Math.abs(b.yeas - b.nays)).slice(0, 5);
  const { data: laws } = await db.from("bills").select("key,title,light->1,became_law").gte("became_law", since.slice(0, 10)).order("became_law", { ascending: false }).limit(10);
  const { data: meta } = await db.from("app_meta").select("key,value").in("key", ["lobbied_bills", "perf"]);
  const mv = Object.fromEntries((meta || []).map((r: any) => [r.key, r.value]));
  const lob = Object.entries(mv.lobbied_bills || {}).sort((a: any, b: any) => b[1].n - a[1].n).slice(0, 5);

  const parts: string[] = [];
  const comm = trades.filter((t) => t.comm);
  if (trades.length) parts.push(section("Biggest trades reported this week", `${trades.length.toLocaleString()} new trades${comm.length ? `, ${comm.length} tied to the member’s own committees` : ""}`, trades.slice(0, 8).map((t) => tradeLine(t, true))));
  if (close.length) parts.push(section("Closest votes", "", close.map((r: any) => `${r.chamber === "Senate" || r.chamber === "S" ? "Senate" : "House"}${/^(HR|S|HJRES|SJRES|HRES|SRES)\d+$/.test(r.bill || "") ? `, ${esc(String(r.bill).replace(/^([A-Z]+)(\d+)$/, (_: string, t: string, n: string) => `${BTY[t.toLowerCase()] || t} ${n}`))}` : ""}: ${esc(r.result || r.question || "Vote")} <b>${r.yeas}–${r.nays}</b> (${fmtDate(String(r.voted_on).slice(0, 10))})`)));
  if (laws?.length) parts.push(section("New laws", "", laws.map((b: any) => `<a href="${APP}/bill/${b.key}" style="color:#0f1f40;text-decoration:none"><b>${esc(billLabel(b.key))}</b> ${esc(b["1"] || b.title)}</a>, signed ${fmtDate(b.became_law)}`)));
  if (lob.length) parts.push(section("Most-lobbied bills right now", "Organizations that named each bill in lobbying reports", lob.map(([k, v]: any) => `<b>${esc(k.replace(/^([A-Z]+)(\d+)$/, (_: string, t: string, n: string) => `${BTY[t.toLowerCase()] || t} ${n}`))}</b>: ${v.n.toLocaleString()} organizations${v.top?.length ? `, including ${esc(v.top.slice(0, 3).join(", "))}` : ""}`)));
  const pm = mv.perf?.m ? Object.entries(mv.perf.m).filter(([, r]: any) => r.n >= 10) : [];
  if (pm.length) {
    const top = pm.sort((a: any, b: any) => b[1].ex - a[1].ex).slice(0, 3);
    const { data: names } = await db.from("members").select("id,name,party,state").in("id", top.map((x: any) => x[0]));
    const nb = new Map((names || []).map((n: any) => [n.id, n]));
    parts.push(section("Best stock pickers in Congress", "Purchases since January 2025 compared with the S&P 500 over the same days", top.map(([id, r]: any) => { const n: any = nb.get(id); return `<a href="${APP}/member/${id}" style="color:#0f1f40;font-weight:600;text-decoration:none">${esc(n?.name || id)}</a> (${esc(n?.party?.[0] || "")}-${esc(n?.state || "")}): ${(r.ret * 100).toFixed(0)}% vs ${(r.spx * 100).toFixed(0)}% for the S&P 500 across ${r.n} buys`; })));
  }
  if (!parts.length) return { users: targets.length, sent: 0, note: "nothing to report" };
  const html = shell(true, "Your week in Congress", "The trades, votes, laws and lobbying fights from the last seven days, from public records.", parts,
    `You get this because you have Pro. <a href="${APP}/?go=pro" style="color:#2557a8">Turn off the weekly briefing</a> in Alert settings. A committee link means the company's industry falls under a committee the member sits on; it isn't proof of wrongdoing.`);
  let sent = 0; const errors: string[] = [];
  for (const id of targets) {
    if (dry) { sent++; continue; }
    const { data: ud } = await db.auth.admin.getUserById(id);
    const email = ud?.user?.email; if (!email) continue;
    const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json", "Idempotency-Key": `briefing-${wk}-${id}` },
      body: JSON.stringify({ from: FROM, to: [email], subject: `Your week in Congress: ${trades.length.toLocaleString()} new trades${close.length ? `, ${close.length} close votes` : ""}`, html }) });
    if (r.ok) { sent++; const st = logBy.get(id)?.state || {}; await db.from("alert_log").upsert({ user_id: id, last_sent: logBy.get(id)?.last_sent || null, state: { ...st, briefing: wk } }); }
    else errors.push(`${r.status} ${(await r.text()).slice(0, 160)}`);
  }
  return { users: targets.length, sent, dry, errors: errors.slice(0, 5) };
}

Deno.serve(async (req) => {
  if (!(await authorized(req))) return new Response("Unauthorized", { status: 401 });
  const body = await req.json().catch(() => ({}));
  const dry = !!body.dry;
  if (!RESEND && !dry) return Response.json({ sent: 0, note: "RESEND_API_KEY not set" });
  const db = createClient(URL_, SERVICE, { auth: { persistSession: false } });
  if (body.mode === "briefing") return Response.json(await briefing(db, dry));

  const { data: prefs, error } = await db.from("user_prefs").select("user_id,following,stocks,bills,alerts").filter("alerts->>email", "eq", "true");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!prefs?.length) return Response.json({ sent: 0, users: 0 });
  const uids = prefs.map((u) => u.user_id);
  const [{ data: subs }, { data: logs }] = await Promise.all([
    db.from("subscriptions").select("user_id,status,trial_ends,period_end").in("user_id", uids),
    db.from("alert_log").select("*").in("user_id", uids),
  ]);
  const now = Date.now();
  const proOf = new Map((subs || []).map((s) => [s.user_id,
    (s.status === "trialing" && s.trial_ends && new Date(s.trial_ends).getTime() > now) ||
    ((s.status === "active" || s.status === "past_due") && (!s.period_end || new Date(s.period_end).getTime() > now))]));
  const logBy = new Map((logs || []).map((l) => [l.user_id, l]));

  // everything newly reported in the last 8 days, once
  const { data: feed } = await db.from("trade_feed").select("*").gte("first_seen", new Date(now - 8 * 864e5).toISOString()).order("first_seen", { ascending: false }).limit(5000);
  const trades = (feed || []) as Trade[];

  const allFollow = [...new Set(prefs.flatMap((u) => u.following || []))];
  const { data: mems } = allFollow.length ? await db.from("members").select("id,name,party,state,chamber,district,data->missedM").in("id", allFollow) : { data: [] };
  const memBy = new Map((mems || []).map((m: any) => [m.id, m]));
  // bills people watch (Pro), and the lobbying counts to compare against
  const allBills = [...new Set(prefs.flatMap((u) => u.bills || []))];
  const billBy = await loadBills(db, allBills);
  const { data: lobRow } = allBills.length ? await db.from("app_meta").select("value").eq("key", "lobbied_bills").maybeSingle() : { data: null };
  const lobBy = lobRow?.value || {};

  let sent = 0, skipped = 0;
  const errors: string[] = [];
  for (const u of prefs) {
    const pro = !!proOf.get(u.user_id);
    const log = logBy.get(u.user_id);
    const last = log?.last_sent ? new Date(log.last_sent).getTime() : 0;
    const al = Object.assign({ trades: true, votes: true, radar: true, instant: true, bills: true }, u.alerts || {});
    const state = { ...(log?.state || {}) };
    // watched bills: compare with what we saw last time (the first look just records it)
    const billParts: string[] = [];
    if (pro && (u.bills || []).length) {
      const prev = state.bills || {}, next: Record<string, BillSnap> = {};
      for (const k of u.bills) { const b = billBy.get(k); if (!b) continue; next[k] = billSnap(b, lobBy); if (al.bills) billParts.push(...billLines(b, prev[k], next[k])); }
      if (JSON.stringify(prev) !== JSON.stringify(next)) { state.bills = next; if (!billParts.length && !dry) await db.from("alert_log").upsert({ user_id: u.user_id, last_sent: log?.last_sent || null, state }); }
    }
    if (last && now - last < (pro ? (al.instant ? SOON : DAY) : WEEK)) { skipped++; continue; }
    const since = last || now - 7 * 864e5;
    const fresh = trades.filter((t) => new Date(t.first_seen).getTime() > since);
    const follows: string[] = (u.following || []).slice(0, pro ? 10000 : FREE_FOLLOWS);
    const parts: string[] = [];
    const seenKeys = new Set<string>();
    const tally = (ts: Trade[]) => ts.forEach((t) => seenKeys.add(t.key));

    // people they follow
    for (const id of follows) {
      const lines: string[] = [];
      if (al.trades) {
        const mine = fresh.filter((t) => t.member_id === id);
        mine.slice(0, 6).forEach((t) => lines.push(tradeLine(t, false)));
        if (mine.length > 6) lines.push(`…and ${mine.length - 6} more trades`);
        tally(mine);
      }
      const m: any = memBy.get(id);
      if (!pro && al.votes && Array.isArray(m?.missedM) && m.missedM.length) {
        const lm = m.missedM[m.missedM.length - 1];
        if (lm && lm[1] > 0) lines.push(`Missed ${lm[1]} of ${lm[2]} votes in ${monthName(lm[0])}`);
      }
      if (!lines.length) continue;
      const name = m?.name || fresh.find((t) => t.member_id === id)?.name || id;
      parts.push(section(`<a href="${APP}/member/${id}" style="color:#0f1f40;text-decoration:none">${esc(name)}</a>`, "", lines));
    }
    if (pro) {
      // stocks they watch
      const watch = new Set((u.stocks || []).map((s: string) => s.toUpperCase()));
      const hits = fresh.filter((t) => t.ticker && watch.has(t.ticker));
      if (hits.length) {
        tally(hits);
        parts.push(section("Stocks you watch", `${hits.length} new trade${hits.length > 1 ? "s" : ""} by members of Congress`, hits.slice(0, 12).map((t) => tradeLine(t, true)).concat(hits.length > 12 ? [`…and ${hits.length - 12} more`] : [])));
      }
      if (billParts.length) parts.push(section("Bills you watch", "", billParts.slice(0, 12)));
      // conflict radar
      if (al.radar) {
        const rad = fresh.filter((t) => t.comm || +t.hi >= BIG).sort((a, b) => (b.comm ? 1 : 0) - (a.comm ? 1 : 0) || +b.hi - +a.hi);
        if (rad.length) {
          tally(rad);
          parts.push(section("Conflict radar", "Trades tied to the member’s own committees, and trades over $250K, across all of Congress", rad.slice(0, 10).map((t) => tradeLine(t, true)).concat([`<a href="${APP}/?go=radar" style="color:#2557a8">See the full radar${rad.length > 10 ? ` (${rad.length} new)` : ""}</a>`])));
        }
      }
    }
    if (!parts.length) { skipped++; continue; }
    const { data: ud } = await db.auth.admin.getUserById(u.user_id);
    const email = ud?.user?.email;
    if (!email) { skipped++; continue; }
    const upsell = pro ? "" : `<tr><td style="padding:16px;background:#f3f4f6;border-radius:12px;font:14px/1.5 ${font};color:#1f2937"><b>Get these within hours of filing.</b> Pro sends same-day alerts, watches the stocks you pick, and flags every trade tied to a member's own committee. <a href="${APP}/?go=pro" style="color:#2557a8;font-weight:600">Try Pro free for 7 days</a></td></tr>`;
    const html = `<div style="background:#f3f4f6;padding:24px 12px"><table role="presentation" width="100%" style="max-width:600px;margin:0 auto;background:#fff;border-radius:14px;padding:24px 28px">
      <tr><td><div style="font:800 20px Arial,sans-serif"><span style="background:#c8323a;color:#fff;padding:2px 6px;border-radius:4px">Capitol</span> Receipts${pro ? ` <span style="font:700 11px Arial;background:#0f1f40;color:#fff;padding:3px 7px;border-radius:999px;vertical-align:middle">PRO</span>` : ""}</div>
      <h1 style="font:800 24px/1.25 ${font};color:#0f1f40;margin:18px 0 4px">${pro ? "New since your last alert" : "Your weekly update"}</h1>
      <p style="font:15px/1.5 Arial,sans-serif;color:#4b5563;margin:0 0 6px">${pro ? "New filings on the people, stocks and bills you asked us to watch, from public records." : "What the people you follow did, from public records."}</p></td></tr>
      ${parts.join("")}${upsell}
      <tr><td style="padding-top:18px;font:12.5px/1.5 Arial,sans-serif;color:#6b7280">Trades are reported in ranges and can be filed up to 45 days after the trade. A committee link means the company's industry falls under a committee the member sits on; it isn't proof of wrongdoing. <a href="${APP}" style="color:#2557a8">Change your alerts</a> in the app.</td></tr></table></div>`;
    const count = seenKeys.size;
    const subject = pro && count ? `${count} new trade${count === 1 ? "" : "s"} to know about` : pro && billParts.length ? "Updates on bills you watch" : pro ? "Your Capitol Receipts alerts" : "Your weekly Capitol Receipts update";
    if (dry) { sent++; continue; }
    // same alert on their iPhone, if they turned it on in the app
    try {
      const first = fresh.find((t) => seenKeys.has(t.key));
      const line = first ? plain(`${first.chamber === "Senate" ? "Sen." : "Rep."} ${first.name} ${what(first)}`) : plain(billParts[0] || "");
      if (line) await pushTo(db, u.user_id, subject, count > 1 ? `${line}, and ${count - 1} more` : line, first ? { member: first.member_id } : {});
    } catch (e) { errors.push(`push ${String(e).slice(0, 120)}`); }
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [email], subject, html }),
    });
    if (r.ok) { sent++; await db.from("alert_log").upsert({ user_id: u.user_id, last_sent: new Date().toISOString(), state }); }
    else errors.push(`${r.status} ${(await r.text()).slice(0, 200)}`);
  }
  return Response.json({ users: prefs.length, sent, skipped, dry, errors: errors.slice(0, 5) });
});
