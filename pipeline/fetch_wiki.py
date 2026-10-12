"""Wikipedia lead summaries for current members, presidents/VPs, and current appointees (by exact title match only).
Out: data/hist/wiki.json {title: {"x": extract, "d": short description}}"""
import json, os, sys, urllib.parse, concurrent.futures as cf, subprocess, yaml

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
OUT = f'{D}/hist/wiki.json'
have = json.load(open(OUT)) if os.path.exists(OUT) else {}
titles = set()
for f in ('legislators-current.yaml', 'hist/executive.yaml'):
    for p in yaml.load(open(f'{D}/{f}'), Loader=yaml.CLoader):
        w = p['id'].get('wikipedia')
        if w:
            titles.add(w)
        elif f.startswith('hist'):
            n = p['name']
            titles.add(f"{n['first']} {n['last']}")
extra = sys.argv[1:]
if extra:
    titles |= set(json.load(open(extra[0])))
todo = [t for t in titles if t not in have]
print('todo', len(todo), flush=True)


import time
def batch(ts):
    q = urllib.parse.urlencode({'action': 'query', 'format': 'json', 'prop': 'extracts|description', 'exintro': 1, 'explaintext': 1, 'exlimit': 20, 'redirects': 1, 'titles': '|'.join(ts)})
    for attempt in range(6):
        r = subprocess.run(['curl', '-sSL', '--max-time', '30', '-H', 'User-Agent: PaperTrail/0.1 (civic research; contact via site)', 'https://en.wikipedia.org/w/api.php?' + q], capture_output=True, text=True)
        try:
            j = json.loads(r.stdout)
            break
        except Exception:
            time.sleep(5 * (attempt + 1))
    else:
        return {}
    norm_ = {x['to']: x['from'] for x in j.get('query', {}).get('normalized', [])}
    red = {x['to']: x['from'] for x in j.get('query', {}).get('redirects', [])}
    out = {}
    for pg in j.get('query', {}).get('pages', {}).values():
        if 'missing' in pg or not pg.get('extract'):
            continue
        t = pg['title']
        orig = red.get(t, t)
        orig = norm_.get(orig, orig)
        x = [s for s in pg['extract'].split('\n') if s.strip()]
        x = ' '.join(x[:2])[:1200]
        if 'may refer to' in x[:200]:
            continue
        out[orig] = {'x': x, 'd': pg.get('description', '')}
    return out


for i in range(0, len(todo), 20):
    have.update(batch(todo[i:i + 20]))
    if i % 200 == 0:
        json.dump(have, open(OUT, 'w'))
        print(i, len(have), flush=True)
    time.sleep(1)
json.dump(have, open(OUT, 'w'))
print('done', len(have))
