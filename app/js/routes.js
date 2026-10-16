/* ================= Real page addresses =================
Every record has its own address (app.capitolreceipts.com/member/P000197/nancy-pelosi, /bill/119-hr-1/..., etc.).
The server sends that page fully rendered, so it shows instantly and search engines can read it.
1. Opening such an address: keep the server-rendered page on screen until the data that record needs has loaded,
   then open the same record in the app (no flash of the home screen).
2. Moving around the app: keep the address bar on the current record's address, so copied or shared links work. */
const ROUTE_PATH=[ // app page id prefix -> address prefix
  ['hp:','past-member'],['ha:','appointee'],['bill:','bill'],['pac:','pac'],['lob:','lobbying'],['firm:','lobbying-firm'],['com:','committee'],
  ['caucus:','caucus'],['judge:','judge'],['co:','company'],['race:','race'],['og:','outside-group'],['eth:','ethics'],['vote:','vote'],['state:','state'],['dist:','district'],['stock:','stock']];
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
    gaPageView();
    if(window.__HOLD)return;
    try{const p=pathFor(S.stack.at(-1));const cur=location.pathname;
      /* ?app=1 keeps a reload in the app; without it the address shows the public page on www */
      const want=p==='/'?'/':p;
      if(!(p!=='/'&&cur.startsWith(p+'/'))&&cur!==want)history.replaceState(null,'',want+(want==='/'?'':'?app=1')+location.hash);
      else if(want!=='/'&&!/[?&]app=1/.test(location.search))history.replaceState(null,'',location.pathname+'?app=1'+location.hash)}catch(e){}
  };
  if(window.__HOLD&&window.__ROUTE){
    const r=window.__ROUTE,t0=Date.now();
    const open=()=>{window.__HOLD=false;S.tab='search';S.stack=[r];render();scrollTo(0,0)};
    const t=setInterval(()=>{if(routeReady(r)||Date.now()-t0>25000){clearInterval(t);open()}},120);
  }else render();
})();
