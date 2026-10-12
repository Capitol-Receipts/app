"""Historical layer for PaperTrail.
Sources (all public): unitedstates/congress-legislators (current, historical, executive, social media),
Voteview (members, roll calls, votes for every Congress since 1789), FEC candidate summaries 1980-2026,
House Clerk financial disclosure indexes 2008-2024, GovInfo BILLSTATUS (108th-119th), Federal Judicial Center
judges database, Wikidata officeholders, Office of Government Ethics filing index, Wikipedia summaries.
Out: hist.json
"""
import collections, csv, json, os, re, zipfile
import xml.etree.ElementTree as ET
import yaml

B = os.path.dirname(os.path.abspath(__file__))
D = f'{B}/data'
H = f'{D}/hist'
Y = lambda f: yaml.load(open(f), Loader=yaml.CLoader)
cur = Y(f'{D}/legislators-current.yaml')
his = Y(f'{D}/legislators-historical.yaml')
exe = Y(f'{H}/executive.yaml')
soc = {s['id']['bioguide']: s.get('social', {}) for s in Y(f'{H}/social.yaml')}
wiki = json.load(open(f'{H}/wiki.json')) if os.path.exists(f'{H}/wiki.json') else {}
app = json.load(open(f'{B}/data2.json'))
CUR = {m['id'] for m in app['members']}
yr = lambda d: int(d[:4]) if d else None


def norm(s):
    return re.sub(r'[^a-z]', '', (s or '').lower())


# ---------- Voteview members ----------
vv = collections.defaultdict(list)  # bioguide -> rows
icp2bio = {}
for r in csv.DictReader(open(f'{H}/HSall_members.csv')):
    if r['chamber'] == 'President':
        continue
    b = r['bioguide_id']
    if not b:
        continue
    vv[b].append(r)
    icp2bio[r['icpsr']] = b
stats = json.load(open(f'{H}/mc_stats.json'))
import bisect
NOMG = collections.defaultdict(list)
for b_, rows_ in vv.items():
    for r in rows_:
        if r['nominate_dim1']:
            NOMG[(r['congress'], r['chamber'])].append(float(r['nominate_dim1']))
for k in NOMG:
    NOMG[k].sort()

# ---------- FEC 1980-2026 ----------


def load_weball(y):
    out = {}
    z = zipfile.ZipFile(f'{H}/weball{y:02d}.zip')
    for line in z.read(z.namelist()[0]).decode('latin-1').splitlines():
        f = line.split('|')
        if len(f) < 27:
            continue
        n = lambda i: float(f[i] or 0) if re.match(r'^-?[\d.]+$', f[i] or '0') else 0.0
        out[f[0]] = (round(n(5)), round(n(17)), round(n(25)), round(n(7)))
    return out


CYC = [y % 100 for y in range(1980, 2027, 2)]
FEC = {}
for y in CYC:
    try:
        FEC[y] = load_weball(y)
    except FileNotFoundError:
        pass
print('fec cycles', len(FEC))


def fec_hist(ids, chamber_pref=None):
    out = []
    for y in CYC:
        if y not in FEC:
            continue
        rows = [FEC[y][i] for i in ids if i in FEC[y]]
        if rows:
            r = max(rows, key=lambda r: r[0])
            if r[0] > 0:
                full = 1900 + y if y >= 80 else 2000 + y
                out.append([full, r[0], r[1], r[2], r[3]])
    return out


# ---------- House PTR filings by year (2008-2024 indexes + 2025-26) ----------
ptr_idx = collections.Counter()
for year in range(2008, 2027):
    zp = f'{H}/{year}FD.zip' if year <= 2024 else f'{D}/{year}FD.zip'
    if not os.path.exists(zp):
        continue
    try:
        z = zipfile.ZipFile(zp)
    except zipfile.BadZipFile:
        continue
    txt = [n for n in z.namelist() if n.endswith('.txt')]
    if not txt:
        continue
    for line in z.read(txt[0]).decode('latin-1').splitlines()[1:]:
        f = line.split('\t')
        if len(f) < 9 or f[4] != 'P':
            continue
        fy = f[7][-4:] if f[7] else f[6]
        ptr_idx[(f[5].strip()[:2], norm(f[1]), int(fy) if fy.isdigit() else year)] += 1
print('ptr index keys', len(ptr_idx))

# ---------- bills ----------
bills = json.load(open(f'{H}/bills.json'))
for _k, _v in json.load(open(f'{H}/cbp_bills.json')).items():
    bills.setdefault(_k, []).extend(_v)
