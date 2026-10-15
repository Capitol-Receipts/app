"""Company pages: one record per company tying together its PAC, lobbying, employees' donations,
members of Congress who trade its stock, federal contracts (USAspending.gov) and ex-government lobbyists.

Usage: python build_companies.py <work dir with data2.json, hist.json, pages.json, data/donors26.json, data/sic.json> <out dir>
Writes companies.json (and companies.jsonl.gz into EXPORT_DIR when set).
"""
import collections, gzip, json, os, re, sys, time, urllib.request

W = sys.argv[1] if len(sys.argv) > 1 else '.'
OUT = sys.argv[2] if len(sys.argv) > 2 else W
J = lambda *p: json.load(open(os.path.join(W, *p)))
D, H, G = J('data2.json'), J('hist.json'), J('pages.json')
DON = J('data', 'donors26.json'); SIC = J('data', 'sic.json')

STOP = r'\b(the|inc|incorporated|corp|corporation|company|co|plc|llc|lp|llp|ltd|limited|holdings?|group|international|intl|n\.?v|s\.?a|ag|se|class [abc]|common stock|ordinary shares?|american depositary shares?|ads|adr|and (its )?(various )?(subsidiaries|affiliates)|& (its )?(subsidiaries|affiliates)|subsidiaries|affiliates|dba .*|f/k/a .*|formerly .*|political action committee|pac|employees?|federal|good government fund|fund|usa|u\.s\.a|us|of america|north america|services|svcs|client services|com|platforms|separate segregated)\b'
def key(s):
    s = (s or '').lower().replace('&amp;', '&')
    s = re.sub(r'\(.*?\)', ' ', s)
    s = re.sub(r'\s*/[a-z]{2}/?\s*$', ' ', s)   # SEC state-of-incorporation suffix: "APPLIED MATERIALS INC /DE"
    s = re.sub(r'\s[-–]\s.*$', ' ', s)
    s = re.sub(STOP, ' ', s)
    s = re.sub(r'[^a-z0-9& ]', ' ', s)
    s = re.sub(r'\s+', ' ', s).strip(' &')
    s = re.sub(r'\s(and|&)$', '', s)
    s = ALIAS.get(s, s)
    return s
ALIAS = {'google': 'alphabet', 'amazon': 'amazon', 'amazon com': 'amazon', 'exxonmobil': 'exxon mobil', 'pricewaterhousecoopers i': 'pricewaterhousecoopers', 'pwc': 'pricewaterhousecoopers',
         'lockheed': 'lockheed martin', 'jpmorgan chase holdings': 'jpmorgan chase', 'jp morgan chase': 'jpmorgan chase', 'jpmorgan': 'jpmorgan chase',
         'walt disney': 'disney', 'coca cola': 'coca cola', 'at t': 'at&t', 'rtx and': 'rtx', 'raytheon technologies': 'rtx', 'raytheon': 'rtx',
         'berkshire hathaway energy': 'berkshire hathaway', 'johnson & johnson': 'johnson & johnson', 'procter & gamble': 'procter & gamble',
         'unitedhealth': 'unitedhealth', 'cvs health': 'cvs health', 'cvs': 'cvs health', 'meta': 'meta', 'facebook': 'meta'}
def nice(s):
    if s and s == s.upper(): s = s.title()
    return re.sub(r'\s+', ' ', s or '').strip()

co = collections.defaultdict(lambda: {'names': collections.Counter(), 'src': set()})
def add(k, name, src, w=1):
    if not k or len(k) < 3: return None
    c = co[k]; c['names'][nice(name)] += w; c['src'].add(src); return c

# 1. stock trades by current members (since Jan 2025)
trade_by = collections.defaultdict(list)
for m in D['members']:
    ov = set((m.get('oversees') or {}).keys())
    for t in m.get('trades') or []:
        date, typ, tick, asset, lo, hi, owner, ind = (t + [None] * 8)[:8]
        if not tick or not re.match(r'^[A-Z.]{1,6}$', tick): continue
        nm = (SIC.get(tick) or [None, None, None])[2] or asset
        k = key(nm)
        c = add(k, nm, 'trades')
        if not c: continue
        c.setdefault('ticks', collections.Counter())[tick] += 1
        c['ind'] = ind or c.get('ind'); c['sic'] = (SIC.get(tick) or [None, None])[1] or c.get('sic')
        trade_by[k].append((m['id'], date, typ, lo or 0, hi or 0, bool(ind and ind in ov)))

# 2. lobbying clients
for cid, cl in G['clients'].items():
    c = add(key(cl['n']), cl['n'], 'lobby', 3)
    if c:
        if c.get('lob_id') is None or G['clients'][c['lob_id']]['spend'] < cl['spend']: c['lob_id'] = cid

