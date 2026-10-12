"""Pages for lobbying groups (clients), lobbying firms, House Ethics matters and congressional committees.
Sources: Senate/House Lobbying Disclosure Act filings (lda.gov), House Ethics Committee statements,
unitedstates/congress-legislators committee files, GovInfo bill records, and the app's own member data.
Out: pages.json"""
import collections, datetime, glob, json, os, re
import yaml

B = os.path.dirname(os.path.abspath(__file__))
D = f'{B}/data'
app = json.load(open(f'{B}/data2.json'))
MEM = {m['id']: m for m in app['members']}
norm = lambda s: re.sub(r'[^a-z0-9]', '', (s or '').lower())
title = lambda s: re.sub(r"\b([A-Z])([A-Z']*)\b", lambda m: m.group(1) + m.group(2).lower(), s or '').replace("'S ", "'s ").strip()
ACR = re.compile(r'\b(Pac|Llc|Usa|Us|Afl-Cio|Nra|Aipac|Ibew|Seiu|Uaw|Afscme|Nea|Aft|Ups|At&T|Bnsf|Cvs|Ge|Ibm|Jp|Pnc|Kpmg|Pwc|Ey|Lpl|Hca|Aarp|Ahip|Phrma|Bio|Nfib|Nar|Ama|Aha|Llp|Inc|Na|Lp)\b', re.I)
KEEPCASE = {'Inc': 'Inc', 'Llp': 'LLP', 'Lp': 'LP', 'Na': 'N.A.'}
nice = lambda s: ACR.sub(lambda m: KEEPCASE.get(m.group(0).title(), m.group(0).upper()), title(s))

ISSUE = {'ACC': 'Accounting', 'ADV': 'Advertising', 'AER': 'Aerospace', 'AGR': 'Agriculture', 'ALC': 'Alcohol & drug abuse', 'ANI': 'Animals',
         'APP': 'Apparel', 'ART': 'Arts & entertainment', 'AUT': 'Automotive', 'AVI': 'Aviation & airlines', 'BAN': 'Banking', 'BNK': 'Bankruptcy',
         'BEV': 'Beverages', 'BUD': 'Budget & spending', 'CAW': 'Clean air & water', 'CDT': 'Commodities', 'CHM': 'Chemicals', 'CIV': 'Civil rights',
         'COM': 'Broadcasting', 'CPI': 'Computers', 'CPT': 'Copyright & patents', 'CSP': 'Consumer safety', 'CON': 'Constitution', 'DEF': 'Defense',
         'DIS': 'Disasters & emergencies', 'DOC': 'District of Columbia', 'ECN': 'Economic development', 'EDU': 'Education', 'ENG': 'Energy & nuclear',
         'ENV': 'Environment', 'FAM': 'Family & abortion', 'FIN': 'Finance & securities', 'FIR': 'Guns', 'FOO': 'Food industry', 'FOR': 'Foreign relations',
         'FUE': 'Oil & gas', 'GAM': 'Gambling', 'GOV': 'Government operations', 'HCR': 'Health care', 'HOM': 'Homeland security', 'HOU': 'Housing',
         'IMM': 'Immigration', 'IND': 'Native American affairs', 'INS': 'Insurance', 'INT': 'Intelligence', 'LBR': 'Labor & antitrust', 'LAW': 'Law enforcement',
         'MAN': 'Manufacturing', 'MAR': 'Maritime & fisheries', 'MED': 'Media', 'MIA': 'Medical research', 'MMM': 'Medicare & Medicaid', 'MON': 'Currency',
         'NAT': 'Natural resources', 'PHA': 'Pharmacy', 'POS': 'Postal service', 'RRR': 'Railroads', 'RES': 'Real estate & land', 'REL': 'Religion',
         'RET': 'Retirement', 'ROD': 'Roads & highways', 'SCI': 'Science & tech', 'SMB': 'Small business', 'SPO': 'Sports', 'TAR': 'Tariffs',
         'TAX': 'Taxes', 'TEC': 'Telecom', 'TOB': 'Tobacco', 'TOR': 'Lawsuits (torts)', 'TRD': 'Trade', 'TRA': 'Transportation', 'TOU': 'Travel & tourism',
         'TRU': 'Trucking & shipping', 'URB': 'Cities', 'UNM': 'Unemployment', 'UTI': 'Utilities', 'VET': 'Veterans', 'WAS': 'Waste', 'WEL': 'Welfare'}

