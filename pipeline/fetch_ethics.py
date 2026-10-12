"""House Ethics Committee statements about individual members (119th Congress), from ethics.house.gov."""
import re, sys, json, html, time, urllib.request
D = sys.argv[1]
UA = {'User-Agent': 'Mozilla/5.0 PaperTrail research'}
def get(u):
    for i in range(4):
        try: return urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=60).read().decode('utf-8', 'replace')
        except Exception: time.sleep(2 + i)
    return ''
links = []
for p in range(1, 400):
    s = get('https://ethics.house.gov/press-releases/' + (f'page/{p}/' if p > 1 else ''))
    found = re.findall(r'<a[^>]+href="((?:https://ethics\.house\.gov)?/press-releases/[^"#]+)"[^>]*>([^<]{10,300})</a>', s)
    found = [(u if u.startswith('http') else 'https://ethics.house.gov' + u, html.unescape(t).strip()) for u, t in found if '/page/' not in u]
    new = [f for f in found if f not in links]
    if not new: break
    links += new
    dates = re.findall(r'(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, (20\d\d)', s)
    pass
print('statements', len(links), flush=True)
out = []
for u, title in links:
    s = get(u); time.sleep(0.3)
    body = re.search(r'<(?:div|article)[^>]+class="[^"]*(?:entry-content|post-content|field--name-body)[^"]*"[^>]*>(.*?)</(?:div|article)>', s, re.S)
    txt = html.unescape(re.sub(r'<[^>]+>', ' ', body.group(1) if body else s))
    txt = re.sub(r'\s+', ' ', txt).strip()
    dm = re.search(r'(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, 20\d\d', s)
    pdfs = re.findall(r'href="([^"]+\.pdf)"', s)
    out.append(dict(url=u, title=title, date=dm.group(0) if dm else None, text=txt[:2500], pdfs=pdfs[:4]))
json.dump(out, open(f'{D}/ethics_house_all.json', 'w'))
print('saved', len(out))
