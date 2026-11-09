# Texas App Store Accountability Act (SB 2420): brief for counsel

Prepared November 9, 2026 for a lawyer's review before the first App Store / Google Play submission. Not legal advice.

## Status (as last reported in public sources)
- Signed May 27, 2025; Bus. & Com. Code ch. 121; meant to take effect Jan 1, 2026.
- Dec 23, 2025: federal district court enjoined it (CCIA v. Paxton and a student-group case).
- May 28 / June 4, 2026: Fifth Circuit stayed those injunctions pending appeal, so the law is **enforceable now**.
- July 6, 2026: Supreme Court declined to lift the stay. Fifth Circuit heard argument Aug 4, 2026; no merits ruling seen as of mid-October.
- Enforced by the Texas Attorney General.
- Similar laws: Utah (deadline May 6, 2027, private lawsuits only), Louisiana (July 1, 2027), Alabama (Jan 1, 2027).

## What falls on the developer (our side)
1. Give the app and any in-app purchases an age rating that fits the Texas age bands, and keep it current.
2. Read the store's age category (under 13, 13–15, 16–17, 18+) and parental-consent status for Texas accounts. Apple: Declared Age Range API (iOS 26.2+). Google: Play Age Signals API.
3. Ask for fresh parental consent through the store when we make a "significant change" (we decide what counts; Texas treats an age-rating change as one). Apple: PermissionKit Significant Change API.
4. Handle consent withdrawal (Apple sends a server notification and blocks launch on the child's device).
5. Use the store's age data only for compliance, send it securely, and delete it promptly.

## Capitol Receipts facts that matter
- Public-record civic app, expected rating 4+ / Everyone. No user-generated content, chat, ads, or adult content.
- Has an auto-renewing subscription (Pro) bought through Apple / Google, and an optional account (email sign-in) with saved members, alerts and push.
- The native app is a thin shell around the website (Capacitor); the age APIs need a small native plugin, which we have not built.

## Questions for counsel
1. Does an all-ages, public-records app still need to call the age and consent APIs, or does relying on the store's own download-time consent satisfy us?
2. Is the Pro subscription a purchase that needs a per-purchase consent check on our side, or does the store's purchase flow cover it?
3. What should we treat as a "significant change" (new paid features? push alerts?), and do we need a written policy?
4. Should we launch in Texas at all before the Fifth Circuit rules, or geo-limit the first release?
5. Does anything change our privacy policy or account sign-up (e.g., blocking under-13 accounts) beyond what the stores do?

## What we can build once counsel answers
A small native plugin that reads the store age signal, gates sign-up for under-13 Texas users if advised, asks for consent on significant changes, and handles withdrawal. Estimated a few days per platform.

Sources: texasdatalaw.com/tracker/sb-2420 · developer.apple.com/news/?id=2ezb6jhj · wiley.law alert on state app store acts · ccianet.org/litigation/ccia-v-paxton-w-d-tex
