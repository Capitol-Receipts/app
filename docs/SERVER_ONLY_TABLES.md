# Server-only tables

These eight tables have row-level security on and **no policies**, so the public and signed-in API keys can't read or write them. Only edge functions using the server key touch them. `supabase/tests/rls.sql` fails CI if any of them gains a policy, and `api/db.js` refuses them (tested in `tests/db-proxy.test.js`).

| Table | Used by (server key only) | Browser code |
|---|---|---|
| admin_log | admin | none |
| admins | admin (MFA-checked admin list) | none |
| alert_log | send-alerts, account (delete), admin | none |
| apple_tokens | apple-token, account (delete) | none |
| billing_email_log | stripe-webhook, account (delete), admin | none |
| portfolio_goals | nothing (unused; keep locked or drop later) | none |
| roadmap_items | admin, uptime (roadmap sync) | none |
| support_requests | support, inbound-email, admin | none |

Checked November 9, 2026 by searching the repo for each table name.
