// Pro bought in the iPhone or Android app. RevenueCat validates App Store and Google Play purchases and calls this
// with each event.
// The app logs in to RevenueCat with the Supabase user id, so app_user_id is the user. Needs REVENUECAT_WEBHOOK_AUTH
// (the authorization value set on the webhook in RevenueCat). Until it is set every call is refused.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const AUTH = Deno.env.get("REVENUECAT_WEBHOOK_AUTH") || "";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method", { status: 405 });
  const got = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!AUTH || got !== AUTH) return new Response("unauthorized", { status: 401 });
  const { event: e } = await req.json().catch(() => ({ event: null }));
  if (!e?.type) return Response.json({ ignored: "no event" });
  const ids = [e.app_user_id, e.original_app_user_id, ...(e.aliases || [])].filter((x: string) => UUID.test(String(x || "")));
  const userId = ids[0];
  if (!userId) return Response.json({ ignored: "no app user" });
  // sandbox purchases (TestFlight and Apple's own review) count too; they only ever unlock Pro for the account that made them

  const db = createClient(URL_, SERVICE, { auth: { persistSession: false } });
  const { data: cur } = await db.from("subscriptions").select("source,status,period_end,trial_ends,store_event_at").eq("user_id", userId).maybeSingle();
  // a paid web subscription stays in charge while it is running
  const STORES = ["app_store", "play_store"];
  const src = String(e.store || "").toUpperCase() === "PLAY_STORE" ? "play_store" : "app_store";
  const webActive = cur && !STORES.includes(cur.source) && ["active", "trialing", "past_due"].includes(cur.status) &&
    new Date(cur.period_end || cur.trial_ends || 0).getTime() > Date.now();
  if (webActive) return Response.json({ ignored: "web subscription active" });
  // RevenueCat can retry or deliver out of order: never let an older event overwrite a newer one
  const at = Number(e.event_timestamp_ms) || Date.now();
  if (STORES.includes(cur?.source) && cur.store_event_at && new Date(cur.store_event_at).getTime() > at) return Response.json({ ignored: "older event" });

  const exp = e.expiration_at_ms ? new Date(e.expiration_at_ms).toISOString() : null;
  const trial = e.period_type === "TRIAL";
  const plan = /year|annual/i.test(e.product_id || "") ? "yearly" : "monthly";
  let status: string | null = null;
  switch (e.type) {
    case "INITIAL_PURCHASE": case "RENEWAL": case "PRODUCT_CHANGE": case "UNCANCELLATION": case "CANCELLATION": case "SUBSCRIPTION_EXTENDED": case "TEMPORARY_ENTITLEMENT_GRANT":
      status = trial ? "trialing" : "active"; break; // a cancellation keeps Pro until the paid period ends
    case "BILLING_ISSUE": status = "past_due"; break;
    case "EXPIRATION": status = "canceled"; break;
    default: return Response.json({ ignored: e.type });
  }
  const row: Record<string, unknown> = { user_id: userId, status, plan: trial ? "trial" : plan, source: src, store_ref: e.original_transaction_id || e.transaction_id || null, store_event_at: new Date(at).toISOString(), updated_at: new Date().toISOString() };
  if (trial) row.trial_ends = exp; else row.period_end = exp;
  const { error } = await db.from("subscriptions").upsert(row, { onConflict: "user_id" });
  if (error) return new Response(error.message, { status: 500 });
  return Response.json({ ok: true, status });
});
