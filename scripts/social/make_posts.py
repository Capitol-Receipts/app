"""Ready-to-post X graphics and captions from the live Capitol Receipts data.

Usage: python3 scripts/social/make_posts.py <out dir> <fonts dir>
Reads the public, read-only data (same key the site uses), writes post-N.png plus posts.json/posts.md with captions.
Every number comes straight from the data; nothing is estimated.
"""
import json, os, re, sys, base64, datetime, collections, urllib.request

OUT, FONTS = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
SB = 'https://hxgckcriehvrolwnabpd.supabase.co/rest/v1/'
KEY = 'sb_publishable_jiwF5q1sFMuaGXLKg6FKAQ_3rCjcZ1J'  # public, read-only

def get(path, rng=None):
    h = {'apikey': KEY, 'Accept': 'application/json'}
    if rng: h['Range'] = rng
    return json.load(urllib.request.urlopen(urllib.request.Request(SB + path, headers=h), timeout=120))

MEM = {m['id']: m for m in (r['lite'] for r in get('members?select=lite', '0-999'))}
META = {r['key']: r['value'] for r in get('app_meta?select=key,value&key=in.(trades_all,perf,asOf)')}
TA = {k: v for k, v in META['trades_all'].items() if k in MEM}
TODAY = datetime.date.fromisoformat(META['asOf']['roster'])
IS_TICK = re.compile(r'^[A-Z][A-Z.\-]{0,6}$')

def tag(m): return f"{m['party']}-{m['state']}"
def nm(m): return f"{m['first']} {m['last']}"
def n(x): return f'{x:,}'
def mon(d): return datetime.date.fromisoformat(d).strftime('%b %-d')
posts = []
RT = {'filed-this-week': 'FILED THIS WEEK', 'top-traders': 'MOST TRADES SINCE 2025', 'stock-picks': 'BEAT THE S&P 500', 'committee-trades': 'COMMITTEE-TIED TRADES', 'spouses': 'WHO MADE THE TRADE', 'missed-votes': 'MISSED VOTES · HOUSE', 'top-fundraisers': 'MOST RAISED · 2026 CYCLE', 'party-line': 'VOTES WITH THEIR PARTY'}
def post(key, title, lead, head, rows, total, source, caption, reply=None):
    posts.append(dict(key=key, title=title, lead=lead, head=head, rows=rows, total=total, source=source, caption=caption, reply=reply))

# 1. Reports filed in the last 7 days
since = (TODAY - datetime.timedelta(days=7)).isoformat()
fl = collections.Counter()
for m in MEM.values():
    for f in m.get('ptrFiles') or []:
        if f[0] >= since and f[2]: fl[m['id']] += f[2]
if fl:
    top = fl.most_common()
    tot, who = sum(fl.values()), MEM[top[0][0]]
    post('filed-this-week', 'Stock trades filed this week',
         f"{len(fl)} members of Congress filed reports this week listing <b>{n(tot)} trades</b>. {nm(who)} ({tag(who)}) filed the most.",
         ('MEMBER', 'TRADES'), [(f"{nm(MEM[i])} ({tag(MEM[i])})", n(c)) for i, c in top[:8]], ('THIS WEEK', n(tot)),
         f"REPORTS FILED {mon(since).upper()} – {TODAY.strftime('%b %-d').upper()}",
         f"{len(fl)} members of Congress filed stock trade reports this week, listing {n(tot)} trades.\n\n"
         f"{nm(who)} ({tag(who)}) filed the most, with {n(top[0][1])} trades.",
         'Every filing, with links to the original reports: capitolreceipts.com/rankings/most-stock-trades')

