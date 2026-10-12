"""Daily refresh: download the latest public records, rebuild the app's data, and export the tables that changed.

Usage: python pipeline/daily.py <work dir> [--weekly]
The work dir holds the pipeline state between runs (parsed stock trade reports, lobbying filings, history, etc.).
Exports go to <work>/export; <work>/changed.txt lists the tables whose contents changed since the last run.
"""
import datetime, gzip, hashlib, json, os, re, shutil, subprocess, sys, time, urllib.request, zipfile

W = os.path.abspath(sys.argv[1]); WEEKLY = '--weekly' in sys.argv or datetime.date.today().weekday() == 0
P = os.path.dirname(os.path.abspath(__file__))
D = os.path.join(W, 'data'); os.makedirs(D, exist_ok=True)
UA = {'User-Agent': 'CapitolReceipts data refresh (https://capitolreceipts.com)'}
LOG = []
def log(*a):
    s = ' '.join(str(x) for x in a); print(s, flush=True); LOG.append(s)

def fetch(url, dest, min_bytes=500):
    for i in range(4):
        try:
            data = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=300).read()
            if len(data) < min_bytes: raise IOError(f'only {len(data)} bytes')
            tmp = dest + '.part'; open(tmp, 'wb').write(data); os.replace(tmp, dest); return True
        except Exception as e:
            log('  retry', url, e); time.sleep(10 * (i + 1))
    log('  FAILED', url); return False

def step(name, args, cwd=W):
    t = time.time()
    r = subprocess.run([sys.executable] + args, cwd=cwd, capture_output=True, text=True)
    tail = (r.stdout + r.stderr).strip().splitlines()[-3:]
    log(f'{name}: {"ok" if r.returncode == 0 else "FAILED"} ({time.time() - t:.0f}s)', *tail)
    if r.returncode != 0: raise SystemExit(f'{name} failed')

# ---------- 1. fresh public records ----------
GH = 'https://raw.githubusercontent.com/unitedstates/congress-legislators/main/'
for f in ('legislators-current.yaml', 'legislators-historical.yaml', 'committees-current.yaml', 'committee-membership-current.yaml'):
    fetch(GH + f, os.path.join(D, f))
os.makedirs(os.path.join(D, 'hist'), exist_ok=True)
fetch(GH + 'executive.yaml', os.path.join(D, 'hist', 'executive.yaml'))
fetch(GH + 'legislators-social-media.yaml', os.path.join(D, 'hist', 'social.yaml'))
for kind in ('members', 'rollcalls', 'votes'):
    fetch(f'https://voteview.com/static/data/out/{kind}/HS119_{kind}.csv', os.path.join(D, f'HS119_{kind}.csv'))
for y in (20, 22, 24, 26):
    if y == 26 or not os.path.exists(os.path.join(D, f'weball{y}.zip')):
        fetch(f'https://www.fec.gov/files/bulk-downloads/20{y}/weball{y}.zip', os.path.join(D, f'weball{y}.zip'))
for f in ('pas226.zip', 'cm26.zip'):
    fetch(f'https://www.fec.gov/files/bulk-downloads/2026/{f}', os.path.join(D, f))
for y in ('2025', '2026'):
    z = os.path.join(D, f'{y}FD.zip')
    if fetch(f'https://disclosures-clerk.house.gov/public_disc/financial-pdfs/{y}FD.zip', z):
        os.makedirs(os.path.join(D, f'fd{y[2:]}'), exist_ok=True)
        zipfile.ZipFile(z).extractall(os.path.join(D, f'fd{y[2:]}'))

# ---------- 2. new stock trade reports (only reports we haven't read yet) ----------
for f in os.listdir(P):
    if f.endswith('.py'): shutil.copy(os.path.join(P, f), os.path.join(W, f))
step('house trades', ['daily_trades.py', D])
step('senate trades', ['daily_senate.py', D])
if WEEKLY:
    try:
        step('ethics statements', ['fetch_ethics.py', D])
        # the app shows statements since the current-Congress list began; add any newer ones to the front
        cur = json.load(open(os.path.join(D, 'ethics_house.json'))); allst = json.load(open(os.path.join(D, 'ethics_house_all.json')))
        known = {x['url'] for x in cur}
        newer = []
        for x in allst:
            if x['url'] in known: break
            newer.append(x)
        if newer:
            json.dump(newer + cur, open(os.path.join(D, 'ethics_house.json'), 'w')); log('new ethics statements:', len(newer))
    except SystemExit as e: log('ethics refresh skipped:', e)
    try: step('lobbying filings', ['fetch_lda.py', os.path.join(D, 'lda')])
    except SystemExit as e: log('lobbying refresh skipped:', e)
    # full lobbying history (1999 on) for the top 3,000 groups; resumable, so a slow week just continues next week
    try:
        r = subprocess.run([sys.executable, 'fetch_lob_hist.py', '3000'], cwd=W, capture_output=True, text=True, timeout=2400)
        log('lobbying history:', 'ok' if r.returncode == 0 else 'FAILED', (r.stdout + r.stderr).strip().splitlines()[-1:])
    except subprocess.TimeoutExpired:
        log('lobbying history: partway, continues next week')

