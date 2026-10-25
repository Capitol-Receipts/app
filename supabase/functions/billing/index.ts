// Pro billing for the signed-in user: open Stripe Checkout (subscribe) or the Stripe customer portal (manage/cancel).
// Needs STRIPE_SECRET_KEY. Until it is set it answers {error:"not_configured"}.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE = Deno.env.get("STRIPE_SECRET_KEY") || "";
// Pro prices: $5.99 a month, $39.99 a year. Each is found in Stripe by its lookup key and, the first time, created on the
// same Pro product as the original prices. Existing subscribers keep the price they signed up at. Env vars override.
const BASE_PRICE = "price_1UQC165TFbyxT2b0snH5tywX"; // original monthly price, used to find the Pro product
const WANT = {
  m: { env: "STRIPE_PRICE_MONTHLY_599", key: "pro_monthly_599", cents: 599, interval: "month" },
  y: { env: "STRIPE_PRICE_YEARLY_3999", key: "pro_yearly_3999", cents: 3999, interval: "year" },
} as const;
const TRIAL_DAYS = "14";
const PRICE: Record<string, string> = {};
async function stripeGet(path: string) {
  const r = await fetch("https://api.stripe.com/v1/" + path, { headers: { Authorization: `Bearer ${STRIPE}` } });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || `Stripe ${r.status}`);
  return j;
}
async function priceFor(c: "m" | "y") {
  if (PRICE[c]) return PRICE[c];
  const w = WANT[c], env = Deno.env.get(w.env);
  if (env) return (PRICE[c] = env);
  const found = await stripeGet("prices?active=true&lookup_keys[]=" + w.key);
  if (found.data?.[0]?.id) return (PRICE[c] = found.data[0].id);
  const base = await stripeGet("prices/" + BASE_PRICE);
  const made = await stripe("prices", {
    product: typeof base.product === "string" ? base.product : base.product.id, currency: "usd",
    unit_amount: String(w.cents), "recurring[interval]": w.interval, lookup_key: w.key, nickname: `Pro ${w.interval}ly`,
  });
  return (PRICE[c] = made.id);
}
const ORIGINS = ["https://app.capitolreceipts.com", "https://www.capitolreceipts.com", "http://localhost:8811"];
const cors = (o: string | null) => ({
  "Access-Control-Allow-Origin": o && ORIGINS.includes(o) ? o : ORIGINS[0],
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
});

async function stripe(path: string, params: Record<string, string>) {
  const r = await fetch("https://api.stripe.com/v1/" + path, {
    method: "POST",
    headers: { Authorization: `Bearer ${STRIPE}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || `Stripe ${r.status}`);
  return j;
}

Deno.serve(async (req) => {
  const h = cors(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: h });
  const json = (b: unknown, status = 200) => Response.json(b, { status, headers: h });
  if (!STRIPE) return json({ error: "not_configured" });

  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const db = createClient(URL_, SERVICE, { auth: { persistSession: false } });
  const { data: { user } } = await db.auth.getUser(token);
  if (!user) return json({ error: "sign_in" }, 401);

  const body = await req.json().catch(() => ({}));
  const back = typeof body.back === "string" && ORIGINS.some((o) => body.back.startsWith(o)) ? body.back : ORIGINS[0] + "/?go=pro";
  const { data: sub } = await db.from("subscriptions").select("stripe_customer,status").eq("user_id", user.id).maybeSingle();

  try {
    if (body.action === "portal") {
      if (!sub?.stripe_customer) return json({ error: "no_billing" }, 400);
      const s = await stripe("billing_portal/sessions", { customer: sub.stripe_customer, return_url: back });
      return json({ url: s.url });
    }
    const price = await priceFor(body.cycle === "m" ? "m" : "y");
    const p: Record<string, string> = {
      mode: "subscription",
      "line_items[0][price]": price,
      "line_items[0][quantity]": "1",
      client_reference_id: user.id,
      "subscription_data[metadata][user_id]": user.id,
      "metadata[user_id]": user.id,
      allow_promotion_codes: "true",
      success_url: back + (back.includes("?") ? "&" : "?") + "paid=1",
      cancel_url: back,
    };
    // Google Analytics visitor ids, so the payment can be credited to the visit (and ad or post) that led to it
    const gaCid = typeof body.ga_cid === "string" && /^[\w.\-]{1,64}$/.test(body.ga_cid) ? body.ga_cid : "";
    const gaSid = typeof body.ga_sid === "string" && /^\d{1,20}$/.test(body.ga_sid) ? body.ga_sid : "";
    if (gaCid) { p["subscription_data[metadata][ga_cid]"] = gaCid; p["metadata[ga_cid]"] = gaCid; }
    if (gaSid) { p["subscription_data[metadata][ga_sid]"] = gaSid; p["metadata[ga_sid]"] = gaSid; }
    if (sub?.stripe_customer) p.customer = sub.stripe_customer; else if (user.email) p.customer_email = user.email;
    // 14-day free trial: only for accounts that have never had Pro; a card is always collected, first charge after 14 days
    if (body.trial && !sub) {
      p["subscription_data[trial_period_days]"] = TRIAL_DAYS;
      p["payment_method_collection"] = "always";
      p["subscription_data[trial_settings][end_behavior][missing_payment_method]"] = "cancel";
      p["custom_text[submit][message]"] = "You won't be charged today. Your first payment is after your 14-day free trial. Cancel anytime before then.";
    }
    const s = await stripe("checkout/sessions", p);
    return json({ url: s.url });
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
