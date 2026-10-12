"""Extra records for current members, plus caucus and federal judge pages.

Per member (member_extras): privately paid trips (House Clerk gift travel filings), office spending (House Statement of
Disbursements), earmarks (FY2026 community project funding), lobbyists' own donations (LD-203), donor industries in past
election cycles (FEC), and trades read from scanned paper reports.
Also: caucuses (membership from Wikipedia, voting cohesion from Voteview) and judges (Federal Judicial Center).
Usage: python build_more.py <inputs dir> <export dir>
"""
import collections, csv, datetime, glob, gzip, json, os, re, sys
import xml.etree.ElementTree as ET
import yaml

I, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
p = lambda *a: os.path.join(I, *a)
norm = lambda s: re.sub(r'[^a-z ]', ' ', (s or '').lower()).strip()
L = yaml.safe_load(open(p('legislators-current.yaml')))
MEM = {}
for l in L:
    t = l['terms'][-1]; n = l['name']
    MEM[l['id']['bioguide']] = dict(last=norm(n['last']).split()[-1], lasts=set(norm(n['last']).split()), first={norm(n['first']), norm(n.get('nickname') or ''), norm(((n.get('official_full') or 'x').split() or ['x'])[0])} - {'', 'x'},
                                    st=t['state'], d=int(t.get('district') or 0), ch=t['type'], full=norm(n.get('official_full') or f"{n['first']} {n['last']}"))
by_last = collections.defaultdict(list)
for bg, m in MEM.items():
    for w in m['lasts']: by_last[w].append(bg)
def find(last, first=None, st=None, ch=None, d=None):
    c = [bg for bg in by_last.get(norm(last).split()[-1] if norm(last) else '', [])]
    if st: c = [bg for bg in c if MEM[bg]['st'] == st]
    if ch: c = [bg for bg in c if MEM[bg]['ch'] == ch]
    if d is not None and len(c) > 1: c = [bg for bg in c if MEM[bg]['d'] == d] or c
    if first and len(c) > 1: c = [bg for bg in c if norm(first).split()[0] in MEM[bg]['first']] or c
    return c[0] if len(c) == 1 else None
X = collections.defaultdict(dict)

# ---------- trips paid for by private groups ----------
for f in sorted(glob.glob(p('travel*', '*Travel.xml'))):
    for t in ET.parse(f).getroot().findall('Travel'):
        nm = t.findtext('MemberName') or ''
        last, _, first = nm.partition(',')
        try: d = int(t.findtext('District') or 0)
        except ValueError: d = 0
        bg = find(last, first, t.findtext('State'), 'rep', d)
        if not bg or not t.findtext('TravelSponsor'): continue
        who = (t.findtext('FilerName') or '').strip()
        X[bg].setdefault('trips', []).append([t.findtext('DepartureDate') or '', t.findtext('ReturnDate') or '', (t.findtext('Destination') or '').strip(), t.findtext('TravelSponsor').strip(),
                                             who, t.findtext('DocID'), t.findtext('Year'), t.findtext('FilingType')])
def tdate(s):
    try: return datetime.datetime.strptime(s, '%m/%d/%Y').date().isoformat()
    except Exception: return s or ''
for bg, x in X.items():
    if 'trips' in x:
        seen = {}
        for r in x['trips']:
            k = (r[0], r[2], r[3], r[4])
            if k not in seen or r[7] == 'Amendment': seen[k] = r
        x['trips'] = sorted([[tdate(r[0]), tdate(r[1]), r[2], r[3], r[4], r[5], r[6]] for r in seen.values()], reverse=True)

# ---------- House office spending (year to date) ----------
CAT = {'PERSONNEL COMPENSATION': 'staff', 'TRAVEL': 'travel', 'FRANKED MAIL': 'mail', 'RENT  COMMUNICATION  UTILITIES': 'rent', 'PRINTING AND REPRODUCTION': 'printing',
       'OTHER SERVICES': 'services', 'SUPPLIES AND MATERIALS': 'supplies', 'EQUIPMENT': 'equipment', 'TRANSPORTATION OF THINGS': 'shipping'}
