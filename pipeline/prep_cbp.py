"""Bills 1947-2002 (80th-107th Congress) from the Congressional Bills Project (Adler & Wilkerson, via the Policy Agendas Project),
matched to members by name, chamber and Congress. Out: data/hist/cbp_bills.json, data/hist/cbp_laws.json"""
import csv, json, os, re, collections, datetime

B = os.path.dirname(os.path.abspath(__file__))
H = f'{B}/data/hist'
norm = lambda s: re.sub(r'[^a-z]', '', (s or '').lower())
TOP = {1: 'Economy', 2: 'Civil rights', 3: 'Health', 4: 'Agriculture', 5: 'Labor', 6: 'Education', 7: 'Environment', 8: 'Energy', 9: 'Immigration',
       10: 'Transportation', 12: 'Law and crime', 13: 'Social welfare', 14: 'Housing', 15: 'Business and commerce', 16: 'Defense', 17: 'Science and technology',
       18: 'Foreign trade', 19: 'International affairs', 20: 'Government operations', 21: 'Public lands', 23: 'Arts and culture'}
idx = collections.defaultdict(list)  # (congress, chamber, last) -> [(first, bioguide)]
for r in csv.DictReader(open(f'{H}/HSall_members.csv')):
    if r['chamber'] not in ('House', 'Senate') or not r['bioguide_id']:
        continue
    c = int(r['congress'])
    if c < 80 or c > 107:
        continue
    bn = r['bioname']
    last, _, rest = bn.partition(',')
    idx[(c, r['chamber'][0], norm(last))].append((norm(rest.split()[0]) if rest.split() else '', r['bioguide_id'], rest))


def date(s):
    try:
        m, d, y = s.split('/')
        y = int(y)
        y += 1900 if y > 30 else 2000
        return f'{y:04d}-{int(m):02d}-{int(d):02d}'
    except Exception:
        return ''


out = collections.defaultdict(list)
laws = {}
miss = 0
for x in csv.DictReader(open(f'{H}/cbp.csv', encoding='utf-8', errors='replace')):
    c = int(x['cong'])
    if c < 80 or c > 107:
        continue
    nm = x['name_full'].strip()
    toks = [t for t in re.split(r'[\s,]+', nm) if t and not re.match(r'^(Jr|Sr|II|III|IV)\.?$', t)]
    if not toks:
        continue
    if ',' in nm:
        last, first = nm.split(',')[0], (toks[1] if len(toks) > 1 else '')
    else:
        last, first = toks[-1], toks[0]
    ch = 'H' if x['chamber'] == '1' else 'S'
    cands = idx.get((c, ch, norm(last)), [])
    if not cands and ' ' in nm and ',' not in nm and len(toks) >= 3:  # two-word surnames like "Van Deerlin"
        cands = idx.get((c, ch, norm(''.join(toks[-2:]))), [])
    bio = None
    if len(cands) == 1:
        bio = cands[0][1]
    elif cands:
        f = norm(first)
        hit = [k for k in cands if k[0] == f] or [k for k in cands if k[0][:1] == f[:1] and f] or [k for k in cands if f and f in norm(k[2])]
        if len(hit) >= 1:
            bio = hit[0][1]
    if not bio:
        miss += 1
        continue
    ty = x['bill_type'].lower()
    n = int(x['bill_no'])
    law = 1 if x['filter_plaw'] == '1' else 0
    try:
        topic = TOP.get(int(x['majortopic'] or 0), '')
    except ValueError:
        topic = ''
    intro = date(x['intr_date']) or (x['year'] + '-01-01' if x['year'] else '')
    desc = re.sub(r'\s+', ' ', x['description'] or '').strip()
    out[bio].append([c, ty, n, desc[:160], law, topic, intro, -1])
    if law:
        ld = date(x['plaw_date'])
        ms = {'L': ld}
        if x['pass_h'] == '1': ms['H'] = '?'
        if x['pass_s'] == '1': ms['S'] = '?'
        laws[f'{c}-{ty}-{n}'] = [desc[:400], '', bio, nm, intro, None, {}, topic, [], '', ms, f"Public Law {x['plaw_no']}" if x['plaw_no'] else 'Became law', [ld, ''], []]
json.dump(out, open(f'{H}/cbp_bills.json', 'w'), separators=(',', ':'))
json.dump(laws, open(f'{H}/cbp_laws.json', 'w'), separators=(',', ':'))
print('sponsors', len(out), 'bills', sum(len(v) for v in out.values()), 'laws', len(laws), 'unmatched', miss)
