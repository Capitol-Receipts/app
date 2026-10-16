"""How well members of Congress pick stocks: the return on every disclosed purchase since January 2025, compared with
the S&P 500 over the same days. Adds an app_meta row 'perf' to the export.

Usage: python build_perf.py <work dir> <export dir>

Method (shown in the app, kept simple on purpose):
- Each purchase with a ticker counts from the trade date's closing price to the latest close.
- The S&P 500 benchmark is SPY over exactly the same dates.
- Members report amounts in ranges, so each purchase is weighted by the middle of its range.
- Sales are scored the other way: what the stock did after they sold (a drop means they sold well).
Prices: Yahoo Finance daily closes, cached in <work>/data/prices.json and refreshed at most once every 18 hours.
"""
import datetime, gzip, json, os, sys, time, urllib.request, urllib.parse, concurrent.futures as cf

W, EXP = sys.argv[1], sys.argv[2]
PF = os.path.join(W, 'data', 'prices.json')
OUTF = os.path.join(W, 'perf.json')
START = '2024-12-15'
UA = {'User-Agent': 'Mozilla/5.0 (compatible; CapitolReceipts/1.0; +https://www.capitolreceipts.com)'}

D = json.load(open(os.path.join(W, 'data2.json')))
MEM = D['members']
mid = lambda t: ((t[4] or 0) + (t[5] or t[4] or 0)) / 2 or 1000
def norm_tick(t):
    t = (t or '').strip().upper()
    if not t or len(t) > 6 or not t.replace('.', '').replace('-', '').isalpha(): return None
    return t.replace('.', '-')  # BRK.B -> BRK-B on Yahoo

# every trade since 2025 (profiles only carry the latest 80, so read the full list extras.py saves)
FULL = os.path.join(W, 'trades_full.json')
TR = json.load(open(FULL)) if os.path.exists(FULL) else {m['id']: m.get('trades') or [] for m in MEM}

# Many reports name the company but leave out the ticker ("International Business Machines"). Match those names to
# SEC's list of listed companies; only exact or unambiguous matches count, so funds, bonds and private deals stay out.
SECF = os.path.join(W, 'data', 'sec_tickers.json')
if not os.path.exists(SECF) or time.time() - os.path.getmtime(SECF) > 7 * 86400:
    try:
        req = urllib.request.Request('https://www.sec.gov/files/company_tickers.json', headers={'User-Agent': 'CapitolReceipts data refresh admin@kopimorehospitalitygroup.com'})
        open(SECF, 'w').write(urllib.request.urlopen(req, timeout=60).read().decode())
    except Exception as e: print('sec tickers:', e)
import re
STOP = r'\b(inc|incorporated|corp|corporation|co|company|ltd|limited|plc|holdings?|group|the|class [a-z]|series [a-z]|common stock|common shares?|ordinary shares?|shares|stock|adr|ads|sponsored|n\.?v|s\.?a|ag|se|nv|sa|lp|l\.p)\b'
def nname(x):
    x = re.sub(r'\(.*?\)', ' ', (x or '').lower()).split(' - ')[0]
    x = re.sub(STOP, ' ', x); x = re.sub(r'[^a-z0-9 ]', ' ', x)
    return ' '.join(x.split())
NAME2T, PREFIX = {}, {}
try:
    for v in json.load(open(SECF)).values():
        k = nname(v['title'])
        if k and k not in NAME2T: NAME2T[k] = v['ticker'].upper()
except Exception: pass
SKIP = re.compile(r'option|call|put|note|bond|bill|treas|fund|etf|trust|lp\b|llc|coupon|matures|revenue|cd\b|certificate|bitcoin|btc|crypto', re.I)
import functools
@functools.lru_cache(maxsize=None)
def name_tick(asset):
    if not asset or SKIP.search(asset): return None
    k = nname(asset)
    if len(k) < 4: return None
    if k in NAME2T: return NAME2T[k]
    hits = [t for n, t in NAME2T.items() if n.startswith(k + ' ')] if len(k.split()) >= 2 else []
    return hits[0] if len(set(hits)) == 1 else None
def tick_of(t): return norm_tick(t[2]) or (norm_tick(name_tick(t[3])) if NAME2T else None)

tickers = set(); named = 0
for rows in TR.values():
    for t in rows:
        if t[0] and t[0] >= '2025-01-01':
            tk = tick_of(t)
            if tk: tickers.add(tk); named += 0 if norm_tick(t[2]) else 1
tickers.add('SPY')
print('trades with a stock we can price:', named, 'matched by company name')

cache = json.load(open(PF)) if os.path.exists(PF) else {'fetched': 0, 'p': {}}
P = cache['p']

