// Admin portal API (admin.capitolreceipts.com). Every call needs a signed-in account whose email is in public.admins.
// Reads go through service-only SQL functions (admin_overview, admin_users); every change is written to public.admin_log.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE = Deno.env.get("STRIPE_SECRET_KEY") || "";
const RESEND = Deno.env.get("RESEND_API_KEY") || "";
const ORIGINS = ["https://admin.capitolreceipts.com", "https://app.capitolreceipts.com", "http://localhost:8790"];
const cors = (o: string | null) => ({
  "Access-Control-Allow-Origin": o && ORIGINS.includes(o) ? o : ORIGINS[0],
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});

const sget = async (path: string) => {
  const r = await fetch(`https://api.stripe.com/v1/${path}`, { headers: { Authorization: `Bearer ${STRIPE}` } });
  if (!r.ok) throw new Error(`Stripe ${r.status}`);
  return r.json();
};
async function stripeAll(path: string, max = 500) {
  const out: any[] = [];
  let after = "";
  while (out.length < max) {
    const j = await sget(`${path}${path.includes("?") ? "&" : "?"}limit=100${after ? `&starting_after=${after}` : ""}`);
    out.push(...j.data);
    if (!j.has_more || !j.data.length) break;
    after = j.data[j.data.length - 1].id;
  }
  return out;
}

async function revenue() {
  if (!STRIPE) return { configured: false };
  const since = Math.floor(Date.now() / 1000) - 30 * 86400;
  const [subs, charges, bal] = await Promise.all([
    stripeAll("subscriptions?status=all&expand[]=data.items.data.price", 1000),
    stripeAll(`charges?created[gte]=${since}`, 1000),
    sget("balance"),
  ]);
  let mrr = 0, active = 0, trialing = 0, canceling = 0;
  for (const s of subs) {
    if (s.status === "trialing") trialing++;
    if (s.status !== "active" && s.status !== "past_due") continue;
    active++;
    if (s.cancel_at_period_end || s.cancel_at) canceling++;
    for (const it of s.items?.data || []) {
      const p = it.price || {}, amt = (p.unit_amount || 0) * (it.quantity || 1);
      mrr += p.recurring?.interval === "year" ? amt / 12 : p.recurring?.interval === "month" ? amt : 0;
    }
  }
  const paid = charges.filter((c) => c.paid && c.status === "succeeded");
  const gross = paid.reduce((a, c) => a + c.amount, 0), refunded = paid.reduce((a, c) => a + (c.amount_refunded || 0), 0);
  const byDay: Record<string, number> = {};
  for (const c of paid) { const d = new Date(c.created * 1000).toISOString().slice(0, 10); byDay[d] = (byDay[d] || 0) + c.amount - (c.amount_refunded || 0); }
  const sum = (arr: any[]) => arr.filter((b) => b.currency === "usd").reduce((a, b) => a + b.amount, 0);
  return {
    configured: true, mrr: Math.round(mrr), arr: Math.round(mrr * 12), active, trialing, canceling,
    revenue_30d: gross - refunded, refunds_30d: refunded, charges_30d: paid.length, failed_30d: charges.filter((c) => c.status === "failed").length,
    by_day: byDay, available: sum(bal.available || []), pending: sum(bal.pending || []),
    recent: paid.slice(0, 15).map((c) => ({ at: c.created, amount: c.amount - (c.amount_refunded || 0), email: c.billing_details?.email || c.receipt_email || "", desc: c.description || "", refunded: !!c.amount_refunded })),
  };
}

async function workflowRuns() {
  try {
    const r = await fetch("https://api.github.com/repos/Capitol-Receipts/app/actions/runs?per_page=12", { headers: { "User-Agent": "capitolreceipts-admin" } });
    if (!r.ok) return [];
    const j = await r.json();
    return (j.workflow_runs || []).map((w: any) => ({ name: w.name, status: w.status, conclusion: w.conclusion, at: w.created_at, url: w.html_url }));
  } catch { return []; }
}

