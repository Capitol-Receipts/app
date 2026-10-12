"""Lobbying history 1999-2026 for the biggest lobbying groups, from the LDA API (lda.gov). Resumable.
Out: data/lob_hist/<clientkey>.json  [[year, period, income, expenses, registrant, client, [issue codes]]]"""
import json, os, re, sys, time, urllib.request, urllib.parse, concurrent.futures as cf
B = os.path.dirname(os.path.abspath(__file__))
OUT = f'{B}/data/lob_hist'; os.makedirs(OUT, exist_ok=True)
P = json.load(open(f'{B}/pages.json'))
N = int(sys.argv[1]) if len(sys.argv) > 1 else 400
STOP = {'the','inc','llc','corp','corporation','co','company','lp','llp','ltd','formerly','dba'}
def ckey(n):
    n = re.sub(r'\([^)]*\)', ' ', (n or '').lower()); n = re.sub(r'[^a-z0-9 ]', ' ', n)
    return ''.join(w for w in n.split() if w not in STOP)
def get(url):
    for i in range(6):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'PaperTrail prototype'}), timeout=90) as r: return json.load(r)
        except Exception: time.sleep(3 * (i + 1))
    return None
clients = sorted(P['clients'].items(), key=lambda kv: -kv[1]['spend'])[:N]
def one(item):
    cid, c = item
    fn = f'{OUT}/{cid}.json'
    if os.path.exists(fn): return cid, 'cached'
    name = re.sub(r'\s*\([^)]*\)', '', c['n']).strip()
    q = re.sub(r'\b(Inc|LLC|Corp|Corporation|Co|Company|LLP|LP|Ltd)\.?$', '', name, flags=re.I).strip(' ,.')
    key = ckey(c['n']); rows = []; url = 'https://lda.gov/api/v1/filings/?' + urllib.parse.urlencode({'client_name': q, 'page_size': 25})
    while url:
        d = get(url)
        if not d: break
        for f in d['results']:
            cn = (f.get('client') or {}).get('name') or ''
            if ckey(cn) != key: continue
            codes = sorted({a.get('general_issue_code') for a in (f.get('lobbying_activities') or []) if a.get('general_issue_code')})
            rows.append([f['filing_year'], f['filing_type'], f.get('income'), f.get('expenses'), (f.get('registrant') or {}).get('name'), cn, codes])
        url = d.get('next')
    json.dump(rows, open(fn, 'w'))
    return cid, len(rows)
with cf.ThreadPoolExecutor(8) as ex:
    for i, r in enumerate(ex.map(one, clients)):
        if i % 20 == 0: print(i, r, flush=True)
print('done')
