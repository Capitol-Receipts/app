"""2026 election pages: every House and Senate race, its candidates, their money and outside spending.

Inputs (in WORK dir, fetched by fetch_elections()):
  house.txt / senate.txt   Wikipedia race tables (general-election candidate lists, sourced to state election offices)
  cs26.csv                 FEC candidate summaries (raised, spent, cash on hand)
  ie26.csv                 FEC independent expenditures (outside spending for / against)
  legislators-current.yaml unitedstates/congress-legislators (to link incumbents to their profiles)
Output: <out>/races.json  — list of race records, one per seat on the ballot.
"""
import csv, json, os, re, sys, time, unicodedata, urllib.request, collections, yaml

WORK = sys.argv[1] if len(sys.argv) > 1 else '.'
OUT = sys.argv[2] if len(sys.argv) > 2 else WORK
UA = {'User-Agent': 'CapitolReceiptsBot/1.0 (https://capitolreceipts.com)'}
SRC = {
    'house.txt': 'https://en.wikipedia.org/wiki/2026_United_States_House_of_Representatives_elections?action=raw',
    'senate.txt': 'https://en.wikipedia.org/wiki/2026_United_States_Senate_elections?action=raw',
    'cs26.csv': 'https://www.fec.gov/files/bulk-downloads/2026/candidate_summary_2026.csv',
    'ie26.csv': 'https://www.fec.gov/files/bulk-downloads/2026/independent_expenditure_2026.csv',
    'legislators-current.yaml': 'https://raw.githubusercontent.com/unitedstates/congress-legislators/main/legislators-current.yaml',
}
ST = {'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD', 'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC', 'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY'}


def fetch_elections(force=False):
    for f, url in SRC.items():
        p = os.path.join(WORK, f)
        if os.path.exists(p) and not force and time.time() - os.path.getmtime(p) < 20 * 3600:
            continue
        for attempt in range(4):
            try:
                data = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=180).read()
                if len(data) < 1000: raise IOError('short response')
                open(p, 'wb').write(data); break
            except Exception as e:
                print('retry', f, e); time.sleep(15 * (attempt + 1))


def norm(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z ]', ' ', s)


SUFFIX = {'jr', 'sr', 'ii', 'iii', 'iv', 'md', 'phd', 'dr', 'mr', 'mrs', 'ms'}
def name_parts(s):
    w = [x for x in norm(s).split() if x not in SUFFIX and len(x) > 1]
    return w


def party_of(s):
    s = s.lower().replace('dfl', 'democrat')
    return 'D' if 'democrat' in s else 'R' if 'republican' in s else 'L' if 'libertarian' in s else 'G' if 'green' in s else 'I'


def clean_link(s):
    s = re.sub(r'<ref[^>]*/>', '', s); s = re.sub(r'<ref[^>]*>.*?</ref>', '', s, flags=re.S)
    m = re.search(r'\[\[([^\]|]+)\|([^\]]+)\]\]', s)
    if m: return m.group(2).strip(), m.group(1).strip()
    m = re.search(r'\[\[([^\]]+)\]\]', s)
    if m: return m.group(1).strip(), m.group(1).strip()
    return re.sub(r'\{\{[^}]*\}\}', '', s).strip(), None


LINE_RX = re.compile(r"^\*\s*\{\{Party stripe\|((?:[^{}]|\{\{[^}]*\}\})*?)\}\}(.*)$", re.M)
TRAIL_PARTY = re.compile(r"\(([^()]*)\)[^()\w\]]*$")
def candidates(cell):
    out = []
    end = re.search(r'\{\{endplainlist\}\}|\n\}\}', cell, re.I)
    cell = cell[:end.start()] if end else cell
    for m in LINE_RX.finditer(cell):
        rest = re.sub(r'<ref[^>]*/>', '', m.group(2))
        rest = re.sub(r'<ref[^>]*>.*?</ref>', '', rest, flags=re.S)
        rest = re.sub(r'<ref[^>]*>.*$', '', rest)
        rest = re.sub(r'\{\{[^{}]*\}\}', '', rest).strip()
        pm = TRAIL_PARTY.search(rest)
        party = pm.group(1) if pm else m.group(1)
        nm, wiki = clean_link(rest[:pm.start()] if pm else rest)
        nm = re.sub(r"'{2,}", '', nm)
        nm = nm.replace('★', '').replace('✓', '').strip(" '’")
        if nm: out.append({'n': nm, 'p': party_of(party + ' ' + m.group(1)), 'pl': party.strip(), 'w': wiki})
    return out


