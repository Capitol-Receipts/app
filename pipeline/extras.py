"""Add PAC donors, donor employers, itemized stock trades and lobbying to data.json. All from public filings."""
import json, sys, re, zipfile, collections, datetime, glob, os
D, IN, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
data = json.load(open(IN))
MEM = {m['id']: m for m in data['members']}
norm = lambda s: re.sub(r'[^a-z]', '', (s or '').lower())
title = lambda s: re.sub(r"\b([A-Z])([A-Z']*)\b", lambda m: m.group(1) + m.group(2).lower(), s or '').replace("'S ", "'s ").strip()
ACR = re.compile(r'\b(Pac|Llc|Usa|Us|Afl-Cio|Nra|Aipac|Ibew|Seiu|Uaw|Afscme|Nea|Aft|Ups|At&T|Bnsf|Cvs|Ge|Ibm|Jp|Pnc|Kpmg|Pwc|Ey|Lpl|Hca|Nrecc|Nrsc|Dccc|Dscc|Nrcc|Rnc|Dnc)\b', re.I)
nice = lambda s: ACR.sub(lambda m: m.group(0).upper(), title(s))

# ---------- PAC contributions ----------
cm = {}
z = zipfile.ZipFile(f'{D}/cm26.zip')
for line in z.read(z.namelist()[0]).decode('latin-1').splitlines():
    f = line.split('|')
    if len(f) >= 15: cm[f[0]] = f
def category(f):
    if not f: return 'Other PACs'
    dsgn, tp, org = f[8], f[9], f[12]
    if dsgn == 'D': return 'Other politicians’ PACs'
    if tp in ('X', 'Y', 'Z'): return 'Party committees'
    if tp in ('H', 'S', 'P'): return 'Other campaigns'
    if org in ('C', 'W'): return 'Company PACs'
    if org == 'L': return 'Labor unions'
    if org == 'T': return 'Trade groups'
    if org in ('M', 'V'): return 'Membership groups'
    return 'Issue & ideological PACs'
cand2bg = {}
for m in data['members']:
    pass
import yaml
for l in yaml.safe_load(open(f'{D}/legislators-current.yaml')):
    for fid in l['id'].get('fec', []): cand2bg[fid] = l['id']['bioguide']
give = collections.defaultdict(collections.Counter); cat = collections.defaultdict(collections.Counter)
ie_for = collections.Counter(); ie_against = collections.Counter()
z = zipfile.ZipFile(f'{D}/pas226.zip')
for line in z.read(z.namelist()[0]).decode('latin-1').splitlines():
    f = line.split('|')
    if len(f) < 22 or f[16] not in cand2bg or f[19] == 'X': continue
    bg = cand2bg[f[16]]
    try: amt = float(f[14])
    except ValueError: continue
    tp = f[5]
    if tp in ('24K', '24Z'):
        give[bg][f[0]] += amt; cat[bg][category(cm.get(f[0]))] += amt
    elif tp == '24E': ie_for[bg] += amt
    elif tp == '24A': ie_against[bg] += amt
def pacname(cid):
    f = cm.get(cid)
    if not f: return cid
    org = f[13].strip()
    return nice(org if org and org.upper() not in ('NONE', 'N/A', 'NA') else f[1])
for bg, m in MEM.items():
    if bg in give:
        m['pacs'] = [[pacname(c), round(v), category(cm.get(c))] for c, v in give[bg].most_common(10) if v > 0]
        m['pacCats'] = [[k, round(v)] for k, v in cat[bg].most_common() if v > 0]
    if ie_for[bg] or ie_against[bg]: m['outside'] = [round(ie_for[bg]), round(ie_against[bg])]

# ---------- donor employers ----------
dn = json.load(open(f'{D}/donors26.json'))
for bg, x in dn.items():
    if bg not in MEM: continue
    m = MEM[bg]
    m['employers'] = [[nice(e), v, n] for e, v, n in x['employers'][:10]]
    m['donations'] = x['donations']
    if m.get('money') and m['money']['indiv']:
        small = max(0, m['money']['indiv'] - x['itemized'])
        m['smallShare'] = round(small / m['money']['rec'], 4) if m['money']['rec'] > 0 else None
        m['money']['small'] = round(small); m['money']['itemized'] = x['itemized']

