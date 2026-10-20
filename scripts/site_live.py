"""Marketing-site extras, applied to the built pages in site/ (idempotent; run after build_site.py, or on its own to refresh numbers).

- Live numbers: adds [data-live] / [data-live-block] spots to the home, Receipts, Red vs Blue and Quiz pages and fills
  them from /pulse.json (api/_seo_pulse.js). site/js/live.js refreshes them in the browser.
- "Common questions" on the home, Features and Newsrooms pages, with FAQPage structured data.
- "Cite us" block on Newsrooms.
- Tap-to-answer quiz with a shareable score (site/js/quiz.js, /quiz/score/N).
- About page (site/about.html), linked from every footer and listed in the site sitemap.

Usage: python3 scripts/site_live.py [pulse.json path or URL]   (default: https://www.capitolreceipts.com/pulse.json)
"""
import html, json, os, re, sys, urllib.request

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
S = os.path.join(ROOT, 'site')
SITE = 'https://www.capitolreceipts.com'
src = sys.argv[1] if len(sys.argv) > 1 else SITE + '/pulse.json'
try:
    pulse = json.load(open(src)) if os.path.exists(src) else json.loads(urllib.request.urlopen(src, timeout=60).read())
except Exception as e:
    print('no live numbers this run:', e); pulse = {'nums': {}, 'blocks': {}}
NUMS, BLOCKS = pulse.get('nums', {}), pulse.get('blocks', {})

def rd(f): return open(os.path.join(S, f), encoding='utf-8').read()
def wr(f, s): open(os.path.join(S, f), 'w', encoding='utf-8').write(s)
def block(name, attrs=''):
    return f'<div data-live-block="{name}"{attrs}>{BLOCKS.get(name, "")}</div><!--/{name}-->'
def fill(s):
    s = re.sub(r'(<div data-live-block="([\w-]+)"[^>]*>)(.*?)(</div><!--/\2-->)', lambda m: m.group(1) + (BLOCKS.get(m.group(2)) or m.group(3)) + m.group(4), s, flags=re.S)
    s = re.sub(r'(<(span|div)[^>]*data-live="([\w-]+)"[^>]*>)([^<]*)(</\2>)', lambda m: m.group(1) + html.escape(NUMS.get(m.group(3)) or html.unescape(m.group(4)), quote=False) + m.group(5), s)
    return s
def script(s, name):
    tag = f'<script src="/js/{name}" defer></script>'
    return s if tag in s else s.replace('</body>', tag + '\n</body>', 1)
def section_before(s, marker, new):
    """Insert `new` right before the <section> that contains `marker`."""
    i = s.find(marker)
    if i < 0: return s
    j = s.rfind('<section', 0, i)
    return s[:j] + new + s[j:]

