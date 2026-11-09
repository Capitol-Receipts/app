/* ================= Database: fetch a record's full detail when its page opens ================= */
const DETAIL={pending:{},failed:{}};
const DKIND={people:'people',careers:'careers',appointees:'appointees',bills:'bills',pacs:'pacs',lobby_clients:'lobby_clients'};
function detailTarget(kind,id){
  if(kind==='people')return HP[id];
  if(kind==='careers')return HC[id];
  if(kind==='appointees')return HA[id];
  if(kind==='bills')return H&&H.bills[id];
  if(kind==='pacs')return H&&H.pacs&&H.pacs[id];
  if(kind==='lobby_clients')return G&&G.clients[id];
}
const isFull=(kind,id)=>{const t=detailTarget(kind,id);return !t||!!t._full};
function ensureFull(kind,id){
  const k=kind+':'+id;
  if(isFull(kind,id))return Promise.resolve(true);
  if(DETAIL.pending[k])return DETAIL.pending[k];
  const col=kind==='bills'?'key':'id';
  DETAIL.pending[k]=SB.get(`${kind}?${col}=eq.${encodeURIComponent(id)}&select=detail`).then(rows=>{
    const t=detailTarget(kind,id),d=rows[0]?.detail;
    if(t&&d){
      if(kind==='bills')Object.entries(d).forEach(([i,v])=>t[+i]=v);else Object.assign(t,d);
      if(kind==='people'||kind==='careers')prepPerson(t,kind==='careers');
      if(kind==='appointees')prepApp(t);
    }
    if(t)t._full=true;delete DETAIL.pending[k];return true;
  }).catch(e=>{console.warn(e);DETAIL.failed[k]=String(e.message||e);delete DETAIL.pending[k];return false});
  return DETAIL.pending[k];
}
/* which record a route needs in full */
function routeNeed(cur){
  if(!cur)return null;
  if(cur.startsWith('hp:')){const id=cur.slice(3);return HC[id]?['careers',id]:['people',id]}
  if(cur.startsWith('ha:'))return ['appointees',cur.slice(3)];
  if(cur.startsWith('bill:'))return ['bills',cur.slice(5)];
  if(cur.startsWith('pac:'))return ['pacs',cur.slice(4)];
  if(cur.startsWith('lob:'))return ['lobby_clients',cur.slice(4)];
  return null;
}
const _renderDB=render;
render=function(){
  const cur=S.stack.at(-1)||'';
  const need=H&&routeNeed(cur);
  if(need&&(need[0]!=='lobby_clients'||G)&&!isFull(...need)){
    const k=need.join(':');
    if(DETAIL.failed[k]){$('#app').innerHTML=`<div class="wrap" style="padding-top:calc(var(--navh,56px) + 16px)"><div class="calm">Couldn’t load this page. Check your connection and try again. <button class="link inl" data-back>Go back</button></div></div>`;delete DETAIL.failed[k];return}
    $('#app').innerHTML=`<header class="pnav scrolled" id="nav"><div class="in"><button data-back aria-label="Back">${ICONS.back}</button><span class="mid"></span><span></span></div></header><div class="wrap" style="padding-top:calc(var(--navh,56px) + 16px)"><div class="calm">Loading…</div></div>`;
    ensureFull(...need).then(()=>{if((S.stack.at(-1)||'')===cur)render()});
    return;
  }
  /* current member profile: fetch the career history in the background */
  if(H&&byId[cur]&&HC[cur]&&!HC[cur]._full)ensureFull('careers',cur).then(()=>{if((S.stack.at(-1)||'')===cur)render()});
  _renderDB();
};
