// Alert emails, called once a day by the data update (GitHub Actions) with the project's service key.
// Free accounts: a weekly summary for up to 5 people they follow.
// Pro: an email the morning new trade reports land — people they follow, stocks they watch, and the conflict radar
// (trades tied to a member's own committees, and trades over $250K, across all of Congress).
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SECRET_KEYS = (() => { try { return Object.values(JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}")) as string[]; } catch { return []; } })();
const RESEND = Deno.env.get("RESEND_API_KEY") || "";
const FROM = "Capitol Receipts <alerts@capitolreceipts.com>";
const APP = "https://app.capitolreceipts.com";
const DAY = 20 * 36e5, WEEK = 6.5 * 864e5, FREE_FOLLOWS = 5, BIG = 250001;

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const money = (n: number) => n >= 1e6 ? `$${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M` : n >= 1e3 ? `$${Math.round(n / 1e3)}K` : `$${n}`;
const fmtDate = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const monthName = (ym: string) => new Date(ym + "-15T12:00:00Z").toLocaleDateString("en-US", { month: "long" });
const font = "-apple-system,Segoe UI,Arial,sans-serif";

function authorized(req: Request) {
  const h = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || req.headers.get("apikey") || "";
  return !!h && (h === SERVICE || SECRET_KEYS.includes(h));
}
type Trade = { key: string; member_id: string; name: string; party: string; state: string; chamber: string; district: number | null; tdate: string; kind: string; ticker: string | null; asset: string | null; lo: number; hi: number; owner: string | null; comm: string | null; first_seen: string };
const who = (t: Trade) => `${t.chamber === "Senate" ? "Sen." : "Rep."} ${esc(t.name)} (${esc(t.party?.[0] || "")}-${esc(t.state)})`;
const assetName = (t: Trade) => ((t.asset || t.ticker || "stock").split(" - ")[0].replace(/\s*\(The\)/i, "").replace(/\s*\([A-Z.\-]{1,8}\)\s*$/, "").replace(/\b(New\s+)?(Common|Ordinary|Class [A-Z]|Series [A-Z])\b.*$/i, "").replace(/[,\s]+(Inc|Corp|Corporation|Co|Ltd|plc|Incorporated|Holdings|Company)\.?\s*$/i, "").replace(/[,\s]+(Inc|Corp|Corporation|Co|Ltd|plc)\.?\s*$/i, "").trim() || t.ticker || "stock").slice(0, 60);
const what = (t: Trade) => `${/Sell/i.test(t.kind) ? "sold" : /Exchange/i.test(t.kind) ? "exchanged" : "bought"} ${esc(assetName(t))}${t.ticker ? ` (${esc(t.ticker)})` : ""} · ${money(+t.lo)}–${money(+t.hi)}`;
const tradeLine = (t: Trade, withWho: boolean) => `${withWho ? `<a href="${APP}/member/${t.member_id}" style="color:#0f1f40;font-weight:600;text-decoration:none">${who(t)}</a> ` : ""}${withWho ? what(t) : what(t).replace(/^./, (c) => c.toUpperCase())} · ${fmtDate(t.tdate)}${t.owner && t.owner !== "Self" ? ` · ${esc(t.owner)}` : ""}${t.comm ? ` <span style="color:#b0244f;font-weight:600">· ${esc(t.comm)}, which their committee oversees</span>` : ""}`;
const section = (title: string, sub: string, lines: string[]) => `<tr><td style="padding:16px 0;border-top:1px solid #e6e8ec"><div style="font:700 17px/1.3 ${font};color:#0f1f40">${title}</div>${sub ? `<div style="font:13px ${font};color:#6b7280;margin-top:2px">${sub}</div>` : ""}
  <ul style="margin:8px 0 0;padding-left:18px;font:14px/1.6 ${font};color:#1f2937">${lines.map((l) => `<li style="margin-bottom:4px">${l}</li>`).join("")}</ul></td></tr>`;

Deno.serve(async (req) => {
  if (!authorized(req)) return new Response("Unauthorized", { status: 401 });
  const body = await req.json().catch(() => ({}));
  const dry = !!body.dry;
  if (!RESEND && !dry) return Response.json({ sent: 0, note: "RESEND_API_KEY not set" });
  const db = createClient(URL_, SERVICE, { auth: { persistSession: false } });

  const { data: prefs, error } = await db.from("user_prefs").select("user_id,following,stocks,alerts").filter("alerts->>email", "eq", "true");
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

  let sent = 0, skipped = 0;
  const errors: string[] = [];
  for (const u of prefs) {
    const pro = !!proOf.get(u.user_id);
    const log = logBy.get(u.user_id);
    const last = log?.last_sent ? new Date(log.last_sent).getTime() : 0;
    if (last && now - last < (pro ? DAY : WEEK)) { skipped++; continue; }
    const since = last || now - 7 * 864e5;
    const fresh = trades.filter((t) => new Date(t.first_seen).getTime() > since);
    const al = Object.assign({ trades: true, votes: true, radar: true }, u.alerts || {});
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
    const upsell = pro ? "" : `<tr><td style="padding:16px;background:#f3f4f6;border-radius:12px;font:14px/1.5 ${font};color:#1f2937"><b>Get these the morning they're filed.</b> Pro sends daily alerts, watches the stocks you pick, and flags every trade tied to a member's own committee. <a href="${APP}/?go=pro" style="color:#2557a8;font-weight:600">Try Pro free for 7 days</a></td></tr>`;
    const html = `<div style="background:#f3f4f6;padding:24px 12px"><table role="presentation" width="100%" style="max-width:600px;margin:0 auto;background:#fff;border-radius:14px;padding:24px 28px">
      <tr><td><div style="font:800 20px Arial,sans-serif"><span style="background:#c8323a;color:#fff;padding:2px 6px;border-radius:4px">Capitol</span> Receipts${pro ? ` <span style="font:700 11px Arial;background:#0f1f40;color:#fff;padding:3px 7px;border-radius:999px;vertical-align:middle">PRO</span>` : ""}</div>
      <h1 style="font:800 24px/1.25 ${font};color:#0f1f40;margin:18px 0 4px">${pro ? "New reports today" : "Your weekly update"}</h1>
      <p style="font:15px/1.5 Arial,sans-serif;color:#4b5563;margin:0 0 6px">${pro ? "Newly filed trades you asked us to watch, from public records." : "What the people you follow did, from public records."}</p></td></tr>
      ${parts.join("")}${upsell}
      <tr><td style="padding-top:18px;font:12.5px/1.5 Arial,sans-serif;color:#6b7280">Trades are reported in ranges and can be filed up to 45 days after the trade. A committee link means the company's industry falls under a committee the member sits on; it isn't proof of wrongdoing. <a href="${APP}" style="color:#2557a8">Change your alerts</a> in the app.</td></tr></table></div>`;
    const count = seenKeys.size;
    const subject = pro && count ? `${count} new trade${count === 1 ? "" : "s"} to know about` : pro ? "Your Capitol Receipts alerts" : "Your weekly Capitol Receipts update";
    if (dry) { sent++; continue; }
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [email], subject, html }),
    });
    if (r.ok) { sent++; await db.from("alert_log").upsert({ user_id: u.user_id, last_sent: new Date().toISOString(), state: {} }); }
    else errors.push(`${r.status} ${(await r.text()).slice(0, 200)}`);
  }
  return Response.json({ users: prefs.length, sent, skipped, dry, errors: errors.slice(0, 5) });
});
