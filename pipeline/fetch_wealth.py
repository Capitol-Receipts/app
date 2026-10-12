"""Estimated personal wealth of current House members from annual financial disclosures (2015-2025 reports).
Sums the reported value ranges of assets (Schedule A) minus liabilities (Schedule D). Out: data/wealth_house.json"""
import json, os, re, subprocess, zipfile, concurrent.futures as cf, urllib.request
import xml.etree.ElementTree as ET
B = os.path.dirname(os.path.abspath(__file__)); D = f'{B}/data'
app = json.load(open(f'{B}/data2.json'))
cur = {}
for m in app['members']:
    if m['chamber'] == 'House':
        sd = m['state'] + (f"{int(m['district']):02d}" if m.get('district') not in (None, '', 0, '0') else '00')
        cur[(sd, re.sub(r'[^a-z]', '', m['last'].lower()))] = m['id']
rows = []
for y in range(2015, 2027):
    zp = f'{D}/hist/{y}FD.zip' if y <= 2024 else f'{D}/{y}FD.zip'
    if not os.path.exists(zp): continue
    z = zipfile.ZipFile(zp); xn = [n for n in z.namelist() if n.endswith('.xml')][0]
    for x in ET.fromstring(z.read(xn)).findall('Member'):
        if x.findtext('FilingType') != 'O': continue
        doc = x.findtext('DocID') or ''
        if not doc.startswith('1'): continue
        key = ((x.findtext('StateDst') or '').strip(), re.sub(r'[^a-z]', '', (x.findtext('Last') or '').lower()))
        if key in cur:
            rows.append((cur[key], x.findtext('Year'), y, doc))
print('reports', len(rows), flush=True)
OUT = f'{D}/wealth_house.json'
res = {}
RNG = re.compile(r'\$([\d,]+)\s*-\s*\$([\d,]+)|Over \$([\d,]+)')
def ranges(text):
    lo = hi = 0; n = 0
    for a, b, over in RNG.findall(text):
        if over: v = int(over.replace(',', '')); lo += v; hi += v; n += 1
        else: lo += int(a.replace(',', '')); hi += int(b.replace(',', '')); n += 1
    return lo, hi, n
def section(lines, start_pat, end_pat):
    out = []; on = False
    for ln in lines:
        t = ln.strip()
        if re.match(start_pat, t, re.I): on = True; continue
        if on and re.match(end_pat, t, re.I): break
        if on: out.append(ln)
    return out
def col(sec, start_word, end_word):
    s0 = e0 = None; parts = []
    for l in sec:
        low = l.lower()
        if start_word in low:
            s0 = max(0, low.find(start_word) - 4)
            e0 = low.find(end_word, low.find(start_word) + len(start_word)) if end_word else -1
            e0 = None if e0 is None or e0 < 0 else e0
            continue
        if s0 is None: continue
        parts.append(l[s0:e0] if e0 else l[s0:])
    return ' '.join(parts)
def parse(fn):
    txt = subprocess.run(['pdftotext', '-layout', fn, '-'], capture_output=True, text=True).stdout
    lines = txt.splitlines()
    A = section(lines, r'^(S\s+A:|schedule a:)', r'^(S\s+B:|schedule b:)')
    Dd = section(lines, r'^(S\s+D:|schedule d:)', r'^(S\s+E:|schedule e:)')
    va = col(A, 'value of asset', 'income')
    li = col(Dd, 'amount of', None)
    a = ranges(va); l = ranges(li)
    return {'alo': a[0], 'ahi': a[1], 'an': a[2], 'llo': l[0], 'lhi': l[1], 'ln': l[2]}
def work(r):
    bio, yr, idxy, doc = r
    k = f'{bio}|{yr}|{doc}'
    if k in res: return k, res[k]
    fn = f'/tmp/w_{doc}.pdf'
    try:
        with urllib.request.urlopen(f'https://disclosures-clerk.house.gov/public_disc/financial-pdfs/{idxy}/{doc}.pdf', timeout=60) as resp: open(fn, 'wb').write(resp.read())
        out = parse(fn)
    except Exception as e:
        out = None
    finally:
        try: os.remove(fn)
        except Exception: pass
    return k, out
with cf.ThreadPoolExecutor(8) as ex:
    for i, (k, v) in enumerate(ex.map(work, rows)):
        if v is not None: res[k] = v
        if i % 200 == 0: json.dump(res, open(OUT, 'w')); print(i, flush=True)
json.dump(res, open(OUT, 'w')); print('done', len(res))