# 3. company PACs
for pid, p in H['pacs'].items():
    if p.get('cat') != 'Company PACs': continue
    c = add(key(p['n']), p['n'], 'pac', 2)
    if c and (c.get('pac_id') is None or H['pacs'][c['pac_id']]['tot'] < p['tot']): c['pac_id'] = pid

# 4. employees' itemized gifts to current members (each member's top employers)
emp = collections.defaultdict(lambda: [0, 0, set()])
for bg, d in DON.items():
    for name, amt, n in d.get('employers') or []:
        k = key(name)
        if k in co:
            e = emp[k]; e[0] += amt; e[1] += n; e[2].add(bg)

# keep real companies: two or more sources, or large in one
keep = {}
for k, c in co.items():
    lob = G['clients'][c['lob_id']]['spend'] if c.get('lob_id') else 0
    traders = len({x[0] for x in trade_by.get(k, [])})
    pac = H['pacs'][c['pac_id']]['tot'] if c.get('pac_id') else 0
    corp = bool(c.get('ticks')) or bool(c.get('pac_id')) or (c.get('lob_id') and re.search(r'\b(inc|corp|corporation|company|co|llc|plc|ltd|l\.?p)\b\.?', G['clients'][c['lob_id']]['n'], re.I))
    if not corp or re.search(r'\b(association|council|institute|federation|alliance|coalition|union|society|chamber|roundtable|league|foundation|university|college|hospital|aarp|city of|county|state of)\b', ' '.join(c['names']), re.I) and not c.get('ticks'):
        continue
    if len(c['src']) >= 2 or lob >= 1_000_000 or traders >= 4 or pac >= 1_000_000:
        keep[k] = c
print('companies', len(keep))

# 5. federal contracts and grants, FY2025–26 (USAspending)
CACHE = os.path.join(W, 'usaspending_cache.json')
cache = json.load(open(CACHE)) if os.path.exists(CACHE) else {}
def contracts(name):
    if name in cache: return cache[name]
    body = json.dumps({'filters': {'time_period': [{'start_date': '2024-10-01', 'end_date': '2026-09-30'}], 'recipient_search_text': [name]}, 'limit': 5}).encode()
    for attempt in range(3):
        try:
            req = urllib.request.Request('https://api.usaspending.gov/api/v2/search/spending_by_category/recipient/', data=body, headers={'Content-Type': 'application/json'})
            res = json.loads(urllib.request.urlopen(req, timeout=60).read())['results']
            kn = key(name)
            hits = [r for r in res if key(r['name']) == kn or key(r['name']).startswith(kn + ' ')]
            out = {'amt': round(sum(r['amount'] for r in hits)), 'names': [r['name'] for r in hits][:3]} if hits else {'amt': 0}
            if hits:
                body2 = json.dumps({'filters': {'time_period': [{'start_date': '2024-10-01', 'end_date': '2026-09-30'}], 'recipient_search_text': [hits[0]['name']]}, 'limit': 5}).encode()
                req2 = urllib.request.Request('https://api.usaspending.gov/api/v2/search/spending_by_category/awarding_agency/', data=body2, headers={'Content-Type': 'application/json'})
                out['ag'] = [[a['name'], round(a['amount'])] for a in json.loads(urllib.request.urlopen(req2, timeout=60).read())['results']][:5]
            cache[name] = out; return out
        except Exception as e:
            time.sleep(3 * (attempt + 1))
    return None