TN = {'hr': 'H.R.', 's': 'S.', 'hjres': 'H.J.Res.', 'sjres': 'S.J.Res.'}


def bill_summary(bid):
    L = bills.get(bid)
    if not L:
        return None
    per = collections.defaultdict(lambda: [0, 0])
    areas = collections.Counter()
    for c, t, n, title, law, pa, intro, cc in L:
        per[c][0] += 1
        per[c][1] += law
        if pa:
            areas[pa] += 1
    laws = sorted([x for x in L if x[4]], key=lambda x: (-x[0], x[2] if isinstance(x[2], int) else 0))
    top = sorted(L, key=lambda x: -x[7])[:5]
    return {'n': len(L), 'law': len(laws), 'pc': [[c, v[0], v[1]] for c, v in sorted(per.items())],
            'areas': areas.most_common(4),
            'laws': [[x[0], TN[x[1]] + ' ' + str(x[2]), x[3], x[6], f'{x[0]}-{x[1]}-{x[2]}'] for x in laws[:12]],
            'pop': [[x[0], TN[x[1]] + ' ' + str(x[2]), x[3], x[7], x[4], f'{x[0]}-{x[1]}-{x[2]}'] for x in top],
            'new': [[x[0], TN[x[1]] + ' ' + str(x[2]), x[3], x[6], x[4], f'{x[0]}-{x[1]}-{x[2]}'] for x in sorted([y for y in L if y[0] == 119], key=lambda y: y[6], reverse=True)[:6]]}


# ---------- Wikidata offices ----------
wd = json.load(open(f'{H}/cabinet_wd.json'))
offices = collections.defaultdict(dict)  # person qid -> {(pos,start): rec}
wdp = {}
for r in wd:
    q = r['p']['value'].rsplit('/', 1)[1]
    g = lambda k: r[k]['value'] if k in r else None
    pos = g('posLabel').replace('United States ', '')
    k = (pos, (g('start') or '')[:10])
    dt = lambda v: v[:10] if v and re.match(r'^-?\d{4}', v) else ''
    k = (pos, dt(g('start')))
    offices[q][k] = [pos, dt(g('start')), dt(g('end'))]
    p = wdp.setdefault(q, {'n': g('pLabel'), 'bio': g('bio'), 'party': set(), 'b': (g('birth') or '')[:10], 'd': (g('death') or '')[:4], 'desc': g('desc')})
    if g('partyLabel'):
        p['party'].add(g('partyLabel'))
bio2wd = {p['bio']: q for q, p in wdp.items() if p['bio']}
WDT = json.load(open(f'{H}/wd_titles.json'))

PARTY_SHORT = {'Democrat': 'D', 'Democratic': 'D', 'Republican': 'R', 'Independent': 'I'}


def merge_terms(terms):
    out = []
    for t in terms:
        kind = {'sen': 'S', 'rep': 'H', 'prez': 'P', 'viceprez': 'V'}[t['type']]
        s, e = yr(t['start']), yr(t.get('end'))
        party = t.get('party') or ''
        st = t.get('state', '')
        dist = t.get('district')
        if out and out[-1][0] == kind and out[-1][3] == st and out[-1][5] == party and out[-1][4] == dist and out[-1][2] >= s - 1:
            out[-1][2] = e
        else:
            out.append([kind, s, e, st, dist, party])
    return out


