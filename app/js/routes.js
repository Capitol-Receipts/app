/* ================= Real page addresses =================
Every record has its own address (app.capitolreceipts.com/member/P000197/nancy-pelosi, /bill/119-hr-1/..., etc.).
The server sends that page fully rendered, so it shows instantly and search engines can read it.
1. Opening such an address: keep the server-rendered page on screen until the data that record needs has loaded,
   then open the same record in the app (no flash of the home screen).
2. Moving around the app: keep the address bar on the current record's address, so copied or shared links work. */
const ROUTE_PATH=[ // app page id prefix -> address prefix
  ['hp:','past-member'],['ha:','appointee'],['bill:','bill'],['pac:','pac'],['lob:','lobbying'],['firm:','lobbying-firm'],['com:','committee'],
  ['caucus:','caucus'],['judge:','judge'],['co:','company'],['race:','race'],['og:','outside-group'],['eth:','ethics'],['vote:','vote'],['state:','state'],['dist:','district'],['stock:','stock'],['xtr:','official-trades']];
function pathFor(id){
  if(!id)return '/';
  for(const [pre,p] of ROUTE_PATH)if(id.startsWith(pre))return `/${p}/${encodeURIComponent(id.slice(pre.length))}`;
  if(typeof byId!=='undefined'&&byId[id])return `/member/${encodeURIComponent(id)}`;
  if(typeof nomById!=='undefined'&&nomById[id])return `/nominee/${encodeURIComponent(id)}`;
  return '/';
}
/* public address of the current record, for sharing: the search-friendly page on www */
function pageUrl(){const p=pathFor(S.stack.at(-1));return 'https://www.capitolreceipts.com'+p}
function routeReady(r){
  if(typeof byId==='undefined'||!byId)return false;
  if(/^(hp|ha|bill|pac):/.test(r))return typeof H!=='undefined'&&!!H;
  if(/^(lob|firm|eth|com):/.test(r))return typeof G!=='undefined'&&!!G;
  if(/^n-/.test(r))return typeof nomById!=='undefined'&&!!nomById[r];
  if(/^[A-Z]\d{6}$/.test(r))return !!byId[r];
  return true;
}
/* analytics: count each screen as a page view (Google Analytics). Runs after every other render wrapper,
   so screens drawn by later modules (Pro, radar, elections…) are counted too. */
let _lastRoute=null;
function gaPageView(){
  try{
    const route=(S.stack.at(-1)||S.tab||'home');
    if(route!==_lastRoute&&typeof gtag==='function'){
      _lastRoute=route;
      const title=(document.querySelector('#app .pnav .mid')?.textContent||document.querySelector('#app h1')?.textContent||route).trim().slice(0,90);
      gtag('event','page_view',{page_title:title,page_location:location.origin+'/'+encodeURIComponent(route),page_path:'/'+route});
      if(route==='pro'&&typeof PRO!=='undefined')gtag('event','view_item',{currency:'USD',value:PRO.price.y,items:[{item_id:'pro_yearly',item_name:'Capitol Receipts Pro',price:PRO.price.y}]});
    }
  }catch(e){}
}
let _popRt=false;const _hk=[];
addEventListener('popstate',e=>{const st=e.state;if(!st||!st.cr)return;
  _popRt=true;const sh=document.getElementById('sheet');if(sh)sh.hidden=true;
  S.tab=st.tab;S.stack=[...(st.stack||[])];if(st.msort)S.msort=st.msort;render();scrollTo(0,0)});
(function(){
  try{if(new URLSearchParams(location.search).get('lang')==='es'&&S.lang!=='es'){S.lang='es';store.set('lang','es')}}catch(e){}
  const _renderRt=render;
  render=function(){
    const cur=S.stack.at(-1);
    if(!window.__FULL&&!window.__FULLERR&&cur&&typeof byId!=='undefined'&&byId[cur]){
      $('#app').innerHTML='<div class="wrap"><div class="empty" style="padding-top:calc(var(--navh) + 24px)">Loading…</div></div>';
      return;
    }
    _renderRt();
    deadRows(document.getElementById('app'));
    /* a share button on every screen that has a top bar */
    try{const pn=document.querySelector('#app .pnav .in');if(pn&&!pn.querySelector('[data-share]')){const b=document.createElement('button');b.setAttribute('data-share','');b.setAttribute('aria-label','Share');b.innerHTML=ICONS.share;const r=pn.querySelector('.pright');if(r)r.prepend(b);else pn.append(b)}}catch(e){}
    gaPageView();
    if(window.__HOLD)return;
    try{const p=pathFor(S.stack.at(-1));const cur=location.pathname;
      /* ?app=1 keeps a reload in the app; without it the address shows the public page on www */
      const want=p==='/'?'/':p;
      /* screens without a record address (lists, tools) get /go/<screen>, so the address bar and copied links reopen them */
      const sid=S.stack.at(-1);let tgt=null;
      if(p==='/'){const t=sid?'/go/'+encodeURIComponent(sid).replace(/%3A/g,':'):(S.tab==='search'&&typeof RK!=='undefined'&&RK[S.msort]&&S.filter==='Congress'?'/go/rank:'+S.msort:'/');if(location.pathname+location.search!==t)tgt=t}
      else if(!cur.startsWith(p+'/')&&cur!==want)tgt=want+'?app=1';
      else if(!/[?&]app=1/.test(location.search))tgt=location.pathname+'?app=1';
      /* each new screen gets its own browser history entry, so Back (browser, phone, swipe) goes to the previous screen */
      const k=S.tab+'|'+S.stack.join('>')+'|'+(S.msort||''),st={cr:1,k,tab:S.tab,stack:[...S.stack],msort:S.msort||null};
      const url=(tgt||location.pathname+location.search)+location.hash;
      const hs=history.state,i=hs&&hs.cr?hs.i||0:0;
      if(!_popRt&&hs&&hs.cr&&hs.k!==k){
        /* going back to the screen just before this one (the in-app back arrow): step back in history instead of adding */
        if(i>0&&_hk[i-1]===k){_popRt=true;history.back();return}
        st.i=i+1;_hk.length=st.i;_hk[st.i]=k;history.pushState(st,'',url);
      }else{st.i=i;_hk[i]=k;history.replaceState(st,'',url)}
      _popRt=false}catch(e){}
  };
  if(window.__HOLD&&window.__ROUTE){
    const r=window.__ROUTE,t0=Date.now();
    const open=()=>{window.__HOLD=false;S.tab='search';S.stack=[r];render();scrollTo(0,0)};
    const t=setInterval(()=>{if(routeReady(r)||Date.now()-t0>25000){clearInterval(t);open()}},120);
  }else render();
})();

