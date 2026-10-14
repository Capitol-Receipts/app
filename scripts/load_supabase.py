"""Load data/export/*.jsonl.gz into Supabase (upsert by primary key).

Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.
Usage: python scripts/load_supabase.py [table ...]   (no args = every table)
"""
import gzip, json, os, sys, time, urllib.request, urllib.error

URL = os.environ['SUPABASE_URL'].rstrip('/')
KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']
DIR = os.environ.get('EXPORT_DIR') or os.path.join(os.path.dirname(__file__), '..', 'data', 'export')
PK = {'bills': 'key', 'app_meta': 'key', 'zip_districts': 'zip'}
ORDER = ['app_meta', 'members', 'nominations', 'roll_calls', 'photos', 'zip_districts', 'committees', 'lobby_firms',
         'ethics_matters', 'lobby_clients', 'pacs', 'careers', 'appointees', 'people', 'bills', 'races', 'outside_groups', 'companies', 'congress_votes', 'member_extras', 'caucuses', 'judges']
MAX_BYTES = 3_000_000

def post(table, rows):
    body = ('[' + ','.join(rows) + ']').encode()
    req = urllib.request.Request(f'{URL}/rest/v1/{table}?on_conflict={PK.get(table, "id")}', data=body, method='POST', headers={
        'apikey': KEY, 'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=minimal'})
    for attempt in range(5):
        try:
            urllib.request.urlopen(req, timeout=180).read(); return
        except urllib.error.HTTPError as e:
            msg = e.read().decode()[:500]
            if e.code < 500: sys.exit(f'{table}: HTTP {e.code} {msg}')
            print(f'  retry {table} after HTTP {e.code}: {msg}')
        except Exception as e:
            print(f'  retry {table} after {e}')
        time.sleep(3 * (attempt + 1))
    sys.exit(f'{table}: giving up')

def load(table):
    path = os.path.join(DIR, f'{table}.jsonl.gz')
    batch, size, n = [], 0, 0
    with gzip.open(path, 'rt', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line: continue
            batch.append(line); size += len(line); n += 1
            if size >= MAX_BYTES or len(batch) >= 2000:
                post(table, batch); batch, size = [], 0
    if batch: post(table, batch)
    print(f'{table}: {n} rows')

def record_update(tables):
    body = json.dumps([{'key': 'updated', 'value': {'at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'tables': tables}}]).encode()
    req = urllib.request.Request(f'{URL}/rest/v1/app_meta?on_conflict=key', data=body, method='POST', headers={
        'apikey': KEY, 'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates,return=minimal'})
    urllib.request.urlopen(req, timeout=60).read()

def refresh_cache():
    # The rebuild can outlast the API gateway (504) when Supabase is slow. Retry, and if it still won't finish,
    # warn instead of failing: the data itself is loaded, alerts can still go out, and tomorrow's run rebuilds it.
    for attempt in range(3):
        req = urllib.request.Request(f'{URL}/rest/v1/rpc/refresh_light_cache', data=b'{}', method='POST', headers={
            'apikey': KEY, 'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json'})
        try:
            urllib.request.urlopen(req, timeout=300).read()
            print('light index cache rebuilt'); return
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as e:
            code = getattr(e, 'code', None)
            if code is not None and code < 500: raise
            print(f'  cache rebuild attempt {attempt + 1} failed: {e}')
            time.sleep(60 * (attempt + 1))
    print('::warning::Light index cache rebuild timed out 3 times; data is loaded, the cache rebuilds on the next run.')

done = []
for t in (sys.argv[1:] or ORDER):
    if os.path.exists(os.path.join(DIR, f'{t}.jsonl.gz')): load(t); done.append(t)
refresh_cache()
record_update(done)