rows = []
for i, (k, c) in enumerate(sorted(keep.items(), key=lambda kv: -len(kv[1]['src']))):
    tk = (c.get('ticks') or collections.Counter()).most_common(1)
    name = nice(SIC[tk[0][0]][2]) if tk and SIC.get(tk[0][0]) else nice(H['pacs'][c['pac_id']]['n']) if c.get('pac_id') else nice(G['clients'][c['lob_id']]['n']) if c.get('lob_id') else c['names'].most_common(1)[0][0]
    name = re.sub(r'(?i)\s*(,?\s*(and|&)\s+(its\s+)?(various\s+)?(subsidiaries|affiliates).*|\s+separate segregated fund.*|\s*\(.*?\)|\s+political action committee.*|\s+employees?\b.*pac.*|\s+/[a-z]{2,3}/?$)', '', name)
    name = re.sub(r'(?i)^the\s+', 'The ', name)
    for _ in range(2): name = re.sub(r'(?i),?\s+(Inc\.?|Incorporated|Corp\.?|Corporation|Co\.?|Company|LLC|L\.L\.C\.|PLC|Ltd\.?|Holdings|N\.V\.|S\.A\.|Common Stock|Class [ABC])$', '', name).strip(' ,.')
    name = name.strip(' &/,.')
    name = re.sub(r'\s*&$', '', name).strip()
    if sum(w.isupper() and len(w) > 3 for w in name.split()) >= 1 and not re.search(r'[a-z]', name): name = name.title()
    name = re.sub(r'\b([A-Z]{2,})\b', lambda m: m.group(1) if len(m.group(1)) <= 4 else m.group(1).title(), name)
    name = {'Amazon Com': 'Amazon', 'Amazon.Com': 'Amazon', 'Pricewaterhousecoopers': 'PwC', 'Bae Systems': 'BAE Systems', 'Ubs Americas': 'UBS Americas', 'Fedex': 'FedEx', 'Exxon Mobil': 'ExxonMobil', 'Unitedhealth Group': 'UnitedHealth Group', 'Nextera Energy': 'NextEra Energy'}.get(name, name)
    name = re.sub(r'\s+And$', '', name)
    name = re.sub(r'(?<=\w) (Of|And|The|For|In) ', lambda m: ' ' + m.group(1).lower() + ' ', name)
    name = {'Csx': 'CSX', 'Cme Group': 'CME Group', 'Conocophillips': 'ConocoPhillips', 'Novartis Ag': 'Novartis', 'L3HARRIS Technologies': 'L3Harris Technologies', 'Coca Cola': 'Coca-Cola', 'Southern': 'Southern Company', 'Enterprise': 'Enterprise Products', 'Koch': 'Koch Industries'}.get(name, name)
    name = name.replace('Jpmorgan', 'JPMorgan').replace('At&T', 'AT&T').replace('Rtx', 'RTX').replace('Ibm', 'IBM').replace('Cvs ', 'CVS ').replace('Ups', 'UPS')
    tr = trade_by.get(k, [])
    by_mem = collections.defaultdict(lambda: [0, 0, 0, '', False])
    for bg, date, typ, lo, hi, tied in tr:
        x = by_mem[bg]; x[0] += 1; x[1] += lo; x[2] += hi; x[3] = max(x[3], date or ''); x[4] = x[4] or tied
    lob = G['clients'].get(c.get('lob_id')) if c.get('lob_id') else None
    pac = H['pacs'].get(c.get('pac_id')) if c.get('pac_id') else None
    e = emp.get(k)
    rec = {'id': re.sub(r'[^a-z0-9]+', '-', k).strip('-'), 'n': name, 'k': k,
           'ticks': [t for t, _ in (c.get('ticks') or collections.Counter()).most_common(3)], 'ind': c.get('ind'), 'sic': c.get('sic'),
           'tr': sorted([[bg, *v] for bg, v in by_mem.items()], key=lambda r: -r[1]), 'trN': len(tr), 'trTied': sum(1 for x in tr if x[5]),
           'lob': c.get('lob_id'), 'lobS': lob['spend'] if lob else 0, 'lobIss': (lob.get('iss') or [])[:5] if lob else [],
           'lobBills': (lob.get('bills') or [])[:8] if lob else [], 'lobN': lob.get('nlob', 0) if lob else 0,
           'rev': [[n, j[:160]] for n, j in (lob.get('lob') or [])][:12] if lob else [],
           'pac': c.get('pac_id'), 'pacT': pac['tot'] if pac else 0, 'pacCur': pac.get('curT', 0) if pac else 0, 'pacSp': pac.get('sp') if pac else None,
           'pacTop': (pac.get('cur') or [])[:10] if pac else [],
           'emp': [e[0], e[1], len(e[2])] if e else None}
    rows.append(rec)

# contracts for the companies people are most likely to look up
rows.sort(key=lambda r: -(r['lobS'] + r['pacT'] + r['trN'] * 20000))
from concurrent.futures import ThreadPoolExecutor
todo = rows[:int(os.environ.get('CONTRACT_LIMIT', '700'))]
with ThreadPoolExecutor(8) as ex:
    for i, (r, x) in enumerate(zip(todo, ex.map(lambda r: contracts(r['n']), todo))):
        if x: r['gov'] = x
        if i % 100 == 0:
            json.dump(dict(cache), open(CACHE, 'w')); print('contracts', i, flush=True)
json.dump(cache, open(CACHE, 'w'))
seen = collections.Counter()
for r in rows:
    seen[r['id']] += 1
    if seen[r['id']] > 1: r['id'] += f'-{seen[r["id"]]}'
json.dump(rows, open(os.path.join(OUT, 'companies.json'), 'w'), separators=(',', ':'))
exp = os.environ.get('EXPORT_DIR')
if exp:
    with gzip.open(os.path.join(exp, 'companies.jsonl.gz'), 'wt', encoding='utf-8') as f:
        for r in rows:
            score = r['lobS'] + r['pacT'] + r['trN'] * 20000 + (r.get('gov') or {}).get('amt', 0) / 100
            f.write(json.dumps({'id': r['id'], 'name': r['n'], 'score': round(score), 'tickers': r['ticks'], 'data': r}, separators=(',', ':'), ensure_ascii=False) + '\n')
print('wrote', len(rows), 'with contracts', sum(1 for r in rows if (r.get('gov') or {}).get('amt')))
