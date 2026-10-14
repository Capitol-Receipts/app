"""Mark the iPhone and Android apps as coming soon across the marketing site (idempotent).
Run after build_site.py:  python3 scripts/app_soon.py"""
import glob, os, re
SITE = os.path.join(os.path.dirname(__file__), '..', 'site')
APPLE = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="18" r="1.2"/></svg>'
ANDROID = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="5" y="8" width="14" height="12" rx="3"/><path d="M8 8a4 4 0 0 1 8 0M8.5 4.5 7.5 3M15.5 4.5 16.5 3"/></svg>'
pill = lambda icon, label: (f'<span style="display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.08);color:#ffffff;'
                            f'border:1px solid rgba(255,255,255,.28);border-radius:12px;padding:9px 14px;font-weight:700;font-size:14px">{icon}{label}'
                            f'<em style="font-style:normal;font-weight:700;font-size:11px;letter-spacing:.06em;text-transform:uppercase;background:#c8323a;color:#fff;border-radius:999px;padding:3px 8px">Coming soon</em></span>')
HERO = ('<div data-appsoon style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">'
        + pill(APPLE, 'iPhone app') + pill(ANDROID, 'Android app') +
        '<span style="font-size:14px;color:#a9b6d3">Use it today in any browser.</span></div>')
FOOT = ('<p data-appsoon style="margin:0 auto 28px;max-width:1180px;font-size:14px;color:#c9d1e0">'
        '<b style="color:#ffffff">iPhone and Android apps are coming soon.</b> Until then, Capitol Receipts works in any browser on your phone. '
        'Open <a href="https://app.capitolreceipts.com" style="color:#ffffff">app.capitolreceipts.com</a> and add it to your home screen.</p>')
FAQ_Q = 'Is there an iPhone or Android app?'
FAQ_A = 'Not yet. iPhone and Android apps are coming soon. Capitol Receipts already works in any phone browser, and you can add it to your home screen so it opens like an app. Your account and Pro plan will carry over to the apps.'
for f in glob.glob(os.path.join(SITE, '*.html')):
    s = open(f, encoding='utf-8').read(); o = s
    s = s.replace('>Get the app<', '>Open the app<')
    if 'data-appsoon' not in s:
        s = re.sub(r'(<footer[^>]*>)', r'\1' + FOOT.replace('\\', r'\\'), s, count=1)
        if f.endswith('index.html'):
            s = s.replace('<p style="margin: 0; font-size: 14px; color: #a9b6d3">All 535 members of Congress.', HERO + '\n   <p style="margin: 0; font-size: 14px; color: #a9b6d3">All 535 members of Congress.', 1)
        if f.endswith('pricing.html') and FAQ_Q not in s:
            s = re.sub(r'(<details><summary>Do I need a card for the free week\?</summary>.*?</details>)', r'\1\n  <details><summary>' + FAQ_Q + '</summary><p>' + FAQ_A + '</p></details>', s, count=1, flags=re.S)
            s = s.replace('"mainEntity": [', '"mainEntity": [{"@type": "Question", "name": "' + FAQ_Q + '", "acceptedAnswer": {"@type": "Answer", "text": "' + FAQ_A + '"}}, ', 1)
    if s != o:
        open(f, 'w', encoding='utf-8').write(s); print('updated', os.path.basename(f))
