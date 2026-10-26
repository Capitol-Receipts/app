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
    s = re.sub(r'(<(span|div|b)[^>]*data-live="([\w-]+)"[^>]*>)([^<]*)(</\2>)', lambda m: m.group(1) + html.escape(NUMS.get(m.group(3)) or html.unescape(m.group(4)), quote=False) + m.group(5), s)
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
    ('Is it free?', f'Yes. Every record is free to look up. {A("/pricing", "Pro")} adds daily alerts, a stock watchlist, the conflict radar and CSV downloads for $5.99 a month or $39.99 a year.'),
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

MOBILE_CSS = ('<style data-mobile>@media (max-width:760px){'
  '[style*="grid-template-columns: repeat(auto-fit, minmax("]{grid-template-columns:minmax(0,1fr) !important}'
  '[style*="padding: 56px 44px"]{padding:36px 22px !important}'
  '[style*="padding: 80px 40px 90px"]{padding:56px 24px 60px !important}'
  '.card[style*="1fr 200px 1fr"]{grid-template-columns:1fr 1fr !important;gap:8px 14px !important;padding:16px 18px !important}'
  '.card[style*="1fr 200px 1fr"]>div:nth-child(2){grid-column:1/-1;order:-1;text-align:left !important}'
  '.card[style*="1fr 200px 1fr"] .bar{max-width:90px !important}'
  'section span[style*="letter-spacing: .1em"]:not([style*="background"]){font-size:12px !important}'
  'footer a{display:inline-block;padding:5px 0}'
  '.cr-faq summary{font-size:17px}'
  '[style*="grid-template-columns: 1.4fr 2fr 1fr"]{grid-template-columns:1fr auto !important;gap:4px 12px !important}'
  '[style*="grid-template-columns: 1.4fr 2fr 1fr"]>span:nth-child(1){font-weight:700}'
  '[style*="grid-template-columns: 1.4fr 2fr 1fr"]>span:nth-child(2){grid-column:1/-1;order:3;color:#5b6374}'
  '[style*="padding: 36px 40px"]{padding:26px 22px !important}[style*="min-width: 260px"]{min-width:0 !important;flex-basis:100% !important}'
  'h1,h2,h3{overflow-wrap:break-word}p a,main a{overflow-wrap:anywhere}'
  '}</style>')
def mobile(s):
    s = re.sub(r'<style data-mobile>.*?</style>\n?', '', s, flags=re.S)
    return s.replace('</head>', MOBILE_CSS + '\n</head>', 1)

NAV_LINKS = [('/features', 'Features'), ('/receipts', 'The Receipts'), ('/pricing', 'Pricing'), ('/about', 'About')]
LOOKUP = [('/states', 'Find your state'), ('/members', 'Every member of Congress'), ('/this-week', 'This week in Congress'), ('/rankings', 'Rankings'),
          ('/stocks', 'Stocks in Congress'), ('/official-trades', 'Officials’ stock trades'), ('/reports', 'Monthly reports'), ('/guides', 'Guides'),
          ('/elections', '2026 House and Senate races'), ('/bills', 'Bills since 1947'), ('/pacs', 'PACs and who they fund'), ('/lobbying', 'Who lobbies Congress'),
          ('/es/members', 'En español')]
