"""Lobbyists' own political contributions (semiannual LD-203 reports, lda.gov), matched to current members of Congress.

Usage: python fetch_ld203.py <data dir>   (needs legislators-current.yaml; caches raw pages in <data>/ld203/)
Writes <data>/ld203_members.json: {bioguide: {"t": total, "n": count, "by": [[registrant, amount], ...], "items": [[date, lobbyist, registrant, amount, type], ...]}}
"""
import collections, json, os, re, sys, time, urllib.request, concurrent.futures as cf
import yaml

D = sys.argv[1]
RAW = os.path.join(D, 'ld203'); os.makedirs(RAW, exist_ok=True)
UA = {'User-Agent': 'CapitolReceipts data (https://capitolreceipts.com)'}
YEARS = [int(y) for y in os.environ.get('LD203_YEARS', '2025,2026').split(',')]

def get(url):
    for i in range(6):
        try: return json.load(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=90))
        except Exception: time.sleep(3 * (i + 1))
    return None

def page(y, n, refresh=False):
    fn = f'{RAW}/{y}_{n:05d}.json'
    if os.path.exists(fn) and not refresh: return 'cached'
    d = get(f'https://lda.gov/api/v1/contributions/?filing_year={y}&page_size=25&page={n}')
    if d is None: return 'fail'
    keep = []
    for f in d.get('results', []):
        items = f.get('contribution_items') or []
        if not items: continue
        lob = f.get('lobbyist') or {}
        who = ' '.join(x for x in [lob.get('first_name'), lob.get('last_name')] if x) or (f.get('registrant') or {}).get('name')
        keep.append({'id': f['filing_uuid'], 'reg': (f.get('registrant') or {}).get('name'), 'who': who, 'type': f.get('filer_type'),
                     'items': [[i.get('date'), i.get('contribution_type'), i.get('payee_name'), i.get('honoree_name'), i.get('amount')] for i in items]})
    json.dump(keep, open(fn, 'w'))
    return 'ok'

tasks = []
for y in YEARS:
    first = get(f'https://lda.gov/api/v1/contributions/?filing_year={y}&page_size=25')
    if not first: continue
    pages = (first['count'] + 24) // 25
    cur_year = y == max(YEARS)
    tasks += [(y, n, cur_year and n > pages - 40) for n in range(1, pages + 1)]   # re-read the newest pages of the current year
print('pages', len(tasks), flush=True)
with cf.ThreadPoolExecutor(12) as ex:
    res = list(ex.map(lambda a: page(*a), tasks))
print('fetched', res.count('ok'), 'cached', res.count('cached'), 'failed', res.count('fail'), flush=True)

# match honorees / payees to current members
norm = lambda s: re.sub(r'[^a-z ]', ' ', (s or '').lower())
L = yaml.safe_load(open(os.path.join(D, 'legislators-current.yaml')))
idx = collections.defaultdict(list)
for l in L:
    n = l['name']; last = norm(n['last']).split()[-1]
    firsts = {norm(n['first']).strip(), norm(n.get('nickname') or '').strip(), norm((n.get('official_full') or '').split()[0] if n.get('official_full') else '').strip()} - {''}
    idx[last].append((l['id']['bioguide'], firsts, l['terms'][-1]['type'], l['terms'][-1]['state']))
def match(text):
    t = norm(text); words = t.split()
    hits = set()
    for w in words:
        for bg, firsts, typ, st in idx.get(w, []):
            if any(f in words for f in firsts): hits.add(bg)
    return hits.pop() if len(hits) == 1 else None

out = collections.defaultdict(lambda: {'t': 0, 'n': 0, 'by': collections.Counter(), 'items': []})
seen = set()
for fn in sorted(os.listdir(RAW)):
    for f in json.load(open(os.path.join(RAW, fn))):
        if f['id'] in seen: continue
        seen.add(f['id'])
        for date, typ, payee, honoree, amt in f['items']:
            try: amt = float(amt or 0)
            except ValueError: continue
            if amt <= 0 or typ not in ('feca', None): continue
            bg = match(honoree or '') or match(payee or '')
            if not bg: continue
            o = out[bg]; o['t'] += amt; o['n'] += 1; o['by'][f['reg'] or f['who']] += amt
            o['items'].append([date, f['who'], f['reg'], round(amt)])
res = {bg: {'t': round(o['t']), 'n': o['n'], 'by': [[k, round(v)] for k, v in o['by'].most_common(10)], 'items': sorted(o['items'], reverse=True)[:25]} for bg, o in out.items()}
json.dump(res, open(os.path.join(D, 'ld203_members.json'), 'w'), separators=(',', ':'))
print('members with lobbyist donations', len(res), 'total', round(sum(o['t'] for o in res.values())))
