/* ================= Pages: lobbying groups, lobbying firms, ethics matters, committees ================= */
let G=null;const CLIENT_BY={},COMM_BY_SHORT={};
const normN=s=>(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
const CSTOP=new Set(['the','inc','llc','corp','corporation','co','company','lp','llp','ltd','formerly','dba']);
const ckey=n=>(n||'').toLowerCase().replace(/\([^)]*\)/g,' ').replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(w=>w&&!CSTOP.has(w)).join('');
async function loadPages(){
  try{
    const [meta,clients,firms,comm,ethics]=await Promise.all([SB.meta(['pages_leaders','pages_mc','pages_issue']),
      SB.rpc('get_light',{kind:'lobby_clients'}),SB.rpc('get_light',{kind:'lobby_firms'}),SB.rpc('get_light',{kind:'committees'}),SB.rpc('get_light',{kind:'ethics'})]);
    G={leaders:meta.pages_leaders,mc:meta.pages_mc,issue:meta.pages_issue,clients,firms,comm,ethics};
  }catch(e){console.warn(e);LOADERR.pages=String(e.message||e);render();return}
  Object.entries(G.clients).forEach(([id,c])=>{c.id=id;const k=ckey(c.n);if(!CLIENT_BY[k]||G.clients[CLIENT_BY[k]].spend<c.spend)CLIENT_BY[k]=id});
  Object.entries(G.firms).forEach(([id,f])=>f.id=id);
  Object.entries(G.comm).forEach(([id,c])=>{c.id=id;COMM_BY_SHORT[normN(c.short)]=id});
  G.ethById=Object.fromEntries(G.ethics.map(e=>[e.id,e]));
  render();
}
const clientId=name=>G&&CLIENT_BY[ckey(name)];
const lobLink=(name,cls='')=>{const id=clientId(name);return id?`<button class="link inl ${cls}" data-lob="${id}">${esc(name)}</button>`:esc(name)};
const issueName=k=>(G?.issue||{})[k]||k;
const pageHead=(short)=>`<header class="pnav scrolled" id="nav"><div class="in"><button data-back aria-label="Back">${ICONS.back}</button><span class="mid" style="opacity:1">${esc(short)}</span><button data-share aria-label="Share">${ICONS.share}</button></div></header>`;
const loading=t=>`<div class="wrap" style="padding-top:calc(var(--navh) + 16px)"><div class="calm">Loading ${t}…</div></div>`;
const personRow=(id,right)=>byId[id]?memRow(byId[id],right):HP[id]?pastRow(HP[id],right):'';
const qtrLabel=q=>q.replace(/^(\d{4}) Q(\d)$/,(_,y,n)=>`Q${n} '${y.slice(2)}`);

