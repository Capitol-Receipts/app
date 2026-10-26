// Stripe tells us when someone subscribes, renews, changes plan or cancels; we keep public.subscriptions in step
// and send our own branded billing emails through Resend (receipt, failed payment, yearly renewal reminder,
// cancellation scheduled, Pro ended, free trial ending). Emails only go out while app_meta.billing_emails = "on".
// Needs STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET and RESEND_API_KEY (GA_API_SECRET optional, for Google Analytics).
// Events: checkout.session.completed, customer.subscription.created/updated/deleted, invoice.paid,
// invoice.payment_failed, invoice.upcoming, customer.subscription.trial_will_end.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import * as M from "./emails.ts";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE = Deno.env.get("STRIPE_SECRET_KEY") || "";
const SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
const RESEND = Deno.env.get("RESEND_API_KEY") || "";
const FROM = "Capitol Receipts <billing@capitolreceipts.com>";
const REPLY_TO = "admin@squaredawaylabs.com";
// Google Analytics (Measurement Protocol): trial starts, purchases, renewals and cancellations, sent from here so
// they count even when the charge happens days after the visit. Needs GA_API_SECRET; without it nothing is sent.
const GA_ID = "G-2PVF462YXR";
const GA_SECRET = Deno.env.get("GA_API_SECRET") || "";

