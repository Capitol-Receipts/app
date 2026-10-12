"""Per member-congress attendance and party loyalty for every Congress since 1789, plus party breakdown of
every Senate nomination roll call. Source: Voteview HSall_*.csv
Out: data/hist/mc_stats.json  {"congress|chamber|icpsr": [elig, missed, partyVotes, withParty]}
     data/hist/nom_votes.json [{congress, roll, date, yea, nay, result, desc, question, dtl, br:{party:[y,n]}}]
"""
import json, os
import numpy as np
import pandas as pd

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'hist')
mem = pd.read_csv(os.path.join(D, 'HSall_members.csv'), usecols=['congress', 'chamber', 'icpsr', 'party_code'])
mem = mem[mem.chamber != 'President'].drop_duplicates(['congress', 'chamber', 'icpsr'])
print('members', len(mem), flush=True)
v = pd.read_csv(os.path.join(D, 'HSall_votes.csv'), usecols=['congress', 'chamber', 'rollnumber', 'icpsr', 'cast_code'],
                dtype={'congress': np.int16, 'chamber': 'category', 'rollnumber': np.int32, 'icpsr': np.int32, 'cast_code': np.int8})
v = v[v.chamber != 'President']
v['chamber'] = v['chamber'].astype(str)
print('votes', len(v), flush=True)
v = v.merge(mem, on=['congress', 'chamber', 'icpsr'], how='left')
v['party_code'] = v['party_code'].fillna(0).astype(np.int32)
v = v[v.cast_code > 0]  # 0 = not a member at the time
v['yea'] = v.cast_code.between(1, 3)
v['nay'] = v.cast_code.between(4, 6)
v['miss'] = v.cast_code >= 7

# party majority direction on each roll call
voters = v[v.yea | v.nay]
g = voters.groupby(['congress', 'chamber', 'rollnumber', 'party_code']).agg(y=('yea', 'sum'), n=('nay', 'sum')).reset_index()
g['tot'] = g.y + g.n
# two largest parties per roll call
g = g.sort_values(['congress', 'chamber', 'rollnumber', 'tot'], ascending=[True, True, True, False])
g['rk'] = g.groupby(['congress', 'chamber', 'rollnumber']).cumcount()
top = g[g.rk < 2].copy()
top['dir'] = np.where(top.y > top.n, 1, np.where(top.n > top.y, -1, 0))
pv = top.groupby(['congress', 'chamber', 'rollnumber']).agg(d=('dir', lambda s: tuple(s)), cnt=('dir', 'size')).reset_index()
pv['split'] = pv.apply(lambda r: r.cnt == 2 and 0 not in r.d and r.d[0] != r.d[1], axis=1)
split = pv[pv.split][['congress', 'chamber', 'rollnumber']]
print('party-split roll calls', len(split), flush=True)
pdir = top.merge(split, on=['congress', 'chamber', 'rollnumber'])[['congress', 'chamber', 'rollnumber', 'party_code', 'dir']]

vv = voters.merge(pdir, on=['congress', 'chamber', 'rollnumber', 'party_code'], how='inner')
vv['with'] = ((vv.dir == 1) & vv.yea) | ((vv.dir == -1) & vv.nay)
loy = vv.groupby(['congress', 'chamber', 'icpsr']).agg(pvn=('with', 'size'), pw=('with', 'sum')).reset_index()
att = v.groupby(['congress', 'chamber', 'icpsr']).agg(elig=('miss', 'size'), missed=('miss', 'sum')).reset_index()
st = att.merge(loy, on=['congress', 'chamber', 'icpsr'], how='left').fillna(0)
out = {f'{r.congress}|{r.chamber}|{r.icpsr}': [int(r.elig), int(r.missed), int(r.pvn), int(r.pw)] for r in st.itertuples()}
json.dump(out, open(os.path.join(D, 'mc_stats.json'), 'w'), separators=(',', ':'))
print('mc_stats', len(out), flush=True)

# nomination roll calls (Senate)
rc = pd.read_csv(os.path.join(D, 'HSall_rollcalls.csv'), low_memory=False)
rc = rc[rc.chamber == 'Senate']
q = rc.vote_question.fillna('').str.lower()
dd = rc.dtl_desc.fillna('').str.lower()
desc = rc.vote_desc.fillna('').str.lower()
is_nom = q.str.contains('nomination') | (q.str.contains('confirm') & ~q.str.contains('cloture')) | \
    ((q == '') & (dd.str.contains('to confirm|confirmation of|nomination of', regex=True))) | \
    ((q == '') & desc.str.contains('to confirm|nomination of', regex=True))
nom = rc[is_nom & ~q.str.contains('cloture|motion to proceed|reconsider|table|recommit|postpone|executive session', regex=True)]
print('nomination roll calls', len(nom), flush=True)
sv = voters[voters.chamber == 'Senate']
br = sv.merge(nom[['congress', 'rollnumber']], on=['congress', 'rollnumber']).groupby(['congress', 'rollnumber', 'party_code']).agg(y=('yea', 'sum'), n=('nay', 'sum')).reset_index()
brd = {}
for r in br.itertuples():
    brd.setdefault((r.congress, r.rollnumber), {})[int(r.party_code)] = [int(r.y), int(r.n)]
recs = []
for r in nom.itertuples():
    recs.append({'c': int(r.congress), 'roll': int(r.rollnumber), 'date': r.date, 'yea': int(r.yea_count), 'nay': int(r.nay_count),
                 'result': r.vote_result if isinstance(r.vote_result, str) else '', 'desc': r.vote_desc if isinstance(r.vote_desc, str) else '',
                 'q': r.vote_question if isinstance(r.vote_question, str) else '', 'dtl': r.dtl_desc if isinstance(r.dtl_desc, str) else '',
                 'br': brd.get((r.congress, r.rollnumber), {})})
json.dump(recs, open(os.path.join(D, 'nom_votes.json'), 'w'), separators=(',', ':'))
print('done', len(recs))
