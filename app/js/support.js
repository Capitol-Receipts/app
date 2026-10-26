/* ================= Help & support (web, iPhone, Android) =================
A "Help & support" row in More / Account and a "Help" link in the menu open a short form. It goes to the 'support'
function, which saves it for the admin portal's Support tab, emails the team, and sends the person a confirmation.
Signed-in accounts send their token, so the team sees the account and plan without asking. Answers to common questions
live at www.capitolreceipts.com/support. */
const HELP_URL='https://www.capitolreceipts.com/support';
const HELP_TOPICS=[['app','Something isn’t working'],['account','Account or sign-in'],['billing','Billing and Pro'],['alerts','Alerts and emails'],['data','A mistake in the data'],['privacy','Privacy or deleting data'],['other','Something else']];
function helpSheet(topic){
  const where=document.querySelector('#app .pnav .mid')?.textContent||document.querySelector('#app h1')?.textContent||'';
  const email=(typeof ACCT!=='undefined'&&ACCT?.user?.email)||'';
  const box='font:inherit;font-size:17px;padding:13px 14px;border-radius:12px;border:1px solid var(--hair);background:var(--surface);color:var(--ink)';
  openSheet('Help & support',`<form class="authform" id="helpform" novalidate>
    <p class="authwhy">A person reads every message. We usually reply within one business day. Quick answers: <a href="${HELP_URL}" target="_blank" rel="noopener">help page</a>.</p>
    <label class="af">What’s it about<select id="htopic" style="${box}">${HELP_TOPICS.map(([k,l])=>`<option value="${k}"${k===(topic||'app')?' selected':''}>${l}</option>`).join('')}</select></label>
    <label class="af">Message<textarea id="hmsg" rows="6" maxlength="5000" required style="${box}" placeholder="What happened, and what did you expect?"></textarea></label>
    <label class="af">Your email<input id="hemail" type="email" autocomplete="email" required value="${esc(email)}"></label>
    <input type="text" id="hweb" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px">
    <input type="hidden" id="hpage" value="${esc(where)}">
    <div id="hout" class="amsg" role="status"></div>
    <button class="abtn" type="submit">Send</button></form>`);
}
async function helpSubmit(){
  const msg=($('#hmsg')?.value||'').trim(),email=($('#hemail')?.value||'').trim(),out=$('#hout'),btn=document.querySelector('#helpform button[type=submit]');
  if(msg.length<5){out.className='amsg';out.textContent='Tell us a little more so we can help.';return}
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){out.className='amsg';out.textContent='Enter an email address we can reply to.';return}
  out.className='amsg ok';out.textContent='Sending…';if(btn)btn.disabled=true;
  const headers={'Content-Type':'application/json',apikey:SB.key};
  try{const s=await ACCT?.client?.auth?.getSession();const t=s?.data?.session?.access_token;if(t)headers.Authorization='Bearer '+t}catch(e){}
  const plat=typeof PLAT!=='undefined'&&PLAT!=='web'?PLAT+' app':'web';
  try{
    const r=await fetch(SB.url+'/functions/v1/support',{method:'POST',headers,body:JSON.stringify({topic:$('#htopic').value,message:msg,email,website:$('#hweb').value,
      page:(($('#hpage').value||'')+' · '+location.pathname+location.hash).slice(0,300),platform:(plat+' · '+(navigator.userAgent.match(/(iPhone|iPad|Android|Mac|Windows|Linux)/)||['',''])[1]).slice(0,40)})});
    const j=await r.json().catch(()=>({}));
    if(!r.ok||!j.ok)throw new Error(j.error||'');
    $('#helpform').innerHTML=`<p class="authwhy"><b>Thanks, we got it.</b> Your reference is ${esc(j.ref||'')}. We’ll reply to ${esc(email)}, usually within one business day.</p>`;
    try{gtag('event','support_request',{topic:$('#htopic')?.value})}catch(e){}
  }catch(e){out.className='amsg';out.textContent=e.message||'That didn’t go through. Try again in a moment.';if(btn)btn.disabled=false}
}
const _moreHelp=more;
more=function(){
  const row=`<div class="sec"><div class="group"><button class="row plain" data-help style="grid-template-columns:1fr auto"><span><span class="t">Help & support</span><br><span class="s">Questions, billing, or something not working</span></span>${chev}</button></div></div>`;
  return _moreHelp().replace(/<\/div>\s*$/,row+'</div>');
};
const _drawerHelp=drawerHtml;
drawerHtml=function(){
  const h=_drawerHelp();
  return h.includes('data-go="corrections">Corrections</button>')?h.replace('data-go="corrections">Corrections</button>','data-go="corrections">Corrections</button><button data-help>Help</button>')
    :h.replace('<div class="dfoot">','<div class="dsec"><button class="ditem slim" data-help><span>Help & support</span></button></div><div class="dfoot">');
};
window.addEventListener('submit',e=>{if(e.target.id==='helpform'){e.preventDefault();helpSubmit()}},true);
window.addEventListener('click',e=>{
  const el=e.target.closest('[data-help]');if(!el)return;
  e.preventDefault();e.stopImmediatePropagation();try{closeDrawer?.()}catch(_){}helpSheet(el.dataset.help||'');
},true);
// links like app.capitolreceipts.com/?go=help open the form
try{const q=new URLSearchParams(location.search);if(q.get('go')==='help'){
  const u=new URL(location.href);u.searchParams.delete('go');u.searchParams.delete('topic');history.replaceState(history.state,'',u.pathname+u.search+u.hash);
  const t0=Date.now(),iv=setInterval(()=>{if((typeof byId!=='undefined'&&byId&&Object.keys(byId).length)||Date.now()-t0>15000){clearInterval(iv);helpSheet(q.get('topic')||'')}},200)}}catch(e){}
