/* ================= State, district, stock and industry pages ================= */
const PL={tickInd:null};
SB.meta(['tick_ind']).then(m=>{PL.tickInd=m.tick_ind||{};render()}).catch(()=>{PL.tickInd={}});
const INDUSTRIES=['Finance & investing','Insurance','Real estate','Oil, gas & energy','Tech','Telecom & media','Hospitals & health care','Drug & medical companies','Defense & aerospace','Transportation','Farming & food','Construction','Lawyers & law firms','Education','Unions','Crypto'];
const IND_ISS={'Finance & investing':['FIN','BAN','BNK'],'Insurance':['INS'],'Real estate':['HOU','RES'],'Oil, gas & energy':['FUE','ENG','UTI'],'Tech':['CPI','SCI','TEC'],'Telecom & media':['COM','TEC','MIA'],
 'Hospitals & health care':['HCR','MMM','MED'],'Drug & medical companies':['PHA','MED','HCR'],'Defense & aerospace':['DEF','AER','HOM'],'Transportation':['TRA','AVI','AUT','RRR','TRU','MAR'],
 'Farming & food':['AGR','FOO'],'Construction':['ROD','HOU'],'Lawyers & law firms':['TOR','LAW'],'Education':['EDU'],'Unions':['LBR'],'Crypto':['FIN']};
