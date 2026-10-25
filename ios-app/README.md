# Capitol Receipts for iPhone

A native iPhone shell (Capacitor 8) around the web app at https://app.capitolreceipts.com. The screens are the same
code as the website, so every web release updates the app too. The shell adds what a web page can't do:

- **Push alerts** when someone you follow trades stock (Account › Alerts on this iPhone). Tokens go to `push_devices`;
  `supabase/functions/send-alerts` sends them through Apple (APNs) next to the email alert.
- **Pro with Apple in-app purchase** through RevenueCat, with Restore purchases and the required subscription terms.
  RevenueCat calls `supabase/functions/appstore-webhook`, which turns Pro on in `subscriptions` (source `app_store`).
  No card checkout or Stripe links appear inside the app.
- **iPhone share sheet**, **links that open the app** (capitolreceipts.com pages and alert emails), and **offline**:
  pages already viewed open without a connection (`/sw.js`), with `www/offline.html` on a first launch offline.
- **Delete my account** in Account (required by Apple, and on the web too): `supabase/functions/account`.

The app identity: bundle id `com.capitolreceipts.app`, iPhone only, portrait.

## Build

Needs a Mac with Xcode 16 or later (or a cloud build service such as Codemagic or Ionic Appflow).

```sh
cd ios-app
npm install
npx cap sync ios
npx cap open ios
```

In Xcode: select the **App** target › Signing & Capabilities › choose the Squared Away Labs team. The entitlements file
already asks for Push Notifications and Associated Domains; add **In-App Purchase** with the + Capability button.
Then Product › Archive › Distribute › App Store Connect, and test it in TestFlight.

Icons and the launch screen come from `resources/` (`npm run assets` regenerates them).

## Settings that come from accounts only you can open

| What | Where it goes |
|---|---|
| Apple Team ID (10 characters, not secret) | Replace `TEAMID` in `/.well-known/apple-app-site-association` and `/site/.well-known/apple-app-site-association` |
| RevenueCat public iOS key (`appl_...`, safe to ship) | `RC_IOS_KEY` in `app/js/native.js` |
| RevenueCat webhook authorization value | Supabase secret `REVENUECAT_WEBHOOK_AUTH`, and the same value in RevenueCat › Integrations › Webhooks |
| APNs key (.p8 file), its Key ID, your Team ID | Supabase secrets `APNS_KEY` (paste the whole .p8 text), `APNS_KEY_ID`, `APNS_TEAM_ID` |

RevenueCat setup: entitlement `pro`; offering `default` with a Monthly and an Annual package pointing at the App Store
products `com.capitolreceipts.pro.monthly` and `com.capitolreceipts.pro.yearly`. Webhook URL:
`https://hxgckcriehvrolwnabpd.supabase.co/functions/v1/appstore-webhook`. Purchases made in TestFlight and by Apple's
reviewers are sandbox purchases; they unlock Pro for the account that made them, so Apple can test it.

App Store listing text, privacy answers and review notes: `store/listing.md`. Screenshots (6.9" iPhone, 1290×2796):
`store/screenshots/`.
