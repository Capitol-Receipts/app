"""Stock and bond trades by the President and Senate-confirmed officials (OGE Form 278-T periodic transaction reports).

Usage: python fetch_exec_trades.py <data dir> <export dir>
- Lists every 278-T the Office of Government Ethics has posted publicly since January 2025 (its disclosure search API).
- Downloads each PDF once (kept in <data>/oge278t/) and reads the transactions.
- Reports filed through Integrity.gov are clean text. The President's reports are scanned paper; their text layer is
  OCR, so dates and amounts are read carefully: amounts snap to the official OGE ranges, and a date that can't be read
  with certainty keeps only its month. Those trades are marked as read from a scan, with a link to the original.
- Appends app_meta row 'exec_trades' to the export: {filers: [{name, title, agency, reports: [[date, url, n, scan]],
  trades: [[date, type, ticker, asset, lo, hi, scan]]}], asOf}
"""
import datetime, gzip, hashlib, json, os, re, subprocess, sys, time, urllib.parse, urllib.request

D, EXP = sys.argv[1], sys.argv[2]
PDIR = os.path.join(D, 'oge278t'); os.makedirs(PDIR, exist_ok=True)
API = 'https://extapps2.oge.gov/201/Presiden.nsf/API.xsp/v3/rest'
UA = {'User-Agent': 'Mozilla/5.0 (compatible; CapitolReceipts/1.0; +https://www.capitolreceipts.com)'}

def get(url, tries=6, timeout=90):
    for i in range(tries):
        try: return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout).read()
        except Exception: time.sleep(3 * (i + 1))
    return None

# ---- 1. every posted 278-T since 2025
rows, start, total = [], 0, None
while total is None or start < total:
    b = get(f"{API}?draw=1&start={start}&length=100&search%5Bvalue%5D={urllib.parse.quote('278 Transaction')}")
    if b is None: start += 100; continue
    d = json.loads(b); total = d['recordsFiltered']; rows += d['data']; start += 100
    time.sleep(.3)
reports = []
for r in rows:
    if '278 Transaction' not in r['type'] or r['docDate'] < '2025' or '.pdf' not in r['type'].lower(): continue
    m = re.search(r"href='([^']+)'", r['type'])
    if not m: continue
    reports.append(dict(name=r['name'], title=r['title'], agency=r['agency'], date=r['docDate'][:10], url=m.group(1).replace('\\/', '/'),
                        amended=bool(r.get('amended'))))
print('posted 278-T reports since 2025:', len(reports))

# ---- 2. read each report
RANGES = [1001, 15001, 50001, 100001, 250001, 500001, 1000001, 5000001, 25000001, 50000001]
HI = {1001: 15000, 15001: 50000, 50001: 100000, 100001: 250000, 250001: 500000, 500001: 1000000, 1000001: 5000000,
      5000001: 25000000, 25000001: 50000000, 50000001: None}
def amount(s):
    if re.search(r'[O0]ver\s*[$S]?\s*5[O0][,. ]?[O0]{3}', s, re.I): return 50000001, None
    if re.search(r'[O0]ver\s*[$S]?\s*1[,. ]?[O0]{3}[,. ]?[O0]{3}', s, re.I): return 1000001, None
    s = s.replace('S', '$').replace('O', '0').replace('o', '0')
    nums = [re.sub(r'\D', '', x) for x in re.findall(r'\$?\s*[\d][\d,. ]*', s)]
    nums = [int(x) for x in nums if x]
    if not nums: return None, None
    lo = nums[0]
    if lo in HI: return lo, HI[lo]
    if lo < 1001: return None, None
    # OCR dropped or merged a digit: take the official range whose lower bound shares the most leading digits
    best = max(RANGES, key=lambda r: (len(os.path.commonprefix([str(r), str(lo)])), -abs(len(str(r)) - len(str(lo)))))
    if len(os.path.commonprefix([str(best), str(lo)])) >= 3: return best, HI[best]
    return None, None
def kind(s):
    t = s.lower()
    if 'exchange' in t: return 'Exchange'
    if re.search(r'a[l1]e', t): return 'Sell (partial)' if 'partial' in t else 'Sell'
    if re.search(r'rch|ur[cs]h|chas', t): return 'Buy'
    return None
def tdate(s, scan):
    s = s.strip().replace('l', '1').replace('I', '1').replace('O', '0')
    m = re.match(r'^(\d{1,2})/(\d{1,2})/(\d{4})$', s)
    if m:
        try: return datetime.date(int(m.group(3)), int(m.group(1)), int(m.group(2))).isoformat()
        except ValueError: return None
    m = re.match(r'^(\d{1,2})/?(\d{1,3})/?(\d{4})$', s)
    if scan and m:  # a slash was lost: keep only the month, which is certain when it is a single digit followed by "/"
        mm = re.match(r'^(\d{1,2})/', s)
        if mm and 1 <= int(mm.group(1)) <= 12: return f"{m.group(3)}-{int(mm.group(1)):02d}"
    return None
