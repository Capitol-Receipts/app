"""Export the app's data into one gzipped JSON-lines file per Supabase table.

Large collections are split into `light` (what lists, search and rankings need)
and `detail` (what only a full profile page needs), so the app downloads the
light index up front and fetches detail one record at a time.
"""
import json, gzip, os, sys

SRC = sys.argv[1] if len(sys.argv) > 1 else '.'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'data/export'
os.makedirs(OUT, exist_ok=True)
J = lambda f: json.load(open(os.path.join(SRC, f)))
D, H, G = J('data2.json'), J('hist.json'), J('pages.json')
PHOTOS = J('data/photos.json')
counts = {}

def write(table, rows):
    with gzip.open(os.path.join(OUT, f'{table}.jsonl.gz'), 'wt', encoding='utf-8') as f:
        for r in rows:
            f.write(json.dumps(r, separators=(',', ':'), ensure_ascii=False) + '\n')
    counts[table] = len(rows)

def split(rec, heavy):
    light = {k: v for k, v in rec.items() if k not in heavy}
    detail = {k: v for k, v in rec.items() if k in heavy}
    return light, detail

# ---- people & careers: keep small stand-ins for the heavy fields the list code totals up
P_HEAVY = {'bl', 'pacc', 'th', 'v', 'fec', 'wx', 'w', 'kv', 'gt', 'ic', 'desc', 'os', 'bp', 'ptr', 'vs', 'wl', 'soc'}
def person_light(p):
    light, detail = split(p, P_HEAVY)
    v = p.get('v') or []
    if v:
        light['v'] = [[0, '', sum(x[2] for x in v), sum(x[3] for x in v), sum(x[4] for x in v), sum(x[5] for x in v)]]
    if p.get('bl'):
        light['bl'] = {'n': p['bl'].get('n'), 'law': p['bl'].get('law')}
    if p.get('fec'):
        light['fec'] = [[0, sum(x[1] for x in p['fec'])]]
    return light, detail

PARTY = lambda s: 'D' if (s or '').startswith('Democrat') else 'R' if (s or '').startswith('Republican') else 'I' if (s or '').startswith('Independent') else 'O'
rows = []
for i, p in enumerate(H['people']):
    l, d = person_light(p)
    rows.append({'id': p['id'], 'name': p['n'], 'party': PARTY(p.get('lp')), 'first_year': p.get('fy'), 'last_year': p.get('ly'), 'ord': i, 'light': l, 'detail': d})
write('people', rows)
write('careers', [dict(zip(('id', 'name', 'light', 'detail'), (k, p['n'], *person_light(p)))) for k, p in H['current'].items()])

# ---- appointees
A_HEAVY = {'oge', 'wx', 'car', 'edu', 'ogt', 'src', 'wt', 'desc', 'bp'}
rows = []
for i, a in enumerate(H['apps']):
    l, d = split(a, A_HEAVY)
    if a.get('oge'): l['oge'] = {}
    rows.append({'id': a['id'], 'name': a['n'], 'ord': i, 'light': l, 'detail': d})
write('appointees', rows)

# ---- bills: array; summary, committees, latest action and votes are detail
B_DETAIL = (8, 9, 12, 13)
rows = []
for k, b in H['bills'].items():
    c, ty, n = k.split('-')
    light = [None if i in B_DETAIL else x for i, x in enumerate(b)]
    detail = {str(i): b[i] for i in B_DETAIL if i < len(b)}
    law = (b[10] or {}).get('L') if isinstance(b[10], dict) else None
    rows.append({'key': k, 'congress': int(c), 'bill_type': ty, 'number': int(n), 'title': b[1] or b[0], 'became_law': law if law and len(law) == 10 else None, 'light': light, 'detail': detail})
write('bills', rows)

# ---- PACs
PAC_HEAVY = {'top', 'cur', 'oth', 'loc'}
write('pacs', [{'id': k, 'name': p['n'], 'category': p.get('cat'), 'total': p.get('tot'), 'cycle_total': p.get('curT'),
                'light': split(p, PAC_HEAVY)[0], 'detail': split(p, PAC_HEAVY)[1]} for k, p in H['pacs'].items()])

# ---- lobbying
C_HEAVY = {'fil', 'lob', 'ex', 'firms', 'ents', 'bills', 'q', 'yh', 'issAll'}
rows = []
for k, c in G['clients'].items():
    l, d = split(c, C_HEAVY | {'iss'})
    l['iss'] = (c.get('iss') or [])[:3]
    d['iss'] = c.get('iss') or []
    rows.append({'id': k, 'name': c['n'], 'spend': round(c.get('spend') or 0), 'light': l, 'detail': d})
