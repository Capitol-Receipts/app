/* ================= Trades by the President and Senate-confirmed officials =================
From the OGE Form 278-T reports the Office of Government Ethics posts publicly (app_meta 'exec_trades', built daily by
pipeline/fetch_exec_trades.py). Screens: 'xtr' (everyone, most trades first) and 'xtr:<slug>' (one official). */
const XTR={data:null,loading:null};
const xtSlug=n=>String(n||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const xtName=n=>{const [l,f]=String(n||'').split(/,\s*/);return f?`${f} ${l}`:String(n||'')};
function xtLoad(){
  if(XTR.data||XTR.loading)return;
  XTR.loading=SB.meta(['exec_trades']).then(m=>{XTR.data=(m.exec_trades&&m.exec_trades.filers)||[];XTR.asOf=m.exec_trades&&m.exec_trades.asOf;
    XTR.data.forEach(f=>{f.slug=xtSlug(xtName(f.name));f.display=xtName(f.name);
      const t=f.tot||{};f.n=t.n||f.trades.length;f.buys=t.buys||0;f.sells=t.sells||0;f.lo=t.lo||0;f.hi=t.hi||0;f.scan=!!f.scan});
    render()}).catch(e=>{XTR.err=String(e.message||e);render()});
}
const xtDate=d=>!d?'Date unclear':d.length===7?new Date(d+'-15').toLocaleDateString('en-US',{month:'short',year:'numeric'}):fmtISO(d);
const xtKind=k=>k==='Buy'?'Bought':k==='Exchange'?'Exchanged':'Sold';
function xtListPage(){
  xtLoad();
  const head=typeof pageHead==='function'?pageHead('Executive branch trades'):'';
  if(!XTR.data)return `${head}<div class="wrap"><div class="empty" style="padding-top:calc(var(--navh) + 24px)">${XTR.err?'Couldn’t load these reports. Try again later.':'Loading…'}</div></div>`;
  const tot=XTR.data.reduce((v,f)=>v+f.n,0);
  return `${head}<div class="wrap" style="padding-top:calc(var(--navh) + 12px)">
  <div class="group pad"><div class="bigline"><b>${ord(tot)}</b><span>trades reported by the President and ${XTR.data.length-1} Senate-confirmed officials since January 2025</span></div>
  <p class="s" style="margin:8px 0 0">Officials must report stock and bond trades within 45 days on OGE Form 278-T. This lists every report the Office of Government Ethics has posted publicly. Amounts are reported in ranges.</p></div>
  <div class="sec"><div class="group">${XTR.data.map(f=>`<button class="row plain" data-go="xtr:${esc(f.slug)}" style="grid-template-columns:1fr auto auto"><span style="min-width:0"><span class="t">${esc(f.display)}</span><br><span class="s">${esc(f.title)}${f.agency&&f.agency!=='White House Office'?' · '+esc(f.agency):''}</span></span><span class="val" style="font-size:16px">${ord(f.n)}</span>${chev}</button>`).join('')}</div>
  <div class="cap">Most trades first. Reports posted by OGE through ${XTR.asOf?fmtISO(XTR.asOf):'today'}. The President’s reports are scanned paper; see each official’s page for how they were read.</div></div></div>`;
}
function xtPage(slug){
  xtLoad();
  const f=XTR.data&&XTR.data.find(x=>x.slug===slug);
  const head=typeof pageHead==='function'?pageHead(f?f.display:'Trades'):'';
  if(!XTR.data)return `${head}<div class="wrap"><div class="empty" style="padding-top:calc(var(--navh) + 24px)">Loading…</div></div>`;
  if(!f)return `${head}<div class="wrap"><div class="empty">Not found.</div></div>`;
  const lim=S.xtlim||60,list=f.trades.slice(0,lim);
  return `${head}<div class="wrap" style="padding-top:calc(var(--navh) + 12px)">
  <div class="group pad"><div style="font-size:21px;font-weight:800">${esc(f.display)}</div><div class="s">${esc(f.title)}${f.agency?' · '+esc(f.agency):''}</div>
   <div class="bigline" style="margin-top:12px"><b>${ord(f.n)}</b><span>trades reported since January 2025: ${ord(f.buys)} purchases, ${ord(f.sells)} sales, worth ${M(f.lo)}–${M(f.hi)} in total</span></div></div>
  ${f.scan?`<div class="group pad" style="margin-top:12px"><p class="s" style="margin:0">These reports were filed on paper and scanned. Counts and amounts were read from the scans automatically and matched to the official ranges. The scans are too rough to list every trade by name, so each report below links to the original.</p></div>
  <div class="sec"><div class="sh"><h2>Reports</h2></div><div class="group">${f.reports.map(r=>`<a class="row plain" href="${esc(r[1])}" target="_blank" rel="noopener" style="grid-template-columns:1fr auto auto"><span style="min-width:0"><span class="t">Report posted ${fmtISO(r[0])}</span><br><span class="s">${r[2]?`${ord(r[4]||0)} purchases · ${ord(r[5]||0)} sales`:'Scanned image, not readable here yet'}</span></span><span class="val" style="font-size:14px;text-align:right">${r[2]?`${ord(r[2])} trades<br>${M(r[6]||0)}–${M(r[7]||0)}`:''}</span>${chev}</a>`).join('')}</div></div>`:
  `<div class="sec"><div class="sh"><h2>Trades</h2></div><div class="group">${list.map(t=>`<div class="row plain" style="grid-template-columns:1fr auto;cursor:default"><span style="min-width:0"><span class="t">${t[2]?`<b>${esc(t[2])}</b> · `:''}${esc(t[3])}</span><br><span class="s">${xtKind(t[1])} · ${esc(xtDate(t[0]))}</span></span><span class="val" style="font-size:14px;text-align:right">${t[4]?(t[5]?`${M(t[4])}–${M(t[5])}`:`Over ${M(t[4]-1)}`):'Amount unclear'}</span></div>`).join('')}</div>
   ${f.trades.length>lim?`<button class="more" data-xtmore2>Show ${ord(Math.min(200,f.trades.length-lim))} more</button>`:''}</div>`}
  ${f.scan?'':`<div class="sec"><div class="sh"><h2>Original reports</h2></div><div class="group">${f.reports.map(r=>`<a class="row plain" href="${esc(r[1])}" target="_blank" rel="noopener" style="grid-template-columns:1fr auto"><span><span class="t">Report posted ${fmtISO(r[0])}</span><br><span class="s">${r[2]?`${ord(r[2])} trades${r[3]&&r[4]!=null?`: ${ord(r[4])} purchases, ${ord(r[5])} sales, ${M(r[6])}–${M(r[7])}`:''}`:r[3]?'Scanned image; open to see the trades':'No trades listed'}</span></span>${chev}</a>`).join('')}</div></div>`}
  <div class="cap" style="padding:0 16px">Source: OGE Form 278-T periodic transaction reports posted by the U.S. Office of Government Ethics.</div></div>`;
}
const _renderXT=render;
render=function(){
  const cur=S.stack.at(-1)||'';
  if(cur==='xtr'||cur.startsWith('xtr:')){
    if($('#sheet').hidden)$('#panel').className='panel';
    $('#app').innerHTML=cur==='xtr'?xtListPage():xtPage(cur.slice(4));
    $('#tabbar').innerHTML=TABS2.map(([k,l,svg])=>`<button data-tab="${k}" aria-current="${k===S.tab?'page':'false'}">${svg}${l}</button>`).join('');
    const pn=document.querySelector('#app .pnav .in');
    if(pn&&!pn.querySelector('[data-menu]')&&typeof MENU_ICON!=='undefined'){const b=document.createElement('span');b.className='pright';b.innerHTML=`<button data-menu aria-label="Menu">${MENU_ICON}</button>`;pn.appendChild(b)}
    return;
  }
  _renderXT();
};
document.addEventListener('click',e=>{
  const g=s=>e.target.closest&&e.target.closest(s);
  if(g('[data-xtmore2]')){e.preventDefault();e.stopImmediatePropagation();S.xtlim=(S.xtlim||60)+200;render();return}
  const el=g('[data-go^="xtr"]');
  if(el&&!g('#drawer')){e.preventDefault();e.stopImmediatePropagation();S.xtlim=60;go(el.dataset.go);return}
},true);
const _navGoXT=navGo;
navGo=function(gk){if(gk==='xtr'||String(gk).startsWith('xtr:')){closeDrawer();$('#sheet').hidden=true;if(gk==='xtr'){S.stack=[];S.tab='search'}S.limit=60;S.xtlim=60;go(gk);return}_navGoXT(gk)};
const _drawerXT=drawerHtml;
drawerHtml=function(){return _drawerXT().replace(`data-go="ncat:Cabinet"`,`data-go="xtr"><span>Their stock trades</span></button><button class="ditem" data-go="ncat:Cabinet"`)};