def sortname(s):
    m = re.search(r'\{\{sortname\|([^|}]+)\|([^|}]+)', s)
    if m: return f'{m.group(1)} {m.group(2)}'.strip()
    m = re.search(r'^\s*\[\[([^\]|]+)(?:\|([^\]]+))?\]\]', s)
    if m: return (m.group(2) or m.group(1)).strip()
    return None


def parse_house(t):
    races = {}
    for sec in re.split(r'\n==([A-Z][A-Za-z ]+)==\n', t)[1:]:
        pass
    parts = re.split(r'\n==([A-Z][A-Za-z ]+)==\n', t)
    for i in range(1, len(parts), 2):
        state = parts[i].strip(); st = ST.get(state)
        if not st: continue
        body = parts[i + 1]
        tb = body[body.find('{|'):body.find('\n|}')]
        cur = None
        for row in re.split(r'\n\|-[^\n]*\n', tb):
            m = re.search(r'\{\{ushr\|([A-Z]{2})\|([A-Za-z0-9]+)\|', row)
            if m and row.lstrip().startswith('!'):
                d = m.group(2); d = 0 if d.upper() in ('AL', 'AT-LARGE') else int(d)
                rid = f'H-{st}-{d:02d}'
                pvi = re.search(r'shading PVI\|([RD]|EVEN)\|?(\d*)', row, re.I)
                cur = races.setdefault(rid, {'id': rid, 'o': 'H', 'st': st, 'd': d, 'pvi': (pvi.group(1).upper() + ('+' + pvi.group(2) if pvi.group(2) else '')) if pvi else None, 'inc': [], 'status': '', 'c': []})
                plist = row[row.find('{{plainlist'):] if '{{plainlist' in row.lower() else row
                i0 = row.lower().find('{{plainlist')
                if i0 >= 0: cur['c'] = candidates(row[i0:])
            if cur is None: continue
            inc = sortname(row.split('\n|', 2)[-1] if row.lstrip().startswith('!') else row.lstrip('|'))
            lines = [l for l in row.split('\n') if l.startswith('|')]
            # incumbent cells: name | party | first elected | status
            for j, l in enumerate(lines):
                if '{{sortname' in l or (re.match(r'^\|\s*\[\[', l) and j + 1 < len(lines) and re.search(r'Republican|Democratic|Independent', lines[j + 1])):
                    nm = sortname(l.lstrip('|'))
                    pty = party_of(lines[j + 1]) if j + 1 < len(lines) else None
                    status = re.sub(r'<ref[^>]*>.*?</ref>|<ref[^>]*/>|\{\{[^}]*\}\}\s*\|?|\[\[[^\]|]*\||\]\]|\[\[|<br ?/?>|<[^>]+>', ' ', lines[j + 3] if j + 3 < len(lines) else '').strip(' |')
                    status = re.sub(r'\s+', ' ', status)
                    if nm and not re.match(r'^\d', nm) and not any(x['n'] == nm for x in cur['inc']):
                        cur['inc'].append({'n': nm, 'p': pty, 'status': status})
            if 'None' in row and '(new seat)' in row: cur['status'] = 'New seat'
    for r in races.values():
        if r['inc'] and not r['status']: r['status'] = r['inc'][0]['status']
    return races


