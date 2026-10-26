"""www.capitolreceipts.com/support: answers to common questions, live service status and a contact form.
The form posts to the Supabase 'support' function (same one the app uses). Status comes from public.service_status,
which the 5-minute uptime monitor keeps current. Built by site_live.py on the privacy page's design."""
import html

SB_URL = 'https://hxgckcriehvrolwnabpd.supabase.co'
SB_KEY = 'sb_publishable_jiwF5q1sFMuaGXLKg6FKAQ_3rCjcZ1J'  # public key, read-only access to public tables
APP = 'https://app.capitolreceipts.com'

A = lambda h, t: f'<a href="{h}">{t}</a>'
FAQ = [
    ('How do I cancel Pro?',
     f'If you subscribed on the website, open {A(APP + "/?go=pro", "the Pro screen")} and tap <b>Manage</b>. You keep Pro until the end of the period you paid for. '
     'If you subscribed in the iPhone app, cancel in your iPhone’s Settings › your name › Subscriptions. '
     'If you subscribed in the Android app, open Google Play › your profile › Payments &amp; subscriptions › Subscriptions.'),
    ('I paid but don’t see Pro.',
     'Make sure you’re signed in with the same email you used to pay. In the iPhone or Android app, open Account and tap <b>Restore purchases</b>. Still missing? Send us a message below and include the email on the receipt.'),
    ('Can I get a refund?',
     'For web subscriptions, send us a message below and we’ll sort it out. Purchases made in the iPhone app are refunded by Apple at '
     + A('https://reportaproblem.apple.com', 'reportaproblem.apple.com') + ', and Android purchases by Google in Google Play.'),
    ('I’m not getting alert emails.',
     'Check Account › Alert settings in the app and make sure email alerts are on. Look in your spam or promotions folder, and add alerts@capitolreceipts.com to your contacts. '
     'Free accounts get a weekly update for up to 5 people they follow. Pro sends alerts within hours of new filings.'),
    ('I can’t sign in.',
     f'On the sign-in screen at {A(APP, "app.capitolreceipts.com")}, tap <b>Forgot password</b> to get a reset link. If you signed up with Apple or Google, use the same button again; it signs you in to the same account.'),
    ('A number looks wrong.',
     'Stock trades are reported in ranges, and members can file up to 45 days after a trade, so recent trades can appear late. If something still looks wrong, send it below with a link to the page, or tap <b>Report a mistake</b> on that page in the app. '
     'We check it against the original filing and list confirmed fixes on the corrections page.'),
    ('How often is the data updated?',
     'Several times every weekday, from the House, the Senate, the Federal Election Commission and the other public sources listed on '
     + A('/how-it-works', 'How it works') + '.'),
    ('How do I delete my account?',
     'Open Account in the app and tap <b>Delete my account</b>. It happens right away. ' + A('/delete-account', 'More about deleting your account') + '.'),
]
TOPICS = [('app', 'Something isn’t working'), ('account', 'Account or sign-in'), ('billing', 'Billing and Pro'), ('alerts', 'Alerts and emails'),
          ('data', 'A mistake in the data'), ('privacy', 'Privacy or deleting data'), ('other', 'Something else')]

CSS = ('<style data-support>'
       '.sp-status{display:flex;gap:10px;align-items:center;padding:14px 16px;border:1px solid #dfe3ea;border-radius:12px;background:#fff;margin:22px 0 0;font-size:16px}'
       '.sp-dot{width:10px;height:10px;border-radius:50%;background:#9aa3b2;flex:none}.sp-dot.ok{background:#1f8a4c}.sp-dot.bad{background:#c8323a}'
       '.sp-faq details{border-top:1px solid #e6e8ec;padding:14px 0}.sp-faq details:last-child{border-bottom:1px solid #e6e8ec}'
       '.sp-faq summary{cursor:pointer;font-weight:700;font-size:18px;color:#14274e}.sp-faq p{margin:10px 0 0;color:#2a3140}'
       '.sp-form{display:grid;gap:14px;margin-top:8px}.sp-form label{display:grid;gap:6px;font-weight:600;color:#14274e}'
       '.sp-form input,.sp-form select,.sp-form textarea{font:inherit;font-size:17px;padding:12px 14px;border:1px solid #c9d1e3;border-radius:10px;background:#fff;color:#14274e;width:100%;box-sizing:border-box}'
       '.sp-form textarea{min-height:150px;resize:vertical}'
       '.sp-form button{font:inherit;font-weight:700;font-size:17px;padding:13px 22px;border:0;border-radius:999px;background:#14274e;color:#fff;cursor:pointer;justify-self:start}'
       '.sp-form button[disabled]{opacity:.6}.sp-out{min-height:1.4em;font-size:16px}.sp-out.err{color:#b0244f}.sp-out.ok{color:#1f8a4c}'
       '.sp-hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}'
       '</style>')

