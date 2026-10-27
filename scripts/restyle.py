"""Site look, applied last by site_live.py to every page in site/ (safe to run again).

The original design leaned on stock landing-page patterns: all-caps condensed headlines everywhere, a small red label
over every heading, stars, flag stripes, a scrolling ticker, pill buttons, big rounded stat cards. This step replaces
them with one plainer system built around the receipt: a serif for headings in sentence case, monospace for figures,
warm paper backgrounds, thin rules, small corner radii, and red used only to flag things. It also rewrites the homepage
around real filings instead of stat cards.
"""
import re

FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">'
         '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,600;8..60,700&display=swap" media="print" onload="this.media=\'all\'" data-restyle-font>')

CSS = '''<style data-restyle>
:root{--ink:#161a22;--navy:#14274e;--red:#b4232c;--blue:#22509c;--paper:#f6f2e9;--paper2:#fbf9f4;--rule:#ddd6c6;--muted:#596070}
body{background:var(--paper2)!important;color:var(--ink)}
h1,h2,h3,.disp{font-family:"Source Serif 4",Georgia,"Times New Roman",serif!important;text-transform:none!important;font-weight:600!important;letter-spacing:-.012em!important;line-height:1.1!important}
h1.disp,h1.big-h,.big-h{font-size:clamp(38px,5.4vw,60px)!important}
h2.disp,h2.sec-h,.sec-h{font-size:clamp(28px,3.6vw,42px)!important}
.disp.num{font-family:"IBM Plex Mono",ui-monospace,monospace!important;font-weight:600!important;letter-spacing:-.02em!important;font-size:clamp(22px,2.6vw,36px)!important;line-height:1.1!important}
span.disp:not(.num),div.disp:not(.num){font-size:min(40px,1em)}
.stripes,.ticker{display:none!important}
.phone{transform:none!important;box-shadow:0 18px 40px rgba(20,24,34,.18)!important}
[style*="background: #f4f6fb"],[style*="background:#f4f6fb"],[style*="background: #f3f5f8"],[style*="background:#f3f5f8"]{background:var(--paper)!important}
[style*="background: #2557a8"]:not(span):not(a):not(.bar),[style*="background:#2557a8"]:not(span):not(a):not(.bar){background:var(--navy)!important}
section[style*="background: #c8323a"],div[style*="background: #c8323a"]:not(.bar){background:var(--navy)!important}
[style*="border-radius: 22px"],[style*="border-radius:22px"],[style*="border-radius: 24px"],[style*="border-radius: 28px"],[style*="border-radius: 32px"],[style*="border-radius: 20px"],[style*="border-radius: 18px"],.card{border-radius:6px!important}
[style*="border: 2px solid #e3e7ef"],[style*="border:2px solid #e3e7ef"],[style*="border: 1px solid #e3e7ef"],.card{border:1px solid var(--rule)!important;box-shadow:none!important}
a[style*="border-radius: 999px"],button[style*="border-radius: 999px"],a[style*="border-radius:999px"],button[style*="border-radius:999px"],.menu-btn{border-radius:6px!important}
.pill,span[style*="border-radius:999px"],span[style*="border-radius: 999px"]{border-radius:3px!important}
a{color:var(--blue)}a:hover{color:var(--red)}
.cr-faq summary{font-family:inherit}
/* homepage */
.rs-wrap{max-width:1120px;margin:0 auto}
.rs-hero{background:var(--paper);padding:72px 24px 80px;border-bottom:1px solid var(--rule)}
.rs-hero-grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:56px;align-items:center}
.rs-hero h1{margin:0;font-size:clamp(38px,5.2vw,58px)!important;color:var(--navy)}
.rs-lede{margin:22px 0 0;font-size:19px;line-height:1.6;color:#2c3240;max-width:52ch}
.rs-cta{display:flex;gap:18px;align-items:center;flex-wrap:wrap;margin-top:30px}
.rs-btn{display:inline-block;background:var(--navy);color:#fff!important;text-decoration:none;font-weight:700;font-size:17px;padding:14px 22px;border-radius:6px}
.rs-btn:hover{background:#0d1a36}
.rs-link{font-weight:700;font-size:17px}
.rs-note{margin:18px 0 0;font-size:14px;color:var(--muted)}
.rs-sec{padding:80px 24px}
.rs-sec h2{margin:0;color:var(--navy);font-size:clamp(28px,3.4vw,38px)!important}
.rs-sub{margin:12px 0 0;font-size:17px;line-height:1.6;color:#3a4050;max-width:64ch}
.rs-more{display:flex;gap:22px;flex-wrap:wrap;margin-top:22px;font-weight:700}
.ledger{list-style:none;margin:28px 0 0;padding:0;border-top:2px solid var(--ink);font-size:16px}
.ledger li{display:grid;grid-template-columns:120px minmax(0,1.1fr) minmax(0,1.6fr) 150px;gap:16px;align-items:baseline;padding:14px 0;border-bottom:1px dashed var(--rule)}
.ledger .l-date,.ledger .l-amt,.ledger .l-seat{font-family:"IBM Plex Mono",ui-monospace,monospace}
.ledger .l-date{color:var(--muted);font-size:14px}
.ledger .l-who{font-weight:700}
.ledger .l-seat{font-weight:500;font-size:13px;color:var(--muted);margin-left:4px}
.ledger .l-what{color:#2c3240}
.ledger .l-amt{text-align:right;font-weight:600}
.ledger li.flag .l-what::after{content:" · tied to their committee";color:var(--red);font-weight:600}
.rs-two{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:64px;align-items:center}
.rs-list{margin:20px 0 0;padding:0 0 0 20px;font-size:17px;line-height:1.6;color:#2c3240}
.rs-list li{margin:0 0 10px}
.rs-dark{background:var(--navy);color:#e9edf6}
.rs-dark h2{color:#fff!important}
.rs-dark .rs-sub{color:#cdd5e6}
.rs-dark a{color:#fff}
.rs-src{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 40px;margin:28px 0 0;padding:0;list-style:none}
.rs-src li{padding:12px 0;border-top:1px solid rgba(255,255,255,.16);font-size:16px}
.rs-src b{color:#fff}
.rs-split{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:56px}
.rs-split form{display:flex;gap:10px;flex-wrap:wrap;margin-top:20px}
.rs-split input[type=email]{flex:1 1 220px;font:inherit;font-size:17px;padding:13px 14px;border:1px solid #b9b19f;border-radius:6px;background:#fff}
.rs-split button{font:inherit;font-weight:700;font-size:17px;padding:13px 20px;border:0;border-radius:6px;background:var(--navy);color:#fff;cursor:pointer}
.rs-split .cr-msg{color:var(--ink)!important}
.rs-split form label{flex-basis:100%;font-weight:600;font-size:15px}
@media (max-width:900px){.rs-hero-grid,.rs-two,.rs-split{grid-template-columns:1fr;gap:40px}.rs-hero{padding:48px 20px 56px}.rs-sec{padding:56px 20px}}
@media (max-width:700px){.ledger li{grid-template-columns:1fr auto;gap:2px 12px}.ledger .l-date{grid-column:1/-1}.ledger .l-who{grid-column:1}.ledger .l-amt{grid-row:2;grid-column:2}.ledger .l-what{grid-column:1/-1}.rs-src{grid-template-columns:1fr}}
</style>'''

