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

tickers = set()
for m in MEM:
    for t in m.get('trades') or []:
        if t[0] and t[0] >= '2025-01-01' and norm_tick(t[2]): tickers.add(norm_tick(t[2]))
tickers.add('SPY')

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
        for t in m.get('trades') or []:
            tk = norm_tick(t[2])
            if not t[0] or t[0] < '2025-01-01' or not tk or tk == 'SPY': continue
            kind = 'b' if t[1] == 'Buy' else 's' if str(t[1]).startswith('Sell') else None
            if not kind: continue
            p0, s0 = close_on(tk, t[0]), close_on('SPY', t[0])
            _, p1 = last_close(tk)
            if not (p0 and s0 and p1): continue
            r, sr = p1 / p0 - 1, spy_now / s0 - 1
            if abs(r) > 20: continue  # bad price data (splits the source missed, ticker reuse)
            (buys if kind == 'b' else sells).append((t[2], t[0], r, sr, mid(t)))
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
with gzip.open(os.path.join(EXP, 'app_meta.jsonl.gz'), 'at', encoding='utf-8') as f:
    f.write(json.dumps({'key': 'perf', 'value': out}, separators=(',', ':')) + '\n')
print('perf:', len(perf), 'members scored, prices as of', asof)
