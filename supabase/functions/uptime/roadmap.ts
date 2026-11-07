// Same file in admin/ and uptime/: keep both copies identical.
// Keeps public.roadmap_items current on its own. Items with a check_key are ticked off (lane "done") when their check
// passes, and moved back to "now" if a check that passed later fails. Nothing here reads or returns secret values: env
// checks only test that a secret is set. Used by the admin function (Roadmap tab) and the uptime monitor (hourly).
const UA = { "User-Agent": "CapitolReceipts-Roadmap/1.0" };

async function text(url: string) {
  try { const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(10000) }); return r.ok ? await r.text() : null; } catch { return null; }
}

// adminMfa: true when the caller is an admin who passed the authenticator check; undefined = don't judge that item
export async function checkAll(db: any, adminMfa?: boolean): Promise<Record<string, boolean | undefined>> {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
  const [native, aasa, links, paid] = await Promise.all([
    text("https://app.capitolreceipts.com/app/js/native.js"),
    text("https://www.capitolreceipts.com/.well-known/apple-app-site-association"),
    text("https://www.capitolreceipts.com/.well-known/assetlinks.json"),
    db.from("subscriptions").select("user_id", { count: "exact", head: true }).eq("source", "stripe").not("stripe_sub", "is", null),
  ]);
  const key = (name: string) => native === null ? undefined : new RegExp(`${name}\\s*=\\s*'[^']+'`).test(native);
  const ios = key("RC_IOS_KEY"), android = key("RC_ANDROID_KEY");
  return {
    rc_keys: ios === undefined ? undefined : !!(ios && android),
    stripe_live: stripeKey ? /^(sk|rk)_live_/.test(stripeKey) : false,
    stripe_checkout: paid.error ? undefined : (paid.count || 0) > 0,
    admin_mfa: adminMfa,
    aasa: aasa === null ? undefined : !aasa.includes("TEAMID"),
    assetlinks: links === null ? undefined : !links.includes("REPLACE_WITH"),
  };
}

function judge(checkKey: string, res: Record<string, boolean | undefined>) {
  if (checkKey.startsWith("env:")) return checkKey.slice(4).split(",").every((n) => !!Deno.env.get(n.trim()));
  return res[checkKey];
}

export async function syncRoadmap(db: any, adminMfa?: boolean) {
  const { data: rows, error } = await db.from("roadmap_items").select("id,lane,check_key,check_ok").not("check_key", "is", null);
  if (error || !rows?.length) return { checked: 0, changed: 0 };
  const res = await checkAll(db, adminMfa);
  const now = new Date().toISOString();
  let changed = 0;
  for (const r of rows) {
    const ok = judge(r.check_key, res);
    if (ok === undefined) continue;
    const patch: Record<string, unknown> = { check_ok: ok, checked_at: now };
    if (ok && r.lane !== "done" && r.lane !== "declined") { patch.lane = "done"; patch.done_at = now; patch.updated_at = now; changed++; }
    else if (!ok && r.check_ok === true && r.lane === "done") { patch.lane = "now"; patch.done_at = null; patch.updated_at = now; changed++; }
    await db.from("roadmap_items").update(patch).eq("id", r.id);
  }
  return { checked: rows.length, changed };
}