# ---------- itemized stock trades ----------
def amt_range(lo, hi):
    p = lambda s: int(re.sub(r'[^\d]', '', s)) if s else None
    return p(lo), p(hi)
def tdate(s):
    try: return datetime.datetime.strptime(s, '%m/%d/%Y').strftime('%Y-%m-%d')
    except Exception: return None
def tradedate(s, filed):
    # a trade can't happen after the report that discloses it: a later date is almost always a year typo in the filing
    d = tdate(s)
    if d and filed and d > filed:
        prev = str(int(d[:4]) - 1) + d[4:]
        return prev if prev <= filed else None
    return d
hp = json.load(open(f'{D}/ptr_parsed.json'))
house_keys = {}
for m in MEM.values():
    if m['chamber'] == 'House':
        dist = int(m['district'] or 0)
        house_keys[m['id']] = ({f"{m['state']}{dist:02d}", f"{m['state']}AL", f"{m['state']}00"}, norm(m['last']))
trades = collections.defaultdict(list); paper = collections.Counter(); filings = collections.defaultdict(list)
seenT = collections.defaultdict(dict)
def addtrade(bg, row, src):
    key = (row[0], row[1], row[2] or row[3][:30], row[4], row[5], row[6])
    prev = seenT[bg].get(key)
    if prev is not None and prev != src: return  # same trade repeated in an amended report
    seenT[bg][key] = src; trades[bg].append(row)
for doc, r in hp.items():
    for bg, (sds, ln) in house_keys.items():
        rl = norm(r['last'])
        if r['sd'] in sds and (rl == ln or ln.endswith(rl) or rl.endswith(ln)):
            filings[bg].append([tdate(r['date']), f"https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/{r['year']}/{doc}.pdf", len(r['trades'] or []), r['paper']])
            if r['paper']: paper[bg] += 1
            for t in r['trades'] or []:
                lo, hi = amt_range(t['lo'], t['hi'])
                addtrade(bg, [tradedate(t['date'], tdate(r['date'])), t['type'], t['tick'], t['asset'], lo, hi, t['owner'] or 'Self', doc[-8:]], doc)
            break
sp = json.load(open(f'{D}/senate_ptr.json'))
sen = [m for m in MEM.values() if m['chamber'] == 'Senate']
for r in sp:
    cands = [m for m in sen if norm(m['last']) == norm(r['last'].split()[-1]) or norm(r['last']).endswith(norm(m['last']))]
    if len(cands) > 1: cands = [m for m in cands if norm(m['first'])[:1] == norm(r['first'])[:1]]
    if len(cands) != 1: continue
    bg = cands[0]['id']
    filings[bg].append([tdate(r['date']), r['url'], len(r['trades']), r['paper']])
    if r['paper']: paper[bg] += 1
    for t in r['trades']:
        typ = {'Purchase': 'Buy', 'Sale (Full)': 'Sell', 'Sale (Partial)': 'Sell (partial)', 'Exchange': 'Exchange'}.get(t['type'], t['type'])
        rng = re.findall(r'\$[\d,]+', t['amt'])
        lo, hi = amt_range(rng[0] if rng else None, rng[1] if len(rng) > 1 else None)
        tick = t['tick'] or (re.search(r'\(([A-Z.]{1,6})\)\s*$', t['asset']).group(1) if re.search(r'\(([A-Z.]{1,6})\)\s*$', t['asset']) else None)
        addtrade(bg, [tradedate(t['date'], tdate(r['date'])), typ, tick, t['asset'], lo, hi, t['owner'], ''], r['url'])