def parse_senate(t):
    races = {}
    start = t.find('=== Special elections during the preceding Congress ===')
    end = t.find('\n== Alabama ==')
    body = t[start:end]
    for row in re.split(r'\n\|-[^\n]*\n', body):
        m = re.match(r'\s*!\s*\[\[[^\]|]*\|([^\]]+)\]\](.*)', row)
        if not m: continue
        state = m.group(1).strip(); st = ST.get(state)
        if not st: continue
        special = 'Class 3' in m.group(2) or 'special' in row.split('\n')[0].lower()
        rid = f'S-{st}' + ('-SP' if special else '')
        pvi = re.search(r'Shading PVI\|([RD]|EVEN)\|?(\d*)', row, re.I)
        lines = [l for l in row.split('\n') if l.startswith('|')]
        nm = sortname(lines[1].lstrip('| ')) if len(lines) > 1 else None
        pty = party_of(lines[2]) if len(lines) > 2 else None
        stat = [l for l in lines if 'Incumbent' in l or 'appointee' in l.lower()]
        status = re.sub(r'<ref[^>]*>.*?</ref>|<ref[^>]*/>|\{\{[^}]*\}\}|data-sort-value=\S+|\[\[[^\]|]*\||\]\]|\[\[|<br ?/?>|<[^>]+>', ' ', stat[0] if stat else '').strip(' |')
        status = re.sub(r'\s+', ' ', status).strip(' |')
        i0 = row.find('{{Plainlist') if '{{Plainlist' in row else row.find('{{plainlist')
        races[rid] = {'id': rid, 'o': 'S', 'st': st, 'd': None, 'sp': special, 'pvi': (pvi.group(1).upper() + ('+' + pvi.group(2) if pvi.group(2) else '')) if pvi else None,
                      'inc': [{'n': nm, 'p': pty, 'status': status}] if nm else [], 'status': status, 'c': candidates(row[i0:]) if i0 >= 0 else []}
    return races