/* ---------- lobbying group (client) ---------- */
function clientPage(id){
  if(!G)return loading('lobbying records');const c=G.clients[id];if(!c)return `<div class="wrap"><div class="empty">Not found.</div></div>`;
  const inhouse=c.firms.find(f=>f[3]),hired=c.firms.filter(f=>!f[3]);
  const lobBills=c.bills.filter(([k])=>hasBill(k));
  return `${pageHead(c.n)}
  <section class="phero p-N bg-capitol"><div class="in" style="padding-top:calc(var(--navh) + 18px)"><span class="billno">Lobbying group</span><h1 style="font-size:${c.n.length>40?24:30}px">${esc(c.n)}</h1><div class="psub">Reported lobbying, ${esc(DATA.lobby.periods)}</div></div></section>
  <div class="wrap">
   <div class="glance">${glance('Spent',M(c.spend),'on lobbying',false)}${glance('Firms hired',hired.length,inhouse?'plus in-house staff':'outside firms',false)}${glance('Lobbyists',c.nlob,c.ex.length?`${c.ex.length} ex-Hill staff`:'registered',c.ex.length>0)}</div>
   ${c.yh?.length>1?`<div class="sec"><div class="sh"><h2>Lobbying every year since ${c.yh[0][0]}</h2></div><div class="group pad"><div class="bigline"><b>${M(c.yh.reduce((a,x)=>a+x[1],0))}</b><span>reported since ${c.yh[0][0]}</span></div><div style="margin-top:12px">${colChart(c.yh.map(([y,v])=>[`'${String(y).slice(2)}`,v]),{fmt:M,showVals:false,every:Math.max(1,Math.ceil(c.yh.length/7)),h:130})}</div></div><div class="cap">Yearly totals from every lobbying report they appear on. Reports before 2008 were filed twice a year.</div></div>`:''}
   ${c.q.length>1?`<div class="sec"><div class="sh"><h2>Spending by quarter</h2></div><div class="group pad">${colChart(c.q.map(([q,v])=>[qtrLabel(q),v]),{fmt:M,h:130})}</div></div>`:''}
   ${c.iss.length?`<div class="sec"><div class="sh"><h2>What they lobbied on</h2></div><div class="group pad">${hbars(c.iss.map(([k,v])=>[issueName(k),v]),v=>v+' report'+(v>1?'s':''))}</div><div class="cap">Issue areas named in their lobbying reports.</div></div>`:''}
   ${c.bills.length?`<div class="sec"><div class="sh"><h2>Bills they named</h2><span class="cap" style="padding:0">${c.bills.length}</span></div><div class="group">${c.bills.map(([k,n])=>hasBill(k)?billRow(k,null,`<span class="s">${n}×</span>`):`<div class="row plain" style="cursor:default;grid-template-columns:1fr auto"><span class="t">${esc(bkParse(k).label)}</span><span class="s">${n}×</span></div>`).join('')}</div><div class="cap">How many of their reports named each bill. Reports don't say whether they supported or opposed it.</div></div>`:''}
   ${c.ex.length?`<div class="sec"><div class="sh"><h2>Former congressional staff working for them</h2></div><div class="group">${c.ex.map(([mid,nm,pos])=>`<div class="item"><h3>${esc(nm)}</h3><p class="s" style="color:var(--soft);font-size:13px">Past job: ${esc(pos)}</p></div>${personRow(mid,'Former boss')}`).join('')}</div></div>`:''}
   ${c.ents.length?`<div class="sec"><div class="sh"><h2>Who they lobbied</h2></div><div class="group pad">${hbars(c.ents,v=>v+'×')}</div></div>`:''}
   <div class="sec"><div class="sh"><h2>Who they paid to lobby</h2></div><div class="group">${c.firms.map(([n,v,k,ih,fid])=>`<button class="row plain" ${fid?`data-firm="${fid}"`:''} style="grid-template-columns:1fr auto auto;${fid?'':'cursor:default'}"><span style="min-width:0"><span class="t">${esc(ih?'Their own lobbyists':n)}</span><br><span class="s">${k} report${k>1?'s':''}</span></span><span class="val" style="font-size:15px">${M(v)}</span>${fid?chev:'<span></span>'}</button>`).join('')}</div></div>
   ${c.lob.length?`<div class="sec"><div class="sh"><h2>Lobbyists</h2><span class="cap" style="padding:0">${c.nlob}</span></div><div class="group">${c.lob.map(([n,p])=>`<div class="row kv" style="grid-template-columns:1fr"><span><span class="t">${esc(n)}</span>${p?`<br><span class="s">Past government job: ${esc(p)}</span>`:''}</span></div>`).join('')}</div>${c.nlob>c.lob.length?`<div class="cap">Showing ${c.lob.length} of ${c.nlob}, people with past government jobs first.</div>`:''}</div>`:''}
   <div class="sec"><div class="sh"><h2>Original reports</h2></div><div class="group">${c.fil.map(([p,u,v,reg])=>`<a class="row plain" style="grid-template-columns:1fr auto auto" href="${esc(u)}" target="_blank" rel="noopener"><span style="min-width:0"><span class="t">${esc(p)}</span><br><span class="s">${esc(reg)}</span></span><span class="val" style="font-size:15px">${M(v)}</span>${chev}</a>`).join('')}
    <a class="row plain" style="grid-template-columns:1fr auto" href="https://lda.gov/filings/public/filing/search/?client_name=${encodeURIComponent(c.n)}" target="_blank" rel="noopener"><span>Every report on lda.gov</span>${chev}</a></div></div>
   <div class="note">From Lobbying Disclosure Act reports filed with Congress. Lobbying is legal; these reports are how it's made public.</div>
  </div>`;
}
/* ---------- lobbying firm ---------- */
function firmPage(id){
  if(!G)return loading('lobbying records');const f=G.firms[id];if(!f)return `<div class="wrap"><div class="empty">Not found.</div></div>`;
  return `${pageHead(f.n)}
  <section class="phero p-N bg-capitol"><div class="in" style="padding-top:calc(var(--navh) + 18px)"><span class="billno">Lobbying firm</span><h1 style="font-size:${f.n.length>40?24:30}px">${esc(f.n)}</h1><div class="psub">Reported income, ${esc(DATA.lobby.periods)}</div></div></section>
  <div class="wrap">
   <div class="glance">${glance('Paid',M(f.inc),'by clients',false)}${glance('Clients',f.ncl,'groups and companies',false)}${glance('Lobbyists',f.nlob,'registered',false)}</div>
   <div class="sec"><div class="sh"><h2>Biggest clients</h2></div><div class="group">${f.cl.map(([cid,n,v])=>`<button class="row plain" ${cid?`data-lob="${cid}"`:''} style="grid-template-columns:1fr auto auto;${cid?'':'cursor:default'}"><span class="t">${esc(n)}</span><span class="val" style="font-size:15px">${M(v)}</span>${cid?chev:'<span></span>'}</button>`).join('')}</div></div>
   ${f.iss.length?`<div class="sec"><div class="sh"><h2>Issues they work on</h2></div><div class="group pad">${hbars(f.iss.map(([k,v])=>[issueName(k),v]),v=>v+'×')}</div></div>`:''}
   ${f.lob.length?`<div class="sec"><div class="sh"><h2>Lobbyists</h2><span class="cap" style="padding:0">${f.nlob}</span></div><div class="group">${f.lob.map(([n,p])=>`<div class="row kv" style="grid-template-columns:1fr"><span><span class="t">${esc(n)}</span>${p?`<br><span class="s">Past government job: ${esc(p)}</span>`:''}</span></div>`).join('')}</div></div>`:''}
   <div class="sec"><div class="group"><a class="row plain" style="grid-template-columns:1fr auto" href="https://lda.gov/filings/public/filing/search/?registrant_name=${encodeURIComponent(f.n)}" target="_blank" rel="noopener"><span>Every report on lda.gov</span>${chev}</a></div></div>
   <div class="note">From Lobbying Disclosure Act reports.</div></div>`;
}
/* ---------- ethics matter ---------- */
const ETHC={'Formal investigation':'No','Reproved':'No','Contempt referral':'No','Under review':'','Referred for review':'','Report released':'','Closed':'Yes','Working group review':'','Statement issued':'off'};
function ethicsPage(id){
  if(!G)return loading('ethics records');const e=G.ethById[id];if(!e)return `<div class="wrap"><div class="empty">Not found.</div></div>`;
  const related=G.ethics.filter(x=>x.id!==e.id&&x.who.some(w=>e.who.includes(w)));
  return `${pageHead('Ethics Committee')}
  <section class="phero p-N bg-court2"><div class="in" style="padding-top:calc(var(--navh) + 18px)"><span class="billno">House Ethics Committee</span><h1 style="font-size:${e.t.length>60?22:28}px">${esc(e.t)}</h1><div class="psub">${fmtISO(e.d)}</div><div class="pchips"><span>${esc(e.st)}</span></div></div></section>
  <div class="wrap">
   ${e.who.length?`<div class="sec" style="margin-top:16px"><div class="sh"><h2>Who it's about</h2></div><div class="group">${e.who.map(w=>personRow(w)).join('')}</div></div>`:''}
   <div class="sec"><div class="sh"><h2>What the committee said</h2></div><div class="group pad"><p class="bio">${esc(e.body)}</p></div><div class="cap">The committee's own words. An investigation or review is not a finding that rules were broken.</div></div>
   <div class="sec"><div class="sh"><h2>Documents</h2></div><div class="group">${e.pdfs.map((u,i)=>`<a class="row plain" style="grid-template-columns:1fr auto" href="${esc(u)}" target="_blank" rel="noopener"><span>${esc(decodeURIComponent(u.split('/').pop()).replace(/[-_]/g,' ').replace(/\.pdf$/i,''))}</span>${chev}</a>`).join('')}
    <a class="row plain" style="grid-template-columns:1fr auto" href="${esc(e.url)}" target="_blank" rel="noopener"><span>Statement on ethics.house.gov</span>${chev}</a></div></div>
   ${related.length?`<div class="sec"><div class="sh"><h2>Other statements about them</h2></div><div class="group">${related.map(ethRow).join('')}</div></div>`:''}
   <div class="note">From public statements of the House Committee on Ethics.</div></div>`;
}
function ethRow(e){const p=e.who[0]&&(byId[e.who[0]]||HP[e.who[0]]);
  return `<button class="row" data-eth="${e.id}">${p?(byId[e.who[0]]?face(p,44):hFace(p,44)):`<span class="face fb nomf" style="width:44px;height:44px;font-size:15px">§</span>`}<span style="min-width:0"><span class="t clamp">${esc(e.t)}</span><span class="s">${fmtISO(e.d)}</span></span><span class="rr"><span class="tag ${ETHC[e.st]==='No'?'':'off'}" style="font-size:11px">${esc(e.st)}</span>${chev}</span></button>`}
/* ---------- committee ---------- */
function commPage(id){
  if(!G)return loading('committee records');const c=G.comm[id];if(!c)return `<div class="wrap"><div class="empty">Not found.</div></div>`;
  const ms=c.mem.map(r=>({m:byId[r[0]],t:r[1],side:r[2]})).filter(x=>x.m);
  const lead=ms.filter(x=>/Chair|Ranking/.test(x.t)&&!/Vice/.test(x.t));
  const maj=ms.filter(x=>x.side==='majority'),min=ms.filter(x=>x.side!=='majority');
  const pc=p=>ms.filter(x=>x.m.party===p).length;
  const raised=ms.reduce((a,x)=>a+(x.m.money?.rec||0),0);
  const ind={};ms.forEach(x=>(x.m.industries||[]).forEach(r=>{if(/^(Other or not listed|Not employed|Retired|Other business|Politicians|Party committees)/.test(r[0]))return;ind[r[0]]=(ind[r[0]]||0)+r[1]+r[2]}));
  const topInd=Object.entries(ind).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const ct=ms.reduce((a,x)=>a+(x.m.commTrades||0),0),tr=ms.reduce((a,x)=>a+(x.m.tradeN||0),0);
  const traders=ms.filter(x=>x.m.tradeN).sort((a,b)=>b.m.tradeN-a.m.tradeN).slice(0,5);
  const ch={house:'House',senate:'Senate',joint:'Joint'}[c.ch]||'';
  return `${pageHead(c.short)}
  <section class="phero p-N bg-capfull"><div class="in" style="padding-top:calc(var(--navh) + 18px)"><span class="billno">${ch} committee</span><h1 style="font-size:${c.short.length>40?24:30}px">${esc(c.short)}</h1>
   <div class="pchips"><span>${ms.length} members</span><span>${pc('R')} R · ${pc('D')} D${pc('I')?` · ${pc('I')} I`:''}</span>${c.subs.length?`<span>${c.subs.length} subcommittees</span>`:''}</div></div></section>
  <div class="wrap">
   <div class="glance">${glance('Members raised',M(raised),'for 2026 races',false)}${glance('Stock trades',ord(tr),`by members${ct?`, ${ct} tied to their committees`:''}`,ct>0)}${glance('New laws',c.nlaws,'since 2023',false)}</div>
   ${c.jur?`<div class="sec"><div class="sh"><h2>What it's in charge of</h2></div><div class="group pad"><p class="bio">${esc(c.jur)}</p></div></div>`:''}
   ${lead.length?`<div class="sec"><div class="sh"><h2>Who runs it</h2></div><div class="group">${lead.map(x=>memRow(x.m,esc(x.t))).join('')}</div></div>`:''}
   ${topInd.length?`<div class="sec"><div class="sh"><h2>Who funds its members</h2></div><div class="group pad">${hbars(topInd)}</div><div class="cap">Combined 2025–26 money to everyone on the committee, by donor industry. Useful for spotting industries giving to the people who oversee them.</div></div>`:''}
   ${traders.length?`<div class="sec"><div class="sh"><h2>Most active stock traders on it</h2></div><div class="group">${traders.map(x=>memRow(x.m,`${ord(x.m.tradeN)}${x.m.commTrades?` <small style="color:var(--flag)">${x.m.commTrades} tied</small>`:''}`)).join('')}</div><div class="cap">"Tied" means trades in industries their committees oversee.</div></div>`:''}
   ${c.laws.length?`<div class="sec"><div class="sh"><h2>Recent laws that went through it</h2></div><div class="group">${c.laws.map(k=>billRow(k)).join('')}</div></div>`:''}
   <div class="sec"><div class="sh"><h2>Majority</h2><span class="cap" style="padding:0">${maj.length}</span></div><div class="group">${maj.map(x=>memRow(x.m,x.t?esc(x.t):null)).join('')}</div></div>
   <div class="sec"><div class="sh"><h2>Minority</h2><span class="cap" style="padding:0">${min.length}</span></div><div class="group">${min.map(x=>memRow(x.m,x.t?esc(x.t):null)).join('')}</div></div>
   ${c.subs.length?`<div class="sec"><div class="sh"><h2>Subcommittees</h2></div><div class="group">${c.subs.map(([n,r])=>{const chair=r.find(x=>/^Chair/.test(x[1]));const cm=chair&&byId[chair[0]];return `<div class="row kv" style="grid-template-columns:1fr"><span><span class="t">${esc(n)}</span><br><span class="s">${r.length} members${cm?` · Chair: ${esc(cm.name)}`:''}</span></span></div>`}).join('')}</div></div>`:''}
   <div class="sec"><div class="sh"><h2>Contact</h2></div><div class="group">${c.url?`<a class="row plain" style="grid-template-columns:1fr auto" href="${esc(c.url)}" target="_blank" rel="noopener"><span>Committee website</span>${chev}</a>`:''}${c.phone?`<div class="row kv"><span class="k">Phone</span><span class="v" style="user-select:all">${esc(c.phone)}</span></div>`:''}${c.addr?`<div class="row kv"><span class="k">Office</span><span class="v">${esc(c.addr.replace(/;/g,','))}</span></div>`:''}</div></div>
   <div class="note">Membership from the official committee rosters. Money and trades are each member's own totals.</div></div>`;
}
/* ---------- list screens ---------- */
function listShell(title,inner,searchId,ph,val,bg,sub){
  return `<header class="pnav scrolled" id="nav"><div class="in"><button data-back aria-label="Back">${ICONS.back}</button><span class="mid" style="opacity:1">${esc(title)}</span><span></span></div></header>
   <div class="wrap" style="padding-top:calc(var(--navh) + 8px)"><div class="lt" style="padding-top:4px">${bg?`<div class="lbanner ${bg}"><h1>${esc(title)}</h1>${sub?`<span>${sub}</span>`:''}</div>`:`<h1>${esc(title)}</h1>`}${searchId?`<input class="search" id="${searchId}" type="search" placeholder="${ph}" value="${esc(val||'')}" autocomplete="off" aria-label="${ph}">`:''}</div>${inner}</div>`;
}
function lobbyingScreen(){
  if(!G)return loading('lobbying records');
  S.lmode=S.lmode||'groups';const q=normN(S.lq||'');
  const seg=`<div class="seg" role="group" style="margin-top:12px">${[['groups','Groups that pay'],['firms','Firms that get paid']].map(([k,l])=>`<button data-lmode="${k}" aria-pressed="${k===S.lmode}">${l}</button>`).join('')}</div>`;
  let list,rows;
  if(S.lmode==='groups'){list=Object.values(G.clients).filter(c=>!q||normN(c.n).includes(q)).sort((a,b)=>b.spend-a.spend);
    rows=list.slice(0,S.limit).map((c,i)=>`<button class="row plain" data-lob="${c.id}" style="grid-template-columns:auto 1fr auto auto"><span class="rank">${i+1}</span><span style="min-width:0"><span class="t">${esc(c.n)}</span><br><span class="s">${c.iss.slice(0,2).map(([k])=>issueName(k)).join(' · ')}</span></span><span class="val" style="font-size:15px">${M(c.spend)}</span>${chev}</button>`).join('')}
  else{list=Object.values(G.firms).filter(f=>!q||normN(f.n).includes(q)).sort((a,b)=>b.inc-a.inc);
    rows=list.slice(0,S.limit).map((f,i)=>`<button class="row plain" data-firm="${f.id}" style="grid-template-columns:auto 1fr auto auto"><span class="rank">${i+1}</span><span style="min-width:0"><span class="t">${esc(f.n)}</span><br><span class="s">${f.ncl} clients</span></span><span class="val" style="font-size:15px">${M(f.inc)}</span>${chev}</button>`).join('')}
  return listShell('Lobbying',`${seg}<div class="sec"><div class="sh"><h2>${S.lmode==='groups'?'Biggest spenders':'Biggest firms'}</h2><span class="cap" style="padding:0">${ord(list.length)}</span></div><div class="group">${rows||'<div class="empty">No matches.</div>'}</div>${list.length>S.limit?`<button class="more" data-more>Show more</button>`:''}<div class="cap">${S.lmode==='groups'?'Companies and organizations ranked by reported lobbying spending':'Lobbying firms ranked by what clients paid them'}, ${esc(DATA.lobby.periods)}. Groups spending over $750,000, plus every group named elsewhere in the app.</div></div>`,'lq','Search groups and firms',S.lq,'bg-capitol',`${ord(Object.keys(G.clients).length)} groups · ${ord(Object.keys(G.firms).length)} firms`);
}
function committeesScreen(){
  if(!G)return loading('committees');
  S.cmode=S.cmode||'house';
  const list=Object.values(G.comm).filter(c=>c.ch===S.cmode).sort((a,b)=>a.short.localeCompare(b.short));
  const seg=`<div class="seg" role="group">${[['house','House'],['senate','Senate'],['joint','Joint']].map(([k,l])=>`<button data-cmode="${k}" aria-pressed="${k===S.cmode}">${l}</button>`).join('')}</div>`;
  return listShell('Committees',`${seg}<div class="sec"><div class="group">${list.map(c=>{const ch=c.mem.find(r=>/^Chair/.test(r[1]));const cm=ch&&byId[ch[0]];return `<button class="row plain" data-com="${c.id}" style="grid-template-columns:1fr auto auto"><span style="min-width:0"><span class="t">${esc(c.short)}</span><br><span class="s">${c.mem.length} members${cm?` · Chair: ${esc(cm.name)}`:''}</span></span><span></span>${chev}</button>`}).join('')}</div><div class="cap">Committees write and review bills before the full House or Senate votes. Members often oversee the industries that fund them.</div></div>`,null,null,null,'bg-capfull',`${Object.keys(G.comm).length} House, Senate and joint committees`);
}
function ethicsScreen(){
  if(!G)return loading('ethics records');
  const q=(S.eq||'').toLowerCase();
  const list=G.ethics.filter(e=>!q||(e.t+' '+e.who.map(w=>(byId[w]||HP[w])?.name||(HP[w]||{}).n||'').join(' ')).toLowerCase().includes(q));
  return listShell('Ethics reviews',`<div class="sec"><div class="group">${list.map(ethRow).join('')||'<div class="empty">No matches.</div>'}</div><div class="cap">Every public statement from the House Committee on Ethics in our records, newest first. The Senate committee rarely publishes them. A review is not a finding of wrongdoing.</div></div>`,'eq','Search by name',S.eq,'bg-court2',`${G.ethics.length} public statements`);
}

