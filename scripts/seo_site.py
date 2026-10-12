"""Search and sharing polish for the marketing site in site/ (www.capitolreceipts.com).

Run after build_site.py (it calls this automatically), or on its own: python3 scripts/seo_site.py
Safe to run more than once. For every page it sets a keyword-rich title and description, social share tags with
a share image, structured data (organization, site, breadcrumbs, FAQs, pricing), a single main heading, and
links into the app's record pages: an "Explore the records" section, plus in-text links wherever a page names a
member of Congress, a nominee or a bill. The 404 page is kept out of search results.
"""
import datetime, html, json, os, re, shutil, urllib.request

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SITE_DIR = os.path.join(ROOT, 'site')
SITE, APP = 'https://www.capitolreceipts.com', 'https://app.capitolreceipts.com'
SB = 'https://hxgckcriehvrolwnabpd.supabase.co/rest/v1/'
KEY = 'sb_publishable_jiwF5q1sFMuaGXLKg6FKAQ_3rCjcZ1J'  # public, read-only
IMG = f'{SITE}/img/share.png'

PAGES = {  # file -> (path, title, description, breadcrumb name)
    'index.html': ('/', 'Capitol Receipts: Who Funds Congress, Stock Trades & Votes',
                   'Who funds every member of Congress, what stocks they trade, how they vote and who lobbies them, explained in plain English. Free and nonpartisan.', None),
    'features.html': ('/features', 'Features: Track Congress Money, Stock Trades, Votes & Lobbying',
                      'See who funds any member of Congress, every stock trade they make, how they vote and who lobbies them, plus the appointees they confirm. Free and nonpartisan.', 'Features'),
    'receipts.html': ('/receipts', 'The Receipts: Biggest Stock Traders & Fundraisers in Congress',
                      'The biggest stock traders, top fundraisers, most-missed votes and most-lobbied bills in Congress, ranked from public records and updated daily.', 'The Receipts'),
    'parties.html': ('/parties', 'Democrats vs Republicans: Money, Stock Trades & Votes Compared',
                     'Democrats and Republicans side by side: money raised, small-donor share, stock trades per member, attendance and party-line voting, from public records.', 'Red vs Blue'),
    'appointees.html': ('/appointees', 'Presidential Appointees: Finances, Ethics Waivers & Senate Votes',
                        'Cabinet members, agency heads and ambassadors: who they are, what they own, the ethics waivers they got and how the Senate voted to confirm them.', 'Appointees'),
    'quiz.html': ('/quiz', 'Congress Quiz: Guess the Receipt on Trades, Money & Votes',
                  'Who trades the most stock in Congress? Who raised the most money? Test yourself with questions built from real public records, then see the receipt.', 'Quiz'),
    'how-it-works.html': ('/how-it-works', 'How It Works: Where Capitol Receipts Data Comes From',
                          'Every number comes from public records: FEC filings, House and Senate disclosures, Voteview votes and lobbying reports. Here is how we count.', 'How it works'),
    'newsrooms.html': ('/newsrooms', 'Congress Data for Newsrooms, Reporters & Researchers',
                       'Congress data for reporters, researchers and watchdogs: campaign money, stock trades, votes, lobbying and appointees, with a source for every number.', 'Newsrooms'),
    'pricing.html': ('/pricing', 'Pricing: Free, or Pro for $0.99 a Month | Capitol Receipts',
                     'Free: every profile, party page and comparison. Pro adds instant alerts and full trade and donor histories for $0.99 a month. Newsroom plans too.', 'Pricing'),
}
EXPLORE = [('/this-week', 'This week in Congress'), ('/members', 'Every member of Congress'), ('/states', 'Find your state'), ('/bills', 'Bills since 1947'), ('/votes', 'Every vote since 1789'),
           ('/pacs', 'PACs and who they fund'), ('/lobbying', 'Who lobbies Congress'), ('/elections', '2026 House and Senate races'), ('/companies', 'Companies members trade'),
           ('/committees', 'Committees'), ('/appointees/all', 'Appointees and nominees'), ('/judges', 'Federal judges'), ('/past-members', 'Past members since 1789'), ('/es/members', 'En español')]
ORG = {'@context': 'https://schema.org', '@type': 'Organization', '@id': f'{SITE}/#org', 'name': 'Capitol Receipts', 'url': SITE + '/',
       'logo': f'{SITE}/favicon.svg', 'description': 'A nonpartisan app that shows who funds Congress, what members trade, how they vote and who lobbies them, from public records.',
       'email': 'corrections@capitolreceipts.com'}

def get(path):
    req = urllib.request.Request(SB + path, headers={'apikey': KEY, 'Accept': 'application/json'})
    return json.loads(urllib.request.urlopen(req, timeout=60).read())