# ---------- FAQ ----------
FAQ_CSS = '<style data-faq-css>.cr-faq details{border-bottom:1px solid #dfe3ec;padding:18px 0}.cr-faq summary{cursor:pointer;font-weight:700;font-size:19px;color:#14274e}.cr-faq details p{margin:10px 0 0;color:#3d4452;font-size:17px;line-height:1.55}</style>'
def faq(s, qa, title='Common questions'):
    s = re.sub(r'<section data-faq.*?</section>\n', '', s, flags=re.S)
    s = re.sub(r'<script type="application/ld\+json" data-faq-ld>.*?</script>\n', '', s, flags=re.S)
    if 'data-faq-css' not in s: s = s.replace('</head>', FAQ_CSS + '\n</head>', 1)
    sec = ('<section data-faq class="cr-faq" style="background: #f4f6fb; padding: 96px 24px">\n <div style="max-width: 900px; margin: 0 auto; display: flex; flex-direction: column; gap: 10px">\n'
           f'  <h2 class="disp sec-h" style="margin: 0 0 20px; font-size: 64px; color: #14274e">{title}</h2>\n' +
           ''.join(f'  <details{" open" if i == 0 else ""}><summary>{html.escape(q)}</summary><p>{a}</p></details>\n' for i, (q, a) in enumerate(qa)) + ' </div>\n</section>\n')
    s = s.replace('<section data-seo-explore', sec + '<section data-seo-explore', 1)
    clean = lambda x: re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', '', x))).strip()
    ld = {'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [{'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': clean(a)}} for q, a in qa]}
    return s.replace('</head>', f'<script type="application/ld+json" data-faq-ld>{json.dumps(ld, ensure_ascii=False)}</script>\n</head>', 1)

A = lambda h, t: f'<a class="rlink" href="{h}">{t}</a>'
HOME_FAQ = [
    ('What is Capitol Receipts?', 'A free website and app that shows who funds each member of Congress, what stocks they trade, how they vote and who lobbies them. Every number comes from public records.'),
    ('Is it free?', f'Yes. Every record is free to look up. {A("/pricing", "Pro")} adds daily alerts, a stock watchlist, the conflict radar and CSV downloads for $4.99 a month or $39 a year.'),
    ('Where does the data come from?', f'Federal Election Commission filings, House and Senate stock trade reports, Voteview roll call records, the Senate lobbying database and Office of Government Ethics reports. {A("/how-it-works", "See how we count")}.'),
    ('How often is it updated?', 'Every day. New trade reports, campaign filings and votes show up within a day of being posted.'),
    ('Is it biased toward one party?', 'No. Both parties appear on every list and every member is measured the same way. We take no money from parties, campaigns, PACs or lobbyists.'),
    ('How do I find my representative?', f'Open {A("/states", "your state")} to see your two senators and your House member, or search by name in the app.'),
]
FEATURES_FAQ = [
    ('Can I get an alert when a member trades stock?', 'Yes. With Pro, you get an email when a member you follow files a new trade report.'),
    ('Does it cover both the House and the Senate?', f'Yes. Every current senator and representative, plus {A("/past-members", "every past member since 1789")}.'),
    ('Can I see stock trades by the President and cabinet?', f'Yes. {A("/official-trades", "Officials’ stock trades")} lists every OGE Form 278-T report posted since January 2025.'),
    ('Does it work on my phone?', 'Yes. It works in any phone browser, and you can add it to your home screen. iPhone and Android apps are coming soon.'),
    ('Can I download the data?', 'Pro includes CSV downloads of trades, money and votes. Newsroom plans add bulk access for teams.'),
    ('Is it available in Spanish?', f'Member, state, district, election and stock pages are available in Spanish. {A("/es/members", "Ver en español")}.'),
]
NEWS_FAQ = [
    ('Can I cite Capitol Receipts in a story?', 'Yes. Link to the specific page you used. Every page has a stable address and a ready-made citation line at the bottom.'),
    ('Can I check the original filing?', 'Yes. Member pages link to the original House and Senate reports, FEC filings and roll call votes behind each number.'),
    ('Can I embed a member’s card on our site?', 'Yes. Every member page has embed code for a small card that stays up to date.'),
    ('How current is the data?', 'It updates daily. Each page shows the date of the latest filing it uses.'),
    ('How do corrections work?', 'Email <a class="rlink" href="mailto:corrections@capitolreceipts.com">corrections@capitolreceipts.com</a> with a link to the record. We fix confirmed errors and note each correction.'),
    ('How do we get a trial?', f'Fill in the {A("#contact", "form on this page")} and we’ll set up a free trial for your team.'),
]

CITE = ('<section data-cite style="padding: 96px 24px">\n <div style="max-width: 1100px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 40px; align-items: start">\n'
        '  <div style="display: flex; flex-direction: column; gap: 14px"><span class="disp" style="font-size: 22px; color: #c8323a">For your story</span>'
        '<h2 class="disp sec-h" style="margin: 0; font-size: 64px; color: #14274e">Cite Capitol Receipts</h2>'
        '<p style="margin: 0; font-size: 19px; color: #3d4452">Link to the page you used. Each one has a permanent address, the date of the data and links to the original filings.</p>'
        '<p style="margin: 0; font-size: 17px; color: #3d4452">Corrections: <a class="rlink" href="mailto:corrections@capitolreceipts.com">corrections@capitolreceipts.com</a><br>Everything else: <a class="rlink" href="mailto:admin@squaredawaylabs.com">admin@squaredawaylabs.com</a></p></div>\n'
        '  <div style="display: flex; flex-direction: column; gap: 14px">'
        '<div class="mono" style="background: #0e1116; color: #dfe6f5; border-radius: 16px; padding: 20px 22px; font-size: 14px; line-height: 1.6"><div style="color: #ff6b6b; font-weight: 600">SUGGESTED CREDIT</div>Source: Capitol Receipts analysis of House and Senate financial disclosures, FEC filings and Voteview roll call records.</div>'
        '<div class="mono" style="background: #0e1116; color: #dfe6f5; border-radius: 16px; padding: 20px 22px; font-size: 14px; line-height: 1.6"><div style="color: #ff6b6b; font-weight: 600">PAGE CITATION</div>Capitol Receipts, “Nancy Pelosi (D-CA-11): Donors, Stock Trades &amp; Votes,” https://www.capitolreceipts.com/member/P000197/nancy-pelosi (accessed [date]).</div>'
        '<div class="mono" style="background: #0e1116; color: #dfe6f5; border-radius: 16px; padding: 20px 22px; font-size: 14px; line-height: 1.6; overflow-wrap: anywhere"><div style="color: #ff6b6b; font-weight: 600">EMBED A MEMBER CARD</div>&lt;iframe src="https://app.capitolreceipts.com/embed/member/P000197" width="420" height="320" style="border:0;max-width:100%" loading="lazy"&gt;&lt;/iframe&gt;</div>'
        '</div>\n </div>\n</section>\n')

QUIZ_BOX = ('<div id="quiz-score" hidden style="max-width: 1240px; margin: 32px auto 0; background: #14274e; color: #ffffff; border-radius: 28px; padding: 32px 36px; display: flex; flex-wrap: wrap; gap: 18px 28px; align-items: center; justify-content: space-between">'
            '<div><div style="font-weight: 800; letter-spacing: .1em; text-transform: uppercase; font-size: 14px; color: #cfdcf5">Your score</div><div class="disp" data-score style="font-size: 72px; line-height: 1">0 of 9</div></div>'
            '<div style="display: flex; flex-wrap: wrap; gap: 10px">'
            '<button type="button" data-share style="background: #ffffff; color: #14274e; border: 0; font: inherit; font-weight: 800; padding: 14px 22px; border-radius: 14px; cursor: pointer">Share my score</button>'
            '<a data-x href="#" target="_blank" rel="noopener" style="color: #ffffff; text-decoration: none; font-weight: 700; padding: 13px 20px; border-radius: 14px; box-shadow: inset 0 0 0 2px #ffffff">Post on X</a>'
            '<a data-fb href="#" target="_blank" rel="noopener" style="color: #ffffff; text-decoration: none; font-weight: 700; padding: 13px 20px; border-radius: 14px; box-shadow: inset 0 0 0 2px #ffffff">Facebook</a>'
            '</div></div>')

def footer_about(s):
    if 'href="/about" style="color: #c9d1e3' in s: return s
    return s.replace('<a href="/pricing" style="color: #c9d1e3; text-decoration: none">Pricing</a>',
                     '<a href="/about" style="color: #c9d1e3; text-decoration: none">About</a>\n   <a href="/pricing" style="color: #c9d1e3; text-decoration: none">Pricing</a>', 1)

# ---------- pages ----------
def home(s):
    if 'data-live-block="home-stats"' not in s:
        sec = ('<section data-live-sec style="padding: 72px 24px 0">\n <div style="max-width: 1240px; margin: 0 auto">\n'
               '  <h2 class="disp sec-h" style="margin: 0 0 22px; font-size: 56px; color: #14274e">The latest from the filings</h2>\n  ' + block('home-stats') + '\n </div>\n</section>\n')
        s = s.replace('<section style="padding: 104px 24px; background: #f4f6fb">', sec + '<section style="padding: 104px 24px; background: #f4f6fb">', 1)
    if 'data-live-block="home-week"' not in s:
        sec = ('<section data-live-sec style="padding: 96px 24px 0">\n <div style="max-width: 1240px; margin: 0 auto">\n'
               '  <span class="disp" style="font-size: 22px; color: #c8323a">Updated daily</span>\n'
               '  <h2 class="disp sec-h" style="margin: 4px 0 22px; font-size: 64px; color: #14274e">Biggest trades in the last 30 days</h2>\n  ' + block('home-week') + '\n </div>\n</section>\n')
        s = section_before(s, 'Standouts from the filings', sec)
    s = re.sub(r'All (?:<span data-live="trades">)?([\d,]+)(?:</span>)? stock trades\.', r'All <span data-live="trades">\1</span> stock trades.', s)
    return faq(s, HOME_FAQ)

def receipts(s):
    for label, key in [('Most trades', 'top-trades'), ('Most votes missed', 'top-missed'), ('Biggest haul', 'top-raised')]:
        s = re.sub(rf'(<span>{label}</span>)<span>([^<]*)</span>', rf'\1<span data-live="{key}">\2</span>', s)
    if 'data-live-block="board-trades"' not in s:
        s = re.sub(r'(Most stock trades</h2>\n)(.*?)(\n  </div>\n  <div style="display: flex; justify-content: center)',
                   lambda m: m.group(1) + '   ' + block('board-trades', ' style="display: flex; flex-direction: column; gap: 10px"') + m.group(3), s, count=1, flags=re.S)
    if 'data-live-block="board-missed"' not in s:
        s = re.sub(r'(Most votes missed</h3>\n)(.*?)(\n  </div>)',
                   lambda m: m.group(1) + '   ' + block('board-missed', ' style="display: flex; flex-direction: column; gap: 8px"') + m.group(3), s, count=1, flags=re.S)
    if 'data-live-block="fund-top"' not in s:
        s = re.sub(r'<div style="background: rgba\(255,255,255,\.12\); border-radius: 24px; padding: 26px">((?:(?!</p></div>).)*Biggest fundraiser in Congress.*?</p>)</div>',
                   lambda m: block('fund-top', ' style="background: rgba(255,255,255,.12); border-radius: 24px; padding: 26px"'), s, count=1, flags=re.S)
    return s

def parties(s):
    if 'data-live-block="party-avg"' not in s:
        i = s.find('<div class="card" style="display: grid; grid-template-columns: 1fr 200px 1fr')
        j = s.find('Average age')
        if i > 0 and j > i:
            k = s.rfind('<div class="card"', 0, j)
            s = s[:i] + block('party-avg', ' style="display: flex; flex-direction: column; gap: 14px"') + '\n  ' + s[k:]
    return s

def quiz(s):
    if 'data-quiz-q' not in s:
        n = [0]
        def card(m):
            c = m.group(0); n[0] += 1
            ans = re.search(r'ANSWER: ([^<]*)', c).group(1).lower()
            c = c.replace('<div class="card"', f'<div data-quiz-q="{n[0]}" class="card"', 1)
            def opt(o):
                t = re.sub(r'<[^>]+>', '', o.group(2)).strip().lower()
                return f'<span data-quiz-opt{" data-ok" if t and t in ans else ""}{o.group(1)}>{o.group(2)}</span>'
            return re.sub(r'<span( style="border: 2px solid #dfe3ec[^"]*")>(.*?)</span>', opt, c)
        s = re.sub(r'<div class="card"[^>]*>.*?</details>\s*</div>', card, s, flags=re.S)
        s = s.replace("Every answer comes from public records.</p>", "Every answer comes from public records. Tap an answer to check it, then share your score.</p>", 1)
        i = s.find('data-quiz-q="9"'); j = s.find('</section>', i)
        s = s[:j] + QUIZ_BOX + '\n' + s[j:]
    # receipts that refresh while the answer still holds
    for q, start in [('q1', 'ANSWER: GIL CISNEROS'), ('q3', 'ANSWER: SEN. JON OSSOFF'), ('q7', 'ANSWER: FREDERICA WILSON')]:
        s = re.sub(rf'({re.escape(start)}[^<]*</div><div style="margin-top: 6px; color: #dfe6f5")>', rf'\1 data-live="{q}">', s, count=1)
    s = re.sub(r'Only (?:<span data-live="traders">)?(\d+)(?:</span>)? of (?:<span data-live="members">)?(\d+)(?:</span>)? did',
               r'Only <span data-live="traders">\1</span> of <span data-live="members">\2</span> did', s)
    return script(s, 'quiz.js')

def about():
    s = rd('privacy.html')
    title, desc = 'About Capitol Receipts: Who We Are and How We Work', 'Capitol Receipts is a nonpartisan site from Squared Away Labs LLC that tracks money, stock trades, votes and lobbying in Congress using public records, updated daily.'
    s = re.sub(r'<title>.*?</title>', f'<title>{title} | Capitol Receipts</title>', s, count=1, flags=re.S)
    s = re.sub(r'(<meta (?:name|property)="(?:description|og:description|twitter:description)" content=")[^"]*', lambda m: m.group(1) + desc, s)
    s = re.sub(r'(<meta (?:property|name)="(?:og:title|twitter:title)" content=")[^"]*', lambda m: m.group(1) + title, s)
    s = s.replace(f'{SITE}/privacy"', f'{SITE}/about"')
    s = re.sub(r'<script type="application/ld\+json" data-seo>(?!\{"@context": "https://schema.org", "@type": "Organization").*?</script>\n?', '', s, flags=re.S)
    ld = [{'@context': 'https://schema.org', '@type': 'AboutPage', 'name': title, 'url': SITE + '/about', 'description': desc, 'about': {'@id': SITE + '/#org'},
           'mainEntity': {'@type': 'Organization', '@id': SITE + '/#org', 'name': 'Capitol Receipts', 'url': SITE + '/', 'email': 'admin@squaredawaylabs.com',
                          'parentOrganization': {'@type': 'Organization', 'name': 'Squared Away Labs LLC', 'url': 'https://www.squaredawaylabs.com', 'address': {'@type': 'PostalAddress', 'addressLocality': 'Wilkes-Barre', 'addressRegion': 'PA', 'addressCountry': 'US'}}}},
          {'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [{'@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': SITE + '/'}, {'@type': 'ListItem', 'position': 2, 'name': 'About', 'item': SITE + '/about'}]}]
    s = s.replace('</head>', ''.join(f'<script type="application/ld+json" data-seo>{json.dumps(x, ensure_ascii=False)}</script>\n' for x in ld) + '</head>', 1)
    H = lambda t: f'<h2 style="font-size:22px;margin:40px 0 10px;letter-spacing:-.01em">{t}</h2>'
    Pp = lambda t: f'<p style="margin:0;color:#2a3140;font-size:18px;line-height:1.6">{t}</p>'
    a = lambda h, t: f'<a href="{h}">{t}</a>'
    n = NUMS
    body = ('<main style="max-width:760px;margin:0 auto;padding:64px 24px 96px">\n<h1 class="disp" style="font-size:64px;margin:0;color:#14274e">About Capitol Receipts</h1>\n'
        + Pp('Capitol Receipts shows who funds every member of Congress, what stocks they trade, how they vote and who lobbies them, in plain English. It’s free to use and built entirely from public records.').replace('margin:0', 'margin:18px 0 0') + '\n'
        + H('Who we are') + Pp(f'Capitol Receipts is made by {a("https://www.squaredawaylabs.com", "Squared Away Labs LLC")}, a small independent software studio based in Wilkes-Barre, Pennsylvania. We build and run the site, the app and the daily data updates ourselves.') + '\n'
        + H('Why we built it') + Pp('The records that show how Congress is paid, how it trades and how it votes are public, but they are spread across a dozen government sites in formats few people have time to read. We put them in one place, match them to each member and write them up so anyone can check their own representatives in a minute.') + '\n'
        + H('Nonpartisan by design') + Pp('Both parties appear on every list, and every member is measured the same way. We don’t endorse candidates or tell you what to think of a number. A high number doesn’t mean someone broke a rule: trading stock is legal, and missing a vote can have good reasons. We show the record so you can decide what to ask.') + '\n'
        + H('How we’re funded') + Pp(f'By subscribers to {a("/pricing", "Pro")} and by {a("/newsrooms", "newsroom plans")}. We take no money from parties, campaigns, PACs or lobbyists, and we don’t sell your data. See our {a("/privacy", "privacy policy")}.') + '\n'
        + H('Where the data comes from') + Pp('The Federal Election Commission (campaign money), the House Clerk and the Secretary of the Senate (stock trades and financial disclosures), Voteview (every roll call vote since 1789), the Senate Lobbying Disclosure Act database (lobbying), the Office of Government Ethics (trades and finances of the President and Senate-confirmed officials), GovInfo and the Congressional Research Service (bills) and the Federal Judicial Center (judges). ' + a('/how-it-works', 'Here is how we count') + '.') + '\n'
        + H('By the numbers') + Pp(f'Today the site tracks <span data-live="trades">{html.escape(n.get("trades", "12,000+"))}</span> stock trades by members of Congress since January 2025, every current member’s campaign money and votes, and the trade reports of the President and cabinet. It updates every day.') + '\n'
        + H('Corrections') + Pp(f'If something looks wrong, email {a("mailto:corrections@capitolreceipts.com", "corrections@capitolreceipts.com")} with a link to the page. We check it against the original filing, fix confirmed errors quickly and note the correction.') + '\n'
        + H('Contact') + Pp(f'General questions: {a("mailto:admin@squaredawaylabs.com", "admin@squaredawaylabs.com")}. Reporters and researchers: see {a("/newsrooms", "Newsrooms")}.') + '\n'
        + '</main>\n')
    s = re.sub(r'<main.*?</main>\n', lambda m: body, s, count=1, flags=re.S)
    return script(s, 'live.js')

# ---------- run ----------
pages = {'index.html': home, 'receipts.html': receipts, 'parties.html': parties, 'quiz.html': quiz}
for f, fn in pages.items():
    s = fn(rd(f)); s = fill(s); s = script(s, 'live.js'); wr(f, s)
s = rd('features.html'); wr('features.html', faq(s, FEATURES_FAQ))
s = rd('newsrooms.html')
s = re.sub(r'<section data-cite.*?</section>\n', '', s, flags=re.S)
s = s.replace('<section id="contact"', CITE + '<section id="contact"', 1)
wr('newsrooms.html', faq(s, NEWS_FAQ))
wr('about.html', fill(about()))
for f in os.listdir(S):
    if f.endswith('.html'): wr(f, footer_about(rd(f)))
sm = os.path.join(S, 'sitemaps', 'site.xml')
if os.path.exists(sm):
    x = open(sm).read()
    if f'{SITE}/about<' not in x:
        x = x.replace('</urlset>', f'  <url><loc>{SITE}/about</loc></url>\n</urlset>'); open(sm, 'w').write(x)
print('live numbers:', len(NUMS), 'blocks:', len(BLOCKS))
