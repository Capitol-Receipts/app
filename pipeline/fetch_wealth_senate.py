"""Senate periodic transaction reports from efdsearch.senate.gov (public search, after accepting its terms)."""
import re, sys, json, time, html, http.cookiejar, urllib.request, urllib.parse
D = sys.argv[1]
BASE = 'https://efdsearch.senate.gov'
cj = http.cookiejar.CookieJar()
op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
op.addheaders = [('User-Agent', 'Mozilla/5.0 (PaperTrail prototype)')]
def csrf(): return next((c.value for c in cj if c.name == 'csrftoken'), '')
def get(url): return op.open(url, timeout=60).read().decode('utf-8', 'replace')
def post(url, data, ref):
    req = urllib.request.Request(url, data=urllib.parse.urlencode(data, doseq=True).encode(), headers={'Referer': ref, 'X-CSRFToken': csrf()})
    return op.open(req, timeout=60).read().decode('utf-8', 'replace')

page = get(BASE + '/search/home/')
tok = re.search(r'name="csrfmiddlewaretoken" value="([^"]+)"', page).group(1)
post(BASE + '/search/home/', {'prohibition_agreement': '1', 'csrfmiddlewaretoken': tok}, BASE + '/search/home/')
get(BASE + '/search/')
rows = []; start = 0
while True:
    d = json.loads(post(BASE + '/search/report/data/', {'start': start, 'length': 100, 'report_types': '[7]', 'filer_types': '[1]',
        'submitted_start_date': '01/01/2015 00:00:00', 'submitted_end_date': '', 'candidate_state': '', 'senator_state': '', 'office_id': '',
        'first_name': '', 'last_name': '', 'csrfmiddlewaretoken': csrf()}, BASE + '/search/'))
    rows += d['data']; start += 100
    if start >= d['recordsFiltered']: break
print('reports', len(rows), flush=True)
import collections
RNG = re.compile(r'\$([\d,]+)\s*-\s*\$([\d,]+)|Over \$([\d,]+)')
def sumr(cells):
    lo = hi = n = 0
    for c in cells:
        for a, b, o in RNG.findall(c):
            if o: v = int(o.replace(',', '')); lo += v; hi += v
            else: lo += int(a.replace(',', '')); hi += int(b.replace(',', ''))
            n += 1
    return lo, hi, n
out = []
print('annual reports', len(rows), flush=True)
for first, last, office, link, date in rows:
    href = re.search(r'href="([^"]+)"', link).group(1)
    rec = dict(first=first.strip(), last=last.strip(), office=office, date=date, url=BASE + href, paper='/paper/' in href)
    if not rec['paper']:
        try:
            h = get(BASE + href); time.sleep(0.15)
            yr = re.search(r'(?:Annual Report for|for Calendar Year|CY)\s*(\d{4})', h)
            rec['year'] = int(yr.group(1)) if yr else int(date[-4:]) - 1
            parts = re.split(r'(?i)<h3[^>]*>', h)
            av, lv = [], []
            for prt in parts:
                head = re.sub(r'<[^>]+>', ' ', prt[:300])
                for tbl in re.findall(r'<table.*?</table>', prt, re.S):
                    ths = [re.sub(r'<[^>]+>|\s+', ' ', t).strip() for t in re.findall(r'<th[^>]*>(.*?)</th>', tbl, re.S)]
                    rows_ = [[html.unescape(re.sub(r'<[^>]+>', ' ', td)) for td in re.findall(r'<td[^>]*>(.*?)</td>', tr, re.S)] for tr in re.findall(r'<tr.*?</tr>', tbl, re.S)]
                    if 'Assets' in head and any(t.startswith('Value') for t in ths):
                        i = [k for k, t in enumerate(ths) if t.startswith('Value')][0]
                        av += [r[i] for r in rows_ if len(r) > i]
                    if 'Liabilities' in head and any('Amount' in t for t in ths):
                        i = [k for k, t in enumerate(ths) if 'Amount' in t][0]
                        lv += [r[i] for r in rows_ if len(r) > i]
            rec['a'] = sumr(av); rec['l'] = sumr(lv)
        except Exception as e:
            rec['err'] = str(e)
    out.append(rec)
    if len(out) % 100 == 0:
        json.dump(out, open(f'{D}/wealth_senate.json', 'w')); print(len(out), flush=True)
json.dump(out, open(f'{D}/wealth_senate.json', 'w'))
print('done', len(out))