# ---------- 3. rebuild ----------
step('core', ['build.py', D, os.path.join(W, 'data.json')])
step('extras', ['extras.py', D, os.path.join(W, 'data.json'), os.path.join(W, 'data2.json')])
step('pacs', ['build_pacs.py', W])
step('pages', ['build_pages.py'])
EXP = os.path.join(W, 'export'); os.makedirs(EXP, exist_ok=True)
step('export', ['export_db.py', W, EXP])
env = dict(os.environ, EXPORT_DIR=EXP)
el = os.path.join(W, 'el'); os.makedirs(el, exist_ok=True)
shutil.copy(os.path.join(D, 'legislators-current.yaml'), os.path.join(el, 'legislators-current.yaml'))
r = subprocess.run([sys.executable, 'build_elections.py', el, el], cwd=W, env=env, capture_output=True, text=True); log('elections:', 'ok' if r.returncode == 0 else 'FAILED', (r.stdout + r.stderr).strip().splitlines()[-2:])
r = subprocess.run([sys.executable, 'build_votes.py', D, '119'], cwd=W, env=dict(env, VOTE_PREFIX='HS119'), capture_output=True, text=True); log('votes:', 'ok' if r.returncode == 0 else 'FAILED', (r.stdout + r.stderr).strip().splitlines()[-1:])
if WEEKLY:
    r = subprocess.run([sys.executable, 'build_companies.py', W, W], cwd=W, env=dict(env, CONTRACT_LIMIT='700'), capture_output=True, text=True); log('companies:', 'ok' if r.returncode == 0 else 'FAILED', (r.stdout + r.stderr).strip().splitlines()[-1:])

# ---------- 3b. member extras, caucuses, judges ----------
# Static inputs (trips, office spending, earmarks, past donors, scanned trades) ship in pipeline/more_inputs.tar.gz;
# re-extract when that bundle changes. Weekly: fresh judges list, caucus member lists and lobbyists' donation reports.
MI = os.path.join(W, 'more'); os.makedirs(MI, exist_ok=True)
bundle = os.path.join(P, 'more_inputs.tar.gz')
if os.path.exists(bundle):
    bh = hashlib.sha256(open(bundle, 'rb').read()).hexdigest()
    mark = os.path.join(MI, '.bundle')
    if not os.path.exists(mark) or open(mark).read() != bh:
        import tarfile
        with tarfile.open(bundle) as tf: tf.extractall(MI, filter='data')
        open(mark, 'w').write(bh); log('more inputs: unpacked')
for f in ('legislators-current.yaml', 'HS119_votes.csv', 'HS119_members.csv'):
    if os.path.exists(os.path.join(D, f)): shutil.copy(os.path.join(D, f), os.path.join(MI, f))
if WEEKLY:
    fetch('https://www.fjc.gov/sites/default/files/history/judges.csv', os.path.join(MI, 'judges.csv'), 100000)
    os.makedirs(os.path.join(MI, 'wiki'), exist_ok=True)
    for f in os.listdir(os.path.join(MI, 'wiki')):
        if f.endswith('.txt'):
            fetch(f'https://en.wikipedia.org/w/index.php?title={f[:-4]}&action=raw', os.path.join(MI, 'wiki', f), 2000)
    try:
        r = subprocess.run([sys.executable, 'fetch_ld203.py', MI], cwd=W, capture_output=True, text=True, timeout=3600)
        log('lobbyist donations:', 'ok' if r.returncode == 0 else 'FAILED', (r.stdout + r.stderr).strip().splitlines()[-1:])
    except subprocess.TimeoutExpired:
        log('lobbyist donations: still downloading, will continue next week')
r = subprocess.run([sys.executable, 'build_more.py', MI, EXP], cwd=W, capture_output=True, text=True)
log('extras/caucuses/judges:', 'ok' if r.returncode == 0 else 'FAILED', (r.stdout + r.stderr).strip().splitlines()[-3:])

# ---------- 4. which tables changed ----------
HF = os.path.join(W, 'export_hashes.json')
old = json.load(open(HF)) if os.path.exists(HF) else {}
new, changed = {}, []
for f in sorted(os.listdir(EXP)):
    if not f.endswith('.jsonl.gz'): continue
    h = hashlib.sha256(gzip.open(os.path.join(EXP, f)).read()).hexdigest()
    t = f[:-9]; new[t] = h
    if old.get(t) != h: changed.append(t)
json.dump(new, open(HF, 'w'))
open(os.path.join(W, 'changed.txt'), 'w').write(' '.join(changed))
log('changed tables:', ' '.join(changed) or 'none')
open(os.path.join(W, 'last_run.txt'), 'w').write('\n'.join(LOG))
