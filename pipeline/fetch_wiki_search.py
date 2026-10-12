"""Find Wikipedia summaries for appointees and judges by searching name + role, keeping only matches whose summary mentions the role.
Out: data/hist/wiki_people.json {key: {"t": title, "x": extract, "d": description}}"""
import json, os, re, subprocess, time, urllib.parse, csv
B = os.path.dirname(os.path.abspath(__file__))
OUT = f'{B}/data/hist/wiki_people.json'
have = json.load(open(OUT)) if os.path.exists(OUT) else {}
app = json.load(open(f'{B}/data2.json'))
todo = []
for n in app['noms']:
    role = 'judge' if re.search(r'Judge|Justice', n['pos']) else 'ambassador' if 'Ambassador' in n['pos'] else 'attorney' if 'Attorney' in n['pos'] else n['pos'].split(',')[0].split(' of ')[0]
    todo.append((n['id'], n['name'], n['pos'], [w for w in re.findall(r'[a-z]{5,}', n['pos'].lower()) if w not in ('united', 'states', 'district', 'department', 'office', 'america', 'representative', 'assistant', 'deputy', 'general')][:6] + ['judge', 'ambassador', 'secretary', 'attorney', 'administrator', 'director', 'official', 'lawyer', 'politician', 'officer', 'commissioner']))
for r in csv.DictReader(open(f'{B}/data/hist/judges.csv', encoding='utf-8-sig')):
    nm = ' '.join(x for x in [r['First Name'], r['Middle Name'], r['Last Name'], r['Suffix']] if x)
    yrs = [r.get(f'Commission Date ({k})') or '' for k in range(1, 7)]
    if not any(y[:4] >= '1950' for y in yrs if y):  # older judges: skip to keep this fast
        continue
    todo.append(('j' + r['jid'], nm, 'judge', ['judge', 'justice', 'court', 'jurist']))
todo = [t for t in todo if t[0] not in have]
print('todo', len(todo), flush=True)
def api(params):
    q = urllib.parse.urlencode(dict(params, format='json'))
    for a in range(6):
        r = subprocess.run(['curl', '-sSL', '--max-time', '30', '-H', 'User-Agent: PaperTrail/0.1 (civic research)', 'https://en.wikipedia.org/w/api.php?' + q], capture_output=True, text=True)
        try: return json.loads(r.stdout)
        except Exception: time.sleep(5 * (a + 1))
    return {}
for i, (key, name, pos, words) in enumerate(todo):
    clean = re.sub(r',? (Jr\.|Sr\.|III|II|IV)$', '', name)
    hint = 'judge' if pos == 'judge' else pos.split(',')[0][:60]
    j = api({'action': 'query', 'list': 'search', 'srsearch': f'{clean} {hint}', 'srlimit': 3, 'srprop': ''})
    cands = [s['title'] for s in j.get('query', {}).get('search', [])]
    last = clean.split()[-1].lower()
    cands = [c for c in cands if last in c.lower()][:2]
    if cands:
        k = api({'action': 'query', 'prop': 'extracts|description', 'exintro': 1, 'explaintext': 1, 'redirects': 1, 'titles': '|'.join(cands)})
        pages = sorted(k.get('query', {}).get('pages', {}).values(), key=lambda p: cands.index(p['title']) if p.get('title') in cands else 9)
        for pg in pages:
            x = ' '.join([s for s in (pg.get('extract') or '').split('\n') if s.strip()][:2])[:1200]
            low = x.lower()
            first = clean.split()[0].lower()
            if x and 'may refer to' not in low[:200] and first in low[:200] and any(w in low for w in words):
                have[key] = {'t': pg['title'], 'x': x, 'd': pg.get('description', '')}
                break
    if i % 50 == 0:
        json.dump(have, open(OUT, 'w')); print(i, len(have), flush=True)
    time.sleep(0.6)
json.dump(have, open(OUT, 'w')); print('done', len(have))
