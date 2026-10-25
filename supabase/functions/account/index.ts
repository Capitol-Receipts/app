// Account actions for the signed-in user. {action:"delete"} removes the account and everything tied to it:
// saved reps and follows, alert settings and history, push devices, the Pro record and the login itself.
// A web (Stripe) subscription is canceled first so nobody is charged again. An App Store subscription can only be
// canceled by the person in their iPhone settings, so the reply says so and the app shows how.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE = Deno.env.get("STRIPE_SECRET_KEY") || "";
const ORIGINS = ["https://app.capitolreceipts.com", "https://www.capitolreceipts.com", "capacitor://localhost", "http://localhost:8811"];
const cors = (o: string | null) => ({
  "Access-Control-Allow-Origin": o && ORIGINS.includes(o) ? o : ORIGINS[0],
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
});

Deno.serve(async (req) => {
  const h = cors(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: h });
  const json = (b: unknown, status = 200) => Response.json(b, { status, headers: h });
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const db = createClient(URL_, SERVICE, { auth: { persistSession: false } });
  const { data: { user } } = await db.auth.getUser(token);
  if (!user) return json({ error: "sign_in" }, 401);
  const body = await req.json().catch(() => ({}));
  if (body.action !== "delete") return json({ error: "unknown_action" }, 400);

  const { data: sub } = await db.from("subscriptions").select("source,stripe_sub,status").eq("user_id", user.id).maybeSingle();
  if (sub?.source !== "app_store" && sub?.stripe_sub && STRIPE) {
    const r = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(sub.stripe_sub)}`, { method: "DELETE", headers: { Authorization: `Bearer ${STRIPE}` } });
    if (!r.ok && r.status !== 404) return json({ error: "billing" }, 502); // don't delete the account while a card could still be charged
  }
  for (const t of ["push_devices", "user_prefs", "alert_log", "billing_email_log", "subscriptions"]) {
    const { error } = await db.from(t).delete().eq("user_id", user.id);
    if (error) console.warn(t, error.message);
  }
  if (user.email) for (const t of ["signups", "reports"]) await db.from(t).delete().ilike("email", user.email);
  const { error } = await db.auth.admin.deleteUser(user.id);
  if (error) return json({ error: "delete_failed" }, 500);
  return json({ ok: true, apple_subscription: sub?.source === "app_store" && ["active", "trialing", "past_due"].includes(sub?.status || "") });
});
