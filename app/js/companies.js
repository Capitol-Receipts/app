/* ================= Company pages: PAC, lobbying, employees' giving, stock trades by members, contracts ================= */
const CO={idx:null,loading:null,full:{},byLob:{},byPac:{},byTick:{}};
function loadCompanies(){
  if(CO.idx||CO.loading)return CO.loading;
  CO.loading=SB.all('companies?select=id,name,score,tickers,data->>lob,data->>pac&order=score.desc').then(rows=>{
    CO.idx=rows;rows.forEach(r=>{if(r.lob)CO.byLob[r.lob]=r.id;if(r.pac)CO.byPac[r.pac]=r.id;(r.tickers||[]).forEach(t=>{if(!CO.byTick[t])CO.byTick[t]=r.id})});
    render();
  }).catch(e=>{console.warn(e);CO.loading=null});
  return CO.loading;
}
function loadCompany(id){
  if(CO.full[id])return;CO.full[id]='loading';
  SB.get('companies?select=data&id=eq.'+encodeURIComponent(id)).then(r=>{CO.full[id]=r[0]?.data||'missing';render()}).catch(()=>{CO.full[id]='error';render()});
}
function companiesScreen(){
  loadCompanies();
  const q=(S.cq||'').trim().toLowerCase();
  const list=CO.idx?CO.idx.filter(c=>!q||fz(c.name,q)||(c.tickers||[]).some(t=>t.toLowerCase()===q)):[];
  const shown=list.slice(0,S.limit||60);
  return `${pageHead('Companies')}<div class="wrap" style="padding-top:calc(var(--navh) + 10px)">
   <div class="lbanner bg-old"><h1>Companies</h1><span>Everything the public record shows about a company and Congress in one place: its PAC, its lobbying, its employees' donations, who in Congress trades its stock, and its federal contracts.</span></div>
   <div class="sfield" style="margin-top:14px"><input id="cq" class="search" type="search" placeholder="Search a company or stock ticker" value="${esc(S.cq||'')}" aria-label="Search companies"></div>
   ${CO.idx?`<section class="sec"><div class="sh"><h2>${q?'Matching companies':'Most involved in Washington'}</h2><span class="cap" style="padding:0">${ord(list.length)}</span></div>
   <div class="group">${shown.map((c,i)=>`<button class="row" data-co="${c.id}" style="grid-template-columns:auto 1fr auto"><span class="rank">${i+1}</span><span style="min-width:0"><span class="t">${esc(c.name)}</span>${(c.tickers||[]).length?`<br><span class="s">${esc(c.tickers.join(' · '))}</span>`:''}</span>${chev}</button>`).join('')||'<div class="empty">No companies match.</div>'}</div>
   ${list.length>shown.length?`<button class="more" data-cmore>Show more</button>`:''}
   <div class="cap">Ranked by combined lobbying spending, PAC giving and stock trades by members of Congress.</div></section>`:'<div class="calm">Loading companies…</div>'}</div>`;
}
function companyPage(id){
  loadCompany(id);
  const c=CO.full[id];
  if(!c||c==='loading')return loading('this company');
  if(typeof c!=='object')return `<div class="wrap"><div class="empty">Company not found.</div></div>`;
  const pac=c.pac&&H&&H.pacs?H.pacs[c.pac]:null;
  const gov=c.gov&&c.gov.amt?c.gov:null;
  const traders=c.tr.length;
  const sp=c.pacSp||{},spT=(sp.D||0)+(sp.R||0)+(sp.I||0);
  const lean=spT?((sp.D||0)/spT>=.65?'mostly to Democrats':(sp.R||0)/spT>=.65?'mostly to Republicans':'to both parties'):'';
  const sentences=[
    c.lobS?`${esc(c.n)} reported spending ${M(c.lobS)} on lobbying since July 2025${c.lobN?`, using ${c.lobN} lobbyists`:''}.`:'',
    c.pacT?`Its PAC has given ${M(c.pacT)} to members of Congress since 1980, ${lean}.`:'',
    traders?`${traders} current member${traders>1?'s':''} of Congress reported ${ord(c.trN)} trade${c.trN>1?'s':''} in its stock since January 2025${c.trTied?`, ${c.trTied} by members whose committees oversee its industry`:''}.`:'',
    gov?`It received ${M(gov.amt)} in federal contracts and grants in the last two fiscal years.`:''
  ].filter(Boolean).map(x=>`<span>${x}</span>`).join(' ');
  const trRows=c.tr.slice(0,S.rlimit||12).map(([bg,n,lo,hi,last,tied])=>{const m=byId[bg];if(!m)return '';return `<button class="row" data-p="${bg}" style="grid-template-columns:auto 1fr auto auto">${face(m,40)}<span style="min-width:0"><span class="t">${esc(m.name)}</span><br><span class="s">${esc(partyLine(m))}${tied?' · <b class="dn">its committee oversees this industry</b>':''}</span></span><span class="val">${n} trade${n>1?'s':''}<small> ${M(lo)}–${M(hi)}</small></span>${chev}</button>`}).join('');
  const pacRows=(c.pacTop||[]).map(([bg,amt])=>typeof personRowPac==='function'?personRowPac(bg,M(amt)):'').join('');
  return `${pageHead(c.n)}
  <section class="phero p-N bg-capitol"><div class="in" style="padding-top:calc(var(--navh) + 18px)"><span class="billno">Company${c.ticks.length?' · '+esc(c.ticks.join(' · ')):''}</span><h1 style="font-size:${c.n.length>34?26:32}px">${esc(c.n)}</h1>${c.sic?`<div class="psub">${esc(c.sic)}</div>`:''}</div></section>
  <div class="wrap">
   <div class="glance">${glance('Lobbying',c.lobS?M(c.lobS):'—','since Jul 2025',false)}${glance('PAC giving',c.pacT?M(c.pacT):'—','to Congress since 1980',false)}${glance('Federal contracts',gov?M(gov.amt):'—','FY2025–26',false)}</div>
   ${sentences?`<section class="pe-card"><div class="pe-h">The short version</div><p>${sentences}</p></section>`:''}
   ${traders?`<section class="sec"><div class="sh"><h2>Members who trade its stock</h2><span class="cap" style="padding:0">${traders}</span></div><div class="group">${trRows}</div>${c.tr.length>(S.rlimit||12)?`<button class="more" data-rmore>Show more</button>`:''}<div class="cap">Trades reported since January 2025, as ranges. "Its committee oversees this industry" means the member sits on a committee with jurisdiction over the company's industry.</div></section>`:''}
   ${c.lobS?`<section class="sec"><div class="sh"><h2>Lobbying</h2>${c.lob?`<button data-lob="${c.lob}">Details</button>`:''}</div>
     ${c.lobIss.length?`<div class="group pad">${hbars(c.lobIss.map(([k,v])=>[issueName(k),v]),v=>v+' report'+(v>1?'s':''))}</div>`:''}
     ${c.lobBills.length?`<div class="group" style="margin-top:10px">${c.lobBills.map(([k,n])=>{const b=H&&H.bills&&H.bills[k];const p=k.split('-');return `<button class="row plain" data-billkey="${k}" style="grid-template-columns:1fr auto auto"><span style="min-width:0"><span class="t clamp">${esc(b?(b[1]||b[0]):billName(p[1]+p[2]))}</span><span class="s">${billName(p[1]+p[2])} · ${p[0]}th Congress</span></span><span class="val">${n}<small> reports</small></span>${chev}</button>`}).join('')}</div>`:''}</section>`:''}
   ${c.pacT?`<section class="sec"><div class="sh"><h2>Its PAC</h2>${c.pac?`<button data-pac="${c.pac}">Details</button>`:''}</div>
     ${spT?`<div class="group pad">${[['D','Democrats'],['R','Republicans'],['I','Independents']].filter(([k])=>sp[k]>0).map(([k,l])=>`<div class="mbar"><span class="mn">${l}</span><span class="mt"><span style="width:${(sp[k]/spT*100).toFixed(1)}%;background:${({D:'#2557a8',R:'#c8323a',I:'#6b6f78'})[k]}"></span></span><b>${Math.round(sp[k]/spT*100)}%</b></div>`).join('')}</div>`:''}
     ${pacRows?`<div class="sh" style="margin-top:14px"><h3 style="margin:0;font-size:16px">Biggest recipients, 2025–26</h3></div><div class="group">${pacRows}</div>`:''}</section>`:''}
   ${c.emp?`<section class="sec"><div class="sh"><h2>Employees' donations</h2></div><div class="group"><div class="row kv"><span class="k">Given to current members</span><span class="v">${M(c.emp[0])}</span></div><div class="row kv"><span class="k">Donations</span><span class="v">${ord(c.emp[1])}</span></div><div class="row kv"><span class="k">Members who received them</span><span class="v">${c.emp[2]}</span></div></div><div class="cap">Gifts over $200 from people who listed this company as their employer, 2025–26, where it was among a member's top employers. Employees give as individuals, not on the company's behalf.</div></section>`:''}
   ${gov?`<section class="sec"><div class="sh"><h2>Federal contracts and grants</h2><span class="cap" style="padding:0">${M(gov.amt)}</span></div>${gov.ag&&gov.ag.length?`<div class="group pad">${hbars(gov.ag.map(([n,a])=>[n,a]),M)}</div>`:''}<div class="cap">Money the federal government obligated to it from Oct 2024 to Sep 2026, by agency. From USAspending.gov.</div></section>`:''}
   ${c.rev&&c.rev.length?`<section class="sec"><div class="sh"><h2>Former government staff lobbying for it</h2><span class="cap" style="padding:0">${c.rev.length}</span></div><div class="group">${c.rev.map(([n,j])=>`<div class="row plain" style="grid-template-columns:1fr;cursor:default"><span><span class="t">${esc(n)}</span><br><span class="s">${esc(j)}</span></span></div>`).join('')}</div></section>`:''}
   <div class="note">From lobbying disclosure reports, FEC filings, House and Senate stock trade reports, and USAspending.gov. Companies are matched by name across these records.</div>
  </div>`;
}
/* ---------- routing ---------- */
const _renderCo=render;
render=function(){
  const cur=S.stack.at(-1)||'';
  if(!(cur==='companies'||cur.startsWith('co:')))return _renderCo();
  if($('#sheet').hidden)$('#panel').className='panel';
  $('#app').innerHTML=cur==='companies'?companiesScreen():companyPage(cur.slice(3));
  $('#tabbar').innerHTML=TABS2.map(([k,l,svg])=>`<button data-tab="${k}" aria-current="${k===S.tab?'page':'false'}">${svg}${l}</button>`).join('');
  const pn=document.querySelector('#app .pnav .in');
  if(pn&&!pn.querySelector('[data-menu]')){const b=document.createElement('span');b.className='pright';b.innerHTML=`<button data-menu aria-label="Menu">${MENU_ICON}</button>`;pn.appendChild(b)}
  const cq=$('#cq');if(cq)cq.addEventListener('input',e=>{S.cq=e.target.value;S.limit=60;const p=cq.selectionStart;render();const n=$('#cq');n.focus();n.setSelectionRange(p,p)});
  try{linkify($('#app'))}catch(e){}
};
/* link company pages from lobbying, PAC pages and search */
const _renderCo2=render;
render=function(){
  _renderCo2();
  try{
    const cur=S.stack.at(-1)||'';
    let cid=null;
    if(cur.startsWith('lob:'))cid=CO.byLob[cur.slice(4)];
    else if(cur.startsWith('pac:'))cid=CO.byPac[cur.slice(4)];
    if((cur.startsWith('lob:')||cur.startsWith('pac:'))&&!CO.idx)loadCompanies();
    if(cid&&!document.querySelector('#app [data-co-link]')){const w=document.querySelector('#app .wrap');const gl=w&&w.querySelector('.glance');if(gl)gl.insertAdjacentHTML('afterend',`<section class="sec" data-co-link><div class="group"><button class="row plain" data-co="${cid}" style="grid-template-columns:1fr auto"><span><span class="t">See the full company page</span><br><span class="s">Its PAC, lobbying, stock trades by members and federal contracts together</span></span>${chev}</button></div></section>`)}
    if(S.tab==='search'&&!S.stack.length&&S.q&&S.q.trim().length>=2){
      if(!CO.idx)loadCompanies();
      const q=S.q.trim().toLowerCase();
      const hits=(CO.idx||[]).filter(c=>fz(c.name,q)||(c.tickers||[]).some(t=>t.toLowerCase()===q)).slice(0,4);
      const anchor=document.querySelector('#app #r-lob');
      if(hits.length&&anchor&&!document.querySelector('#app [data-co-hits]'))anchor.insertAdjacentHTML('beforebegin',`<section class="sec rsec" data-co-hits><div class="sh"><h2>Companies</h2><button data-go="companies" data-cqset="${esc(S.q)}">See all</button></div><div class="group">${hits.map(c=>`<button class="row plain" data-co="${c.id}" style="grid-template-columns:1fr auto"><span style="min-width:0"><span class="t">${esc(c.name)}</span>${(c.tickers||[]).length?`<br><span class="s">${esc(c.tickers.join(' · '))}</span>`:''}</span>${chev}</button>`).join('')}</div></section>`);
    }
  }catch(e){console.warn(e)}
};
window.addEventListener('click',e=>{
  const g=s=>e.target.closest(s);let el;
  if(el=g('[data-co]')){e.preventDefault();e.stopPropagation();$('#sheet').hidden=true;go('co:'+el.dataset.co);return}
  if(el=g('[data-billkey]')){e.preventDefault();e.stopPropagation();go('bill:'+el.dataset.billkey);return}
  if(g('[data-cmore]')){e.preventDefault();e.stopPropagation();S.limit=(S.limit||60)+60;render();return}
  if(el=g('[data-cqset]')){S.cq=el.dataset.cqset}
},true);
const _navGoCo=navGo;
navGo=function(gk){if(gk==='companies'){closeDrawer();$('#sheet').hidden=true;S.stack=[];S.tab='search';S.limit=60;go('companies');return}_navGoCo(gk)};
const _drawerHtmlCo=drawerHtml;
drawerHtml=function(){return _drawerHtmlCo().replace(`data-go="pacs"><span>PACs</span></button>`,`data-go="pacs"><span>PACs</span></button><button class="ditem" data-go="companies"><span>Companies</span></button>`)};
