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
    d = json.loads(post(BASE + '/search/report/data/', {'start': start, 'length': 100, 'report_types': '[11]', 'filer_types': '[1]',
        'submitted_start_date': '01/01/2012 00:00:00', 'submitted_end_date': '12/31/2024 23:59:59', 'candidate_state': '', 'senator_state': '', 'office_id': '',
        'first_name': '', 'last_name': '', 'csrfmiddlewaretoken': csrf()}, BASE + '/search/'))
    rows += d['data']; start += 100
    if start >= d['recordsFiltered']: break
print('reports', len(rows), flush=True)
out = []
for first, last, office, link, date in rows:
    href = re.search(r'href="([^"]+)"', link).group(1)
    rec = dict(first=first.strip(), last=last.strip(), office=office, date=date, url=BASE + href, paper='/paper/' in href, trades=[])
    if not rec['paper']:
        try:
            h = get(BASE + href); time.sleep(0.15)
            body = re.search(r'<tbody>(.*?)</tbody>', h, re.S)
            for tr in re.findall(r'<tr>(.*?)</tr>', body.group(1) if body else '', re.S):
                c = [re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', td))).strip() for td in re.findall(r'<td[^>]*>(.*?)</td>', tr, re.S)]
                if len(c) >= 8:
                    rec['trades'].append(dict(date=c[1], owner=c[2], tick=None if c[3] in ('--', '') else c[3], asset=c[4][:120], kind=c[5], type=c[6], amt=c[7]))
        except Exception as e:
            rec['err'] = str(e)
    out.append(rec)
    if len(out) % 300 == 0:
        json.dump(out, open(f'{D}/senate_ptr_hist.json', 'w')); print(len(out), flush=True)
json.dump(out, open(f'{D}/senate_ptr_hist.json', 'w'))
print('done', len(out), 'trades', sum(len(r['trades']) for r in out), 'paper', sum(r['paper'] for r in out))
