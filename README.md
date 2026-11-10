# Capitol Receipts

Who's in Congress, who pays them, and how they vote. A nonpartisan app built on public records.

## How it fits together

- **App** (`apps/web/components/app`, `apps/web/app-shell`, `apps/web/public/app/`): a web app served by Vercel. It reads everything from Supabase with the public, read-only key.
- **Database** (Supabase): one table per kind of record (members, past members, bills, PACs, lobbying groups, committees, ethics statements, appointees, ZIP codes). Big collections keep a small `light` copy for lists and search and a `detail` copy that loads when a page opens.
- **Data files** (`data/export/*.jsonl.gz`): the current snapshot, one file per table.
- **Loader** (`scripts/load_supabase.py`, `.github/workflows/load-data.yml`): pushing new data files, or running the workflow by hand, upserts them into Supabase. It needs the `SUPABASE_SERVICE_ROLE_KEY` repository secret.
- **Pipeline** (`pipeline/`): the scripts that fetch and build the data from FEC, House and Senate disclosures, Voteview, GovInfo, the Senate lobbying database, OGE and other public sources. `scripts/export_db.py` turns their output into the data files.

## Local preview

Any static server works, for example `python3 -m http.server` in the repo root.

## Websites

- **www.capitolreceipts.com** — marketing site: plain HTML in `apps/site/public/`, served by Next.js from `apps/site` (Vercel project `capitol-receipts-marketing`, root directory `apps/site`). Record pages on www come from the app's server-rendered pages. After editing a marketing page, run `python3 scripts/site_sitemap.py` to refresh its sitemap date. Search rules: `docs/SEO-PLAYBOOK.md`; latest audit: `docs/SEO-REPORT.md`. Sign-up forms save to the Supabase `signups` table (insert only).
- **app.capitolreceipts.com** — the app (Vercel project `capitol-receipts`, root directory `apps/web`; static files in `apps/web/public/`, server code in `apps/web/server/`). Phones get the bottom tab bar; tablets get a wider column; desktops get a side menu and two columns (`apps/web/public/app/css/desktop.css`, `apps/web/public/app/js/desktop.js`).
- When releasing app changes, run `bash scripts/bump_version.sh` (it changes `APP_VER` in `apps/web/app-shell/main.js`; the CSS links follow) so visitors get the new files right away.