sod = p('sod_summ.csv')
if os.path.exists(sod):
    period = os.environ.get('SOD_PERIOD', 'Jan–Jun 2026')
    off = collections.defaultdict(lambda: collections.Counter())
    for r in csv.DictReader(open(sod, encoding='latin-1')):
        org = r['ORGANIZATION'].strip()
        m = re.match(r'^\d{4} HON\. (.+)$', org)
        if not m or 'DISTRICT OF' in m.group(1): continue
        if r['PROGRAM'].strip() != 'OFFICIAL EXPENSES OF MEMBERS': continue
        try: amt = float(r['YTD AMOUNT'] or 0)
        except ValueError: continue
        desc = r['DESCRIPTION'].strip()
        off[m.group(1)]['total' if desc == 'OFFICIAL EXPENSES OF MEMBERS TOTALS:' else CAT.get(desc, 'other')] += amt
    for name, c in off.items():
        w = name.split()
        bg = find(w[-1] if w[-1] not in ('JR', 'JR.', 'SR', 'II', 'III', 'IV') else w[-2], w[0], None, 'rep')
        if bg: X[bg]['office'] = {'period': period, **{k: round(v) for k, v in c.items()}}

# ---------- earmarks (FY2026) ----------
try:
    import openpyxl
    wb = openpyxl.load_workbook(p('earmarks.xlsx'), read_only=True)
    ws = [w for w in wb.worksheets if 'Unified' in w.title][0]
    rows = ws.iter_rows(values_only=True); head = next(rows)
    ix = {h: i for i, h in enumerate(head)}
    for r in rows:
        if not r or r[ix['Amount']] in (None, ''): continue
        try: amt = float(r[ix['Amount']])
        except (TypeError, ValueError): continue
        st = r[ix['State']]
        for col, ch in (('Requestor(House)', 'rep'), ('Requestor(Senate)', 'sen')):
            for nm in re.split(r',|/|;| and ', str(r[ix[col]] or '')):
                nm = nm.strip()
                if not nm or nm.lower() in ('none', 'n/a'): continue
                bg = find(nm, None, st, ch)
                if not bg: continue
                e = X[bg].setdefault('earmarks', {'n': 0, 't': 0, 'items': []})
                e['n'] += 1; e['t'] += amt
                e['items'].append([round(amt), (r[ix['Project Name']] or '')[:140], (r[ix['Recipient']] or '')[:100], r[ix['Location']] or '', r[ix['Appropriations Bill']] or '', r[ix['Agency']] or ''])
    for x in X.values():
        if 'earmarks' in x:
            x['earmarks']['t'] = round(x['earmarks']['t']); x['earmarks']['items'].sort(key=lambda i: -i[0]); x['earmarks']['items'] = x['earmarks']['items'][:40]
except Exception as e:
    print('earmarks skipped:', e)

# ---------- lobbyists' own donations ----------
if os.path.exists(p('ld203_members.json')):
    for bg, v in json.load(open(p('ld203_members.json'))).items():
        if bg in MEM: X[bg]['ld203'] = v

# ---------- past-cycle donors ----------
for cy in ('24', '22', '20'):
    f = p(f'donors{cy}.json')
    if not os.path.exists(f): continue
    for bg, v in json.load(open(f)).items():
        if bg in MEM: X[bg].setdefault('donors', {})['20' + cy] = {'item': v['itemized'], 'n': v['donations'], 'emp': v['employers'][:8], 'ind': v['industries'][:10]}

