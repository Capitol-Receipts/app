"""Build the two welcome-style account emails (confirm signup, invite) in supabase/templates.

They share one layout: a short intro, what Capitol Receipts does, real numbers, first steps and a note on Pro.
Supabase fills {{ .ConfirmationURL }} and {{ .Email }} when it sends them.
Usage: python3 scripts/build_welcome_emails.py
"""
import os
T = os.path.join(os.path.dirname(__file__), '..', 'supabase', 'templates')
F = "-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif"
APP = "https://app.capitolreceipts.com"
SITE = "https://www.capitolreceipts.com"

def button(href, label):
    return (f'<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 4px"><tr><td style="background:#c8323a;border-radius:10px">'
            f'<a href="{href}" style="display:inline-block;padding:15px 26px;font:700 16px {F};color:#ffffff;text-decoration:none">{label}</a></td></tr></table>')

def p(t, color="#1f2937", size=16, mt=0):
    return f'<p style="margin:{mt}px 0 12px;font:{size}px/1.6 {F};color:{color}">{t}</p>'

def h2(t):
    return f'<h2 style="margin:0 0 6px;font:800 19px/1.3 {F};color:#0f1f40">{t}</h2>'

FEATURES = [
    ('#0c8f62', '$', 'Who pays them', 'Every donor, PAC and industry behind each member of Congress, from FEC filings.'),
    ('#6d3fd6', '&#8599;', 'What stocks they trade', 'Every reported trade, with a flag when it’s in an industry their own committee oversees.'),
    ('#0a7896', '&#10003;', 'How they actually vote', 'Every roll-call vote back to 1789, missed votes, and how often they break with their party.'),
    ('#c26a0e', '&#9873;', 'Who lobbies them', 'Which companies and groups lobby Congress, on which bills, and how much they spend.'),
]

def features():
    rows = ''.join(
        f'<tr><td valign="top" style="padding:12px 14px 12px 0;width:40px">'
        f'<div style="width:38px;height:38px;border-radius:10px;background:{c};color:#ffffff;font:800 18px/38px {F};text-align:center">{ic}</div></td>'
        f'<td valign="top" style="padding:12px 0"><div style="font:700 16px/1.3 {F};color:#0f1f40">{t}</div>'
        f'<div style="font:14.5px/1.5 {F};color:#4b5563;margin-top:3px">{d}</div></td></tr>'
        for c, ic, t, d in FEATURES)
    return f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 4px">{rows}</table>'

STATS = [('539', 'members of Congress today'), ('12,000+', 'past members since 1789'), ('113,000+', 'roll-call votes')]

def stats():
    cells = ''.join(
        f'<td width="33%" valign="top" style="padding:16px 8px;text-align:center{";border-left:1px solid #26365c" if i else ""}">'
        f'<div style="font:800 24px/1.1 {F};color:#ffffff">{n}</div><div style="font:12.5px/1.4 {F};color:#b9c3d8;margin-top:4px">{l}</div></td>'
        for i, (n, l) in enumerate(STATS))
    return (f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 8px;background:#0f1f40;border-radius:14px">'
            f'<tr>{cells}</tr></table>'
            f'<p style="margin:0 0 4px;font:12.5px/1.5 {F};color:#6b7280;text-align:center">All from public records. Updated every morning.</p>')

def steps(items):
    rows = ''.join(
        f'<tr><td valign="top" style="padding:8px 12px 8px 0;width:28px"><div style="width:26px;height:26px;border-radius:50%;background:#eef2f9;color:#0f1f40;font:800 13px/26px {F};text-align:center">{i}</div></td>'
        f'<td valign="top" style="padding:10px 0 8px;font:15px/1.5 {F};color:#1f2937">{t}</td></tr>'
        for i, t in enumerate(items, 1))
    return f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0">{rows}</table>'

def pro_box():
    return (f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 4px;background:#f6f3ec;border-radius:14px"><tr><td style="padding:18px 20px">'
            f'<div style="font:800 11px/1 {F};letter-spacing:.08em;color:#c26a0e">&#9733; CAPITOL RECEIPTS PRO</div>'
            f'<div style="font:700 17px/1.35 {F};color:#0f1f40;margin-top:8px">Want to hear the morning a trade is filed?</div>'
            f'<div style="font:14.5px/1.55 {F};color:#4b5563;margin-top:6px">Pro sends daily alerts, watches the stocks you pick, and flags every trade tied to a member’s own committee. Try it free for 7 days, no card needed. Then $4.99 a month or $39 a year.</div>'
            f'</td></tr></table>')