# 2. Most active traders since 2025
cnt = sorted(((len(v), i) for i, v in TA.items()), reverse=True)
alltr = sum(c for c, _ in cnt)
post('top-traders', 'The most active traders in Congress',
     f"Members of Congress and their families reported <b>{n(alltr)} trades</b> since January 2025. These members reported the most.",
     ('MEMBER', 'TRADES'), [(f"{nm(MEM[i])} ({tag(MEM[i])})", n(c)) for c, i in cnt[:8]], ('ALL MEMBERS', n(alltr)),
     'HOUSE & SENATE TRADE REPORTS SINCE JAN 2025',
     f"{n(len(cnt))} members of Congress have reported {n(alltr)} trades since January 2025.\n\n"
     f"{nm(MEM[cnt[0][1]])} ({tag(MEM[cnt[0][1]])}) leads with {n(cnt[0][0])}, followed by {nm(MEM[cnt[1][1]])} ({tag(MEM[cnt[1][1]])}) with {n(cnt[1][0])}.",
     'Full list: capitolreceipts.com/rankings/most-stock-trades')

# 3. Stock picks vs the S&P 500
pf = META['perf']; ranked = sorted(((r['ex'], i, r) for i, r in pf['m'].items() if r.get('n', 0) >= 5 and i in MEM), reverse=True)
beat = sum(1 for e, _, _ in ranked if e > 0)
post('stock-picks', 'Whose stock picks beat the market?',
     f"Of {len(ranked)} members with at least 5 stock purchases since 2025, <b>{beat} beat the S&amp;P 500</b>. These beat it by the most.",
     ('MEMBER', 'VS S&P 500'), [(f"{nm(MEM[i])} ({tag(MEM[i])})", f"+{e*100:.0f} pts") for e, i, r in ranked[:8]], ('BEAT THE S&P', f"{beat} of {len(ranked)}"),
     f"PURCHASES SINCE JAN 2025 · PRICES AS OF {mon(pf['asOf']).upper()}",
     f"{beat} of {len(ranked)} members of Congress with at least 5 stock purchases since January 2025 beat the S&P 500.\n\n"
     f"{nm(MEM[ranked[0][1]])} ({tag(MEM[ranked[0][1]])}) is ahead of the index by {ranked[0][0]*100:.0f} percentage points.\n\n"
     "Each purchase is measured from the day it was made to today and compared with the S&P 500 over the same days.",
     'Full ranking and method: capitolreceipts.com/rankings/stock-picks')

# 4. Trades tied to their committees
ct = sorted(((m['commTrades'], m['id']) for m in MEM.values() if m.get('commTrades')), reverse=True)
post('committee-trades', 'Trading the industries they oversee',
     f"<b>{len(ct)} members</b> reported trades in industries overseen by committees they sit on. These reported the most.",
     ('MEMBER', 'TRADES'), [(f"{nm(MEM[i])} ({tag(MEM[i])})", n(c)) for c, i in ct[:8]], ('ALL MEMBERS', n(sum(c for c, _ in ct))),
     'TRADES SINCE JAN 2025 · CURRENT COMMITTEES',
     f"{len(ct)} members of Congress reported stock trades in industries their own committees oversee.\n\n"
     f"{nm(MEM[ct[0][1]])} ({tag(MEM[ct[0][1]])}) reported {n(ct[0][0])} of them. Trading these stocks is legal.",
     'See every committee-tied trade: capitolreceipts.com/rankings/committee-tied-trades')

# 5. Who made the trades
own = collections.Counter()
lab = {'Self': 'Member', 'SP': 'Spouse', 'Spouse': 'Spouse', 'JT': 'Joint account', 'Joint': 'Joint account', 'DC': 'Dependent child'}
for v in TA.values():
    for t in v: own[lab.get(t[6], 'Other or not listed')] += 1
sp = own['Spouse']
post('spouses', 'Who makes the trades?',
     f"Members must report trades by their spouses and children too. <b>{round(sp/alltr*100)}% of trades</b> since 2025 were made by a spouse.",
     ('ACCOUNT', 'TRADES'), [(k.upper(), n(v)) for k, v in own.most_common()], ('ALL TRADES', n(alltr)),
     'HOUSE & SENATE TRADE REPORTS SINCE JAN 2025',
     f"{n(sp)} of the {n(alltr)} trades members of Congress reported since January 2025 were made by their spouses. "
     f"Another {n(own['Joint account'])} were in joint accounts and {n(own['Dependent child'])} by dependent children.\n\n"
     "The law requires all of them to be reported within 45 days.")

