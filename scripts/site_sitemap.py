"""Writes apps/site/public/sitemaps/site.xml: every indexable marketing page (apps/site/pages/*.tsx), with the date its content last changed.

The date comes from git history (the last commit that changed the file's content, ignoring pure renames), or today
for a page with uncommitted edits. Pages with a noindex robots tag are left out. Run after editing marketing pages:
  python3 scripts/site_sitemap.py
"""
import datetime, os, re, subprocess

ROOT = os.path.join(os.path.dirname(__file__), '..')
PUB = os.path.join(ROOT, 'apps', 'site', 'public')
PAGES = os.path.join(ROOT, 'apps', 'site', 'pages')
SITE = 'https://www.capitolreceipts.com'
ORDER = ['index', 'features', 'receipts', 'parties', 'appointees', 'quiz', 'how-it-works', 'newsrooms', 'pricing',
         'about', 'support', 'privacy', 'terms', 'delete-account']


def changed(path):
    rel = os.path.relpath(path, ROOT)
    if subprocess.run(['git', '-C', ROOT, 'diff', '--quiet', 'HEAD', '--', rel]).returncode:
        return datetime.date.today().isoformat()
    log = subprocess.run(['git', '-C', ROOT, 'log', '--follow', '-M', '--format=@%ad', '--date=short', '--name-status', '--', rel],
                         capture_output=True, text=True).stdout.splitlines()
    day = None
    for line in log:
        if line.startswith('@'): day = line[1:]
        elif line.startswith('R100'): continue
        elif line and line[0] in 'AMR' and day: return day
    return day


def main():
    pages = [f[:-4] for f in os.listdir(PAGES) if f.endswith('.tsx') and f not in ('404.tsx', '_document.tsx')]
    pages.sort(key=lambda p: (ORDER.index(p) if p in ORDER else len(ORDER), p))
    rows = []
    for p in pages:
        f = os.path.join(PAGES, p + '.tsx')
        if re.search(r'<meta\s+key="[^"]*"\s+name="robots"\s+content="[^"]*noindex', open(f, encoding='utf-8').read(), re.I):
            continue
        d = changed(f)
        rows.append(f'  <url><loc>{SITE}/{"" if p == "index" else p}</loc>{f"<lastmod>{d}</lastmod>" if d else ""}</url>')
    out = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + '\n'.join(rows) + '\n</urlset>\n'
    open(os.path.join(PUB, 'sitemaps', 'site.xml'), 'w', encoding='utf-8').write(out)
    print(f'{len(rows)} pages written to apps/site/public/sitemaps/site.xml')


if __name__ == '__main__':
    main()
