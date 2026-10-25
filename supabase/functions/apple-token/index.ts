// Sign in with Apple, iPhone app: after a native Apple sign-in the app sends the one-time authorization code here.
// We trade it with Apple for a refresh token and keep it (apple_tokens), so "Delete my account" can revoke the
// Apple sign-in as App Store rule 5.1.1(v) asks. Needs APPLE_TEAM_ID, APPLE_SIWA_KEY_ID and APPLE_SIWA_KEY (the .p8
// text of a key with Sign in with Apple enabled). Until they're set it answers {stored:false} and sign-in still works.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TEAM = Deno.env.get("APPLE_TEAM_ID") || "", KID = Deno.env.get("APPLE_SIWA_KEY_ID") || "", KEY = Deno.env.get("APPLE_SIWA_KEY") || "";
const CLIENTS = ["com.capitolreceipts.app"];
const ORIGINS = ["https://app.capitolreceipts.com", "capacitor://localhost"];
const cors = (o: string | null) => ({ "Access-Control-Allow-Origin": o && ORIGINS.includes(o) ? o : ORIGINS[0], "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" });
const b64u = (b: ArrayBuffer | string) => btoa(typeof b === "string" ? b : String.fromCharCode(...new Uint8Array(b))).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

async function appleClientSecret(clientId: string) {
  const der = Uint8Array.from(atob(KEY.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "")), (c) => c.charCodeAt(0));
  const k = await crypto.subtle.importKey("pkcs8", der, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const now = Math.floor(Date.now() / 1000);
  const h = b64u(JSON.stringify({ alg: "ES256", kid: KID })), p = b64u(JSON.stringify({ iss: TEAM, iat: now, exp: now + 300, aud: "https://appleid.apple.com", sub: clientId }));
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, k, new TextEncoder().encode(`${h}.${p}`));
  return `${h}.${p}.${b64u(sig)}`;
}

Deno.serve(async (req) => {
  const h = cors(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: h });
  const json = (b: unknown, s = 200) => Response.json(b, { status: s, headers: h });
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const db = createClient(URL_, SERVICE, { auth: { persistSession: false } });
  const { data: { user } } = await db.auth.getUser(token);
  if (!user) return json({ error: "sign_in" }, 401);
  const { code, client_id } = await req.json().catch(() => ({}));
  const cid = CLIENTS.includes(client_id) ? client_id : CLIENTS[0];
  if (!code || typeof code !== "string") return json({ error: "no_code" }, 400);
  if (!TEAM || !KID || !KEY) return json({ stored: false, note: "not_configured" });
  const r = await fetch("https://appleid.apple.com/auth/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: cid, client_secret: await appleClientSecret(cid), code, grant_type: "authorization_code" }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.refresh_token) return json({ stored: false, error: j.error || r.status });
  await db.from("apple_tokens").upsert({ user_id: user.id, refresh_token: j.refresh_token, client_id: cid, updated_at: new Date().toISOString() });
  return json({ stored: true });
});