# ---------- paper trade reports read by OCR ----------
if os.path.exists(p('ptr_ocr.json')) and os.path.exists(p('ptr_parsed.json')):
    PP = json.load(open(p('ptr_parsed.json')))
    for doc, rows in json.load(open(p('ptr_ocr.json'))).items():
        r = PP.get(doc)
        if not r or not rows: continue
        sd = r.get('sd') or ''
        try: d = int(sd[2:] or 0)
        except ValueError: d = 0
        bg = find(r['last'], r.get('first'), sd[:2], 'rep', d)
        if not bg: continue
        url = f"https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/{r['year']}/{doc}.pdf"
        X[bg].setdefault('paper', []).extend([[d_, o, a, url] for d_, o, a in rows])

with gzip.open(os.path.join(OUT, 'member_extras.jsonl.gz'), 'wt', encoding='utf-8') as fh:
    for bg, x in X.items():
        fh.write(json.dumps({'id': bg, 'data': x}, separators=(',', ':'), ensure_ascii=False) + '\n')
print('members with extras', len(X), {k: sum(1 for x in X.values() if k in x) for k in ('trips', 'office', 'earmarks', 'ld203', 'donors', 'paper')})

# ---------- caucuses ----------
CAUC = {'Freedom_Caucus': ('House Freedom Caucus', 'R'), 'Congressional_Progressive_Caucus': ('Congressional Progressive Caucus', 'D'), 'Problem_Solvers_Caucus': ('Problem Solvers Caucus', 'B'),
        'New_Democrat_Coalition': ('New Democrat Coalition', 'D'), 'Blue_Dog_Coalition': ('Blue Dog Coalition', 'D'), 'Republican_Study_Committee': ('Republican Study Committee', 'R'),
        'Congressional_Black_Caucus': ('Congressional Black Caucus', 'D'), 'Congressional_Hispanic_Caucus': ('Congressional Hispanic Caucus', 'D'),
        'Congressional_Asian_Pacific_American_Caucus': ('Congressional Asian Pacific American Caucus', 'D')}
full_idx = collections.defaultdict(list)
for bg, m in MEM.items(): full_idx[m['full']].append(bg)
def link_member(title, text):
    for cand in (text, title):
        t = norm(re.sub(r'\(.*?\)', '', cand or ''))
        if not t: continue
        if t in full_idx and len(full_idx[t]) == 1: return full_idx[t][0]
        w = t.split()
        if len(w) >= 2:
            c = [bg for bg in by_last.get(w[-1], []) if w[0] in MEM[bg]['first']]
            if len(c) == 1: return c[0]
    return None
caucuses = []
for f, (name, lean) in CAUC.items():
    fp = p('wiki', f + '.txt')
    if not os.path.exists(fp): continue
    t = open(fp, encoding='utf-8').read()
    m = re.search(r'\n==+\s*(Current members(hip)?[^=]*|Membership|Current membership[^=]*)\s*==+\n', t)
    if not m: continue
    body = t[m.end():]
    stop = re.search(r'\n==\s*[^=\n]+==\s*\n', body)
    while stop and re.match(r'\n==\s*(Current|House|Senate|Members|Membership|Executive|Associate|Leadership)', body[stop.start():stop.start() + 40], re.I):
        nxt = re.search(r'\n==\s*[^=\n]+==\s*\n', body[stop.end():])
        stop = None if not nxt else type('m', (), {'start': (lambda s=stop.end() + nxt.start(): s)})()
    body = body[:stop.start()] if stop else body
    body = re.split(r'\n===?\s*(Former|Past)[^=\n]*===?\s*\n', body)[0]
    ids = []
    for lm in re.finditer(r'\[\[([^\]|#]+)(?:\|([^\]]+))?\]\]', body):
        bg = link_member(lm.group(1), lm.group(2))
        if bg and bg not in ids: ids.append(bg)
    if len(ids) >= 8: caucuses.append({'id': f.lower().replace('_', '-'), 'name': name, 'lean': lean, 'members': ids})