def slug(s):
    import unicodedata
    s = unicodedata.normalize('NFKD', str(s or '')).encode('ascii', 'ignore').decode().lower().replace('&', ' and ').replace("'", '')
    return '-'.join([w for w in re.split(r'[^a-z0-9]+', s) if w][:9])[:70].rstrip('-')

def link_targets():
    """(pattern, app page) for each name worth linking. Members match by last name plus their first name or a short
    form of it (Gil/Gilbert, Rob/Robert, Bernie/Bernard), with an optional middle initial."""
    out = []
    for m in get('members?select=id,name,data->>first,data->>last'):
        first, last = (m['first'] or '').strip(), (m['last'] or '').strip()
        if not first or not last: continue
        fp = re.escape(first) if len(first) <= 3 else f"(?:{re.escape(first)}|{re.escape(first[:3])}[a-z]*)"
        out.append((rf"{fp}(?: [A-Z]\.)? {re.escape(last)}", f"/member/{m['id']}/{slug(m['name'])}"))
    for n in get('nominations?select=id,name'):
        out.append((re.escape(n['name']), f"/nominee/{n['id']}/{slug(n['name'])}"))
    out.append((re.escape('One Big Beautiful Bill Act'), '/bill/119-hr-1/one-big-beautiful-bill-act'))
    return [(re.compile(r'(?<![\w-])' + pat + r'(?![\w-])'), u) for pat, u in out]

SKIP = {'a', 'button', 'script', 'style', 'title', 'label', 'option', 'textarea', 'svg', 'h1', 'h2', 'h3', 'head', 'select', 'summary'}

def autolink(doc, targets):
    """Link the first mention of each name in the page's visible text (never inside links, buttons or headings)."""
    parts = re.split(r'(<[^>]+>)', doc)
    depth, done, out = {}, set(), []
    for part in parts:
        if part.startswith('<'):
            m = re.match(r'<(/?)([a-zA-Z0-9]+)', part)
            if m and m.group(2).lower() in SKIP and not part.endswith('/>'):
                depth[m.group(2).lower()] = max(0, depth.get(m.group(2).lower(), 0) + (-1 if m.group(1) else 1))
            out.append(part); continue
        if any(depth.values()) or not part.strip():
            out.append(part); continue
        for rx, u in targets:
            if u in done: continue
            mm = rx.search(part)
            if mm:
                done.add(u)
                part = part[:mm.start()] + f'<a class="rlink" href="{u}">{mm.group(0)}</a>' + part[mm.end():]
        out.append(part)
    return ''.join(out), len(done)

def set_meta(doc, attr, key, value):
    tag = f'<meta {attr}="{key}" content="{html.escape(value, quote=True)}">'
    rx = re.compile(rf'<meta {attr}="{re.escape(key)}"[^>]*>')
    return rx.sub(lambda m: tag, doc, count=1) if rx.search(doc) else doc.replace('</head>', tag + '\n</head>', 1)

def faqs(doc):
    qa = re.findall(r'<summary[^>]*>(.*?)</summary>(.*?)</details>', doc, re.S)
    clean = lambda s: re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', s))).strip()
    return [{'@type': 'Question', 'name': clean(q), 'acceptedAnswer': {'@type': 'Answer', 'text': clean(a)}} for q, a in qa if clean(q) and clean(a)]

