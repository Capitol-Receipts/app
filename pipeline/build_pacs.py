"""PAC pages: who each PAC gives to, all from FEC filings (1980-2026). Adds 'pacs' to pages.json."""
import json, re, zipfile, collections, yaml
B = '/tmp/claude-0/-home-claude/5941ef03-c418-5546-a338-6ac77d8d5bda/scratchpad'
D = f'{B}/data'; H = f'{D}/hist'
ACR = re.compile(r'\b(Pac|Llc|Usa|Us|Afl-Cio|Nra|Aipac|Ibew|Seiu|Uaw|Afscme|Nea|Aft|Ups|At&T|Bnsf|Cvs|Ge|Ibm|Jp|Pnc|Kpmg|Pwc|Ey|Lpl|Hca|Nrecc|Nrsc|Dccc|Dscc|Nrcc|Rnc|Dnc|Rtx|Ii|Iii)\b', re.I)
def nice(s):
    t = re.sub(r"\b([A-Z])([A-Z']*)\b", lambda m: m.group(1) + m.group(2).lower(), s or '').replace("'S ", "'s ").strip()
    return ACR.sub(lambda m: m.group(0).upper(), t)
EMPTY = ('', 'NONE', 'N/A', 'NA', 'NONE.')

# people: FEC candidate id -> bioguide, party
fec2bg, party = {}, {}
for f in ('legislators-current.yaml', 'legislators-historical.yaml'):
    for p in yaml.safe_load(open(f'{D}/{f}')):
        bg = p['id'].get('bioguide')
        if not bg: continue
        for fid in p['id'].get('fec', []) or []: fec2bg[fid] = bg
        pt = (p.get('terms') or [{}])[-1].get('party', '')
        party[bg] = 'D' if pt.startswith('Democrat') else 'R' if pt.startswith('Republican') else 'I'

# committee master: 2026 file first, then historical names
cm = {}
z = zipfile.ZipFile(f'{D}/cm26.zip')
for line in z.read(z.namelist()[0]).decode('latin-1').splitlines():
    f = line.split('|')
    if len(f) >= 15: cm[f[0]] = {'name': f[1], 'dsgn': f[8], 'tp': f[9], 'org': f[12], 'conn': f[13], 'city': f[5], 'st': f[6], 'treas': f[2]}
CMN = json.load(open(f'{H}/cm_names.json'))   # id -> [name, type, orgtype, connected]
def meta(cid):
    if cid in cm: return cm[cid]
    n = CMN.get(cid)
    return {'name': n[0], 'dsgn': '', 'tp': n[1], 'org': n[2], 'conn': n[3], 'city': '', 'st': '', 'treas': ''} if n else None
def category(m):
    if not m: return 'Other PACs'
    if m['dsgn'] == 'D': return 'Politicians’ PACs'
    if m['tp'] in ('X', 'Y', 'Z'): return 'Party committees'
    if m['tp'] in ('H', 'S', 'P'): return 'Campaigns'
    if m['org'] in ('C', 'W'): return 'Company PACs'
    if m['org'] == 'L': return 'Labor unions'
    if m['org'] == 'T': return 'Trade groups'
    if m['org'] in ('M', 'V'): return 'Membership groups'
    return 'Issue & ideological PACs'
def display(cid, m):
    org = (m or {}).get('conn', '').strip()
    return nice(org if org and org.upper() not in EMPTY else (m or {}).get('name', cid))

# career giving 1980-2026
PACH = json.load(open(f'{H}/pac_hist.json'))
rec = collections.defaultdict(dict); other = collections.Counter(); ncand_other = collections.Counter()
for fid, gifts in PACH.items():
    bg = fec2bg.get(fid)
    for cid, (amt, a, b) in gifts.items():
        if amt <= 0: continue
        if bg:
            x = rec[cid].setdefault(bg, [0, a, b]); x[0] += amt; x[1] = min(x[1], a); x[2] = max(x[2], b)
        else:
            other[cid] += amt; ncand_other[cid] += 1

# current cycle (2025-26)
cur = collections.defaultdict(collections.Counter)
z = zipfile.ZipFile(f'{D}/pas226.zip')
for line in z.read(z.namelist()[0]).decode('latin-1').splitlines():
    f = line.split('|')
    if len(f) < 22 or f[19] == 'X' or f[5] not in ('24K', '24Z'): continue
    bg = fec2bg.get(f[16])
    if not bg: continue
    try: amt = float(f[14])
    except ValueError: continue
    cur[f[0]][bg] += amt

# which PACs to keep: any that gave to a member we show, with a meaningful total
names_shown = set()
app = json.load(open(f'{B}/data2.json'))
for m in app['members']:
    for p in m.get('pacs') or []: names_shown.add(p[0])
out = {}
for cid in set(rec) | set(cur):
    r = rec.get(cid, {}); tot_m = sum(v[0] for v in r.values()); c = cur.get(cid, {})
    m = meta(cid); nm = display(cid, m)
    if tot_m < 20000 and sum(c.values()) < 5000 and nm not in names_shown: continue
    split = collections.Counter()
    for bg, v in r.items(): split[party.get(bg, 'I')] += v[0]
    yrs = [min((v[1] for v in r.values()), default=0), max((v[2] for v in r.values()), default=0)]
    top = sorted(r.items(), key=lambda kv: -kv[1][0])
    o = {'n': nm, 'tot': round(tot_m), 'yrs': yrs, 'nr': len(r), 'cat': category(m),
         'sp': {k: round(v) for k, v in split.items()},
         'top': [[bg, round(v[0]), v[1], v[2]] for bg, v in top[:40]]}
    if m:
        if nice(m['name']) != nm: o['fn'] = nice(m['name'])
        if m.get('city'): o['loc'] = f"{nice(m['city'])}, {m['st']}"
    if other[cid]: o['oth'] = [round(other[cid]), ncand_other[cid]]
    if c:
        o['cur'] = [[bg, round(v)] for bg, v in c.most_common(30)]
        o['curT'] = round(sum(c.values())); o['curN'] = len(c)
    out[cid] = o
print('pacs kept', len(out), 'shown names matched', sum(1 for o in out.values() if o['n'] in names_shown), 'of', len(names_shown))
json.dump(out, open(f'{B}/pacs.json', 'w'), separators=(',', ':'))
hj = json.load(open(f'{B}/hist.json'))
hj['pacs'] = out
json.dump(hj, open(f'{B}/hist.json', 'w'), separators=(',', ':'))
print('pacs json bytes', len(json.dumps(out, separators=(',', ':'))))
