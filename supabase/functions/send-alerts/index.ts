// Weekly alert emails for people who turned on "Also email me a weekly summary".
// Called once a day by the data update (GitHub Actions) with the project's service key; each user gets at most one email a week.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SECRET_KEYS = (() => { try { return Object.values(JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}")) as string[]; } catch { return []; } })();
const RESEND = Deno.env.get("RESEND_API_KEY") || "";
const FROM = "Capitol Receipts <alerts@capitolreceipts.com>";
const APP = "https://app.capitolreceipts.com";
const WEEK = 6.5 * 864e5;

const esc = (s: string) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const money = (n: number) => n >= 1e6 ? `$${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M` : n >= 1e3 ? `$${Math.round(n / 1e3)}K` : `$${n}`;
const fmtDate = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const monthName = (ym: string) => new Date(ym + "-15T12:00:00Z").toLocaleDateString("en-US", { month: "long" });

function authorized(req: Request) {
  const h = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || req.headers.get("apikey") || "";
  return !!h && (h === SERVICE || SECRET_KEYS.includes(h));
}

Deno.serve(async (req) => {
  if (!authorized(req)) return new Response("Unauthorized", { status: 401 });
  if (!RESEND) return Response.json({ sent: 0, note: "RESEND_API_KEY not set" });
  const body = await req.json().catch(() => ({}));
  const dry = !!body.dry;
  const db = createClient(URL_, SERVICE, { auth: { persistSession: false } });

  const { data: prefs, error } = await db.from("user_prefs").select("user_id,following,alerts").filter("alerts->>email", "eq", "true");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const users = (prefs || []).filter((p) => (p.following || []).length);
  if (!users.length) return Response.json({ sent: 0, users: 0 });

  const ids = [...new Set(users.flatMap((u) => u.following))];
  const { data: mems } = await db.from("members").select("id,name,party,state,chamber,district,data").in("id", ids);
  const byId = new Map((mems || []).map((m) => [m.id, m]));
  const { data: logs } = await db.from("alert_log").select("*").in("user_id", users.map((u) => u.user_id));
  const logBy = new Map((logs || []).map((l) => [l.user_id, l]));

  let sent = 0, skipped = 0;
  const errors: string[] = [];
  for (const u of users) {
    const log = logBy.get(u.user_id);
    if (log?.last_sent && Date.now() - new Date(log.last_sent).getTime() < WEEK) { skipped++; continue; }
    const al = Object.assign({ trades: true, votes: true }, u.alerts || {});
    const seen: Record<string, number> = (log?.state?.seen) || {};
    const since = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
    const sections: string[] = [];
    const nextSeen: Record<string, number> = {};
    for (const id of u.following) {
      const m = byId.get(id);
      if (!m) continue;
      const d = m.data || {};
      const trades: any[] = d.trades || [];
      const n = d.tradeN || trades.length;
      nextSeen[id] = n;
      const lines: string[] = [];
      if (al.trades) {
        const fresh = seen[id] == null ? trades.filter((t) => t[0] >= since) : trades.slice(0, Math.max(0, n - seen[id]));
        fresh.slice(0, 6).forEach((t) => lines.push(`${/Sell/.test(t[1]) ? "Sold" : "Bought"} ${esc((t[3] || t[2] || "stock").split(" - ")[0].slice(0, 60))} · ${money(t[4])}–${money(t[5])} · ${fmtDate(t[0])}${t[6] && t[6] !== "Self" ? ` · ${esc(t[6])}` : ""}`));
        if (fresh.length > 6) lines.push(`…and ${fresh.length - 6} more trades`);
      }
      if (al.votes && Array.isArray(d.missedM) && d.missedM.length) {
        const last = d.missedM[d.missedM.length - 1];
        if (last && last[1] > 0) lines.push(`Missed ${last[1]} of ${last[2]} votes in ${monthName(last[0])}`);
      }
      if (!lines.length) continue;
      const where = m.chamber === "Senate" ? m.state : `${m.state}-${m.district || "AL"}`;
      sections.push(`<tr><td style="padding:16px 0;border-top:1px solid #e6e8ec"><a href="${APP}/#p=${id}" style="font:700 17px/1.3 -apple-system,Segoe UI,Arial,sans-serif;color:#0f1f40;text-decoration:none">${esc(m.name)}</a> <span style="font:13px Arial,sans-serif;color:#6b7280">${esc(m.party)} · ${esc(where)}</span>
        <ul style="margin:8px 0 0;padding-left:18px;font:14px/1.6 -apple-system,Segoe UI,Arial,sans-serif;color:#1f2937">${lines.map((l) => `<li>${l}</li>`).join("")}</ul></td></tr>`);
    }
    if (!sections.length) { skipped++; if (!dry) await db.from("alert_log").upsert({ user_id: u.user_id, last_sent: log?.last_sent || null, state: { seen: nextSeen } }); continue; }
    const { data: ud } = await db.auth.admin.getUserById(u.user_id);
    const email = ud?.user?.email;
    if (!email) { skipped++; continue; }
    const html = `<div style="background:#f3f4f6;padding:24px 12px"><table role="presentation" width="100%" style="max-width:600px;margin:0 auto;background:#fff;border-radius:14px;padding:24px 28px">
      <tr><td><div style="font:800 20px Arial,sans-serif"><span style="background:#c8323a;color:#fff;padding:2px 6px;border-radius:4px">Capitol</span> Receipts</div>
      <h1 style="font:800 24px/1.25 -apple-system,Segoe UI,Arial,sans-serif;color:#0f1f40;margin:18px 0 4px">Your weekly update</h1>
      <p style="font:15px/1.5 Arial,sans-serif;color:#4b5563;margin:0 0 6px">What the people you follow did, from public records.</p></td></tr>
      ${sections.join("")}
      <tr><td style="padding-top:18px;border-top:1px solid #e6e8ec;font:12.5px/1.5 Arial,sans-serif;color:#6b7280">Trades are reported in ranges and can be filed up to 45 days late. <a href="${APP}" style="color:#2557a8">Open Capitol Receipts</a>. To stop these emails, open Alerts in the app and turn off the weekly email.</td></tr></table></div>`;
    if (dry) { sent++; continue; }
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [email], subject: "Your weekly Capitol Receipts update", html }),
    });
    if (r.ok) { sent++; await db.from("alert_log").upsert({ user_id: u.user_id, last_sent: new Date().toISOString(), state: { seen: nextSeen } }); }
    else errors.push(`${r.status} ${(await r.text()).slice(0, 200)}`);
  }
  return Response.json({ users: users.length, sent, skipped, errors: errors.slice(0, 5) });
});
