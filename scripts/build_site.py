"""Turn the designed marketing pages into a plain static site in site/.

Usage: python3 scripts/build_site.py <folder with *.dc.html> <folder with asset .webp files>
"""
import os, re, shutil, sys

SRC, ASSETS = sys.argv[1], sys.argv[2]
OUT = os.path.join(os.path.dirname(__file__), '..', 'site')
APP = 'https://app.capitolreceipts.com'
SITE = 'https://www.capitolreceipts.com'
PAGES = {  # design file -> (url path, output file, description)
    'Main': ('/', 'index.html', 'Who funds every member of Congress, what stocks they trade, how they vote and who lobbies them, explained in plain English. Free and nonpartisan.'),
    'Features': ('/features', 'features.html', 'Everything in the Capitol Receipts app: money, votes, trades, lobbying, appointees and more, in plain English.'),
    'Leaderboards': ('/receipts', 'receipts.html', 'The biggest stock traders, top fundraisers and most-missed votes in Congress, ranked from public records.'),
    'Parties': ('/parties', 'parties.html', 'Compare Democrats and Republicans side by side on money, votes and trades.'),
    'Appointees': ('/appointees', 'appointees.html', 'Cabinet members, agency heads and ambassadors: who they are, what they own and what they promised.'),
    'Quiz': ('/quiz', 'quiz.html', 'Find out which members of Congress vote the way you would.'),
    'Method': ('/how-it-works', 'how-it-works.html', 'Where every number on Capitol Receipts comes from and how we count it.'),
    'Newsrooms': ('/newsrooms', 'newsrooms.html', 'Capitol Receipts for reporters, researchers and watchdog groups.'),
    'Pricing': ('/pricing', 'pricing.html', 'Capitol Receipts is free to use. See what comes with Pro and Newsrooms.'),
}
APP_LABELS = ('Get the app', 'Download free', 'Start 7-day free trial')

if os.path.isdir(OUT):
    shutil.rmtree(OUT)
os.makedirs(os.path.join(OUT, 'img'))
os.makedirs(os.path.join(OUT, 'js'))

used = set()
for name, (path, fname, desc) in PAGES.items():
    src = open(os.path.join(SRC, f'{name}.dc.html'), encoding='utf-8').read()
    title = re.search(r'<title>(.*?)</title>', src).group(1)
    helmet = re.search(r'<helmet>(.*?)</helmet>', src, re.S).group(1).strip()
    body = re.search(r'</helmet>(.*?)</x-dc>', src, re.S).group(1).strip()

    # images
    for b in re.findall(r'/_blob/([0-9a-f]{32})', body):
        used.add(b)
    body = re.sub(r'/_blob/([0-9a-f]{32})', r'/img/\1.webp', body)
    body = re.sub(r'<img (?![^>]*\bloading=)', '<img loading="lazy" decoding="async" ', body)

    # links between pages
    for n, (p, _, _) in PAGES.items():
        body = body.replace(f'href="{n}.dc.html"', f'href="{p}"')
    # buttons that should open the app
    def to_app(m):
        tag, label = m.group(1), m.group(2)
        if label.strip() in APP_LABELS:
            tag = re.sub(r'href="[^"]*"', f'href="{APP}"', tag)
        return tag + label + '</a>'
    body = re.sub(r'(<a [^>]*>)([^<]*)</a>', to_app, body)
    body = body.replace('>Download free<', '>Open the app free<')
    body = body.replace('>Start 7-day free trial<', '>Try Pro free for 7 days<')

    # fill placeholders
    body = body.replace('Get early access before launch on [LAUNCH DATE].', 'Get a short weekly email on what Congress did and how your members voted.')
    body = body.replace('Email [YOUR EMAIL] with a link', 'Email <a href="mailto:corrections@capitolreceipts.com">corrections@capitolreceipts.com</a> with a link')
    body = body.replace('[YOUR PRICE]', 'Custom')

    # homepage hero: two phones side by side, fully inside the hero
    body = body.replace('display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 40px; align-items: end"',
                        'display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 40px; align-items: center"')
    body = re.sub(r'<div style="display: flex; justify-content: center; align-items: flex-end; gap: 0; height: 600px; position: relative">\s*'
                  r'<div class="phone" style="transform: rotate\(-6deg\) translate\(40px, 60px\)">(.*?)</div>\s*'
                  r'<div class="phone" style="transform: rotate\(5deg\) translate\(-30px, 20px\); z-index: 1">(.*?)</div>\s*</div>',
                  r'<div class="hero-phones"><div class="phone" style="transform: rotate(-3deg)">\1</div><div class="phone" style="transform: rotate(3deg) translateY(-24px)">\2</div></div>',
                  body, flags=re.S)
    body = body.replace('<img loading="lazy" decoding="async" src="/img/5741f918', '<img decoding="async" fetchpriority="high" src="/img/5741f918')
    body = body.replace('<img loading="lazy" decoding="async" src="/img/d0ab17d8', '<img decoding="async" fetchpriority="high" src="/img/d0ab17d8')
    # compact menu on smaller screens
    body = body.replace('<div class="hide-sm" style="display: flex; gap: 20px; margin-left: auto">',
                        '<button class="menu-btn" type="button" aria-expanded="false" aria-controls="site-links">Menu</button>\n  <div class="hide-sm site-links" id="site-links" style="display: flex; gap: 20px; margin-left: auto">')

    # forms
    body = body.replace('<form style="display: flex; gap: 10px; flex-wrap: wrap">', '<form data-signup="list" style="display: flex; gap: 10px; flex-wrap: wrap">')
    body = body.replace('<form style="display: grid;', '<form data-signup="newsroom" style="display: grid;')
    body = body.replace('<button type="button" style="grid-column: 1 / -1;', '<button type="submit" style="grid-column: 1 / -1;')
    for field, nm in (('>Name<input type="text"', 'name'), ('>Work email<input type="email"', 'email'), ('>Newsroom<input type="text"', 'org')):
        body = body.replace(field, field + f' name="{nm}" required')
    body = body.replace('>Team size<select', '>Team size<select name="team_size"')
    body = body.replace('<textarea rows="4"', '<textarea name="note" rows="4" maxlength="2000"')
    body = body.replace('id="email-home" type="email"', 'id="email-home" name="email" type="email" required')

    # Squared Away Labs and its other apps, last thing in the footer.
    sys.path.insert(0, os.path.dirname(__file__))
    from studio_footer import add_studio
    body = add_studio(body)

    canon = SITE + (path if path != '/' else '/')
    html = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-2PVF462YXR"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){{dataLayer.push(arguments);}}
  gtag('js', new Date());

  gtag('config', 'G-2PVF462YXR', { linker: { domains: ['capitolreceipts.com', 'www.capitolreceipts.com', 'app.capitolreceipts.com'] } });