for bg, m in MEM.items():
    tl = sorted([t for t in trades.get(bg, []) if t[0]], key=lambda t: t[0], reverse=True)
    fl = sorted(filings.get(bg, []), key=lambda f: f[0] or '', reverse=True)
    m['ptr'] = len(fl); m['ptrLast'] = (lambda d: d and datetime.datetime.strptime(d, '%Y-%m-%d').strftime('%-m/%-d/%Y'))(fl[0][0]) if fl else None
    m['ptrPaper'] = paper.get(bg, 0)
    m['ptrFiles'] = fl[:30]
    m['tradeN'] = len(tl)
    if tl:
        buys = [t for t in tl if t[1] == 'Buy']; sells = [t for t in tl if t[1].startswith('Sell')]
        m['tradeStats'] = dict(buys=len(buys), sells=len(sells), lo=sum(t[4] or 0 for t in tl), hi=sum((t[5] or t[4] or 0) for t in tl),
                               big=sum(1 for t in tl if (t[4] or 0) >= 100001),
                               ticks=[[k, v] for k, v in collections.Counter(t[2] for t in tl if t[2]).most_common(6)])
        months = data['months']
        mc = collections.Counter(t[0][:7] for t in tl)
        m['tradeByMonth'] = [[mo, mc.get(mo, 0)] for mo in months]
        m['trades'] = [[t[0], t[1], t[2], t[3][:70], t[4], t[5], t[6]] for t in tl[:80]]
    m.pop('ptrByMonth', None)

# ---------- lobbying ----------
files = sorted(glob.glob(f'{D}/lda/*.json'))
if files:
    BILL = re.compile(r'(?<![\w.])(H\.?\s?R\.?|S\.|H\.?\s?J\.?\s?Res\.?|S\.?\s?J\.?\s?Res\.?|H\.?\s?Res\.?|S\.?\s?Res\.?|H\.?\s?Con\.?\s?Res\.?|S\.?\s?Con\.?\s?Res\.?)\s?(\d{1,5})\b', re.I)
    def bkey(pre, num):
        p = re.sub(r'[^A-Z]', '', pre.upper())
        p = {'HR': 'HR', 'S': 'S', 'HJRES': 'HJRES', 'SJRES': 'SJRES', 'HRES': 'HRES', 'SRES': 'SRES', 'HCONRES': 'HCONRES', 'SCONRES': 'SCONRES'}.get(p)
        return p and f'{p}{int(num)}'
    bill_clients = collections.defaultdict(dict); client_spend = collections.Counter(); client_name = {}
    revolving = collections.defaultdict(dict); nfil = 0
    # names for revolving-door matching
    import yaml
    hist = yaml.safe_load(open(f'{D}/legislators-historical.yaml')) if os.path.exists(f'{D}/legislators-historical.yaml') else []
    hist_names = collections.Counter(f"{norm(h['name'].get('first'))}{norm(h['name'].get('last'))}" for h in hist if any(t['end'] >= '1995' for t in h['terms']))
    cur_names = {}
    for m in MEM.values():
        firsts = {norm(m['first'])}
        nm = m['name'].split()
        if nm: firsts.add(norm(nm[0]))
        for f in firsts:
            key = f + norm(m['last'])
            if hist_names.get(key): continue  # a former member shares this name; skip to avoid wrong matches
            cur_names.setdefault(key, []).append(m['id'])
    seen_fil = set()
    for fn in files:
        for f in json.load(open(fn)):
            if f['id'] in seen_fil: continue
            if (f['cli'] or '').upper().startswith('STATE OF LOC NATION'): continue  # self-reported amounts look implausible ($20M per quarter, no comparable activity)
            seen_fil.add(f['id']); nfil += 1
            amt = f['exp'] if f['exp'] is not None else f['inc']
            try: amt = float(amt or 0)
            except Exception: amt = 0
            ck = f.get('cid') or f['cli']
            client_name[ck] = f['cli']; client_spend[ck] += amt
            bills = set()
            for a in f['acts']:
                for pre, num in BILL.findall(a['desc']):
                    k = bkey(pre, num)
                    if k: bills.add(k)
                for first, last, pos, lid in a['lob']:
                    if not pos: continue
                    pn = norm(pos)
                    if not re.search(r'senator|sen\b|congress|rep\b|representative|member|office of', pos, re.I): continue
                    for key, ids in cur_names.items():
                        if len(ids) == 1 and len(key) > 8 and key in pn:
                            bg = ids[0]
                            rv = revolving[bg].setdefault(lid, dict(name=f"{title(first)} {title(last)}", pos=pos[:140], clients=collections.Counter(), firm=f['reg']))
                            rv['clients'][f['cli']] += 1
            for b in bills:
                bill_clients[b][ck] = bill_clients[b].get(ck, 0) + amt
    lob = {}
    for b, cl in bill_clients.items():
        lob[b] = dict(n=len(cl), top=[nice(client_name[c]) for c, _ in sorted(cl.items(), key=lambda x: -x[1])[:8]])
    data['lobby'] = dict(filings=nfil, topClients=[[nice(client_name[c]), round(v)] for c, v in client_spend.most_common(25)], periods='Jul 2025 – Sep 2026')
    # attach lobbying counts to every roll call bill we reference, and each member's most-lobbied votes
    rcs = data['rc']
    for rid, r in rcs.items():
        b = re.sub(r'[^A-Z0-9]', '', (r.get('b') or '').upper())
        if b in lob: r['lob'] = lob[b]['n']
    refs = {re.sub(r'[^A-Z0-9]', '', (r.get('b') or '').upper()) for r in rcs.values()}
    data['bills'] = {b: lob[b] for b in refs if b in lob}
    for m in MEM.values():
        if m['id'] in revolving:
            m['revolving'] = [[v['name'], v['pos'], v['firm'], [nice(c) for c, _ in v['clients'].most_common(4)]] for v in revolving[m['id']].values()]
    json.dump({k: v for k, v in lob.items()}, open(f'{D}/lobby_bills.json', 'w'))
    print('lobbying filings', nfil, 'bills', len(lob), 'members w/ former staff lobbying', len(revolving))