def simplify(s):
    """Four links in the top menu, and one list of data links above the footer (the footer keeps every page)."""
    s = re.sub(r'(<div class="hide-sm site-links" id="site-links"[^>]*>)(.*?)(\n  </div>)',
               lambda m: m.group(1) + ''.join(f'\n   <a class="navlink" href="{h}">{l}</a>' for h, l in NAV_LINKS) + m.group(3), s, count=1, flags=re.S)
    s = re.sub(r'<div data-explore[^\n]*</div>\n', '', s)
    s = re.sub(r'(<section data-seo-explore[^>]*>.*?<ul[^>]*>)(.*?)(</ul>)',
               lambda m: m.group(1) + ''.join(f'<li><a href="{h}" style="font-weight:600;text-decoration:none">{html.escape(t)}&nbsp;›</a></li>' for h, t in LOOKUP) + m.group(3), s, count=1, flags=re.S)
    for h, l in [('/parties', 'Red vs Blue'), ('/appointees', 'Appointees'), ('/quiz', 'Quiz'), ('/how-it-works', 'How it works'), ('/newsrooms', 'Newsrooms')]:
        if f'href="{h}" style="color: #c9d1e3' not in s:
            s = s.replace('<a href="/about" style="color: #c9d1e3; text-decoration: none">About</a>', f'<a href="{h}" style="color: #c9d1e3; text-decoration: none">{l}</a>\n   <a href="/about" style="color: #c9d1e3; text-decoration: none">About</a>', 1)
    return s

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
    # older fixed numbers in the designed sections
    s = re.sub(r'\(D-CA\): (?:<span data-live="top-trades">)?([\d,]+)(?:</span>)? stock trades since Jan 2025', r'(D-CA): <span data-live="top-trades">\1</span> stock trades since Jan 2025', s)
    for label, key in [('Raised for 2026 races', 'raised'), ('Stock trades reported', 'trades'), ('Members who traded', 'traders'), ('Trades tied to own committees', 'comm')]:
        s = re.sub(rf'(<span>{re.escape(label)}</span><b)(?: data-live="[\w-]+")?([^>]*)>', rf'\1 data-live="{key}"\2>', s, count=1)
    s = re.sub(r'U\.S\. CONGRESS · 119TH SESSION<br>(?:<span data-live="period">)?([^<]*)(?:</span>)?</div>', r'U.S. CONGRESS · 119TH SESSION<br><span data-live="period">\1</span></div>', s, count=1)
    s = re.sub(r'(?:<span data-live="trades">)?12,917(?:</span>)? trades from House and Senate', lambda m: '<span data-live="trades">12,917</span> trades from House and Senate', s)
    s = re.sub(r'<span class="disp" style="font-size: 84px"(?: data-live="top-trades")?>([\d,]+)</span>(\s*<span style="font-size: 16px">trades since Jan 2025, the most)', r'<span class="disp" style="font-size: 84px" data-live="top-trades">\1</span>\2', s)
    s = re.sub(r'<span class="disp" style="font-size: 84px"(?: data-live="top-missed")?>([\d.]+%)</span>(\s*<span style="font-size: 16px">of roll-call votes missed)', r'<span class="disp" style="font-size: 84px" data-live="top-missed">\1</span>\2', s)
    return faq(s, HOME_FAQ)

def receipts(s):
    for label, key in [('Most trades', 'top-trades'), ('Most votes missed', 'top-missed'), ('Biggest haul', 'top-raised')]:
        s = re.sub(rf'(<span>{label}</span>)<span>([^<]*)</span>', rf'\1<span data-live="{key}">\2</span>', s)
    s = re.sub(r'(?:<span data-live="comm">)?([\d,]+)(?:</span>)? across Congress\.', r'<span data-live="comm">\1</span> across Congress.', s, count=1)
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

def legal(fname, path, title, desc, body_html):
    """A plain text page (privacy, account deletion) built on the privacy page's design."""
    s = rd('privacy.html')
    s = re.sub(r'<title>.*?</title>', f'<title>{title} | Capitol Receipts</title>', s, count=1, flags=re.S)
    s = re.sub(r'(<meta (?:name|property)="(?:description|og:description|twitter:description)" content=")[^"]*', lambda m: m.group(1) + desc, s)
    s = re.sub(r'(<meta (?:property|name)="(?:og:title|twitter:title)" content=")[^"]*', lambda m: m.group(1) + title, s)
    s = s.replace(f'{SITE}/privacy"', f'{SITE}{path}"')
    s = re.sub(r'<main.*?</main>\n', lambda m: body_html, s, count=1, flags=re.S)
    wr(fname, s)

LH = lambda t: f'<h2 style="font-size:22px;margin:40px 0 10px;letter-spacing:-.01em">{t}</h2>'
LP = lambda t: f'<p style="margin:0 0 12px;color:#2a3140">{t}</p>'
LA = lambda h, t: f'<a href="{h}">{t}</a>'
MAIL = LA('mailto:admin@squaredawaylabs.com', 'admin@squaredawaylabs.com')