/* ---------- wiring ---------- */
const _render2=render;
render=function(){
  const cur=S.stack.at(-1)||'';
  const map={lobbying:lobbyingScreen,committees:committeesScreen,ethics:ethicsScreen};
  let html=null;
  if(map[cur])html=map[cur]();
  else if(cur.startsWith('lob:'))html=clientPage(cur.slice(4));
  else if(cur.startsWith('firm:'))html=firmPage(cur.slice(5));
  else if(cur.startsWith('eth:'))html=ethicsPage(cur.slice(4));
  else if(cur.startsWith('com:'))html=commPage(cur.slice(4));
  if(html==null)return _render2();
  if($('#sheet').hidden)$('#panel').className='panel';
  $('#app').innerHTML=html;
  $('#tabbar').innerHTML=TABS2.map(([k,l,svg])=>`<button data-tab="${k}" aria-current="${k===S.tab?'page':'false'}">${svg}${l}</button>`).join('');
  const pn=document.querySelector('#app .pnav .in');
  if(pn&&!pn.querySelector('[data-menu]')){const last=pn.lastElementChild;const b=document.createElement('span');b.className='pright';b.innerHTML=`<button data-menu aria-label="Menu">${MENU_ICON}</button>`;if(last&&last.matches('[data-share]')){last.replaceWith(b);b.prepend(last)}else if(last&&last.tagName==='SPAN'&&!last.children.length)last.replaceWith(b);else pn.append(b)}
  ['lq','eq'].forEach(k=>{const el=$('#'+k);if(el)el.addEventListener('input',e=>{S[k]=e.target.value;S.limit=60;const p=el.selectionStart;render();const n=$('#'+k);n.focus();n.setSelectionRange(p,p)})});
};
document.addEventListener('click',e=>{
  const g=s=>e.target.closest(s);let el;
  if(el=g('[data-lob]')){e.stopImmediatePropagation();$('#sheet').hidden=true;go('lob:'+el.dataset.lob);return}
  if(el=g('[data-firm]')){e.stopImmediatePropagation();$('#sheet').hidden=true;go('firm:'+el.dataset.firm);return}
  if(el=g('[data-eth]')){e.stopImmediatePropagation();$('#sheet').hidden=true;go('eth:'+el.dataset.eth);return}
  if(el=g('[data-com]')){e.stopImmediatePropagation();$('#sheet').hidden=true;go('com:'+el.dataset.com);return}
  if(el=g('[data-lmode]')){e.stopImmediatePropagation();S.lmode=el.dataset.lmode;S.limit=60;render();return}
  if(el=g('[data-cmode]')){e.stopImmediatePropagation();S.cmode=el.dataset.cmode;render();return}
},true);
/* menu entries */
const _navGo=navGo;
navGo=function(g){
  const pages={'lobbying:groups':['lobbying','groups'],'lobbying:firms':['lobbying','firms'],'committees:house':['committees','house'],'committees:senate':['committees','senate'],'committees:joint':['committees','joint'],'ethics':['ethics']};
  if(pages[g]){closeDrawer();$('#sheet').hidden=true;const [p,mode]=pages[g];if(p==='lobbying')S.lmode=mode;if(p==='committees')S.cmode=mode;S.stack=[];S.tab='search';S.limit=60;go(p);return}
  _navGo(g);
};
const _drawerHtml=drawerHtml;
drawerHtml=function(){
  return _drawerHtml().replace(`${''}<div class="dgroup ${S.dopen.apps?'open':''}"><button class="dhead" data-dtoggle="apps"`,
   navGroup('lobby',NAVI.flag,'Lobbying',[['lobbying:groups','Biggest spenders'],['lobbying:firms','Lobbying firms'],['rank:rev','Ex-staff turned lobbyists'],['bills:lobbied','Most-lobbied bills']])+
   navGroup('comm',NAVI.cap,'Committees',[['committees:house','House committees'],['committees:senate','Senate committees'],['committees:joint','Joint committees']])+
   navGroup('ethics',NAVI.info,'Ethics',[['ethics','House Ethics reviews',G?G.ethics.length:'']])+
   `<div class="dgroup ${S.dopen.apps?'open':''}"><button class="dhead" data-dtoggle="apps"`);
};
loadPages();