def person(p, current=False):
    i = p['id']
    b = i.get('bioguide')
    n = p['name']
    rec = {'id': b, 'n': n.get('official_full') or ' '.join(x for x in [n.get('nickname') or n.get('first'), n.get('last'), n.get('suffix')] if x),
           'f': n.get('nickname') or n.get('first'), 'l': n.get('last')}
    bio = p.get('bio', {})
    if bio.get('birthday'):
        rec['b'] = bio['birthday']
    if bio.get('gender'):
        rec['g'] = bio['gender']
    rows = vv.get(b, [])
    died = next((r['died'] for r in rows if r['died']), '')
    if died:
        rec['dd'] = int(float(died))
    rec['t'] = merge_terms(p.get('terms', []))
    import datetime as _dt
    iv = sorted((_dt.date.fromisoformat(t['start']), min(_dt.date.fromisoformat(t['end']), _dt.date(2026, 10, 11))) for t in p.get('terms', []) if t['type'] in ('rep', 'sen') and t.get('end'))
    days, cur_end = 0, None
    for a_, b_ in iv:
        if cur_end and a_ < cur_end:
            a_ = cur_end
        if b_ > a_:
            days += (b_ - a_).days
            cur_end = b_
    if days:
        rec['cd'] = days
    lr = p.get('leadership_roles') or []
    if lr:
        rec['lr'] = [[x.get('title'), yr(x.get('start')), yr(x.get('end'))] for x in lr]
    # votes per congress
    vs = []
    nom = None
    for r in rows:
        k = f"{r['congress']}|{r['chamber']}|{r['icpsr']}"
        s = stats.get(k)
        if s and s[0]:
            vs.append([int(r['congress']), r['chamber'][0], *s])
        if r['nominate_dim1'] and nom is None:
            nom = round(float(r['nominate_dim1']), 3)
    vs.sort()
    # collapse duplicates (party switch rows)
    seen = {}
    for x in vs:
        key = (x[0], x[1])
        if key in seen:
            a = seen[key]
            for j in range(2, 6):
                a[j] = max(a[j], x[j])
        else:
            seen[key] = x
    if seen:
        rec['v'] = list(seen.values())
    if nom is not None:
        rec['nm'] = nom
        lastrow = max((r for r in rows if r['nominate_dim1']), key=lambda r: int(r['congress']))
        g_ = NOMG[(lastrow['congress'], lastrow['chamber'])]
        if len(g_) > 20:
            rec['nmp'] = [round(1 - bisect.bisect_left(g_, nom) / len(g_), 3), int(lastrow['congress']), lastrow['chamber'][0]]
    fec = i.get('fec') or []
    if fec:
        fh = fec_hist(fec)
        if fh:
            rec['fec'] = fh
    # House PTR filings by year
    pt = collections.Counter()
    for t in p.get('terms', []):
        if t['type'] != 'rep':
            continue
        s, e = yr(t['start']), yr(t.get('end')) or 2027
        if e < 2008:
            continue
        for y in range(max(s, 2008), min(e, 2026) + 1):
            c = ptr_idx.get((t['state'], norm(n.get('last')), y), 0)
            if c:
                pt[y] = c
    if pt:
        rec['ptr'] = sorted(pt.items())
    bs = bill_summary(b)
    if bs:
        rec['bl'] = bs
    pc_ = pac_career(fec)
    if pc_:
        rec['pacc'] = pc_
    th_ = trade_hist(b)
    if th_:
        rec['th'] = th_
    if b in KV['cast']:
        rec['kv'] = KV['cast'][b]
    if b in WL:
        rec['wl'] = [[int(y), v['alo'], v['ahi'], v['llo'], v['lhi'], v['an']] for y, (d_, v) in sorted(WL[b].items())]
    for k, kk in (('wikipedia', 'w'), ('ballotpedia', 'bp'), ('govtrack', 'gt'), ('opensecrets', 'os'), ('votesmart', 'vs'), ('icpsr', 'ic')):
        if i.get(k):
            rec[kk] = i[k]
    q = bio2wd.get(b)
    if q:
        o = [x for x in offices[q].values() if x[0] not in ('President of the United States', 'Vice President of the United States')]
        if o:
            rec['off'] = sorted(o, key=lambda x: x[1])
        if wdp[q]['desc']:
            rec['desc'] = wdp[q]['desc']
        if not rec.get('dd') and wdp[q]['d']:
            rec['dd'] = int(wdp[q]['d'])
    w = wiki.get(i.get('wikipedia') or '') or wiki.get(f"{n.get('first')} {n.get('last')}" if not i.get('wikipedia') else '')
    if w:
        rec['wx'] = w['x']
        if not rec.get('desc'):
            rec['desc'] = w['d']
    if b in soc:
        rec['soc'] = {k: v for k, v in soc[b].items() if k in ('twitter', 'facebook', 'youtube', 'instagram', 'mastodon') and isinstance(v, str)}
    # summary fields for lists
    last = rec['t'][-1] if rec['t'] else None
    if last:
        rec['lp'] = last[5]
        rec['ls'] = last[3]
        rec['ly'] = last[2]
        rec['fy'] = rec['t'][0][1]
    return rec


# ---------- PAC money over a whole career (FEC 1980-2024) ----------
PACH = json.load(open(f'{H}/pac_hist.json'))
CMN = json.load(open(f'{H}/cm_names.json'))
_ACR = re.compile(r'\b(Pac|Llc|Usa|Us|Afl-Cio|Nra|Ibew|Seiu|Uaw|Afscme|Nea|Aft|Ups|At&T|Dscc|Dccc|Nrsc|Nrcc|Rnc|Dnc|Ibm|Pnc|Hca|Rtx|Bnsf|Cvs|Ge|Jp|Ii|Iii)\b', re.I)
def _nice(s):
    t = re.sub(r"\b([A-Z])([A-Z']*)\b", lambda m: m.group(1) + m.group(2).lower(), s or '').replace("'S ", "'s ")
    return _ACR.sub(lambda m: m.group(0).upper(), t).strip()
