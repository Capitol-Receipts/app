"""Build PaperTrail data from public sources (all real, nothing invented).
Sources: unitedstates/congress-legislators (roster, committees), Voteview (119th Congress roll calls),
FEC bulk candidate summaries (weball), House Clerk financial disclosure index (stock trade reports)."""
import csv, json, sys, re, datetime, collections, xml.etree.ElementTree as ET, yaml, os, statistics
D = sys.argv[1]
OUT = sys.argv[2]
TODAY = datetime.date.today()
p = lambda f: os.path.join(D, f)

L = yaml.safe_load(open(p('legislators-current.yaml')))
CM = yaml.safe_load(open(p('committees-current.yaml')))
CMM = yaml.safe_load(open(p('committee-membership-current.yaml')))
cname = {c['thomas_id']: re.sub(r'\\s+',' ',re.sub(r'^(House|Senate) ','',c['name'].replace('Committee on ','').replace(' Committee','').replace('Committee ',''))).strip() for c in CM}

def election_day(year):
    d = datetime.date(year, 11, 1)
    while d.weekday() != 0: d += datetime.timedelta(days=1)
    return d + datetime.timedelta(days=1)

members = {}
for l in L:
    t = l['terms'][-1]
    bg = l['id']['bioguide']
    party = t['party']
    caucus = t.get('caucus', party)
    chamber = 'Senate' if t['type'] == 'sen' else 'House'
    first_start = min(x['start'] for x in l['terms'])
    end_year = int(t['end'][:4])
    if chamber == 'House':
        nxt = election_day(2026)
    else:
        nxt = election_day(end_year - 1)
    bday = l.get('bio', {}).get('birthday')
    age = None
    if bday:
        b = datetime.date.fromisoformat(bday)
        age = TODAY.year - b.year - ((TODAY.month, TODAY.day) < (b.month, b.day))
    nm = l['name']
    members[bg] = dict(
        id=bg, name=nm.get('official_full') or f"{nm['first']} {nm['last']}", first=nm.get('nickname') or nm['first'], last=nm['last'],
        party=party[0], partyName=party, caucus=caucus[0], chamber=chamber, state=t['state'], district=t.get('district'),
        delegate=chamber == 'House' and t['state'] in ('DC', 'PR', 'GU', 'VI', 'AS', 'MP'),
        since=int(first_start[:4]), chamberSince=int(min(x['start'] for x in l['terms'] if x['type'] == t['type'])[:4]),
        next=nxt.strftime('%b %-d, %Y'), age=age, phone=t.get('phone'), url=t.get('url'), office=t.get('address'),
        fec=l['id'].get('fec', []), committees=[])

for cid, lst in CMM.items():
    if cid not in cname: continue  # skip subcommittees
    for m in lst:
        if m.get('bioguide') in members:
            members[m['bioguide']]['committees'].append([cname[cid], m.get('title', '')])

# New members often reach the House and Senate's own committee rosters before the community list above.
# For anyone still without committees, fall back to those official rosters (if they were downloaded).
def _lasts(m):
    # every surname form a member goes by: roster last name, its first word, and the last word of their official name
    full = [w for w in m['name'].replace(',', '').split() if w.rstrip('.') not in ('Jr', 'Sr', 'II', 'III', 'IV')]
    return {x.upper() for x in (m['last'], m['last'].split()[0], full[-1] if full else '') if x}
def _norm(s): return re.sub(r'[^a-z]', '', re.sub(r'^(house|senate|united states senate)\s+', '', s.lower()).replace('committee on ', '').replace('committee', ''))
_byname = {(c['type'], _norm(c['name'])): c['thomas_id'] for c in CM}
if os.path.exists(p('house_member_data.xml')):
    try:
        for x in ET.parse(p('house_member_data.xml')).getroot().iter('member'):
            m = members.get(x.findtext('member-info/bioguideID'))
            if not m or m['committees'] or m['chamber'] != 'House': continue
            for c in x.iter('committee'):
                cid = 'HS' + (c.get('comcode') or '')[:2]
                if cid in cname: m['committees'].append([cname[cid], 'Chair' if c.get('leadership') == 'Chairman' else ''])
    except Exception as e: print('house committee roster skipped:', e)
