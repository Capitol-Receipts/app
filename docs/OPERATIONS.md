# Capitol Receipts: operations guide

How the system fits together, where configuration lives, and what to do when something breaks.
Secret values are never stored in this repo. This file lists their names and where they are set.

## Architecture

| Part | What it is | Where it runs | Deployed by |
|---|---|---|---|
| Web app | Static single-page app: `index.html` + `app/js/*.js` + `app/css` (no build step) | Vercel project for app.capitolreceipts.com | Push to `main` |
| Server-rendered pages | `api/seo.js` and helpers render every record page for search engines; `api/og.js` share images; `api/db.js` cached read-only data proxy; `api/face.js`, `api/cimg.js` images | Vercel functions (same project) | Push to `main` |
| Marketing site | Static HTML in `site/`, rebuilt by `scripts/build_site.py` → `seo_site.py`, `app_soon.py`, `site_live.py` | Vercel project for www.capitolreceipts.com (`site/vercel.json`) | Push to `main` |
| Admin portal | `admin.html` at admin.capitolreceipts.com, calls the `admin` function. Requires an admin email plus an authenticator-app code | Vercel | Push to `main` |
| Database and sign-in | Supabase project `hxgckcriehvrolwnabpd` (Postgres, Auth, Edge Functions). Every table has row-level security; public records are read-only to everyone; user tables are readable and writable only by their owner | Supabase | Migrations and functions via Supabase (see below) |
| Edge functions | `supabase/functions/*`: `billing`, `stripe-webhook`, `appstore-webhook`, `account`, `apple-token`, `send-alerts`, `admin`, `support`, `inbound-email`, `uptime`, `send-samples` | Supabase | Supabase MCP or `supabase functions deploy <name>` |
| Daily data update | `pipeline/*.py` run by `.github/workflows/daily-update.yml` (several times each weekday), then `send-alerts` | GitHub Actions | Scheduled |
| iPhone and Android apps | Capacitor shells in `mobile/` (`ios/`, `android/`) that load the live web app | App Store and Google Play (neither submitted yet) | Xcode archive / `./gradlew bundleRelease`, see `mobile/README.md` |

Trust boundaries: the browser and the phone apps only hold the public Supabase key and the signed-in user's own token.
Everything privileged (Stripe, Resend, APNs, Apple, service role) runs in edge functions or GitHub Actions.

## Configuration reference (names only)

**Supabase edge function secrets** (Supabase → Edge Functions → Secrets)

| Name | Used by | Purpose |
|---|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEYS` | all | Set by Supabase automatically |
| `STRIPE_SECRET_KEY` | billing, stripe-webhook, account, admin | Stripe API |
| `STRIPE_WEBHOOK_SECRET` | stripe-webhook | Verifies Stripe webhook signatures |
| `STRIPE_PRICE_MONTHLY_599`, `STRIPE_PRICE_YEARLY_3999` | billing | Optional. Pins the Pro prices; otherwise found or created by lookup key |
| `RESEND_API_KEY` | send-alerts, stripe-webhook, admin | Email delivery |
| `GA_API_SECRET` | stripe-webhook | Optional. Sends purchases to Google Analytics |
| `REVENUECAT_WEBHOOK_AUTH` | appstore-webhook | Must match the authorization value set in RevenueCat |
| `APNS_KEY`, `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_TOPIC`, `APNS_ENV` | send-alerts | iPhone push alerts |
| `FCM_SERVICE_ACCOUNT` | send-alerts | Android push alerts (whole Firebase service-account JSON) |
| `RESEND_WEBHOOK_SECRET` | inbound-email | Signing secret (whsec_...) of the Resend webhook for received mail |
| `SUPPORT_INBOX`, `ALERT_EMAIL` | support, inbound-email, admin, uptime | Optional. Where support mail and outage alerts go (default admin@squaredawaylabs.com) |
| `APPLE_TEAM_ID`, `APPLE_SIWA_KEY_ID`, `APPLE_SIWA_KEY` | apple-token, account | Sign in with Apple token exchange and revocation |

**GitHub Actions secret**: `SUPABASE_SERVICE_ROLE_KEY` (daily data load and alert sending).

**Supabase dashboard settings**: Auth providers (email, Apple, Google), redirect URL allow list
(`https://app.capitolreceipts.com/**`, `https://www.capitolreceipts.com/**`), MFA (TOTP on, used by admins).

**Public values in code** (safe to ship): Supabase URL and publishable key, Google OAuth client IDs (`app/js/social.js`),
RevenueCat public iOS and Android keys (`app/js/native.js`, still empty), Google Analytics ID.

## Deploying

