# Phases 2 and 4: monorepo and Next.js (branch phase-2-monorepo)

## What changed
| Before | After |
|---|---|
| `index.html`, `admin.html`, `sw.js`, `app/`, `.well-known/` | `apps/web/public/` (unchanged files) |
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