def common(s):
    """Every page: the shared look, and the stock decorations removed."""
    s = re.sub(r'<style data-restyle>.*?</style>', '', s, flags=re.S)
    s = re.sub(r'<link rel="preconnect" href="https://fonts.googleapis.com"><link [^>]*data-restyle-font>', '', s)
    s = s.replace('</head>', FONTS + CSS + '\n</head>', 1)
    s = re.sub(r'\s*<div class="stripes"[^>]*></div>', '', s)
    s = re.sub(r'<section style="background: #c8323a; color: #ffffff; padding: 18px 0; overflow: hidden">.*?</section>\n?', '', s, flags=re.S)
    # small labels over headings ("THE BILL FOR CONGRESS", "★ THE TOUR", "01", "HISTORY", "UPDATED DAILY")
    s = re.sub(r'\s*<span[^>]*letter-spacing: \.1em[^>]*>[^<]{0,48}</span>(?=\s*<(?:h1|h2|span class="disp|div))', '', s)
    s = re.sub(r'\s*<span class="disp" style="font-size: 2\dpx; color: #[0-9a-f]{6}">[^<]{0,32}</span>(?=\s*<h[12])', '', s)
    s = s.replace('★ ', '').replace(' ★', '').replace('★', '')
    # figures use the receipt's typewriter face; words in the same big style stay in the serif
    def num(m):
        tag, attrs, text = m.group(1), m.group(2), m.group(3)
        if not re.fullmatch(r'[\s$€%.,–\-+/0-9KMBk]*\d[\s$€%.,–\-+/0-9KMBkofmontha]*', text) or 'num' in attrs: return m.group(0)
        return f'<{tag} class="disp num"{attrs}>{text}</'
    s = re.sub(r'<(span|div|b) class="disp"([^>]*)>([^<]{1,24})</', num, s)
    return s