/* ================= Sharing =================
Every screen shares its own link. Records and lists that have a public page on www share that page (it has its own
title, description and preview image); anything else shares an app link that reopens the same screen. */
const SHARE_HUB={stocks:'/stocks',pacs:'/pacs',companies:'/companies',judges:'/judges',caucuses:'/caucuses',elections:'/elections',
  ogroups:'/outside-groups',ethics:'/ethics',bills:'/bills',perf:'/rankings/stock-picks',xtr:'/official-trades',pro:'/pricing',committees:'/committees',lobbying:'/lobbying'};
const RK={breaks:'breaks-with-party',comm:'committee-tied-trades',missed:'most-missed-votes',pac:'pac-funded',raised:'top-fundraisers',rev:'former-staff-lobbying',small:'small-donors',trades:'most-stock-trades'};
function shareUrl(){
  const W='https://www.capitolreceipts.com',id=S.stack.at(-1);
  if(!id){
    if(S.tab==='leaders')return W+'/rankings';
    if(S.tab==='search'&&RK[S.msort])return W+'/rankings/'+RK[S.msort]; /* a ranking (the member list sorted by one measure) */
    return W+'/';
  }
  const p=pathFor(id);if(p!=='/')return W+p;
  let m;
  if(SHARE_HUB[id])return W+SHARE_HUB[id];
  if((m=/^mvotes:(.+)$/.exec(id))&&typeof byId!=='undefined'&&byId[m[1]])return W+pathFor(m[1]);
  if(/^party:/.test(id))return W+'/parties';
  if((m=/^rank:(\w+)/.exec(id))&&RK[m[1]])return W+'/rankings/'+RK[m[1]];
  if((m=/^(bills|committees|lobbying):/.exec(id))&&SHARE_HUB[m[1]])return W+SHARE_HUB[m[1]];
  return 'https://app.capitolreceipts.com/go/'+encodeURIComponent(id).replace(/%3A/g,':');
}
function shareTitle(){
  const t=(document.querySelector('#app .pnav .mid')?.textContent||document.querySelector('#app h1')?.textContent||'').trim();
  return t?t+' · Capitol Receipts':'Capitol Receipts';
}
function copyText(t,ok){
  const done=()=>toast(ok||'Link copied');
  try{navigator.clipboard.writeText(t).then(done,()=>{prompt('Copy this link:',t)})}catch(e){prompt('Copy this link:',t)}
}
function shareLink(){
  const url=shareUrl(),title=shareTitle();
  try{if(typeof gtag==='function')gtag('event','share',{method:navigator.share?'native':'copy',content_type:(S.stack.at(-1)||S.tab||'home').split(':')[0],item_id:url})}catch(e){}
  if(navigator.share){navigator.share({title,url}).catch(()=>{});return}
  copyText(url);
}
const _shareCard=shareSheet;
shareSheet=function(){
  const id=S.stack.at(-1);
  const card=id&&((typeof byId!=='undefined'&&byId[id])||(typeof nomById!=='undefined'&&nomById[id]));
  if(!card){shareLink();return}
  _shareCard();
  const url=shareUrl(),cap=$('#capline');
  if(cap&&!cap.textContent.includes(url))cap.textContent=cap.textContent+' '+url;
  const c=$('#copy');
  if(c)c.insertAdjacentHTML('beforebegin',`<button class="btn" id="sharelink">${navigator.share?'Share link':'Copy link'}</button><div class="note" style="word-break:break-all">${esc(url)}</div>`);
};
document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('#sharelink')){e.preventDefault();$('#sheet').hidden=true;shareLink()}});

/* rows drawn as buttons that lead nowhere (no record to open) become plain rows, so nothing looks tappable that isn't */
function deadRows(root){
  if(!root)return;
  root.querySelectorAll('button.row,button.lcard,button.lbcard').forEach(b=>{
    if(b.id||b.type==='submit'||[...b.attributes].some(a=>a.name.startsWith('data-')||a.name==='onclick'||a.name.startsWith('aria-expanded')))return;
    const d=document.createElement('div');for(const a of b.attributes)d.setAttribute(a.name,a.value);
    d.innerHTML=b.innerHTML;d.style.cursor='default';const c=d.querySelector(':scope > svg.chev');if(c)c.replaceWith(document.createElement('span'));
    b.replaceWith(d);
  });
}
try{const sh=document.getElementById('sheet');if(sh)new MutationObserver(()=>{if(!sh.hidden)deadRows(sh)}).observe(sh,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']})}catch(e){}
