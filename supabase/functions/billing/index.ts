// Pro billing for the signed-in user: open Stripe Checkout (subscribe) or the Stripe customer portal (manage/cancel).
// Needs STRIPE_SECRET_KEY. Until it is set it answers {error:"not_configured"}.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE = Deno.env.get("STRIPE_SECRET_KEY") || "";
// Live Pro prices (Capitol Receipts Pro). Env vars override these if set.
const PRICE = {
  m: Deno.env.get("STRIPE_PRICE_MONTHLY") || "price_1UQC165TFbyxT2b0snH5tywX",
  y: Deno.env.get("STRIPE_PRICE_YEARLY") || "price_1UQC185TFbyxT2b0axtGOmT0",
};
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
  if (!STRIPE || !PRICE.m || !PRICE.y) return json({ error: "not_configured" });

  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const db = createClient(URL_, SERVICE, { auth: { persistSession: false } });
  const { data: { user } } = await db.auth.getUser(token);
  if (!user) return json({ error: "sign_in" }, 401);

  const body = await req.json().catch(() => ({}));
  const back = typeof body.back === "string" && ORIGINS.some((o) => body.back.startsWith(o)) ? body.back : ORIGINS[0] + "/?go=pro";
  const { data: sub } = await db.from("subscriptions").select("stripe_customer").eq("user_id", user.id).maybeSingle();

  try {
    if (body.action === "portal") {
      if (!sub?.stripe_customer) return json({ error: "no_billing" }, 400);
      const s = await stripe("billing_portal/sessions", { customer: sub.stripe_customer, return_url: back });
      return json({ url: s.url });
    }
    const p: Record<string, string> = {
      mode: "subscription",
      "line_items[0][price]": body.cycle === "m" ? PRICE.m : PRICE.y,
      "line_items[0][quantity]": "1",
      client_reference_id: user.id,
      "subscription_data[metadata][user_id]": user.id,
      "metadata[user_id]": user.id,
      allow_promotion_codes: "true",
      success_url: back + (back.includes("?") ? "&" : "?") + "paid=1",
      cancel_url: back,
    };
    if (sub?.stripe_customer) p.customer = sub.stripe_customer; else if (user.email) p.customer_email = user.email;
    const s = await stripe("checkout/sessions", p);
    return json({ url: s.url });
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