if os.path.exists(p('senate_assignments.htm')):
    import html as _html
    t = open(p('senate_assignments.htm'), encoding='utf-8', errors='ignore').read()
    blocks = re.split(r'<a name="[A-Za-z]+">', t)
    for b in blocks[1:]:
        txt = [s.strip() for s in _html.unescape(re.sub(r'<[^>]+>', '\n', b)).split('\n') if s.strip()]
        if len(txt) < 2 or not re.match(r'\([A-Z]+-[A-Z]{2}\)', txt[1]): continue
        last, st = txt[0].split(',')[0].strip(), txt[1][-3:-1]
        cands = [m for m in members.values() if m['chamber'] == 'Senate' and m['state'] == st and last.upper() in _lasts(m) and not m['committees']]
        if len(cands) != 1: continue
        for s in txt[2:]:
            if s == 'Back to top': break
            if re.match(r'(Committee|Select Committee|Special Committee|Joint)', s) and not s.startswith('Subcommittee'):
                cid = _byname.get(('senate', _norm(s))) or _byname.get(('joint', _norm(s)))
                if cid in cname: cands[0]['committees'].append([cname[cid], ''])

# ---------- Voteview ----------
vm = {}
for r in csv.DictReader(open(p('HS119_members.csv'))):
    if r['chamber'] == 'President' or not r['bioguide_id']: continue
    vm[(r['chamber'], r['icpsr'])] = r
rc = {}
for r in csv.DictReader(open(p('HS119_rollcalls.csv'))):
    rc[(r['chamber'], int(r['rollnumber']))] = r
votes = collections.defaultdict(dict)  # (chamber,roll) -> {bioguide: code}
for r in csv.DictReader(open(p('HS119_votes.csv'))):
    key = (r['chamber'], r['icpsr'])
    if key not in vm: continue
    bg = vm[key]['bioguide_id']
    if bg not in members: continue
    votes[(r['chamber'], int(r['rollnumber']))][bg] = int(float(r['cast_code']))

YEA, NAY = {1, 2, 3}, {4, 5, 6}
VOTED = {1, 6, 7, 8}
stats = collections.defaultdict(lambda: dict(elig=0, voted=0, unityN=0, unityW=0, monthly=collections.Counter(), monthlyE=collections.Counter()))
party_pos = {}
for key, vs in votes.items():
    side = {}
    for party in ('D', 'R'):
        y = sum(1 for b, c in vs.items() if members[b]['caucus'] == party and c in YEA)
        n = sum(1 for b, c in vs.items() if members[b]['caucus'] == party and c in NAY)
        side[party] = 'Y' if y > n else 'N' if n > y else None
    party_pos[key] = side
    unity_vote = side['D'] and side['R'] and side['D'] != side['R']
    month = rc[key]['date'][:7]
    for b, c in vs.items():
        if c == 0: continue
        s = stats[b]
        s['elig'] += 1; s['monthlyE'][month] += 1
        if c in VOTED: s['voted'] += 1
        else: s['monthly'][month] += 1
        if unity_vote and (c in YEA or c in NAY):
            mine = 'Y' if c in YEA else 'N'
            s['unityN'] += 1
            if mine == side[members[b]['caucus']]: s['unityW'] += 1

for (ch, ic), r in vm.items():
    bg = r['bioguide_id']
    if bg in members and r['nominate_dim1']:
        members[bg]['nom'] = float(r['nominate_dim1'])

months = sorted({rc[k]['date'][:7] for k in votes})
def rc_info(key):
    r = rc[key]
    desc = r['dtl_desc'] or r['vote_desc'] or ''
    return dict(d=r['date'], b=r['bill_number'], q=r['vote_question'], s=desc[:180], res=r['vote_result'], y=int(r['yea_count']), n=int(r['nay_count']))
used_rc = {}
code_word = lambda c: 'Yes' if c in YEA else 'No' if c in NAY else 'Present' if c in (7, 8) else 'Missed'
by_member_keys = collections.defaultdict(list)
for key, vs in votes.items():
    for b, c in vs.items():
        if c: by_member_keys[b].append(key)
for bg, m in members.items():
    s = stats.get(bg)
    if not s or not s['elig']: continue
    m['elig'] = s['elig']; m['voted'] = s['voted']
    m['present'] = round(s['voted'] / s['elig'], 4)
    m['unity'] = round(s['unityW'] / s['unityN'], 4) if s['unityN'] else None
    m['unityN'] = s['unityN']
    m['missedM'] = [[mo, s['monthly'][mo], s['monthlyE'][mo]] for mo in months if s['monthlyE'][mo]]
    keys = sorted(by_member_keys[bg], key=lambda k: (rc[k]['date'], k[1]))[-10:][::-1]
    rec = []
    for k in keys:
        rid = f"{k[0][0]}{k[1]}"
        used_rc[rid] = rc_info(k)
        c = votes[k][bg]
        mine = 'Y' if c in YEA else 'N' if c in NAY else None
        pp = party_pos[k][m['caucus']] if m['caucus'] in 'DR' else None
        rec.append([rid, code_word(c), (None if not mine or not pp else mine == pp)])
    m['recent'] = rec

