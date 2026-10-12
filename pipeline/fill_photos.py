"""Add a photo for any current member who doesn't have one yet.

Usage: python fill_photos.py <data dir with legislators-current.yaml> <photos.json>
Tries the official congressional photo set first, then the member's Wikipedia lead image.
Photos are stored like the rest: a 112x112 WebP, base64 encoded, keyed by bioguide ID.
Members with no photo anywhere yet are simply tried again on the next run.
"""
import base64, io, json, os, sys, time, urllib.parse, urllib.request
import yaml
from PIL import Image

D, OUT = sys.argv[1], sys.argv[2]
UA = {'User-Agent': 'CapitolReceipts data refresh (https://capitolreceipts.com)'}
photos = json.load(open(OUT)) if os.path.exists(OUT) else {}

def get(url, min_bytes=3000):
    try:
        data = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60).read()
        return data if len(data) >= min_bytes else None
    except Exception:
        return None

def wiki_image(title):
    q = urllib.parse.urlencode({'action': 'query', 'titles': title, 'prop': 'pageimages', 'piprop': 'thumbnail',
                                'pithumbsize': 400, 'redirects': 1, 'format': 'json'})
    raw = get('https://en.wikipedia.org/w/api.php?' + q, 50)
    if not raw: return None
    for pg in json.loads(raw).get('query', {}).get('pages', {}).values():
        src = pg.get('thumbnail', {}).get('source')
        if src: return get(src)
    return None

def to_webp(data):
    im = Image.open(io.BytesIO(data)).convert('RGB')
    w, h = im.size
    side = min(w, h)
    top = 0 if h > w else 0  # portraits: keep the top square, where the face is
    left = (w - side) // 2
    im = im.crop((left, top, left + side, top + side)).resize((112, 112), Image.LANCZOS)
    buf = io.BytesIO(); im.save(buf, 'WEBP', quality=72, method=6)
    return base64.b64encode(buf.getvalue()).decode()

added = []
for l in yaml.safe_load(open(os.path.join(D, 'legislators-current.yaml'))):
    bg = l['id']['bioguide']
    if bg in photos: continue
    data = get(f'https://unitedstates.github.io/images/congress/225x275/{bg}.jpg', 5000)
    if not data and l['id'].get('wikipedia'):
        data = wiki_image(l['id']['wikipedia']); time.sleep(1)
    if not data: continue
    try:
        photos[bg] = to_webp(data); added.append(bg)
    except Exception as e:
        print('could not use photo for', bg, e)
json.dump(photos, open(OUT, 'w'))
print('photos added:', len(added), ' '.join(added))
