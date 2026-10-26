// Account actions for the signed-in user. {action:"delete"} removes the account and everything tied to it:
// saved reps and follows, alert settings and history, push devices, the Pro record and the login itself.
// A web (Stripe) subscription is canceled first so nobody is charged again. An App Store subscription can only be
// canceled by the person in their iPhone settings, so the reply says so and the app shows how.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE = Deno.env.get("STRIPE_SECRET_KEY") || "";
const APPLE = { team: Deno.env.get("APPLE_TEAM_ID") || "", kid: Deno.env.get("APPLE_SIWA_KEY_ID") || "", key: Deno.env.get("APPLE_SIWA_KEY") || "" };
const b64u = (b: ArrayBuffer | string) => btoa(typeof b === "string" ? b : String.fromCharCode(...new Uint8Array(b))).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
async function appleSecret(clientId: string) {
  const der = Uint8Array.from(atob(APPLE.key.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "")), (c) => c.charCodeAt(0));
  const k = await crypto.subtle.importKey("pkcs8", der, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const now = Math.floor(Date.now() / 1000);
  const h = b64u(JSON.stringify({ alg: "ES256", kid: APPLE.kid })), p = b64u(JSON.stringify({ iss: APPLE.team, iat: now, exp: now + 300, aud: "https://appleid.apple.com", sub: clientId }));
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, k, new TextEncoder().encode(`${h}.${p}`));
  return `${h}.${p}.${b64u(sig)}`;
}
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
  // cancel any Stripe subscription on file, whatever the current source says, so a deleted account is never charged
  if (sub?.stripe_sub && STRIPE && sub.status !== "canceled") {
    const r = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(sub.stripe_sub)}`, { method: "DELETE", headers: { Authorization: `Bearer ${STRIPE}` } });
    const already = !r.ok && /cancel/i.test(await r.clone().text().catch(() => ""));
    if (!r.ok && r.status !== 404 && !already) return json({ error: "billing" }, 502); // don't delete the account while a card could still be charged
  }
  // Sign in with Apple: revoke the app's access with Apple too (App Store rule 5.1.1(v)); best effort
  const { data: ap } = await db.from("apple_tokens").select("refresh_token,client_id").eq("user_id", user.id).maybeSingle();
  if (ap && APPLE.team && APPLE.kid && APPLE.key) {
    try {
      await fetch("https://appleid.apple.com/auth/revoke", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: ap.client_id, client_secret: await appleSecret(ap.client_id), token: ap.refresh_token, token_type_hint: "refresh_token" }) });
    } catch (e) { console.warn("apple revoke", String(e)); }
  }
  for (const t of ["push_devices", "apple_tokens", "user_prefs", "alert_log", "billing_email_log", "subscriptions"]) {
    const { error } = await db.from(t).delete().eq("user_id", user.id);
    if (error) console.warn(t, error.message);
  }
  // exact, case-insensitive match: escape LIKE wildcards so an address with % or _ can't match anyone else's rows
  const like = (user.email || "").replace(/[\\%_]/g, (c) => "\\" + c);
  if (like) for (const t of ["signups", "reports"]) await db.from(t).delete().ilike("email", like);
  const { error } = await db.auth.admin.deleteUser(user.id);
  if (error) return json({ error: "delete_failed" }, 500);
  return json({ ok: true, apple_subscription: sub?.source === "app_store" && ["active", "trialing", "past_due"].includes(sub?.status || "") });
});