</script>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{canon}">
<meta name="theme-color" content="#14274e">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Capitol Receipts">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{canon}">
<meta name="twitter:card" content="summary">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
{helmet}
<style>img{{max-width:100%}}.cr-msg{{flex-basis:100%;margin:4px 0 0;font-weight:700}}
.hero-phones{{display:flex;justify-content:center;align-items:center;gap:24px;padding:40px 0 72px}}
.hero-phones .phone{{width:260px;flex:0 1 260px}}
.menu-btn{{display:none;margin-left:auto;background:transparent;color:#fff;border:2px solid rgba(255,255,255,.5);border-radius:999px;padding:9px 16px;font:700 15px inherit;font-family:inherit;cursor:pointer}}
header nav>a:last-child{{margin-left:0 !important}}
@media (max-width:1100px){{
 header nav .site-links{{display:none !important}}
 .menu-btn{{display:block}}
 header nav.open .site-links{{display:flex !important;flex-direction:column;gap:14px;flex-basis:100%;order:9;margin:6px 0 4px !important;padding-top:14px;border-top:1px solid rgba(255,255,255,.18)}}
}}
@media (max-width:1280px){{.hero-phones .phone{{width:230px;flex-basis:230px}}}}
@media (max-width:760px){{
 header nav{{gap:12px !important}}
 section span[style*="letter-spacing: .1em"]{{font-size:11px !important;letter-spacing:.06em !important}}
 .hero-phones{{gap:12px;padding:8px 0 48px}}
 .hero-phones .phone{{width:46%;flex-basis:46%;padding:6px;border-radius:30px}}
 .hero-phones .phone img{{border-radius:24px}}
}}
@media (max-width:480px){{header nav>a:last-child{{display:none}}}}
</style>
</head>
<body>
{body}
<script src="/js/forms.js" defer></script>
</body>
</html>
'''
    open(os.path.join(OUT, fname), 'w', encoding='utf-8').write(html)

for b in sorted(used):
    shutil.copy(os.path.join(ASSETS, f'{b}.webp'), os.path.join(OUT, 'img', f'{b}.webp'))

open(os.path.join(OUT, 'favicon.svg'), 'w').write(open(os.path.join(os.path.dirname(__file__), 'assets', 'favicon.svg')).read())
open(os.path.join(OUT, 'robots.txt'), 'w').write(f'User-agent: *\nAllow: /\nSitemap: {SITE}/sitemap.xml\n')
if False: open(os.path.join(OUT, 'sitemap.xml'), 'w').write(  # replaced by sitemaps/site.xml (seo_site.py)

    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    ''.join(f'  <url><loc>{SITE}{p if p != "/" else "/"}</loc></url>\n' for p, _, _ in PAGES.values()) + '</urlset>\n')
shutil.copy(os.path.join(os.path.dirname(__file__), 'site_forms.js'), os.path.join(OUT, 'js', 'forms.js'))
shutil.copy(os.path.join(os.path.dirname(__file__), 'site_vercel.json'), os.path.join(OUT, 'vercel.json'))
open(os.path.join(OUT, '404.html'), 'w').write(open(os.path.join(OUT, 'index.html')).read())
print('pages', len(PAGES), 'images', len(used))
# titles, descriptions, share tags, structured data and links into the app's record pages
import subprocess; subprocess.run([sys.executable, os.path.join(os.path.dirname(__file__), 'seo_site.py')], check=True)

# iPhone and Android apps: mark as coming soon on every page
import subprocess
subprocess.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), "app_soon.py")], check=False)


# live numbers, FAQs, cite block, quiz scoring and the About page
subprocess.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), "site_live.py")], check=False)