TICK = re.compile(r'\(([A-Z][A-Z.\-]{0,5})\)')
DATE = re.compile(r'^[\dlIO]{1,2}/?[\dlIO]{1,3}/?\d{4}$')
def row(ln):
    """A transaction row, split on runs of 2+ spaces: [#] description  type  date  Yes/No [amount]."""
    f = [x for x in re.split(r'\s{2,}', ln.strip()) if x]
    if len(f) < 4: return None
    j = next((k for k in range(2, len(f)) if DATE.match(f[k])), None)
    if j is None or j < 2: return None
    rest = ' '.join(f[j + 1:])
    yn = re.match(r'^(Y\w{1,2}|N\w?)\b\s*(.*)$', rest)
    if not yn: return None
    num = re.match(r'^\d{1,4}$', f[0])
    desc = ' '.join(f[1 if num else 0:j - 1])
    if len(desc) < 3: return None
    return desc, f[j - 1], f[j], yn.group(2)

def parse(fn):
    txt = subprocess.run(['pdftotext', '-layout', fn, '-'], capture_output=True, text=True, timeout=120).stdout
    scan = 'Integrity.gov' not in txt
    lines = txt.splitlines(); out = []
    for i, ln in enumerate(lines):
        if len(ln) > 400: continue
        rw = row(ln)
        if not rw: continue
        desc, typ, dt, amt = rw
        k = kind(typ)
        if not k: continue
        nxt = lines[i + 1].strip() if i + 1 < len(lines) else ''
        if amt.rstrip().endswith('-') and nxt.startswith(('$', 'S')): amt = amt + ' ' + nxt.split('  ')[0]
        lo, hi = amount(amt)
        d = tdate(dt, scan)
        # electronic reports wrap long names onto the next line
        if not scan and nxt and not row(lines[i + 1]) and not nxt.startswith('$') and not re.match(r'^\d+\s', nxt) and len(nxt) < 70 and 'Page' not in nxt:
            desc = desc + ' ' + re.split(r'\s{2,}', nxt)[0]
        desc = re.sub(r'\s+', ' ', re.sub(r'\bSee Endnote\b', '', desc)).strip()
        tk = TICK.search(desc) or re.match(r'^([A-Z]{2,5}) \(', desc)
        out.append([d, k, tk.group(1) if tk else None, desc[:100], lo, hi, 1 if scan else 0])
    return out, scan

filers = {}
for r in sorted(reports, key=lambda r: r['date']):
    fn = os.path.join(PDIR, hashlib.md5(r['url'].encode()).hexdigest()[:12] + '.pdf')
    if not (os.path.exists(fn) and os.path.getsize(fn) > 1000):
        b = get(r['url'])
        if not b: continue
        open(fn, 'wb').write(b)
    try: trades, scan = parse(fn)
    except Exception as e: print('could not read', r['url'], e); continue
    ry = int(r['date'][:4])
    for t in trades:  # OCR can misread the year (7026): a trade can't be later than its report or before 2024
        if t[0] and not (2024 <= int(t[0][:4]) <= ry): t[0] = (str(ry) + t[0][4:]) if t[0][1:4] == str(ry)[1:] and (str(ry) + t[0][4:]) <= r['date'] else None
    f = filers.setdefault(r['name'], dict(name=r['name'], title=r['title'], agency=r['agency'], reports=[], trades=[]))
    f['title'], f['agency'] = r['title'], r['agency']
    rs = lambda k: sum(1 for t in trades if (t[1] == 'Buy') == (k == 'b'))
    # [date posted, url, trades read, scanned, purchases, sales, low total, high total]; n == 0 on a scan: no readable text yet
    f['reports'].append([r['date'], r['url'], len(trades), 1 if scan else 0, rs('b'), rs('s'),
                         sum(t[4] or 0 for t in trades), sum(t[5] or t[4] or 0 for t in trades)])
    # a revised report repeats trades already listed: keep each identical trade only as many times as one report lists it
    have = __import__('collections').Counter(tuple(t) for t in f['trades'])
    for key, n in __import__('collections').Counter(tuple(t) for t in trades).items():
        f['trades'] += [list(key)] * max(0, n - have[key])
for f in filers.values():
    f['trades'].sort(key=lambda t: t[0] or '', reverse=True); f['reports'].sort(reverse=True)
    t_ = f['trades']
    f['tot'] = dict(n=len(t_), buys=sum(1 for t in t_ if t[1] == 'Buy'), sells=sum(1 for t in t_ if str(t[1]).startswith('Sell')),
                    lo=sum(t[4] or 0 for t in t_), hi=sum(t[5] or t[4] or 0 for t in t_))
    # scanned paper reports: the OCR text is too rough to list trade by trade (names come out garbled), so only totals
    # per report are published, each linking to the original
    f['scan'] = any(t[6] for t in t_)
    if f['scan']: f['trades'] = []
out = dict(asOf=datetime.date.today().isoformat(), filers=sorted(filers.values(), key=lambda f: -f['tot']['n']))
json.dump(out, open(os.path.join(D, 'exec_trades.json'), 'w'))
with gzip.open(os.path.join(EXP, 'app_meta.jsonl.gz'), 'at', encoding='utf-8') as g:
    g.write(json.dumps({'key': 'exec_trades', 'value': out}, separators=(',', ':')) + '\n')
print('officials:', len(filers), 'trades:', sum(f['tot']['n'] for f in filers.values()),
      'from scans:', sum(f['tot']['n'] for f in filers.values() if f['scan']),
      'no amount:', sum(1 for f in filers.values() for t in f['trades'] if t[4] is None),
      'month only:', sum(1 for f in filers.values() for t in f['trades'] if t[0] and len(t[0]) == 7))
