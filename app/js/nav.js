/* ================= Slide-out navigation + bills browser ================= */
const MENU_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
const NAVI={
 home:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 10.5 12 4l8 6.5V20h-5v-6H9v6H4z"/></svg>',
 search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4-4"/></svg>',
 cap:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3l9 4H3z"/><path d="M5 9v8M9.5 9v8M14.5 9v8M19 9v8M3 20h18"/></svg>',
 star:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z"/></svg>',
 flag:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>',
 chart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
 doc:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/></svg>',
 badge:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M5 21c1-4 4-6 7-6s6 2 7 6"/></svg>',
 clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/></svg>',
 info:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 11v6M12 7.5v.5"/></svg>',
 pin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6h11M9 12h11M9 18h11M4 6h.5M4 12h.5M4 18h.5"/></svg>'
};
S.dopen=store.get('dopen',{congress:true});
function navGroup(id,icon,label,items){
  const open=!!S.dopen[id];
  return `<div class="dgroup ${open?'open':''}"><button class="dhead" data-dtoggle="${id}" aria-expanded="${open}">${icon}<span>${label}</span><svg class="dchev" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 4.5 6 7.5 9 4.5"/></svg></button>
   <div class="ditems">${items.map(([go,l,sub])=>`<button class="ditem" data-go="${go}"><span>${l}</span>${sub?`<em>${sub}</em>`:''}</button>`).join('')}</div></div>`;
}
function pageIndex(){
  const hs=[...document.querySelectorAll('#app .sec .sh h2')].filter(h=>h.textContent.trim());
  if(hs.length<3)return '';
  return `<div class="dsec"><div class="dlabel">On this page</div>${hs.map((h,i)=>{h.id=h.id||'sec'+i;return `<button class="ditem slim" data-jump="${h.id}"><span>${esc(h.textContent)}</span></button>`}).join('')}</div>`;
}
function drawerHtml(){
  const cur=S.stack.at(-1);
  const mine=S.home?MEM.filter(m=>m.state===S.home):[];
  return `<div class="dtop"><div class="logo"><span>Capitol</span>Receipts</div><button class="dclose" data-dclose aria-label="Close menu"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div><div class="langseg" role="group" aria-label="Language"><button data-lang="en" aria-pressed="${S.lang!=='es'}">English</button><button data-lang="es" aria-pressed="${S.lang==='es'}">Español</button></div>
   <button class="dsearch" data-go="search">${NAVI.search}<span>Search people, bills, votes</span></button>
   <div class="dsec">
    <button class="ditem big" data-go="home">${NAVI.home}<span>Home</span></button>
    <button class="ditem big" data-go="following">${NAVI.star}<span>My reps & following</span>${mine.length?`<em>${ST[S.home]}</em>`:''}</button>
   </div>
   ${cur?pageIndex():''}
   ${navGroup('congress',NAVI.cap,'Congress today',[['f:Congress','Everyone in Congress','539'],['f:Senate','Senators'],['f:House','House members'],['party:D','Democrats'],['party:R','Republicans'],['party:I','Independents'],['compare','Compare the parties']])}
   ${navGroup('rank',NAVI.chart,'Rankings',[['rank:trades','Most stock trades'],['rank:comm','Trades tied to their committees'],['rank:missed','Most votes missed'],['rank:breaks','Breaks with party most'],['rank:raised','Biggest fundraisers'],['rank:small','Most small-donor money'],['rank:pac','Most PAC money'],['rank:rev','Most ex-staff lobbying']])}
   ${navGroup('bills',NAVI.doc,'Bills & laws',[['bills:lobbied','Most-lobbied bills'],['bills:new','New laws this Congress'],['bills:laws','Every law since 1947'],['bills:veto','Vetoed bills'],['bills:search','Find a bill']])}
   ${navGroup('apps',NAVI.badge,'Appointees',[['ncat:All','Everyone confirmed since 2025'],['ncat:Cabinet','Cabinet'],['ncat:Agency leaders','Agency leaders'],['ncat:Judges','Judges'],['ncat:Ambassadors','Ambassadors'],['ncat:Prosecutors & marshals','Prosecutors & marshals']])}
   ${navGroup('hist',NAVI.clock,'History',[['hist:members','Past members of Congress',H?ord(PASTS.length):''],['hist:apps','Past appointees',H?ord(APPS.length):''],['hist:exec','Presidents & vice presidents'],['hist:archive','From the archives']])}
   ${navGroup('about',NAVI.info,'About',[['how','How we measure'],['sources','Where the data comes from'],['more','Account & settings']])}
   <div class="dfoot">Nonpartisan. Built on public records.</div>`;
}
function openDrawer(){const d=$('#drawer');const pn=d.querySelector('.dpanel');pn.innerHTML=drawerHtml();d.hidden=false;pn.scrollTop=0;requestAnimationFrame(()=>d.classList.add('in'));document.body.style.overflow='hidden'}
function closeDrawer(){const d=$('#drawer');if(d.hidden)return;d.classList.remove('in');document.body.style.overflow='';setTimeout(()=>{d.hidden=true},220)}
function navGo(g){
  closeDrawer();$('#sheet').hidden=true;
  const [k,v]=g.includes(':')?[g.slice(0,g.indexOf(':')),g.slice(g.indexOf(':')+1)]:[g,null];
  const toSearch=()=>{S.stack=[];S.tab='search';S.q='';S.limit=60};
  if(['home','search','following','more'].includes(k)){S.stack=[];S.tab=k;S.limit=60;if(k==='search')S.focusSearch=true}
  else if(k==='f'){toSearch();S.filter=v;S.party='All';S.msort='name';S.mdir=null}
  else if(k==='party'){S.stack=[];S.tab='search';go('party:'+v);return}
  else if(k==='compare'){S.stack=[];S.tab='search';go('compare');return}
  else if(k==='rank'){toSearch();S.filter='Congress';S.party='All';S.msort=v;S.mdir=null}
  else if(k==='ncat'){toSearch();S.filter='Appointees';S.ncat=v}
  else if(k==='hist'){toSearch();S.filter='History';S.hk=v==='archive'?'members':v}
  else if(k==='bills'){S.stack=[];S.tab='search';S.bmode=v==='search'?'laws':v;S.bq='';S.limit=60;go('bills');if(v==='search')setTimeout(()=>$('#bq')?.focus(),50);return}
  else if(k==='how'){howSheet();return}
  else if(k==='sources'){sourcesSheet();return}
  else if(k==='leaders'){S.stack=[];S.tab='leaders';S.lmode2=v||'wh'}
  render();scrollTo(0,0);
}