def main():
    fetch_elections()
    house = parse_house(open(os.path.join(WORK, 'house.txt'), encoding='utf-8').read())
    senate = parse_senate(open(os.path.join(WORK, 'senate.txt'), encoding='utf-8').read())
    races = {**senate, **house}

    # incumbents -> bioguide ids
    leg = yaml.safe_load(open(os.path.join(WORK, 'legislators-current.yaml')))
    cur = []
    for p in leg:
        t = p['terms'][-1]
        cur.append({'bg': p['id']['bioguide'], 'fec': p['id'].get('fec', []), 'st': t['state'], 'type': t['type'], 'd': t.get('district'), 'np': set(name_parts(p['name'].get('official_full') or (p['name']['first'] + ' ' + p['name']['last']))), 'last': norm(p['name']['last']).split()})
    def bio(name, st):
        np = set(name_parts(name))
        best = [c for c in cur if c['st'] == st and set(c['last']) <= np]
        return best[0] if len(best) == 1 else next((c for c in best if len(np & c['np']) >= 2), best[0] if best else None)

    # FEC money
    fec = collections.defaultdict(list)
    for r in csv.DictReader(open(os.path.join(WORK, 'cs26.csv'), encoding='latin-1')):
        o = r['Cand_Office']
        if o not in ('H', 'S'): continue
        d = int(r['Cand_Office_Dist'] or 0) if o == 'H' else None
        fec[(o, r['Cand_Office_St'], d)].append(r)
    f = lambda x: round(float(x or 0))
    def fec_match(race, c, fecids):
        pool = fec.get((race['o'], race['st'], race['d']), [])
        if fecids:
            hit = [r for r in pool if r['Cand_Id'] in fecids] or [r for r in sum(fec.values(), []) if r['Cand_Id'] in fecids and r['Cand_Office'] == race['o']]
            if hit: return max(hit, key=lambda r: float(r['Total_Receipt'] or 0))
        np = name_parts(c['n'])
        if not np: return None
        last = np[-1]
        hits = []
        for r in pool:
            fn = name_parts(r['Cand_Name'].replace(',', ' '))
            if last in fn or (len(np) > 1 and np[-2] in fn and len(np[-2]) > 3):
                score = len(set(np) & set(fn)) + (1 if party_of(r['Cand_Party_Affiliation'].replace('DEM', 'democrat').replace('REP', 'republican')) == c['p'] else 0)
                hits.append((score, float(r['Total_Receipt'] or 0), r))
        if not hits: return None
        hits.sort(key=lambda x: (-x[0], -x[1]))
        return hits[0][2] if hits[0][0] >= 2 else None

    # outside spending, de-duplicated across amendments
    ie = {}
    for r in csv.DictReader(open(os.path.join(WORK, 'ie26.csv'), encoding='latin-1')):
        key = (r['spe_id'], r['tran_id'])
        try: fn = int(r['file_num'] or 0)
        except ValueError: fn = 0
        if key not in ie or fn >= ie[key][0]: ie[key] = (fn, r)
    # bogus self-filed reports (single lines in the billions) would swamp real totals; drop those filers entirely
    junk = set()
    for fn, r in ie.values():
        try:
            if float(r['exp_amo'] or 0) > 20_000_000: junk.add(r['spe_id'])
        except ValueError: pass
    ie = {k: v for k, v in ie.items() if v[1]['spe_id'] not in junk}
    by_cand = collections.defaultdict(lambda: {'S': 0, 'O': 0, 'by': collections.Counter(), 'last': ''})
    spender_name = {}
    for fn, r in ie.values():
        try: amt = float(r['exp_amo'] or 0)
        except ValueError: continue
        if amt <= 0 or r['sup_opp'] not in ('S', 'O'): continue
        x = by_cand[r['cand_id']]; x[r['sup_opp']] += amt
        x['by'][(r['spe_id'], r['sup_opp'])] += amt
        spender_name[r['spe_id']] = r['spe_nam']
        d = r['dissem_dt'] or r['exp_date'] or ''
        x['last'] = max(x['last'], d[-2:] + d[3:6] + d[:2]) if d else x['last']

    out = []
    for race in races.values():
        inc_bg = []
        for i in race['inc']:
            b = bio(i['n'], race['st'])
            if b and ((race['o'] == 'S' and b['type'] == 'sen') or (race['o'] == 'H' and b['type'] == 'rep')):
                i['bg'] = b['bg']; inc_bg.append(b)
        spenders = collections.Counter()
        taken = set(); used_fec = set()
        for c in sorted(race['c'], key=lambda c: c['w'] is None):
            b = bio(c['n'], race['st'])
            if b and b['bg'] in taken: b = None
            if b: taken.add(b['bg'])
            fecids = []
            if b and any(set(b['last']) <= set(name_parts(c['n'])) for _ in [0]):
                if (race['o'] == 'S' and b['type'] == 'sen') or (race['o'] == 'H' and b['type'] == 'rep'):
                    c['bg'] = b['bg']; fecids = b['fec']
                    c['inc'] = any(b['bg'] == x.get('bg') for x in race['inc'])
                elif b['type'] == 'rep' and race['o'] == 'S' and c['w']:
                    c['bg'] = b['bg']; fecids = b['fec']   # a House member running for Senate
            r = fec_match(race, c, fecids)
            if r and r['Cand_Id'] in used_fec: r = None
            if r:
                used_fec.add(r['Cand_Id'])
                c['fec'] = r['Cand_Id']; c['r'] = f(r['Total_Receipt']); c['s'] = f(r['Total_Disbursement']); c['cash'] = f(r['Cash_On_Hand_COP']); c['debt'] = f(r['Debt_Owed_By_Committee'])
                c['thru'] = r['Coverage_End_Date']
                c['small'] = f(r['Individual_Unitemized_Contribution']); c['pac'] = f(r['Other_Committee_Contribution']); c['self'] = f(r['Cand_Contribution']) + f(r['Cand_Loan'])
                x = by_cand.get(r['Cand_Id'])
                if x:
                    c['for'] = round(x['S']); c['vs'] = round(x['O'])
                    for (sid, so), amt in x['by'].items(): spenders[(sid, so, c['n'])] += amt
        race['c'].sort(key=lambda c: (-(c.get('r') or 0)))
        race['out'] = [[spender_name[sid], sid, so, nm, round(a)] for (sid, so, nm), a in spenders.most_common(12)]
        race['ot'] = round(sum(spenders.values()))
        race['rt'] = sum(c.get('r') or 0 for c in race['c'])
        out.append(race)
    out.sort(key=lambda r: (r['o'] != 'S', r['st'], r['d'] or 0))
    # outside spending groups: who they spent for and against, by race
    cand_race = {c['fec']: (r['id'], c['n'], c['p']) for r in out for c in r['c'] if c.get('fec')}
    groups = collections.defaultdict(lambda: {'S': 0, 'O': 0, 'rows': collections.Counter(), 'pty': collections.Counter()})
    for (fn, r) in ie.values():
        try: amt = float(r['exp_amo'] or 0)
        except ValueError: continue
        if amt <= 0 or r['sup_opp'] not in ('S', 'O'): continue
        g = groups[r['spe_id']]; g['S' if r['sup_opp'] == 'S' else 'O'] += amt
        cr = cand_race.get(r['cand_id'])
        nm = cr[1] if cr else ' '.join(reversed([x.strip() for x in r['cand_name'].title().split(',', 1)]))
        g['rows'][(r['cand_id'], nm, cr[0] if cr else '', r['sup_opp'])] += amt
        p = cr[2] if cr else party_of(r['cand_pty_aff'] or '')
        # helping a Democrat or attacking a Republican counts toward Democrats, and the reverse
        side = p if r['sup_opp'] == 'S' else {'D': 'R', 'R': 'D'}.get(p, 'O')
        g['pty'][side] += amt
    gout = []
    for sid, g in groups.items():
        tot = g['S'] + g['O']
        if tot < 10000: continue
        gout.append({'id': sid, 'n': spender_name.get(sid, sid), 'tot': round(tot), 'for': round(g['S']), 'vs': round(g['O']),
                     'side': {k: round(v) for k, v in g['pty'].items()},
                     'rows': [[cid, nm, rid, so, round(a)] for (cid, nm, rid, so), a in g['rows'].most_common(40)]})
    gout.sort(key=lambda g: -g['tot'])
    json.dump(gout, open(os.path.join(OUT, 'outside_groups.json'), 'w'), separators=(',', ':'))
    exp = os.environ.get('EXPORT_DIR')
    if exp:
        import gzip
        os.makedirs(exp, exist_ok=True)
        with gzip.open(os.path.join(exp, 'races.jsonl.gz'), 'wt', encoding='utf-8') as fh:
            for r in out: fh.write(json.dumps({'id': r['id'], 'office': r['o'], 'state': r['st'], 'district': r['d'], 'data': r}, separators=(',', ':'), ensure_ascii=False) + '\n')
        with gzip.open(os.path.join(exp, 'outside_groups.jsonl.gz'), 'wt', encoding='utf-8') as fh:
            for g in gout: fh.write(json.dumps({'id': g['id'], 'name': g['n'], 'total': g['tot'], 'data': g}, separators=(',', ':'), ensure_ascii=False) + '\n')
    print('outside groups', len(gout), 'top', [(g['n'], g['tot']) for g in gout[:5]])
    json.dump({'asOf': time.strftime('%Y-%m-%d'), 'races': out}, open(os.path.join(OUT, 'races.json'), 'w'), separators=(',', ':'))
    nc = sum(len(r['c']) for r in out); nm = sum(1 for r in out for c in r['c'] if c.get('fec'))
    print('races', len(out), 'senate', sum(r['o'] == 'S' for r in out), 'house', sum(r['o'] == 'H' for r in out), 'candidates', nc, 'with FEC money', nm,
          'races w/o cands', [r['id'] for r in out if not r['c']][:20])


if __name__ == '__main__':
    main()
