"""Weekly search health check for www.capitolreceipts.com.

Checks the sitemaps, a random sample of pages from every sitemap (status, canonical, indexability, title,
heading, description), links on a sample of record pages, and the redirects, share images and llms.txt.
Prints a report (also written to $GITHUB_STEP_SUMMARY) and exits 1 if anything needs attention.
Usage: python scripts/seo_health.py [pages per sitemap, default 12]
"""
import concurrent.futures as cf, html, os, random, re, sys, time, urllib.error, urllib.request

SITE, APP = 'https://www.capitolreceipts.com', 'https://app.capitolreceipts.com'
PER = int(sys.argv[1]) if len(sys.argv) > 1 else 12
MIN_URLS = 150000  # the sitemaps should never shrink below this without a reason
UA = {'User-Agent': 'CapitolReceipts health check (https://www.capitolreceipts.com)'}
problems, notes = [], []

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k): return None
plain = urllib.request.build_opener(NoRedirect)

def fetch(url, follow=False):
    """(status, headers, body) without following redirects unless asked."""
    for attempt in range(3):
        try:
            op = urllib.request.build_opener() if follow else plain
            r = op.open(urllib.request.Request(url, headers=UA), timeout=60)
            return r.status, dict(r.headers), r.read()
        except urllib.error.HTTPError as e:
            if e.code >= 500 and attempt < 2: time.sleep(3); continue
            return e.code, dict(e.headers or {}), e.read() if e.fp else b''
        except Exception as e:
            if attempt < 2: time.sleep(3); continue
            return 0, {}, str(e).encode()

def locs(xml): return re.findall(r'<loc>([^<]+)</loc>', xml)

def check_page(url):
    st, h, b = fetch(url)
    if st != 200: return [f'{url} returned {st}' + (f' → {h.get("Location") or h.get("location")}' if st in (301, 302, 308) else '')]
    t = b.decode('utf-8', 'replace'); out = []
    g = lambda pat: (re.search(pat, t, re.S | re.I) or [None, None])[1]
    canon, robots, title, desc = g(r'<link rel="canonical" href="([^"]+)"'), g(r'<meta name="robots" content="([^"]+)"'), g(r'<title>(.*?)</title>'), g(r'<meta name="description" content="([^"]*)"')
    if robots and 'noindex' in robots: out.append(f'{url} is in the sitemap but marked noindex')
    if not canon: out.append(f'{url} has no canonical link')
    elif html.unescape(canon) != url: out.append(f'{url} canonical points elsewhere: {canon}')
    if not title or len(html.unescape(title)) < 10: out.append(f'{url} has a missing or very short title')
    if not desc or not (50 <= len(html.unescape(desc)) <= 170): out.append(f'{url} description length {len(desc or "")} (want 50–170)')
    if '<h1' not in t: out.append(f'{url} has no main heading')
    return out

def links_of(url):
    st, _, b = fetch(url)
    if st != 200: return []
    return [SITE + l for l in re.findall(r'href="(/[^"#?]*)"', b.decode('utf-8', 'replace')) if not l.startswith('//')]

def main():
    t0 = time.time()
    st, _, b = fetch(SITE + '/sitemap.xml')
    if st != 200: problems.append(f'sitemap index returned {st}'); return
    files = locs(b.decode())
    sample, total = [], 0
    def load(f):
        s, _, x = fetch(f); return f, s, (locs(x.decode('utf-8', 'replace')) if s == 200 else [])
    with cf.ThreadPoolExecutor(6) as ex:
        for f, s, urls in ex.map(load, files):
            if s != 200 or not urls: problems.append(f'sitemap {f} returned {s} with {len(urls)} addresses'); continue
            total += len(urls)
            n = len(urls) if re.search(r'/(site|hubs)\.xml$', f) else PER
            sample += random.sample(urls, min(n, len(urls)))
    notes.append(f'{len(files)} sitemap files, {total:,} addresses')
    if total < MIN_URLS: problems.append(f'sitemaps list only {total:,} addresses (expected at least {MIN_URLS:,})')
    sample = list(dict.fromkeys(sample))
    with cf.ThreadPoolExecutor(8) as ex:
        for issues in ex.map(check_page, sample): problems.extend(issues)
    notes.append(f'{len(sample)} pages checked')
    # links on a sample of record pages
    rec = [u for u in sample if re.search(r'/(member|bill|vote|pac|lobbying|state|race)/', u)][:20]
    with cf.ThreadPoolExecutor(8) as ex:
        found = list(dict.fromkeys(l for ls in ex.map(links_of, rec) for l in ls))
    picked = random.sample(found, min(150, len(found)))
    def link_ok(u):
        s, h, _ = fetch(u)
        return None if s in (200, 301, 302, 308) else f'broken link {u} returned {s}'
    with cf.ThreadPoolExecutor(8) as ex:
        problems.extend(x for x in ex.map(link_ok, picked) if x)
    notes.append(f'{len(picked)} internal links checked')
    # domain rules, share images, llms.txt
    s, h, _ = fetch(APP + '/member/P000197/nancy-pelosi')
    if s != 301 or not (h.get('Location') or h.get('location') or '').startswith(SITE): problems.append(f'app domain record address should redirect to www (got {s})')
    s, h, _ = fetch(APP + '/og/member/P000197.png')
    if s != 200 or 'image/png' not in (h.get('Content-Type') or h.get('content-type') or ''): problems.append(f'share image returned {s}')
    s, _, b = fetch(SITE + '/llms.txt')
    if s != 200 or b'# Capitol Receipts' not in b: problems.append(f'llms.txt returned {s}')
    s, _, b = fetch(SITE + '/robots.txt')
    if s != 200 or b'Sitemap: https://www.capitolreceipts.com/sitemap.xml' not in b or b'Disallow: /\n' in b: problems.append('robots.txt is missing the sitemap or blocks the site')
    s, _, _ = fetch(APP + '/')
    if s != 200: problems.append(f'app home returned {s}')
    notes.append(f'finished in {time.time() - t0:.0f}s')

if __name__ == '__main__':
    main()
    report = '## Search health check\n\n' + '\n'.join(f'- {n}' for n in notes) + '\n\n' + (
        f'### {len(problems)} problem{"s" if len(problems) != 1 else ""} found\n\n' + '\n'.join(f'- {p}' for p in problems[:200]) if problems else '### All checks passed\n')
    print(report)
    if os.environ.get('GITHUB_STEP_SUMMARY'): open(os.environ['GITHUB_STEP_SUMMARY'], 'a').write(report)
    open('seo_health_report.md', 'w').write(report)
    sys.exit(1 if problems else 0)
