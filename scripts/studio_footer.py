"""Squared Away Labs and its other apps, in the marketing site's footer.

Squared Away Labs owns Capitol Receipts and five other apps, and every product
site links to the studio and to each of the others. build_site.py calls
add_studio() on each page body, so a rebuild keeps the row; running this file
directly adds it to the pages already in site/.
"""
import glob
import os

APPS = [
    ("Kopetta", "https://kopetta.com"),
    ("Andamos", "https://andamos.app"),
    ("Hey Tribe", "https://www.heytribe.app"),
    ("Take it Back", "https://www.takeitback.app"),
    ("Ospelia", "https://www.ospelia.com"),
]

_A = 'style="color: #c9d1e3; text-decoration: none; font-weight: 700"'
_SEP = '<span aria-hidden="true"> · </span>'
ROW = (
    '\n <div style="max-width: 1240px; margin: 24px auto 0; padding-top: 20px; '
    'border-top: 1px solid rgba(255,255,255,.12); font-size: 14px; line-height: 1.7">'
    f'Made by <a href="https://www.squaredawaylabs.com" {_A}>Squared Away Labs</a>{_SEP}'
    'Also from the studio: '
    + _SEP.join(f'<a href="{h}" {_A}>{n}</a>' for n, h in APPS)
    + '</div>\n'
)


def add_studio(html: str) -> str:
    """Insert the studio row as the last thing inside the page's <footer>."""
    if "squaredawaylabs.com" in html or "</footer>" not in html:
        return html
    return html.replace("</footer>", ROW + "</footer>", 1)


if __name__ == "__main__":
    site = os.path.join(os.path.dirname(__file__), "..", "site")
    n = 0
    for f in sorted(glob.glob(os.path.join(site, "*.html"))):
        s = open(f, encoding="utf-8").read()
        t = add_studio(s)
        if t != s:
            open(f, "w", encoding="utf-8").write(t)
            n += 1
    print("pages updated:", n)
