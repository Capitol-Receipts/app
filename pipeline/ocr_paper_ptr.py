"""Read scanned paper stock trade reports (House) with OCR: asset name, trade date and owner.

Amount ranges and buy/sell are check boxes on the paper form and are too unreliable to read automatically,
so they're left out; every trade read this way is marked as coming from a scan, with a link to the original.
Usage: python ocr_paper_ptr.py <data dir>   (needs ptr_parsed.json and the PDFs in <data>/ptr/, downloads missing ones)
Writes ptr_ocr.json: {doc_id: [[date, owner, asset], ...]}
"""
import datetime, json, os, re, subprocess, sys, tempfile, urllib.request

D = sys.argv[1]
P = json.load(open(os.path.join(D, 'ptr_parsed.json')))
OUTF = os.path.join(D, 'ptr_ocr.json')
done = json.load(open(OUTF)) if os.path.exists(OUTF) else {}
LINE = re.compile(r'^(?:(SP|JT|DC)\s*[|:]?\s+)?(.{4,120}?)\s*[|><xX)\]]*\s+(\d{1,2}/\d{1,2}/\d{2,4})\b')
def clean(a):
    a = re.sub(r'[|><©®“”"]+', ' ', a)
    a = re.sub(r'\s+[xX]{1,2}\s*$', '', a)
    a = re.sub(r'\s+', ' ', a).strip(' -.,:;')
    return a
def parse_date(s):
    m = re.match(r'(\d{1,2})/(\d{1,2})/(\d{2,4})', s)
    if not m: return None
    mo, d, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
    y = y + 2000 if y < 100 else y
    try:
        dt = datetime.date(y, mo, d)
        return dt.isoformat() if 2024 <= y <= 2026 else None
    except ValueError: return None
n_new = 0
for doc, r in P.items():
    if not r.get('paper') or doc in done: continue
    pdf = os.path.join(D, 'ptr', f'{doc}.pdf')
    if not os.path.exists(pdf):
        try:
            os.makedirs(os.path.dirname(pdf), exist_ok=True)
            open(pdf, 'wb').write(urllib.request.urlopen(f"https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/{r['year']}/{doc}.pdf", timeout=60).read())
        except Exception: continue
    rows = []
    with tempfile.TemporaryDirectory() as td:
        subprocess.run(['pdftoppm', '-r', '200', '-png', pdf, os.path.join(td, 'p')], capture_output=True, timeout=300)
        for img in sorted(os.listdir(td)):
            txt = subprocess.run(['tesseract', os.path.join(td, img), '-', '--psm', '4'], capture_output=True, text=True, timeout=300).stdout
            for ln in txt.splitlines():
                m = LINE.match(ln.strip())
                if not m: continue
                asset = clean(m.group(2)); date = parse_date(m.group(3))
                if not date or len(re.findall(r'[A-Za-z]{2,}', asset)) < 2 or re.search(r'example|mega corp|full asset name|provide full', asset, re.I): continue
                rows.append([date, {'SP': 'Spouse', 'JT': 'Joint', 'DC': 'Child'}.get(m.group(1), ''), asset[:100]])
    done[doc] = rows; n_new += 1
    if n_new % 10 == 0: json.dump(done, open(OUTF, 'w')); print('read', n_new, flush=True)
json.dump(done, open(OUTF, 'w'))
print('paper reports read', len(done), 'trades found', sum(len(v) for v in done.values()), 'reports with none found', sum(1 for v in done.values() if not v))