def pac_career(fec_ids):
    agg = {}
    for fid in fec_ids or []:
        for cid, (amt, a, b) in PACH.get(fid, {}).items():
            x = agg.setdefault(cid, [0, a, b])
            x[0] += amt; x[1] = min(x[1], a); x[2] = max(x[2], b)
    if not agg:
        return None
    rows = []
    for cid, (amt, a, b) in sorted(agg.items(), key=lambda kv: -kv[1][0])[:15]:
        nm = CMN.get(cid, [cid, '', '', ''])
        rows.append([_nice(nm[0]), round(amt), a, b, _nice(nm[3]) if nm[3] and nm[3].upper() not in ('NONE', 'N/A', 'NONE.') else ''])
    return {'top': rows, 'n': len(agg), 'tot': round(sum(v[0] for v in agg.values()))}

# ---------- stock trades 2012-2024 (House and Senate reports) ----------
import datetime as _dtm
def _money(s):
    try: return int(re.sub(r'[^0-9]', '', s)) if s else None
    except ValueError: return None
TERMS = collections.defaultdict(list)
for _p in his + cur:
    _b = _p['id'].get('bioguide')
    for _t in _p.get('terms', []):
        TERMS[(_t['type'], _t['state'])].append((_t['start'][:4], (_t.get('end') or '2027')[:4], _t.get('district'), _b, norm(_p['name'].get('last')), norm(_p['name'].get('first')), norm(_p['name'].get('nickname'))))
TH = collections.defaultdict(list)
_hp = json.load(open(f'{D}/ptr_hist_parsed.json')) if os.path.exists(f'{D}/ptr_hist_parsed.json') else {}
_paper = collections.Counter()
for doc, r in _hp.items():
    sd = (r.get('sd') or '').strip(); st = sd[:2]
    try: dist = int(sd[2:])
    except ValueError: dist = None
    y = (r.get('date') or '')[-4:] or r['year']
    hits = [t for t in TERMS[('rep', st)] if t[0] <= y <= t[1] and (dist is None or t[2] == dist or (dist == 0 and t[2] in (0, None))) and t[4] == norm(r.get('last'))]
    if not hits: continue
    bio = hits[0][3]
    if r.get('paper') or r.get('trades') is None:
        _paper[bio] += 1; continue
    for t in r['trades']:
        TH[bio].append([t['date'][6:] + '-' + t['date'][:2] + '-' + t['date'][3:5], t['type'], t.get('tick') or '', (t['asset'] or '')[:70], _money(t.get('lo')), _money(t.get('hi')), {'SP': 'Spouse', 'JT': 'Joint', 'DC': 'Child'}.get(t.get('owner'), 'Self'), 'H'])
_sp = json.load(open(f'{D}/senate_ptr_hist.json')) if os.path.exists(f'{D}/senate_ptr_hist.json') else []
for r in _sp:
    y = (r.get('date') or '')[-4:]
    ln = norm(r['last']); fn_ = norm(r['first'].split()[0] if r['first'].split() else '')
    hits = []
    for (ty, st), lst in TERMS.items():
        if ty != 'sen': continue
        hits += [t for t in lst if t[0] <= y <= t[1] and t[4] == ln]
    if len({h[3] for h in hits}) > 1:
        hits = [h for h in hits if h[5][:1] == fn_[:1] or h[6][:1] == fn_[:1]] or hits
    if not hits: continue
    bio = hits[0][3]
    if r.get('paper'):
        _paper[bio] += 1; continue
    for t in r.get('trades', []):
        a = re.findall(r'\$[\d,]+', t.get('amt') or '')
        lo = _money(a[0]) if a else None; hi = _money(a[1]) if len(a) > 1 else None
        d = t.get('date') or ''
        dd = d[6:10] + '-' + d[:2] + '-' + d[3:5] if len(d) >= 10 else ''
        typ = t.get('type') or ''
        typ = 'Buy' if typ.lower().startswith('purchase') else 'Sell' if typ.lower().startswith('sale') else typ.title()
        TH[bio].append([dd, typ, t.get('tick') or '', (t.get('asset') or '')[:70], lo, hi, t.get('owner') or '', 'S'])