def yahoo(tk, rng):
    q = urllib.parse.urlencode({'interval': '1d', 'range': rng, 'includeAdjustedClose': 'true'}) if rng else urllib.parse.urlencode({
        'interval': '1d', 'period1': int(datetime.datetime.fromisoformat(START).timestamp()), 'period2': int(time.time()), 'includeAdjustedClose': 'true'})
    for host in ('query1', 'query2'):
        for i in range(3):
            try:
                r = json.load(urllib.request.urlopen(urllib.request.Request(f'https://{host}.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(tk)}?{q}', headers=UA), timeout=30))
                res = (r.get('chart') or {}).get('result')
                if not res: return {}
                res = res[0]; ts = res.get('timestamp') or []
                adj = ((res.get('indicators') or {}).get('adjclose') or [{}])[0].get('adjclose') or (res.get('indicators') or {}).get('quote', [{}])[0].get('close') or []
                return {datetime.datetime.fromtimestamp(t, datetime.timezone.utc).strftime('%Y-%m-%d'): round(c, 4) for t, c in zip(ts, adj) if c}
            except urllib.error.HTTPError as e:
                if e.code == 404: return {}
                time.sleep(2 * (i + 1))
            except Exception:
                time.sleep(2 * (i + 1))
    return None

stale = time.time() - cache.get('fetched', 0) > 18 * 3600
todo = [t for t in tickers if t not in P] + ([t for t in tickers if t in P] if stale else [])
if todo:
    def job(tk):
        new = tk not in P
        return tk, yahoo(tk, None if new else '1mo'), new
    ok = fail = 0
    with cf.ThreadPoolExecutor(6) as ex:
        for tk, prices, new in ex.map(job, todo):
            if prices is None: fail += 1; continue
            ok += 1
            P[tk] = {**P.get(tk, {}), **prices} if not new else prices
    if ok: cache['fetched'] = time.time()
    json.dump(cache, open(PF, 'w'), separators=(',', ':'))
    print('prices: fetched', ok, 'failed', fail, 'tickers', len(tickers))

def close_on(tk, d):
    """closing price on the trade date, or the next trading day"""
    s = P.get(tk) or {}
    if not s: return None
    for i in range(6):
        x = (datetime.date.fromisoformat(d) + datetime.timedelta(days=i)).isoformat()
        if x in s: return s[x]
    return None
def last_close(tk):
    s = P.get(tk) or {}
    if not s: return None, None
    d = max(s); return d, s[d]

asof, spy_now = last_close('SPY')
perf = {}
if spy_now:
    for m in MEM:
        buys, sells = [], []
        for t in TR.get(m['id']) or []:
            tk = tick_of(t)
            if not t[0] or t[0] < '2025-01-01' or not tk or tk == 'SPY': continue
            kind = 'b' if t[1] == 'Buy' else 's' if str(t[1]).startswith('Sell') else None
            if not kind: continue
            p0, s0 = close_on(tk, t[0]), close_on('SPY', t[0])
            _, p1 = last_close(tk)
            if not (p0 and s0 and p1): continue
            r, sr = p1 / p0 - 1, spy_now / s0 - 1
            if abs(r) > 20: continue  # bad price data (splits the source missed, ticker reuse)
            (buys if kind == 'b' else sells).append((t[2] or tk, t[0], r, sr, mid(t)))
        if not buys and not sells: continue
        rec = {}
        if buys:
            w = sum(b[4] for b in buys)
            ret = sum(b[2] * b[4] for b in buys) / w; spx = sum(b[3] * b[4] for b in buys) / w
            def uniq(seq):  # one entry per stock, so three buys of the same stock don't fill the list
                seen, out = set(), []
                for x in seq:
                    if x[0] in seen: continue
                    seen.add(x[0]); out.append([x[0], x[1], round(x[2], 3)])
                    if len(out) == 3: break
                return out
            byr = sorted(buys, key=lambda b: b[2])
            best = uniq(byr[::-1]); worst = [w for w in uniq(byr) if w[0] not in {x[0] for x in best}] if len(byr) > 3 else []
            rec.update(n=len(buys), ret=round(ret, 4), spx=round(spx, 4), ex=round(ret - spx, 4), beat=round(sum(1 for b in buys if b[2] > b[3]) / len(buys), 3),
                       best=best, worst=worst)
        if sells:
            w = sum(s[4] for s in sells)
            after = sum(s[2] * s[4] for s in sells) / w; spx = sum(s[3] * s[4] for s in sells) / w
            rec.update(sn=len(sells), sret=round(after, 4), sspx=round(spx, 4))
        perf[m['id']] = rec
out = {'asOf': asof, 'since': '2025-01-01', 'm': perf, 'priced': sum(1 for t in tickers if P.get(t))}
json.dump(out, open(OUTF, 'w'))
# add to the app_meta export (a second gzip member; readers see one continuous file)
# every trade since 2025, for the full Pro download and "your stocks in Congress": {member id: [[date, type, ticker, asset, lo, hi, owner]]}
ALL = {k: [t for t in v if t[0] and t[0] >= '2025-01-01'] for k, v in TR.items()}
ALL = {k: [[t[0], t[1], t[2] or (name_tick(t[3]) or ''), t[3], t[4], t[5], t[6]] for t in v] for k, v in ALL.items() if v}
with gzip.open(os.path.join(EXP, 'app_meta.jsonl.gz'), 'at', encoding='utf-8') as f:
    f.write(json.dumps({'key': 'perf', 'value': out}, separators=(',', ':')) + '\n')
    f.write(json.dumps({'key': 'trades_all', 'value': ALL}, separators=(',', ':')) + '\n')
print('all trades:', sum(len(v) for v in ALL.values()))
print('perf:', len(perf), 'members scored, prices as of', asof)