# ideology percentile within chamber
for ch in ('House', 'Senate'):
    arr = sorted(m['nom'] for m in members.values() if m['chamber'] == ch and 'nom' in m)
    for m in members.values():
        if m['chamber'] == ch and 'nom' in m:
            m['nomPct'] = round(sum(1 for x in arr if x < m['nom']) / len(arr), 3)

# ---------- FEC ----------
def load_weball(y):
    out = {}
    import zipfile
    z = zipfile.ZipFile(p(f'weball{y}.zip'))
    for line in z.read(z.namelist()[0]).decode('latin-1').splitlines():
        f = line.split('|')
        if len(f) < 30: continue
        n = lambda i: float(f[i] or 0)
        out[f[0]] = dict(rec=n(5), xfer=n(6), disb=n(7), coh=n(10), self=n(11) + n(12), debt=n(16), indiv=n(17), pac=n(25), party=n(26), thru=f[27])
    return out
FEC = {y: load_weball(y) for y in (20, 22, 24, 26)}
# Members the roster has no FEC ID for (often brand-new appointees): find them in the FEC's 2026 candidate list
# by office, state, last and first name, and only when exactly one candidate matches.
if os.path.exists(p('cn26.zip')):
    import zipfile as _zf
    _z = _zf.ZipFile(p('cn26.zip'))
    _cn = [l.split('|') for l in _z.read(_z.namelist()[0]).decode('latin-1').splitlines()]
    for m in members.values():
        if any(i in FEC[26] for i in m['fec']): continue
        off = 'S' if m['chamber'] == 'Senate' else 'H'
        firsts = {m['first'].upper()}
        hit = [f[0] for f in _cn if len(f) > 6 and f[5] == off and f[4] == m['state']
               and (off == 'S' or int(f[6] or 0) == int(m['district'] or 0))
               and f[1].upper().split(',')[0].strip() in _lasts(m)
               and (f[1].upper().split(',') + [''])[1].split()[:1] and (f[1].upper().split(',') + [''])[1].split()[0] in firsts]
        if len(hit) == 1 and hit[0] not in m['fec']:
            m['fec'] = m['fec'] + [hit[0]]; print('FEC ID found by name:', m['name'], hit[0])
for m in members.values():
    pref = 'S' if m['chamber'] == 'Senate' else 'H'
    ids = [i for i in m['fec'] if i.startswith(pref)] or m['fec']
    hist = []
    for y in (20, 22, 24, 26):
        rows = [FEC[y][i] for i in ids if i in FEC[y]]
        if rows:
            r = max(rows, key=lambda r: r['rec'])
            hist.append([2000 + y, round(r['rec'])])
    m['raisedHist'] = hist
    m['fecId'] = next((i for i in ids if any(i in FEC[y] for y in FEC)), ids[0] if ids else None)
    rows = [FEC[26][i] for i in ids if i in FEC[26]]
    if rows:
        r = max(rows, key=lambda r: r['rec'])
        other = max(0, r['rec'] - r['indiv'] - r['pac'] - r['party'] - r['self'] - r['xfer'])
        m['money'] = dict(rec=round(r['rec']), indiv=round(r['indiv']), pac=round(r['pac']), party=round(r['party']), self=round(r['self']), xfer=round(r['xfer']), other=round(other), coh=round(r['coh']), debt=round(r['debt']), spent=round(r['disb']), thru=r['thru'])
        m['indivShare'] = round(r['indiv'] / r['rec'], 4) if r['rec'] > 0 else None
    del m['fec']

# ---------- House stock trade reports (periodic transaction reports) ----------
ptr = collections.Counter(); ptr_dates = collections.defaultdict(list)
for yr in ('2025', '2026'):
    root = ET.parse(p(f'fd{yr[2:]}/{yr}FD.xml')).getroot()
    for x in root.findall('Member'):
        if x.findtext('FilingType') != 'P': continue
        sd = (x.findtext('StateDst') or '').strip()
        last = (x.findtext('Last') or '').strip().lower()
        ptr[(sd, last)] += 1
        ptr_dates[(sd, last)].append(x.findtext('FilingDate'))
def norm(s): return re.sub(r'[^a-z]', '', s.lower())
ptr_n = collections.Counter(); ptr_d = {}
for (sd, last), n in ptr.items():
    ptr_n[(sd, norm(last))] += n
    ptr_d.setdefault((sd, norm(last)), []).extend(ptr_dates[(sd, last)])