- **Web app, server pages, marketing site, admin portal**: run `bash scripts/bump_version.sh`, commit, push to `main`.
  Vercel deploys both projects within about a minute. The version number in `index.html` changes every file URL, so
  browsers pick up the new code.
- **Edge functions**: deploy the changed function from `supabase/functions/<name>` (Supabase MCP `deploy_edge_function`
  or `supabase functions deploy <name>`). Keep `verify_jwt` as it is today: off for `billing`, `stripe-webhook`,
  `appstore-webhook`, `send-alerts`, `admin`, `support`, `inbound-email`, `uptime` (they check tokens or signatures themselves, or are public by design), on for `account`,
  `apple-token`, `send-samples`.
- **Database changes**: apply as a named migration (Supabase MCP `apply_migration`). Make changes backward compatible:
  add columns before code uses them, remove only after no deployed code reads them.

## Rolling back

- **Vercel**: Deployments → pick the last good deployment → Promote to Production (instant). Or `git revert` and push.
- **Edge function**: redeploy the previous source from git history (`git show <commit>:supabase/functions/<name>/index.ts`).
- **Database**: write a new migration that reverses the change. For data loss, restore from backup (below).
- **iPhone app**: most fixes ship through the website without an App Store update, because the app loads the live site.
  Native changes need a new build. Use phased release in App Store Connect.

## Backups and restore

Not yet verified. To do:
1. In Supabase → Database → Backups, confirm daily backups are on, and turn on point-in-time recovery if the plan allows.
2. Write down the target: how much data loss is acceptable (for example, 24 hours) and how fast service must return.
3. Test a restore once into a new project and record the date and how long it took.

Public records can always be rebuilt by re-running the data pipeline. The data that only exists in the database is
user accounts, preferences, subscriptions and the admin log.

## Monitoring

- **Daily data update**: GitHub emails the repo owner when a run fails. The run now also fails if sending alert emails fails.
- **App errors**: script errors, screens that fail to draw and screens stuck on "Loading…" are sent to Google Analytics as
  `exception` events. Real-visitor speed is sent as `web_vitals` events (LCP, CLS, INP).
- **Uptime**: the `uptime` function runs every 5 minutes (pg_cron job `uptime-check`) and checks the web app, website,
  a record page, the data proxy, sign-in and payments. Two failures in a row email admin@squaredawaylabs.com, and
  recovery sends another email. Status is in `public.service_status`, shown in the admin portal and on
  www.capitolreceipts.com/support. `.github/workflows/uptime.yml` is the backup: it checks the sites without Supabase
  and fails if the 5-minute monitor hasn't run in 20 minutes (GitHub may delay its schedule).
- **Not yet in place**: alerting on edge function errors (Supabase → Edge Functions → Logs) and a crash reporter for
  the phone apps.

## Support

- **Help page**: www.capitolreceipts.com/support (common questions, live status, contact form). In the app and phone
  apps: More › Help & support, the menu's Help link, the error screen, or app.capitolreceipts.com/?go=help.
- **Where messages go**: the form calls the `support` function. It saves the message in `support_requests`, emails
  admin@squaredawaylabs.com with Reply-To set to the sender, and sends the sender a confirmation with a reference (CR-123).
- **Email**: capitolreceipts.com receives mail through Resend (MX record, inbox support@capitolreceipts.com). Resend's
  `email.received` webhook calls `inbound-email`, which files mail to any @capitolreceipts.com address (support@,
  corrections@ ...) as a support request and forwards it to admin@squaredawaylabs.com. Reply from Gmail to answer.
  The Resend account is shared with other apps, so the function ignores mail for other domains.
- **Answering**: admin portal › Support. Replies there are emailed from support@capitolreceipts.com and logged.

## When something breaks

1. Site down or blank: check Vercel deployments and roll back if a recent deploy caused it.
2. Data stale: check the latest "Daily update" run in GitHub Actions; re-run it from the Actions tab.
3. Payments: check Stripe → Developers → Webhooks for failed deliveries to `stripe-webhook`, then Supabase function logs.
4. Someone can't sign in or lost Pro: in the admin portal, find the person, check their plan; grant complimentary Pro if needed.
5. Account deletion by email request: confirm the request comes from the account's address, then delete the account in
   Supabase → Authentication (and cancel any Stripe subscription in Stripe first).

## Accounts the business must control

Owner and recovery methods should be confirmed and written down for each: domain registrar (capitolreceipts.com),
Vercel team, Supabase organization, GitHub organization `Capitol-Receipts`, Stripe, Resend, Google Cloud project
`capitol-receipts` (Google sign-in, admin@squaredawaylabs.com), Google Analytics, Apple Developer (not yet created),
RevenueCat (not yet created). Turn on two-step sign-in on every one.
