# Capitol Receipts web app: architecture and user workflows audit

Scope: Part A, architecture and code structure (read from `/home/claude/app`). Part B, functional workflows tested with Playwright (Chromium, 390x844) against the local static server `scratchpad/proxy.py` on :8791. That server serves the repo and proxies `/api/*` to production for read-only data. A few signed-out checks ran against https://app.capitolreceipts.com: about 8 page loads and 4 curl requests.

Safety: every non-GET request to Supabase, every `/auth/v1/` request and every `/functions/v1/` request was blocked at the browser context (`wf_lib.guard`). The blocked-write log came back empty for all real writes. Signed-in flows used a fake `ACCT.client` injected in page context. No accounts, payments or DB writes were made. Test scripts are `scratchpad/audit/wf1.py`–`wf6.py`.

---

## Part A: Architecture

### Components and data flow

```
Browser (app.capitolreceipts.com)  ── or iOS Capacitor WebView loading the same URL (?src=ios)
 │
 ├─ index.html: inline boot script
 │    • window.SB: tiny REST client (publishable key). Public tables → GET /api/db?q=<postgrest path> (Vercel CDN cache),
 │      falls back to direct https://<proj>.supabase.co/rest/v1 on 4xx/5xx/network (3 tries, backoff).
 │    • boot(): members/nominations/roll_calls/app_meta in parallel → window.__DATA
 │      then background: member detail (~1.27 MB raw / 247 KB gz) → __FULL; photos list.
 │    • Injects 31 app scripts in APP_SCRIPTS order (async=false), es_dict/glossary_es only for Spanish.
 │    • Service worker /sw.js (not on localhost): network-first pages and data, cache-first /app/ files.
 ├─ app/js/*.js (~743 KB, no bundler, no modules; all top-level globals)
 │    core.js   data shaping (MEM, byId, NOM), global state S, store (localStorage pt_*), base screens
 │    ui.js     base render() + the single delegated click handler + tab bar
 │    hist.js   loadHist(): history/bills/PACs via rpc/get_light (several MB) → H; lobbying → G
 │    db.js     ensureFull(): per-record detail fetch when a record page opens
 │    account.js Supabase JS (jsDelivr) auth, ACCT, user_prefs sync
 │    pro.js/pro2.js Pro paywall, Stripe checkout/portal via Edge Function `billing`, CSV, radar (trade_feed)
 │    native.js Capacitor bridges, delete account (Edge Function `account`)
 │    routes.js URL ↔ screen (replaceState only), share links, GA page views. Loads last, outermost render wrapper
 │    others: feature screens (nav, pages, search, leaders, pacs, elections, companies, votes, places, extras, exec,
 │    simple, friendly, trust, social, desktop, i18n + es_dict)
 ├─ Vercel: api/seo.js (SSR record pages; sets __ROUTE/__HOLD so the app takes over), api/db.js (cached data proxy),
 │    api/og.js, face.js, cimg.js; vercel.json rewrites; middleware.js (admin host)
 └─ Supabase: Postgres (public tables + user_prefs/subscriptions under RLS), Auth, Edge Functions
      (billing, stripe-webhook, account, send-alerts, admin, appstore-webhook, apple-token)
      ← GitHub Actions pipeline (service role key) loads public data daily
```

**Trust boundaries.**
1. Browser ↔ Supabase REST with the publishable key. RLS is the only control over user tables.
2. Browser ↔ Edge Functions with the user JWT. Billing, delete account and Pro status are decided server-side.
3. Browser ↔ `/api/db`, a public cache proxy for an allow-listed set of tables.
4. Third-party script origins: jsDelivr (supabase-js, no SRI), Google Tag Manager, Google Fonts.
5. Pipeline ↔ DB, using the service role key in GitHub secrets.

Pro features are gated in the client only (`isPro()` reads `ACCT.plan`). Server-side checks apply only to alerts and billing.

