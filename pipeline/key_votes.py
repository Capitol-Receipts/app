"""Landmark votes since 1990: how every member voted on final passage. Source: Voteview roll calls and votes.
Out: data/hist/key_votes.json {"votes": [...], "cast": {bioguide: [[voteIndex, 'Y'|'N'|'M'], ...]}}"""
import json, os, csv
import pandas as pd, numpy as np
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'hist')
L = [(101, 'S933', 'Americans with Disabilities Act', 1990), (103, 'HR1025', 'Brady gun background checks', 1993), (103, 'HR3450', 'NAFTA trade deal', 1993),
     (103, 'HR3355', '1994 crime bill', 1994), (104, 'S652', 'Telecommunications Act', 1996), (104, 'HR3734', 'Welfare reform', 1996), (104, 'HR3396', 'Defense of Marriage Act', 1996),
     (105, 'HRES611', 'Impeach President Clinton (Art. I)', 1998), (106, 'S900', 'Bank deregulation (Glass-Steagall repeal)', 1999), (107, 'HR1836', 'Bush tax cuts', 2001),
     (107, 'HR3162', 'USA PATRIOT Act', 2001), (107, 'HR1', 'No Child Left Behind', 2001), (107, 'HJRES114', 'Iraq War authorization', 2002),
     (108, 'HR1', 'Medicare prescription drugs (Part D)', 2003), (110, 'HR1424', 'Bank bailout (TARP)', 2008), (111, 'HR1', 'Obama stimulus (Recovery Act)', 2009),
     (111, 'HR3590', 'Affordable Care Act', 2010), (111, 'HR4173', 'Dodd-Frank Wall Street reform', 2010), (115, 'HR1', 'Tax Cuts and Jobs Act', 2017),
     (115, 'S756', 'First Step Act (criminal justice)', 2018), (116, 'HRES755', 'Impeach President Trump (Art. I, 2019)', 2019), (116, 'HR748', 'CARES Act (COVID relief)', 2020),
     (117, 'HR1319', 'American Rescue Plan', 2021), (117, 'HRES24', 'Impeach President Trump (2021)', 2021), (117, 'HR3684', 'Bipartisan infrastructure law', 2021),
     (117, 'HR4346', 'CHIPS and Science Act', 2022), (117, 'HR5376', 'Inflation Reduction Act', 2022), (117, 'HR8404', 'Respect for Marriage Act', 2022),
     (118, 'HR3746', 'Debt ceiling deal (Fiscal Responsibility Act)', 2023), (118, 'HR815', 'Ukraine, Israel and Taiwan aid', 2024), (119, 'HR1', 'One Big Beautiful Bill Act', 2025)]
rc = pd.read_csv(f'{D}/HSall_rollcalls.csv', low_memory=False)
rc = rc[rc.congress >= 101]
picked = []
for c, b, label, yr in L:
    sub = rc[(rc.congress == c) & (rc.bill_number.fillna('').str.upper() == b)]
    for ch in ('House', 'Senate'):
        s = sub[sub.chamber == ch]
        q = s.vote_question.fillna('').str.lower() + ' ' + s.vote_desc.fillna('').str.lower()
        fin = s[q.str.contains('passage|pass |conference report|concur|agreeing to the resolution|article|joint resolution', regex=True) & ~q.str.contains('motion to recommit|cloture|table|previous question|amendment no|waive', regex=True)]
        if not len(fin) and ch == 'Senate':
            fin = s[q.str.contains('on the motion', regex=True) & ~q.str.contains('cloture|table|waive|amendment no', regex=True)]
        if b.startswith('HRES'):
            fin = s[q.str.contains('article i\\b|article 1|agreeing to|resolution', regex=True)]
            fin = fin.head(1)
        if len(fin):
            r = fin.iloc[-1] if not b.startswith('HRES') else fin.iloc[0]
            picked.append(dict(c=c, ch=ch[0], roll=int(r.rollnumber), label=label, year=yr, date=r.date, yea=int(r.yea_count), nay=int(r.nay_count), res=str(r.vote_result) if isinstance(r.vote_result, str) else '', bill=b, q=str(r.vote_question) if isinstance(r.vote_question, str) else ''))
print('votes picked', len(picked))
for p in picked: print(p['c'], p['ch'], p['bill'], p['label'][:30], p['yea'], p['nay'], p['q'][:40])
keys = {(p['c'], p['ch'], p['roll']): i for i, p in enumerate(picked)}
mem = pd.read_csv(f'{D}/HSall_members.csv', usecols=['congress', 'chamber', 'icpsr', 'bioguide_id', 'party_code'])
mem = mem[mem.congress >= 101]
bio = {(r.congress, r.chamber[0], r.icpsr): (r.bioguide_id, r.party_code) for r in mem.itertuples()}
cast = {}
br = {i: {} for i in range(len(picked))}
for chunk in pd.read_csv(f'{D}/HSall_votes.csv', usecols=['congress', 'chamber', 'rollnumber', 'icpsr', 'cast_code'], chunksize=3_000_000):
    chunk = chunk[chunk.congress >= 101]
    for r in chunk.itertuples():
        k = keys.get((r.congress, r.chamber[0], r.rollnumber))
        if k is None: continue
        b, pc = bio.get((r.congress, r.chamber[0], r.icpsr), (None, 0))
        if not isinstance(b, str): continue
        cc = 'Y' if 1 <= r.cast_code <= 3 else 'N' if 4 <= r.cast_code <= 6 else 'M' if r.cast_code >= 7 else None
        if not cc: continue
        cast.setdefault(b, []).append([k, cc])
        pk = {100: 'D', 200: 'R'}.get(int(pc), 'I')
        a = br[k].setdefault(pk, [0, 0])
        if cc == 'Y': a[0] += 1
        elif cc == 'N': a[1] += 1
for i, p in enumerate(picked): p['br'] = br[i]
json.dump({'votes': picked, 'cast': cast}, open(f'{D}/key_votes.json', 'w'), separators=(',', ':'))
print('members with key votes', len(cast))
