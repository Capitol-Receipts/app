"""Aggregate itemized individual contributions (FEC indiv26) by donor employer for each sitting member's campaign committees."""
import zipfile, io, re, sys, json, collections, yaml
sys.path.insert(0, __import__("os").path.dirname(__file__) or ".")
from industry import classify
ind = collections.defaultdict(collections.Counter)
cache = {}
D = sys.argv[1]
L = yaml.safe_load(open(f'{D}/legislators-current.yaml'))
cand = {}
for l in L:
    for f in l['id'].get('fec', []): cand[f] = l['id']['bioguide']
cm2bg = {}
z = zipfile.ZipFile(f'{D}/ccl26.zip')
for line in z.read(z.namelist()[0]).decode('latin-1').splitlines():
    f = line.split('|')
    if len(f) > 5 and f[0] in cand and f[5] in ('P', 'A'): cm2bg[f[3]] = cand[f[0]]
print('committees', len(cm2bg), flush=True)
SKIP = re.compile(r'^(RETIRED|NONE|N/?A|NOT EMPLOYED|UNEMPLOYED|SELF[- ]?EMPLOYED|SELF|HOMEMAKER|INFORMATION REQUESTED.*|REQUESTED|STUDENT|DISABLED|NOT APPLICABLE|ENTREPRENEUR|\.|-|)$')
def norm(e):
    e = re.sub(r'[.,]', '', e.upper()).strip()
    e = re.sub(r'\s+(INC|LLC|LLP|CORP|CORPORATION|CO|COMPANY|LTD|PC|PLLC|LP|PA)$', '', e).strip()
    e = re.sub(r'^THE\s+', '', e)
    return e
emp = collections.defaultdict(collections.Counter); empn = collections.defaultdict(collections.Counter)
item = collections.Counter(); instate = collections.Counter(); donors = collections.Counter()
st = {l['id']['bioguide']: l['terms'][-1]['state'] for l in L}
z = zipfile.ZipFile(f'{D}/indiv26.zip')
name = 'itcont.txt'
n = 0
with z.open(name) as fh:
    for raw in io.TextIOWrapper(fh, encoding='latin-1'):
        n += 1
        if n % 5000000 == 0: print(n, flush=True)
        i = raw.find('|')
        cm = raw[:i]
        if cm not in cm2bg: continue
        f = raw.split('|')
        if f[18] == 'X' or f[5] in ('15C', '22Y', '15J'): continue
        try: amt = float(f[14])
        except ValueError: continue
        if amt <= 0: continue
        bg = cm2bg[cm]
        item[bg] += amt; donors[bg] += 1
        if f[9] == st[bg]: instate[bg] += amt
        ck = (f[11], f[12])
        c = cache.get(ck)
        if c is None:
            c = classify(f[11], f[12])
            if len(cache) < 3000000: cache[ck] = c
        ind[bg][c] += amt
        e = norm(f[11])
        if not SKIP.match(e): emp[bg][e] += amt; empn[bg][e] += 1
print('rows', n, flush=True)
out = {bg: dict(itemized=round(item[bg]), instateItem=round(instate[bg]), donations=donors[bg],
                employers=[[e, round(v), empn[bg][e]] for e, v in emp[bg].most_common(12)], industries=[[k, round(v)] for k, v in ind[bg].most_common()]) for bg in item}
json.dump(out, open(f'{D}/donors26.json', 'w'))
print('members', len(out))
