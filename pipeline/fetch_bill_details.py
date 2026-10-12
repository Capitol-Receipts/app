"""Detailed records (summary, status, cosponsors by party, committees, recorded votes) for the bills the app shows.
Out: data/hist/bill_details.json {"119-hr-1": {...}}"""
import json, os, re, subprocess, zipfile, html, collections
import xml.etree.ElementTree as ET

B = os.path.dirname(os.path.abspath(__file__))
D = f'{B}/data/hist'
bills = json.load(open(f'{D}/bills.json'))
app = json.load(open(f'{B}/data2.json'))
CUR = {m['id'] for m in app['members']}
want = set()
for bid, L in bills.items():
    for x in L:
        if x[4]:
            want.add(f'{x[0]}-{x[1]}-{x[2]}')
    for x in sorted(L, key=lambda x: -x[7])[:5]:
        want.add(f'{x[0]}-{x[1]}-{x[2]}')
    if bid in CUR:
        for x in sorted([x for x in L if x[0] == 119], key=lambda x: x[6], reverse=True)[:6]:
            want.add(f'{x[0]}-{x[1]}-{x[2]}')
TM = {'HR': 'hr', 'S': 'sjres' if False else 's', 'HJRES': 'hjres', 'SJRES': 'sjres'}
for k in list(app['bills'].keys()) + [r.get('b') or '' for r in app['rc'].values()]:
    m = re.match(r'^(HR|S|HJRES|SJRES)(\d+)$', re.sub(r'[^A-Z0-9]', '', k.upper()))
    if m:
        want.add(f'119-{TM[m.group(1)]}-{m.group(2)}')
print('wanted', len(want), flush=True)

OUT = f'{D}/bill_details.json'
res = {}


def t(el, p):
    x = el.find(p)
    return x.text.strip() if x is not None and x.text else ''


def clean(s):
    s = re.sub(r'<[^>]+>', ' ', s or '')
    s = html.unescape(re.sub(r'\s+', ' ', s)).strip()
    return s


for c in range(108, 120):
    for ty in ['hr', 's', 'hjres', 'sjres']:
        need = {k for k in want if k.startswith(f'{c}-{ty}-')}
        if not need:
            continue
        zp = f'{D}/tmp_bd.zip'
        r = subprocess.run(['curl', '-sSL', '--retry', '3', '-o', zp, '-w', '%{http_code}', f'https://www.govinfo.gov/bulkdata/BILLSTATUS/{c}/{ty}/BILLSTATUS-{c}-{ty}.zip'], capture_output=True, text=True)
        if r.stdout.strip() != '200':
            print('skip', c, ty, flush=True)
            continue
        n = 0
        with zipfile.ZipFile(zp) as z:
            for name in z.namelist():
                mm = re.search(rf'{c}{ty}(\d+)\.xml$', name)
                if not mm or f'{c}-{ty}-{mm.group(1)}' not in need:
                    continue
                try:
                    b = ET.fromstring(z.read(name)).find('bill')
                except ET.ParseError:
                    continue
                key = f'{c}-{ty}-{mm.group(1)}'
                sp = b.find('sponsors/item')
                cos = collections.Counter()
                cn = 0
                for it in b.findall('cosponsors/item'):
                    if t(it, 'sponsorshipWithdrawnDate'):
                        continue
                    cn += 1
                    cos[t(it, 'party')] += 1
                short = ''
                cand = [(t(it, 'titleType'), t(it, 'title')) for it in b.findall('titles/item')]
                for pref in ('as Enacted', 'as Introduced', 'as Passed House', 'as Passed Senate', 'as Reported'):
                    hit = [tl for tt, tl in cand if 'Short Title' in tt and pref in tt and 'portion' not in tt]
                    if hit:
                        short = hit[0]
                        break
                summ = ''
                ss = b.findall('summaries/summary') or b.findall('summaries/billSummaries/item')
                if ss:
                    s0 = sorted(ss, key=lambda s: t(s, 'updateDate') or t(s, 'lastSummaryUpdateDate') or t(s, 'actionDate'))[-1]
                    summ = clean(t(s0, 'cdata/text') or t(s0, 'text'))
                    summ = re.sub(r'^(This bill|This joint resolution)?\s*', lambda m_: m_.group(0), summ)
                # milestones
                ms = {}
                votes = []
                for a in b.findall('actions/item'):
                    txt = t(a, 'text')
                    d = t(a, 'actionDate')
                    low = txt.lower()
                    if ('passed/agreed to in house' in low or low.startswith('on passage passed') or 'passed house' in low) and 'H' not in ms:
                        ms['H'] = d
                    if ('passed/agreed to in senate' in low or 'passed senate' in low) and 'S' not in ms:
                        ms['S'] = d
                    if 'presented to president' in low and 'P' not in ms:
                        ms['P'] = d
                    if 'vetoed by president' in low:
                        ms['V'] = d
                    if 'became public law' in low or 'became private law' in low:
                        ms['L'] = d
                    for rv in a.findall('recordedVotes/recordedVote'):
                        votes.append([t(rv, 'chamber')[:1], int(t(rv, 'congress') or c), int(t(rv, 'sessionNumber') or 0), int(t(rv, 'rollNumber') or 0), t(rv, 'date')[:10], txt[:140]])
                seenv = set()
                vv = []
                for v in votes:
                    kk = (v[0], v[2], v[3])
                    if kk not in seenv:
                        seenv.add(kk)
                        vv.append(v)
                law = ''
                lw = b.find('laws/item')
                if lw is not None:
                    law = f"{t(lw, 'type').replace(' Law', '')} Law {t(lw, 'number')}"
                rec = {'c': c, 'ty': ty, 'n': int(mm.group(1)), 'title': t(b, 'title'), 'short': short if short != t(b, 'title') else '',
                       'sp': t(sp, 'bioguideId') if sp is not None else '', 'spn': t(sp, 'fullName') if sp is not None else '',
                       'intro': t(b, 'introducedDate'), 'cos': cn, 'cosp': dict(cos), 'pa': t(b, 'policyArea/name'),
                       'subj': [t(x, 'name') for x in b.findall('subjects/legislativeSubjects/item')][:6] or [t(x, 'name') for x in b.findall('subjects/billSubjects/legislativeSubjects/item')][:6],
                       'com': list(dict.fromkeys(t(x, 'name') for x in b.findall('committees/item') if t(x, 'name')))[:4] or list(dict.fromkeys(t(x, 'name') for x in b.findall('committees/billCommittees/item') if t(x, 'name')))[:4],
                       'sum': summ[:700] + ('…' if len(summ) > 700 else ''), 'ms': ms, 'law': law,
                       'la': [t(b, 'latestAction/actionDate'), t(b, 'latestAction/text')[:200]], 'votes': vv[:8]}
                res[key] = rec
                n += 1
        os.remove(zp)
        print(c, ty, n, flush=True)
json.dump(res, open(OUT, 'w'), separators=(',', ':'))
print('done', len(res))