# ---------- lobbying ----------
BILL = re.compile(r'(?<![\w.])(H\.?\s?R\.?|S\.|H\.?\s?J\.?\s?Res\.?|S\.?\s?J\.?\s?Res\.?)\s?(\d{1,5})\b', re.I)


def bkey(pre, num):
    p = re.sub(r'[^A-Z]', '', pre.upper())
    p = {'HR': 'hr', 'S': 's', 'HJRES': 'hjres', 'SJRES': 'sjres'}.get(p)
    return p and f'119-{p}-{int(num)}'


rev_by_lobbyist = {}  # lobbyist id -> member id (from app revolving matches by name)
rev_names = collections.defaultdict(set)
for m in app['members']:
    for r in m.get('revolving') or []:
        rev_names[norm(r[0])].add(m['id'])

def ckey(n):
    n = re.sub(r'\([^)]*\)', ' ', (n or '').lower())
    n = re.sub(r'[^a-z0-9 ]', ' ', n)
    w = [x for x in n.split() if x not in ('the', 'inc', 'llc', 'corp', 'corporation', 'co', 'company', 'lp', 'llp', 'ltd', 'formerly', 'dba')]
    return ''.join(w)


C = {}
F = {}
seen = set()
for fn in sorted(glob.glob(f'{D}/lda/*.json')):
    for f in json.load(open(fn)):
        if f['id'] in seen or (f['cli'] or '').upper().startswith('STATE OF LOC NATION'):
            continue
        seen.add(f['id'])
        amt = f['exp'] if f['exp'] is not None else f['inc']
        try:
            amt = float(amt or 0)
        except Exception:
            amt = 0.0
        ck = ckey(f['cli']) or str(f.get('cid'))
        inhouse = ckey(f['reg']) == ck
        c = C.setdefault(ck, {'n': re.sub(r'\s*\([^)]*\)\s*$', '', f['cli']).strip() or f['cli'], 'spend': 0, 'own': 0, 'out': 0, 'q': collections.Counter(), 'firms': collections.defaultdict(lambda: [0, 0]), 'iss': collections.Counter(),
                              'bills': collections.Counter(), 'ents': collections.Counter(), 'lob': {}, 'fil': []})
        per = f"{f['y']} {f['p']}"
        if inhouse:
            c['own'] += amt
            c['q'][per] += amt
        else:
            c['out'] += amt
        fr = c['firms'][f['reg']]
        fr[0] += amt
        fr[1] += 1
        c['fil'].append([per, f['url'], round(amt), f['reg']])
        fk = norm(f['reg'])
        if not inhouse:
            fm = F.setdefault(fk, {'n': f['reg'], 'inc': 0, 'cl': collections.Counter(), 'iss': collections.Counter(), 'lob': {}})
            fm['inc'] += amt
            fm['cl'][ck] += amt
        bs = set()
        for a in f['acts']:
            c['iss'][a['code']] += 1
            if not inhouse:
                fm['iss'][a['code']] += 1
            for e in a.get('ents') or []:
                c['ents'][e] += 1
            for pre, num in BILL.findall(a['desc'] or ''):
                k = bkey(pre, num)
                if k:
                    bs.add(k)
            for first, last, pos, lid in a['lob']:
                nm = f"{title(first)} {title(last)}"
                pos = '' if re.fullmatch(r'\s*(none|n/?a|na|-)?\s*\.?', pos or '', re.I) else pos
                rec = c['lob'].setdefault(lid, [nm, (pos or '')[:160]])
                if not inhouse:
                    fm['lob'].setdefault(lid, [nm, (pos or '')[:160]])
        for k in bs:
            c['bills'][k] += 1

# which clients to give pages
tops = set()
for b in app['bills'].values():
    tops |= {norm(x) for x in b['top']}
for m in app['members']:
    for r in m.get('revolving') or []:
        for cl in r[3]:
            tops.add(norm(cl))
for nm, _ in app['lobby']['topClients']:
    tops.add(norm(nm))
for c in C.values():
    # an organization that files for itself reports its total lobbying cost, which already includes outside firms it pays
    c['spend'] = c['own'] if c['own'] else c['out']
    if not c['own']:
        c['q'] = collections.Counter()
        for per, u, v, reg in c['fil']:
            c['q'][per] += v
