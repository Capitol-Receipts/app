"""Add an "Explore the data" link row to the footer of every marketing page (idempotent).
Points search engines and readers at the public data pages that live on www (served by api/seo.js)."""
import glob, os, re
LINKS = [('/members', 'Members of Congress'), ('/states', 'States'), ('/rankings', 'Rankings'), ('/stocks', 'Stocks in Congress'),
         ('/official-trades', 'Officials’ stock trades'), ('/reports', 'Monthly reports'), ('/guides', 'Guides'),
         ('/this-week', 'This week in Congress'), ('/elections', '2026 elections'), ('/es/members', 'En español')]
ROW = ('<div data-explore style="max-width: 1240px; margin: 24px auto 0; padding-top: 20px; border-top: 1px solid rgba(255,255,255,.12); display: flex; flex-wrap: wrap; gap: 10px 20px; font-size: 14px">'
       '<b style="color: #ffffff; margin-right: 4px">Explore the data</b>' +
       ''.join(f'<a href="{h}" style="color: #c9d1e3; text-decoration: none">{l}</a>' for h, l in LINKS) + '</div>\n')
for f in glob.glob(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'site', '*.html')):
    s = open(f).read()
    s = re.sub(r'<div data-explore[^\n]*</div>\n', '', s)
    s = s.replace('\n <div style="max-width: 1240px; margin: 24px auto 0; padding-top: 20px; border-top', '\n ' + ROW + ' <div style="max-width: 1240px; margin: 24px auto 0; padding-top: 20px; border-top', 1)
    open(f, 'w').write(s)