def home(s, block):
    ledger = block('home-ledger') or ''
    receipt = re.search(r'<div class="mono" style="width: 100%; max-width: 440px;.*?\n   </div>\n', s, re.S)
    receipt = receipt.group(0).replace('transform: rotate(1.5deg)', 'transform: rotate(1deg)') if receipt else ''
    form = re.search(r'<form data-signup="list".*?</form>', s, re.S)
    form = form.group(0) if form else ''
    form = re.sub(r' style="[^"]*"', '', form)
    phone = '<div class="phone" style="margin:0 auto"><img loading="lazy" decoding="async" src="/img/36debe7ccc0bc7565a6c15e8b9200b80.webp?v=20261015" alt="A member profile in the app: what stands out, money, stock trades and votes" width="780" height="1688"></div>'
    body = f'''<main id="main">
<section class="rs-hero"><div class="rs-wrap rs-hero-grid">
 <div>
  <h1>Who pays Congress, what they trade and how they vote</h1>
  <p class="rs-lede">Capitol Receipts puts the public records on every member of Congress in one place: campaign money from the FEC, stock trades from House and Senate disclosures, every roll-call vote, and federal lobbying reports. It’s free, and the records update every weekday.</p>
  <div class="rs-cta"><a class="rs-btn" href="https://app.capitolreceipts.com">Look up your representatives</a><a class="rs-link" href="/how-it-works">How we count</a></div>
  <p class="rs-note">Works in any browser on your phone or computer. iPhone and Android apps are coming soon.</p>
 </div>
 <div style="display:flex;justify-content:center">{receipt}</div>
</div></section>

<section class="rs-sec" data-live-sec><div class="rs-wrap">
 <h2>Latest stock trades reported by members of Congress</h2>
 <p class="rs-sub">Members of Congress have to report stock trades over $1,000 within 45 days, and they report amounts as ranges. These are the newest ones on file. Tap a name for that member’s full record.</p>
 {ledger}
 <div class="rs-more"><a href="/reports">All trades by month ›</a><a href="/rankings/most-stock-trades">Who trades the most ›</a><a href="/stocks">Look up a stock ›</a></div>
</div></section>

<section class="rs-sec" style="background:var(--paper);border-top:1px solid var(--rule);border-bottom:1px solid var(--rule)"><div class="rs-wrap rs-two">
 <div>{phone}</div>
 <div>
  <h2>What’s on each member’s page</h2>
  <ul class="rs-list">
   <li><b>Who funds them:</b> small donors, PACs, the industries behind the money, and outside groups spending in their race.</li>
   <li><b>Their stock trades</b> since 2012, flagged when the company falls under a committee they sit on.</li>
   <li><b>How they vote:</b> each bill, how often they miss votes, and how often they break with their party.</li>
   <li><b>Lobbying:</b> former staff who now lobby Congress, and the groups lobbying on bills they sponsor.</li>
  </ul>
  <p class="rs-sub">Every page starts with a few plain sentences on what stands out. If nothing does, it says so.</p>
  <div class="rs-more"><a href="/features">See everything in the app ›</a><a href="/members">Browse every member ›</a></div>
 </div>
</div></section>

<section class="rs-sec rs-dark"><div class="rs-wrap">
 <h2>How we count</h2>
 <p class="rs-sub">Every member is measured with the same formula, Democrats and Republicans alike. We don’t give grades or scores, and we don’t endorse anyone. Each number links to the filing it came from.</p>
 <ul class="rs-src">
  <li><b>Federal Election Commission:</b> campaign money and outside spending</li>
  <li><b>House Clerk and Senate Secretary:</b> stock trades and financial disclosures</li>
  <li><b>Voteview:</b> every roll-call vote since 1789</li>
  <li><b>Senate lobbying database:</b> lobbying reports and lobbyists</li>
  <li><b>Office of Government Ethics:</b> trades and finances of top officials</li>
  <li><b>Congress.gov and GovInfo:</b> bills and their status</li>
  <li><b>USAspending.gov:</b> federal contracts and grants</li>
  <li><b>Federal Judicial Center:</b> federal judges</li>
 </ul>
 <div class="rs-more"><a href="/how-it-works">Read our methods ›</a><a href="/about">Who makes Capitol Receipts ›</a></div>
</div></section>

<section class="rs-sec"><div class="rs-wrap rs-split">
 <div>
  <h2>Pro: an email when a trade is filed</h2>
  <p class="rs-sub">Pro emails you the same day someone you follow reports a trade. It also watches the stocks and bills you pick and flags trades tied to a member’s own committees. It costs $5.99 a month or $39.99 a year, with a 14-day free trial. Every record stays free without it.</p>
  <div class="rs-more"><a href="/pricing">See what’s in Pro ›</a></div>
 </div>
 <div>
  <h2>The weekly email</h2>
  <p class="rs-sub">One short email a week on what Congress did and how your members voted. Free.</p>
  {form}
 </div>
</div></section>
</main>
'''
    start = s.find('</header>') + len('</header>')
    end = s.find('<section data-faq')
    if start > 20 and end > start:
        s = s[:start] + '\n\n' + body + '\n' + s[end:]
    return s

def run(rd, wr, files, block):
    for f in files:
        s = rd(f)
        if f == 'index.html':
            s = home(s, block)
        wr(f, common(s))