def privacy_body():
    return ('<main style="max-width:760px;margin:0 auto;padding:64px 24px 96px">\n<h1 class="disp" style="font-size:64px;margin:0;color:#14274e">Privacy Policy</h1>\n'
        + '<p class="mono" style="margin:14px 0 0;font-size:14px;color:#5b6475">Last updated October 26, 2026</p>\n'
        + LH('Who we are') + LP(f'Capitol Receipts is made by Squared Away Labs LLC ("we", "us"), Wilkes-Barre, Pennsylvania. This policy covers www.capitolreceipts.com, app.capitolreceipts.com and the Capitol Receipts iPhone app. Questions: {MAIL}.')
        + LH('What we collect') + LP('<b>If you just browse:</b> usage data through Google Analytics, such as pages viewed, buttons tapped, device type, browser and approximate location from your IP address. It is not linked to an account. No account is needed to use the site.')
        + LP('<b>If you create an account:</b> your email address, and your name if you sign in with Apple or Google and they share it. We also keep what you save: your ZIP code or state if you enter one, the people, stocks and bills you follow, your alert settings, and when we last emailed you an alert.')
        + LP('<b>If you sign in with Apple or Google:</b> we receive your email address and an account identifier from them. For Sign in with Apple we also keep a token so we can tell Apple when you delete your account.')
        + LP('<b>If you turn on alerts in the iPhone app:</b> a push notification token for your device, so we can send alerts to it. Signing out removes it.')
        + LP('<b>If you subscribe to Pro:</b> on the web, payments are handled by Stripe. We never see or store your full card number; we keep your Stripe customer and subscription IDs, your plan and its renewal date. In the iPhone app, purchases go through Apple, and RevenueCat confirms them to us; we keep your plan, its renewal date and the App Store transaction ID.')
        + LP('<b>If you write to us or report a mistake:</b> what you send and the email address you send it from.')
        + LH('How we use it') + LP('To run your account, send the alerts and emails you ask for, process your subscription, keep the service secure, fix problems and understand which parts of the app people use.')
        + LH('What we don’t do') + LP('We don’t sell or rent your personal information. We don’t show ads. We don’t share who you follow, what you search or what’s on your watchlist with advertisers, campaigns, parties or anyone else.')
        + LH('Who processes data for us') + LP('Supabase (accounts and database), Vercel (hosting), Stripe (web payments), Apple (iPhone purchases, Sign in with Apple and push notifications), RevenueCat (confirming App Store purchases), Google (Sign in with Google and Google Analytics), Resend (email delivery) and GitHub (running our daily data updates, which don’t include your personal data). Each handles data only to provide its service to us.')
        + LH('Analytics') + LP(f'Google Analytics sets cookies to count visits. You can block them with your browser’s settings or the {LA("https://tools.google.com/dlpage/gaoptout", "Google Analytics opt-out add-on")}. The site keeps working without them.')
        + LH('How long we keep it') + LP('We keep your account data until you delete your account. Alert history is overwritten as new alerts go out. Payment records that tax law requires us to keep, such as invoices in Stripe, are kept for as long as the law requires, even after you delete your account. Database backups are kept for a limited time and then expire.')
        + LH('Your choices') + LP(f'You can change your alert settings, turn off alerts or cancel Pro at any time in the app. To delete your account and everything saved with it, open Account and tap <b>Delete my account</b>; it happens right away. You can also {LA("/delete-account", "ask us to delete it by email")}. To get a copy of your data or correct it, email {MAIL} from the address on your account and we’ll reply within 30 days.')
        + LP('If you subscribe through Apple, deleting your account doesn’t cancel the subscription. Cancel it in your iPhone’s Settings › your name › Subscriptions.')
        + LH('Security') + LP('Data is encrypted in transit. Access to your account data is limited to you and to the few systems that need it to run the service, and our admin tools require two-step sign-in.')
        + LH('Children') + LP('Capitol Receipts isn’t directed at children under 13, and we don’t knowingly collect their information.')
        + LH('Changes') + LP('If we change this policy in a meaningful way, we’ll update the date above and tell account holders by email.')
        + '</main>\n')