const slugI=s=>s.toLowerCase().replace(/[^a-z]+/g,'-').replace(/-$/,'');
const indBySlug=s=>INDUSTRIES.find(i=>slugI(i)===s);
const tradeInd=t=>(PL.tickInd&&t[2]&&PL.tickInd[t[2]])?PL.tickInd[t[2]][0]:null;
const sumInd=(m,ind)=>{const r=(m.industries||[]).find(r=>r[0]===ind);return r?r[1]+(r[2]||0):0};
function plRow(m,right,sub){return `<button class="row" data-p="${m.id}" style="grid-template-columns:auto 1fr auto auto">${face(m,40)}<span style="min-width:0"><span class="t">${esc(m.name)}</span><br><span class="s">${esc(sub||partyLine(m))}</span></span><span class="val">${right||''}</span>${chev}</button>`}
/* ---------- state ---------- */
function statePage(st){
  const name=ST[st];if(!name)return `<div class="wrap"><div class="empty">State not found.</div></div>`;
  const mem=MEM.filter(m=>m.state===st).sort((a,b)=>(a.chamber===b.chamber?(+a.district||0)-(+b.district||0):a.chamber==='Senate'?-1:1));
  const sen=mem.filter(m=>m.chamber==='Senate'),hou=mem.filter(m=>m.chamber==='House');
  const raised=mem.reduce((a,m)=>a+(m.money?.rec||0),0),trades=mem.reduce((a,m)=>a+(m.tradeN||0),0);
  const ind={};mem.forEach(m=>(m.industries||[]).forEach(r=>{if(!/^(Other|Retired|Not employed|Politicians|Party)/.test(r[0]))ind[r[0]]=(ind[r[0]]||0)+r[1]+(r[2]||0)}));
  const topInd=Object.entries(ind).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const pc={};mem.forEach(m=>pc[m.party]=(pc[m.party]||0)+1);
  if(typeof loadRaces==='function')loadRaces();
  const races=typeof EL!=='undefined'&&EL.races?EL.races.filter(r=>r.st===st):null;
  const past=H&&H.people?H.people.filter(p=>p.ls===st&&!byId[p.id]).length:null;
  return `${pageHead(name)}
  <section class="phero p-N bg-capitol"><div class="in" style="padding-top:calc(var(--navh) + 18px)"><span class="billno">State delegation</span><h1>${esc(name)}</h1><div class="psub">${sen.length} senators · ${hou.length} House member${hou.length===1?'':'s'} · ${Object.entries(pc).map(([p,n])=>`${n} ${p}`).join(', ')}</div></div></section>
  <div class="wrap">
   <div class="glance">${glance('Raised for 2026',M(raised),'by the delegation',false)}${glance('Stock trades',ord(trades),'since Jan 2025',false)}${glance('On the ballot',races?races.length:'—','races Nov 3',false)}</div>
   <section class="sec"><div class="sh"><h2>Senators</h2></div><div class="group">${sen.map(m=>plRow(m,M(m.money?.rec||0))).join('')}</div></section>
   <section class="sec"><div class="sh"><h2>House members</h2></div><div class="group">${hou.map(m=>plRow(m,M(m.money?.rec||0),`${partyLine(m)}`)).join('')}</div>${hou.length>1?`<div class="cap">Tap a district number on a member's profile to see who held that seat before.</div>`:''}</section>
   ${topInd.length?`<section class="sec"><div class="sh"><h2>Who funds this delegation</h2></div><div class="group pad">${hbars(topInd,M)}</div><div class="cap">2025–26 gifts from employees of each industry and its PACs, to all of ${esc(name)}'s members combined.</div></section>`:''}
   ${races&&races.length?`<section class="sec"><div class="sh"><h2>2026 races</h2><button data-go="elections">All races</button></div><div class="group">${races.map(r=>raceRow(r)).join('')}</div></section>`:''}
   <section class="sec"><div class="group">${hou.filter(m=>!m.delegate).map(m=>`<button class="row plain" data-dist="${st}-${+m.district||0}" style="grid-template-columns:1fr auto"><span>${esc(st)}-${+m.district||'At-large'}: who has held this seat</span>${chev}</button>`).join('')}${past!=null?`<button class="row plain" data-histstate="${st}" style="grid-template-columns:1fr auto"><span>${ord(past)} former members from ${esc(name)}</span>${chev}</button>`:''}</div></section>
   <div class="note">From the congress-legislators project, FEC filings, House and Senate stock trade reports, and state election offices.</div>
  </div>`;
}
/* ---------- district ---------- */
function districtPage(key){
  const [st,dn]=key.split('-');const d=+dn;
  const cur=MEM.find(m=>m.chamber==='House'&&m.state===st&&(+m.district||0)===d);
  if(!H)return loading('district history');
  const holders=[];
  H.people.forEach(p=>(p.t||[]).forEach(t=>{if(t[0]==='H'&&t[3]===st&&(+t[4]||0)===d)holders.push([p,t[1],t[2],t[5]])}));
  holders.sort((a,b)=>b[1]-a[1]);
  const seen=new Set();const list=holders.filter(h=>{const k=h[0].id+h[1];if(seen.has(k))return false;seen.add(k);return true});
  if(typeof loadRaces==='function')loadRaces();
  const race=typeof EL!=='undefined'&&EL.byId?EL.byId[`H-${st}-${String(d).padStart(2,'0')}`]:null;
  const nm=`${ST[st]} ${d===0?'at-large':'District '+d}`;
  return `${pageHead(`${st}-${d||'AL'}`)}
  <section class="phero p-N bg-capitol"><div class="in" style="padding-top:calc(var(--navh) + 18px)"><span class="billno">U.S. House seat</span><h1>${esc(nm)}</h1><div class="psub">${list.length} people have held this seat${list.length?' since '+list.at(-1)[1]:''}</div></div></section>
  <div class="wrap">
   ${cur?`<section class="sec"><div class="sh"><h2>Represented now by</h2></div><div class="group">${plRow(cur,'',`${partyLine(cur)} · since ${cur.since}`)}</div></section>`:''}
   ${race?`<section class="sec"><div class="sh"><h2>2026 race</h2></div><div class="group">${raceRow(race)}</div></section>`:''}
   <section class="sec"><div class="sh"><h2>Everyone who has held this seat</h2></div><div class="group">${list.slice(0,S.limit||60).map(([p,a,b,party])=>{const m=byId[p.id];return `<button class="row plain" ${m?`data-p="${p.id}"`:`data-hp="${p.id}"`} style="grid-template-columns:1fr auto auto"><span style="min-width:0"><span class="t">${esc(p.n)}</span><br><span class="s">${esc(party||'')}</span></span><span class="val">${a}–${b>=2026?'now':b}</span>${chev}</button>`}).join('')||'<div class="empty">No records for this seat.</div>'}</div>${list.length>(S.limit||60)?`<button class="more" data-cmore>Show more</button>`:''}
   <div class="cap">District numbers are reused when lines are redrawn after each census, so a seat's area has changed over time.</div></section>
   <div class="note">From the congress-legislators project and Voteview.</div>
  </div>`;
}
/* ---------- stocks ---------- */
function allTrades(){const out=[];MEM.forEach(m=>(m.trades||[]).forEach(t=>{if(t[2])out.push([m,t])}));return out}
function stocksScreen(){
  const by={};allTrades().forEach(([m,t])=>{const k=t[2];(by[k]=by[k]||{n:0,mem:new Set(),name:t[3]}).n++;by[k].mem.add(m.id)});
  const q=(S.sq2||'').trim().toLowerCase();
  const list=Object.entries(by).filter(([k,v])=>!q||k.toLowerCase()===q||fz(v.name||'',q)).sort((a,b)=>b[1].mem.size-a[1].mem.size||b[1].n-a[1].n);
  return `${pageHead('Stocks')}<div class="wrap" style="padding-top:calc(var(--navh) + 10px)">
   <div class="lbanner bg-dusk pghero"><h1>Stocks Congress trades</h1><span>Every company stock that current members reported buying or selling since January 2025, ranked by how many members traded it.</span></div>
   <div class="sfield"><input id="sq2" class="search" type="search" placeholder="Search a ticker or company" value="${esc(S.sq2||'')}" aria-label="Search stocks"></div>
   <section class="sec"><div class="group">${list.slice(0,S.limit||60).map(([k,v],i)=>`<button class="row" data-stock="${esc(k)}" style="grid-template-columns:auto 1fr auto auto"><span class="rank">${i+1}</span><span style="min-width:0"><span class="t">${esc(k)}</span><br><span class="s">${esc(((PL.tickInd&&PL.tickInd[k]&&PL.tickInd[k][1])||v.name||'').slice(0,60))}</span></span><span class="val">${v.mem.size} member${v.mem.size>1?'s':''}<small> · ${v.n} trades</small></span>${chev}</button>`).join('')}</div>${list.length>(S.limit||60)?`<button class="more" data-cmore>Show more</button>`:''}</section></div>`;
}
function stockPage(tk){
  const rows=allTrades().filter(([m,t])=>t[2]===tk).sort((a,b)=>b[1][0].localeCompare(a[1][0]));
  const name=(PL.tickInd&&PL.tickInd[tk]&&PL.tickInd[tk][1])||rows[0]?.[1][3]||tk;
  const ind=PL.tickInd&&PL.tickInd[tk]?PL.tickInd[tk][0]:null;
  const mems={};rows.forEach(([m,t])=>{const x=mems[m.id]=mems[m.id]||{m,n:0,buy:0,sell:0,lo:0,hi:0,tied:false,last:''};x.n++;/Sell/.test(t[1])?x.sell++:x.buy++;x.lo+=t[4]||0;x.hi+=t[5]||0;x.tied=x.tied||!!t[7];x.last=x.last>t[0]?x.last:t[0]});
  const ms=Object.values(mems).sort((a,b)=>b.n-a.n);
  const coId=typeof CO!=='undefined'?CO.byTick[tk]:null;if(typeof loadCompanies==='function')loadCompanies();
  const buys=rows.filter(([m,t])=>!/Sell/.test(t[1])).length;
  return `${pageHead(tk)}
  <section class="phero p-N bg-capitol"><div class="in" style="padding-top:calc(var(--navh) + 18px)"><span class="billno">Stock · ${esc(tk)}</span><h1 style="font-size:${name.length>34?24:30}px">${esc(name)}</h1>${ind?`<div class="psub">${esc(ind)}</div>`:''}</div></section>
  <div class="wrap">
   <div class="glance">${glance('Members trading it',ms.length,'since Jan 2025',false)}${glance('Trades',ord(rows.length),`${buys} buys · ${rows.length-buys} sells`,false)}${glance('Tied to committees',ord(rows.filter(([m,t])=>t[7]).length),'trades',false)}</div>
   ${coId?`<section class="sec"><div class="group"><button class="row plain" data-co="${coId}" style="grid-template-columns:1fr auto"><span><span class="t">The company in Washington</span><br><span class="s">Its PAC, lobbying and federal contracts</span></span>${chev}</button></div></section>`:''}
   <section class="sec"><div class="sh"><h2>Who traded it</h2></div><div class="group">${ms.map(x=>plRow(x.m,`${x.n} trade${x.n>1?'s':''}<small> ${M(x.lo)}–${M(x.hi)}</small>`,`${partyLine(x.m)}${x.tied?' · its committee oversees this industry':''}`)).join('')||'<div class="empty">No trades reported.</div>'}</div></section>
   <section class="sec"><div class="sh"><h2>Every trade</h2></div><div class="group">${rows.slice(0,S.limit||60).map(([m,t])=>`<button class="row plain" data-p="${m.id}" style="grid-template-columns:1fr auto auto"><span style="min-width:0"><span class="t">${esc(m.name)} ${/Sell/.test(t[1])?'sold':'bought'}</span><br><span class="s">${fmtISO(t[0])}${t[6]&&t[6]!=='Self'?' · '+esc(t[6]):''}</span></span><span class="val">${M(t[4])}–${M(t[5])}</span>${chev}</button>`).join('')}</div>${rows.length>(S.limit||60)?`<button class="more" data-cmore>Show more</button>`:''}<div class="cap">Members report trades in ranges, within 45 days. "Spouse" or "Joint" means a family member's or shared account.</div></section>
   <div class="note">From House and Senate periodic transaction reports.</div>
  </div>`;
}
/* ---------- industries ---------- */
function industriesScreen(){
  return `${pageHead('Industries')}<div class="wrap" style="padding-top:calc(var(--navh) + 10px)">
   <div class="lbanner bg-capitol pghero"><h1>Industries</h1><span>Campaign money, stock trades and lobbying by industry, using the same rules for everyone.</span></div>
   <section class="sec"><div class="group">${INDUSTRIES.map(i=>{const tot=MEM.reduce((a,m)=>a+sumInd(m,i),0);return `<button class="row plain" data-ind="${slugI(i)}" style="grid-template-columns:1fr auto auto"><span class="t">${esc(i)}</span><span class="val">${M(tot)}</span>${chev}</button>`}).join('')}</div><div class="cap">Amounts are 2025–26 gifts to current members from people who work in each industry and its PACs.</div></section></div>`;
}
function industryPage(slug){
  const ind=indBySlug(slug);if(!ind)return `<div class="wrap"><div class="empty">Not found.</div></div>`;
  const rec=MEM.map(m=>[m,sumInd(m,ind)]).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]);
  const tot=rec.reduce((a,x)=>a+x[1],0);
  const sp={};rec.forEach(([m,v])=>sp[m.party]=(sp[m.party]||0)+v);const spT=Object.values(sp).reduce((a,b)=>a+b,0)||1;
  const tr=PL.tickInd?allTrades().filter(([m,t])=>tradeInd(t)===ind):[];
  const tk={};tr.forEach(([m,t])=>{tk[t[2]]=tk[t[2]]||{n:0,mem:new Set()};tk[t[2]].n++;tk[t[2]].mem.add(m.id)});
  const tops=Object.entries(tk).sort((a,b)=>b[1].n-a[1].n).slice(0,8);
  const tm={};tr.forEach(([m])=>tm[m.id]=(tm[m.id]||0)+1);const topT=Object.entries(tm).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const iss=IND_ISS[ind]||[];
  const lob=G&&G.clients?Object.entries(G.clients).filter(([k,c])=>(c.iss||[]).some(r=>iss.includes(r[0]))).sort((a,b)=>b[1].spend-a[1].spend).slice(0,10):[];
  return `${pageHead(ind)}
  <section class="phero p-N bg-capitol"><div class="in" style="padding-top:calc(var(--navh) + 18px)"><span class="billno">Industry</span><h1>${esc(ind)}</h1></div></section>
  <div class="wrap">
   <div class="glance">${glance('Given to Congress',M(tot),'2025–26',false)}${glance('Stock trades',PL.tickInd?ord(tr.length):'—','by members since 2025',false)}${glance('Members funded',ord(rec.length),'current members',false)}</div>
   <section class="sec"><div class="sh"><h2>Which party gets the money</h2></div><div class="group pad">${[['D','Democrats'],['R','Republicans'],['I','Independents']].filter(([k])=>sp[k]>0).map(([k,l])=>`<div class="mbar"><span class="mn">${l}</span><span class="mt"><span style="width:${(sp[k]/spT*100).toFixed(1)}%;background:${({D:'#2557a8',R:'#c8323a',I:'#6b6f78'})[k]}"></span></span><b>${Math.round(sp[k]/spT*100)}%</b></div>`).join('')}</div></section>
   <section class="sec"><div class="sh"><h2>Biggest recipients</h2></div><div class="group">${rec.slice(0,10).map(([m,v])=>plRow(m,M(v))).join('')}</div></section>
   ${tops.length?`<section class="sec"><div class="sh"><h2>Most-traded stocks in this industry</h2></div><div class="group">${tops.map(([k,v])=>`<button class="row plain" data-stock="${esc(k)}" style="grid-template-columns:1fr auto auto"><span style="min-width:0"><span class="t">${esc(k)}</span><br><span class="s">${esc((PL.tickInd[k]||[])[1]||'')}</span></span><span class="val">${v.n} trades<small> · ${v.mem.size} members</small></span>${chev}</button>`).join('')}</div></section>`:''}
   ${topT.length?`<section class="sec"><div class="sh"><h2>Members trading it most</h2></div><div class="group">${topT.map(([id,n])=>plRow(byId[id],`${n} trades`)).join('')}</div></section>`:''}
   ${lob.length?`<section class="sec"><div class="sh"><h2>Biggest lobbying spenders on its issues</h2></div><div class="group">${lob.map(([k,c])=>`<button class="row plain" data-lob="${k}" style="grid-template-columns:1fr auto auto"><span class="t" style="min-width:0">${esc(c.n)}</span><span class="val">${M(c.spend)}</span>${chev}</button>`).join('')}</div></section>`:''}
   <div class="note">Industries come from donors' listed employers and companies' SEC industry codes. Lobbying is matched by the issue areas groups report.</div>
  </div>`;
}
/* ---------- routing ---------- */
const PL_ROUTES=['state:','dist:','stock:','ind:'];
const _renderPl=render;
render=function(){
  const cur=S.stack.at(-1)||'';
  if(!(PL_ROUTES.some(p=>cur.startsWith(p))||cur==='stocks'||cur==='industries'))return _renderPl();
  if($('#sheet').hidden)$('#panel').className='panel';
  $('#app').innerHTML=cur==='stocks'?stocksScreen():cur==='industries'?industriesScreen():cur.startsWith('state:')?statePage(cur.slice(6)):cur.startsWith('dist:')?districtPage(cur.slice(5)):cur.startsWith('stock:')?stockPage(cur.slice(6)):industryPage(cur.slice(4));
  $('#tabbar').innerHTML=TABS2.map(([k,l,svg])=>`<button data-tab="${k}" aria-current="${k===S.tab?'page':'false'}">${svg}${l}</button>`).join('');
  const pn=document.querySelector('#app .pnav .in');
  if(pn&&!pn.querySelector('[data-menu]')){const b=document.createElement('span');b.className='pright';b.innerHTML=`<button data-menu aria-label="Menu">${MENU_ICON}</button>`;pn.appendChild(b)}
  const sq=$('#sq2');if(sq)sq.addEventListener('input',e=>{S.sq2=e.target.value;S.limit=60;const p=sq.selectionStart;render();const n=$('#sq2');n.focus();n.setSelectionRange(p,p)});
};
/* links into these pages from profiles and lists */
const _renderPl2=render;
render=function(){
  _renderPl2();
  try{
    const cur=S.stack.at(-1);const m=cur&&byId[cur];
    if(m&&!document.querySelector('#app [data-placelinks]')){
      const n=document.querySelector('#app .note');
      if(n)n.insertAdjacentHTML('beforebegin',`<section class="sec" data-placelinks><div class="group"><button class="row plain" data-state="${m.state}" style="grid-template-columns:1fr auto"><span>${esc(ST[m.state]||m.state)}'s whole delegation</span>${chev}</button>${m.chamber==='House'&&!m.delegate?`<button class="row plain" data-dist="${m.state}-${+m.district||0}" style="grid-template-columns:1fr auto"><span>Everyone who has held ${esc(m.state)}-${+m.district||'AL'}</span>${chev}</button>`:''}</div></section>`);
    }
  }catch(e){console.warn(e)}
};
window.addEventListener('click',e=>{
  const g=s=>e.target.closest(s);let el;
  if(el=g('[data-state]')){e.preventDefault();e.stopPropagation();$('#sheet').hidden=true;go('state:'+el.dataset.state);return}
  if(el=g('[data-dist]')){e.preventDefault();e.stopPropagation();$('#sheet').hidden=true;S.limit=60;go('dist:'+el.dataset.dist);return}
  if(el=g('[data-stock]')){e.preventDefault();e.stopPropagation();$('#sheet').hidden=true;S.limit=60;go('stock:'+el.dataset.stock);return}
  if(el=g('[data-ind]')){e.preventDefault();e.stopPropagation();$('#sheet').hidden=true;go('ind:'+el.dataset.ind);return}
  if(el=g('[data-histstate]')){e.preventDefault();e.stopPropagation();S.stack=[];S.tab='search';S.filter='History';S.q=ST[el.dataset.histstate];S.limit=60;render();scrollTo(0,0);return}
},true);
const _navGoPl=navGo;
navGo=function(gk){if(gk==='stocks'||gk==='industries'||gk.startsWith('state:')){closeDrawer();$('#sheet').hidden=true;S.stack=[];S.tab='search';S.limit=60;go(gk);return}_navGoPl(gk)};
const _drawerHtmlPl=drawerHtml;
drawerHtml=function(){return _drawerHtmlPl().replace(`data-go="compare"><span>Compare the parties</span></button>`,`data-go="compare"><span>Compare the parties</span></button><button class="ditem" data-go="stocks"><span>Stocks Congress trades</span></button><button class="ditem" data-go="industries"><span>Industries</span></button>`)};
/* tickers in trade lists open the stock page */
const _openSheetPl=openSheet;
openSheet=function(t,h){_openSheetPl(t,h);try{$('#panel').querySelectorAll('.vote .vt .num').forEach(el=>{const tk=el.textContent.trim();if(/^[A-Z.]{1,6}$/.test(tk)&&!el.dataset.stock){el.dataset.stock=tk;el.classList.add('tklink');el.setAttribute('role','button')}})}catch(e){}};