json.dump(data, open(OUT, 'w'), separators=(',', ':'))
print('pacs', sum(1 for m in MEM.values() if m.get('pacs')), 'employers', sum(1 for m in MEM.values() if m.get('employers')),
      'traders', sum(1 for m in MEM.values() if m.get('tradeN')), 'trades', sum(m.get('tradeN', 0) for m in MEM.values()), 'bytes', os.path.getsize(OUT))

# ================= round 3 additions =================
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from industry import classify_pac
data = json.load(open(OUT)); MEM = {m['id']: m for m in data['members']}

# ---------- industries: itemized individual gifts + PAC gifts, same rules for everyone ----------
dn = json.load(open(f'{D}/donors26.json'))
pacind = collections.defaultdict(collections.Counter)
for bg, cs in give.items():
    for c, v in cs.items():
        f = cm.get(c)
        nm = (f[13] if f and f[13] and f[13].upper() not in ('NONE', 'N/A') else (f[1] if f else ''))
        pacind[bg][classify_pac(nm, f[12] if f else '', f[9] if f else '', f[8] if f else '')] += v
for bg, m in MEM.items():
    ind = collections.defaultdict(lambda: [0, 0])
    for k, v in (dn.get(bg, {}).get('industries') or []): ind[k][0] += v
    for k, v in pacind[bg].items(): ind[k][1] += max(0, round(v))
    rows = [[k, a, b] for k, (a, b) in ind.items() if a + b > 0]
    if rows: m['industries'] = sorted(rows, key=lambda r: -(r[1] + r[2]))

