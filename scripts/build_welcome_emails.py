"""Build the signup-confirmation and invite emails in supabase/templates.

Written as a short, plain note rather than a marketing layout: a few paragraphs, one button, a simple list.
Supabase fills {{ .ConfirmationURL }} and {{ .Email }} when it sends them.
Usage: python3 scripts/build_welcome_emails.py
"""
import os
T = os.path.join(os.path.dirname(__file__), '..', 'supabase', 'templates')
F = "-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif"
APP = "https://app.capitolreceipts.com"
SITE = "https://www.capitolreceipts.com"

def p(t, mt=0, color="#1f2937", size=16):
    return f'<p style="margin:{mt}px 0 16px;font:{size}px/1.6 {F};color:{color}">{t}</p>'

def button(href, label):
    return (f'<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 24px"><tr><td style="background:#0f1f40;border-radius:8px">'
            f'<a href="{href}" style="display:inline-block;padding:12px 20px;font:600 15px {F};color:#ffffff;text-decoration:none">{label}</a></td></tr></table>')

def ul(items):
    lis = ''.join(f'<li style="margin:0 0 8px">{t}</li>' for t in items)
    return f'<ul style="margin:0 0 16px;padding-left:20px;font:16px/1.6 {F};color:#1f2937">{lis}</ul>'

LIST = [
    'who gives money to each member of Congress, down to the PACs and industries',
    'the stocks they buy and sell, including trades in industries their own committees oversee',
    'how they vote, how many votes they miss, and how often they break with their party',
    'who lobbies them and on which bills',
]

def shell(title, preheader, body, foot):
    return f'''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{title}</title></head>
<body style="margin:0;padding:0;background:#ffffff">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">{preheader}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 20px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px">
<tr><td style="padding:0 0 28px"><span style="font:800 17px {F};color:#0f1f40"><span style="background:#c8323a;color:#ffffff;padding:2px 6px;border-radius:4px">Capitol</span> Receipts</span></td></tr>
<tr><td>
{body}
</td></tr>
<tr><td style="padding:24px 0 0;border-top:1px solid #e6e8ec;font:13px/1.6 {F};color:#6b7280">{foot}<br><br>
Capitol Receipts · Squared Away Labs LLC · <a href="{SITE}/privacy" style="color:#6b7280">Privacy</a> · <a href="{SITE}/terms" style="color:#6b7280">Terms</a></td></tr>
</table></td></tr></table></body></html>'''

def signup():
    body = (p('Hi,')
        + p('Thanks for creating a Capitol Receipts account. Please confirm your email address so we can save your representatives and the people you follow:')
        + button('{{ .ConfirmationURL }}', 'Confirm email address')
        + p('Capitol Receipts pulls together public records on every member of Congress so you can see, in plain English:')
        + ul(LIST)
        + p('It covers all 539 current members, and every past member back to 1789. The data comes from the FEC, House and Senate disclosures, roll-call records and lobbying filings, and it updates every morning. Everyone is measured the same way, regardless of party.')
        + p('A good place to start: put in your ZIP code to find your two senators and your House member, then follow them. Free accounts can follow up to 5 people and get a weekly email about what they did. If you want those updates daily, plus alerts on specific stocks, you can try Pro free for a week from the app.')
        + p('If you have questions or spot something wrong, email us at <a href="mailto:admin@squaredawaylabs.com" style="color:#2557a8">admin@squaredawaylabs.com</a>.')
        + p('Capitol Receipts', mt=0))
    foot = 'This link expires in 24 hours. If you didn’t create an account with {{ .Email }}, you can ignore this email.'
    return shell('Confirm your email', 'Confirm your email address to finish setting up your account.', body, foot)

def invite():
    body = (p('Hi,')
        + p('You’ve been invited to join Capitol Receipts. Accept the invitation to set a password and open your account:')
        + button('{{ .ConfirmationURL }}', 'Accept invitation')
        + p('Capitol Receipts is a free, nonpartisan app built on public records about Congress. It shows you:')
        + ul(LIST)
        + p('It covers all 539 current members, and every past member back to 1789, and it updates every morning.')
        + p('Once you’re in, put in your ZIP code to find your representatives and follow them. You’ll get a weekly email about what they did.')
        + p('If you have questions, email us at <a href="mailto:admin@squaredawaylabs.com" style="color:#2557a8">admin@squaredawaylabs.com</a>.')
        + p('Capitol Receipts', mt=0))
    foot = 'This invitation expires in 24 hours. If you weren’t expecting it, you can ignore this email.'
    return shell('You’re invited to Capitol Receipts', 'Accept your invitation to Capitol Receipts.', body, foot)

if __name__ == '__main__':
    for name, html, subj in [('confirm-signup', signup(), 'Confirm your Capitol Receipts account'),
                             ('invite', invite(), 'You’ve been invited to Capitol Receipts')]:
        open(os.path.join(T, name + '.html'), 'w').write(html)
        open(os.path.join(T, name + '.subject.txt'), 'w').write(subj + '\n')
        print('wrote', name)