# voting cohesion from this Congress's roll calls
VP = os.path.join(I, 'HS119_votes.csv')
if os.path.exists(VP):
    icp = {}
    for r in csv.DictReader(open(p('HS119_members.csv'))):
        if r['bioguide_id']: icp[(r['chamber'], r['icpsr'])] = r['bioguide_id']
    votes = collections.defaultdict(dict)
    for r in csv.DictReader(open(VP)):
        bg = icp.get((r['chamber'], r['icpsr']))
        if not bg: continue
        c = r['cast_code']; v = 'Y' if c in '123' else 'N' if c in '456' else None
        if v: votes[(r['chamber'], r['rollnumber'])][bg] = v
    for c in caucuses:
        mem = set(c['members']); agree = tot = 0; split_rc = 0
        for k, vs in votes.items():
            vv = [vs[b] for b in mem if b in vs]
            if len(vv) < 5: continue
            y = vv.count('Y'); n = vv.count('N'); maj = max(y, n)
            agree += maj; tot += y + n
            if min(y, n) / (y + n) >= .2: split_rc += 1
        c['cohesion'] = round(agree / tot, 3) if tot else None; c['splits'] = split_rc
with gzip.open(os.path.join(OUT, 'caucuses.jsonl.gz'), 'wt', encoding='utf-8') as fh:
    for c in caucuses: fh.write(json.dumps({'id': c['id'], 'name': c['name'], 'data': c}, separators=(',', ':')) + '\n')
print('caucuses', [(c['name'], len(c['members']), c.get('cohesion')) for c in caucuses])

# ---------- federal judges ----------
jrows = []
J = list(csv.DictReader(open(p('judges.csv'), encoding='utf-8-sig')))
for r in J:
    apps = []
    for i in range(1, 7):
        court = (r.get(f'Court Name ({i})') or '').strip()
        if not court: continue
        apps.append({'court': court, 'type': (r.get(f'Court Type ({i})') or '').strip(), 'title': (r.get(f'Appointment Title ({i})') or '').strip(),
                     'pres': (r.get(f'Appointing President ({i})') or '').strip(), 'party': (r.get(f'Party of Appointing President ({i})') or '').strip(),
                     'aba': (r.get(f'ABA Rating ({i})') or '').strip(), 'nom': (r.get(f'Nomination Date ({i})') or '').strip(), 'conf': (r.get(f'Confirmation Date ({i})') or '').strip(),
                     'vote': (r.get(f'Ayes/Nays ({i})') or '').strip(), 'vtype': (r.get(f'Senate Vote Type ({i})') or '').strip(),
                     'senior': (r.get(f'Senior Status Date ({i})') or '').strip(), 'end': (r.get(f'Termination Date ({i})') or '').strip(), 'endwhy': (r.get(f'Termination ({i})') or '').strip()})
    if not apps: continue
    nm = ' '.join(x.strip() for x in (r['First Name'], r['Middle Name'], r['Last Name'], r['Suffix']) if x and x.strip())
    edu = [[(r.get(f'School ({i})') or '').strip(), (r.get(f'Degree ({i})') or '').strip(), (r.get(f'Degree Year ({i})') or '').strip()] for i in range(1, 6) if (r.get(f'School ({i})') or '').strip()]
    active = any(not a['end'] for a in apps)
    last = apps[-1]
    jrows.append({'id': 'j' + r['nid'], 'name': nm, 'court': last['court'], 'pres': last['pres'], 'party': last['party'], 'conf': last['conf'][:10], 'active': active,
                  'senior': bool(last['senior']) and not last['end'],
                  'data': {'n': nm, 'born': (r.get('Birth Year') or '').strip(), 'died': (r.get('Death Year') or '').strip(), 'apps': apps, 'edu': edu, 'career': (r.get('Professional Career') or '').strip()[:1500]}})
with gzip.open(os.path.join(OUT, 'judges.jsonl.gz'), 'wt', encoding='utf-8') as fh:
    for j in jrows: fh.write(json.dumps(j, separators=(',', ':'), ensure_ascii=False) + '\n')
print('judges', len(jrows), 'serving', sum(j['active'] for j in jrows))
