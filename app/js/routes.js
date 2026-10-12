/* ================= Real page addresses =================
Every record has its own address (app.capitolreceipts.com/member/P000197/nancy-pelosi, /bill/119-hr-1/..., etc.).
The server sends that page fully rendered, so it shows instantly and search engines can read it.
1. Opening such an address: keep the server-rendered page on screen until the data that record needs has loaded,
   then open the same record in the app (no flash of the home screen).
2. Moving around the app: keep the address bar on the current record's address, so copied or shared links work. */
const ROUTE_PATH=[ // app page id prefix -> address prefix
  ['hp:','past-member'],['ha:','appointee'],['bill:','bill'],['pac:','pac'],['lob:','lobbying'],['firm:','lobbying-firm'],['com:','committee'],
  ['caucus:','caucus'],['judge:','judge'],['co:','company'],['race:','race'],['og:','outside-group'],['eth:','ethics'],['vote:','vote'],['state:','state'],['dist:','district']];
function pathFor(id){
  if(!id)return '/';
  for(const [pre,p] of ROUTE_PATH)if(id.startsWith(pre))return `/${p}/${encodeURIComponent(id.slice(pre.length))}`;
  if(typeof byId!=='undefined'&&byId[id])return `/member/${encodeURIComponent(id)}`;
  if(typeof nomById!=='undefined'&&nomById[id])return `/nominee/${encodeURIComponent(id)}`;
  return '/';
}
function pageUrl(){return location.origin+pathFor(S.stack.at(-1))}
function routeReady(r){
  if(typeof byId==='undefined'||!byId)return false;
  if(/^(hp|ha|bill|pac):/.test(r))return typeof H!=='undefined'&&!!H;
  if(/^(lob|firm|eth|com):/.test(r))return typeof G!=='undefined'&&!!G;
  if(/^n-/.test(r))return typeof nomById!=='undefined'&&!!nomById[r];
  if(/^[A-Z]\d{6}$/.test(r))return !!byId[r];
  return true;
}
(function(){
  const _renderRt=render;
  render=function(){
    _renderRt();
    if(window.__HOLD)return;
    try{const p=pathFor(S.stack.at(-1));const cur=location.pathname;
      if(!(p!=='/'&&cur.startsWith(p+'/'))&&cur!==p)history.replaceState(null,'',p+location.hash)}catch(e){}
  };
  if(window.__HOLD&&window.__ROUTE){
    const r=window.__ROUTE,t0=Date.now();
    const open=()=>{window.__HOLD=false;S.tab='search';S.stack=[r];render();scrollTo(0,0)};
    const t=setInterval(()=>{if(routeReady(r)||Date.now()-t0>25000){clearInterval(t);open()}},120);
  }else render();
})();