for m in members.values():
    if m['chamber'] != 'House': continue
    dist = m['district'] or 0
    sd = f"{m['state']}{int(dist):02d}" if dist else f"{m['state']}00"
    keys = [k for k in ptr_n if k[0] in (sd, f"{m['state']}AL") and (k[1] == norm(m['last']) or norm(m['last']).endswith(k[1]) or k[1].endswith(norm(m['last'])))]
    m['ptr'] = sum(ptr_n[k] for k in keys)
    ds = sorted({d for k in keys for d in ptr_d[k]}, key=lambda d: datetime.datetime.strptime(d, '%m/%d/%Y'))
    m['ptrLast'] = ds[-1] if ds else None
    m['ptrByMonth'] = collections.Counter(datetime.datetime.strptime(d, '%m/%d/%Y').strftime('%Y-%m') for k in keys for d in ptr_d[k])


# ---------- passage votes (for lobbying overlap) ----------
PASS = re.compile(r'Passage|Suspend the Rules and Pass|Conference Report|Concur|On the Joint Resolution|On Agreeing to the Resolution')
passage = {}
for ch in ('House', 'Senate'):
    keys = sorted([k for k in votes if k[0] == ch and rc[k]['bill_number'] and not rc[k]['bill_number'].startswith(('PN', 'HRES', 'SRES')) and PASS.search(rc[k]['vote_question'] or '')], key=lambda k: (rc[k]['date'], k[1]))
    passage[ch] = []
    for k in keys:
        rid = f"{k[0][0]}{k[1]}"; used_rc[rid] = rc_info(k); passage[ch].append(rid)
    for bg, m in members.items():
        if m['chamber'] != ch: continue
        s = ''
        for k in keys:
            c = votes[k].get(bg, 0)
            s += '.' if c == 0 else 'Y' if c in YEA else 'N' if c in NAY else 'M'
        m['pv'] = s

# ---------- Confirmed nominees (recorded Senate votes) ----------
noms = {}
def add_nom(key, r, name, st, pos, vs, batch):
    br = {}
    for party in ('D', 'R', 'I'):
        br[party] = [sum(1 for b, c in vs.items() if members[b]['party'] == party and c in YEA), sum(1 for b, c in vs.items() if members[b]['party'] == party and c in NAY)]
    cross = []
    for b, c in vs.items():
        cp = members[b]['caucus']; side = party_pos[key].get(cp)
        if c in YEA | NAY and side and ('Y' if c in YEA else 'N') != side: cross.append([b, 'Yes' if c in YEA else 'No'])
    nid = 'n-' + re.sub(r'[^a-z]', '', (name + pos).lower())[:40]
    if nid in noms: return
    noms[nid] = dict(id=nid, name=name.strip(), from_=st.strip(), pos=pos, d=r['date'], pn=r['bill_number'], y=int(r['yea_count']), n=int(r['nay_count']), br=br, cross=cross, batch=batch)
for key, r in rc.items():
    if key[0] != 'Senate' or not r['bill_number'].startswith('PN'): continue
    if r['vote_question'] != 'On the Nomination' or 'Confirmed' not in r['vote_result']: continue
    desc = r['vote_desc'] or r['dtl_desc'] or ''
    parts = re.split(r';\s*and\s+', desc)
    vs = votes.get(key, {})
    for part in parts:
        mt = re.match(r'(.+?), of (?:the )?(.+?), to be (?:an? |the )?(.+)', part.strip())
        if not mt: continue
        name, st, pos = mt.groups()
        pos = re.sub(r'\s+', ' ', pos).strip().rstrip('.')
        pos = re.sub(r',?\s*(for (a|the) term.*|vice .*|, [A-Z][^,]*, (retired|resigned|deceased|term expired))$', '', pos).strip()
        add_nom(key, r, name, st, pos, vs, len(parts))
nom_list = sorted(noms.values(), key=lambda x: x['d'], reverse=True)

for m in members.values():
    m.pop('nom', None); m.pop('nomPct', None)
    if 'ptrByMonth' in m: m['ptrByMonth'] = [[mo, m['ptrByMonth'].get(mo, 0)] for mo in months]

out = dict(asOf=dict(votes=max(r['date'] for r in rc.values()), fec=max((m['money']['thru'] for m in members.values() if 'money' in m), key=lambda s: datetime.datetime.strptime(s, '%m/%d/%Y')), roster=str(TODAY), ptr=str(TODAY)),
           months=months, members=list(members.values()), rc=used_rc, noms=nom_list, passage=passage)
json.dump(out, open(OUT, 'w'), separators=(',', ':'), default=str)
print('members', len(members), 'with votes', sum(1 for m in members.values() if 'present' in m), 'with money', sum(1 for m in members.values() if 'money' in m), 'house w/ ptr>0', sum(1 for m in members.values() if m.get('ptr')), 'noms', len(nom_list), 'rc', len(used_rc), 'bytes', os.path.getsize(OUT))
print('asOf', out['asOf'])