clients = {}
for ck, c in C.items():
    if c['spend'] < 750000 and norm(nice(c['n'])) not in tops and norm(c['n']) not in tops:
        continue
    ex = []
    for lid, (nm, pos) in c['lob'].items():
        for mid in rev_names.get(norm(nm), []):
            ex.append([mid, nm, pos])
    clients['c' + ck] = {
        'n': nice(c['n']), 'spend': round(c['spend']),
        'q': sorted([[k, round(v)] for k, v in c['q'].items()]),
        'firms': sorted([[nice(k), round(v[0]), v[1], int(ckey(k) == ck)] for k, v in c['firms'].items()], key=lambda x: (-x[3], -x[1]))[:15],
        'iss': [[k, v] for k, v in c['iss'].most_common(10)],
        'bills': [[k, v] for k, v in c['bills'].most_common(12)],
        'ents': [[title(k), v] for k, v in c['ents'].most_common(6)],
        'nlob': len(c['lob']),
        'lob': [[nm, pos[:110]] for nm, pos in sorted(c['lob'].values(), key=lambda x: (not x[1], x[0]))][:15],
        'ex': ex[:20],
        'fil': sorted(c['fil'], reverse=True)[:5]}
LH = f'{D}/lob_hist'
for cid, c in clients.items():
    fn = f'{LH}/{cid}.json'
    if not os.path.exists(fn): continue
    rows = json.load(open(fn))
    yo = collections.Counter(); yi = collections.Counter(); seen_y = set(); iss = collections.Counter()
    for y, per, inc, exp, reg, cn, codes in rows:
        try: inc = float(inc or 0); exp = float(exp or 0)
        except ValueError: continue
        if ckey(reg) == ckey(cn): yo[y] += exp
        else: yi[y] += inc
        for k in codes: iss[k] += 1
    yrs = sorted(set(yo) | set(yi))
    c['yh'] = [[y, round(yo[y] if yo[y] else yi[y])] for y in yrs]
    c['issAll'] = [[k, v] for k, v in iss.most_common(8)]
name2client = {}
for cid, c in clients.items():
    name2client.setdefault(norm(c['n']), cid)
firms = {}
for fk, fm in F.items():
    if fm['inc'] < 1000000:
        continue
    firms['f' + fk[:40]] = {'n': nice(fm['n']), 'inc': round(fm['inc']),
                            'cl': [[('c' + ck) if ('c' + ck) in clients else '', nice(C[ck]['n']), round(v)] for ck, v in fm['cl'].most_common(25)],
                            'ncl': len(fm['cl']), 'iss': [[k, v] for k, v in fm['iss'].most_common(8)], 'nlob': len(fm['lob']),
                            'lob': [[nm, pos[:110]] for nm, pos in sorted(fm['lob'].values(), key=lambda x: (not x[1], x[0]))][:15]}
firm_by_name = {norm(f['n']): k for k, f in firms.items()}
for c in clients.values():
    for x in c['firms']:
        x.append(firm_by_name.get(norm(x[0]), ''))
print('lobby clients', len(clients), 'firms', len(firms))

# ---------- ethics ----------
eh = json.load(open(f'{D}/ethics_house_all.json')) if os.path.exists(f'{D}/ethics_house_all.json') else json.load(open(f'{D}/ethics_house.json'))


def status(t):
    s = t.lower()
    if 'investigative subcommittee' in s and ('establish' in s or 'empanel' in s or 're-authorize' in s or 'reauthorize' in s): return 'Formal investigation'
    if 'reprov' in s or 'reprimand' in s: return 'Reproved'
    if 'contempt' in s: return 'Contempt referral'
    if 'no further action' in s or 'closed' in s or 'dismiss' in s: return 'Closed'
    if 'extend' in s or 'is reviewing' in s or 'continue to review' in s or 'will continue' in s: return 'Under review'
    if 'referral' in s or 'office of congressional conduct' in s: return 'Referred for review'
    if 'released the attached report' in s or ('adopted' in s and 'report' in s): return 'Report released'
    if 'working group' in s: return 'Working group review'
    return 'Statement issued'


