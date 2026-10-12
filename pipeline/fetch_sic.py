"""Look up each traded company's official industry code (SIC) from SEC filings."""
import json, sys, os, time, urllib.request, concurrent.futures as cf, threading
D = sys.argv[1]
UA = {'User-Agent': 'PaperTrail prototype research admin@kopimorehospitalitygroup.com'}
def get(url):
    for i in range(5):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r: return json.load(r)
        except Exception: time.sleep(1 + i)
tick = get('https://www.sec.gov/files/company_tickers.json')
t2c = {v['ticker'].upper(): v['cik_str'] for v in tick.values()}
hp = json.load(open(f'{D}/ptr_parsed.json')); sp = json.load(open(f'{D}/senate_ptr.json'))
import re
want = set()
for r in hp.values():
    for t in r['trades'] or []:
        if t['tick']: want.add(t['tick'].upper())
for r in sp:
    for t in r['trades']:
        tk = t['tick'] or (re.search(r'\(([A-Z.]{1,6})\)\s*$', t['asset']) or [None, None])[1]
        if tk: want.add(tk.upper())
out_fn = f'{D}/sic.json'
out = json.load(open(out_fn)) if os.path.exists(out_fn) else {}
todo = [t for t in want if t not in out and (t in t2c or t.replace('.', '-') in t2c)]
print('tickers', len(want), 'with CIK', sum(1 for t in want if t in t2c or t.replace('.', '-') in t2c), 'todo', len(todo), flush=True)
lock = threading.Lock()
def one(t):
    cik = t2c.get(t) or t2c.get(t.replace('.', '-'))
    d = get(f'https://data.sec.gov/submissions/CIK{int(cik):010d}.json')
    time.sleep(0.15)
    if d:
        with lock: out[t] = [d.get('sic'), d.get('sicDescription'), d.get('name')]
with cf.ThreadPoolExecutor(6) as ex: list(ex.map(one, todo))
json.dump(out, open(out_fn, 'w'))
print('saved', len(out))