# ---------- trades in industries their committees oversee ----------
sic = json.load(open(f'{D}/sic.json'))
def sector(code):
    try: c = int(code)
    except Exception: return None
    if c in (1311, 1381, 1382, 1389, 2911, 2990, 3533, 1221, 1222, 1231, 1241) or 4610 <= c <= 4619 or 4900 <= c <= 4991: return 'Energy'
    if 6000 <= c <= 6499 or 6700 <= c <= 6799: return 'Finance'
    if 6500 <= c <= 6553 or 1500 <= c <= 1799: return 'Real estate'
    if 2833 <= c <= 2836 or 3841 <= c <= 3851 or 8000 <= c <= 8099 or c in (5122, 5912, 6324): return 'Health'
    if 3720 <= c <= 3729 or 3760 <= c <= 3769 or c in (3812, 3795, 3480, 3482, 3483, 3484, 3489, 3730, 3731): return 'Defense'
    if 3570 <= c <= 3579 or 3600 <= c <= 3699 or 7370 <= c <= 7379 or 4800 <= c <= 4899: return 'Tech & telecom'
    if 4000 <= c <= 4799 or 3710 <= c <= 3716: return 'Transportation'
    if 100 <= c <= 999 or 2000 <= c <= 2099 or 5140 <= c <= 5159: return 'Farming & food'
    return None
JUR = {'Energy and Natural Resources': {'Energy'}, 'Natural Resources': {'Energy'}, 'Environment and Public Works': {'Energy', 'Transportation'},
       'Energy and Commerce': {'Energy', 'Health', 'Tech & telecom'}, 'Commerce, Science, and Transportation': {'Tech & telecom', 'Transportation'},
       'Transportation and Infrastructure': {'Transportation'}, 'Science, Space, and Technology': {'Tech & telecom'},
       'Banking, Housing, and Urban Affairs': {'Finance', 'Real estate'}, 'Financial Services': {'Finance', 'Real estate'},
       'Finance': {'Finance', 'Health'}, 'Ways and Means': {'Finance', 'Health'}, 'Health, Education, Labor, and Pensions': {'Health'},
       'Armed Services': {'Defense'}, 'Permanent Select Intelligence': {'Defense'}, 'Select Intelligence': {'Defense'},
       'Agriculture': {'Farming & food'}, 'Agriculture, Nutrition, and Forestry': {'Farming & food'}}
tick_sector = {t: (sector(v[0]), v[1]) for t, v in sic.items()}
for m in MEM.values():
    over = {}
    for c, _ in m['committees']:
        for s in JUR.get(c, ()): over.setdefault(s, []).append(c)
    m['oversees'] = {s: cs for s, cs in over.items()}
    n = 0
    for t in m.get('trades', []):
        ts = tick_sector.get((t[2] or '').upper())
        if ts and ts[0] in over: t.append(ts[0]); n += 1
        else: t.append(None)
    # count over all trades, not just the stored ones
    tot = 0
    for t in trades.get(m['id'], []):
        ts = tick_sector.get((t[2] or '').upper())
        if ts and ts[0] in over: tot += 1
    m['commTrades'] = tot
    if m.get('tradeStats'):
        secs = collections.Counter(tick_sector.get((t[2] or '').upper(), (None,))[0] for t in trades.get(m['id'], []))
        m['tradeStats']['sectors'] = [[k, v] for k, v in secs.most_common() if k]

# ---------- House Ethics Committee statements ----------
eh = json.load(open(f'{D}/ethics_house.json'))
def status(t):
    s = t.lower()
    if 'investigative subcommittee' in s and ('establish' in s or 'empanel' in s): return 'Formal investigation opened'
    if 'reprov' in s or 'reprimand' in s: return 'Reproved by the committee'
    if 'no further action' in s or 'closed' in s or 'dismiss' in s: return 'Closed'
    if 'extend' in s or 'is reviewing' in s or 'continue to review' in s or 'will continue' in s: return 'Under review'
    if 'referral' in s or 'office of congressional conduct' in s: return 'Referred for review'
    if 'released the attached report' in s or 'adopted' in s and 'report' in s: return 'Report released'
    if 'working group' in s: return 'Working group review'
    return 'Statement issued'