def delete_body():
    return ('<main style="max-width:760px;margin:0 auto;padding:64px 24px 96px">\n<h1 class="disp" style="font-size:56px;margin:0;color:#14274e">Delete your account</h1>\n'
        + LP('You can delete your Capitol Receipts account, and everything saved with it, at any time.').replace('margin:0 0 12px', 'margin:18px 0 12px')
        + LH('In the app or on the website') + LP(f'Sign in at {LA("https://app.capitolreceipts.com", "app.capitolreceipts.com")} or in the iPhone app, open <b>Account</b> and tap <b>Delete my account</b>. Your account is deleted right away.')
        + LH('By email') + LP(f'If you can’t sign in, email {MAIL} from the address on your account with the subject “Delete my account”. We’ll confirm and delete it within 7 days.')
        + LH('What gets deleted') + LP('Your login, email address, saved representatives and ZIP code, the people, stocks and bills you follow, your alert settings and history, the devices registered for alerts, your Pro record, and any mistake reports or sign-ups sent from your email address. A web Pro subscription is canceled so you aren’t charged again.')
        + LH('What we keep') + LP('Payment records that tax law requires us to keep, such as invoices held by Stripe, for as long as the law requires. Database backups that contain your data expire on their normal schedule. The public records on Capitol Receipts are not personal data and stay available.')
        + LH('Subscriptions through Apple') + LP('Deleting your account doesn’t cancel an App Store subscription. Cancel it in your iPhone’s Settings › your name › Subscriptions.')
        + '</main>\n')

PRICE_FIX = [  # (old,new) applied in order to every file
 ("Pricing: Free, or Pro for $4.99 a Month","Pricing: Free, or Pro for $5.99 a Month"),
 ("$4.99 a month or $39 a year","$5.99 a month or $39.99 a year"),
 ("$4.99 a month or $39.99 a year","$5.99 a month or $39.99 a year"),
 ("$4.99 a month, or $39 a year","$5.99 a month, or $39.99 a year"),
 ('>$4.99<','>$5.99<'),
 ("or $39 a year · save 35%","or $39.99 a year · save 44%"),
 ("Plans are $4.99 a month or $39 a year","Plans are $5.99 a month or $39.99 a year"),
 ("Capitol Receipts Pro · $4.99/mo","Capitol Receipts Pro · $5.99/mo"),
 ("price:{m:4.99,y:39}","price:{m:5.99,y:39.99}"),
 ('"price": "4.99"','"price": "5.99"'),('"price": "39"','"price": "39.99"'),
 ("'price': '4.99'","'price': '5.99'"),("'price': '39'","'price': '39.99'"),
 ("| $4.99 | 1-week free trial","| $5.99 | 2-week free trial"),("| $39.99 | 1-week free trial","| $39.99 | 2-week free trial"),
 ("Try Pro free for 7 days","Try Pro free for 14 days"),("try Pro free for 7 days","try Pro free for 14 days"),
 ("Start 7-day free trial","Start 14-day free trial"),("Free for 7 days, then","Free for 14 days, then"),
 ("The 7-day free trial","The 14-day free trial"),("the 7-day free trial","the 14-day free trial"),
 ("start your free week of Pro","start your 14-day free trial of Pro"),
 ("Start your free week","Start your free trial"),
 ("`7 days free, then","`14 days free, then"),
 ("during your free week","during your free trial"),
 ("Pro free week ·","Pro free trial ·"),("Your free week runs until","Your free trial runs until"),
 ("for the free week?","for the free trial?"),("for the free week\\?","for the free trial\\?"),
 ("start your 7 free days. You won’t be charged until the week ends","start your 14 free days. You won’t be charged until the trial ends"),
 ("start your 7 free days. You won't be charged until the week ends","start your 14 free days. You won't be charged until the trial ends"),
 ("in free week","in free trial"),("In free week","In free trial"),
 ("Your free week of Pro ends","Your free trial of Pro ends"),("Your free week ends soon","Your free trial ends soon"),
 ("before your free week ended","before your free trial ended"),
]
def pricing(s):
    """Current Pro price and trial length ($5.99/mo, $39.99/yr, 14-day trial), whatever the design files say."""
    for a, b in PRICE_FIX: s = s.replace(a, b)
    return s

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
legal('delete-account.html', '/delete-account', 'Delete Your Account', 'How to delete your Capitol Receipts account and the data saved with it, in the app or by email.', delete_body())
legal('privacy.html', '/privacy', 'Privacy Policy', 'What Capitol Receipts collects, how it is used, who processes it and how to delete your account.', privacy_body())
for f in os.listdir(S):
    if f.endswith('.html'): wr(f, pricing(simplify(mobile(footer_about(rd(f))))))
sm = os.path.join(S, 'sitemaps', 'site.xml')
if os.path.exists(sm):
    x = open(sm).read()
    if f'{SITE}/about<' not in x:
        x = x.replace('</urlset>', f'  <url><loc>{SITE}/about</loc></url>\n</urlset>'); open(sm, 'w').write(x)
print('live numbers:', len(NUMS), 'blocks:', len(BLOCKS))
