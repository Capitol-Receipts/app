"""Download govinfo BILLSTATUS bulk zips (108th-119th) and reduce to per-sponsor records.
Output: data/hist/bills.json  {bioguide: [[congress, type, number, title, law(0/1), policyArea, introduced, cosponsorCount], ...]}
"""
import json, os, re, subprocess, sys, zipfile, io
import xml.etree.ElementTree as ET

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'hist')
OUT = os.path.join(D, 'bills.json')
TYPES = ['hr', 's', 'hjres', 'sjres']
res = json.load(open(OUT)) if os.path.exists(OUT) else {}
done_path = os.path.join(D, 'bills_done.json')
done = set(json.load(open(done_path))) if os.path.exists(done_path) else set()


def txt(el, path):
    x = el.find(path)
    return x.text.strip() if x is not None and x.text else ''


for c in range(108, 120):
    for t in TYPES:
        key = f'{c}-{t}'
        if key in done:
            continue
        url = f'https://www.govinfo.gov/bulkdata/BILLSTATUS/{c}/{t}/BILLSTATUS-{c}-{t}.zip'
        zp = os.path.join(D, 'tmp_bill.zip')
        r = subprocess.run(['curl', '-sSL', '--retry', '3', '-o', zp, '-w', '%{http_code}', url], capture_output=True, text=True)
        if r.stdout.strip() != '200':
            print('skip', key, r.stdout, flush=True)
            done.add(key)
            continue
        n = 0
        with zipfile.ZipFile(zp) as z:
            for name in z.namelist():
                if not name.endswith('.xml'):
                    continue
                try:
                    root = ET.fromstring(z.read(name))
                except ET.ParseError:
                    continue
                b = root.find('bill')
                if b is None:
                    continue
                num = txt(b, 'number') or txt(b, 'billNumber')
                title = txt(b, 'title')
                sp = b.find('sponsors/item')
                if sp is None:
                    continue
                bid = txt(sp, 'bioguideId')
                if not bid:
                    continue
                law = 1 if b.find('laws/item') is not None else 0
                if not law:
                    la = txt(b, 'latestAction/text')
                    if 'Became Public Law' in la or 'Became Private Law' in la:
                        law = 1
                pa = txt(b, 'policyArea/name')
                intro = txt(b, 'introducedDate')
                cos = b.find('cosponsors')
                cc = len(cos.findall('item')) if cos is not None else 0
                res.setdefault(bid, []).append([c, t, int(num) if num.isdigit() else num, title[:160], law, pa, intro, cc])
                n += 1
        os.remove(zp)
        done.add(key)
        json.dump(res, open(OUT, 'w'))
        json.dump(sorted(done), open(done_path, 'w'))
        print(key, n, flush=True)
print('done', len(res))