eth = collections.defaultdict(list)
houseM = [m for m in MEM.values() if m['chamber'] == 'House']
for x in eh:
    dm = re.match(r'^([A-Z][a-z]{2}) (\d{1,2}), (20\d\d)', x['text'])
    if not dm: continue
    date = datetime.datetime.strptime(' '.join(dm.groups()), '%b %d %Y').strftime('%Y-%m-%d')
    if date < '2025-01-01': continue
    body = x['text'].split('the following statement:', 1)[-1].strip()
    body = re.sub(r'^[A-Z][a-z]{2} \d{1,2}, 20\d\d\s+', '', body)
    first = re.split(r'(?<=[a-z0-9\)])\.\s', body)[0][:420].strip() + '.'
    for m in houseM:
        nm = norm(m['last'])
        if re.search(r'Representative[s]?\s+[^.]{0,40}' + re.escape(m['last']), x['title'] + ' ' + body[:600]) and (norm(m['first']) in norm(x['title'] + body[:600]) or norm(m['name'].split()[0]) in norm(x['title'] + body[:600])):
            eth[m['id']].append([date, status(body), first, x['url']])
for bg, lst in eth.items():
    seen = set(); out = []
    for e in sorted(lst, key=lambda e: e[0], reverse=True):
        if e[3] in seen: continue
        seen.add(e[3]); out.append(e)
    MEM[bg]['ethics'] = out

# ---------- appointee ethics filings ----------
og = json.load(open(f'{D}/oge_parsed.json')) if os.path.exists(f'{D}/oge_parsed.json') else {}
for n in data['noms']:
    r = og.get(n['id'])
    if not r: continue
    o = dict(docs=[[d[0], d[1], d[2]] for d in r['docs']][-12:], waivers=r['waivers'])
    if r.get('n278'):
        o['positions'] = r['n278']['positions']
        o['pay'] = [[p[0], re.sub(r'^N/A\s*', '', p[1]).strip().capitalize(), p[2]] for p in r['n278']['pay']]
    if r.get('ea'): o['divest'] = r['ea']['divest']; o['resign'] = r['ea']['resign']
    n['oge'] = o
json.dump(data, open(OUT, 'w'), separators=(',', ':'))
print('industries', sum(1 for m in MEM.values() if m.get('industries')), 'committee trades', sum(m['commTrades'] for m in MEM.values()),
      'ethics members', len(eth), 'noms with filings', sum(1 for n in data['noms'] if n.get('oge')), 'bytes', os.path.getsize(OUT))

# ================= party totals (same measures for every party) =================
data = json.load(open(OUT)); MEM = {m['id']: m for m in data['members']}
pa = {}
for p in ('D', 'R', 'I'):
    ids = [m['id'] for m in MEM.values() if m['party'] == p]
    pac = collections.Counter(); pcat = collections.Counter(); ind = collections.Counter(); tk = collections.Counter(); sec = collections.Counter()
    for bg in ids:
        for c, v in give.get(bg, {}).items():
            if v > 0: pac[c] += v
        for k, v in cat.get(bg, {}).items(): pcat[k] += max(0, v)
        for k, v in (dn.get(bg, {}).get('industries') or []): ind[k] += v
        for k, v in pacind[bg].items(): ind[k] += max(0, v)
        for t in trades.get(bg, []):
            if t[2]: tk[t[2]] += 1
            s_ = tick_sector.get((t[2] or '').upper(), (None,))[0]
            if s_: sec[s_] += 1
    pa[p] = dict(pacs=[[pacname(c), round(v), category(cm.get(c))] for c, v in pac.most_common(10)],
                 pacCats=[[k, round(v)] for k, v in pcat.most_common()],
                 industries=[[k, round(v)] for k, v in ind.most_common()],
                 ticks=[[k, v, (sic.get(k) or [None, None, k])[2]] for k, v in tk.most_common(10)],
                 sectors=[[k, v] for k, v in sec.most_common()])
data['parties'] = pa
json.dump(data, open(OUT, 'w'), separators=(',', ':'))
print('party totals', {p: (len(v['pacs']), len(v['ticks'])) for p, v in pa.items()})