hist = json.load(open(f'{B}/hist.json')) if os.path.exists(f'{B}/hist.json') else {'people': []}
recent_past = [p for p in hist['people'] if (p.get('ly') or 0) >= 1995 and any(t[0] == 'H' for t in p.get('t', []))]
ethics = []
for x in eh:
    dm = re.match(r'^([A-Z][a-z]{2}) (\d{1,2}), (20\d\d)', x['text'])
    if dm:
        date = datetime.datetime.strptime(' '.join(dm.groups()), '%b %d %Y').strftime('%Y-%m-%d')
    elif x.get('date'):
        try: date = datetime.datetime.strptime(x['date'], '%B %d, %Y').strftime('%Y-%m-%d')
        except ValueError: continue
    else:
        continue
    body = x['text'].split('the following statement:', 1)[-1].strip()
    body = re.sub(r'^[A-Z][a-z]{2} \d{1,2}, 20\d\d\s+', '', body)
    body = body.split('###')[0].strip()
    hay = x['title'] + ' ' + body[:900]
    who = []
    if re.search(r'Representative|Delegate', x['title']):
        hay = x['title']
    for m in app['members']:
        if m['chamber'] != 'House':
            continue
        if re.search(r'(Representative|Delegate)s?\s+[^.]{0,40}' + re.escape(m['last']), hay) and (norm(m['first']) in norm(hay) or norm(m['name'].split()[0]) in norm(hay)):
            who.append(m['id'])
    for p in recent_past:
        if p['l'] and re.search(r'(Representative|Delegate)s?\s+[^.]{0,40}' + re.escape(p['l']), hay) and norm(p['f']) in norm(hay) and p['id'] not in who:
            who.append(p['id'])
    sid = 'e' + norm(x['url'].rstrip('/').rsplit('/', 1)[-1])[-60:]
    t = re.sub(r'^Statement of the Chairman and Ranking Member of the Committee on Ethics Regarding\s+', '', x['title'])
    ethics.append({'id': sid, 'd': date, 't': t, 'st': status(body), 'body': body[:1800], 'url': x['url'], 'pdfs': x.get('pdfs', [])[:4], 'who': who})
ethics.sort(key=lambda e: e['d'], reverse=True)
print('ethics', len(ethics), 'with people', sum(1 for e in ethics if e['who']))

# ---------- committees ----------
cy = yaml.load(open(f'{D}/committees-current.yaml'), Loader=yaml.CLoader)
mem = yaml.load(open(f'{D}/committee-membership-current.yaml'), Loader=yaml.CLoader)
bd = json.load(open(f'{D}/hist/bill_details.json'))
comm = {}
for c in cy:
    tid = c['thomas_id']
    roster = mem.get(tid, [])
    rows = [[r['bioguide'], r.get('title', ''), r.get('party', ''), r.get('rank', 99)] for r in roster if r.get('bioguide')]
    subs = []
    for s in c.get('subcommittees', []):
        sid = tid + s['thomas_id']
        sr = mem.get(sid, [])
        subs.append([s['name'], [[r['bioguide'], r.get('title', '')] for r in sr if r.get('bioguide')]])
    nm = c['name']
    short = re.sub(r'^(House|Senate|Joint) (Committee|Select Committee|Permanent Select Committee|Special Committee) (on|of)\s+(the\s+)?', '', nm)
    # laws and bills from this committee (matched by GovInfo committee names)
    key = re.sub(r'^(House|Senate) Committee on (the )?', '', nm).lower()
    laws = []
    for k, b in bd.items():
        if b['law'] and b['c'] >= 118 and any(key and key in cn.lower() and (('Senate' in nm) == (k.split('-')[1].startswith('s'))) for cn in b['com']):
            laws.append([k, b['ms'].get('L', '')])
    laws.sort(key=lambda x: x[1], reverse=True)
    comm[tid] = {'n': nm, 'short': short, 'ch': c['type'], 'url': c.get('url', ''), 'phone': c.get('phone', ''), 'addr': c.get('address', ''),
                 'jur': c.get('jurisdiction', ''), 'mem': sorted(rows, key=lambda r: (r[2] != 'majority', r[3])), 'subs': subs, 'laws': [x[0] for x in laws[:15]], 'nlaws': len(laws)}
print('committees', len(comm))

# ---------- current leaders: President, VP, Cabinet; Supreme Court ----------
import csv
exe = yaml.load(open(f'{D}/hist/executive.yaml'), Loader=yaml.CLoader)
def cur_exec(kind):
    best = None
    for pp in exe:
        for t in pp['terms']:
            if t['type'] == kind and t['end'] >= '2026-10-11' and t['start'] <= '2026-10-11':
                best = (pp, t)
    pp, t = best
    bid = pp['id'].get('bioguide') or 'X' + str(pp['id'].get('icpsr_prez') or pp['id'].get('govtrack'))
    terms = [[x['start'][:4], x['end'][:4]] for x in pp['terms'] if x['type'] == kind]
    return {'n': f"{pp['name'].get('nickname') or pp['name']['first']} {pp['name']['last']}", 'id': bid, 'since': t['start'], 'terms': terms, 'party': t.get('party', ''), 'b': pp.get('bio', {}).get('birthday', '')}
