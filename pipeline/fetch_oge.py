"""Match Senate-confirmed nominees to their Office of Government Ethics filings, then read the nominee
financial disclosure (outside positions, paid income) and ethics agreement (what they promised to sell or quit)."""
import json, re, sys, os, subprocess, urllib.request, concurrent.futures as cf, collections, html as H
D, DATA = sys.argv[1], sys.argv[2]
OUT = f'{D}/oge'; os.makedirs(OUT, exist_ok=True)
oge = json.load(open(f'{D}/oge.json'))
noms = json.load(open(DATA))['noms']
norm = lambda s: re.sub(r'[^a-z]', '', (s or '').lower())
byLast = collections.defaultdict(list)
for x in oge:
    last, _, first = x['name'].partition(',')
    byLast[norm(last)].append((first.strip(), x))
STOP = {'of', 'the', 'and', 'to', 'for', 'a', 'an', 'united', 'states', 'department', 'office', 'america'}
def words(s): return {w for w in re.findall(r'[a-z]+', (s or '').lower()) if w not in STOP and len(w) > 2}
def match(n):
    parts = [p for p in re.sub(r',?\s+(Jr\.?|Sr\.?|II|III|IV)$', '', n['name']).split() if p]
    if not parts: return []
    last = norm(parts[-1]); first = norm(parts[0])
    c = [(f, x) for f, x in byLast.get(last, []) if x['docDate'] >= '2024-06']
    c = [(f, x) for f, x in c if norm(f)[:1] == first[:1]]
    if not c: return []
    names = {f for f, _ in c}
    if len(names) > 1:
        pw = words(n['pos'])
        score = collections.Counter()
        for f, x in c: score[f] += len(pw & words(x['title'] + ' ' + x['agency']))
        best = score.most_common(1)[0][0]; c = [(f, x) for f, x in c if f == best]
    return [x for _, x in c]
docs = {}
for n in noms:
    m = match(n)
    if m: docs[n['id']] = m
print('matched', len(docs), 'of', len(noms), flush=True)
def link(x):
    m = re.search(r"href='([^']+\.pdf)'", x['type'], re.I)
    return m.group(1) if m else None
def kind(x): return re.sub(r'\s*\(.*', '', re.sub(r'<[^>]+>', '', x['type'])).strip()
def fetch(url):
    fn = f"{OUT}/{__import__('hashlib').md5(url.encode()).hexdigest()}.pdf"
    if not os.path.exists(fn):
        try: open(fn, 'wb').write(urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=90).read())
        except Exception: return None
    try: return subprocess.run(['pdftotext', '-layout', fn, '-'], capture_output=True, text=True, timeout=60).stdout
    except Exception: return None
PAY = re.compile(r'salary|bonus|fee|compensation|consult|severance|commission|honorari|wages|director|partnership share|distributive', re.I)
def parse278(t):
    if not t: return None
    pos, pay = [], []
    s1 = re.search(r"1\.\s*Filer's Positions Held Outside United States Government(.*?)\n\s*2\.\s*Filer's", t, re.S)
    if s1:
        for ln in s1.group(1).splitlines():
            m = re.match(r'^\s*(\d+(?:\.\d+)?)\s{2,}(.+)$', ln)
            if not m: continue
            cols = [c.strip() for c in re.split(r'\s{2,}', m.group(2)) if c.strip()]
            if len(cols) >= 4:
                org, pos_ = cols[0], cols[-3] if len(cols) >= 5 else cols[-2]
                yrs = [c for c in cols if re.match(r'^(\d{1,2}/)?\d{4}$|^Present$', c, re.I)]
                pos.append([org[:80], pos_[:60], '–'.join(yrs[:2])])
    s2 = re.search(r"2\.\s*Filer's Employment Assets & Income(.*?)\n\s*3\.\s*Filer's", t, re.S)
    if s2:
        for ln in s2.group(1).splitlines():
            m = re.match(r'^\s*(\d+(?:\.\d+)?)\s{2,}(.+)$', ln)
            if not m: continue
            cols = [c.strip() for c in re.split(r'\s{2,}', m.group(2)) if c.strip()]
            amt = cols[-1] if cols else ''
            typ = ' '.join(cols[-3:-1]) if len(cols) >= 3 else ''
            if re.match(r'^\$[\d,]+$', amt) and PAY.search(typ):
                pay.append([cols[0][:80], typ[:40], int(re.sub(r'[^\d]', '', amt))])
    return dict(positions=pos[:12], pay=sorted(pay, key=lambda p: -p[2])[:10])
def parseEA(t):
    if not t: return None
    t1 = re.sub(r'\s+', ' ', t)
    div = re.findall(r'(?:I will|will) divest (?:my|our|the)?\s*(?:interests? in|holdings? (?:of|in)|shares? (?:of|in))?\s*(.{3,140}?)(?:\s+within|\s+no later|\s+as soon|\.|;|,\s+(?:and|which))', t1)
    res = re.findall(r'(?:I will|will) resign (?:from )?(?:my|the)? ?(?:positions?|role)? ?(?:as|with|from|on)? ?(.{3,120}?)(?:\.|;|,\s+and|\s+within|\s+upon)', t1)
    GEN = re.compile(r'^(following|entities|this|that|these|resulting|entire|equity|interests?|any|all|such|my|our|the|a|an|position|positions|chairman|director|member|trustee|manager|vice|president|officer|stock|shares|funds?|assets?)\b', re.I)
    def clean(xs):
        out = []
        for x in xs:
            for part in re.split(r'[•●;]|\s\d+\.\s', x):
                part = re.sub(r'^(the|my|our)\s+', '', re.split(r'\s+Pursuant', part)[0].strip(' ,:'), flags=re.I)
                if 3 <= len(part) <= 80 and re.search(r'[A-Z]', part) and not GEN.match(part) and part not in out: out.append(part)
        return out[:8]
    return dict(divest=clean(div), resign=clean(res))
results = {}
def work(item):
    nid, xs = item
    lst = []
    for x in sorted(xs, key=lambda x: x['docDate']):
        lst.append([x['docDate'][:10], kind(x), link(x), x['title'], x['agency']])
    r = dict(docs=lst, waivers=sum(1 for x in xs if 'Waiver' in kind(x)))
    n278 = [d for d in lst if d[1] == 'Nominee 278' and d[2]]
    ea = [d for d in lst if d[1] == 'Ethics Agreement' and d[2]]
    if n278: r['n278'] = parse278(fetch(n278[-1][2]))
    if ea: r['ea'] = parseEA(fetch(ea[-1][2]))
    return nid, r
with cf.ThreadPoolExecutor(6) as ex:
    for nid, r in ex.map(work, docs.items()): results[nid] = r
json.dump(results, open(f'{D}/oge_parsed.json', 'w'))
print('saved', len(results), 'with 278', sum(1 for r in results.values() if r.get('n278')), 'with EA', sum(1 for r in results.values() if r.get('ea')))
