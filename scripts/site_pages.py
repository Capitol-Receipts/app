"""The marketing site (www.capitolreceipts.com): every page in site/*.html, built from this file.

This replaces the old design export (build_site.py, seo_site.py, app_soon.py, studio_footer.py and the page parts of
site_live.py). The pages use the same look as the record pages (/member/..., /stocks, /rankings): navy bar, plain
text, tables and real screenshots, no decoration.

Each page keeps its search metadata (title, description, canonical, share tags, structured data) from the current
file in site/, so run this on top of the existing site. Live numbers: [data-live] and [data-live-block] spots are
filled from /pulse.json at build time and refreshed in the browser by site/js/live.js.

Usage: python3 scripts/site_pages.py [pulse.json path or URL]
"""
import html, json, os, re, sys, urllib.request

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
S = os.path.join(ROOT, 'site')
SITE = 'https://www.capitolreceipts.com'
APP = 'https://app.capitolreceipts.com'
src = sys.argv[1] if len(sys.argv) > 1 else SITE + '/pulse.json'
try:
    PULSE = json.load(open(src)) if os.path.exists(src) else json.loads(urllib.request.urlopen(src, timeout=60).read())
except Exception as e:
    print('no live numbers this run:', e); PULSE = {'nums': {}, 'blocks': {}}
NUMS, BLOCKS = PULSE.get('nums', {}), PULSE.get('blocks', {})
e = lambda x: html.escape(str(x), quote=False)

def n(key, fallback):
    """A live number: baked in now, refreshed by live.js."""
    return f'<span data-live="{key}">{e(NUMS.get(key) or fallback)}</span>'

def blk(key, tag='div'):
    return f'<div data-live-block="{key}">{BLOCKS.get(key, "")}</div><!--/{key}-->'

def rd(f): return open(os.path.join(S, f), encoding='utf-8').read()