print('trade history people', len(TH), 'trades', sum(len(v) for v in TH.values()))
def trade_hist(bio):
    L = TH.get(bio)
    if not L and not _paper.get(bio): return None
    L = sorted(L or [], key=lambda t: t[0], reverse=True)
    yrs = collections.defaultdict(lambda: [0, 0, 0, 0, 0])
    for t in L:
        y = t[0][:4]
        if not y.isdigit(): continue
        a = yrs[y]; a[0] += 1; a[1] += t[1] == 'Buy'; a[2] += t[1].startswith('Sell'); a[3] += t[4] or 0; a[4] += t[5] or t[4] or 0
    ticks = collections.Counter(t[2] for t in L if t[2])
    return {'n': len(L), 'paper': _paper.get(bio, 0), 'yrs': [[int(y)] + v for y, v in sorted(yrs.items())], 'ticks': ticks.most_common(8),
            'big': sorted(L, key=lambda t: -(t[5] or t[4] or 0))[:8], 'all': L}

KV = json.load(open(f'{H}/key_votes.json'))
WL = collections.defaultdict(dict)
if os.path.exists(f'{D}/wealth_house.json'):
    for k, v in json.load(open(f'{D}/wealth_house.json')).items():
        bio_, yr_, doc_ = k.split('|')
        if v['an'] == 0 and v['ln'] == 0: continue
        prev = WL[bio_].get(yr_)
        if not prev or doc_ > prev[0]: WL[bio_][yr_] = [doc_, v]
if os.path.exists(f'{D}/wealth_senate.json'):
    for r in json.load(open(f'{D}/wealth_senate.json')):
        if r.get('paper') or not r.get('a') or not r.get('year'): continue
        y = str(r['year']); ln = norm(r['last'].split(',')[0]); fn_ = norm((r['first'].split() or [''])[0])
        hits = []
        for (ty, st), lst in TERMS.items():
            if ty == 'sen': hits += [t for t in lst if t[0] <= str(int(y) + 1) <= t[1] and t[4] == ln]
        if len({h[3] for h in hits}) > 1: hits = [h for h in hits if h[5][:1] == fn_[:1] or h[6][:1] == fn_[:1]] or hits
        if not hits: continue
        a, l = r['a'], r['l'] or [0, 0, 0]
        if a[2] == 0 and l[2] == 0: continue
        WL[hits[0][3]][y] = [r['date'], {'alo': a[0], 'ahi': a[1], 'an': a[2], 'llo': l[0], 'lhi': l[1], 'ln': l[2]}]
WIKIX = json.load(open(f'{H}/wiki.json'))
JT = json.load(open(f'{H}/judge_titles.json')) if os.path.exists(f'{H}/judge_titles.json') else {}
NT = json.load(open(f'{H}/nom_titles.json')) if os.path.exists(f'{H}/nom_titles.json') else {}

people = {}
for p in his + cur:
    b = p['id'].get('bioguide')
    if not b:
        continue
    people[b] = person(p, b in CUR)
# presidents / vice presidents
for p in exe:
    b = p['id'].get('bioguide')
    if not b:
        b = 'X' + str(p['id'].get('icpsr_prez') or p['id'].get('govtrack'))
        p['id']['bioguide'] = b
    t = merge_terms(p['terms'])
    if b in people:
        people[b]['t'] = sorted(people[b]['t'] + t, key=lambda x: x[1])
        people[b]['exec'] = 1
        last = people[b]['t'][-1]
        people[b]['lp'], people[b]['ly'] = last[5], last[2]
    else:
        r = person(p)
        r['exec'] = 1
        people[b] = r
print('people', len(people))

past = [r for b, r in people.items() if b not in CUR]
current = {b: r for b, r in people.items() if b in CUR}

# ---------- appointees ----------
A = {}


def akey(first, last, by=None):
    return norm(last) + '|' + norm((first or '').split()[0] if first else '')


