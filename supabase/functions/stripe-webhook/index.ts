// Stripe tells us when someone subscribes, renews, changes plan or cancels; we keep public.subscriptions in step.
// Needs STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET. Events: checkout.session.completed, customer.subscription.created/updated/deleted.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE = Deno.env.get("STRIPE_SECRET_KEY") || "";
const SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";

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
const getSub = async (id: string) => {
  const r = await fetch(`https://api.stripe.com/v1/subscriptions/${id}`, { headers: { Authorization: `Bearer ${STRIPE}` } });
  if (!r.ok) throw new Error(`Stripe ${r.status}`);
  return r.json();
};
const statusOf = (s: string) => s === "active" || s === "trialing" ? "active" : s === "past_due" || s === "unpaid" ? "past_due" : s === "canceled" || s === "incomplete_expired" ? "canceled" : null;

Deno.serve(async (req) => {
  const raw = await req.text();
  if (!(await verify(raw, req.headers.get("stripe-signature")))) return new Response("Bad signature", { status: 400 });
  const ev = JSON.parse(raw);
  const db = createClient(URL_, SERVICE, { auth: { persistSession: false } });
  try {
    let sub: any = null, userId: string | null = null;
    if (ev.type === "checkout.session.completed") {
      const s = ev.data.object;
      if (s.mode !== "subscription" || !s.subscription) return new Response("ignored");
      userId = s.client_reference_id || s.metadata?.user_id || null;
      sub = await getSub(s.subscription);
    } else if (/^customer\.subscription\.(created|updated|deleted)$/.test(ev.type)) {
      sub = ev.data.object;
    } else return new Response("ignored");

    userId = userId || sub.metadata?.user_id || null;
    if (!userId) {
      const { data } = await db.from("subscriptions").select("user_id").eq("stripe_customer", sub.customer).maybeSingle();
      userId = data?.user_id || null;
    }
    if (!userId) return new Response("no user", { status: 200 });
    const status = ev.type === "customer.subscription.deleted" ? "canceled" : statusOf(sub.status);
    if (!status) return new Response("pending");
    const item = sub.items?.data?.[0];
    const end = sub.current_period_end || item?.current_period_end;
    const interval = item?.price?.recurring?.interval;
    const { error } = await db.from("subscriptions").upsert({
      user_id: userId, status, plan: interval === "month" ? "monthly" : interval === "year" ? "yearly" : "pro",
      period_end: end ? new Date(end * 1000).toISOString() : null,
      stripe_customer: sub.customer, stripe_sub: sub.id, updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    return new Response("ok");
  } catch (e) {
    return new Response(String((e as Error).message || e), { status: 500 });
  }
});