CABORDER = [('Secretary of State', 'State'), ('Secretary of the Treasury', 'Treasury'), ('Secretary of Defense', 'Defense'), ('Attorney General', 'Justice'),
            ('Secretary of the Interior', 'Interior'), ('Secretary of Agriculture', 'Agriculture'), ('Secretary of Commerce', 'Commerce'), ('Secretary of Labor', 'Labor'),
            ('Secretary of Health and Human Services', 'Health and Human Services'), ('Secretary of Housing and Urban Development', 'Housing and Urban Development'),
            ('Secretary of Transportation', 'Transportation'), ('Secretary of Energy', 'Energy'), ('Secretary of Education', 'Education'),
            ('Secretary of Veterans Affairs', 'Veterans Affairs'), ('Secretary of Homeland Security', 'Homeland Security')]
CABLEVEL = [('Administrator of the Environmental Protection Agency', 'Environmental Protection Agency'), ('Director of the Office of Management and Budget', 'Office of Management and Budget'),
            ('Director of National Intelligence', 'National Intelligence'), ('Director of the Central Intelligence Agency', 'CIA'), ('United States Trade Representative', 'Trade'),
            ('Representative of the United States of America to the United Nations', 'United Nations'), ('Administrator of the Small Business Administration', 'Small Business Administration')]
WDC = json.load(open(f'{D}/hist/cabinet_wd.json'))
def holder(pos):
    hits = [n for n in app['noms'] if n['pos'] == pos or (n['pos'].startswith(pos + ',') and 'for ' not in n['pos'][len(pos):len(pos) + 6])]
    if not hits: return None
    n = max(hits, key=lambda n: n['d'])
    nm = n['name']
    for r in WDC:
        lab = r['pLabel']['value']
        if r['posLabel']['value'].replace('United States ', '') == pos and lab.split()[-1].rstrip('.') == nm.replace(', Jr.', '').split()[-1] and 'end' not in r:
            nm = lab
    return {'nid': n['id'], 'n': nm, 'since': n['d'], 'y': n['y'], 'nn': n['n']}
cab = []
for pos, dept in CABORDER:
    h = holder(pos)
    if h: cab.append([pos, dept, 'dept', h])
for pos, dept in CABLEVEL:
    h = holder(pos)
    if h: cab.append([pos, dept, 'level', h])
cab.append(['White House Chief of Staff', 'White House', 'level', {'n': 'Susie Wiles', 'since': '2025-01-20', 'note': 'Not confirmed by the Senate'}])
J = list(csv.DictReader(open(f'{D}/hist/judges.csv', encoding='utf-8-sig')))
court = []
for r in J:
    for k in range(1, 7):
        cn = r.get(f'Court Name ({k})') or ''
        if cn == 'Supreme Court of the United States' and not r.get(f'Termination Date ({k})') and not r.get(f'Senior Status Date ({k})'):
            court.append({'jid': 'j' + r['jid'], 'n': ' '.join(x for x in [r['First Name'], r['Middle Name'], r['Last Name'], r['Suffix']] if x),
                          'last': r['Last Name'], 't': r.get(f'Appointment Title ({k})'), 'by': r.get(f'Appointing President ({k})'), 'bp': r.get(f'Party of Appointing President ({k})'),
                          'cd': r.get(f'Confirmation Date ({k})'), 'since': r.get(f'Commission Date ({k})'), 'v': (r.get(f'Ayes/Nays ({k})') or r.get(f'Senate Vote Type ({k})') or '').strip(),
                          'b': r['Birth Year'], 'bp2': ', '.join(x for x in [r['Birth City'], r['Birth State']] if x),
                          'edu': [[r.get(f'School ({i})'), r.get(f'Degree ({i})'), r.get(f'Degree Year ({i})')] for i in range(1, 6) if r.get(f'School ({i})')],
                          'nd': r.get(f'Nomination Date ({k})')})
court.sort(key=lambda c: (c['t'] != 'Chief Justice', c['since']))
print('cabinet', len(cab), 'justices', len(court), [c['last'] for c in court])
leaders = {'pres': cur_exec('prez'), 'vp': cur_exec('viceprez'), 'cab': cab, 'court': court}
mc = collections.defaultdict(list)
for tid, roster in mem.items():
    if tid in comm:
        for r in roster:
            if r.get('bioguide'):
                mc[r['bioguide']].append([tid, r.get('title', '')])
out = {'leaders': leaders, 'mc': mc, 'clients': clients, 'firms': firms, 'ethics': ethics, 'comm': comm, 'issue': ISSUE}
json.dump(out, open(f'{B}/pages.json', 'w'), separators=(',', ':'))
print('bytes', os.path.getsize(f'{B}/pages.json'))
