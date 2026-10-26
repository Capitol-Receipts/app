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
- **Home-screen widget** (`ios/App/CapitolWidget`, iOS 17+): the latest trades by the people you follow, refreshed
  hourly from the public trades table, last copy shown offline. The app shares who you follow through the App Group
  `group.com.capitolreceipts.app` (`App/CRNativePlugin.swift`, registered in `App/MainViewController.swift`).
  The target was added by `ruby scripts_add_widget.rb` (safe to re-run).
- **App lock** with Face ID or Touch ID (falls back to the passcode) for Pro accounts: Account › Lock with Face ID.
  It asks on launch and after the app has been away for more than a minute.
- **Offline reading**: a notice when the phone is offline; followed members' records and photos are kept on the device.
- **Delete my account** in Account (required by Apple, and on the web too): `supabase/functions/account`.

The app identity: bundle id `com.capitolreceipts.app`, iPhone only, portrait.

## Build

Needs a Mac with Xcode 26 or later (App Store submissions require the iOS 26 SDK) (or a cloud build service such as Codemagic or Ionic Appflow).

```sh
cd ios-app
npm install
npx cap sync ios
npx cap open ios
```

In Xcode: select the **App** target › Signing & Capabilities › choose the Squared Away Labs team for both the **App** and **CapitolWidget** targets, and add the App Groups capability with `group.com.capitolreceipts.app` to both (also register that App Group and the widget bundle id `com.capitolreceipts.app.widget` in the Apple Developer portal). The entitlements file
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

## Sign in with Apple and Google

The code is in `app/js/social.js`. It works on the website and in the app. Each button stays hidden until that
provider is turned on in Supabase, so nothing breaks before setup.

1. **Apple Developer › Identifiers**
   - On the App ID `com.capitolreceipts.app`, turn on Sign in with Apple. The entitlement is already in the project.
   - Create a **Services ID** for the website, `com.capitolreceipts.web`.
     - Domains: `hxgckcriehvrolwnabpd.supabase.co`.
     - Return URL: `https://hxgckcriehvrolwnabpd.supabase.co/auth/v1/callback`.
   - Create a **Key** with Sign in with Apple enabled and download the .p8 file.
2. **Supabase › Authentication › Providers › Apple**
   - Turn it on.
   - Client IDs: `com.capitolreceipts.web,com.capitolreceipts.app`.
   - Secret: generate it from the .p8 file. Supabase's Apple page links to the generator. The secret expires after 6 months, so set a reminder to renew it.
3. **Supabase Edge Function secrets** (these let "Delete my account" revoke Apple sign-in):
   - `APPLE_TEAM_ID`
   - `APPLE_SIWA_KEY_ID`
   - `APPLE_SIWA_KEY` (the whole .p8 text)
4. **Google Cloud › APIs & Services › Credentials**
   - Set up the OAuth consent screen with the app name, logo, privacy URL and terms URL.
   - Create a **Web** OAuth client with the redirect URI `https://hxgckcriehvrolwnabpd.supabase.co/auth/v1/callback`.
   - Create an **iOS** OAuth client with bundle id `com.capitolreceipts.app`.
5. **Supabase › Authentication › Providers › Google**
   - Turn it on.
   - Paste the Web client ID and secret.
   - Authorized Client IDs: add the iOS client ID.
   - Turn on "Skip nonce checks" (Google's iOS SDK doesn't pass the nonce through).
6. **Supabase › Authentication › URL Configuration**
   - Redirect URLs must include `https://app.capitolreceipts.com/**` and `https://www.capitolreceipts.com/**`.
7. **Code**
   - Put the two Google client IDs in `GOOGLE_WEB_CLIENT_ID` and `GOOGLE_IOS_CLIENT_ID` in `app/js/social.js`.
   - In `ios/App/App/Info.plist`, replace `REPLACE-WITH-IOS-CLIENT-ID` with the iOS client ID's reversed form, the part before `.apps.googleusercontent.com`.

In the app, Google only appears next to Apple, because the App Store requires Apple sign-in whenever another
sign-in service is offered.

App Store listing text, privacy answers and review notes: `store/listing.md`. Screenshots (6.9" iPhone, 1290×2796):
`store/screenshots/`.