# ---------------------------------------------------------------- look
CSS = '''<style data-cr>
:root{--n:#14274e;--r:#c8323a;--i:#0e1116;--s:#5b6069;--l:#e4e6eb;--b:#f6f7f9;--bg:#fff;--a:#14274e}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--i);font:17px/1.55 "Schibsted Grotesk",system-ui,-apple-system,"Segoe UI",sans-serif}
a{color:var(--a);text-underline-offset:2px}
.cr-top{background:var(--n);color:#fff}
.cr-top .in{max-width:1040px;margin:0 auto;padding:12px 20px;display:flex;flex-wrap:wrap;gap:8px 20px;align-items:center}
.cr-logo{font:800 23px "Barlow Condensed",system-ui,sans-serif;color:#fff!important;text-decoration:none;letter-spacing:-.01em;margin-right:auto;white-space:nowrap}
.cr-logo span{background:var(--r);padding:1px 7px 2px;border-radius:5px;margin-right:3px}
.cr-logo img{width:30px;height:28px;vertical-align:-6px;margin-right:6px}
.cr-top nav{display:flex;flex-wrap:wrap;gap:4px 18px;align-items:center}
.cr-top nav a{color:#dfe5f1;text-decoration:none;font-weight:600;font-size:15px;padding:6px 0}
.cr-top nav a:hover{color:#fff;text-decoration:underline}
.cr-top nav a.cr-open{background:#fff;color:var(--n);padding:7px 12px;border-radius:8px}
.cr-top nav a.cr-open:hover{text-decoration:none;background:#e9edf6}
main{max-width:1040px;margin:0 auto;padding:28px 20px 64px}
h1,h2,h3{font-family:"Barlow Condensed",system-ui,sans-serif;letter-spacing:-.01em;line-height:1.05;margin:0}
h1{font-weight:800;font-size:clamp(36px,6vw,54px);max-width:820px}
h2{font-weight:700;font-size:30px;margin:44px 0 10px}
h3{font-weight:700;font-size:22px;margin:24px 0 6px}
p,li{max-width:740px}
.cr-lead{font-size:20px;line-height:1.5;margin:14px 0 18px;max-width:720px;color:#2a2f38}
.cr-sub{color:var(--s);font-size:15px}
.cr-crumbs{font-size:13px;color:var(--s);margin:0 0 12px}
.cr-crumbs a{color:var(--s)}
.cr-btn{display:inline-block;background:var(--n);color:#fff!important;text-decoration:none;font-weight:700;padding:11px 18px;border-radius:8px;border:0;font:inherit;font-weight:700;cursor:pointer}
.cr-btn:hover{background:#0c1a38}
.cr-btn.alt{background:transparent;color:var(--n)!important;box-shadow:inset 0 0 0 2px var(--n)}
.cr-actions{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin:6px 0 0}
.cr-facts{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin:14px 0 6px;padding:0}
.cr-facts div{background:var(--b);border-radius:10px;padding:12px 14px}
.cr-facts dt{font-size:14px;color:var(--s);font-weight:600;order:2}
.cr-facts dd{margin:0 0 2px;font:700 30px/1.1 "Barlow Condensed",system-ui,sans-serif}
.cr-facts a{color:inherit;text-decoration:none}
.cr-t{width:100%;border-collapse:collapse;font-size:16px;margin:8px 0}
.cr-t th{text-align:left;font-size:13px;color:var(--s);font-weight:600;padding:8px 10px 8px 0;border-bottom:2px solid var(--l)}
.cr-t td{padding:10px 10px 10px 0;border-bottom:1px solid var(--l);vertical-align:top}
.cr-t .r{text-align:right;padding-right:0}
.cr-t .nw{white-space:nowrap}
.cr-wrap{overflow-x:auto}
.cr-seat{color:var(--s);font-size:14px;white-space:nowrap}
.cr-rank{list-style:none;counter-reset:r;margin:6px 0;padding:0;border-top:1px solid var(--l)}
.cr-rank li{counter-increment:r;display:flex;gap:12px;justify-content:space-between;align-items:baseline;padding:9px 0;border-bottom:1px solid var(--l);max-width:none}
.cr-rank li>span:first-child::before{content:counter(r) ".";color:var(--s);font-size:14px;display:inline-block;min-width:26px}
.cr-rank li>b{font:700 20px/1 "Barlow Condensed",system-ui,sans-serif;white-space:nowrap}
.cr-list{list-style:none;margin:6px 0;padding:0;border-top:1px solid var(--l)}
.cr-list li{padding:10px 0;border-bottom:1px solid var(--l);max-width:none}
.cr-list li b{display:block}
.cr-list li a{font-weight:700}
.cr-cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr));gap:12px 40px}
.cr-cols h2,.cr-cols h3{margin-top:28px}
.cr-note{font-size:14px;color:var(--s);margin:8px 0 0}
.cr-feature{display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:32px;align-items:start;padding:28px 0;border-top:1px solid var(--l)}
.cr-feature h2{margin-top:0}
.cr-shot{width:260px;max-width:100%;border:1px solid var(--l);border-radius:14px;display:block;background:var(--b)}
.cr-check{list-style:none;padding:0;margin:10px 0}
.cr-check li{padding:5px 0 5px 26px;position:relative}
.cr-check li::before{content:"";position:absolute;left:4px;top:13px;width:10px;height:6px;border-left:2px solid var(--n);border-bottom:2px solid var(--n);transform:rotate(-45deg)}
.cr-plans{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr));gap:16px;margin:18px 0}
.cr-plan{border:1px solid var(--l);border-radius:12px;padding:20px 22px}
.cr-plan.pro{border:2px solid var(--n)}
.cr-plan .price{font:800 40px/1 "Barlow Condensed",system-ui,sans-serif;margin:8px 0 4px}
.cr-faq details{border-bottom:1px solid var(--l);padding:14px 0;max-width:780px}
.cr-faq details:first-child{border-top:1px solid var(--l)}
.cr-faq summary{cursor:pointer;font-weight:700;font-size:18px}
.cr-faq details p{margin:8px 0 0}
.cr-box{background:var(--b);border-radius:12px;padding:18px 20px;margin:18px 0;max-width:780px}
.cr-box p{margin:0}
.cr-form{display:flex;flex-wrap:wrap;gap:10px;max-width:560px;margin:10px 0}
.cr-form input,.cr-form select,.cr-form textarea{font:inherit;font-size:17px;padding:11px 13px;border:1px solid #c9ced8;border-radius:8px;background:var(--bg);color:var(--i);flex:1 1 220px;min-width:0}
.cr-form.stack{display:grid;gap:12px}
.cr-form.stack label{display:grid;gap:5px;font-weight:600}
.cr-msg{flex-basis:100%;margin:4px 0 0}
.cr-code{background:var(--b);padding:12px 14px;border-radius:8px;font:13px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap;word-break:break-word;max-width:780px}
.cr-q{border-top:1px solid var(--l);padding:22px 0}
.cr-q h3{margin-top:0;font-size:24px}
.cr-q .opts{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}
.cr-q [data-quiz-opt]{border:2px solid var(--l);border-radius:8px;padding:9px 14px;font-weight:600;background:var(--bg)}
.cr-q details summary{cursor:pointer;color:var(--s);font-weight:600}
.cr-q details p{margin:6px 0 0}
.cr-foot{border-top:1px solid var(--l);max-width:1040px;margin:0 auto;padding:22px 20px 40px;font-size:14px;color:var(--s)}
.cr-foot nav{display:flex;flex-wrap:wrap;gap:6px 18px;margin:0 0 10px}
.cr-foot a{color:var(--s)}
.cr-foot p{margin:6px 0;max-width:none}
.sp-status{display:flex;gap:10px;align-items:center;padding:12px 14px;border:1px solid var(--l);border-radius:10px;margin:18px 0 0;font-size:16px;max-width:780px}
.sp-dot{width:10px;height:10px;border-radius:50%;background:#9aa3b2;flex:none}.sp-dot.ok{background:#1f8a4c}.sp-dot.bad{background:#c8323a}
.sp-form{display:grid;gap:14px;max-width:640px;margin-top:8px}.sp-form label{display:grid;gap:6px;font-weight:600}
.sp-form input,.sp-form select,.sp-form textarea{font:inherit;font-size:17px;padding:11px 13px;border:1px solid #c9ced8;border-radius:8px;background:var(--bg);color:var(--i);width:100%}
.sp-form textarea{min-height:150px;resize:vertical}.sp-form button{justify-self:start}
.sp-out{min-height:1.4em}.sp-out.err{color:#b0244f}.sp-out.ok{color:#1f8a4c}
.sp-hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
.sp-faq details{border-bottom:1px solid var(--l);padding:14px 0;max-width:780px}.sp-faq summary{cursor:pointer;font-weight:700;font-size:18px}.sp-faq p{margin:8px 0 0}
@media (max-width:640px){.cr-t thead{display:none}.cr-t tr{display:grid;grid-template-columns:1fr auto;gap:2px 12px;padding:10px 0;border-bottom:1px solid var(--l)}.cr-t td{grid-column:1/-1;border:0;padding:0}.cr-t td:first-child{grid-column:1;font-weight:600}.cr-t td.r{grid-column:2;grid-row:1;text-align:right}.cr-top nav{gap:4px 14px;width:100%}.cr-top nav a{font-size:14px}.cr-top nav a.cr-open{margin-left:auto;padding:6px 10px}}
@media (max-width:720px){.cr-feature{grid-template-columns:1fr}.cr-shot{width:220px}.cr-top nav a.cr-hide{display:none}h2{font-size:27px}.cr-lead{font-size:18px}}
@media (prefers-color-scheme:dark){:root{--i:#e9ecf2;--s:#a3abb9;--l:#2a3140;--b:#171c26;--bg:#0e1219;--a:#9db6ff}.cr-lead{color:#cfd5df}.cr-btn{background:#2c4c9a}.cr-btn.alt{color:#9db6ff!important;box-shadow:inset 0 0 0 2px #9db6ff}.cr-plan.pro{border-color:#9db6ff}.cr-check li::before{border-color:#9db6ff}}
</style>'''
FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
         '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Schibsted+Grotesk:wght@400;500;600;700&display=swap">')

NAV = [('/members', 'Members', ''), ('/states', 'States', 'cr-hide'), ('/rankings', 'Rankings', ''), ('/stocks', 'Stocks', 'cr-hide'),
       ('/features', 'What’s inside', 'cr-hide'), ('/pricing', 'Pricing', '')]
def header():
    links = ' '.join(f'<a href="{h}"{f" class={c!r}" if c else ""}>{t}</a>'.replace("'", '"') for h, t, c in NAV)
    return (f'<header class="cr-top"><div class="in"><a class="cr-logo" href="/"><span>Capitol</span>Receipts</a>'
            f'<nav aria-label="Main">{links} <a class="cr-open" href="{APP}">Open the app</a></nav></div></header>')

FOOT_LINKS = [('/features', 'What’s inside'), ('/receipts', 'Leaderboards'), ('/parties', 'Democrats vs Republicans'), ('/appointees', 'Appointees'),
              ('/quiz', 'Quiz'), ('/how-it-works', 'How we count'), ('/newsrooms', 'For newsrooms'), ('/pricing', 'Pricing'), ('/support', 'Help'),
              ('/about', 'About'), ('/privacy', 'Privacy'), ('/terms', 'Terms'), ('/delete-account', 'Delete your account')]
RECORD_LINKS = [('/members', 'Members of Congress'), ('/states', 'States'), ('/elections', '2026 elections'), ('/stocks', 'Stocks in Congress'),
                ('/official-trades', 'Officials’ stock trades'), ('/rankings', 'Rankings'), ('/this-week', 'This week in Congress'),
                ('/reports', 'Monthly reports'), ('/bills', 'Bills'), ('/pacs', 'PACs'), ('/lobbying', 'Lobbying'), ('/past-members', 'Past members'),
                ('/guides', 'Guides'), ('/es/members', 'En español')]