# 6. Missed votes (House)
hv = sorted(((1 - m['present'], m['id']) for m in MEM.values() if m['chamber'] == 'House' and m.get('elig', 0) >= 300), reverse=True)
el = max(m['elig'] for m in MEM.values() if m['chamber'] == 'House')
med = sorted(1 - m['present'] for m in MEM.values() if m['chamber'] == 'House' and m.get('elig', 0) >= 300)[len(hv)//2]
post('missed-votes', 'Most missed votes in the House',
     f"The typical House member has missed <b>{med*100:.0f}% of votes</b> this Congress. These members missed the most.",
     ('MEMBER', 'MISSED'), [(f"{nm(MEM[i])} ({tag(MEM[i])})", f"{p*100:.0f}%") for p, i in hv[:8]], ('ROLL CALL VOTES', n(el)),
     f"119TH CONGRESS · VOTES THROUGH {mon(META['asOf']['votes']).upper()}",
     f"The typical House member has missed {med*100:.0f}% of votes this Congress.\n\n"
     f"{nm(MEM[hv[0][1]])} ({tag(MEM[hv[0][1]])}) has missed {hv[0][0]*100:.0f}%, the most of any House member.",
     'Look up your representative: capitolreceipts.com')

# 7. Top fundraisers this cycle
fr = sorted(((m['money']['rec'], m['id']) for m in MEM.values() if m.get('money')), reverse=True)
def mm(x): return f"${x/1e6:.1f}M"
post('top-fundraisers', 'Top fundraisers in Congress',
     f"Members of Congress have raised <b>${sum(x for x, _ in fr)/1e9:.2f} billion</b> this election cycle. These raised the most.",
     ('MEMBER', 'RAISED'), [(f"{nm(MEM[i])} ({tag(MEM[i])})", mm(x)) for x, i in fr[:8]], ('ALL MEMBERS', f"${sum(x for x, _ in fr)/1e9:.2f}B"),
     'LATEST FEC REPORTS · 2026 ELECTION CYCLE',
     f"{nm(MEM[fr[0][1]])} ({tag(MEM[fr[0][1]])}) has raised {mm(fr[0][0])} this election cycle, the most of any member of Congress.\n\n"
     f"All members together have raised ${sum(x for x, _ in fr)/1e9:.2f} billion.",
     'See who funds your member: capitolreceipts.com')

# 8. Least party-line voters
pu = sorted((m['unity'], m['id']) for m in MEM.values() if m.get('unityN', 0) >= 200)
medu = sorted(u for u, _ in pu)[len(pu)//2]
post('party-line', 'Who breaks with their party most?',
     f"On votes that split the two parties, the typical member sides with their party <b>{medu*100:.0f}% of the time</b>. These members do it least.",
     ('MEMBER', 'WITH PARTY'), [(f"{nm(MEM[i])} ({tag(MEM[i])})", f"{u*100:.0f}%") for u, i in pu[:8]], ('TYPICAL MEMBER', f"{medu*100:.0f}%"),
     "VOTES WHERE THE PARTIES' MAJORITIES DISAGREED",
     f"On votes that split Democrats and Republicans, the typical member of Congress sides with their party {medu*100:.0f}% of the time.\n\n"
     f"{nm(MEM[pu[0][1]])} ({tag(MEM[pu[0][1]])}) does it least, at {pu[0][0]*100:.0f}%.",
     'Compare any two members: capitolreceipts.com')

# ---- render
F = lambda p: base64.b64encode(open(os.path.join(FONTS, p), 'rb').read()).decode()
FF = ''.join(f"@font-face{{font-family:'{a}';font-weight:{w};src:url(data:font/woff2;base64,{F(p)})}}" for a, w, p in [
    ('Schibsted Grotesk', 600, 'schibsted-grotesk-latin-600-normal.woff2'), ('Schibsted Grotesk', 800, 'schibsted-grotesk-latin-800-normal.woff2'),
    ('IBM Plex Mono', 500, 'ibm-plex-mono-latin-500-normal.woff2'), ('IBM Plex Mono', 700, 'ibm-plex-mono-latin-700-normal.woff2')])
DOME = open(os.path.join(os.path.dirname(__file__), '..', 'assets', 'dome_path.txt')).read()
TEETH = 'M0 0H540' + ''.join(f'L{540-13*(k+1)} {20 if k % 2 == 0 else 0}' for k in range(41)) + 'L0 0Z'
def esc(s): return str(s).replace('&', '&amp;').replace('<', '&lt;')
def html(p):
    rows = ''.join(f'<div class="r"><span class="l">{esc(a)}</span><b>{esc(b)}</b></div>' for a, b in p['rows'])
    return f'''<html><head><style>{FF}
body{{margin:0}}.c{{width:1600px;height:900px;position:relative;overflow:hidden;background:#14274e;color:#fff;font-family:'Schibsted Grotesk',sans-serif}}
.left{{position:absolute;left:90px;top:0;bottom:0;width:740px;display:flex;flex-direction:column;justify-content:center;gap:30px}}
.logo{{font-weight:800;font-size:30px;letter-spacing:-.02em;white-space:nowrap}}.logo span{{background:#c8323a;padding:.04em .3em .09em;border-radius:.22em;margin-right:.13em}}
h1{{margin:0;font-weight:800;font-size:76px;line-height:1.03;letter-spacing:-.03em}}
.lead{{font-weight:600;font-size:30px;line-height:1.35;color:#c9d3e6}}.lead b{{color:#fff;font-weight:800}}
.url{{font-weight:600;font-size:24px;margin-top:20px}}
.rc{{position:absolute;left:960px;top:-30px;width:540px;transform:rotate(-2.5deg);filter:drop-shadow(0 22px 34px rgba(0,0,0,.38))}}
.paper{{background:#fff;color:#14171c;padding:110px 40px 34px;font-family:'IBM Plex Mono',monospace;font-size:22px;font-weight:500;display:flex;flex-direction:column;gap:16px;min-height:640px;box-sizing:border-box}}
.t{{text-align:center;font-weight:700;font-size:24px;letter-spacing:.05em}}.dash{{border-top:2px dashed #14171c}}
.r{{display:flex;justify-content:space-between;gap:16px}}.l{{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}}
.h{{font-size:15px;color:#555a63}}.tot{{font-weight:700;font-size:24px;color:#c8323a}}.src{{text-align:center;font-size:14px;color:#555a63}}
</style></head><body><div class="c">
<div class="left"><div class="logo"><svg viewBox="22 11 156 147" width="1.48em" height="1.4em" fill="currentColor" style="vertical-align:-.32em;margin-right:.36em"><path d="{DOME}"/></svg><span>Capitol</span>Receipts</div>
<h1>{esc(p['title'])}</h1><div class="lead">{p['lead']}</div><div class="url">capitolreceipts.com</div></div>
<div class="rc"><div class="paper"><div class="t">{esc(RT[p['key']])}</div>
<div class="dash"></div><div class="r h"><span>{p['head'][0]}</span><span>{p['head'][1]}</span></div>{rows}
<div class="dash"></div><div class="r tot"><span>{esc(p['total'][0])}</span><span>{esc(p['total'][1])}</span></div><div class="src">{esc(p['source'])}</div></div>
<svg width="540" height="20" viewBox="0 0 540 20" preserveAspectRatio="none" style="display:block"><path fill="#fff" d="{TEETH}"/></svg></div>
</div></body></html>'''

from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1600, 'height': 900})
    for k, p in enumerate(posts, 1):
        pg.set_content(html(p)); pg.evaluate('document.fonts.ready'); pg.wait_for_timeout(150)
        p['image'] = f'post-{k}-{p["key"]}.png'; pg.screenshot(path=os.path.join(OUT, p['image']))
    b.close()
json.dump(posts, open(os.path.join(OUT, 'posts.json'), 'w'), indent=1)
with open(os.path.join(OUT, 'posts.md'), 'w') as f:
    for k, p in enumerate(posts, 1):
        f.write(f"## {k}. {p['title']}\nImage: {p['image']}\n\n{p['caption']}\n\n" + (f"Reply: {p['reply']}\n\n" if p['reply'] else ''))
print(len(posts), 'posts')
