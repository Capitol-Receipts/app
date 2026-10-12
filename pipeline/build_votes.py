"""Every recorded House and Senate vote since 1789, member by member (Voteview).

Packs each Congress and chamber into one record: the roll calls, the members, and one string per member
with a character per roll call (Y yes, N no, P present, . not voting / not serving).
Usage: python build_votes.py <dir with HSall_votes.csv, HSall_rollcalls.csv, HSall_members.csv> [only_congress]
Writes congress_votes.jsonl.gz into EXPORT_DIR (or the input dir).
"""
import csv, gzip, json, os, sys, collections

D = sys.argv[1]
ONLY = int(sys.argv[2]) if len(sys.argv) > 2 else None
OUT = os.environ.get('EXPORT_DIR', D)
csv.field_size_limit(10_000_000)
CH = {'House': 'H', 'Senate': 'S'}
PARTY = {100: 'D', 200: 'R', 328: 'I'}

rc = collections.defaultdict(list)
for r in csv.DictReader(open(os.path.join(D, 'HSall_rollcalls.csv'), encoding='utf-8')):
    if r['chamber'] not in CH: continue
    c = int(r['congress'])
    if ONLY and c != ONLY: continue
    desc = (r['vote_desc'] or r['dtl_desc'] or '').strip()
    rc[(c, CH[r['chamber']])].append([int(r['rollnumber']), r['date'], r['bill_number'] or '', (r['vote_question'] or '')[:80], (r['vote_result'] or '')[:40],
                                      int(r['yea_count'] or 0), int(r['nay_count'] or 0), desc[:160]])
for k in rc: rc[k].sort()
pos = {k: {row[0]: i for i, row in enumerate(v)} for k, v in rc.items()}

mem = collections.defaultdict(dict)
for r in csv.DictReader(open(os.path.join(D, 'HSall_members.csv'), encoding='utf-8')):
    if r['chamber'] not in CH: continue
    c = int(r['congress'])
    if ONLY and c != ONLY: continue
    nm = r['bioname'] or ''
    if ',' in nm:
        parts = [x.strip() for x in nm.split(',')]
        suf = ' '.join(x.title().replace('Iii', 'III').replace('Ii', 'II').replace('Iv', 'IV') for x in parts[2:])
        nm = f"{parts[1]} {parts[0].title()}{' ' + suf if suf else ''}"
    p = PARTY.get(int(float(r['party_code'] or 0)), 'O')
    mem[(c, CH[r['chamber']])][r['icpsr']] = [r['bioguide_id'] or ('i' + r['icpsr']), nm, p, r['state_abbrev'], int(float(r['district_code'] or 0))]

votes = collections.defaultdict(dict)
CODE = {'1': 'Y', '2': 'Y', '3': 'Y', '4': 'N', '5': 'N', '6': 'N', '7': 'P'}
with open(os.path.join(D, 'HSall_votes.csv'), encoding='utf-8') as f:
    f.readline()
    for line in f:
        c, ch, roll, icpsr, cast = line.split(',', 5)[:5]
        if ch not in CH: continue
        c = int(c)
        if ONLY and c != ONLY: continue
        k = (c, CH[ch])
        i = pos.get(k, {}).get(int(roll))
        if i is None: continue
        v = votes[k].get(icpsr)
        if v is None:
            v = votes[k][icpsr] = bytearray(b'.' * len(rc[k]))
        ch_ = CODE.get(cast.strip())
        if ch_: v[i] = ord(ch_)

os.makedirs(OUT, exist_ok=True)
n = 0
with gzip.open(os.path.join(OUT, 'congress_votes.jsonl.gz'), 'wt', encoding='utf-8') as fh:
    for k in sorted(rc):
        ms = [ic for ic in votes[k] if ic in mem[k]]
        ms.sort(key=lambda ic: (mem[k][ic][3], mem[k][ic][4], mem[k][ic][1]))
        rec = {'rc': rc[k], 'm': [mem[k][ic] for ic in ms], 'v': [votes[k][ic].decode() for ic in ms]}
        fh.write(json.dumps({'id': f'{k[0]}-{k[1]}', 'congress': k[0], 'chamber': k[1], 'data': rec}, separators=(',', ':'), ensure_ascii=False) + '\n')
        n += 1
print('congress-chambers', n, 'roll calls', sum(len(v) for v in rc.values()))
