"""Tell Bing, Yandex, Seznam and other IndexNow search engines about pages on www.capitolreceipts.com.

Usage: python scripts/indexnow.py daily   (the pages that change every day: directories, members, states, this week)
       python scripts/indexnow.py full    (every page in the sitemaps; for a one-time or occasional full submission)
The key file lives at https://www.capitolreceipts.com/e2d3f5e148655d08c6d224c446b615c5.txt (site/e2d3f5e148655d08c6d224c446b615c5.txt).
"""
import json, re, sys, time, urllib.request

SITE = 'https://www.capitolreceipts.com'
KEY = 'e2d3f5e148655d08c6d224c446b615c5'
UA = {'User-Agent': 'CapitolReceipts IndexNow (https://www.capitolreceipts.com)'}

def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120).read().decode()

def submit(urls):
    for i in range(0, len(urls), 10000):
        body = json.dumps({'host': 'www.capitolreceipts.com', 'key': KEY, 'keyLocation': f'{SITE}/{KEY}.txt', 'urlList': urls[i:i + 10000]}).encode()
        req = urllib.request.Request('https://api.indexnow.org/indexnow', data=body, method='POST', headers={'Content-Type': 'application/json; charset=utf-8', **UA})
        try:
            r = urllib.request.urlopen(req, timeout=120); print('submitted', len(urls[i:i + 10000]), 'status', r.status)
        except urllib.error.HTTPError as e:
            print('submit failed', e.code, e.read()[:200])
        time.sleep(2)

mode = sys.argv[1] if len(sys.argv) > 1 else 'daily'
files = re.findall(r'<loc>([^<]+)</loc>', get(f'{SITE}/sitemap.xml'))
if mode == 'daily':
    files = [f for f in files if re.search(r'/sitemaps/(site|hubs|places|members|es)\.xml$', f)]
urls = []
for f in files:
    urls += re.findall(r'<loc>([^<]+)</loc>', get(f))
urls = list(dict.fromkeys(urls))
print(mode, 'urls', len(urls))
submit(urls)