**State.** One mutable global `S` (core.js:88) holds the tab, a navigation stack (`S.stack`), filters, follows and the language. Follows live in `user_prefs` when signed in and in localStorage otherwise. `ACCT` (account.js:2) holds the user, client, plan and alerts. Every change calls the global `render()`, which rebuilds `#app.innerHTML`. Post-render passes then mutate the DOM: tabs, deadRows, share button, translation.

### Structural observations

| Area | Observation |
|---|---|
| Monkey-patching | Later files replace earlier globals with the pattern `const _x=x; x=function(){…_x()…}`. Counts: `render` 31 times, `navGo` 13, `drawerHtml` 13, `openSheet` 6, `more` 4, `acctSet` 3, `topicSheet` 2, plus `doCsv`, `proPage` and `shareSheet`. Some wrappers patch the *HTML string* the inner function returned, using regex: pro.js:213-214, account.js:110/119, desktop.js:58. Behaviour depends on script order and exact markup. A throw in any wrapper aborts the whole chain, and nothing catches it (see WF-03). Some wrappers return early and skip inner ones (pro.js:169-178 redraws the tab bar itself; routes.js:50 short-circuits). |
| Dead / legacy code | `core.js:386-394` `account()` still contains the "Free plan · $5.99/mo … Payments aren't connected in this prototype" card, a "Notify me about" switch block, and the `#pro` / `#proNote` handler at ui.js:361. All of it is reachable only through `more()`. pro.js:213 regex-replaces it, and in testing the text was absent from the DOM (`prototype text present? False`). It comes back if pro.js fails to load or the markup drifts. `alertSheet` is defined three times (trust.js:66, pro.js:217, pro2.js:146), and only the last one is live. |
| Duplication | `?go=` deep-link pollers in pro.js:240-246 and pro2.js:214-220. Tab-bar markup in ui.js:303 and pro.js:172. `download_data` analytics fire twice per CSV (pro.js:140 and pro2.js:139). Three `setInterval` pollers wait on globals instead of using promises. |
| File size | es_dict.js 188 KB (Spanish only, so acceptable). hist.js 61 KB, core.js 59 KB, ui.js 41 KB. Lines are minified-style, up to 1,000+ chars, so diffs and code review are hard. |
| Tooling | No ESLint or Prettier config, no tsconfig/JSDoc types, no unit or E2E tests. package.json has no scripts. All 8 GitHub workflows are data/SEO jobs, with no CI check on app code. |
| Error handling | No `window.onerror` / `unhandledrejection` handler and no error reporting service. Boot failures are handled well (message plus "Try again"). Record detail fetches show "Couldn't load this page". Everything else uses `console.warn` or swallows the error (WF-04, WF-05). |
| Routing | `history.replaceState` only. No `pushState` or `popstate` anywhere (WF-01). Unknown screen ids fall through to a permanent "Loading…" (WF-02). |
| Deployment | Static files are versioned with `APP_VER` query strings. Vercel serves `/app/*` with max-age 3600 plus SWR. The SW caches versioned files cache-first in `cr-v3` and never trims old versions or `/api/db` responses, so storage grows without bound (Low). |

---

## Findings register