# FJC judges
J = list(csv.DictReader(open(f'{H}/judges.csv', encoding='utf-8-sig')))
for r in J:
    nm = ' '.join(x for x in [r['First Name'], r['Middle Name'], r['Last Name'], r['Suffix']] if x)
    pos = []
    for k in range(1, 7):
        court = r.get(f'Court Name ({k})')
        if not court:
            continue
        vote = r.get(f'Ayes/Nays ({k})') or ''
        vt = r.get(f'Senate Vote Type ({k})') or ''
        pos.append({'t': r.get(f'Appointment Title ({k})'), 'o': court, 's': r.get(f'Commission Date ({k})') or r.get(f'Confirmation Date ({k})'),
                    'e': r.get(f'Termination Date ({k})') or '', 'why': r.get(f'Termination ({k})') or '', 'by': r.get(f'Appointing President ({k})'),
                    'bp': r.get(f'Party of Appointing President ({k})'), 'v': (vote or vt).strip(), 'aba': r.get(f'ABA Rating ({k})') or '',
                    'nd': r.get(f'Nomination Date ({k})'), 'cd': r.get(f'Confirmation Date ({k})'), 'senior': r.get(f'Senior Status Date ({k})') or '',
                    'rec': r.get(f'Recess Appointment Date ({k})') or ''})
    edu = [[r.get(f'School ({k})'), r.get(f'Degree ({k})'), r.get(f'Degree Year ({k})')] for k in range(1, 6) if r.get(f'School ({k})')]
    key = akey(r['First Name'], r['Last Name'])
    A[f"j{r['jid']}"] = {'id': f"j{r['jid']}", 'n': nm, 'k': 'Judge', 'b': r['Birth Year'], 'bp': ', '.join(x for x in [r['Birth City'], r['Birth State']] if x),
                        'dd': r['Death Year'], 'pos': pos, 'edu': edu, 'car': r['Professional Career'][:900], 'src': ['FJC'], 'key': key}
print('judges', len(J))

# Wikidata officeholders (non-members)
for q, p in wdp.items():
    if p['bio'] and p['bio'] in people:
        continue
    os_ = sorted(offices[q].values(), key=lambda x: x[1])
    if not os_ or any(o[0] in ('President of the United States', 'Vice President of the United States') for o in os_):
        continue
    nm = p['n']
    parts = nm.split()
    key = akey(parts[0], parts[-1].rstrip('.,') if not re.match(r'^(Jr|Sr|II|III|IV)\.?$', parts[-1]) else parts[-2])
    # merge with judge record for Supreme Court justices
    hit = next((a for a in A.values() if a['key'] == key and a['k'] == 'Judge' and any('Supreme' in x['o'] for x in a['pos'])), None)
    if hit and any('Justice' in o[0] for o in os_):
        hit['off'] = os_
        hit['src'].append('Wikidata')
        hit['desc'] = p['desc']
        continue
    A[f'w{q}'] = {'id': f'w{q}', 'n': nm, 'k': 'Official', 'b': p['b'][:4], 'dd': p['d'], 'off': os_, 'party': sorted(p['party']), 'desc': p['desc'], 'src': ['Wikidata'], 'key': key}
    w = wiki.get(WDT.get(q, ''))
    if w:
        A[f'w{q}']['wx'] = w['x']
        A[f'w{q}']['wt'] = WDT[q]

# Senate nomination roll calls since 1789
nv = json.load(open(f'{H}/nom_votes.json'))
PC = {'100': 'D', '200': 'R', '328': 'I'}
pat_mod = re.compile(r'^(?P<n>[^,]+?)(?:,\s+(?:Jr\.|Sr\.|II|III|IV))?,\s+of\s+(?:the\s+)?(?P<st>[^,]+?),\s+to\s+be\s+(?P<pos>.+)$', re.I)
pat_old = re.compile(r'NOMINATION OF (?P<n>[A-Z][A-Z .\'-]+?)(?:,? OF (?P<st>[A-Z .]+?))?,? (?:AS|TO BE|FOR|TO THE POST OF|TO THE OFFICE OF) (?P<pos>[^.;(]+)', re.I)
unmatched = []
nm_ok = 0
for r in nv:
    txt = r['desc'] or ''
    m = pat_mod.match(txt.strip()) if txt else None
    if not m:
        m = pat_old.search(r['dtl'] or '') or pat_old.search(txt)
    if not m:
        continue
    nm_ok += 1
    name = m.group('n').strip().title() if m.group('n').isupper() else m.group('n').strip()
    pos = re.sub(r'\s+', ' ', m.group('pos').strip().rstrip('.'))
    if pos.isupper():
        pos = pos.capitalize()
    br = {}
    for pc, (y, n) in r['br'].items():
        k = PC.get(pc, 'O')
        a = br.setdefault(k, [0, 0])
        a[0] += y
        a[1] += n
    rec = {'c': r['c'], 'd': r['date'], 'y': r['yea'], 'nn': r['nay'], 'res': r['result'], 'pos': pos, 'br': br}
    parts = name.replace(',', '').split()
    parts = [x for x in parts if not re.match(r'^(Jr|Sr|II|III|IV)\.?$', x)]
    key = akey(parts[0], parts[-1]) if parts else ''
    vyear = int(r['date'][:4])
    hit = None
    for a in A.values():
        if a['key'] != key:
            continue
        if a['k'] == 'Judge' and any(x.get('cd') and abs(int(x['cd'][:4]) - vyear) <= 1 for x in a['pos']):
            hit = a
            break
        if a['k'] == 'Official' and any(o[1] and abs(int(o[1][:4]) - vyear) <= 1 for o in a.get('off', [])):
            hit = a
            break
    if hit:
        hit.setdefault('sv', []).append(rec)
        if 'Senate vote' not in hit['src']:
            hit['src'].append('Senate vote')
    else:
        unmatched.append((name, key, rec))
