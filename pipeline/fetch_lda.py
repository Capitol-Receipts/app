"""Fetch quarterly lobbying reports from the LDA API (lda.gov), keep only the fields we use. Resumable."""
import json, os, sys, time, urllib.request, concurrent.futures as cf
OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
JOBS = [(2026, 'Q1'), (2026, 'Q2'), (2026, 'Q3'), (2025, 'Q4'), (2025, 'Q3')]

def get(url, tries=6):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'PaperTrail prototype'}), timeout=90) as r:
                return json.load(r)
        except Exception as e:
            time.sleep(3 * (i + 1))
    return None

def slim(f):
    acts = []
    for a in f.get('lobbying_activities') or []:
        acts.append(dict(code=a.get('general_issue_code'), desc=(a.get('description') or '')[:2000],
                         ents=[g.get('name') for g in (a.get('government_entities') or [])],
                         lob=[[l['lobbyist'].get('first_name'), l['lobbyist'].get('last_name'), l.get('covered_position'), l['lobbyist'].get('id')] for l in (a.get('lobbyists') or []) if l.get('covered_position')]))
    return dict(id=f['filing_uuid'], y=f['filing_year'], p=f['filing_type'], inc=f.get('income'), exp=f.get('expenses'),
                reg=(f.get('registrant') or {}).get('name'), cli=(f.get('client') or {}).get('name'), cid=(f.get('client') or {}).get('id'),
                url=f.get('filing_document_url'), acts=acts)

def page(y, t, n):
    fn = f'{OUT}/{y}{t}_{n:05d}.json'
    if os.path.exists(fn): return 'cached'
    d = get(f'https://lda.gov/api/v1/filings/?filing_year={y}&filing_type={t}&page_size=25&page={n}')
    if not d: return 'fail'
    json.dump([slim(f) for f in d.get('results', [])], open(fn, 'w'))
    return 'ok'

tasks = []
for y, t in JOBS:
    first = get(f'https://lda.gov/api/v1/filings/?filing_year={y}&filing_type={t}&page_size=25')
    pages = (first['count'] + 24) // 25
    tasks += [(y, t, n) for n in range(1, pages + 1)]
print('pages', len(tasks), flush=True)
done = 0; fails = 0
with cf.ThreadPoolExecutor(16) as ex:
    for res in ex.map(lambda a: page(*a), tasks):
        done += 1; fails += res == 'fail'
        if done % 200 == 0: print(done, 'fails', fails, flush=True)
print('finished', done, 'fails', fails, flush=True)