| ID | Finding | Platform | Severity | Status | Evidence | Impact | Fix | Effort |
|---|---|---|---|---|---|---|---|---|
| WF-01 | In-app navigation never adds browser history entries, so browser Back, Android Back and edge-swipe leave the app instead of returning to the previous screen | Web (all), iOS WebView (likely) | High | Fail | `history.length` was 2 before and still 2 after opening 3 member profiles (wf6). routes.js:57-60 uses only `history.replaceState`. `grep pushState\|popstate app/js` returns nothing. After going home → search → member, `page.go_back()` left the app's history entry. | Users who tap Back after opening a profile lose their place or exit the site. This is the most common navigation gesture on mobile. | Use `history.pushState` in `go()` / `navGo()` and tabs, and add a `popstate` listener that restores `S.stack` / `S.tab` from `history.state`. Keep replaceState for filter changes. | M |
| WF-02 | Unknown screen ids show "Loading…" forever (no 404 state) | Web | Medium | Fail | Live `https://app.capitolreceipts.com/go/bogus` returned HTTP 200 and still showed "Loading…" after 9 s. Locally `/?go=bogus`, `go('ZZZ999')` and `go('n-bogus')` did the same. Cause: the ui.js:302 fallback `…:'Loading…'`, plus pro2.js:217 accepting any `/go/<word>`. | Mistyped or stale shared links look like a hung app with no way forward. | In base render, show "We couldn't find that page" with a Home button when the id matches no known prefix and data has finished loading. Validate `q` in pro2.js:217 against known screens. | S |
| WF-03 | Malformed party link crashes render; uncaught exceptions anywhere in the render chain are invisible | Web | Medium | Fail | Live `/go/party:Q` logged pageerror `Cannot read properties of null (reading 'toFixed')` at party.js:36 (`s.tradesAvg.toFixed`). The user silently stays on Home. The stack passes through 30+ wrappers (ui.js:302 → nav.js:146 → pages.js:187 → …). | Any data edge case in one wrapper aborts the whole screen draw, and nobody hears about it (see WF-17). | Guard `partyPage` for unknown parties. Wrap the outermost render (routes.js:47) in try/catch that shows an error state and reports the error. | S |
| WF-04 | Follow, alert and watchlist saves fail silently; local follows are wiped before the save is confirmed | Web, iOS | Medium | Fail | With a stubbed DB error (`JWT expired`), unfollow updated the UI, the upsert was called and no toast appeared. An alert toggle stayed checked with no message. Code: account.js:35-38 (`if(error)console.warn`), trust.js:104 (`.then(()=>{})`), pro.js:148. account.js:32 `_storeSet('following',[])` clears the local copy before `acctSave` succeeds. | When a session expires or RLS rejects a write, users believe they followed someone or set alerts, but nothing is saved, so alerts never arrive. Follows made before sign-in can be lost. | Check `{error}` on every write. On failure, show a toast ("Couldn't save. Try again"), revert the UI, and on 401 re-auth. Clear local follows only after a successful upsert. | S |
| WF-05 | When the member-detail payload fails, profiles render without donors, vote history or ex-staff and give no notice | Web | Medium | Fail | Blocking the `missedM…` query set `__FULLERR=true`. The Pelosi profile rendered with no "couldn't load" text (`any notice of missing data? False`). Cause: index.html:125, then routes.js:50 lets render proceed. | On a flaky connection, users see incomplete records that look complete, which is a correctness and trust problem for an accountability app. | When `__FULLERR` is set, show a slim banner on profiles ("Some details didn't load. Retry") with a retry that re-runs `__FULLP`. | S |
| WF-06 | Checkout/portal button has no in-flight guard; portal errors use checkout wording; an expired session gives a generic error | Web | Medium | Fail | Triple-clicking "Start your free trial" sent 3 POSTs to `/functions/v1/billing` (stubbed). With Pro and the portal returning 500, the message was "Checkout didn't open." With `getSession` → null, `session.access_token` threw a TypeError and the same generic message appeared (pro.js:33-46). | Duplicate Stripe Checkout sessions, confusing copy for subscribers managing billing, and no route back to sign-in. Real Stripe behaviour was **Not verified**. | Disable the button and set a `busy` flag until the redirect or an error. Use action-specific copy. If there is no session, call `authSheet('in','Your session expired…')`. | S |
| WF-07 | A partial script-load failure leaves a half-working app with no message | Web | Medium | Fail | Aborting `/app/js/pages.js` rendered Home but threw pageerrors `G is not defined` with no user-facing message. `failed()` (index.html:139-140) writes into `#bootmsg`, which has already been replaced by the app, and it retries only once per session. | On flaky mobile networks some features break while the UI looks normal. | Gate the first `render()` on all scripts loading (count `onload`), or show a top banner with Reload when `failed()` fires after the app has drawn. | S |
| WF-08 | No global error capture or reporting | Web, iOS | Medium | Fail | No `window.onerror` or `unhandledrejection` handler, and no Sentry or similar (grep of index.html and app/js). Errors from WF-03 and WF-07 exist only in the user's console. | Production breakage goes undetected. | Add a small handler that posts `{msg, stack, route, APP_VER}` to a logging endpoint or Sentry, sampled and rate-limited. | S |
| WF-09 | Monkey-patching architecture: order-dependent function replacement and regex patching of HTML strings | Code | Medium | Fail | 31 `render` wrappers, 13 `navGo`, 13 `drawerHtml` and so on (grep `const _x=x`). pro.js:213 relies on regex over markup produced in core.js:389. | Small markup or order changes silently break features, as with the "prototype" card reappearing. Onboarding and review are hard. | Short term: a single route table (`id prefix → screen fn`) and a post-render hook list instead of wrappers. Longer term: ES modules with a bundler. | L |
| WF-10 | No lint, type checks or automated tests; no CI for app code | Code | Medium | Fail | No eslint/prettier/tsconfig. package.json has no scripts. Workflows: daily-update, indexnow, load-data, send-alerts, seo-health, sitemap-warm, warm-cache, weekly-briefing. | Regressions such as WF-03 ship unnoticed. | Add ESLint (no-undef with a globals list, no-unused-vars), a Playwright smoke suite (boot, search, profile, ZIP, sign-in sheet), and run both on PRs. | M |
| WF-11 | Pro gating is client-side only (radar list, CSV export) | Web | Medium | Fail | radarPage fetches all 400 `trade_feed` rows for anonymous users and shows 3 plus a blur (pro.js:98, 118). `doCsv` checks only `isPro()` (pro.js:139, pro2.js:138). Setting `ACCT.plan={pro:true}` in page context produced a CSV download in testing. | Paid features can be bypassed from the console. The data itself is public, so this is revenue risk, not data exposure. | Accept it as a design choice, or serve the radar and CSV through an Edge Function that checks the subscription. | M |
| WF-12 | Deep-linked member profiles wait for the full 1.27 MB detail payload before becoming interactive | Web | Medium | Not verified | routes.js:50 shows "Loading…" until `__FULL`. Live `/member/P000197?app=1`: the profile became interactive at about 27 s in this sandbox, and locally `__FULL` arrived at about 22 s. The sandbox network goes through a proxy, so measure on a real device. Gzipped detail from the CDN took 0.25 s on curl. | If it reproduces on real networks, shared links feel broken. | Render the profile from `lite` data immediately and fill in the detail sections when they arrive. Or fetch detail for just this id first. | M |
| WF-13 | Sign-out failure is unhandled; the user stays signed in with no message | Web | Low | Fail | Stubbed `signOut` throwing gave `signOut()` rejected with "Failed to fetch" and `signedIn()` still true (account.js:114). | Rare, but a confusing dead button when offline. | try/catch: clear the local session regardless and show a toast. | XS |
| WF-14 | Raw backend error strings shown in the sign-in sheet | Web | Low | Fail | A network error showed "Failed to fetch". A server error showed "Database error querying schema" (account.js:90 falls through to `m`). | Unfriendly copy that leaks internals. | Map unknown errors to "Something went wrong. Check your connection and try again." | XS |
| WF-15 | Auth form can submit twice | Web | Low | Fail | Two `requestSubmit()` calls produced 2 `signInWithPassword` calls. The button is disabled, but the submit listener (account.js:117) doesn't check a busy flag. | Duplicate sign-up emails or rate-limit hits. | Add `if(ACCT.busy)return` in `authSubmit`. | XS |
| WF-16 | Unknown paths on the app domain return Vercel's plain-text 404 | Web | Low | Fail | `curl https://app.capitolreceipts.com/nonexistent-page` returned 404, `text/plain`, "The page could not be found NOT_FOUND". Unknown record ids get a branded SSR 404, which passes. | Off-brand dead end with no navigation. | Add a `404.html` (or a catch-all to seo.js) with links home. | XS |
| WF-17 | Nonexistent ticker shows an empty stock page instead of "not found" | Web | Low | Fail | `go('stock:NOTREAL')` rendered "NOTREAL … Members trading it 0 … Watch this stock". | Minor confusion; invites users to "watch" junk tickers. | Show not-found when the ticker isn't in the trades or company list. | XS |
| WF-18 | Dead "prototype" payments card and duplicate alertSheet definitions | Code | Low | Pass (not user-visible) / Fail (hygiene) | See the structural table above. core.js:389, ui.js:361, trust.js:66, pro.js:217, pro2.js:146. | It reappears if pro.js fails to load (WF-07), showing "Payments aren't connected in this prototype" to users. | Delete the plan card, its switches and the `#pro` handler from core.js/ui.js. Keep one alertSheet. | XS |
| WF-19 | Duplicate analytics event per CSV download | Web | Low | Fail | `track('download_data')` in both pro2.js:139 and pro.js:140 (wrapper calls inner). | Inflated metrics. | Remove one. | XS |
| WF-20 | Service worker cache is never trimmed | Web | Low | Not verified | sw.js `cacheFirst` stores every versioned `/app/` file and `/face/` image, and `netFirst` stores every `/api/db` URL in `cr-v3`. Nothing deletes them except a name bump. The SW is disabled on localhost, so this was not exercised. | Storage grows across releases on returning devices. | Delete `/app/` entries whose `v=` ≠ current, or bump the cache name per release. Cap entries. | S |