def shell(title, preheader, body, foot):
    return f'''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{title}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">{preheader}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:#0f1f40;padding:18px 30px"><span style="font:800 18px {F};color:#ffffff"><span style="background:#c8323a;padding:2px 7px;border-radius:5px">Capitol</span> Receipts</span></td></tr>
<tr><td style="padding:32px 30px 8px">
{body}
</td></tr>
<tr><td style="padding:18px 30px 28px"><p style="margin:0;padding-top:16px;border-top:1px solid #e6e8ec;font:12.5px/1.55 {F};color:#6b7280">{foot}</p></td></tr>
</table>
<p style="margin:14px 0 0;font:12px/1.5 {F};color:#6b7280">Capitol Receipts is nonpartisan. Everyone is measured with the same formulas, using public records only.<br>
<a href="{APP}" style="color:#6b7280">app.capitolreceipts.com</a> · <a href="{SITE}/privacy" style="color:#6b7280">Privacy</a> · <a href="{SITE}/terms" style="color:#6b7280">Terms</a><br>Squared Away Labs LLC</p>
</td></tr></table></body></html>'''

KICK = lambda t: f'<div style="font:800 12px/1 {F};letter-spacing:.08em;color:#c8323a;margin-bottom:10px">{t}</div>'
H1 = lambda t: f'<h1 style="margin:0 0 12px;font:800 28px/1.2 {F};color:#0f1f40">{t}</h1>'

def signup():
    body = (KICK('WELCOME') + H1('You’re one click from seeing what Congress doesn’t put on the brochure.')
        + p('Thanks for signing up for Capitol Receipts. We turn public records about Congress into plain English: who funds each member, what stocks they trade, how they vote and who lobbies them. No spin, no party line. Just the receipts.')
        + p('Confirm your email to finish setting up your account.', mt=4)
        + button('{{ .ConfirmationURL }}', 'Confirm my email')
        + p('The link works for 24 hours.', color='#6b7280', size=13.5, mt=8)
        + '<div style="height:18px"></div>' + h2('What you can look up')
        + features() + stats()
        + '<div style="height:18px"></div>' + h2('Your first five minutes')
        + steps(['Confirm your email with the button above.',
                 'Enter your ZIP code to find your two senators and your House member.',
                 'Tap <b>Follow</b> on up to 5 people. We’ll email you a weekly summary of what they did.',
                 'Open a profile and check the <b>Stocks</b> tab. You may be surprised.'])
        + pro_box())
    foot = ('You’re getting this because someone created a Capitol Receipts account with {{ .Email }}. '
            'If that wasn’t you, ignore this email and no account will be created. Questions? Just reply.')
    return shell('Welcome to Capitol Receipts', 'Confirm your email to finish setting up. Here’s what you can do with your account.', body, foot)

def invite():
    body = (KICK('YOU’RE INVITED') + H1('Someone thinks you should see the receipts.')
        + p('You’ve been invited to Capitol Receipts, a free, nonpartisan app that turns public records about Congress into plain English: who funds each member, what stocks they trade, how they vote and who lobbies them.')
        + p('Accept the invitation to set your password and open your account.', mt=4)
        + button('{{ .ConfirmationURL }}', 'Accept invitation')
        + p('The invitation link works for 24 hours.', color='#6b7280', size=13.5, mt=8)
        + '<div style="height:18px"></div>' + h2('What’s inside')
        + features() + stats()
        + '<div style="height:18px"></div>' + h2('Getting started')
        + steps(['Accept the invitation and choose a password.',
                 'Enter your ZIP code to find your two senators and your House member.',
                 'Tap <b>Follow</b> on up to 5 people and get a weekly summary by email.'])
        + pro_box())
    foot = 'If you weren’t expecting this invitation, you can ignore this email and no account will be created. Questions? Just reply.'
    return shell('You’re invited to Capitol Receipts', 'A free, nonpartisan look at who funds Congress, what they trade and how they vote.', body, foot)

if __name__ == '__main__':
    for name, html, subj in [('confirm-signup', signup(), 'Welcome to Capitol Receipts: confirm your email'),
                             ('invite', invite(), 'You’re invited to Capitol Receipts')]:
        open(os.path.join(T, name + '.html'), 'w').write(html)
        open(os.path.join(T, name + '.subject.txt'), 'w').write(subj + '\n')
        print('wrote', name)