STUDIO = [('https://kopetta.com', 'Kopetta'), ('https://andamos.app', 'Andamos'), ('https://www.heytribe.app', 'Hey Tribe'),
          ('https://www.takeitback.app', 'Take it Back'), ('https://www.ospelia.com', 'Ospelia')]
STUDIO_LINE = ('Made by <a href="https://www.squaredawaylabs.com">Squared Away Labs</a>. Also from the studio: '
               + ', '.join(f'<a href="{h}">{t}</a>' for h, t in STUDIO) + '.')

def footer(studio):
    a = lambda h, t: f'<a href="{h}">{t}</a>'
    return ('<footer class="cr-foot">'
            f'<nav aria-label="Records">{"".join(a(h, t) for h, t in RECORD_LINKS)}</nav>'
            f'<nav aria-label="Site">{"".join(a(h, t) for h, t in FOOT_LINKS)}</nav>'
            '<p>Capitol Receipts is nonpartisan and built only from public records. It is made by Squared Away Labs LLC in Wilkes-Barre, Pennsylvania, '
            'and isn’t affiliated with any government agency, party or campaign.</p>'
            f'<p>{studio}</p></footer>')

# ---------------------------------------------------------------- head
def head_of(fname):
    """The page's existing <head> with the old styling removed."""
    s = rd(fname)
    h = s[s.find('<head>') + 6:s.find('</head>')]
    h = re.sub(r'<style.*?</style>\s*', '', h, flags=re.S)
    h = re.sub(r'<link rel="(?:preconnect|stylesheet)"[^>]*>\s*', '', h)
    h = re.sub(r'<script type="application/ld\+json" data-faq-ld>.*?</script>\s*', '', h, flags=re.S)
    return h.strip()

def consent_of(fname):
    s = rd(fname)
    m = re.search(r'<script data-consent>.*?</script>', s, re.S)
    return m.group(0) if m else ''