SCRIPT = '''<script>
(function(){
  var SB=%s,KEY=%s;
  var q=new URLSearchParams(location.search),t=q.get('topic');if(t){var s=document.getElementById('sp-topic');if(s&&s.querySelector('option[value="'+t+'"]'))s.value=t}
  fetch(SB+'/rest/v1/service_status?select=label,ok,checked_at',{headers:{apikey:KEY}}).then(function(r){return r.json()}).then(function(rows){
    var el=document.getElementById('sp-status');if(!el||!Array.isArray(rows)||!rows.length)return;
    var down=rows.filter(function(r){return !r.ok}),last=rows.map(function(r){return r.checked_at}).sort().pop();
    var mins=Math.max(1,Math.round((Date.now()-new Date(last))/60000));
    el.innerHTML='<span class="sp-dot '+(down.length?'bad':'ok')+'"></span><span>'+(down.length?'Having trouble right now: '+down.map(function(r){return r.label}).join(', ')+'. We’re on it.':'Everything is working.')+' <span style="color:#5b6475">Checked '+mins+' min ago.</span></span>';
  }).catch(function(){});
  var f=document.getElementById('sp-form');if(!f)return;
  f.addEventListener('submit',function(e){
    e.preventDefault();var out=document.getElementById('sp-out'),b=f.querySelector('button');
    var msg=f.message.value.trim(),em=f.email.value.trim();
    if(msg.length<5){out.className='sp-out err';out.textContent='Tell us a little more so we can help.';return}
    if(!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(em)){out.className='sp-out err';out.textContent='Enter an email address we can reply to.';return}
    b.disabled=true;out.className='sp-out';out.textContent='Sending…';
    fetch(SB+'/functions/v1/support',{method:'POST',headers:{'Content-Type':'application/json',apikey:KEY},body:JSON.stringify({topic:f.topic.value,name:f.name.value,email:em,message:msg,website:f.website.value,page:document.referrer.slice(0,300),platform:'website'})})
      .then(function(r){return r.json().then(function(j){return {ok:r.ok,j:j}})})
      .then(function(x){if(!x.ok||!x.j.ok)throw new Error(x.j.error||'');
        f.innerHTML='<p style="font-size:18px;margin:0"><b>Thanks, we got your message.</b> Your reference is '+(x.j.ref||'')+'. We’ll reply by email, usually within one business day.</p>';
        try{gtag('event','support_request',{topic:f.topic&&f.topic.value})}catch(_){}})
      .catch(function(err){b.disabled=false;out.className='sp-out err';out.textContent=err.message||'That didn’t go through. Try again in a moment.'});
  });
})();
</script>''' % (repr(SB_URL), repr(SB_KEY))


def support_body():
    H = lambda t: f'<h2 style="font-size:26px;margin:48px 0 12px;letter-spacing:-.01em;color:#14274e">{t}</h2>'
    faq = ''.join(f'<details><summary>{html.escape(q, quote=False)}</summary><p>{a}</p></details>' for q, a in FAQ)
    opts = ''.join(f'<option value="{k}">{l}</option>' for k, l in TOPICS)
    return ('<main style="max-width:760px;margin:0 auto;padding:64px 24px 96px">\n' + CSS +
            '<h1 class="disp" style="font-size:64px;margin:0;color:#14274e">Help &amp; support</h1>\n'
            '<p style="margin:18px 0 0;color:#2a3140;font-size:18px;line-height:1.6">Answers to common questions, and a way to reach a person. '
            'You can also email <a href="mailto:support@capitolreceipts.com">support@capitolreceipts.com</a>.</p>\n'
            '<div class="sp-status" id="sp-status" role="status"><span class="sp-dot"></span><span>Checking status…</span></div>\n'
            + H('Common questions') + f'<div class="sp-faq">{faq}</div>\n'
            + H('Send us a message') +
            '<p style="margin:0 0 12px;color:#2a3140">A person reads every message. We usually reply within one business day.</p>\n'
            '<form class="sp-form" id="sp-form" novalidate>'
            f'<label>What’s it about<select name="topic" id="sp-topic">{opts}</select></label>'
            '<label>Your name (optional)<input name="name" autocomplete="name" maxlength="120"></label>'
            '<label>Your email<input name="email" type="email" autocomplete="email" required maxlength="254"></label>'
            '<label>Message<textarea name="message" required maxlength="5000" placeholder="What happened, and what did you expect? Include a link to the page if it’s about a record."></textarea></label>'
            '<div class="sp-hp" aria-hidden="true"><label>Leave this empty<input name="website" tabindex="-1" autocomplete="off"></label></div>'
            '<div class="sp-out" id="sp-out" role="status"></div><button type="submit">Send message</button></form>\n'
            + H('Other ways to reach us') +
            '<p style="margin:0 0 12px;color:#2a3140">Corrections to the data: <a href="mailto:corrections@capitolreceipts.com">corrections@capitolreceipts.com</a>. '
            'Reporters and researchers: see <a href="/newsrooms">Newsrooms</a>. Capitol Receipts is made by Squared Away Labs LLC, Wilkes-Barre, Pennsylvania.</p>\n'
            + SCRIPT + '\n</main>\n')