/* ---------- bills browser ---------- */
function billsScreen(){
  if(!H)return `<div class="wrap"><div class="lt"><h1>Bills & laws</h1></div><div class="calm">Loading bill records…</div></div>`;
  S.bmode=S.bmode||'lobbied';
  const q=(S.bq||'').trim().toLowerCase();
  const modes=[['lobbied','Most lobbied'],['new','New laws'],['laws','All laws'],['veto','Vetoed']];
  const K=Object.keys(H.bills);
  const lawDate=k=>H.bills[k][10].L||'';
  let list=[],cap='',right=null;
  if(S.bmode==='lobbied'){
    const rows=Object.entries(DATA.bills).sort((a,b)=>b[1].n-a[1].n);
    list=rows.map(([b,x])=>({k:key119(b),b,n:x.n})).filter(x=>!q||(hasBill(x.k)?billTitle(x.k).toLowerCase().includes(q):x.b.toLowerCase().includes(q)));
    cap=`Bills named in the most lobbying reports, ${esc(DATA.lobby?.periods||'')}.`;
  }else if(S.bmode==='new'){
    list=K.filter(k=>k.startsWith('119-')&&H.bills[k][10].L).sort((a,b)=>lawDate(b).localeCompare(lawDate(a))).map(k=>({k}));cap='Bills signed into law in the current Congress, newest first.';
  }else if(S.bmode==='laws'){
    S.bcong=S.bcong||119;
    list=K.filter(k=>H.bills[k][10].L&&(S.bcong==='All'||bkParse(k).c===+S.bcong)).sort((a,b)=>lawDate(b).localeCompare(lawDate(a))).map(k=>({k}));cap='Every bill and joint resolution that became law, from GovInfo records.';
  }else{
    list=K.filter(k=>H.bills[k][10].V).sort((a,b)=>(H.bills[b][10].V||'').localeCompare(H.bills[a][10].V||'')).map(k=>({k}));cap='Bills the President vetoed since 2003. A green "Law" tag means Congress overrode the veto.';
  }
  if(q&&S.bmode!=='lobbied')list=list.filter(x=>billTitle(x.k).toLowerCase().includes(q)||H.bills[x.k][0].toLowerCase().includes(q)||bkParse(x.k).label.toLowerCase().replace(/[.\s]/g,'').includes(q.replace(/[.\s]/g,'')));
  const congs=Array.from({length:40},(_,i)=>119-i);
  return `<header class="pnav scrolled" id="nav"><div class="in"><button data-back aria-label="Back">${ICONS.back}</button><span class="mid" style="opacity:1">Bills & laws</span><button data-menu aria-label="Menu">${MENU_ICON}</button></div></header>
   <div class="wrap" style="padding-top:calc(var(--navh) + 8px)"><div class="lt" style="padding-top:4px"><div class="lbanner bg-library"><h1>Bills & laws</h1><span>${ord(Object.keys(H.bills).length)} bills since 2003</span></div>
   <input class="search" id="bq" type="search" placeholder="Search bill names or numbers" value="${esc(S.bq||'')}" aria-label="Search bills" autocomplete="off">
   <div class="seg" role="group">${modes.map(([k,l])=>`<button data-bmode="${k}" aria-pressed="${k===S.bmode}">${l}</button>`).join('')}</div></div>
   ${S.bmode==='laws'?`<div class="chipsrow">${['All',...congs].map(c=>`<button data-bcong="${c}" aria-pressed="${String(c)===String(S.bcong)}">${c==='All'?'All years':congLabel(c)}</button>`).join('')}</div>`:''}
   <div class="sec"><div class="sh"><h2>${{lobbied:'Most-lobbied bills',new:'New laws',laws:S.bcong==='All'?'Every law since 1947':'Laws from '+congLabel(S.bcong),veto:'Vetoed bills'}[S.bmode]}</h2><span class="cap" style="padding:0">${ord(list.length)}</span></div>
    <div class="group">${list.slice(0,S.limit).map(x=>S.bmode==='lobbied'?(hasBill(x.k)?billRow(x.k,null,`<span class="val" style="font-size:15px">${ord(x.n)}<small> groups</small></span>`):`<button class="row plain" data-bill="${x.b}" style="grid-template-columns:1fr auto auto"><span class="t">${esc(billName(x.b))}</span><span class="val" style="font-size:15px">${ord(x.n)}<small> groups</small></span>${chev}</button>`):billRow(x.k,null,S.bmode==='veto'&&H.bills[x.k][10].L?'<span class="cast Yes">Law</span>':'')).join('')||'<div class="empty">No bills match.</div>'}</div>
    ${list.length>S.limit?`<button class="more" data-more>Show ${Math.min(list.length-S.limit,100)} more</button>`:''}
    <div class="cap">${cap}</div></div></div>`;
}

