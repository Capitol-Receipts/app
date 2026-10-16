"""Square (1080x1080) social graphics with captions, from the live Capitol Receipts data.

Usage: python3 scripts/social/make_squares.py <out dir> <fonts dir>
Five looks: receipt lists, one-member spotlights (with official portrait), big-number cards, party vs party, bar charts and
stock cards. Every number is read from the same public data the site shows; nothing is estimated.
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
META = {r['key']: r['value'] for r in get('app_meta?select=key,value&key=in.(trades_all,perf,asOf,tick_ind)')}
TA = {k: v for k, v in META['trades_all'].items() if k in MEM}
ASOF = META['asOf']
TODAY = datetime.date.fromisoformat(ASOF['roster'])
TICK = re.compile(r'^[A-Z][A-Z.\-]{0,6}$')

tag = lambda m: f"{m['party']}-{m['state']}"
nm = lambda m: f"{m['first']} {m['last']}"
title_of = lambda m: ('Sen.' if m['chamber'] == 'Senate' else 'Rep.')
n = lambda x: f'{x:,}'
mon = lambda d: datetime.date.fromisoformat(d).strftime('%b %-d, %Y')
money = lambda m, k: (m.get('money') or {}).get(k) or 0
def usd(x):
    if x >= 1e9: return f'${x/1e9:.2f}B'
    if x >= 1e6: return f'${x/1e6:.1f}M'
    if x >= 1e3: return f'${x/1e3:.0f}K'
    return f'${x:,.0f}'

def portrait(i):
    try:
        b = urllib.request.urlopen(f'https://unitedstates.github.io/images/congress/450x550/{i}.jpg', timeout=30).read()
        return 'data:image/jpeg;base64,' + base64.b64encode(b).decode()
    except Exception:
        return None

P = []  # every graphic: dict(kind, file, caption, reply, ...)
def add(kind, key, caption, reply=None, **kw): P.append(dict(kind=kind, key=key, caption=caption, reply=reply, **kw))

alltr = sum(len(v) for v in TA.values())

# ---------- spotlights: one member, one number
cnt = sorted(((len(v), i) for i, v in TA.items()), reverse=True)
c, i = cnt[0]; m = MEM[i]
add('spot', 'spot-most-trades', theme='navy', mid=i, label='STOCK TRADES SINCE JAN 2025', big=n(c),
    line=f'The most of any member of Congress. The next closest has {n(cnt[1][0])}.',
    caption=f"{title_of(m)} {nm(m)} ({tag(m)}) has reported {n(c)} trades since January 2025, more than any other member of Congress.")

ct = sorted(((mm['commTrades'], mm['id']) for mm in MEM.values() if mm.get('commTrades')), reverse=True)
c, i = ct[0]; m = MEM[i]
add('spot', 'spot-committee', theme='red', mid=i, label='TRADES TIED TO THEIR COMMITTEES', big=n(c),
    line='Trades in industries overseen by committees this member sits on.',
    caption=f"{title_of(m)} {nm(m)} ({tag(m)}) reported {n(c)} trades in industries overseen by their own committees, the most in Congress.\n\nTrading these stocks is legal. Disclosure is how the public can see it.")

hv = sorted(((1 - mm['present'], mm['id']) for mm in MEM.values() if mm['chamber'] == 'House' and mm.get('elig', 0) >= 300), reverse=True)
p, i = hv[0]; m = MEM[i]
add('spot', 'spot-missed', theme='paper', mid=i, label='HOUSE VOTES MISSED THIS CONGRESS', big=f'{p*100:.0f}%',
    line=f"{n(m['elig'] - m['voted'])} of {n(m['elig'])} roll call votes. The most of any House member.",
    caption=f"{title_of(m)} {nm(m)} ({tag(m)}) has missed {n(m['elig'] - m['voted'])} of {n(m['elig'])} House votes this Congress ({p*100:.0f}%), the most of any House member.")

fr = sorted(((money(mm, 'rec'), mm['id']) for mm in MEM.values()), reverse=True)
x, i = fr[0]; m = MEM[i]
add('spot', 'spot-raised', theme='navy', mid=i, label='RAISED THIS ELECTION CYCLE', big=usd(x),
    line=f"The most of any member of Congress. FEC reports through {m['money']['thru']}.",
    caption=f"{title_of(m)} {nm(m)} ({tag(m)}) has raised {usd(x)} this election cycle, the most of anyone in Congress.")

pu = sorted((mm['unity'], mm['id']) for mm in MEM.values() if mm.get('unityN', 0) >= 200)
u, i = pu[0]; m = MEM[i]
add('spot', 'spot-party', theme='red', mid=i, label=f"VOTES WITH FELLOW {'DEMOCRATS' if m['caucus']=='D' else 'REPUBLICANS'}", big=f'{u*100:.0f}%',
    line='On votes that split Democrats and Republicans. The lowest in Congress.',
    caption=f"On votes that split the two parties, {title_of(m)} {nm(m)} ({tag(m)}) sides with fellow {'Democrats' if m['caucus']=='D' else 'Republicans'} {u*100:.0f}% of the time, less than any other member of Congress.")

pf = META['perf']
rk = sorted(((r['ex'], i, r) for i, r in pf['m'].items() if r.get('n', 0) >= 5 and i in MEM), reverse=True)
e, i, r = rk[0]; m = MEM[i]; b = r['best'][0]
add('spot', 'spot-picks', theme='paper', mid=i, label='POINTS ABOVE THE S&P 500', big=f'+{e*100:.0f}',
    line=f"Stock purchases since 2025 vs. the S&P 500 over the same days. Best pick: {b[0]}, up {b[2]*100:.0f}%.",
    caption=f"{title_of(m)} {nm(m)} ({tag(m)})'s stock purchases since 2025 are up {r['ret']*100:.0f}%. The S&P 500 is up {r['spx']*100:.0f}% over the same days.\n\n"
            f"That's the best record in Congress among members with at least 5 purchases. Best pick: {b[0]}, up {b[2]*100:.0f}%.",
    reply='Full ranking and method: capitolreceipts.com/rankings/stock-picks')

pc = sorted(((money(mm, 'pac'), mm['id']) for mm in MEM.values()), reverse=True)
x, i = pc[0]; m = MEM[i]
add('spot', 'spot-pac', theme='navy', mid=i, label='FROM PACS THIS CYCLE', big=usd(x),
    line=f"{money(m,'pac')/money(m,'rec')*100:.0f}% of everything this member raised. The most PAC money in Congress.",
    caption=f"{title_of(m)} {nm(m)} ({tag(m)}) has taken {usd(x)} from PACs this election cycle, more than anyone else in Congress. That's {money(m,'pac')/money(m,'rec')*100:.0f}% of all the money raised.")

sm = sorted(((mm.get('smallShare') or 0, mm['id']) for mm in MEM.values() if money(mm, 'rec') >= 1e7), reverse=True)
s, i = sm[0]; m = MEM[i]
add('spot', 'spot-small', theme='red', mid=i, label='OF MONEY FROM SMALL DONORS', big=f'{s*100:.0f}%',
    line='Gifts of $200 or less. The highest share among members who raised $10M or more.',
    caption=f"{s*100:.0f}% of the money {title_of(m)} {nm(m)} ({tag(m)}) raised this cycle came from donors giving $200 or less, the highest share among members who raised $10 million or more.")

pv = sorted(((mm['elig'], mm['id']) for mm in MEM.values() if mm['chamber'] == 'Senate' and mm.get('elig') and mm['voted'] == mm['elig']), reverse=True)
if pv:
    e, i = pv[0]; m = MEM[i]
    add('spot', 'spot-perfect', theme='paper', mid=i, label='SENATE VOTES MISSED', big='0',
        line=f"{n(e)} of {n(e)} roll call votes cast this Congress.",
        caption=f"{title_of(m)} {nm(m)} ({tag(m)}) has voted on all {n(e)} Senate roll call votes this Congress without missing one.")

# (No 'biggest single purchase' spotlight: amended House filings can list the same trade twice with different amounts.)

# ---------- big numbers
own = collections.Counter()
for v in TA.values():
    for t in v: own[t[6]] += 1
sp = own['SP'] + own['Spouse']
add('big', 'big-spouses', theme='red', big=f'{round(sp/alltr*100)}%',
    line='of stock trades reported by members of Congress since 2025 were made by their spouses.',
    src=f'{n(sp)} OF {n(alltr)} TRADES · HOUSE & SENATE REPORTS',
    caption=f"{n(sp)} of the {n(alltr)} trades members of Congress reported since January 2025 were made by their spouses. The law requires those to be reported too.")
pacs = sum(money(mm, 'pac') for mm in MEM.values())
add('big', 'big-pacs', theme='navy', big=usd(pacs).replace('M', ' million').replace('B', ' billion'),
    line='from PACs to current members of Congress this election cycle.',
    src='FEC REPORTS · 2026 ELECTION CYCLE',
    caption=f"PACs have given {usd(pacs).replace('M',' million')} to current members of Congress this election cycle.\n\nSee which PACs fund your representative at capitolreceipts.com")
traders = len(TA)
add('big', 'big-traders', theme='paper', big=n(alltr),
    line=f'stock and bond trades reported by {traders} members of Congress since January 2025.',
    src=f'HOUSE & SENATE TRADE REPORTS THROUGH {mon(ASOF["ptr"]).upper()}',
    caption=f"{traders} members of Congress have reported {n(alltr)} trades since January 2025. Every one is on Capitol Receipts, with a link to the original filing.")

# ---------- party vs party
pt = collections.Counter(); pm_ = collections.Counter(); seats = collections.Counter(mm['party'] for mm in MEM.values())
for i, v in TA.items(): pt[MEM[i]['party']] += len(v); pm_[MEM[i]['party']] += 1
add('vs', 'vs-trades', title='Who trades more?', rows=[
    ('Members who traded', n(pm_['D']), n(pm_['R'])),
    ('Share of their party', f"{pm_['D']/seats['D']*100:.0f}%", f"{pm_['R']/seats['R']*100:.0f}%"),
    ('Trades reported', n(pt['D']), n(pt['R'])),
    ], src='TRADES REPORTED SINCE JAN 2025',
    caption=f"Since January 2025, {pm_['R']} Republicans in Congress reported {n(pt['R'])} trades. {pm_['D']} Democrats reported {n(pt['D'])}.")
pr = collections.Counter(); pp = collections.Counter(); ps = collections.Counter()
for mm in MEM.values(): pr[mm['party']] += money(mm, 'rec'); pp[mm['party']] += money(mm, 'pac'); ps[mm['party']] += money(mm, 'small')
add('vs', 'vs-money', title='Where the money comes from', rows=[
    ('Total raised', usd(pr['D']), usd(pr['R'])),
    ('From PACs', usd(pp['D']), usd(pp['R'])),
    ('From small donors', usd(ps['D']), usd(ps['R'])),
    ], src='CURRENT MEMBERS · FEC REPORTS · 2026 CYCLE',
    caption=f"Republicans in Congress have taken {usd(pp['R'])} from PACs this cycle, compared with {usd(pp['D'])} for Democrats.\n\n"
            f"Democrats have raised {usd(ps['D'])} from small donors, compared with {usd(ps['R'])} for Republicans.")

# ---------- bar chart: donor industries
skip = {'Other business', 'Retired', 'Not employed', 'Other or not listed', 'Politicians’ PACs', 'Issue & ideological groups'}
ind = collections.Counter()
for mm in MEM.values():
    for r in mm.get('industries') or []: ind[r[0]] += (r[1] or 0) + (r[2] or 0)
top = [(k, v) for k, v in ind.most_common() if k not in skip][:8]
add('bars', 'bars-industries', title='The industries funding Congress', rows=[(k, v, usd(v)) for k, v in top],
    src='DONATIONS FROM EMPLOYEES AND PACS · 2026 CYCLE',
    caption=f"The industries giving the most to current members of Congress this cycle, counting donations from their employees and PACs.\n\n{top[0][0]} leads at {usd(top[0][1])}.")

# ---------- stock cards
ind_t = META.get('tick_ind') or {}
S = collections.defaultdict(lambda: dict(t=0, mem=set(), name=collections.Counter()))
for i, v in TA.items():
    for t in v:
        if TICK.match(t[2] or ''):
            s = S[t[2]]; s['t'] += 1; s['mem'].add(i); s['name'][re.sub(r'\s*\(.*$', '', t[3]).split(' - ')[0]] += 1
for tk in sorted(S, key=lambda k: -S[k]['t'])[:2]:
    s = S[tk]; pc_ = collections.Counter(MEM[i]['party'] for i in s['mem'])
    name = re.sub(r'\s*(Common Stock|Class [A-Z].*|Inc\.?|Corporation|Corp\.?)\s*$', '', s['name'].most_common(1)[0][0]).strip().rstrip(',')
    add('stock', f'stock-{tk.lower()}', tk=tk, name=name, trades=s['t'], members=len(s['mem']), d=pc_['D'], r=pc_['R'],
        caption=f"{len(s['mem'])} members of Congress have traded {name} ({tk}) since January 2025: {pc_['D']} Democrats and {pc_['R']} Republicans, {n(s['t'])} trades in all.",
        reply=f"See every {tk} trade: capitolreceipts.com/stock/{tk}")

# ---------- receipt lists (square)
def lst(key, title, rt, head, rows, total, src, caption, reply=None):
    add('list', key, title=title, rt=rt, head=head, rows=rows, total=total, src=src, caption=caption, reply=reply)
lst('list-top-traders', 'The most active traders in Congress', 'MOST TRADES SINCE 2025', ('MEMBER', 'TRADES'),
    [(f"{nm(MEM[i])} ({tag(MEM[i])})", n(c)) for c, i in cnt[:8]], ('ALL MEMBERS', n(alltr)), 'HOUSE & SENATE REPORTS SINCE JAN 2025',
    f"The members of Congress who reported the most trades since January 2025. {nm(MEM[cnt[0][1]])} leads with {n(cnt[0][0])}.",
    'Full list: capitolreceipts.com/rankings/most-stock-trades')
since = (TODAY - datetime.timedelta(days=7)).isoformat()
fl = collections.Counter()
for mm in MEM.values():
    for f in mm.get('ptrFiles') or []:
        if f[0] >= since and f[2]: fl[mm['id']] += f[2]
if fl:
    lst('list-filed-week', 'Stock trades filed this week', 'FILED THIS WEEK', ('MEMBER', 'TRADES'),
        [(f"{nm(MEM[i])} ({tag(MEM[i])})", n(c)) for i, c in fl.most_common(8)], ('THIS WEEK', n(sum(fl.values()))),
        f"REPORTS FILED SINCE {mon(since).upper()}",
        f"{len(fl)} members of Congress filed stock trade reports this week, listing {n(sum(fl.values()))} trades.")
lst('list-picks', 'Whose stock picks beat the market?', 'BEAT THE S&P 500', ('MEMBER', 'VS S&P'),
    [(f"{nm(MEM[i])} ({tag(MEM[i])})", f"+{e*100:.0f} pts") for e, i, r in rk[:8]], ('BEAT THE S&P', f"{sum(1 for e,_,_ in rk if e>0)} of {len(rk)}"),
    'PURCHASES SINCE JAN 2025, 5 OR MORE',
    f"{sum(1 for e,_,_ in rk if e>0)} of {len(rk)} members of Congress with at least 5 stock purchases since 2025 beat the S&P 500. These beat it by the most.",
    'Full ranking and method: capitolreceipts.com/rankings/stock-picks')
lst('list-committee', 'Trading the industries they oversee', 'COMMITTEE-TIED TRADES', ('MEMBER', 'TRADES'),
    [(f"{nm(MEM[i])} ({tag(MEM[i])})", n(c)) for c, i in ct[:8]], ('ALL MEMBERS', n(sum(c for c, _ in ct))), 'TRADES SINCE JAN 2025',
    f"{len(ct)} members of Congress reported trades in industries their own committees oversee. These reported the most.",
    'Every committee-tied trade: capitolreceipts.com/rankings/committee-tied-trades')
lst('list-missed', 'Most missed votes in the House', 'MISSED VOTES · HOUSE', ('MEMBER', 'MISSED'),
    [(f"{nm(MEM[i])} ({tag(MEM[i])})", f"{p*100:.0f}%") for p, i in hv[:8]], ('ROLL CALL VOTES', n(max(mm['elig'] for mm in MEM.values() if mm['chamber']=='House'))),
    f"VOTES THROUGH {mon(ASOF['votes']).upper()}",
    "The House members who have missed the most votes this Congress.")
lst('list-raised', 'Top fundraisers in Congress', 'MOST RAISED · 2026 CYCLE', ('MEMBER', 'RAISED'),
    [(f"{nm(MEM[i])} ({tag(MEM[i])})", usd(x)) for x, i in fr[:8]], ('ALL MEMBERS', usd(sum(x for x, _ in fr))), 'LATEST FEC REPORTS',
    f"The members of Congress who have raised the most this election cycle. Together, all members have raised {usd(sum(x for x,_ in fr)).replace('B',' billion')}.")
lst('list-pacs', 'Who takes the most PAC money?', 'MOST FROM PACS', ('MEMBER', 'FROM PACS'),
    [(f"{nm(MEM[i])} ({tag(MEM[i])})", usd(x)) for x, i in pc[:8]], ('ALL MEMBERS', usd(pacs)), 'FEC REPORTS · 2026 CYCLE',
    "The members of Congress who have taken the most money from PACs this election cycle.")
lst('list-party', 'Who breaks with their party most?', 'VOTES WITH THEIR PARTY', ('MEMBER', 'WITH PARTY'),
    [(f"{nm(MEM[i])} ({tag(MEM[i])})", f"{u*100:.0f}%") for u, i in pu[:8]], ('TYPICAL MEMBER', f"{sorted(u for u,_ in pu)[len(pu)//2]*100:.0f}%"),
    "VOTES THAT SPLIT THE TWO PARTIES",
    "On votes that split Democrats and Republicans, these members side with their own party least often.")

# ---------- render
F = lambda p: base64.b64encode(open(os.path.join(FONTS, p), 'rb').read()).decode()
FF = ''.join(f"@font-face{{font-family:'{a}';font-weight:{w};src:url(data:font/woff2;base64,{F(p)})}}" for a, w, p in [
    ('Schibsted Grotesk', 600, 'schibsted-grotesk-latin-600-normal.woff2'), ('Schibsted Grotesk', 800, 'schibsted-grotesk-latin-800-normal.woff2'),
    ('IBM Plex Mono', 500, 'ibm-plex-mono-latin-500-normal.woff2'), ('IBM Plex Mono', 700, 'ibm-plex-mono-latin-700-normal.woff2'),
    ('Barlow Condensed', 800, 'barlow-condensed-latin-800-normal.woff2')])
DOME = open(os.path.join(os.path.dirname(__file__), '..', 'assets', 'dome_path.txt')).read()
esc = lambda s: str(s).replace('&', '&amp;').replace('<', '&lt;')
TH = {'navy': ('#14274e', '#ffffff', '#c9d3e6', '#c8323a'), 'red': ('#c8323a', '#ffffff', '#ffe1e1', '#14274e'), 'paper': ('#f1f2f4', '#14274e', '#4a5568', '#c8323a')}
def logo(fg, pill='#c8323a', size=28):
    return (f'<div class="logo" style="font-size:{size}px;color:{fg}"><svg viewBox="22 11 156 147" width="1.48em" height="1.4em" fill="currentColor" style="vertical-align:-.32em;margin-right:.36em"><path d="{DOME}"/></svg>'
            f'<span style="background:{pill};color:#fff">Capitol</span>Receipts</div>')
def teeth(w, h=18, c='#fff'):
    k = int(w // 13); d = f'M0 0H{w}' + ''.join(f'L{w - (w/k)*(j+1):.1f} {h if j % 2 == 0 else 0}' for j in range(k)) + 'L0 0Z'
    return f'<svg width="{w}" height="{h}" viewBox="0 0 {w} {h}" preserveAspectRatio="none" style="display:block"><path fill="{c}" d="{d}"/></svg>'
BASE = f'''{FF}body{{margin:0}}*{{box-sizing:border-box}}.c{{width:1080px;height:1080px;position:relative;overflow:hidden;font-family:'Schibsted Grotesk',sans-serif}}
.logo{{font-weight:800;letter-spacing:-.02em;white-space:nowrap}}.logo span{{padding:.04em .3em .09em;border-radius:.22em;margin-right:.13em}}
.mono{{font-family:'IBM Plex Mono',monospace}}.num{{font-family:'Barlow Condensed',sans-serif;font-weight:800;line-height:.86;letter-spacing:-.01em}}'''

def r_spot(p):
    bg, fg, soft, acc = TH[p['theme']]; m = MEM[p['mid']]; img = portrait(p['mid'])
    pill = '#c8323a' if p['theme'] != 'red' else '#14274e'
    big = p['big']; fs = 300 if len(big) <= 4 else 230 if len(big) <= 6 else 150 if len(big) <= 9 else 118
    ph = (f'<div style="position:absolute;right:0;top:0;width:470px;height:1080px;background:url({img}) center 18%/cover;filter:grayscale(1) contrast(1.08)"></div>'
          f'<div style="position:absolute;right:0;top:0;width:470px;height:1080px;background:linear-gradient(90deg,{bg} 0%,{bg}00 45%)"></div>') if img else ''
    return f'''<div class="c" style="background:{bg};color:{fg}">{ph}
<div style="position:absolute;left:72px;top:72px">{logo(fg, pill)}</div>
<div style="position:absolute;left:72px;top:250px;width:{620 if img else 936}px;display:flex;flex-direction:column;gap:26px">
<div class="mono" style="font-weight:700;font-size:22px;letter-spacing:.08em;color:{acc if p['theme']!='red' else '#fff'}">{esc(p['label'])}</div>
<div class="num" style="font-size:{fs}px">{esc(big)}</div>
<div style="font-weight:600;font-size:30px;line-height:1.35;color:{soft}">{esc(p['line'])}</div></div>
<div style="position:absolute;left:72px;bottom:72px;width:620px"><div style="font-weight:800;font-size:46px;letter-spacing:-.02em;line-height:1.05">{esc(title_of(m))} {esc(nm(m))}</div>
<div class="mono" style="font-size:22px;margin-top:10px;color:{soft}">{esc(m['partyName'] if m.get('partyName') else m['party'])} · {esc(m['state'])}{'' if m['chamber']=='Senate' else ('-' + str(m['district'] or 'AL'))} · {'SENATE' if m['chamber']=='Senate' else 'HOUSE'}</div></div></div>'''

def r_big(p):
    bg, fg, soft, acc = TH[p['theme']]
    big = p['big']; fs = 380 if len(big) <= 4 else 260 if len(big) <= 7 else 170
    return f'''<div class="c" style="background:{bg};color:{fg}">
<div style="position:absolute;left:80px;top:80px">{logo(fg, '#c8323a' if p['theme']!='red' else '#14274e')}</div>
<div style="position:absolute;left:80px;right:80px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;gap:34px">
<div class="num" style="font-size:{fs}px">{esc(big)}</div>
<div style="font-weight:800;font-size:54px;line-height:1.12;letter-spacing:-.02em">{esc(p['line'])}</div></div>
<div class="mono" style="position:absolute;left:80px;bottom:80px;font-size:20px;letter-spacing:.06em;color:{soft}">{esc(p['src'])}</div>
<div class="mono" style="position:absolute;right:80px;bottom:80px;font-size:20px;color:{soft}">capitolreceipts.com</div></div>'''

def r_vs(p):
    rows = ''.join(f'''<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:end;padding:26px 0;border-top:2px dashed #c3c7ce">
<div style="grid-column:1/3;font-weight:700;font-size:24px;color:#555a63" class="mono">{esc(a.upper())}</div>
<div class="num" style="font-size:112px;color:#1d4ea8">{esc(d)}</div><div class="num" style="font-size:112px;color:#c8323a;text-align:right">{esc(r)}</div></div>''' for a, d, r in p['rows'])
    return f'''<div class="c" style="background:#ffffff;color:#14274e">
<div style="position:absolute;left:80px;top:72px">{logo('#14274e')}</div>
<div style="position:absolute;left:80px;right:80px;top:170px">
<div style="font-weight:800;font-size:68px;letter-spacing:-.03em;line-height:1.02">{esc(p['title'])}</div>
<div style="display:flex;justify-content:space-between;margin:34px 0 4px;font-weight:800;font-size:34px"><span style="color:#1d4ea8">Democrats</span><span style="color:#c8323a">Republicans</span></div>{rows}</div>
<div class="mono" style="position:absolute;left:80px;bottom:64px;font-size:19px;letter-spacing:.06em;color:#555a63">{esc(p['src'])}</div>
<div class="mono" style="position:absolute;right:80px;bottom:64px;font-size:19px;color:#555a63">capitolreceipts.com</div></div>'''

def r_bars(p):
    mx = max(v for _, v, _ in p['rows'])
    rows = ''.join(f'''<div style="display:grid;grid-template-columns:300px 1fr;gap:20px;align-items:center">
<div style="font-weight:600;font-size:26px;text-align:right;color:#c9d3e6">{esc(k)}</div>
<div style="display:flex;align-items:center;gap:14px"><div style="height:46px;width:{v/mx*480:.0f}px;background:{'#c8323a' if j==0 else '#ffffff'};border-radius:4px"></div>
<span class="num" style="font-size:44px">{esc(t)}</span></div></div>''' for j, (k, v, t) in enumerate(p['rows']))
    return f'''<div class="c" style="background:#14274e;color:#fff">
<div style="position:absolute;left:80px;top:72px">{logo('#fff')}</div>
<div style="position:absolute;left:80px;right:80px;top:170px;font-weight:800;font-size:68px;letter-spacing:-.03em;line-height:1.02">{esc(p['title'])}</div>
<div style="position:absolute;left:40px;right:60px;top:330px;display:flex;flex-direction:column;gap:22px">{rows}</div>
<div class="mono" style="position:absolute;left:80px;bottom:64px;font-size:19px;letter-spacing:.06em;color:#c9d3e6">{esc(p['src'])}</div>
<div class="mono" style="position:absolute;right:80px;bottom:64px;font-size:19px;color:#c9d3e6">capitolreceipts.com</div></div>'''

def r_stock(p):
    tot = p['d'] + p['r'] or 1
    return f'''<div class="c" style="background:#0e1116;color:#fff">
<div style="position:absolute;left:80px;top:72px">{logo('#fff')}</div>
<div style="position:absolute;left:80px;right:80px;top:200px">
<div class="mono" style="font-weight:700;font-size:24px;letter-spacing:.1em;color:#c8323a">CONGRESS IS TRADING</div>
<div class="num" style="font-size:330px;margin-top:20px">{esc(p['tk'])}</div>
<div style="font-weight:800;font-size:46px;margin-top:6px">{esc(p['name'])}</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:56px">
<div><div class="num" style="font-size:120px">{n(p['members'])}</div><div class="mono" style="font-size:22px;color:#9aa0aa;margin-top:8px">MEMBERS TRADED IT</div></div>
<div><div class="num" style="font-size:120px">{n(p['trades'])}</div><div class="mono" style="font-size:22px;color:#9aa0aa;margin-top:8px">TRADES SINCE JAN 2025</div></div></div>
<div style="display:flex;height:22px;border-radius:11px;overflow:hidden;margin-top:48px"><div style="width:{p['d']/tot*100:.1f}%;background:#3b74d6"></div><div style="flex:1;background:#c8323a"></div></div>
<div class="mono" style="display:flex;justify-content:space-between;font-size:22px;margin-top:14px"><span style="color:#7fa6ee">{p['d']} DEMOCRATS</span><span style="color:#f07f84">{p['r']} REPUBLICANS</span></div></div></div>'''

def r_list(p):
    rows = ''.join(f'<div style="display:flex;justify-content:space-between;gap:18px"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0">{esc(a)}</span><b>{esc(b)}</b></div>' for a, b in p['rows'])
    return f'''<div class="c" style="background:#14274e;color:#fff">
<div style="position:absolute;left:72px;top:64px">{logo('#fff', size=24)}</div>
<div style="position:absolute;left:72px;right:72px;top:128px;font-weight:800;font-size:58px;letter-spacing:-.03em;line-height:1.02">{esc(p['title'])}</div>
<div style="position:absolute;left:150px;width:780px;top:300px;transform:rotate(-1.5deg);filter:drop-shadow(0 20px 30px rgba(0,0,0,.38))">
<div class="mono" style="background:#fff;color:#14171c;padding:34px 44px 26px;font-size:25px;font-weight:500;display:flex;flex-direction:column;gap:13px">
<div style="text-align:center;font-weight:700;font-size:26px;letter-spacing:.05em">{esc(p['rt'])}</div><div style="border-top:2px dashed #14171c"></div>
<div style="display:flex;justify-content:space-between;font-size:16px;color:#555a63"><span>{esc(p['head'][0])}</span><span>{esc(p['head'][1])}</span></div>{rows}
<div style="border-top:2px dashed #14171c"></div><div style="display:flex;justify-content:space-between;font-weight:700;color:#c8323a;font-size:27px"><span>{esc(p['total'][0])}</span><span>{esc(p['total'][1])}</span></div>
<div style="text-align:center;font-size:15px;color:#555a63">{esc(p['src'])}</div></div>{teeth(780)}</div></div>'''

R = dict(spot=r_spot, big=r_big, vs=r_vs, bars=r_bars, stock=r_stock, list=r_list)
order = ['spot', 'big', 'list', 'stock', 'vs', 'bars']
P.sort(key=lambda p: order.index(p['kind']))
from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1080, 'height': 1080})
    for k, p in enumerate(P, 1):
        pg.set_content(f'<html><head><style>{BASE}</style></head><body>{R[p["kind"]](p)}</body></html>')
        pg.evaluate('document.fonts.ready'); pg.wait_for_timeout(200)
        p['image'] = f'{k:02d}-{p["key"]}.png'; pg.screenshot(path=os.path.join(OUT, p['image']))
    b.close()
with open(os.path.join(OUT, 'captions.md'), 'w') as f:
    f.write(f'# Capitol Receipts posts · data as of {mon(ASOF["roster"])}\n\n')
    for p in P:
        f.write(f"## {p['image']}\n\n{p['caption']}\n\n" + (f"Reply with link: {p['reply']}\n\n" if p.get('reply') else ''))
print(len(P), 'graphics')