def faq_ld(qa):
    clean = lambda x: re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', '', x))).strip()
    ld = {'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [{'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': clean(a)}} for q, a in qa]}
    return f'<script type="application/ld+json" data-faq-ld>{json.dumps(ld, ensure_ascii=False)}</script>'

def faq(qa, title='Common questions'):
    return f'<h2 id="questions">{title}</h2><div class="cr-faq">' + ''.join(f'<details><summary>{e(q)}</summary><p>{a}</p></details>' for q, a in qa) + '</div>'

def page(fname, body, scripts=(), qa=None, title=None, desc=None):
    h, consent = head_of(fname), consent_of(fname)
    if title: h = re.sub(r'<title>.*?</title>', f'<title>{e(title)}</title>', h, count=1, flags=re.S)
    if desc: h = re.sub(r'(<meta (?:name|property)="(?:description|og:description|twitter:description)" content=")[^"]*', lambda m: m.group(1) + html.escape(desc), h)
    out = ('<!doctype html>\n<html lang="en">\n<head>\n' + h + '\n' + FONTS + '\n' + CSS + ('\n' + faq_ld(qa) if qa else '') + '\n</head>\n<body>\n'
           + header() + '\n<main id="main">\n' + body + ('\n' + faq(qa) if qa else '') + '\n</main>\n' + footer(STUDIO_LINE) + '\n'
           + '<script src="/js/forms.js" defer></script>\n' + ''.join(f'<script src="/js/{x}" defer></script>\n' for x in scripts)
           + consent + '\n</body>\n</html>\n')
    open(os.path.join(S, fname), 'w', encoding='utf-8').write(out)
    print('wrote', fname, len(out))

A = lambda h, t: f'<a href="{h}">{t}</a>'
def shot(img, alt):
    return f'<img class="cr-shot" src="/img/{img}.webp" width="260" height="390" loading="lazy" alt="{html.escape(alt)}">'

STATES = [('AL', 'Alabama'), ('AK', 'Alaska'), ('AZ', 'Arizona'), ('AR', 'Arkansas'), ('CA', 'California'), ('CO', 'Colorado'), ('CT', 'Connecticut'),
          ('DE', 'Delaware'), ('FL', 'Florida'), ('GA', 'Georgia'), ('HI', 'Hawaii'), ('ID', 'Idaho'), ('IL', 'Illinois'), ('IN', 'Indiana'), ('IA', 'Iowa'),
          ('KS', 'Kansas'), ('KY', 'Kentucky'), ('LA', 'Louisiana'), ('ME', 'Maine'), ('MD', 'Maryland'), ('MA', 'Massachusetts'), ('MI', 'Michigan'),
          ('MN', 'Minnesota'), ('MS', 'Mississippi'), ('MO', 'Missouri'), ('MT', 'Montana'), ('NE', 'Nebraska'), ('NV', 'Nevada'), ('NH', 'New Hampshire'),
          ('NJ', 'New Jersey'), ('NM', 'New Mexico'), ('NY', 'New York'), ('NC', 'North Carolina'), ('ND', 'North Dakota'), ('OH', 'Ohio'), ('OK', 'Oklahoma'),
          ('OR', 'Oregon'), ('PA', 'Pennsylvania'), ('RI', 'Rhode Island'), ('SC', 'South Carolina'), ('SD', 'South Dakota'), ('TN', 'Tennessee'),
          ('TX', 'Texas'), ('UT', 'Utah'), ('VT', 'Vermont'), ('VA', 'Virginia'), ('WA', 'Washington'), ('WV', 'West Virginia'), ('WI', 'Wisconsin'), ('WY', 'Wyoming')]
slug = lambda t: re.sub(r'[^a-z0-9]+', '-', t.lower()).strip('-')
STATE_PICK = ('<form class="cr-form" action="/states" onsubmit="var v=this.s.value;if(v){location.href=v;return false}">'
              '<label class="cr-sub" for="pick-state" style="flex-basis:100%">Find your two senators and your House member</label>'
              '<select id="pick-state" name="s"><option value="">Pick your state</option>'
              + ''.join(f'<option value="/state/{c}/{slug(t)}">{t}</option>' for c, t in STATES) +
              '</select><button class="cr-btn" type="submit">Go</button></form>')

WEEKLY = ('<h2>The weekly email</h2><p>A short weekly email on what Congress did and how your members voted.</p>'
          '<form class="cr-form" data-signup="weekly"><input type="email" name="email" required autocomplete="email" placeholder="Email address" aria-label="Email address">'
          '<button class="cr-btn" type="submit">Sign up</button></form>')

# ---------------------------------------------------------------- pages
def home():
    qa = [
        ('What is Capitol Receipts?', 'A free website and app that shows who funds each member of Congress, what stocks they trade, how they vote and who lobbies them. Every number comes from a public filing.'),
        ('Is it free?', f'Yes. Every record is free to look up. {A("/pricing", "Pro")} adds same-day trade alerts, a stock watchlist, the conflict radar and spreadsheet downloads for $5.99 a month or $39.99 a year.'),
        ('Where does the data come from?', f'The Federal Election Commission, House and Senate stock trade reports, Voteview roll-call records, the Senate lobbying database and the Office of Government Ethics. {A("/how-it-works", "How we count")} lists all nine sources.'),
        ('How often is it updated?', 'Every day. New trade reports, campaign filings and votes appear within a day of being posted.'),
        ('Does it favor one party?', 'No. Both parties are on every list and every member is measured with the same formulas. We take no money from parties, campaigns, PACs or lobbyists.'),
        ('How do I find my representative?', f'Pick your state above, or {A("/states", "browse the states")}. In the app you can type your ZIP code.'),
    ]
    body = f'''<h1>Who pays Congress, what they trade and how they vote</h1>
<p class="cr-lead">Look up any member of Congress: their donors, every stock trade they report, their votes and the lobbyists around them. Free, nonpartisan and built from public records. Updated {n("updated", "daily")}.</p>
<div class="cr-actions"><a class="cr-btn" href="{APP}">Open the app</a> <a class="cr-btn alt" href="/members">Browse all members</a></div>
{STATE_PICK}

<h2>Biggest stock trades in the last 30 days</h2>
<p class="cr-sub">Members report trades within 45 days. Amounts are the ranges on the filing.</p>
<div class="cr-wrap">{blk("p-recent")}</div>
<p>{A("/this-week", "This week in Congress")} · {A("/reports", "Monthly reports")} · {A("/stocks", "Every stock Congress trades")}</p>

<h2>This Congress so far</h2>
<dl class="cr-facts">
<div><dd><a href="/reports">{n("trades", "12,266")}</a></dd><dt>stock trades reported by members since January 2025</dt></div>
<div><dd><a href="/rankings/most-stock-trades">{n("traders", "149")}</a></dd><dt>of {n("members", "539")} current members reported at least one trade</dt></div>
<div><dd>{n("comm", "1,077")}</dd><dt>trades in industries the member’s own committees oversee</dt></div>
<div><dd><a href="/rankings/top-fundraisers">{n("raised", "$1.9B")}</a></dd><dt>raised by current members for the 2026 elections</dt></div>
<div><dd><a href="/official-trades">{n("exec", "6,091")}</a></dd><dt>trades reported by the President and Senate-confirmed officials</dt></div>
</dl>

<div class="cr-cols">
<section><h2>Most stock trades</h2>{blk("p-traders")}<p class="cr-note">Since January 2025. The typical member made none. {A("/rankings/most-stock-trades", "Full ranking")}</p></section>
<section><h2>Most votes missed</h2>{blk("p-missed")}<p class="cr-note">Share of roll-call votes missed this Congress. Most members miss about 2%. {A("/rankings/most-missed-votes", "Full ranking")}</p>
<h2>Biggest fundraisers for 2026</h2>{blk("p-raised")}<p class="cr-note">{A("/rankings/top-fundraisers", "Full ranking")}</p></section>
</div>

<h2>What you can look up</h2>
<ul class="cr-list">
<li>{A("/members", "Every member of Congress")}: donors, trades, votes, bills, former staff who now lobby, and office spending.</li>
<li>{A("/stocks", "Stocks")}: which members bought or sold a company, and when.</li>
<li>{A("/elections", "2026 races")}: who ran in all 470 House and Senate races, what they raised, and outside spending.</li>
<li>{A("/bills", "Bills")}: summaries, how each member voted, and the groups that lobbied on them.</li>
<li>{A("/pacs", "PACs")} and {A("/lobbying", "lobbying groups")}: who gives, who spends, and on what.</li>
<li>{A("/appointees", "Appointees")}: the President’s nominees, their past pay, what they agreed to sell, and their confirmation votes.</li>
<li>{A("/past-members", "Past members")}: everyone who has served since 1789.</li>
</ul>

<h2>How we count</h2>
<p>Every member is measured with the same formulas, and every number links to the filing it came from. We don’t give grades. A high number isn’t proof of wrongdoing: trading stock is legal, and a missed vote can mean an illness or a funeral. {A("/how-it-works", "Read the methods")}.</p>

<h2>Pro</h2>
<p>Everything above is free. Pro emails you the same day someone you follow files a trade, watches the stocks you own, and lets you download the data. $5.99 a month or $39.99 a year, with 14 days free. {A("/pricing", "See Pro")}.</p>

{WEEKLY}'''
    page('index.html', body, ['live.js'], qa)

def features():
    F = [
        ('app-member', 'A member’s page in the app', 'Member pages', f'Each member’s page starts with a short summary in plain English, then the numbers: votes missed, money raised, stock trades. Every figure is compared with the typical member of the same chamber. Example: {A("/member/P000197/nancy-pelosi", "Nancy Pelosi")}.',
         ['Donors by size, industry, employer and PAC', 'Votes, missed votes and party-line voting', 'Bills sponsored, caucuses, office spending and earmarks', 'Former staff who are now registered lobbyists']),
        ('app-trades', 'The stock trades tab of a member’s page', 'Stock trades', f'Every trade members and their families report, with the company, the date and the dollar range. We match each company to its industry and flag trades in industries the member’s own committees oversee. {A("/stocks", "Browse by stock")}.',
         ['House and Senate reports since January 2025', 'A link to the original report for every trade', 'Paper filings marked as paper, with a link to the scan']),
        ('app-rankings', 'Rankings in the app', 'Rankings', f'Sort Congress by trades, money raised, small-donor share, PAC money, missed votes, party loyalty or age. Filter by party, chamber or state. {A("/rankings", "See the rankings")}.', []),
        ('app-radar', 'The conflict radar', 'Conflict radar (Pro)', 'A running list of new trades in industries a member’s committees oversee, plus every trade over $250,000. Filter it or download it as a spreadsheet.', []),
        ('app-stock', 'Stocks traded by Congress', 'Stocks and companies', 'Search any company to see which members traded it. Company pages also show its lobbying, what its PAC gives and its federal contracts.', []),
        ('app-officials', 'Trades by executive branch officials', 'The President and appointees', f'Trades reported by the President and Senate-confirmed officials on ethics forms, plus their past jobs and pay and what they agreed to sell. {A("/official-trades", "Officials’ trades")} · {A("/appointees", "Appointees")}.', []),
    ]
    rows = ''.join(f'<section class="cr-feature"><div><h2>{t}</h2><p>{p}</p>' + (f'<ul class="cr-check">{"".join(f"<li>{x}</li>" for x in li)}</ul>' if li else '') + f'</div>{shot(img, alt)}</section>\n'
                   for img, alt, t, p, li in F)
    qa = [
        ('Can I get an alert when a member trades stock?', 'Yes. With Pro you get an email when a member you follow files a new trade report.'),
        ('Does it cover the House and the Senate?', f'Yes. Every current senator and representative, plus {A("/past-members", "every past member since 1789")}.'),
        ('Can I see trades by the President and cabinet?', f'Yes. {A("/official-trades", "Officials’ stock trades")} lists every OGE Form 278-T posted since January 2025.'),
        ('Does it work on my phone?', 'Yes. It works in any phone browser, and you can add it to your home screen. iPhone and Android apps are coming soon.'),
        ('Can I download the data?', 'Pro includes spreadsheet downloads of trades, money and votes. Newsroom plans add bulk access.'),
        ('Is it in Spanish?', f'The app switches fully to Spanish. On the website, member, state, district, race and stock pages are in Spanish: {A("/es/members", "ver en español")}.'),
    ]
    body = f'''<h1>What’s inside</h1>
<p class="cr-lead">Capitol Receipts puts campaign filings, stock trade reports, votes and lobbying records on one page per person. The screenshots below are from the app with today’s data.</p>
<div class="cr-actions"><a class="cr-btn" href="{APP}">Open the app</a></div>
{rows}
<section class="cr-feature"><div><h2>Also in the app</h2><ul class="cr-check">
<li>Your two senators and House member from your ZIP code</li>
<li>Every 2026 House and Senate race, with money raised and outside spending</li>
<li>Every PAC and lobbying group, ranked by what they give and spend</li>
<li>Every federal judge since 1789, who appointed them and the Senate vote</li>
<li>Tap any underlined term for a plain-English explanation</li>
<li>Search that handles typos and nicknames</li>
<li>Spanish, dark mode, and ranked tables on a computer</li>
</ul></div>{shot("app-home", "The app home screen")}</section>'''
    page('features.html', body, [], qa, title='What’s inside Capitol Receipts: trades, donors, votes and lobbying')

def receipts():
    body = f'''<h1>The leaderboards</h1>
<p class="cr-lead">Who trades the most stock, misses the most votes and raises the most money. Both parties are on the same lists, measured the same way. Updated {n("updated", "daily")}.</p>
<div class="cr-cols">
<section><h2>Most stock trades</h2>{blk("p-traders")}<p class="cr-note">Trades reported since January 2025. {n("traders", "149")} of {n("members", "539")} current members traded at all. {A("/rankings/most-stock-trades", "Full ranking")}</p></section>
<section><h2>Most votes missed</h2>{blk("p-missed")}<p class="cr-note">The typical member misses about 2% of votes. {A("/rankings/most-missed-votes", "Full ranking")}</p>
<h2>Biggest fundraisers for 2026</h2>{blk("p-raised")}<p class="cr-note">{A("/rankings/top-fundraisers", "Full ranking")}</p></section>
</div>
<div class="cr-cols">
<section><h2>Trades tied to their own committees</h2>
<ol class="cr-rank"><li><span>{A("/member/M001136/lisa-c-mcclain", "Lisa McClain")} <span class="cr-seat">R-MI</span></span><b>253</b></li><li><span>Josh Gottheimer <span class="cr-seat">D-NJ</span></span><b>68</b></li><li><span>Rob Bresnahan <span class="cr-seat">R-PA</span></span><b>53</b></li></ol>
<p class="cr-note">Trades in a company whose industry the member’s committee oversees. {n("comm", "1,077")} across Congress.</p>
<h2>Former staff now lobbying</h2>
<ol class="cr-rank"><li><span>Sen. John Cornyn <span class="cr-seat">R-TX</span></span><b>18</b></li><li><span>Sen. Mitch McConnell <span class="cr-seat">R-KY</span></span><b>16</b></li><li><span>{A("/member/P000197/nancy-pelosi", "Nancy Pelosi")} <span class="cr-seat">D-CA</span></span><b>15</b></li></ol>
<p class="cr-note">Registered lobbyists who list a job in that member’s office. 943 in all.</p></section>
<section><h2>Most-lobbied bills</h2>
<ol class="cr-rank"><li><span>H.R. 1, One Big Beautiful Bill Act</span><b>2,364 groups</b></li><li><span>H.R. 8800, defense bill for 2027</span><b>816</b></li><li><span>S. 2296, Senate defense authorization</span><b>765</b></li></ol>
<p class="cr-note">Groups that reported lobbying on each bill.</p>
<h2>Biggest lobbying spenders</h2>
<ol class="cr-rank"><li><span>U.S. Chamber of Commerce</span><b>$68.3M</b></li><li><span>National Association of Realtors</span><b>$56.9M</b></li><li><span>PhRMA</span><b>$37.0M</b></li><li><span>Business Roundtable</span><b>$32.0M</b></li></ol>
<p class="cr-note">July 2025 to September 2026, from federal lobbying reports.</p></section>
</div>
<div class="cr-box"><p><b>A spot on a list isn’t proof of anything.</b> Trading stock is legal. Missing votes can mean illness or a family emergency. Lobbying is legal too. We show what’s on file and link the original record. {A("/how-it-works", "How we count")}.</p></div>
<p>Make your own list in the app: filter by party, state or chamber and sort by any measure. {A(APP, "Open the app")}.</p>'''
    page('receipts.html', body, ['live.js'], title='Congress leaderboards: most stock trades, missed votes and fundraising')

def parties():
    body = f'''<h1>Democrats and Republicans, side by side</h1>
<p class="cr-lead">The same measures for both parties in the 119th Congress: 262 Democrats, 274 Republicans and 3 independents who served this term.</p>
<h2>Averages per member</h2>
<div class="cr-wrap">{blk("p-party")}</div>
<p class="cr-note">The typical member of either party made no stock trades. A few heavy traders pull the averages up.</p>
<h2>The Senate</h2>
<ul class="cr-list">
<li>Senate Republicans made 7.6 times as many stock trades per member as Senate Democrats (36.5 vs 4.8), mostly because of one senator.</li>
<li>28% of Senate Democrats’ money came from small donors, compared with 11% for Republicans.</li>
<li>Senate Republicans made 3.4 times as many trades tied to their own committees.</li>
</ul>
<p>In the app, pick the House or Senate and compare money, trades or votes for both parties. {A(APP, "Open the app")}.</p>'''
    page('parties.html', body, ['live.js'], title='Democrats vs Republicans in Congress: money, stock trades and votes')

def appointees():
    body = f'''<h1>Presidential appointees and their money</h1>
<p class="cr-lead">582 people the Senate has voted on this Congress, from cabinet secretaries to judges: what they earned before, what they agreed to sell, and how close their confirmation vote was. {A("/appointees/all", "See all appointees")}.</p>
<h2>Biggest paychecks before the job</h2>
<div class="cr-wrap"><table class="cr-t"><thead><tr><th>Appointee</th><th>Job</th><th>Income line</th><th class="r">Amount</th></tr></thead><tbody>
<tr><td>Howard Lutnick</td><td>Commerce Secretary</td><td>Salary and bonus, Newmark Group</td><td class="r">$30,000,000</td></tr>
<tr><td>Stephen Feinberg</td><td>Deputy Defense Secretary</td><td>Payouts, Cerberus Capital</td><td class="r">$23,262,931</td></tr>
<tr><td>Kevin Warsh</td><td>Federal Reserve</td><td>Consulting fees, Duquesne Family Office</td><td class="r">$10,200,000</td></tr>
<tr><td>Bryan Bedford</td><td>FAA Administrator</td><td>Bonus, Republic Airways</td><td class="r">$5,820,887</td></tr>
<tr><td>Pete Hegseth</td><td>Defense Secretary</td><td>Salary, Fox News</td><td class="r">$4,602,340</td></tr>
</tbody></table></div>
<p class="cr-note">The largest single income line on each person’s Office of Government Ethics filing.</p>
<h2>Ethics agreements</h2>
<p>Before taking office, appointees sign agreements about their investments and old jobs. Of the 508 filings we read:</p>
<dl class="cr-facts"><div><dd>153</dd><dt>agreed to leave outside jobs or boards</dt></div><div><dd>88</dd><dt>agreed to sell investments that could conflict with the job</dt></div><div><dd>12</dd><dt>received a waiver to work on matters they’d otherwise have to avoid</dt></div></dl>
<h2>Confirmation votes</h2>
<div class="cr-wrap"><table class="cr-t"><thead><tr><th>Appointee</th><th>Job</th><th class="r">Vote</th></tr></thead><tbody>
<tr><td>Marco Rubio</td><td>Secretary of State</td><td class="r">99–0</td></tr>
<tr><td>Douglas Collins</td><td>Secretary of Veterans Affairs</td><td class="r">77–23</td></tr>
<tr><td>Todd Blanche</td><td>Attorney General</td><td class="r">50–49</td></tr>
<tr><td>Pete Hegseth</td><td>Secretary of Defense</td><td class="r">50–50, Vice President broke the tie</td></tr>
</tbody></table></div>
<p class="cr-note">109 nominees had at least one senator vote against their own party.</p>
<p>Each appointee has a full page with past jobs and pay, ethics agreements, the vote and links to every filing. {A("/appointees/all", "All appointees")} · {A("/official-trades", "Officials’ stock trades")}.</p>'''
    page('appointees.html', body, title='Presidential appointees: past pay, ethics agreements and confirmation votes')

def how():
    rows = [('Federal Election Commission', 'Money raised, PAC donors, top employers and industries', 'Daily'),
            ('Clerk of the House', 'Stock trades by House members', 'Daily'), ('Secretary of the Senate', 'Stock trades by senators', 'Daily'),
            ('Senate Lobbying Disclosure database', 'Lobbying spending, bills lobbied, former staff who lobby', 'Quarterly'),
            ('Voteview (UCLA)', 'Every recorded vote, missed votes, party loyalty', 'Weekly'),
            ('Office of Government Ethics', 'Financial filings and trades of the President and appointees', 'Monthly'),
            ('House Ethics Committee', 'Official statements on members', 'Weekly'),
            ('SEC company records', 'Matching stocks to industries and committees', 'Monthly'),
            ('Congress.gov member records', 'Names, photos, committees and terms', 'Daily')]
    math = [('Small-donor share', 'Money from people giving $200 or less, divided by everything raised this election cycle.'),
            ('Stock trades', 'Each buy or sale on a disclosure report counts once. When a report is amended, we drop the duplicate.'),
            ('Committee-tied trades', 'A trade in a company whose industry falls under a committee the member sits on. We match the company’s SEC industry code to each committee’s jurisdiction.'),
            ('Votes missed', 'Recorded votes the member didn’t cast, divided by all votes held while they were in office.'),
            ('Party loyalty', 'On votes where most Democrats and most Republicans disagreed, how often the member sided with their own party.'),
            ('Former staff lobbying', 'Registered lobbyists who list a past job in that member’s office on their lobbying forms.')]
    qa = [('Who pays for Capitol Receipts?', 'Pro subscribers and newsroom plans. We take no money from parties, campaigns, PACs or lobbyists.'),
          ('Are you left or right?', 'Neither. Both parties are on every list and every member is measured the same way. If the numbers look bad for one side, that’s what the filings say.'),
          ('Why can’t I see some trades in detail?', 'Some members still file handwritten paper reports. We can’t read those reliably, so we link the scan instead of guessing.'),
          ('Does a high number mean someone did something wrong?', 'No. Trading stock is legal, and missing votes can have good reasons. We show the record so you can decide what to ask.'),
          ('I found a mistake. What now?', f'Email {A("mailto:corrections@capitolreceipts.com", "corrections@capitolreceipts.com")} with a link to the record. We check it against the filing, fix confirmed errors and list every correction.')]
    body = f'''<h1>How we count</h1>
<p class="cr-lead">Every number on Capitol Receipts comes from a government filing. This page lists the sources, how often each updates, and the formulas we use.</p>
<h2>Three rules</h2>
<ol><li><b>Same formulas for everyone.</b> Party doesn’t change how a member is measured.</li><li><b>No grades or scores.</b> We show what was filed and how it compares with other members.</li><li><b>Show the source.</b> Every figure links to the original record.</li></ol>
<h2>Sources</h2>
<div class="cr-wrap"><table class="cr-t"><thead><tr><th>Source</th><th>What we use it for</th><th>Updates</th></tr></thead><tbody>{"".join(f"<tr><td>{a}</td><td>{b}</td><td>{c}</td></tr>" for a, b, c in rows)}</tbody></table></div>
<h2>Formulas</h2>
<dl>{"".join(f"<dt><b>{a}</b></dt><dd style='margin:2px 0 14px'>{b}</dd>" for a, b in math)}</dl>'''
    page('how-it-works.html', body, [], qa, title='How Capitol Receipts counts: sources and formulas')

def pricing():
    qa = [('Is the free version useful on its own?', 'Yes. Every profile, record, party page and the compare tool are free. Pro adds same-day alerts, watchlists, the conflict radar, a Friday briefing and downloads.'),
          ('Do I need a card for the free trial?', 'On the website, yes. You won’t be charged until the 14 days end, and canceling before then costs nothing. In the iPhone and Android apps, the trial is handled by Apple or Google.'),
          ('Can I cancel anytime?', 'Yes. On the website, open Pro and tap Manage. In the apps, cancel in your iPhone’s Settings or in Google Play. You keep Pro until the end of the period you paid for.'),
          ('Is there an iPhone or Android app?', 'They’re coming soon, and your account and Pro plan will carry over. Until then, the web app works in any phone browser and can be added to your home screen.'),
          ('Do you sell my data?', f'No. We don’t sell or share who you follow or what you search. See the {A("/privacy", "privacy policy")}.')]
    body = f'''<h1>Pricing</h1>
<p class="cr-lead">Every record is free. Pro watches Congress for you and emails you the day something is filed.</p>
<div class="cr-plans">
<div class="cr-plan"><h2 style="margin:0">Free</h2><div class="price">$0</div><p class="cr-sub">Look anyone up.</p><ul class="cr-check">
<li>Every member of Congress and 582 appointees</li><li>Money, trades, votes and lobbying</li><li>Party pages and side-by-side compare</li><li>Follow up to 5 people</li><li>A weekly email about the people you follow</li></ul>
<a class="cr-btn alt" href="{APP}">Open the app</a></div>
<div class="cr-plan pro"><h2 style="margin:0">Pro</h2><div class="price">$5.99<span style="font-size:20px"> a month</span></div><p class="cr-sub">or $39.99 a year. 14 days free.</p><ul class="cr-check">
<li>Everything in Free</li><li>An email the day someone you follow files a trade, or one daily digest</li><li>Stock watchlist: know when anyone in Congress trades a stock you own</li>
<li>Bill watchlist: an email when a bill moves, gets a vote or draws more lobbying</li><li>Each member’s stock picks compared with the S&amp;P 500</li>
<li>Conflict radar: trades tied to a member’s committees, and every trade over $250K</li><li>Follow as many people as you want</li><li>A Friday briefing: biggest trades, closest votes, new laws</li>
<li>Spreadsheet downloads of members, trades, PACs, lobbying, companies and bills</li></ul>
<a class="cr-btn" href="{APP}/?go=pro">Try Pro free for 14 days</a></div>
</div>
<div class="cr-box"><p><b>Newsrooms and researchers:</b> Pro for your whole team, bulk data access, embeddable charts and a priority corrections line. {A("/newsrooms", "Ask about a newsroom plan")}.</p></div>'''
    page('pricing.html', body, [], qa)

def about():
    body = f'''<h1>About Capitol Receipts</h1>
<p class="cr-lead">Capitol Receipts shows who funds every member of Congress, what stocks they trade, how they vote and who lobbies them. It’s free to use and built entirely from public records.</p>
<h2>Who makes it</h2>
<p>Squared Away Labs LLC, a small software studio in Wilkes-Barre, Pennsylvania. We build the site and app and run the daily data updates ourselves.</p>
<h2>Why</h2>
<p>The records that show how Congress is funded, how members trade and how they vote are public, but they’re spread across a dozen government sites in formats few people have time to read. We put them in one place, match them to each member, and write them up so anyone can check their own representatives in a minute.</p>
<h2>Nonpartisan</h2>
<p>Both parties are on every list, and every member is measured the same way. We don’t endorse candidates or tell you what to make of a number. A high number doesn’t mean someone broke a rule. Capitol Receipts isn’t affiliated with any government agency, party or campaign.</p>
<h2>Funding</h2>
<p>{A("/pricing", "Pro")} subscribers and {A("/newsrooms", "newsroom plans")}. We take no money from parties, campaigns, PACs or lobbyists, and we don’t sell your data. See the {A("/privacy", "privacy policy")}.</p>
<h2>Sources</h2>
<p>The Federal Election Commission, the Clerk of the House and the Secretary of the Senate, Voteview, the Senate lobbying database, the Office of Government Ethics, GovInfo, the Congressional Research Service and the Federal Judicial Center. {A("/how-it-works", "How we count")}.</p>
<h2>Today</h2>
<p>The site tracks {n("trades", "12,266")} stock trades by members of Congress since January 2025, every current member’s campaign money and votes, and the trade reports of the President and appointees. It updates every day.</p>
<h2>Corrections and contact</h2>
<p>If something looks wrong, email {A("mailto:corrections@capitolreceipts.com", "corrections@capitolreceipts.com")} with a link to the page. We check it against the original filing, fix confirmed errors and note the correction. For anything else, {A("/support", "contact support")}. Reporters: see {A("/newsrooms", "For newsrooms")}.</p>'''
    page('about.html', body, ['live.js'])

def newsrooms():
    qa = [('Can I cite Capitol Receipts in a story?', 'Yes. Link to the page you used. Every page has a permanent address and a citation line at the bottom.'),
          ('Can I check the original filing?', 'Yes. Member pages link to the House and Senate reports, FEC filings and roll-call votes behind each number.'),
          ('Can I embed a member’s card?', 'Yes. Every member page has embed code for a small card that stays current.'),
          ('How current is the data?', 'It updates daily. Each page shows the date of the latest filing it uses.'),
          ('How do corrections work?', f'Email {A("mailto:corrections@capitolreceipts.com", "corrections@capitolreceipts.com")} with a link. We fix confirmed errors and note each one.')]
    body = f'''<h1>For newsrooms</h1>
<p class="cr-lead">Nine government databases, matched by member, company and bill, so your team can pull numbers without cleaning the data first.</p>
<h2>Examples from the data</h2>
<dl class="cr-facts"><div><dd>{n("comm", "1,077")}</dd><dt>trades in industries the member’s own committees oversee</dt></div><div><dd>943</dd><dt>former congressional staff now registered as lobbyists</dt></div>
<div><dd>2,364</dd><dt>groups that lobbied on one bill, H.R. 1</dt></div><div><dd>50–50</dd><dt>Pete Hegseth’s confirmation vote, broken by the Vice President</dt></div></dl>
<h2>What your team gets</h2>
<ul class="cr-check"><li>Every member, appointee, trade, donor and lobbying report, connected and searchable</li><li>Spreadsheet downloads of any list</li>
<li>Embeddable charts with sources attached</li><li>Alerts when a member on your beat files something</li><li>Financial filings for 508 senior officials</li></ul>
<h2>Citing us</h2>
<p>Link to the page you used. Each has a permanent address, the date of its data and links to the original filings.</p>
<p class="cr-sub">Suggested credit</p><div class="cr-code">Source: Capitol Receipts analysis of House and Senate financial disclosures, FEC filings and Voteview roll-call records.</div>
<p class="cr-sub">Page citation</p><div class="cr-code">Capitol Receipts, “Nancy Pelosi (D-CA-11): Donors, Stock Trades &amp; Votes,” https://www.capitolreceipts.com/member/P000197/nancy-pelosi (accessed [date]).</div>
<p class="cr-sub">Embed a member card</p><div class="cr-code">&lt;iframe src="https://app.capitolreceipts.com/embed/member/P000197" width="420" height="320" style="border:0;max-width:100%" loading="lazy"&gt;&lt;/iframe&gt;</div>
<h2 id="trial">Request a free trial</h2>
<p>Tell us about your newsroom and we’ll reply within two business days.</p>
<form class="cr-form stack" data-signup="newsroom">
<label>Name<input name="name" required autocomplete="name"></label>
<label>Work email<input type="email" name="email" required autocomplete="email"></label>
<label>Newsroom<input name="org" required autocomplete="organization"></label>
<label>Team size<select name="team_size"><option>1–5</option><option>6–25</option><option>26+</option></select></label>
<label>What are you working on?<textarea name="note" rows="4"></textarea></label>
<button class="cr-btn" type="submit" style="justify-self:start">Request a trial</button></form>
<p class="cr-note">Corrections: {A("mailto:corrections@capitolreceipts.com", "corrections@capitolreceipts.com")}. Anything else: {A("/support", "support")}.</p>'''
    page('newsrooms.html', body, ['live.js'], qa)

def quiz():
    Q = [('Who made the most stock trades in Congress?', ['Nancy Pelosi', 'Gil Cisneros', 'Lisa McClain', 'Josh Gottheimer'], 1, 'Gil Cisneros (D-CA)', n('q1', '1,645 disclosed trades since January 2025. Lisa McClain (R-MI) is second at 1,384. Nancy Pelosi isn’t in the top 10.')),
         ('How many stock trades did the typical member of Congress make?', ['Zero', 'About 10', 'About 25', 'Over 100'], 0, 'Zero', f'Most members don’t trade at all. Only {n("traders", "149")} of {n("members", "539")} did, which is why the averages look high.'),
         ('Who raised the most campaign money?', ['Alexandria Ocasio-Cortez', 'Mark Kelly', 'Jon Ossoff', 'Bernie Sanders'], 2, 'Sen. Jon Ossoff (D-GA)', n('q3', '$116M for 2026. Mark Kelly is second at $47.5M, Alexandria Ocasio-Cortez third at $38M.')),
         ('How many groups lobbied on the One Big Beautiful Bill Act?', ['About 200', 'About 800', 'Over 2,000', 'Over 10,000'], 2, 'Over 2,000', '2,364 groups, nearly three times as many as any other bill.'),
         ('Pete Hegseth was confirmed as Defense Secretary by what vote?', ['99–0', '67–32', '51–49', '50–50'], 3, '50–50', 'A tie. The Vice President cast the deciding vote.'),
         ('What share of Bernie Sanders’s money came from people giving $200 or less?', ['14%', '35%', '69%', '90%'], 2, '69%', 'Of $24.9 million raised. The typical Democrat gets 14%, the typical Republican 10%.'),
         ('Who missed the most House votes?', ['Frederica Wilson', 'Wesley Hunt', 'Tom Kean Jr.', 'Henry Cuellar'], 0, 'Frederica Wilson (D-FL)', n('q7', '28.6% of votes. Wesley Hunt (R-TX) and Thomas Kean (R-NJ) follow. Most members miss about 2%.')),
         ('What was the biggest paycheck on Commerce Secretary Howard Lutnick’s ethics filing?', ['$900,000', '$4.6 million', '$12 million', '$30 million'], 3, '$30 million', 'Salary and bonus from Newmark Group, per his government ethics filing.'),
         ('Whose former staff includes the most registered lobbyists?', ['Nancy Pelosi', 'Mitch McConnell', 'John Cornyn', 'Chuck Schumer'], 2, 'Sen. John Cornyn (R-TX)', '18 former aides now lobby. McConnell has 16 and Pelosi 15.')]
    qs = ''.join(f'<section class="cr-q" data-quiz-q="{i + 1}"><p class="cr-sub" style="margin:0 0 4px">Question {i + 1} of {len(Q)}</p><h3>{e(q)}</h3><div class="opts">'
                 + ''.join(f'<span data-quiz-opt{" data-ok" if j == ok else ""}>{e(o)}</span>' for j, o in enumerate(opts))
                 + f'</div><details><summary>Show the answer</summary><p><b>{e(ans)}.</b> {why}</p></details></section>\n' for i, (q, opts, ok, ans, why) in enumerate(Q))
    body = f'''<h1>A nine-question quiz on Congress</h1>
<p class="cr-lead">Every answer comes from public records. Tap an answer to check it, then share your score.</p>
{qs}
<div id="quiz-score" class="cr-box" hidden><p style="font-size:20px"><b>Your score: <span data-score>0 of 9</span></b></p>
<div class="cr-actions" style="margin-top:12px"><button class="cr-btn" type="button" data-share>Share my score</button> <a class="cr-btn alt" data-x href="#" target="_blank" rel="noopener">Post on X</a> <a class="cr-btn alt" data-fb href="#" target="_blank" rel="noopener">Facebook</a></div></div>
<h2>Now look up your own members</h2>
{STATE_PICK}'''
    page('quiz.html', body, ['quiz.js', 'live.js'])

def notfound():
    body = f'''<h1>We couldn’t find that page</h1>
<p class="cr-lead">The link may be old, or the address may have a typo.</p>
<ul class="cr-list"><li>{A("/members", "Every member of Congress")}</li><li>{A("/states", "Find your state")}</li><li>{A("/rankings", "Rankings")}</li><li>{A("/stocks", "Stocks in Congress")}</li><li>{A("/", "Home")}</li></ul>
{STATE_PICK}'''
    page('404.html', body, title='Page not found | Capitol Receipts')

# ---------------------------------------------------------------- text pages: keep their words, drop the old styling
KEEP_CLASS = re.compile(r'^sp-')
def restyle_main(fname):
    s = rd(fname)
    m = re.search(r'<main[^>]*>(.*?)</main>', s, re.S)
    if not m: return None
    b = m.group(1)
    b = re.sub(r'<style[^>]*>.*?</style>', '', b, flags=re.S)
    def tag(mt):
        t = mt.group(0)
        if t.startswith('</') or t.startswith('<script') or t.startswith('<!'): return t
        t = re.sub(r'\s+style="[^"]*"', '', t)
        def cls(c):
            keep = [x for x in c.group(1).split() if KEEP_CLASS.match(x)]
            return f' class="{" ".join(keep)}"' if keep else ''
        t = re.sub(r'\s+class="([^"]*)"', cls, t)
        return t
    # leave script bodies alone
    parts = re.split(r'(<script.*?</script>)', b, flags=re.S)
    b = ''.join(p if p.startswith('<script') else re.sub(r'<[^>]+>', tag, p) for p in parts)
    b = b.replace('<button type="submit">', '<button class="cr-btn" type="submit">')
    b = re.sub(r'<p>(Last updated[^<]*)</p>', r'<p class="cr-sub">\1</p>', b, count=1)
    return b.strip()

def text_page(fname, faq_class=False):
    b = restyle_main(fname)
    if b is None: print('skip', fname); return
    if faq_class: b = b.replace('<div class="sp-faq">', '<div class="sp-faq">')
    page(fname, b)

def main():
    home(); features(); receipts(); parties(); appointees(); how(); pricing(); about(); newsrooms(); quiz(); notfound()
    for f in ('privacy.html', 'terms.html', 'delete-account.html', 'support.html'): text_page(f)

if __name__ == '__main__':
    main()
