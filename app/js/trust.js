/* ================= Freshness, corrections, mistake reports, and updates on people you follow ================= */
const TR={updated:null,corr:null};
SB.meta(['updated']).then(m=>{TR.updated=m.updated||null;render()}).catch(()=>{});
const lastRefresh=()=>TR.updated?.at?new Date(TR.updated.at):null;
const shortDate=d=>d?d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'';
/* "as of" on the numbers people read most */
function stampFreshness(){
  const a=DATA.asOf||{};
  const fec=a.fec?fmtUS(a.fec):null,votes=a.votes?fmtISO(a.votes):null,ptr=a.ptr?fmtISO(a.ptr):null;
  const label={money:fec&&`Campaign reports through ${fec}`,stocks:ptr&&`Trade reports checked ${ptr}`,votes:votes&&`Votes through ${votes}`,influence:DATA.lobby?.periods&&`Lobbying reports ${DATA.lobby.periods}`};
  document.querySelectorAll('#app .topic[data-topic]').forEach(t=>{const l=label[t.dataset.topic];if(l&&!t.querySelector('.asof3'))t.insertAdjacentHTML('beforeend',`<span class="asof3">${esc(l)}</span>`)});
  const gl=document.querySelector('#app .glance');
  if(gl&&byId[S.stack.at(-1)]&&!document.querySelector('#app .gl-asof')&&votes)gl.insertAdjacentHTML('afterend',`<div class="gl-asof">Votes through ${votes} · money through ${fec||'—'} · trades checked ${ptr||'—'}</div>`);
}
/* corrections log */
function correctionsPage(){
  if(!TR.corr){TR.corr='loading';SB.get('corrections?select=fixed_on,page,what,before,after&order=fixed_on.desc&limit=200').then(r=>{TR.corr=r;render()}).catch(()=>{TR.corr=[];render()})}
  const list=Array.isArray(TR.corr)?TR.corr:null;
  const lr=lastRefresh();
  return `${pageHead('Corrections')}<div class="wrap" style="padding-top:calc(var(--navh) + 10px)">
   <div class="lbanner bg-white pghero"><h1>Corrections</h1><span>When we get something wrong, we fix it and list it here. Every number comes from public records; mistakes usually come from how we matched or read a record.</span></div>
   <section class="sec"><div class="group">
    <div class="row kv"><span class="k">Last data refresh</span><span class="v">${lr?shortDate(lr):'—'}</span></div>
    <button class="row plain" data-report style="grid-template-columns:1fr auto"><span><span class="t">Report a mistake</span><br><span class="s">Tell us what looks wrong and where</span></span>${chev}</button>
    <button class="row plain" data-sources style="grid-template-columns:1fr auto"><span><span class="t">Where our data comes from</span></span>${chev}</button></div></section>
   <section class="sec"><div class="sh"><h2>Fixed</h2></div>
    ${list?(list.length?`<div class="group">${list.map(c=>`<div class="row plain" style="grid-template-columns:1fr;cursor:default"><span><span class="s">${fmtISO(c.fixed_on)}${c.page?' · '+esc(c.page):''}</span><br><span class="t">${esc(c.what)}</span>${c.before||c.after?`<br><span class="s">${c.before?'Was: '+esc(c.before):''}${c.before&&c.after?' · ':''}${c.after?'Now: '+esc(c.after):''}</span>`:''}</span></div>`).join('')}</div>`:'<div class="calm">No corrections yet. If you spot one, please report it.</div>'):'<div class="calm">Loading…</div>'}</section></div>`;
}
function reportSheet(){
  const where=document.querySelector('#app .pnav .mid')?.textContent||document.querySelector('#app h1')?.textContent||'';
  openSheet('Report a mistake',`<form class="authform" id="repform" novalidate>
    <p class="authwhy">Tell us what looks wrong. Include what you think it should say and, if you can, a link to the public record.</p>
    <label class="af">Page<input id="rpage" type="text" maxlength="200" value="${esc(where)}"></label>
    <label class="af">What's wrong<textarea id="rmsg" rows="5" maxlength="3000" required style="font:inherit;font-size:17px;padding:13px 14px;border-radius:12px;border:1px solid var(--hair);background:var(--surface);color:var(--ink)"></textarea></label>
    <label class="af">Your email (optional, if you'd like a reply)<input id="remail" type="email" autocomplete="email" value="${esc(ACCT?.user?.email||'')}"></label>
    <div id="rmsgout" class="amsg" role="status"></div>
    <button class="abtn" type="submit">Send report</button></form>`);
}
async function reportSubmit(){
  const msg=($('#rmsg')?.value||'').trim(),page=($('#rpage')?.value||'').trim(),email=($('#remail')?.value||'').trim(),out=$('#rmsgout');
  if(msg.length<5){out.className='amsg';out.textContent='Tell us a little more about what looks wrong.';return}
  if(email&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){out.className='amsg';out.textContent='That email address doesn’t look right.';return}
  out.className='amsg ok';out.textContent='Sending…';
  try{
    const r=await fetch(SB.url+'/rest/v1/reports',{method:'POST',headers:{apikey:SB.key,Authorization:'Bearer '+SB.key,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({page:(page+' · '+location.hash).slice(0,200),message:msg,email:email||null})});
    if(!r.ok)throw new Error(r.status);
    $('#repform').innerHTML='<p class="authwhy"><b>Thanks.</b> We read every report and list confirmed fixes on the Corrections page.</p>';
  }catch(e){out.className='amsg';out.textContent='That didn’t go through. Try again in a moment.'}
}
/* updates on people you follow (signed-in accounts) */
function followUpdates(){
  if(typeof signedIn!=='function'||!signedIn())return '';
  const fol=[...S.following].map(id=>byId[id]).filter(Boolean);
  if(!fol.length)return '';
  const since=new Date(Date.now()-30*864e5).toISOString().slice(0,10);
  const items=[];
  const al=ACCT.alerts||{trades:true,votes:true,money:true};
  fol.forEach(m=>{
    if(al.trades)(m.trades||[]).filter(t=>t[0]>=since).slice(0,3).forEach(t=>items.push([t[0],m,`${/Sell/.test(t[1])?'sold':'bought'} ${t[3]?esc(t[3].split(' - ')[0].slice(0,40)):esc(t[2]||'stock')}`,`${M(t[4])}–${M(t[5])}`]));
    if(al.votes&&m.missedM){const last=m.missedM.at(-1);if(last&&last[1]>0)items.push([DATA.asOf.votes,m,`missed ${last[1]} of ${last[2]} votes in ${new Date(last[0]+'-15').toLocaleString('en-US',{month:'long'})}`,'']) }
  });
  items.sort((a,b)=>b[0].localeCompare(a[0]));
  const rows=items.slice(0,12).map(([d,m,txt,right])=>`<button class="row" data-p="${m.id}" style="grid-template-columns:auto 1fr auto">${face(m,40)}<span style="min-width:0"><span class="t">${esc(m.last)} ${txt}</span><br><span class="s">${fmtISO(d)}</span></span><span class="val">${right}</span></button>`).join('');
  return `<section class="sec" data-updates><div class="sh"><h2>Updates on people you follow</h2><button data-alertset>Alerts</button></div>${rows?`<div class="group">${rows}</div>`:'<div class="calm">Nothing new in the last 30 days.</div>'}</section>`;
}
function alertSheet(){
  const al=ACCT.alerts||{trades:true,votes:true,money:true,email:false};
  const sw=[['trades','New stock trades by people I follow'],['votes','Missed votes by people I follow'],['money','Big new donations (over $100K)'],['email','Also email me a weekly summary']];
  openSheet('Alerts',`<div class="group">${sw.map(([k,l])=>`<label class="row plain" style="grid-template-columns:1fr auto"><span>${l}</span><input class="sw" type="checkbox" data-alert="${k}" ${al[k]?'checked':''}></label>`).join('')}</div>
   <div class="cap">Updates appear on your My Reps page. Turn on the weekly email to get a summary every week at the address you signed in with.</div>`);
}
/* the alert choices live in the account */
if(typeof acctSet==='function'){
  const _acctSet=acctSet;
  acctSet=async function(u){await _acctSet(u);if(u&&ACCT.client){try{const r=await ACCT.client.from('user_prefs').select('alerts').eq('user_id',u.id).maybeSingle();ACCT.alerts=r.data?.alerts||null;ACCT.client.from('user_prefs').update({last_seen:new Date().toISOString()}).eq('user_id',u.id).then(()=>{});render()}catch(e){}}};
}
/* ---------- wiring ---------- */
const _renderT=render;
render=function(){
  const cur=S.stack.at(-1)||'';
  if(cur==='corrections'){
    $('#app').innerHTML=correctionsPage();
    $('#tabbar').innerHTML=TABS2.map(([k,l,svg])=>`<button data-tab="${k}" aria-current="${k===S.tab?'page':'false'}">${svg}${l}</button>`).join('');
  }else _renderT();
  try{
    stampFreshness();
    if(!S.stack.length&&(S.tab==='following'||S.tab==='home')&&!document.querySelector('#app [data-updates]')){
      const h=followUpdates();
      if(h){const anchor=S.tab==='home'?document.querySelector('#app .elhome, #app .dash'):document.querySelector('#app .wrap > .sec, #app .wrap > section.sec, #app .wrap .dcols');if(anchor)anchor.insertAdjacentHTML('beforebegin',h)}
    }
    const note=document.querySelector('#app .note');
    if(note&&!note.querySelector('[data-report]'))note.insertAdjacentHTML('beforeend',` <button class="link inl" data-report>Report a mistake</button>`);
  }catch(e){console.warn(e)}
};
window.addEventListener('submit',e=>{if(e.target.id==='repform'){e.preventDefault();reportSubmit()}},true);
window.addEventListener('click',e=>{
  const g=s=>e.target.closest(s);let el;
  if(g('[data-report]')){e.preventDefault();e.stopImmediatePropagation();closeDrawer?.();reportSheet();return}
  if(g('[data-alertset]')){e.preventDefault();e.stopImmediatePropagation();alertSheet();return}
},true);
window.addEventListener('change',e=>{
  const el=e.target.closest('[data-alert]');if(!el||!ACCT.user)return;
  ACCT.alerts=Object.assign({trades:true,votes:true,money:true,email:false},ACCT.alerts||{},{[el.dataset.alert]:el.checked});
  ACCT.client.from('user_prefs').update({alerts:ACCT.alerts}).eq('user_id',ACCT.user.id).then(()=>{});render();
},true);
const _navGoT=navGo;
navGo=function(gk){if(gk==='corrections'){closeDrawer();$('#sheet').hidden=true;S.stack=[];S.tab='more';go('corrections');return}_navGoT(gk)};
const _drawerHtmlT=drawerHtml;
drawerHtml=function(){return _drawerHtmlT().replace(`data-go="sources"><span>Where the data comes from</span></button>`,`data-go="sources"><span>Where the data comes from</span></button><button class="ditem" data-go="corrections"><span>Corrections</span></button>`)};
/* sources sheet: show when everything was last refreshed */
const _sourcesSheet=sourcesSheet;
sourcesSheet=function(){_sourcesSheet();const lr=lastRefresh();if(lr){const p=$('#panel');const n=p.querySelector('.note');if(n)n.insertAdjacentHTML('beforebegin',`<div class="cap">Data refreshes automatically every morning. Last refresh: ${shortDate(lr)}.</div>`)}};
nextSheet=function(){
  openSheet('Coming next',`<div class="group">${[
   ['State lawmakers','The same profiles for state legislatures.'],
   ['Email and push alerts','Alerts by email and phone notification for people you follow.'],
   ['Senate ethics and inspector general reports','Adding these as they’re published in a consistent format.']
  ].map(([a,b])=>`<div class="item"><h3>${a}</h3><p>${b}</p></div>`).join('')}</div>`);
};
/* analytics: count each screen as a page view (Google Analytics) */
let _lastRoute=null;
const _renderGA=render;
render=function(){
  _renderGA();
  try{
    const route=(S.stack.at(-1)||S.tab||'home');
    if(route!==_lastRoute&&typeof gtag==='function'){
      _lastRoute=route;
      const title=(document.querySelector('#app .pnav .mid')?.textContent||document.querySelector('#app h1')?.textContent||route).trim().slice(0,90);
      gtag('event','page_view',{page_title:title,page_location:location.origin+'/'+encodeURIComponent(route),page_path:'/'+route});
    }
  }catch(e){}
};
