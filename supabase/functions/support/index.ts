// Help & support: the contact form on www.capitolreceipts.com/support and in the app (Account › Help & support).
// Saves the request in public.support_requests (no public access), emails it to the team with Reply-To set to the
// sender, and sends the sender a short confirmation. Replies are sent from the admin portal (admin function).
// Spam limits: hidden honeypot field, length checks, at most 5 requests an hour per connection and per email address.
// Needs RESEND_API_KEY. SUPPORT_INBOX optional (defaults to admin@squaredawaylabs.com).
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND = Deno.env.get("RESEND_API_KEY") || "";
const INBOX = Deno.env.get("SUPPORT_INBOX") || "admin@squaredawaylabs.com";
const FROM = "Capitol Receipts Support <support@capitolreceipts.com>";
const ORIGINS = ["https://app.capitolreceipts.com", "https://www.capitolreceipts.com", "https://capitolreceipts.com", "capacitor://localhost", "https://localhost"];
const TOPICS: Record<string, string> = { account: "Account or sign-in", billing: "Billing and Pro", alerts: "Alerts and emails", data: "A mistake in the data", app: "Something isn't working", privacy: "Privacy or deleting data", other: "Something else" };
const F = "-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif";

const cors = (req: Request) => {
  const o = req.headers.get("origin") || "";
  return { "Access-Control-Allow-Origin": ORIGINS.includes(o) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o) ? o : ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", Vary: "Origin" };
};
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const clean = (s: unknown, n: number) => String(s ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, n);
const EMAIL = /^[^\s@<>"',;]{1,64}@[^\s@<>"',;]+\.[a-z]{2,}$/i;

async function sha(s: string) {
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
  return [...d].slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function send(to: string, subject: string, html: string, replyTo: string, key: string) {
  const r = await fetch("https://api.resend.com/emails", { method: "POST",
    headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json", "Idempotency-Key": key },
    body: JSON.stringify({ from: FROM, to: [to], reply_to: replyTo, subject, html }) });
  if (!r.ok) throw new Error(`Resend ${r.status} ${(await r.text()).slice(0, 160)}`);
}
const card = (title: string, body: string) => `<div style="background:#f3f4f6;padding:24px 12px"><table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;padding:24px 28px"><tr><td>
<div style="font:800 18px ${F}"><span style="background:#c8323a;color:#fff;padding:2px 6px;border-radius:4px">Capitol</span> Receipts</div>
<h1 style="font:800 22px/1.3 ${F};color:#0f1f40;margin:18px 0 8px">${title}</h1>${body}</td></tr></table></div>`;
const p = (t: string) => `<p style="margin:0 0 12px;font:15px/1.55 ${F};color:#1f2937">${t}</p>`;

Deno.serve(async (req) => {
  const h = cors(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: h });
  const out = (body: unknown, status = 200) => Response.json(body, { status, headers: h });
  if (req.method !== "POST") return out({ error: "Use POST" }, 405);
  const b = await req.json().catch(() => null);
  if (!b || typeof b !== "object") return out({ error: "Send the form as JSON." }, 400);
  // bots fill every field; people never see this one
  if (clean(b.website, 200)) return out({ ok: true });

  const email = clean(b.email, 254).toLowerCase(), message = clean(b.message, 5000), name = clean(b.name, 120);
  const topic = TOPICS[b.topic] ? b.topic : "other";
  if (!EMAIL.test(email)) return out({ error: "Enter an email address we can reply to." }, 400);
  if (message.length < 5) return out({ error: "Tell us a little more so we can help." }, 400);

  const db = createClient(URL_, SERVICE, { auth: { persistSession: false } });
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || req.headers.get("cf-connecting-ip") || "unknown";
  const ipHash = await sha("cr-support:" + ip);
  const hourAgo = new Date(Date.now() - 36e5).toISOString();
  const [{ count: byIp }, { count: byEmail }] = await Promise.all([
    db.from("support_requests").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", hourAgo),
    db.from("support_requests").select("id", { count: "exact", head: true }).ilike("email", email.replace(/[%_\\]/g, "\\$&")).gte("created_at", hourAgo),
  ]);
  if ((byIp || 0) >= 5 || (byEmail || 0) >= 5) return out({ error: "We've received several messages from you in the last hour. We'll reply to those first." }, 429);

  // signed in? attach the account and plan so we don't have to ask
  let userId: string | null = null, plan: string | null = null;
  const tok = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (tok && tok.split(".").length === 3) {
    const { data } = await db.auth.getUser(tok);
    if (data?.user) {
      userId = data.user.id;
      const { data: s } = await db.from("subscriptions").select("status,plan,source,period_end").eq("user_id", userId).maybeSingle();
      plan = s ? `${s.status} ${s.plan || ""} via ${s.source || "?"}`.slice(0, 60) : "free";
    }
  }
  const page = clean(b.page, 300) || null, platform = clean(b.platform, 40) || "web";
  const { data: row, error } = await db.from("support_requests").insert({ email, name: name || null, topic, message, page, platform, user_id: userId, plan, ip_hash: ipHash }).select("id").single();
  if (error) return out({ error: "We couldn't save your message. Please try again in a minute." }, 500);
  const ref = `CR-${row.id}`;

  if (RESEND) {
    try {
      await send(INBOX, `[${ref}] ${TOPICS[topic]}: ${message.replace(/\s+/g, " ").slice(0, 60)}`, card(`New support request ${ref}`,
        p(`<b>From:</b> ${esc(name || "(no name)")} &lt;${esc(email)}&gt;<br><b>Topic:</b> ${esc(TOPICS[topic])}<br><b>Account:</b> ${userId ? `signed in · ${esc(plan)}` : "not signed in"}<br><b>Where:</b> ${esc(platform)}${page ? ` · ${esc(page)}` : ""}`) +
        `<div style="white-space:pre-wrap;border:1px solid #e6e8ec;border-radius:10px;padding:14px;font:15px/1.55 ${F};color:#1f2937">${esc(message)}</div>` +
        p(`<br>Reply to this email to answer them directly, or answer from the <a href="https://admin.capitolreceipts.com/#support">admin portal</a> so the reply is logged.`)), email, `support-${row.id}-team`);
      await send(email, `We got your message (${ref})`, card("Thanks, we got your message",
        p(`Thanks for writing to Capitol Receipts. A person reads every message, and we usually reply within one business day.`) +
        p(`Your reference is <b>${ref}</b>. To add anything, just reply to this email.`) +
        // the message itself is not repeated here, so the form can't be used to send someone else arbitrary text
        p(`Didn't write to us? You can ignore this email.`) +
        p(`Many answers are on our <a href="https://www.capitolreceipts.com/support" style="color:#2557a8">help page</a>.`)), INBOX, `support-${row.id}-ack`);
    } catch (e) {
      console.error("support email", String(e));
      // the request is saved and shows in the admin portal even if email fails
    }
  }
  return out({ ok: true, ref });
});