/* ---------- wiring ---------- */
document.body.insertAdjacentHTML('beforeend','<div id="drawer" class="drawer" hidden><div class="dscrim" data-dclose></div><nav class="dpanel" aria-label="Site menu"></nav></div>');
const _render=render;
render=function(){
  if(S.stack.at(-1)==='bills'){ // render bills page through the normal shell
    $('#app').innerHTML=billsScreen();
    $('#tabbar').innerHTML=TABS2.map(([k,l,svg])=>`<button data-tab="${k}" aria-current="${k===S.tab?'page':'false'}">${svg}${l}</button>`).join('');
    const bq=$('#bq');if(bq)bq.addEventListener('input',e=>{S.bq=e.target.value;S.limit=60;const pos=bq.selectionStart;render();const n=$('#bq');n.focus();n.setSelectionRange(pos,pos)});
  }else _render();
  // menu button on every screen
  const pn=document.querySelector('#app .pnav .in');
  if(pn&&!pn.querySelector('[data-menu]')){const sh=pn.querySelector('[data-share]');const b=document.createElement('span');b.className='pright';b.innerHTML=`<button data-menu aria-label="Menu">${MENU_ICON}</button>`;if(sh){sh.replaceWith(b);b.prepend(sh)}else pn.append(b)}
  if(!pn){const host=document.querySelector('#app .brandbar, #app .lt');if(host&&!host.querySelector('.hamb')){host.classList.add('hashamb');host.insertAdjacentHTML('afterbegin',`<button class="hamb" data-menu aria-label="Open menu">${MENU_ICON}</button>`)}}
};
TABS2[3]=['menu','Menu',MENU_ICON];
document.addEventListener('click',e=>{
  const g=s=>e.target.closest(s);let el;
  if(g('[data-menu]')||g('[data-tab="menu"]')){e.stopImmediatePropagation();openDrawer();return}
  if(g('[data-dclose]')){e.stopImmediatePropagation();closeDrawer();return}
  if(el=g('[data-dtoggle]')){e.stopImmediatePropagation();const id=el.dataset.dtoggle;S.dopen[id]=!S.dopen[id];store.set('dopen',S.dopen);el.parentElement.classList.toggle('open');el.setAttribute('aria-expanded',!!S.dopen[id]);return}
  if(el=g('[data-jump]')){e.stopImmediatePropagation();const t=document.getElementById(el.dataset.jump);closeDrawer();if(t)setTimeout(()=>scrollTo({top:t.getBoundingClientRect().top+scrollY-70,behavior:'smooth'}),230);return}
  if(el=g('[data-go]')){e.stopImmediatePropagation();navGo(el.dataset.go);return}
  if(el=g('[data-bmode]')){e.stopImmediatePropagation();S.bmode=el.dataset.bmode;S.limit=60;render();return}
  if(el=g('[data-bcong]')){e.stopImmediatePropagation();S.bcong=el.dataset.bcong==='All'?'All':+el.dataset.bcong;S.limit=60;render();return}
},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDrawer()});
/* swipe from the left edge to open, swipe left to close */
let _tx=null,_ty=null;
addEventListener('touchstart',e=>{const t=e.touches[0];_tx=t.clientX;_ty=t.clientY},{passive:true});
addEventListener('touchend',e=>{if(_tx==null)return;const t=e.changedTouches[0],dx=t.clientX-_tx,dy=Math.abs(t.clientY-_ty);const open=!$('#drawer').hidden;
  if(!open&&_tx<24&&dx>60&&dy<50)openDrawer();else if(open&&dx<-60&&dy<50)closeDrawer();_tx=null},{passive:true});
render();