def main():
    shutil.copy(os.path.join(ROOT, 'scripts', 'assets', 'share.png'), os.path.join(SITE_DIR, 'img', 'share.png'))
    # IndexNow key (scripts/indexnow.py), served at the site root
    for f in os.listdir(os.path.join(ROOT, 'scripts', 'assets')):
        if re.fullmatch(r'[0-9a-f]{32}\.txt', f): shutil.copy(os.path.join(ROOT, 'scripts', 'assets', f), os.path.join(SITE_DIR, f))
    targets = link_targets()
    for fname, (path, title, desc, crumb) in PAGES.items():
        p = os.path.join(SITE_DIR, fname); doc = open(p, encoding='utf-8').read()
        url = SITE + path
        doc = re.sub(r'<title>.*?</title>', f'<title>{html.escape(title)}</title>', doc, count=1, flags=re.S)
        doc = set_meta(doc, 'name', 'description', desc)
        doc = set_meta(doc, 'name', 'robots', 'index,follow,max-image-preview:large')
        for k, v in [('og:title', title), ('og:description', desc), ('og:url', url), ('og:image', IMG), ('og:image:width', '1200'), ('og:image:height', '630'),
                     ('og:image:alt', 'Capitol Receipts: who funds Congress, what they trade, how they vote')]:
            doc = set_meta(doc, 'property', k, v)
        for k, v in [('twitter:card', 'summary_large_image'), ('twitter:title', title), ('twitter:description', desc), ('twitter:image', IMG)]:
            doc = set_meta(doc, 'name', k, v)
        # structured data
        ld = [ORG]
        if path == '/':
            ld.append({'@context': 'https://schema.org', '@type': 'WebSite', 'name': 'Capitol Receipts', 'url': SITE + '/', 'publisher': {'@id': f'{SITE}/#org'}})
            ld.append({'@context': 'https://schema.org', '@type': 'WebApplication', 'name': 'Capitol Receipts', 'url': APP + '/', 'applicationCategory': 'ReferenceApplication',
                       'operatingSystem': 'Any', 'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'USD'}, 'publisher': {'@id': f'{SITE}/#org'}})
        else:
            ld.append({'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
                {'@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': SITE + '/'}, {'@type': 'ListItem', 'position': 2, 'name': crumb, 'item': url}]})
        if path == '/pricing':
            ld.append({'@context': 'https://schema.org', '@type': 'Product', 'name': 'Capitol Receipts Pro', 'description': 'Instant alerts and full trade and donor histories for members of Congress.',
                       'brand': {'@id': f'{SITE}/#org'}, 'offers': [{'@type': 'Offer', 'name': 'Free', 'price': '0', 'priceCurrency': 'USD', 'url': url},
                       {'@type': 'Offer', 'name': 'Pro', 'price': '0.99', 'priceCurrency': 'USD', 'url': url,
                        'priceSpecification': {'@type': 'UnitPriceSpecification', 'price': '0.99', 'priceCurrency': 'USD', 'unitCode': 'MON'}}]})
        fq = faqs(doc) if path in ('/how-it-works', '/pricing') else []
        if fq: ld.append({'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': fq})
        doc = re.sub(r'<script type="application/ld\+json" data-seo>.*?</script>\n?', '', doc, flags=re.S)
        doc = doc.replace('</head>', ''.join(f'<script type="application/ld+json" data-seo>{json.dumps(x, ensure_ascii=False).replace("</", "<\\/")}</script>\n' for x in ld) + '</head>', 1)
        # one main heading on every page
        if path == '/parties' and '<h1' not in doc:
            doc = doc.replace('<span class="disp" style="font-size: 30px">Red vs Blue: the tale of the tape.</span>',
                              '<h1 class="disp" style="font-size: 30px; margin: 0; display: inline">Red vs Blue: the tale of the tape.</h1>', 1)
        # in-text links to record pages, then an "Explore the records" section above the footer
        if 'data-seo-explore' not in doc:
            doc, n = autolink(doc, targets)
            band = ('<section data-seo-explore style="background:#f3f5f8;padding:44px 24px"><div style="max-width:1240px;margin:0 auto">'
                    '<h2 class="disp" style="margin:0 0 6px;font-size:40px;color:#14274e">Look it up</h2>'
                    '<p style="margin:0 0 18px;color:#5b6069">Every record in Capitol Receipts has its own page.</p>'
                    '<ul style="list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px 24px">' +
                    ''.join(f'<li><a href="{h}" style="font-weight:600;text-decoration:none">{html.escape(t)}&nbsp;›</a></li>' for h, t in EXPLORE) +
                    '</ul></div></section>\n')
            doc = doc.replace('<footer', band + '<footer', 1)
            if '.rlink{' not in doc:
                doc = doc.replace('</style>', '.rlink{color:inherit;text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:2px}.rlink:hover{color:#c8323a}\n</style>', 1)
            print(f'{fname}: {n} in-text links')
        open(p, 'w', encoding='utf-8').write(doc)

    # 404: same look as home, but never indexed
    p = os.path.join(SITE_DIR, '404.html'); doc = open(os.path.join(SITE_DIR, 'index.html'), encoding='utf-8').read()
    doc = re.sub(r'<title>.*?</title>', '<title>Page not found | Capitol Receipts</title>', doc, count=1, flags=re.S)
    doc = re.sub(r'<link rel="canonical"[^>]*>\n?', '', doc)
    doc = re.sub(r'<meta property="og:url"[^>]*>\n?', '', doc)
    doc = re.sub(r'<script type="application/ld\+json" data-seo>.*?</script>\n?', '', doc, flags=re.S)
    doc = set_meta(doc, 'name', 'robots', 'noindex')
    open(p, 'w', encoding='utf-8').write(doc)

    today = datetime.date.today().isoformat()
    os.makedirs(os.path.join(SITE_DIR, 'sitemaps'), exist_ok=True)
    if os.path.exists(os.path.join(SITE_DIR, 'sitemap.xml')): os.remove(os.path.join(SITE_DIR, 'sitemap.xml'))
    open(os.path.join(SITE_DIR, 'sitemaps', 'site.xml'), 'w').write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        ''.join(f'  <url><loc>{SITE}{path}</loc><lastmod>{today}</lastmod></url>\n' for path, *_ in PAGES.values()) + '</urlset>\n')
    open(os.path.join(SITE_DIR, 'robots.txt'), 'w').write(f'User-agent: *\nAllow: /\nSitemap: {SITE}/sitemap.xml\n')
    print('marketing pages updated:', len(PAGES), '+ 404, sitemap, robots')

if __name__ == '__main__':
    main()
