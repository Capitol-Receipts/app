# Phases 2 and 4: monorepo and Next.js (branch phase-2-monorepo)

## What changed
| Before | After |
|---|---|
| `index.html`, `sw.js`, `app/`, `.well-known/` | `apps/web/public/` (unchanged files) |
| `api/*.js` (Vercel functions) | `apps/web/server/*.js` (unchanged; not `api/`, which Vercel would deploy as separate functions), served by Next.js API routes in `apps/web/pages/api/` |
| `vercel.json` | `apps/web/routes.json` (same content; Next.js reads it via `packages/config/next-routes.mjs`) |
| `middleware.js` | `apps/web/middleware.ts` |
| `site/` + `site/vercel.json` | `apps/site/public/` + `apps/site/routes.json` |
| `mobile/` | `apps/mobile/` (Capacitor, own npm lockfile until Phase 3) |
| `supabase/types.ts` | `packages/shared/src/database.ts` |
| — | `packages/shared` (types, URL helpers), `packages/api` (`createApi(client)`), `packages/ui-tokens`, `packages/config` |

pnpm workspace + Turborepo. Pipeline, scripts, supabase and data stay at the root.

## Every public URL is kept
No URL changes, so no 301s are needed beyond the ones that already existed (`/index.html`, `/*.html`, `/leaderboards`, `/method`, `/app`, `/site/*`, `/admin` on the app host). The Next config is generated from the old routes files, so every rewrite, redirect and header is the same rule.
- `tests/routes.test.mjs`: every old rewrite, redirect and header is present, and every page keeps its clean URL.
- `tests/urls/*.txt` + `scripts/smoke_urls.mjs`, run in CI: 241 sampled URLs (a few of every page type from the live sitemaps, Spanish pages, images, API, admin, edge cases) answer the same as production. Checked locally Nov 9, 2026: all match.

## Cutover (done Nov 9, 2026)
1. Vercel › capitol-receipts › Settings › General: Framework = Next.js, Root Directory = `apps/web`. Turn on "Include files outside the root directory".
2. Vercel › capitol-receipts-marketing › same, Root Directory = `apps/site`.
3. Tell Claude to merge. Check both production deploys, then the CI run.

Rollback: set Root Directory back to empty (web) and `site` (marketing) and revert the merge. Keep the old layout's last deploy for a day.

## Next steps (Phase 4 proper)
Pages move from static files to Next.js one at a time behind the same URLs: first the record pages now built by `api/seo.js` (server-rendered with `@supabase/ssr`), then the marketing pages, then the app screens. Each move keeps its URL and is covered by the URL check.

## Step 2: pages move from HTML strings to React (started Nov 10)

The record and directory pages used to be built as HTML text in `apps/web/server/_seo_*.js`. They move to React one type at a time, each only after its output matches the live page.

- Shared pieces: `components/seo/SeoPage.tsx` (header, head tags, footer, cite box), `lib/seo-model.js` (turns a page description into what the component prints), `lib/seo-ssp.js` (redirects, 404s, cache headers), `lib/shell-parts.js` (analytics, error and cookie scripts, read from `app-shell/*.js` so there is one copy), `lib/seo-chrome.js` (styles and links, also used by the old string pages).
- These pages leave out the client JavaScript (`unstable_runtimeJS: false`), so they stay as light as before.
- Moved: every record and directory page, English and Spanish, rankings and guides. They all render through `pages/seo-page.tsx` (reached by the rewrites in `routes.json`) and `pages/guides/`. Still on the old handler (`/api/seo`, now only text and data files): sitemaps, robots, llms files, the embed card and the pulse numbers.
- A new type needs only an entry in the router table in `server/_seo_types.js` and its name in the `routes.json` lists.
- The data builders (`_seo_*.js`) still return the page body as an HTML string; converting each body to JSX is the next layer, type by type.
- Redirects now answer 301 from the page code and 308 from `routes.json`; search engines treat them the same.

## Step 3: marketing pages are React pages (Nov 10)

The 14 www pages and the 404 page are now `apps/site/pages/*.tsx` (they were `public/*.html`). Same look, text and addresses: each was compared with the live page by screenshot at desktop and phone width, with the page text matching word for word. `/about.html` and the other old `.html` addresses redirect permanently to the clean address.

- Edit a page by editing its `.tsx` file. The styles still sit in each page's `<style>` block; `[style*="..."]` rules in them match the exact text React writes for style attributes (`padding:56px 44px`, no space after the colon), so keep that form if you add one.
- The pages leave out the client JavaScript, as before; `public/js/*.js` (live numbers, forms, quiz) still runs from plain script tags.
- After editing pages run `python3 scripts/site_sitemap.py`. Dates in `site.xml` come from git history.
- The old generators that wrote HTML into `apps/site/public` (`build_site.py`, `seo_site.py`, `app_soon.py`, `site_live.py` and friends) no longer apply; running them would create stray `.html` files.

## Step 4: the app's own page is React too (Nov 10)

`index.html` is gone. The app's page is `components/app/AppPage.tsx`, used by:

- `/` (`pages/index.tsx`): the front door with the boot message.
- `/go/<screen>` (`pages/go/[id].tsx`): app screens with no public page, with a title and share preview naming the screen.
- Record pages opened in the app (`?app=1` on the app domain): the same record page, plus the app, which replaces it once it starts (`lib/seo-ssp.js` passes `app`, `components/seo/Entry.tsx` picks the page).
- `/quizscore/<n>` (`pages/quizscore/[n].tsx`): shared quiz score preview; www reaches it through a rewrite.

The scripts that used to sit inside `index.html` are now plain files in `apps/web/app-shell/` (`main.js` starts the app and holds `APP_VER`; `posthog.js`, `gtag.js`, `errors.js`, `consent.js` and the rest). They run exactly as before; `lib/app-parts.js` reads them and the page prints them. The release version is read from `main.js`, so `scripts/bump_version.sh` changes it in one place and the style sheet links follow.

What did not move: the 34 app screens in `public/app/js/*.js`, the style sheets and `sw.js` are still plain scripts. They build their screens by hand in the browser (5,600 lines), and rewriting them as React components would change how the app behaves and looks, so each screen would need its own before-and-after check. If wanted, port them one at a time, starting with search and then profiles.

Deploy order: web first, then www (the quiz-score rewrite points at the new web page).
