// Incoming mail for @capitolreceipts.com (support@, corrections@, and any other address). Resend receives it (MX record
// on capitolreceipts.com) and calls this function with an "email.received" webhook. Each message becomes a support
// request in the admin portal (Support tab) and is forwarded to the team inbox with Reply-To set to the sender, so a
// normal reply from Gmail goes straight back to them.
// Needs RESEND_API_KEY and RESEND_WEBHOOK_SECRET (the whsec_... signing secret of the Resend webhook).
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND = Deno.env.get("RESEND_API_KEY") || "";
const SECRET = Deno.env.get("RESEND_WEBHOOK_SECRET") || "";
const INBOX = Deno.env.get("SUPPORT_INBOX") || "admin@squaredawaylabs.com";
const F = "-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif";
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

// Resend signs webhooks the Svix way: base64(HMAC-SHA256(secret, `${id}.${timestamp}.${body}`))
async function verify(req: Request, body: string) {
  const id = req.headers.get("svix-id"), ts = req.headers.get("svix-timestamp"), sig = req.headers.get("svix-signature");
  if (!SECRET || !id || !ts || !sig) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const key = Uint8Array.from(atob(SECRET.replace(/^whsec_/, "")), (c) => c.charCodeAt(0));
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(`${id}.${ts}.${body}`)))));
  return sig.split(" ").some((p) => { const v = p.split(",")[1] || ""; return v.length === mac.length && [...v].every((c, i) => c === mac[i]); });
}
const addr = (s: string) => (String(s).match(/<([^>]+)>/)?.[1] || String(s)).trim().toLowerCase();
const nameOf = (s: string) => (String(s).match(/^\s*"?([^"<]+?)"?\s*</)?.[1] || "").slice(0, 120);

Deno.serve(async (req) => {
  const raw = await req.text();
  if (!(await verify(req, raw))) return new Response("Bad signature", { status: 401 });
  const ev = JSON.parse(raw);
  if (ev.type !== "email.received") return new Response("ignored");
  const d = ev.data || {};
  const from = addr(d.from || "");
  // the Resend account is shared with other apps and webhooks see every domain's mail: keep only ours
  const to: string[] = [...new Set([...(d.to || []), ...(d.cc || []), ...(d.received_for || [])].map(addr))].filter((a) => a.endsWith("@capitolreceipts.com"));
  if (!to.length) return new Response("not for capitolreceipts.com");
  // never answer robots, bounces or our own mail (stops mail loops)
  if (!from || /^(mailer-daemon|postmaster|no-?reply)@/.test(from) || from.endsWith("@capitolreceipts.com")) return new Response("skipped");

  let text = "", html = "", headers: Record<string, string> = {};
  try {
    const r = await fetch(`https://api.resend.com/emails/receiving/${d.email_id}`, { headers: { Authorization: `Bearer ${RESEND}` } });
    if (r.ok) { const j = await r.json(); text = j.text || ""; html = j.html || ""; headers = j.headers || {}; }
  } catch { /* forward what we have */ }
  const auto = String(headers["auto-submitted"] || headers["Auto-Submitted"] || "").toLowerCase();
  if (auto && auto !== "no") return new Response("skipped auto-reply");

  const body = (text || html.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")).trim();
  const message = `${d.subject ? `Subject: ${d.subject}\n\n` : ""}${body || "(no text)"}`.slice(0, 5000);
  const topic = to.some((a) => a.startsWith("corrections@")) ? "data" : to.some((a) => a.startsWith("privacy@")) ? "privacy" : to.some((a) => a.startsWith("billing@")) ? "billing" : "other";
  const db = createClient(URL_, SERVICE, { auth: { persistSession: false } });
  // webhook retries: one request per received email
  const tag = `resend:${d.email_id}`;
  const { data: seen } = await db.from("support_requests").select("id").eq("note", tag).maybeSingle();
  const { data: row } = seen ? { data: seen } : await db.from("support_requests").insert({ email: from.slice(0, 254), name: nameOf(d.from) || null, topic, message: message.length >= 5 ? message : message.padEnd(5, "."), page: `email to ${to.join(", ")}`.slice(0, 300), platform: "email", note: tag }).select("id").single();
  const ref = row ? `CR-${row.id}` : "email";

  const atts = (d.attachments || []).map((a: any) => esc(a.filename)).join(", ");
  const fwd = `<div style="font:15px/1.55 ${F};color:#1f2937;max-width:640px">
<p style="margin:0 0 10px;color:#6b7280;font-size:13px">${esc(ref)} · sent to ${esc(to.join(", "))} · from ${esc(d.from)}${atts ? ` · attachments: ${atts} (open in Resend › Inboxes)` : ""}. Reply to this email to answer them.</p>
<hr style="border:0;border-top:1px solid #e6e8ec;margin:0 0 14px">${html || `<div style="white-space:pre-wrap">${esc(text)}</div>`}</div>`;
  const r = await fetch("https://api.resend.com/emails", { method: "POST",
    headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json", "Idempotency-Key": `inbound-${d.email_id}` },
    body: JSON.stringify({ from: "Capitol Receipts Inbox <support@capitolreceipts.com>", to: [INBOX], reply_to: from, subject: `[${ref}] ${d.subject || "(no subject)"}`.slice(0, 250), html: fwd }) });
  if (!r.ok) return new Response(`forward failed ${r.status}`, { status: 502 });
  return new Response(`ok ${ref}`);
});
