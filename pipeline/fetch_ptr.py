"""Download House periodic transaction reports (stock trades) listed in the Clerk index, and parse each trade."""
import os, re, sys, json, subprocess, urllib.request, xml.etree.ElementTree as ET, concurrent.futures as cf
D = sys.argv[1]
OUT = os.path.join(D, 'ptr'); os.makedirs(OUT, exist_ok=True)
rows = []
for yr in ('2025', '2026'):
    for x in ET.parse(f'{D}/fd{yr[2:]}/{yr}FD.xml').getroot().findall('Member'):
        if x.findtext('FilingType') == 'P':
            rows.append(dict(year=yr, doc=x.findtext('DocID'), last=x.findtext('Last'), first=x.findtext('First'), sd=x.findtext('StateDst'), date=x.findtext('FilingDate')))

def dl(r):
    fn = f"{OUT}/{r['doc']}.pdf"
    if not os.path.exists(fn):
        for i in range(4):
            try:
                with urllib.request.urlopen(f"https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/{r['year']}/{r['doc']}.pdf", timeout=60) as resp:
                    open(fn, 'wb').write(resp.read()); break
            except Exception: pass
    return fn

with cf.ThreadPoolExecutor(8) as ex: list(ex.map(dl, rows))

LINE = re.compile(r'^(?P<pre>.*?)\s(?P<type>P|S|S \(partial\)|E)\s+(?P<d1>\d\d/\d\d/\d{4})\s+(?P<d2>\d\d/\d\d/\d{4})\s+(?P<amt>.*)$')
AMT = re.compile(r'\$[\d,]+')
def parse(fn):
    try: txt = subprocess.run(['pdftotext', '-layout', fn, '-'], capture_output=True, text=True, timeout=60).stdout
    except Exception: return None
    if 'Transaction' not in txt and 'Asset' not in txt: return None  # scanned paper filing
    lines = txt.splitlines(); out = []
    for i, ln in enumerate(lines):
        m = LINE.match(ln)
        if not m: continue
        pre = m.group('pre').strip()
        owner = None
        mo = re.match(r'^(SP|JT|DC)\s+(.*)$', pre)
        if mo: owner, pre = mo.group(1), mo.group(2)
        asset = pre
        if '[' not in asset and i > 0:
            prev = lines[i - 1].strip()
            if prev and not re.search(r'\d\d/\d\d/\d{4}|Owner|Asset|Gains|Type|^\$', prev): asset = prev + ' ' + asset
        nxt = lines[i + 1] if i + 1 < len(lines) else ''
        if '[' not in asset and nxt.strip() and not LINE.match(nxt) and not nxt.strip().startswith('$'):
            cand = re.sub(r'\s{2,}.*$', '', nxt.strip())
            if '[' in cand: asset = asset + ' ' + cand
        amts = AMT.findall(m.group('amt'))
        if 'Over' in m.group('amt') and amts: lo, hi = amts[0], None
        else:
            lo = amts[0] if amts else None
            hi = amts[1] if len(amts) > 1 else (AMT.findall(nxt)[0] if AMT.findall(nxt) else None)
        asset = re.sub(r'\s+', ' ', asset).strip()
        code = re.search(r'\[([A-Z]{2})\]', asset)
        tick = re.search(r'\(([A-Z][A-Z.\-]{0,6})\)', asset)
        name = re.sub(r'\s*\[[A-Z]{2}\]', '', asset)
        out.append(dict(owner=owner, asset=name[:120], code=code.group(1) if code else None, tick=tick.group(1) if tick else None,
                        type={'P': 'Buy', 'S': 'Sell', 'S (partial)': 'Sell (partial)', 'E': 'Exchange'}[m.group('type')],
                        date=m.group('d1'), notified=m.group('d2'), lo=lo, hi=hi))
    return out

res = {}
for r in rows:
    trades = parse(f"{OUT}/{r['doc']}.pdf")
    res[r['doc']] = dict(r, trades=trades, paper=trades is None)
json.dump(res, open(f'{D}/ptr_parsed.json', 'w'))
n = sum(len(v['trades'] or []) for v in res.values())
print('filings', len(res), 'paper', sum(v['paper'] for v in res.values()), 'trades', n, 'empty', sum(1 for v in res.values() if v['trades'] == []))