write('lobby_clients', rows)
write('lobby_firms', [{'id': k, 'name': f['n'], 'income': round(f.get('inc') or 0), 'data': f} for k, f in G['firms'].items()])
# ethics ids: 'e' + the full slug of the statement URL (unique; the app builds links the same way)
import re
seen, rows = set(), []
for i, e in enumerate(G['ethics']):
    eid = 'e' + re.sub(r'[^a-z0-9]', '', (e.get('url') or '').rstrip('/').split('/')[-1].lower())
    if eid in seen: eid += '-' + (e.get('d') or str(i)).replace('-', '')
    while eid in seen: eid += 'x'
    seen.add(eid); e = dict(e, id=eid)
    rows.append({'id': eid, 'title': e['t'], 'ord': i, 'data': e})
write('ethics_matters', rows)
write('committees', [{'id': k, 'name': c.get('n') or c.get('short') or k, 'data': c} for k, c in G['comm'].items()])

# ---- current snapshot
write('members', [{'id': m['id'], 'name': m['name'], 'party': m['party'], 'state': m['state'], 'chamber': m['chamber'], 'district': m.get('district') or None, 'ord': i, 'data': m} for i, m in enumerate(D['members'])])
write('nominations', [{'id': n['id'], 'name': n['name'], 'position': n.get('pos'), 'confirmed_on': n.get('d') or None, 'ord': i, 'data': n} for i, n in enumerate(D['noms'])])
write('roll_calls', [{'id': k, 'chamber': 'Senate' if k[0] == 'S' else 'House', 'voted_on': r.get('d') or None, 'bill': r.get('b'), 'question': r.get('q'), 'result': r.get('res'),
                      'yeas': r.get('y'), 'nays': r.get('n'), 'ord': i, 'data': r} for i, (k, r) in enumerate(D['rc'].items())])
write('photos', [{'id': k, 'img': v} for k, v in PHOTOS.items()])

# ---- ZIP codes -> House districts (Census 119th Congress relationship file)
rows = []
for e in open(os.path.join(SRC, 'zipcd.txt')).read().split(','):
    if len(e) >= 8:
        rows.append({'zip': e[:5], 'state': e[5:7], 'districts': [int(x) for x in e[7:].split('.')]})
write('zip_districts', rows)

# ---- small app-wide sets
meta = {k: D[k] for k in ('asOf', 'months', 'passage', 'lobby', 'parties')}
meta['lobbied_bills'] = D['bills']
for k in ('control', 'kv', 'PK', 'meta', 'curApps'):
    meta['hist_' + k] = H[k]
for k in ('leaders', 'mc', 'issue'):
    meta['pages_' + k] = G[k]
# stock ticker -> industry (from SEC industry codes), for industry and stock pages
def sic_industry(code):
    try: c = int(code)
    except (TypeError, ValueError): return None
    R = [((1300, 1399), 'Oil, gas & energy'), ((2900, 2999), 'Oil, gas & energy'), ((4900, 4999), 'Oil, gas & energy'), ((1200, 1299), 'Oil, gas & energy'),
         ((2830, 2836), 'Drug & medical companies'), ((3841, 3851), 'Drug & medical companies'), ((5120, 5129), 'Drug & medical companies'), ((8000, 8099), 'Hospitals & health care'),
         ((6300, 6411), 'Insurance'), ((6500, 6553), 'Real estate'), ((6798, 6798), 'Real estate'), ((6000, 6299), 'Finance & investing'), ((6700, 6799), 'Finance & investing'),
         ((3570, 3579), 'Tech'), ((3600, 3699), 'Tech'), ((7370, 7379), 'Tech'), ((4800, 4899), 'Telecom & media'), ((2700, 2799), 'Telecom & media'), ((7800, 7899), 'Telecom & media'),
         ((3720, 3729), 'Defense & aerospace'), ((3760, 3769), 'Defense & aerospace'), ((3812, 3812), 'Defense & aerospace'), ((3480, 3489), 'Defense & aerospace'),
         ((3710, 3716), 'Transportation'), ((4000, 4799), 'Transportation'), ((1500, 1799), 'Construction'), ((100, 999), 'Farming & food'), ((2000, 2099), 'Farming & food'), ((5140, 5149), 'Farming & food')]
    for (a, b), n in R:
        if a <= c <= b: return n
    return 'Other business'
try:
    SIC = J('data/sic.json')
    meta['tick_ind'] = {t: [sic_industry(v[0]), v[2]] for t, v in SIC.items() if v and v[0]}
except Exception as e:
    print('no ticker industries:', e)
write('app_meta', [{'key': k, 'value': v} for k, v in meta.items()])
print(json.dumps(counts))