async function verify(body: string, header: string | null) {
  if (!header || !SECRET) return false;
  const parts = Object.fromEntries(header.split(",").map((kv) => kv.split("=") as [string, string]));
  const sigs = header.split(",").filter((kv) => kv.startsWith("v1=")).map((kv) => kv.slice(3));
  const t = parts.t;
  if (!t || !sigs.length || Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${body}`)));
  const hex = [...mac].map((b) => b.toString(16).padStart(2, "0")).join("");
  return sigs.some((s) => s.length === hex.length && [...s].every((c, i) => c === hex[i]));
}
const sget = async (path: string) => {
  const r = await fetch(`https://api.stripe.com/v1/${path}`, { headers: { Authorization: `Bearer ${STRIPE}` } });
  if (!r.ok) throw new Error(`Stripe ${r.status}`);
  return r.json();
};
const getSub = (id: string) => sget(`subscriptions/${id}`);
const statusOf = (s: string) => s === "active" || s === "trialing" ? "active" : s === "past_due" || s === "unpaid" ? "past_due" : s === "canceled" || s === "incomplete_expired" ? "canceled" : null;
const planOfSub = (sub: any): M.Plan => sub?.items?.data?.[0]?.price?.recurring?.interval === "year" ? "yearly" : "monthly";
const planOfLine = (line: any): M.Plan => {
  const iv = line?.price?.recurring?.interval || line?.plan?.interval;
  if (iv) return iv === "year" ? "yearly" : "monthly";
  const span = (line?.period?.end || 0) - (line?.period?.start || 0);
  return span > 40 * 86400 ? "yearly" : "monthly";
};
const subIdOfInvoice = (inv: any) => inv?.parent?.subscription_details?.subscription || inv?.subscription || null;

type DB = ReturnType<typeof createClient>;

async function userFor(db: DB, customer: string | null, sub: any): Promise<string | null> {
  if (sub?.metadata?.user_id) return sub.metadata.user_id;
  if (!customer) return null;
  const { data } = await db.from("subscriptions").select("user_id").eq("stripe_customer", customer).maybeSingle();
  return data?.user_id || null;
}

// keep public.subscriptions in step with Stripe
async function sync(db: DB, ev: any) {
  let sub: any = null, userId: string | null = null;
  if (ev.type === "checkout.session.completed") {
    const s = ev.data.object;
    if (s.mode !== "subscription" || !s.subscription) return;
    userId = s.client_reference_id || s.metadata?.user_id || null;
    sub = await getSub(s.subscription);
  } else if (/^customer\.subscription\.(created|updated|deleted)$/.test(ev.type)) {
    // events can arrive late or out of order: use Stripe's current state of the subscription, not the event's snapshot
    sub = await getSub(ev.data.object.id).catch(() => ev.data.object);
  } else return;
  userId = userId || await userFor(db, sub.customer, sub);
  if (!userId) return;
  const status = sub.status === "canceled" || sub.status === "incomplete_expired" ? "canceled" : sub.status === "trialing" ? "trialing" : statusOf(sub.status);
  if (!status) return;
  // an ended web subscription must not overwrite a running App Store or complimentary one
  if (status === "canceled") {
    const { data: cur } = await db.from("subscriptions").select("source,status,stripe_sub").eq("user_id", userId).maybeSingle();
    if (cur && (cur.source === "app_store" || cur.source === "comp") && cur.status !== "canceled") return;
    // a different (newer) Stripe subscription is on file and running: an old one ending changes nothing
    if (cur && cur.stripe_sub && cur.stripe_sub !== sub.id && cur.status !== "canceled") return;
  }
  const item = sub.items?.data?.[0];
  const end = sub.current_period_end || item?.current_period_end;
  const interval = item?.price?.recurring?.interval;
  const { error } = await db.from("subscriptions").upsert({
    user_id: userId, status, plan: interval === "month" ? "monthly" : interval === "year" ? "yearly" : "pro",
    period_end: end ? new Date(end * 1000).toISOString() : null,
    trial_ends: sub.status === "trialing" && sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
    source: "stripe", store_ref: null, stripe_customer: sub.customer, stripe_sub: sub.id, updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

async function cardOf(invoiceId: string): Promise<string | undefined> {
  try {
    const r = await sget(`invoice_payments?invoice=${invoiceId}&limit=1&expand[]=data.payment.payment_intent.latest_charge`);
    const c = r?.data?.[0]?.payment?.payment_intent?.latest_charge?.payment_method_details?.card;
    if (c?.last4) return `${c.brand ? c.brand[0].toUpperCase() + c.brand.slice(1) : "Card"} ending ${c.last4}`;
  } catch { /* card line is optional */ }
  return undefined;
}

// decide which billing email (if any) this event calls for
async function buildEmail(db: DB, ev: any): Promise<{ kind: string; userId: string | null; email: string | null; msg: { subject: string; html: string } } | null> {
  const o = ev.data.object;
  const emailOf = async (userId: string | null, fallback?: string | null) => {
    if (userId) {
      const { data } = await db.auth.admin.getUserById(userId);
      if (data?.user?.email) return data.user.email;
    }
    return fallback || null;
  };

  if (ev.type === "invoice.paid" || ev.type === "invoice.payment_failed" || ev.type === "invoice.upcoming") {
    const subId = subIdOfInvoice(o);
    if (!subId) return null;
    const sub = await getSub(subId).catch(() => null);
    const userId = await userFor(db, o.customer, sub);
    const email = await emailOf(userId, o.customer_email);
    if (!email) return null;
    const line = o.lines?.data?.find((l: any) => (l.amount || 0) > 0) || o.lines?.data?.[0];
    const plan = sub ? planOfSub(sub) : planOfLine(line);
    if (ev.type === "invoice.paid") {
      if (!o.amount_paid) return null;
      const periodEnd = line?.period?.end || sub?.items?.data?.[0]?.current_period_end;
      return { kind: "receipt", userId, email, msg: M.receipt({
        amount: o.amount_paid, plan, paidAt: o.status_transitions?.paid_at || o.created, periodEnd,
        number: o.number || undefined, card: await cardOf(o.id), invoiceUrl: o.hosted_invoice_url || undefined, pdfUrl: o.invoice_pdf || undefined, email,
      }) };
    }
    if (ev.type === "invoice.payment_failed") {
      return { kind: "failed", userId, email, msg: M.failed({ amount: o.amount_due, plan, nextTry: o.next_payment_attempt || undefined, email }) };
    }
    // invoice.upcoming: remind yearly subscribers only (monthly would be noise), and not if they've already cancelled
    if (plan !== "yearly" || sub?.cancel_at_period_end || sub?.cancel_at || !o.amount_due) return null;
    const renewsAt = o.next_payment_attempt || line?.period?.start || o.period_end;
    return { kind: "upcoming", userId, email, msg: M.upcoming({ amount: o.amount_due, plan, renewsAt, email }) };
  }

  if (ev.type === "customer.subscription.trial_will_end") {
    if (o.status !== "trialing" || o.cancel_at_period_end || o.cancel_at || !o.trial_end) return null;
    const userId = await userFor(db, o.customer, o);
    const email = await emailOf(userId);
    if (!email) return null;
    const amount = o.items?.data?.[0]?.price?.unit_amount || 0;
    return { kind: "trial_ending", userId, email, msg: M.trialEnding({ amount, plan: planOfSub(o), endsAt: o.trial_end, email }) };
  }

  if (ev.type === "customer.subscription.updated") {
    const prev = ev.data.previous_attributes || {};
    const nowCancel = !!(o.cancel_at_period_end || o.cancel_at);
    const wasCancel = ("cancel_at_period_end" in prev || "cancel_at" in prev) ? !!(prev.cancel_at_period_end || prev.cancel_at) : nowCancel;
    if (!nowCancel || wasCancel || o.status === "canceled") return null;
    const userId = await userFor(db, o.customer, o);
    const email = await emailOf(userId);
    if (!email) return null;
    const endsAt = o.cancel_at || o.current_period_end || o.items?.data?.[0]?.current_period_end;
    return { kind: "canceling", userId, email, msg: M.canceling({ plan: planOfSub(o), endsAt, email, trial: o.status === "trialing" }) };
  }

  if (ev.type === "customer.subscription.deleted") {
    if (!o.latest_invoice) return null; // never paid
    const userId = await userFor(db, o.customer, o);
    const email = await emailOf(userId);
    if (!email) return null;
    return { kind: "ended", userId, email, msg: M.ended({ email }) };
  }
  return null;
}

// one Google Analytics event per Stripe event; purchases are de-duplicated by GA on transaction_id
async function gaEventFor(db: DB, ev: any): Promise<{ sub: any; userId: string | null; name: string; params: Record<string, unknown> } | null> {
  const o = ev.data.object;
  const item = (sub: any, plan: M.Plan, cents: number) => ({ item_id: "pro_" + plan, item_name: "Capitol Receipts Pro", item_variant: plan, price: cents / 100, quantity: 1 });
  if (ev.type === "checkout.session.completed") {
    if (o.mode !== "subscription" || !o.subscription) return null;
    const sub = await getSub(o.subscription).catch(() => null);
    if (!sub || sub.status !== "trialing") return null; // paid right away: invoice.paid sends the purchase
    const plan = planOfSub(sub), cents = sub.items?.data?.[0]?.price?.unit_amount || 0;
    return { sub, userId: o.client_reference_id || await userFor(db, sub.customer, sub), name: "trial_start",
      params: { currency: "USD", value: cents / 100, plan, items: [item(sub, plan, cents)] } };
  }
  if (ev.type === "invoice.paid") {
    if (!o.amount_paid) return null; // the $0 invoice at the start of a free trial
    const subId = subIdOfInvoice(o);
    const sub = subId ? await getSub(subId).catch(() => null) : null;
    const line = o.lines?.data?.find((l: any) => (l.amount || 0) > 0) || o.lines?.data?.[0];
    const plan = sub ? planOfSub(sub) : planOfLine(line);
    const kind = o.billing_reason === "subscription_create" ? "new" : o.billing_reason === "subscription_cycle" ? "renewal" : (o.billing_reason || "other");
    return { sub, userId: await userFor(db, o.customer, sub), name: "purchase",
      params: { transaction_id: o.id, currency: (o.currency || "usd").toUpperCase(), value: o.amount_paid / 100, plan, purchase_type: kind, items: [item(sub, plan, o.amount_paid)] } };
  }
  if (ev.type === "customer.subscription.updated") {
    const prev = ev.data.previous_attributes || {};
    const nowCancel = !!(o.cancel_at_period_end || o.cancel_at);
    const wasCancel = ("cancel_at_period_end" in prev || "cancel_at" in prev) ? !!(prev.cancel_at_period_end || prev.cancel_at) : nowCancel;
    if (nowCancel && !wasCancel) return { sub: o, userId: await userFor(db, o.customer, o), name: "cancel_subscription", params: { plan: planOfSub(o), during_trial: o.status === "trialing" ? 1 : 0 } };
    return null;
  }
  if (ev.type === "customer.subscription.deleted") {
    return { sub: o, userId: await userFor(db, o.customer, o), name: "subscription_ended", params: { plan: planOfSub(o) } };
  }
  return null;
}

async function ga(db: DB, ev: any) {
  if (!GA_SECRET) return "ga off";
  try {
    const e = await gaEventFor(db, ev);
    if (!e) return "no ga event";
    const md = e.sub?.metadata || ev.data.object?.metadata || {};
    // GA needs a visitor id; if checkout didn't pass one, use a stable stand-in so the event still counts
    const cid = md.ga_cid || (e.userId ? `cr.${e.userId}` : `cr.${ev.id}`);
    const params: Record<string, unknown> = { ...e.params, engagement_time_msec: 1 };
    if (md.ga_sid && e.name === "trial_start") params.session_id = md.ga_sid;
    const body: Record<string, unknown> = { client_id: cid, timestamp_micros: (ev.created || Math.floor(Date.now() / 1000)) * 1e6, events: [{ name: e.name, params }] };
    if (e.userId) body.user_id = e.userId;
    const r = await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${GA_ID}&api_secret=${encodeURIComponent(GA_SECRET)}`, { method: "POST", body: JSON.stringify(body) });
    return r.ok ? `ga ${e.name}` : `ga ${r.status}`;
  } catch (err) {
    return `ga error ${String((err as Error).message || err).slice(0, 80)}`; // analytics must never fail the webhook
  }
}

async function emailsOn(db: DB) {
  const { data } = await db.from("app_meta").select("value").eq("key", "billing_emails").maybeSingle();
  return data?.value === "on";
}

async function send(db: DB, ev: any) {
  if (!RESEND || !(await emailsOn(db))) return "emails off";
  const e = await buildEmail(db, ev);
  if (!e) return "no email";
  // claim the event first so Stripe retries can't send twice
  const { error: claim } = await db.from("billing_email_log").insert({ event_id: ev.id, kind: e.kind, user_id: e.userId });
  if (claim) return claim.code === "23505" ? "already sent" : Promise.reject(claim);
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json", "Idempotency-Key": ev.id },
    body: JSON.stringify({ from: FROM, to: [e.email], reply_to: REPLY_TO, subject: e.msg.subject, html: e.msg.html }),
  });
  if (!r.ok) {
    await db.from("billing_email_log").delete().eq("event_id", ev.id);
    throw new Error(`Resend ${r.status} ${(await r.text()).slice(0, 200)}`);
  }
  return `sent ${e.kind}`;
}

Deno.serve(async (req) => {
  const raw = await req.text();
  if (!(await verify(raw, req.headers.get("stripe-signature")))) return new Response("Bad signature", { status: 400 });
  const ev = JSON.parse(raw);
  const db = createClient(URL_, SERVICE, { auth: { persistSession: false } });
  try {
    await sync(db, ev);
    const result = await send(db, ev);
    const g = await ga(db, ev);
    return new Response(`ok · ${result} · ${g}`);
  } catch (e) {
    return new Response(String((e as Error).message || e), { status: 500 });
  }
});
