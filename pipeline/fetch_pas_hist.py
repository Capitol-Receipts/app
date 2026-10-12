"""PAC and party-committee contributions to every candidate, 1980-2024 FEC cycles (pas2 + committee master).
Out: data/hist/pac_hist.json {candidate_fec_id: {committee_id: [total, first_year, last_year]}}, data/hist/cm_names.json"""
import json, os, subprocess, zipfile, io, collections
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'hist')
agg = collections.defaultdict(lambda: collections.defaultdict(lambda: [0.0, 9999, 0]))
names = {}
for Y in range(1980, 2025, 2):
    y = f'{Y % 100:02d}'
    for kind in ('pas2', 'cm'):
        zp = f'{D}/{kind}{y}.zip'
        if not os.path.exists(zp):
            r = subprocess.run(['curl', '-sSL', '--retry', '3', '-o', zp, '-w', '%{http_code}', f'https://www.fec.gov/files/bulk-downloads/{Y}/{kind}{y}.zip'], capture_output=True, text=True)
            if r.stdout != '200':
                print('miss', kind, Y, flush=True); os.path.exists(zp) and os.remove(zp); continue
    try:
        z = zipfile.ZipFile(f'{D}/cm{y}.zip')
        for line in io.TextIOWrapper(z.open(z.namelist()[0]), encoding='latin-1'):
            f = line.rstrip('\n').split('|')
            if len(f) > 13:
                names[f[0]] = [f[1], f[9], f[12], f[13]]  # name, type, category, connected org
    except Exception as e:
        print('cm err', Y, e)
    try:
        z = zipfile.ZipFile(f'{D}/pas2{y}.zip')
        n = 0
        for line in io.TextIOWrapper(z.open(z.namelist()[0]), encoding='latin-1'):
            f = line.split('|')
            if len(f) < 17 or f[5] not in ('24K', '24E', '24Z') or f[5] != '24K':
                continue
            try: amt = float(f[14] or 0)
            except ValueError: continue
            cand = f[16]
            if not cand: continue
            a = agg[cand][f[0]]
            a[0] += amt; a[1] = min(a[1], Y); a[2] = max(a[2], Y); n += 1
        print(Y, n, flush=True)
    except Exception as e:
        print('pas err', Y, e)
    for kind in ('pas2', 'cm'):
        try: os.remove(f'{D}/{kind}{y}.zip')
        except FileNotFoundError: pass
out = {c: {k: [round(v[0]), v[1], v[2]] for k, v in d.items() if v[0] > 0} for c, d in agg.items()}
json.dump(out, open(f'{D}/pac_hist.json', 'w'), separators=(',', ':'))
json.dump(names, open(f'{D}/cm_names.json', 'w'), separators=(',', ':'))
print('done', len(out))