Deno.serve(async (req) => {
  const h = cors(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: h });
  const json = (b: unknown, status = 200) => Response.json(b, { status, headers: h });

  const db = createClient(URL_, SERVICE, { auth: { persistSession: false } });
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const { data: { user } } = await db.auth.getUser(token);
  if (!user?.email || !user.email_confirmed_at) return json({ error: "sign_in" }, 401);
  const me = user.email.toLowerCase();
  const { data: adm } = await db.from("admins").select("email").eq("email", me).maybeSingle();
  if (!adm) return json({ error: "not_admin" }, 403);
  // admins must finish a second step (authenticator app code) for this session; getUser above verified the token
  let aal = "";
  try { aal = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).aal || ""; } catch { /* treated as no MFA */ }
  if (aal !== "aal2") return json({ error: "mfa_required" }, 401);

  const b = await req.json().catch(() => ({}));
  const log = (action: string, detail: unknown) => db.from("admin_log").insert({ admin: me, action, detail });
  const one = async (q: any) => { const { data, error } = await q; if (error) throw new Error(error.message); return data; };

  try {
    switch (b.action) {
      case "me":
        return json({ email: me });

      case "overview": {
        const [stats, rev, runs] = await Promise.all([
          one(db.rpc("admin_overview")),
          revenue().catch((e) => ({ configured: true, error: String(e.message || e) })),
          workflowRuns(),
        ]);
        const [{ count: support_open }, status] = await Promise.all([
          db.from("support_requests").select("id", { count: "exact", head: true }).eq("status", "open"),
          db.from("service_status").select("*").order("service"),
        ]);
        return json({ stats: { ...(stats || {}), support_open: support_open || 0 }, revenue: rev, runs, status: status.data || [] });
      }

      case "users":
        return json(await one(db.rpc("admin_users", { p_q: String(b.q || ""), p_lim: Number(b.limit) || 50, p_off: Number(b.offset) || 0, p_only: ["all", "pro", "trial", "free"].includes(b.only) ? b.only : "all" })));

      case "user_comp": {
        const months = Math.max(1, Math.min(24, Number(b.months) || 1));
        const { data: sub } = await db.from("subscriptions").select("status,plan,stripe_sub").eq("user_id", b.user_id).maybeSingle();
        if (sub?.stripe_sub && ["active", "trialing", "past_due"].includes(sub.status)) return json({ error: "This person already pays through Stripe." }, 400);
        const end = new Date(Date.now() + months * 30.4 * 864e5).toISOString();
        await one(db.from("subscriptions").upsert({ user_id: b.user_id, status: "active", plan: "comp", source: "comp", period_end: end, updated_at: new Date().toISOString() }));
        await log("comp_pro", { user_id: b.user_id, months, until: end });
        return json({ ok: true, until: end });
      }

      case "user_uncomp": {
        await one(db.from("subscriptions").update({ status: "canceled", period_end: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("user_id", b.user_id).eq("plan", "comp"));
        await log("remove_comp", { user_id: b.user_id });
        return json({ ok: true });
      }

      case "user_reset": {
        const { data } = await db.auth.admin.getUserById(b.user_id);
        if (!data?.user?.email) return json({ error: "No email on this account." }, 400);
        const { error } = await db.auth.resetPasswordForEmail(data.user.email, { redirectTo: "https://app.capitolreceipts.com" });
        if (error) throw error;
        await log("send_reset", { user_id: b.user_id });
        return json({ ok: true });
      }

      case "reports":
        return json(await one(db.from("reports").select("*").order("created_at", { ascending: false }).limit(200)));

      case "report_update": {
        const status = b.status === "resolved" ? "resolved" : b.status === "dismissed" ? "dismissed" : "open";
        await one(db.from("reports").update({ status, note: b.note ?? null, resolved_at: status === "open" ? null : new Date().toISOString() }).eq("id", b.id));
        await log("report_" + status, { id: b.id });
        return json({ ok: true });
      }

      case "support": {
        const st = ["open", "answered", "closed", "all"].includes(b.status) ? b.status : "open";
        let q = db.from("support_requests").select("id,created_at,email,name,topic,message,page,platform,user_id,plan,status,replies,note,updated_at").order("created_at", { ascending: false }).limit(200);
        if (st !== "all") q = q.eq("status", st);
        return json(await one(q));
      }

      case "support_reply": {
        const text = String(b.text || "").trim().slice(0, 8000);
        if (text.length < 2) return json({ error: "Write a reply first." }, 400);
        const { data: t } = await db.from("support_requests").select("id,email,name,topic,message,replies").eq("id", b.id).maybeSingle();
        if (!t) return json({ error: "Request not found." }, 404);
        if (!RESEND) return json({ error: "Email isn't set up (RESEND_API_KEY)." }, 500);
        const e = (x: string) => x.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
        const F = "-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif";
        const n = (t.replies || []).length + 1;
        const html = `<div style="background:#f3f4f6;padding:24px 12px"><table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;padding:24px 28px"><tr><td>
<div style="font:800 18px ${F}"><span style="background:#c8323a;color:#fff;padding:2px 6px;border-radius:4px">Capitol</span> Receipts</div>
<div style="white-space:pre-wrap;margin:18px 0;font:15px/1.6 ${F};color:#1f2937">${e(text)}</div>
<div style="font:13px/1.5 ${F};color:#6b7280;border-top:1px solid #e6e8ec;padding-top:12px">Capitol Receipts Support · reference CR-${t.id}. Reply to this email to write back.<br><br>Your message:<br><span style="white-space:pre-wrap">${e(String(t.message).slice(0, 2000))}</span></div></td></tr></table></div>`;
        const r = await fetch("https://api.resend.com/emails", { method: "POST",
          headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json", "Idempotency-Key": `support-${t.id}-reply-${n}` },
          body: JSON.stringify({ from: "Capitol Receipts Support <support@capitolreceipts.com>", to: [t.email], reply_to: Deno.env.get("SUPPORT_INBOX") || "admin@squaredawaylabs.com", subject: `Re: your message to Capitol Receipts (CR-${t.id})`, html }) });
        if (!r.ok) return json({ error: `Email failed: ${r.status} ${(await r.text()).slice(0, 160)}` }, 502);
        const replies = [...(t.replies || []), { at: new Date().toISOString(), by: me, text }];
        await one(db.from("support_requests").update({ replies, status: b.close ? "closed" : "answered", updated_at: new Date().toISOString() }).eq("id", t.id));
        await log("support_reply", { id: t.id });
        return json({ ok: true });
      }

      case "support_update": {
        const status = ["open", "answered", "closed"].includes(b.status) ? b.status : "open";
        await one(db.from("support_requests").update({ status, note: b.note ?? undefined, updated_at: new Date().toISOString() }).eq("id", b.id));
        await log("support_" + status, { id: b.id });
        return json({ ok: true });
      }

      case "corrections":
        return json(await one(db.from("corrections").select("*").order("fixed_on", { ascending: false }).limit(200)));

      case "correction_add": {
        const row = { fixed_on: b.fixed_on || new Date().toISOString().slice(0, 10), page: String(b.page || "").slice(0, 200), what: String(b.what || "").slice(0, 1000), before: b.before ? String(b.before).slice(0, 500) : null, after: b.after ? String(b.after).slice(0, 500) : null };
        if (!row.page || !row.what) return json({ error: "Page and what changed are required." }, 400);
        await one(db.from("corrections").insert(row));
        if (b.report_id) await db.from("reports").update({ status: "resolved", resolved_at: new Date().toISOString() }).eq("id", b.report_id);
        await log("correction_add", row);
        return json({ ok: true });
      }

      case "correction_delete":
        await one(db.from("corrections").delete().eq("id", b.id));
        await log("correction_delete", { id: b.id });
        return json({ ok: true });

      case "signups":
        return json(await one(db.from("signups").select("*").order("created_at", { ascending: false }).limit(500)));

      case "emails": {
        const [billing, alerts] = await Promise.all([
          one(db.from("billing_email_log").select("*").order("sent_at", { ascending: false }).limit(50)),
          one(db.from("alert_log").select("user_id,last_sent").not("last_sent", "is", null).order("last_sent", { ascending: false }).limit(50)),
        ]);
        let recent: any[] = [];
        if (RESEND) {
          try {
            const r = await fetch("https://api.resend.com/emails?limit=50", { headers: { Authorization: `Bearer ${RESEND}` } });
            if (r.ok) recent = ((await r.json()).data || []).map((e: any) => ({ at: e.created_at, to: (e.to || []).join(", "), subject: e.subject, from: e.from, status: e.last_event }));
          } catch { /* optional */ }
        }
        return json({ billing, alerts, recent, resend: !!RESEND });
      }

      case "settings": {
        const [admins, flags, logRows] = await Promise.all([
          one(db.from("admins").select("*").order("added_at")),
          one(db.from("app_meta").select("key,value,updated_at").in("key", ["billing_emails", "updated", "asOf"])),
          one(db.from("admin_log").select("*").order("at", { ascending: false }).limit(60)),
        ]);
        return json({ admins, flags, log: logRows, me });
      }

      case "set_billing_emails": {
        const v = b.on ? "on" : "off";
        await one(db.from("app_meta").upsert({ key: "billing_emails", value: v, updated_at: new Date().toISOString() }));
        await log("billing_emails_" + v, null);
        return json({ ok: true });
      }

      case "admin_add": {
        const email = String(b.email || "").trim().toLowerCase();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "Enter a valid email." }, 400);
        await one(db.from("admins").upsert({ email }));
        await log("admin_add", { email });
        return json({ ok: true });
      }

      case "admin_remove": {
        const email = String(b.email || "").toLowerCase();
        if (email === me) return json({ error: "You can't remove yourself." }, 400);
        await one(db.from("admins").delete().eq("email", email));
        await log("admin_remove", { email });
        return json({ ok: true });
      }

      default:
        return json({ error: "unknown_action" }, 400);
    }
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