print('nomination votes parsed', nm_ok, 'unmatched', len(unmatched))
for name, key, rec in unmatched:
    aid = 'v' + str(rec['c']) + '_' + norm(name)[:20]
    a = A.get(aid)
    if not a:
        a = A[aid] = {'id': aid, 'n': name, 'k': 'Nominee', 'src': ['Senate vote'], 'key': key}
    a.setdefault('sv', []).append(rec)

# OGE filings index (2016-2026)
o = json.load(open(f'{D}/oge.json'))
og = collections.defaultdict(list)
for x in o:
    t = x['type']
    link = re.search(r"href='([^']+)'", t)
    tt = re.sub(r'\s*\(<a.*$', '', t).strip() or 'Filing'
    og[x['name']].append([x['docDate'][:10], tt, x['title'], x['agency'], link.group(1) if link and 'Request' not in t else ''])
curnames = {norm(n['name'].split()[0]) + norm(n['name'].split()[-1]) for n in app['noms']}
added = 0
for name, docs in og.items():
    if ',' not in name:
        continue
    last, first = [s.strip() for s in name.split(',', 1)]
    key = akey(first, last)
    if norm(first.split()[0] if first else '') + norm(last) in curnames:
        continue
    docs.sort()
    hit = None
    yrs = {int(d[0][:4]) for d in docs}
    for a in A.values():
        if a['key'] == key and (a['k'] != 'Judge') and (
                any(o_[1] and int(o_[1][:4]) >= 2014 for o_ in a.get('off', [])) or any(int(s['d'][:4]) >= 2014 for s in a.get('sv', []))):
            hit = a
            break
    if hit:
        hit['oge'] = docs
        hit['src'].append('OGE')
    else:
        A['o' + norm(name)[:28]] = {'id': 'o' + norm(name)[:28], 'n': f'{first} {last}', 'k': 'Official', 'oge': docs, 'src': ['OGE'], 'key': key,
                                     'off': [[t, '', '', ag] for t, ag in sorted({(d[2], d[3]) for d in docs})][:4]}
        added += 1
print('oge people added', added)

# finalize appointees: compact + sort fields
for a in A.values():
    a['_k'] = a.pop('key', None)
    if a['k'] == 'Nominee':
        sv = a['sv']
        a['pos'] = []
    years = []
    for x in a.get('pos', []):
        if x.get('s'):
            years.append(int(x['s'][:4]))
    for x in a.get('off', []):
        if x[1]:
            years.append(int(x[1][:4]))
    for x in a.get('sv', []):
        years.append(int(x['d'][:4]))
    for x in a.get('oge', []):
        years.append(int(x[0][:4]))
    a['fy'] = min(years) if years else None
    a['ly'] = max(years) if years else None
    # headline title
    if a.get('off'):
        a['ttl'] = a['off'][-1][0]
    elif a.get('pos'):
        a['ttl'] = (a['pos'][-1]['t'] or 'Judge') + ', ' + a['pos'][-1]['o']
    elif a.get('sv'):
        a['ttl'] = a['sv'][-1]['pos']
    elif a.get('oge'):
        a['ttl'] = a['oge'][-1][2]
    if a.get('pos'):
        a['by'] = a['pos'][-1]['by']
PK = ['t', 'o', 's', 'e', 'why', 'by', 'bp', 'v', 'aba', 'nd', 'cd', 'senior', 'rec']
# attach extras to current (2025-26) appointees, then drop those records from the past list
curx = {}
for n in app['noms']:
    parts = [x for x in n['name'].replace(',', '').split() if not re.match(r'^(Jr|Sr|II|III|IV)\.?$', x)]
    key = norm(parts[-1]) + '|' + norm(parts[0])
    for a in A.values():
        if a.get('key2', a.get('id')) and a.get('_k') == key:
            pass
    hits = [a for a in A.values() if a.get('_k') == key and (a['ly'] or 0) >= 2025]
    if hits:
        x = {}
        for a in hits:
            for f in ('edu', 'car', 'b', 'bp', 'wx', 'wt', 'desc', 'off', 'pos'):
                if a.get(f) and f not in x:
                    x[f] = a[f]
            if a['k'] == 'Judge':
                x['jid'] = a['id']
        curx[n['id']] = x
