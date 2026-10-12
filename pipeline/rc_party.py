"""Party breakdown for every House and Senate roll call since 2003 (108th Congress), keyed the way congress.gov records them.
Out: data/hist/rc_party.json {"c|H|session|clerkroll": [date, yea, nay, result, question, {party:[y,n]}]}"""
import json, os
import numpy as np
import pandas as pd

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'hist')
rc = pd.read_csv(f'{D}/HSall_rollcalls.csv', low_memory=False)
rc = rc[(rc.congress >= 108) & rc.chamber.isin(['House', 'Senate'])]
mem = pd.read_csv(f'{D}/HSall_members.csv', usecols=['congress', 'chamber', 'icpsr', 'party_code'])
mem = mem[(mem.congress >= 108) & (mem.chamber != 'President')].drop_duplicates(['congress', 'chamber', 'icpsr'])
parts = []
for ch in pd.read_csv(f'{D}/HSall_votes.csv', usecols=['congress', 'chamber', 'rollnumber', 'icpsr', 'cast_code'], chunksize=3_000_000):
    ch = ch[(ch.congress >= 108) & ch.chamber.isin(['House', 'Senate'])]
    if len(ch):
        parts.append(ch)
v = pd.concat(parts).merge(mem, on=['congress', 'chamber', 'icpsr'], how='left')
v['pc'] = v.party_code.fillna(0).map(lambda x: {100: 'D', 200: 'R'}.get(int(x), 'I'))
v['y'] = v.cast_code.between(1, 3).astype(int)
v['n'] = v.cast_code.between(4, 6).astype(int)
g = v.groupby(['congress', 'chamber', 'rollnumber', 'pc'])[['y', 'n']].sum().reset_index()
br = {}
for r in g.itertuples():
    br.setdefault((r.congress, r.chamber, r.rollnumber), {})[r.pc] = [int(r.y), int(r.n)]
out = {}
for r in rc.itertuples():
    sess = int(r.session) if r.session == r.session else 0
    cr = int(r.clerk_rollnumber) if r.clerk_rollnumber == r.clerk_rollnumber else 0
    key = f"{r.congress}|{r.chamber[0]}|{sess}|{cr}"
    out[key] = [r.date, int(r.yea_count), int(r.nay_count), r.vote_result if isinstance(r.vote_result, str) else '',
                r.vote_question if isinstance(r.vote_question, str) else '', br.get((r.congress, r.chamber, r.rollnumber), {})]
json.dump(out, open(f'{D}/rc_party.json', 'w'), separators=(',', ':'))
print('roll calls', len(out))