---

## Workflow test matrix

Legend: Pass / Fail / Not verified (NV) / N/A. "Stub" means signed-in state and backend responses were simulated in the page, so real backend behaviour is NV.

| Workflow | Case | Result | Notes |
|---|---|---|---|
| Boot | Normal load | Pass | Interactive in 3.8 s locally; detail at 22 s through the local proxy |
| Boot | All data requests fail | Pass | "Couldn't reach the database. Check your connection." + Try again |
| Boot | API 5xx | Pass | Same message after retries |
| Boot | Slow network (+4 s per call) | Pass | "Loading the latest records…" with static links; ready at 4.5 s |
| Boot | One JS file fails | Fail | WF-07 |
| Boot | Detail payload fails | Fail | WF-05 |
| Search | Name ("pelosi") | Pass | Results shown |
| Search | No results | Pass | "No matches for "…". Try a last name, a state…" |
| Search | `<script>` / `<img onerror>` | Pass | Rendered as text; injected flags undefined |
| Search | `o'brien`, `%`, whitespace only | Pass | Correct results, no-results message, or default view |
| Search | 3,000-char query | Pass | 0.34 s; no errors |
| Search | Focus kept while typing | Pass | Whole app re-renders per keystroke (ui.js:304) but focus and caret are restored |
| ZIP | 18701, 10001 (valid) | Pass | Two senators plus the House member |
| ZIP | 99999 (at-large AK) | Pass | |
| ZIP | 00000 | Pass | "We couldn't find that ZIP code…" |
| ZIP | `abcde`, `1234` | Pass | Non-digits stripped; no lookup under 5 digits (no hint shown; minor) |
| Member page | Open, tabs, compare sheet | Pass | Topic cards switch in-page tabs (simple.js:184) |
| Bill / PAC / lobbying / nominee / stock pages | Open | Pass | |
| Compare / party / pro / radar screens | Open | Pass | |
| Unknown record (in app) | bill/pac/past-member bad id | Pass | "Bill not found." / "Not found." |
| Unknown record (in app) | member id, nominee id, any /go/x | Fail | WF-02 |
| Unknown record (live SSR) | /member/ZZZ999, /bill/nonsense | Pass | Branded 404 page with HTTP 404 |
| Unknown path (live) | /nonexistent-page | Fail | WF-16 |
| Malformed link | /go/party:Q | Fail | WF-03 |
| Stock | Nonexistent ticker | Fail | WF-17 |
| Deep links | ?go=pro, radar, rank:trades, stock:NVDA, ?lang=es | Pass | |
| Deep links | Live /member/P000197?app=1 then reload | Pass (slow) | Reload stays in app; WF-12 timing NV |
| Deep links | Live /member/P000197/slug (no app=1) | N/A | Redirects to the www public page by design |
| Browser history | Back after in-app navigation | Fail | WF-01 |
| Browser history | Forward | Fail | No entries to go forward to (WF-01) |
| In-app Back button | Profile → Back | Pass | Returns to Home |
| Offline after load | Record needing detail (bill, PAC) | Pass | "Couldn't load this page. Check your connection… Go back" |
| Offline after load | Already-loaded screens (stock, radar, history) | Pass | Served from memory |
| Offline cold start | SW offline shell | NV | SW disabled on localhost |
| Follow (signed out) | Tap / double-tap | Pass | One sign-in sheet with reason; nothing stored |
| Sign-in sheet | Bad email | Pass | "Enter a valid email address." |
| Sign-in sheet | Short password | Pass | "Passwords need at least 8 characters." |
| Sign-in (stub) | Invalid credentials / unconfirmed | Pass | Friendly messages |
| Sign-in (stub) | Network / server error | Fail | WF-14 raw strings |
| Sign-in (stub) | Success | Pass (stub) | Sheet closes; real session handoff via onAuthStateChange NV |
| Sign-in (stub) | Double submit | Fail | WF-15 |
| Sign-up (stub) | Needs confirmation / already registered / weak password | Pass | Weak-password message is Supabase's raw text (acceptable) |
| Social sign-in | Apple / Google | NV | Providers not enabled |
| Follow (signed in, stub) | Free limit of 5 | Pass | 6th and 7th open the Pro upsell; count stays 5 |
| Follow (stub) | DB write fails | Fail | WF-04 |
| Alerts (stub) | Open settings, toggle | Pass (UI) | |
| Alerts (stub) | Toggle with DB error | Fail | WF-04 |
| Alerts (stub) | Pro-only toggle as free user | Pass | Unchecks and opens upsell |
| CSV | Signed out / free | Pass | Upsell sheet |
| CSV | Pro (stub) | Pass | `capitol-receipts-NVDA-trades-2026-10-26.csv` downloaded |
| CSV | Bypass via console | Fail | WF-11 |
| Pro page | Signed out → Start trial | Pass | Sign-up sheet |
| Checkout (stub) | Triple-click | Fail | WF-06 (3 requests) |
| Checkout (stub) | `not_configured` | Pass | "Card payments are being switched on…" |
| Billing portal (stub) | 500 / expired session | Fail | WF-06 copy and no re-auth |
| Billing / Stripe real | Checkout, portal, webhook | NV | No payments by rule |
| Delete account (stub) | Sheet, warning, 500 response | Pass | Button shows "Deleting…" and is disabled; error message with support email; stays signed in |
| Delete account real | Backend deletion | NV | |
| Sign out (stub) | Network failure | Fail | WF-13 |
| Language | Toggle to Spanish (home, profile) | Pass | Persists in localStorage (`pt_lang`) |
| Share | Member card sheet + copy link | Pass | `https://www.capitolreceipts.com/member/P000197`, toast "Link copied" |
| Share | Stock, bills list | Pass | www URLs |
| Share | navigator.share (mobile native) | NV | Headless desktop Chromium |
| Payments "prototype" card | Visible anywhere? | Pass | Not in DOM on the More screen (signed out or in); dead code only (WF-18) |

### Console / page errors observed
- `pageerror: Cannot read properties of null (reading 'toFixed')` at party.js:36 on `/go/party:Q` (local and live).
- `pageerror: G is not defined` when a script fails to load (WF-07).
- `warning: TypeError: Failed to fetch at SB.req` when offline (expected; logged by the detail and photo loaders).
- 404 for `/face/<id>.webp` locally only (Vercel rewrite not present on the local server; N/A).
- No page errors during normal signed-out flows (search, ZIP, profiles, records, Spanish, share).