KEYS = {a['id']: a.get('_k') for a in A.values()}
for a in A.values():
    a.pop('_k', None)
    if a.get('pos'):
        a['pos'] = [[p_.get(k, '') for k in PK] for p_ in a['pos']]
for x in curx.values():
    if x.get('pos') and isinstance(x['pos'][0], dict):
        x['pos'] = [[p_.get(k, '') for k in PK] for p_ in x['pos']]
# OGE docs: factor out repeated title/agency
for a in A.values():
    if a.get('oge'):
        ta = sorted({(d[2], d[3]) for d in a['oge']})
        ix = {t: i for i, t in enumerate(ta)}
        a['ogt'] = [list(t) for t in ta]
        a['oge'] = [[d[0], d[1], ix[(d[2], d[3])], d[4]] for d in a['oge']]
apps = sorted(A.values(), key=lambda a: -(a['ly'] or 0))
print('appointees', len(apps))

curkeys = set()
for n in app['noms']:
    parts = [x for x in n['name'].replace(',', '').split() if not re.match(r'^(Jr|Sr|II|III|IV)\.?$', x)]
    curkeys.add(norm(parts[-1]) + '|' + norm(parts[0]))
apps = [a for a in apps if not (KEYS.get(a['id']) in curkeys and (a['ly'] or 0) >= 2025)]
# ---------- bill pages ----------
import re as _re
BD = json.load(open(f'{H}/bill_details.json'))
RCP = json.load(open(f'{H}/rc_party.json'))
billsout = {}
for k, b in BD.items():
    sm = _re.sub(r'^\((This measure has|The expanded summary|This bill has)[^)]*\)\s*', '', b['sum'])
    if len(sm) > 430:
        cut = sm[:430]
        dot = cut.rfind('. ')
        sm = (cut[:dot + 1] if dot > 200 else cut.rstrip() + '…')
    vs = []
    for ch, c, sess, roll, d, txt in b['votes']:
        r = RCP.get(f'{c}|{ch}|{sess}|{roll}')
        if r:
            vs.append([ch, r[0], r[1], r[2], r[3], r[4] or txt[:80], r[5]])
    if b['law'] and 'L' not in b['ms']:
        b['ms']['L'] = b['la'][0] or b['ms'].get('P', '')
    billsout[k] = [b['title'], b['short'], b['sp'], b['spn'], b['intro'], b['cos'], b['cosp'], b['pa'], b['com'][:3], sm, b['ms'], b['law'], b['la'], vs]
for k, v in json.load(open(f'{H}/cbp_laws.json')).items():
    billsout.setdefault(k, v)
print('bill pages', len(billsout))
for a in apps:
    if a['k'] == 'Judge' and not a.get('wx') and JT.get(a['id']) and WIKIX.get(JT[a['id']]):
        a['wx'] = WIKIX[JT[a['id']]]['x']; a['wt'] = JT[a['id']]
for n in app['noms']:
    x = curx.setdefault(n['id'], {})
    t = NT.get(n['name']) or (JT.get(x.get('jid')) if x.get('jid') else None)
    if t and WIKIX.get(t) and not x.get('wx'):
        x['wx'] = WIKIX[t]['x']; x['wt'] = t
curx = {k: v for k, v in curx.items() if v}
ctl = collections.defaultdict(lambda: [0] * 6)
for r in csv.DictReader(open(f'{H}/HSall_members.csv')):
    if r['chamber'] not in ('House', 'Senate'): continue
    c = int(r['congress']); k = 0 if r['chamber'] == 'House' else 3
    try: pc = int(float(r['party_code'] or 0))
    except ValueError: pc = 0
    j = 0 if pc == 100 else 1 if pc == 200 else 2
    ctl[c][k + j] += 1
control = [[c] + v for c, v in sorted(ctl.items()) if c >= 35]
out = {'control': control, 'kv': KV['votes'], 'people': past, 'current': current, 'apps': apps, 'curApps': curx, 'PK': PK, 'bills': billsout,
       'meta': {'fecFrom': 1980, 'billsFrom': 1947, 'ptrFrom': 2008, 'votesFrom': 1789}}
json.dump(out, open(f'{B}/hist.json', 'w'), separators=(',', ':'))
print('bytes', os.path.getsize(f'{B}/hist.json'))
