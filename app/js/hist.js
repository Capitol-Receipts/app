/* ================= History: every past member of Congress, president, VP and appointee ================= */
let H=null,HP={},HC={},HA={},HCX={},PASTS=[],APPS=[],EXEC=[];
const PCODE=p=>/^Democrat/.test(p||'')?'D':/^Republican/.test(p||'')?'R':/^Independent/.test(p||'')?'I':'N';
const congLabel=c=>{const s=1787+2*c;return `${s}–${String(s+1).slice(2)}`};
const ROLE={H:'U.S. Representative',S:'U.S. Senator',P:'President',V:'Vice President'};
const ROLE_SHORT={H:'Rep.',S:'Sen.',P:'President',V:'Vice President'};
const yrs=(a,b)=>b&&b!==a?`${a}–${b>2026?'now':b}`:`${a}`;
const initialsOf=n=>{const w=(n||'').replace(/[,.]/g,'').split(/\s+/).filter(x=>/^[A-Z]/.test(x)&&!/^(Jr|Sr|II|III|IV)$/.test(x));return ((w[0]||'?')[0]+(w.length>1?w[w.length-1][0]:'')).toUpperCase()};
const hFace=(p,size=44)=>`<span class="face fb ${p.pc==='N'?'nomf':'ring-'+p.pc}" style="width:${size}px;height:${size}px;font-size:${Math.round(size*.36)}px">${esc(p.initials)}</span>`;
const PK_I={};

function prepPerson(p,current){
  p.kind=current?'member':'past';
  p.pc=PCODE(p.lp);p.initials=initialsOf(p.n);
  const cong=(p.t||[]).filter(t=>t[0]==='H'||t[0]==='S');
  const span=new Set();cong.forEach(t=>{for(let y=t[1];y<(t[2]||2027);y++)span.add(y)});
  p.years=p.cd?Math.floor(p.cd/365.25):span.size;
  p.chambers=[...new Set(cong.map(t=>t[0]))];
  p.states=[...new Set((p.t||[]).map(t=>t[3]).filter(Boolean))];
  const el=(p.v||[]).reduce((a,x)=>a+x[2],0),mi=(p.v||[]).reduce((a,x)=>a+x[3],0);
  const pv=(p.v||[]).reduce((a,x)=>a+x[4],0),pw=(p.v||[]).reduce((a,x)=>a+x[5],0);
  p.elig=el;p.missRate=el>=200?mi/el:null;p.loyal=pv>=100?pw/pv:null;p.pvN=pv;
  p.laws=p.bl?.law??null;p.billsN=p.bl?.n??null;
  p.raisedAll=(p.fec||[]).reduce((a,x)=>a+x[1],0)||null;
  p.isExec=(p.t||[]).some(t=>t[0]==='P'||t[0]==='V');
  p.firstY=p.fy||(p.t?.[0]?.[1]);p.lastY=p.ly;
  p.search=(p.n+' '+(p.f||'')+' '+p.states.map(s=>s+' '+(ST[s]||'')).join(' ')+' '+[...new Set((p.t||[]).map(t=>t[5]))].join(' ')).toLowerCase();
}
function prepApp(a){
  a.kind='app';a.pc='N';a.initials=initialsOf(a.n);
  a.vote=a.sv?.length?a.sv[a.sv.length-1]:null;
  a.cat=a.k==='Judge'?'Judges':a.off?.some(o=>/Secretary|Attorney General|President|Justice|Director|Administrator|Chief of Staff|Ambassador to the United Nations|Trade Representative|Postmaster|National Security|Chair of the Federal Reserve|Solicitor/.test(o[0])&&o[1])?'Cabinet & top officials':a.oge?'Ethics filings':'Senate votes';
  a.rejected=(a.sv||[]).some(v=>/Rejected/i.test(v.res)||(v.nn>v.y&&!/Agreed|Confirmed/i.test(v.res)));
  a.margin=a.vote?a.vote.y-a.vote.nn:null;
  a.search=(a.n+' '+(a.ttl||'')+' '+(a.by||'')+' '+(a.off||[]).map(o=>o[0]).join(' ')+' '+(a.pos||[]).map(p=>p[1]).join(' ')).toLowerCase();
}
let LOADERR={};
function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.async=true;s.onload=()=>res();s.onerror=()=>rej(new Error('script '+src));document.head.appendChild(s)})}
async function gunzipBytes(bytes){
  if('DecompressionStream' in window){try{return await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text()}catch(e){}}
  if(!window.fflate)await loadScript('https://cdn.jsdelivr.net/npm/fflate@0.8.2/umd/index.js');
  return window.fflate.strFromU8(window.fflate.gunzipSync(bytes));
}
async function loadBlobJSONv2(id,base){
  let b64=null;const el=document.getElementById(id);
  if(el&&el.textContent.trim().length>10)b64=el.textContent.trim();
  if(!b64){try{await loadScript(base+'.js');b64=window['__'+id.toUpperCase()]}catch(e){LOADERR[id]=(LOADERR[id]||'')+e.message+'; '}}
  if(!b64){try{const r=await fetch(base+'.txt');if(r.ok)b64=(await r.text()).trim();else LOADERR[id]=(LOADERR[id]||'')+'fetch '+r.status}catch(e){LOADERR[id]=(LOADERR[id]||'')+e.message}}
  if(!b64)throw new Error('could not load '+id);
  const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
  if(bytes[0]===0x1f&&bytes[1]===0x8b)return JSON.parse(await gunzipBytes(bytes));
  return JSON.parse(new TextDecoder().decode(bytes));
}
async function loadBlobJSON(id,url){
  const el=document.getElementById(id);let bytes;
  if(el&&el.textContent.trim().length>10)bytes=Uint8Array.from(atob(el.textContent.trim()),c=>c.charCodeAt(0));
  else{const r=await fetch(url,{cache:'force-cache'});if(!r.ok)throw new Error(url+' '+r.status);const t=(await r.text()).trim();bytes=Uint8Array.from(atob(t),c=>c.charCodeAt(0))}
  if(bytes[0]===0x1f&&bytes[1]===0x8b){if(!('DecompressionStream' in window))throw new Error('no gzip');return JSON.parse(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text())}
  return JSON.parse(new TextDecoder().decode(bytes));
}
async function loadHist(){
  try{
    const [meta,people,current,apps,bills,pacs]=await Promise.all([
      SB.meta(['hist_control','hist_kv','hist_PK','hist_meta','hist_curApps']),
      SB.rpc('get_light',{kind:'people'}),SB.rpc('get_light',{kind:'careers'}),SB.rpc('get_light',{kind:'appointees'}),
      SB.rpc('get_light',{kind:'bills'}),SB.rpc('get_light',{kind:'pacs'})]);
    H={control:meta.hist_control,kv:meta.hist_kv,PK:meta.hist_PK,meta:meta.hist_meta,curApps:meta.hist_curApps,people,current,apps,bills,pacs};
  }catch(e){console.warn('history failed',e);LOADERR.hist=String(e.message||e);render();return}
  H.PK.forEach((k,i)=>PK_I[k]=i);
  PASTS=H.people;PASTS.forEach(p=>{prepPerson(p,false);HP[p.id]=p});
  Object.values(H.current).forEach(p=>{prepPerson(p,true);HC[p.id]=p});
  APPS=H.apps;APPS.forEach(a=>{prepApp(a);HA[a.id]=a});
  HCX=H.curApps||{};
  EXEC=[...PASTS,...Object.values(HC)].filter(p=>p.isExec).sort((a,b)=>{const fa=a.t.find(t=>t[0]==='P'||t[0]==='V'),fb=b.t.find(t=>t[0]==='P'||t[0]==='V');return fb[1]-fa[1]});
  HOMESTORIES=null;render();
}

/* ---------- shared career blocks ---------- */
function timelineSvg(p){
  const T=(p.t||[]);if(!T.length)return '';
  const lanes=['P','V','S','H'].filter(k=>T.some(t=>t[0]===k));
  const y0=Math.min(...T.map(t=>t[1])),y1=Math.max(...T.map(t=>Math.min(t[2]||2027,2027)));
  const W=320,L=8,R=8,lh=26,top=6,h=top+lanes.length*lh+22;
  const x=y=>L+(y-y0)/Math.max(1,y1-y0)*(W-L-R);
  const col={D:'var(--D)',R:'var(--R)',I:'var(--I)',N:'var(--N)'};
  let s=`<svg class="chart" viewBox="0 0 ${W} ${h}" role="img" aria-label="Career timeline">`;
  lanes.forEach((k,i)=>{const yy=top+i*lh;s+=`<text class="tl" x="${L}" y="${yy+9}" text-anchor="start">${ROLE[k]}</text>`;
    T.filter(t=>t[0]===k).forEach(t=>{const a=x(t[1]),b=Math.max(a+3,x(Math.min(t[2]||2027,2027)));s+=`<rect x="${a.toFixed(1)}" y="${yy+12}" width="${(b-a).toFixed(1)}" height="9" rx="3" style="fill:${col[PCODE(t[5])]}"><title>${esc(t[5]||'')} ${t[1]}–${t[2]}</title></rect>`})});
  const ticks=[y0,Math.round((y0+y1)/2),y1];
  ticks.forEach((t,i)=>s+=`<text class="tl" x="${x(t).toFixed(1)}" y="${h-5}" text-anchor="${i===0?'start':i===2?'end':'middle'}">${t>2026?'Now':t}</text>`);
  return s+'</svg>';
}
function termList(p){
  return (p.t||[]).slice().reverse().map(t=>`<div class="row kv" style="grid-template-columns:auto 1fr"><span class="k" style="min-width:86px">${yrs(t[1],t[2])}</span><span class="v">${ROLE[t[0]]}${t[3]?` · ${esc(ST[t[3]]||t[3])}${t[0]==='H'?(t[4]?` District ${t[4]}`:' At large'):''}`:''}${t[5]?`<br><span class="s">${esc(t[5])}</span>`:''}</span></div>`).join('');
}
function ideologyBlock(p){
  if(!p.nmp)return '';
  const [pc,c,ch]=p.nmp,left=Math.round(pc*100);
  const where=left>=50?`Voted more to the left than <b>${left}%</b>`:`Voted more to the right than <b>${100-left}%</b>`;
  return `<div class="sec"><div class="sh"><h2>Left–right voting score</h2></div><div class="group pad">
   <div class="lr"><span class="lrb"></span><i style="left:${(100-left)}%"></i></div><div class="sparkl"><span>Left</span><span>Right</span></div>
   <p style="margin:10px 0 0;font-size:15px">${where} of the ${ch==='S'?'Senate':'House'} in ${congLabel(c)}.</p></div>
   <div class="cap">Based only on how they voted, compared with everyone serving at the same time. Political scientists call this DW-NOMINATE. It doesn't judge whether a vote was right.</div></div>`;
}
function votesHistory(p){
  const v=p.v||[];if(!v.length)return '';
  const rows=v.map(x=>[congLabel(x[0]).slice(0,4),x[2]?x[3]/x[2]:0,x]);
  const every=Math.max(1,Math.ceil(rows.length/6));
  const loy=v.filter(x=>x[4]>=20).map(x=>[congLabel(x[0]).slice(0,4),x[5]/x[4]]);
  return `<div class="sec"><div class="sh"><h2>Votes over the years</h2></div><div class="group pad">
    <div class="bigline"><b>${ord(p.elig-v.reduce((a,x)=>a+x[3],0))}</b><span>votes cast out of ${ord(p.elig)} (${pct(p.missRate??(v.reduce((a,x)=>a+x[3],0)/(p.elig||1)),1)} missed)</span></div>
    <div style="margin-top:12px">${colChart(rows,{showVals:rows.length<=8,fmt:x=>pct(x,0),every,h:130,flagIdx:r=>r[1]>.2})}</div>
    <div class="cap" style="padding:6px 0 0">Share of roll-call votes missed in each two-year Congress. Orange: more than 1 in 5.</div>
    ${loy.length>1?`<div style="margin-top:14px">${colChart(loy,{showVals:false,every,h:110})}</div><div class="cap" style="padding:6px 0 0">How often they sided with their own party when the two biggest parties split${p.loyal!=null?`: <b>${pct(p.loyal,1)}</b> over their career`:''}.</div>`:''}
  </div></div>`;
}
function moneyHistory(p){
  const f=p.fec||[];if(!f.length)return '';
  const rows=f.map(x=>[`'${String(x[0]).slice(2)}`,x[1]]);
  const tot=f.reduce((a,x)=>a+x[1],0),pac=f.reduce((a,x)=>a+x[3],0),ind=f.reduce((a,x)=>a+x[2],0);
  return `<div class="sec"><div class="sh"><h2>Campaign money, every election</h2></div><div class="group pad">
    <div class="bigline"><b>${M(tot)}</b><span>raised across ${f.length} election cycle${f.length>1?'s':''} since ${f[0][0]-1}</span></div>
    <div style="margin-top:12px">${colChart(rows,{fmt:M,showVals:rows.length<=7,every:Math.max(1,Math.ceil(rows.length/7)),h:140})}</div>
    <div class="mini-legend" style="margin-top:8px"><span>From individuals ${pct(ind/(tot||1))}</span><span>From PACs ${pct(pac/(tot||1))}</span></div></div>
    <div class="cap">From FEC candidate summaries. FEC electronic records start with the 1979–80 cycle.</div></div>`;
}
function billsBlock(p){
  const b=p.bl;if(!b)return '';
  const rows=b.pc.map(x=>[congLabel(x[0]).slice(0,4),x[1],x]);
  return `<div class="sec"><div class="sh"><h2>Bills they wrote</h2></div><div class="group">
    <div class="tiles"><div><b>${ord(b.n)}</b><span>Bills introduced${b.pc?.[0]?` since ${1787+2*b.pc[0][0]}`:''}</span></div><div><b>${ord(b.law)}</b><span>Became law (${b.n?pct(b.law/b.n,1):'—'})</span></div></div>
    ${rows.length>1?`<div class="pad" style="padding:0 16px 14px">${colChart(rows,{showVals:rows.length<=8,every:Math.max(1,Math.ceil(rows.length/6)),h:120,flagIdx:r=>r[2][2]>0})}<div class="cap" style="padding:6px 0 0">Bills introduced each Congress. Orange: at least one became law.</div></div>`:''}</div>
   ${b.areas?.length?`<div class="cap">Most common topics: ${b.areas.map(a=>esc(a[0])).join(', ')}.</div>`:''}</div>
   ${b.laws?.length?`<div class="sec"><div class="sh"><h2>Their bills that became law</h2></div><div class="group">${b.laws.map(l=>billRow(l[4],l[2],'<span class="cast Yes">Law</span>')).join('')}</div>${b.law>b.laws.length?`<div class="cap">Showing the ${b.laws.length} most recent of ${b.law}.</div>`:''}</div>`:''}
   ${b.new?.length?`<div class="sec"><div class="sh"><h2>Newest bills</h2></div><div class="group">${b.new.map(l=>billRow(l[5],l[2])).join('')}</div></div>`:''}
   ${b.pop?.length?`<div class="sec"><div class="sh"><h2>Bills with the most co-sponsors</h2></div><div class="group">${b.pop.map(l=>billRow(l[5],l[2],`<span class="val" style="font-size:15px">${ord(l[3])}<small> co-sponsors</small></span>`)).join('')}</div><div class="cap">Bill records go back to 1947.</div></div>`:''}`;
}
function tradeHistory(p,cur){
  const th=p.th;
  const yrs=(th?.yrs||[]).map(r=>r.slice());
  if(cur&&cur.tradeN){const by={};(cur.tradeByMonth||[]).forEach(([mo,c])=>{by[mo.slice(0,4)]=(by[mo.slice(0,4)]||0)+c});Object.entries(by).forEach(([y,c])=>{if(c&&!yrs.some(r=>r[0]===+y))yrs.push([+y,c,0,0,0,0])});yrs.sort((a,b)=>a[0]-b[0])}
  if(!yrs.length&&!th?.paper)return '';
  const total=yrs.reduce((a,r)=>a+r[1],0);
  const rows=yrs.map(r=>[`'${String(r[0]).slice(2)}`,r[1]]);
  const all=th?.all||[];const lim=S.thlimit||20;
  return `<div class="sec"><div class="sh"><h2>Stock trades over the years</h2></div><div class="group pad">
    <div class="bigline"><b>${ord(total)}</b><span>trades reported${yrs.length?` from ${yrs[0][0]} to ${yrs.at(-1)[0]}`:''}</span></div>
    ${rows.length?`<div style="margin-top:12px">${colChart(rows,{every:Math.max(1,Math.ceil(rows.length/7)),h:120})}</div>`:''}
    ${th?.ticks?.length?`<div class="mini-legend" style="margin-top:10px"><span>Most traded: ${th.ticks.slice(0,5).map(([t,n])=>`${esc(t)} (${n})`).join(', ')}</span></div>`:''}</div>
    <div class="cap">From House reports since 2015 and Senate reports since 2012${th?.paper?`. ${th.paper} older report${th.paper>1?'s were':' was'} filed on paper and isn't itemized`:''}.</div></div>
   ${th?.big?.length?`<div class="sec"><div class="sh"><h2>Biggest trades</h2></div><div class="group">${th.big.map(tradeRow).join('')}</div><div class="cap">Ranked by the top of each reported value range.</div></div>`:''}
   ${all.length?`<div class="sec"><div class="sh"><h2>Every past trade</h2><span class="cap" style="padding:0">${ord(all.length)}</span></div><div class="group">${all.slice(0,lim).map(tradeRow).join('')}</div>${all.length>lim?`<button class="more" data-thmore>Show more trades</button>`:''}</div>`:''}`;
}
function tradeRow(t){const [d,ty,tick,asset,lo,hi,own]=t;return `<div class="vote"><div class="vt">${tick?`<span class="num" style="font-size:17px">${esc(tick)}</span> · `:''}${esc(asset)}</div><div class="vm"><span>${fmtISO(d)} · ${esc(own||'Self')} · ${rangeTxt(lo,hi)}</span><span class="cast ${ty==='Buy'?'Yes':/Sell/.test(ty)?'No':''}">${esc(ty)}</span></div></div>`}
function keyVotes(p){
  if(!p.kv?.length||!H.kv)return '';
  const rows=p.kv.map(([i,c])=>[H.kv[i],c]).filter(x=>x[0]).sort((a,b)=>b[0].date.localeCompare(a[0].date));
  const word=(v,c)=>/guilty/i.test(v.q)?(c==='Y'?'Convict':c==='N'?'Acquit':'Missed'):(c==='Y'?'Yes':c==='N'?'No':'Missed');
  const passed=v=>/guilty/i.test(v.q)?v.yea>=Math.ceil((v.yea+v.nay)*2/3):!/fail|reject|not agreed/i.test(v.res)&&v.yea>v.nay;
  return `<div class="sec"><div class="sh"><h2>Landmark votes</h2><span class="cap" style="padding:0">${rows.length}</span></div><div class="group">${rows.map(([v,c])=>{const b=v.br||{};const pb=k=>b[k]?`${k} ${b[k][0]}–${b[k][1]}`:'';
    const bk=(()=>{const m=v.bill.match(/^(HR|S|HJRES|SJRES)(\d+)$/);return m?`${v.c}-${m[1].toLowerCase()}-${m[2]}`:null})();
    return `<div class="vote"><div class="vt">${bk&&hasBill(bk)?`<button class="link inl" data-bk="${bk}">${esc(v.label)}</button>`:esc(v.label)}</div><div class="vm"><span>${v.ch==='H'?'House':'Senate'} · ${v.year} · ${passed(v)?(/guilty/i.test(v.q)?'Convicted':'Passed'):(/guilty/i.test(v.q)?'Acquitted':'Failed')} ${v.yea}–${v.nay}<br><span style="font-size:12px">${[pb('R'),pb('D')].filter(Boolean).join(' · ')}</span></span><span class="cast ${c==='Y'?'Yes':c==='N'?'No':'Missed'}">${word(v,c)}</span></div></div>`}).join('')}</div>
   <div class="cap">Final votes on major laws and impeachments since 1990, from Voteview roll calls. Shows only votes they were in office for.</div></div>`;
}
function wealthBlock(p){
  const w=p.wl;if(!w?.length)return '';
  const last=w.at(-1);const nlo=Math.max(0,last[1]-last[4]),nhi=Math.max(0,last[2]-last[3]);
  const rows=w.map(r=>[`'${String(r[0]).slice(2)}`,Math.max(0,(r[1]+r[2])/2-(r[3]+r[4])/2)]);
  return `<div class="sec"><div class="sh"><h2>Personal finances</h2></div><div class="group pad">
    <div class="bigline"><b>${M(Math.max(0,(last[1]+last[2])/2-(last[3]+last[4])/2))}</b><span>estimated net worth (middle of the reported ranges), ${last[0]} report</span></div>
    <div class="tiles" style="margin:12px -16px 0;border-top:1px solid var(--hair)"><div><b>${M(last[1])}–${M(last[2])}</b><span>Assets (${last[5]} listed)</span></div><div><b>${last[3]||last[4]?`${M(last[3])}–${M(last[4])}`:'None'}</b><span>Debts</span></div></div>
    ${rows.length>1?`<div style="margin-top:14px">${colChart(rows,{fmt:M,showVals:false,every:Math.max(1,Math.ceil(rows.length/7)),h:120})}</div><div class="cap" style="padding:6px 0 0">Middle of the estimated range, each year.</div>`:''}</div>
   <div class="cap">From annual House and Senate financial disclosures. Members report values only in broad ranges, so this is a rough estimate. Their home and government retirement aren't included.</div></div>`;
}
function pacCareer(p){
  const c=p.pacc;if(!c)return '';
  return `<div class="sec"><div class="sh"><h2>Biggest PAC donors, whole career</h2></div><div class="group">${c.top.map(([n,v,a,b,org],i)=>`<div class="row plain" style="cursor:default;grid-template-columns:auto 1fr auto"><span class="rank">${i+1}</span><span style="min-width:0"><span class="t">${esc(n)}</span><br><span class="s">${org?esc(org)+' · ':''}${a===b?a:`${a}–${b}`}</span></span><span class="val" style="font-size:15px">${M(v)}</span></div>`).join('')}</div>
   <div class="cap">${M(c.tot)} from ${ord(c.n)} PACs and party committees since ${Math.min(...c.top.map(x=>x[2]))}, from FEC records.</div></div>`;
}
function ptrHistory(p){
  if(p.th)return tradeHistory(p);
  const t=p.ptr||[];if(!t.length)return '';
  const rows=t.map(([y,n])=>[`'${String(y).slice(2)}`,n]);
  return `<div class="sec"><div class="sh"><h2>Stock trade reports by year</h2></div><div class="group pad">
    <div class="bigline"><b>${ord(t.reduce((a,x)=>a+x[1],0))}</b><span>trade reports filed with the House since ${t[0][0]}</span></div>
    <div style="margin-top:12px">${colChart(rows,{every:Math.max(1,Math.ceil(rows.length/7)),h:120})}</div></div>
    <div class="cap">Count of reports, not trades. Each report can list many trades. House index starts in 2008.</div></div>`;
}
function rolesBlock(p){
  const off=p.off||[];const lr=[];(p.lr||[]).forEach(o=>{const l=lr.at(-1);if(l&&l[0]===o[0]&&(l[2]||9999)>=(o[1]||0)-1)l[2]=o[2];else lr.push([...o])});if(!lr.length&&!off.length)return '';
  return `<div class="sec"><div class="sh"><h2>Other roles</h2></div><div class="group">
   ${off.map(o=>`<div class="row kv" style="grid-template-columns:auto 1fr"><span class="k" style="min-width:86px">${o[1]?yrs(+o[1].slice(0,4),o[2]?+o[2].slice(0,4):2027):''}</span><span class="v">${esc(o[0])}</span></div>`).join('')}
   ${lr.map(o=>`<div class="row kv" style="grid-template-columns:auto 1fr"><span class="k" style="min-width:86px">${o[1]?yrs(o[1],o[2]||2027):''}</span><span class="v">${esc(o[0])}</span></div>`).join('')}</div></div>`;
}
function linksBlock(p){
  const L=[];
  if(!p.id.startsWith('X'))L.push(['Official biography (Congress)',`https://bioguide.congress.gov/search/bio/${p.id}`]);
  if(p.w)L.push(['Wikipedia',`https://en.wikipedia.org/wiki/${encodeURIComponent(p.w.replace(/ /g,'_'))}`]);
  if(p.bp)L.push(['Ballotpedia',`https://ballotpedia.org/${encodeURIComponent(p.bp.replace(/ /g,'_'))}`]);
  if(p.gt)L.push(['GovTrack',`https://www.govtrack.us/congress/members/${p.gt}`]);
  if(p.ic)L.push(['Every vote on Voteview',`https://voteview.com/person/${p.ic}`]);
  if(p.os)L.push(['OpenSecrets',`https://www.opensecrets.org/members-of-congress/summary?cid=${p.os}`]);
  if(p.vs)L.push(['Vote Smart',`https://justfacts.votesmart.org/candidate/${p.vs}`]);
  const so=p.soc||{},SOC={twitter:['X (Twitter)','https://x.com/'],facebook:['Facebook','https://www.facebook.com/'],youtube:['YouTube','https://www.youtube.com/'],instagram:['Instagram','https://www.instagram.com/']};
  Object.entries(so).forEach(([k,v])=>{if(SOC[k])L.push([`${SOC[k][0]} · ${v}`,SOC[k][1]+v])});
  return `<div class="sec"><div class="sh"><h2>Go deeper</h2></div><div class="group">${L.map(([t,u])=>`<a class="row plain" style="grid-template-columns:1fr auto" href="${esc(u)}" target="_blank" rel="noopener"><span>${esc(t)}</span>${chev}</a>`).join('')}</div></div>`;
}
function bgBlock(x,title,link){
  if(!x)return '';
  return `<div class="sec"><div class="sh"><h2>Background</h2></div><div class="group pad"><p class="bio">${esc(x)}</p>${title?`<a class="s" style="font-size:13px" href="https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g,'_'))}" target="_blank" rel="noopener">From Wikipedia · read more</a>`:''}</div></div>`;
}
function bornLine(p){
  const b=p.b?(p.b.length>4?fmtISO(p.b):p.b):null;
  return b?`${b}${p.dd?` – ${p.dd}`:''}`:p.dd?`Died ${p.dd}`:null;
}

/* ---------- standouts for anyone, past or present ---------- */
let HPOOL=null;
function hpool(){if(HPOOL)return HPOOL;const all=[...PASTS,...Object.values(HC)].filter(p=>p.chambers.length);
  HPOOL={years:all.map(p=>p.years),miss:all.filter(p=>p.missRate!=null&&p.elig>=500).map(p=>p.missRate),laws:all.filter(p=>p.laws!=null).map(p=>p.laws),
    raised:all.filter(p=>p.raisedAll).map(p=>p.raisedAll),loyal:all.filter(p=>p.loyal!=null&&p.pvN>=300).map(p=>p.loyal),n:all.length};return HPOOL}
function histStandouts(p){
  const P=hpool(),out=[],top=x=>Math.floor(x*100);
  if(p.years){const s=share(P.years,p.years);if(s>=.9)out.push({cat:'votes',big:p.years+' years',text:`in Congress. Longer than ${top(s)}% of the ${ord(P.n)} people who have ever served.`,w:s})}
  if(p.missRate!=null&&p.elig>=500){const s=share(P.miss,p.missRate);if(s>=.9)out.push({cat:'votes',big:pct(p.missRate,1),text:`of votes missed over their career. More than ${top(s)}% of members.`,w:s});else if(s<=.05)out.push({cat:'votes',big:pct(p.missRate,1),text:`of votes missed over their career. Better attendance than ${100-top(s)}% of members.`,w:1-s-.05})}
  if(p.laws){const s=share(P.laws,p.laws);if(s>=.9)out.push({cat:'confirm',big:ord(p.laws),text:`of their bills became law (records from 1947). More than ${top(s)}% of members.`,w:s})}
  if(p.raisedAll){const s=share(P.raised,p.raisedAll);if(s>=.95)out.push({cat:'money',big:M(p.raisedAll),text:`raised across their campaigns since 1980. ${s>=.995?'More than any member of Congress.':`More than ${top(s)}% of members.`}`,w:s-.02})}
  if(p.loyal!=null&&p.pvN>=300){const s=share(P.loyal,p.loyal);if(s<=.05)out.push({cat:'votes',big:pct(1-p.loyal,0),text:`of party-split votes cast against their own party. More independent than ${100-top(s)}% of members.`,w:1-s})}
  return out.sort((a,b)=>b.w-a.w).slice(0,3);
}

/* ---------- past member profile ---------- */
function pastProfile(p){
  if(!p)return `<div class="wrap"><div class="empty">Not found.</div></div>`;
  const last=p.t[p.t.length-1]||[];const so=histStandouts(p);
  const sub=[ROLE[last[0]],last[3]?(ST[last[3]]||last[3]):null,last[5]].filter(Boolean).join(' · ');
  const born=bornLine(p);
  return `<header class="pnav" id="nav"><div class="in"><button data-back aria-label="Back">${ICONS.back}</button><span class="mid">${esc(p.n)}</span><button data-share aria-label="Share">${ICONS.share}</button></div></header>
  <section class="phero p-${p.pc} ${p.isExec?'bg-white':'bg-old'}"><div class="in">${hFace(p,92)}<h1>${esc(p.n)}</h1><div class="psub">${esc(sub)}</div>
   <div class="pchips"><span>${(last[2]||0)>2026?'Current':'Former'} ${ROLE_SHORT[last[0]]==='Rep.'?'representative':ROLE_SHORT[last[0]]==='Sen.'?'senator':ROLE[last[0]].toLowerCase()}</span>${p.firstY?`<span>Served ${yrs(p.firstY,p.lastY)}</span>`:''}${born?`<span>${born}</span>`:''}</div></div></section>
  <div class="wrap">
   <div class="glance">${!p.chambers.length?(()=>{const ex=p.t.filter(t=>t[0]==='P'||t[0]==='V');const yrsx=ex.reduce((a,t)=>a+Math.min(t[2],2026)-t[1],0);return glance(ex.some(t=>t[0]==='P')?'Years as president':'Years as VP',yrsx||'<1',ex.map(t=>t[1]).join(', '),false)+glance('Age',p.b?(p.dd?p.dd-+String(p.b).slice(0,4):ageOf(p.b)):'—',p.dd?'at death':'today',false)+glance('Raised',p.raisedAll?M(p.raisedAll):'—',p.fec?`since ${p.fec[0][0]-1}`:'no FEC records',false)})()+'</div><div style="display:none">':''}${glance('Years in Congress',p.years||'—',p.chambers.map(c=>c==='S'?'Senate':'House').join(' & ')||'Executive',false)}${glance('Votes missed',p.missRate==null?'—':pct(p.missRate,1),p.elig?`of ${ord(p.elig)}`:'no roll calls',false)}${p.laws!=null?glance('Bills became law',p.laws,`of ${ord(p.billsN)} written`,false):glance('Raised',p.raisedAll?M(p.raisedAll):'—',p.fec?`since ${p.fec[0][0]-1}`:'before FEC records',false)}</div>
   ${so.length?`<section class="sec"><div class="sh"><h2>What stands out</h2></div><div class="stories">${so.map(s=>storyCard(s)).join('')}</div></section>`:''}
   ${bgBlock(p.wx,p.w)}
   <div class="sec"><div class="sh"><h2>Career</h2></div><div class="group pad">${timelineSvg(p)}</div><div class="group" style="margin-top:10px">${termList(p)}</div></div>
   ${rolesBlock(p)}${ideologyBlock(p)}${keyVotes(p)}${votesHistory(p)}${billsBlock(p)}${moneyHistory(p)}${pacCareer(p)}${ptrHistory(p)}${linksBlock(p)}
   <div class="note">From the official congressional biography, Voteview roll calls, FEC, GovInfo, the House Clerk, Wikidata and Wikipedia.</div>
  </div>`;
}

/* ---------- current member: whole-career section ---------- */
function careerSection(m){
  if(!H)return `<section class="sec"><div class="calm">Loading their full career history…</div></section>`;
  const p=HC[m.id];if(!p)return '';
  if(!p._full)return `<section class="sec"><div class="calm">Loading their full career history…</div></section>`;
  const b=p.bl;
  const sum=`In office ${p.years} year${p.years===1?'':'s'}${p.chambers.length>1?' across the House and Senate':''}.${b?` Wrote <b>${ord(b.n)}</b> bills, <b>${ord(b.law)}</b> became law.`:''}${p.raisedAll?` Raised <b>${M(p.raisedAll)}</b> over ${p.fec.length} campaigns.`:''}${p.wl?.length?(()=>{const l=p.wl.at(-1);return ` Estimated net worth about <b>${M(Math.max(0,(l[1]+l[2])/2-(l[3]+l[4])/2))}</b>.`})():''}`;
  return `<section class="sec"><div class="topics">${topicCard('confirm','Whole career',sum,`<div style="margin-top:4px">${timelineSvg(p)}</div>`,'career')}</div></section>
   ${bgBlock(p.wx,p.w)}`;
}
function careerSheet(m){
  const p=HC[m.id];if(!p)return '<div class="empty">No career history found.</div>';
  if(!p._full){ensureFull('careers',m.id).then(()=>{if(!$('#sheet').hidden&&S.sheetTopic==='career')topicSheet('career')});return '<div class="calm">Loading their full career history…</div>'}
  return `<div class="group">${termList(p)}</div>${rolesBlock(p)}${wealthBlock(p)}${ideologyBlock(p)}${keyVotes(p)}${votesHistory(p)}${billsBlock(p)}${moneyHistory(p)}${pacCareer(p)}${tradeHistory(p,m)||ptrHistory(p)}${linksBlock(p)}`;
}

/* ---------- appointee profile (past) ---------- */
const PKV=(row,k)=>row[PK_I[k]]||'';
function judgePositions(pos){
  return pos.map(r=>{const nd=PKV(r,'nd'),cd=PKV(r,'cd');const days=nd&&cd?Math.round((new Date(cd)-new Date(nd))/864e5):null;
   const v=PKV(r,'v');const vote=/\d+\/\d+/.test(v)?v.replace('/','–'):v;
   return `<div class="item"><h3>${esc(PKV(r,'t')||'Judge')}, ${esc(PKV(r,'o'))}</h3>
    <p class="s" style="color:var(--soft);font-size:14px">Appointed by ${esc(PKV(r,'by'))}${PKV(r,'bp')?` (${esc(PKV(r,'bp'))})`:''}${PKV(r,'rec')?' · recess appointment':''}</p>
    <div class="jk">
     ${nd?`<span>Nominated <em>${fmtISO(nd)}</em></span>`:''}${cd?`<span>Confirmed <em>${fmtISO(cd)}${days!=null&&days>=0?` · ${days} days later`:''}</em></span>`:''}
     ${vote?`<span>Senate vote <em>${esc(vote)}</em></span>`:''}${PKV(r,'aba')?`<span>Bar association rating <em>${esc(PKV(r,'aba'))}</em></span>`:''}
     ${PKV(r,'senior')?`<span>Took senior status <em>${fmtISO(PKV(r,'senior'))}</em></span>`:''}${PKV(r,'e')?`<span>Service ended <em>${fmtISO(PKV(r,'e'))}${PKV(r,'why')?` · ${esc(PKV(r,'why').toLowerCase())}`:''}</em></span>`:''}
    </div></div>`}).join('');
}
function senateVotes(sv){
  const pb=(lbl,a)=>a&&a[0]+a[1]?`<div class="pbar"><span>${lbl}</span><span class="bar"><span style="width:${a[0]/(a[0]+a[1])*100}%;background:var(--yes)"></span><span style="width:${a[1]/(a[0]+a[1])*100}%;background:var(--no)"></span></span><span class="num">${a[0]}–${a[1]}</span></div>`:'';
  return sv.map(v=>`<div class="item"><div style="display:flex;justify-content:space-between;gap:8px"><b>${esc(v.pos)}</b><span class="cast ${v.y>v.nn?'Yes':'No'}">${v.y>v.nn?'Confirmed':'Rejected'}</span></div>
    <p class="s" style="color:var(--soft);font-size:14px;margin:4px 0 8px">${fmtISO(v.d)} · ${v.y}–${v.nn}</p><div class="pbars">${pb('Republicans',v.br.R)}${pb('Democrats',v.br.D)}${(()=>{const R=v.br.R||[0,0],Dm=v.br.D||[0,0],I=v.br.I||[0,0],O=v.br.O||[0,0];const fits=R[0]+Dm[0]+I[0]===v.y&&R[1]+Dm[1]+I[1]===v.nn;return pb(fits?'Independents':'Independents & others',fits?(I[0]+I[1]?I:null):[I[0]+O[0],I[1]+O[1]])})()}</div></div>`).join('');
}
function ogeBlock(a){
  if(!a.oge?.length)return '';
  const docs=a.oge.slice().reverse();
  return `<div class="sec"><div class="sh"><h2>Ethics and money filings</h2><span class="cap" style="padding:0">${docs.length}</span></div><div class="group">${docs.slice(0,12).map(d=>{const ta=a.ogt[d[2]]||[];return `${d[3]?`<a class="row plain" style="grid-template-columns:1fr auto" href="${esc(d[3])}" target="_blank" rel="noopener">`:'<div class="row plain" style="grid-template-columns:1fr auto;cursor:default">'}<span style="min-width:0"><span class="t">${esc(d[1])}</span><br><span class="s">${fmtISO(d[0])} · ${esc(ta[0]||'')}${ta[1]?', '+esc(ta[1]):''}</span></span>${d[3]?chev+'</a>':'<span class="s">On request</span></div>'}`}).join('')}</div>
   <div class="cap">From the Office of Government Ethics. Some reports are only released on request.</div></div>`;
}
function appProfile(a){
  if(!a)return `<div class="wrap"><div class="empty">Not found.</div></div>`;
  const v=a.vote,jp=a.pos?.[a.pos.length-1];
  const jv=jp&&/\d+\/\d+/.test(PKV(jp,'v'))?PKV(jp,'v').replace('/','–'):null;
  const gv=v?`${v.y}–${v.nn}`:jv||(jp?PKV(jp,'v')||'Voice vote':'—');
  const by=a.by||(a.party?.length?a.party.join(', '):null);
  return `<header class="pnav" id="nav"><div class="in"><button data-back aria-label="Back">${ICONS.back}</button><span class="mid">${esc(a.n)}</span><button data-share aria-label="Share">${ICONS.share}</button></div></header>
  <section class="phero p-N ${a.k==='Judge'?'bg-court':a.cat==='Cabinet & top officials'?'bg-white':'bg-court2'}"><div class="in">${hFace(a,92)}<h1>${esc(a.n)}</h1><div class="psub">${esc(a.ttl||'')}</div>
   <div class="pchips"><span>${esc(a.cat)}</span>${a.fy?`<span>${yrs(a.fy,a.ly)}</span>`:''}${a.b?`<span>Born ${esc(a.b)}${a.bp?' · '+esc(a.bp):''}</span>`:''}</div></div></section>
  <div class="wrap">
   <div class="glance">${glance('Senate vote',esc(gv),v?(v.y>v.nn?'confirmed':'rejected'):'to confirm',!!a.rejected)}${a.k==='Judge'?glance('Appointed by',esc(by?by.split(' ').pop():'—'),jp?esc(PKV(jp,'bp')||''):'',false):glance('Years',a.fy?(a.ly&&a.ly!==a.fy?`${a.fy}–${String(a.ly).slice(2)}`:a.fy):'—',a.party?.length?esc(a.party[0]):'in office',false)}${glance('Filings',a.oge?.length||0,'ethics reports',false)}</div>
   ${a.desc&&!a.wx?`<div class="calm" style="margin-top:14px">${esc(a.desc)}</div>`:''}
   ${bgBlock(a.wx,a.wt)}
   ${a.off?.length?`<div class="sec"><div class="sh"><h2>Positions held</h2></div><div class="group">${a.off.map(o=>`<div class="row kv" style="grid-template-columns:auto 1fr"><span class="k" style="min-width:86px">${o[1]?yrs(+o[1].slice(0,4),o[2]?+o[2].slice(0,4):2027):''}</span><span class="v">${esc(o[0])}${o[3]?`<br><span class="s">${esc(o[3])}</span>`:''}</span></div>`).join('')}</div></div>`:''}
   ${a.pos?.length?`<div class="sec"><div class="sh"><h2>Federal judgeships</h2></div><div class="group">${judgePositions(a.pos)}</div></div>`:''}
   ${a.sv?.length?`<div class="sec"><div class="sh"><h2>Senate confirmation votes</h2></div><div class="group">${senateVotes(a.sv)}</div><div class="cap">Recorded roll-call votes only. Most nominees are approved without one.</div></div>`:''}
   ${a.edu?.length?`<div class="sec"><div class="sh"><h2>Education</h2></div><div class="group">${a.edu.map(e=>`<div class="row kv" style="grid-template-columns:1fr auto"><span><span class="t">${esc(e[0])}</span><br><span class="s">${esc(e[1]||'')}</span></span><span class="s">${esc(e[2]||'')}</span></div>`).join('')}</div></div>`:''}
   ${a.car?`<div class="sec"><div class="sh"><h2>Career before the bench</h2></div><div class="group pad"><p class="bio">${esc(a.car).replace(/;\s*/g,'<br>')}</p></div></div>`:''}
   ${ogeBlock(a)}
   <div class="sec"><div class="sh"><h2>Go deeper</h2></div><div class="group">
    ${a.wt?`<a class="row plain" style="grid-template-columns:1fr auto" href="https://en.wikipedia.org/wiki/${encodeURIComponent(a.wt.replace(/ /g,'_'))}" target="_blank" rel="noopener"><span>Wikipedia</span>${chev}</a>`:''}
    ${a.k==='Judge'?`<a class="row plain" style="grid-template-columns:1fr auto" href="https://www.fjc.gov/history/judges/search/advanced-search" target="_blank" rel="noopener"><span>Federal Judicial Center biography</span>${chev}</a>`:''}
    <a class="row plain" style="grid-template-columns:1fr auto" href="https://www.oge.gov/web/OGE.nsf/Officials%20Individual%20Disclosures%20Search%20Collection?OpenForm" target="_blank" rel="noopener"><span>Search Office of Government Ethics filings</span>${chev}</a></div></div>
   <div class="note">From ${a.src.map(s=>({FJC:'the Federal Judicial Center',Wikidata:'Wikidata','Senate vote':'Senate roll-call votes',OGE:'the Office of Government Ethics'}[s]||s)).join(', ')}${a.wx?' and Wikipedia':''}.</div>
  </div>`;
}

/* ---------- current appointee extras ---------- */
function curAppExtras(n){
  const x=HCX[n.id];if(!x)return '';
  return `${bgBlock(x.wx,x.wt)}
   ${x.off?.filter(o=>o[1]).length?`<div class="sec"><div class="sh"><h2>Positions held</h2></div><div class="group">${x.off.filter(o=>o[1]).map(o=>`<div class="row kv" style="grid-template-columns:auto 1fr"><span class="k" style="min-width:86px">${yrs(+o[1].slice(0,4),o[2]?+o[2].slice(0,4):2027)}</span><span class="v">${esc(o[0])}</span></div>`).join('')}</div></div>`:''}
   ${x.pos?.length?`<div class="sec"><div class="sh"><h2>Federal judgeship</h2></div><div class="group">${judgePositions(x.pos)}</div></div>`:''}
   ${x.edu?.length?`<div class="sec"><div class="sh"><h2>Education</h2></div><div class="group">${x.edu.map(e=>`<div class="row kv" style="grid-template-columns:1fr auto"><span><span class="t">${esc(e[0])}</span><br><span class="s">${esc(e[1]||'')}</span></span><span class="s">${esc(e[2]||'')}</span></div>`).join('')}</div></div>`:''}
   ${x.car?`<div class="sec"><div class="sh"><h2>Career before the bench</h2></div><div class="group pad"><p class="bio">${esc(x.car).replace(/;\s*/g,'<br>')}</p></div></div>`:''}`;
}

/* ---------- History browsing ---------- */
const HSORT={
  recent:['Most recent',p=>p.lastY||0,null,-1],
  years:['Longest serving',p=>p.years,p=>p.years+' yrs',-1],
  laws:['Most bills became law',p=>p.laws,p=>p.laws,-1],
  missed:['Most votes missed',p=>p.missRate!=null&&p.elig>=500?p.missRate:null,p=>pct(p.missRate,1),-1],
  loyal:['Most independent',p=>p.loyal!=null&&p.pvN>=300?1-p.loyal:null,p=>pct(1-p.loyal,0),-1],
  raised:['Most money raised',p=>p.raisedAll,p=>M(p.raisedAll),-1],
  oldest:['Earliest',p=>p.firstY,null,1],
  name:['Name',p=>p.l||p.n.split(' ').pop(),null,1]};
const ASORT={recent:['Most recent',a=>a.ly||0,null,-1],close:['Closest vote',a=>a.margin,a=>`${a.vote.y}–${a.vote.nn}`,1],oldest:['Earliest',a=>a.fy||9999,null,1],name:['Name',a=>a.n.split(' ').pop(),null,1]};
function pastRow(p,right){
  const last=p.t[p.t.length-1]||[];
  return `<button class="row" data-hp="${p.id}">${hFace(p,44)}<span style="min-width:0"><span class="t">${esc(p.n)}</span><br><span class="s">${esc([ROLE_SHORT[last[0]],last[3],p.firstY?yrs(p.firstY,p.lastY):null,last[5]].filter(Boolean).join(' · '))}</span></span><span class="rr">${right!=null?`<span class="val">${right}</span>`:''}${chev}</span></button>`;
}
function appRow(a,right){
  return `<button class="row" data-ha="${a.id}">${hFace(a,44)}<span style="min-width:0"><span class="t">${esc(a.n)}</span><br><span class="s clamp">${esc([a.ttl,a.fy?yrs(a.fy,a.ly):null].filter(Boolean).join(' · '))}</span></span><span class="rr">${right!=null?`<span class="val">${right}</span>`:a.vote?`<span class="val">${a.vote.y}–${a.vote.nn}</span>`:''}${chev}</span></button>`;
}
function hsortBar(specs,cur,dir,kind){
  const d=dir??specs[cur][3];
  return `<div class="sortbar"><label class="sortsel">${ICONS.sort}<select id="${kind}sort" aria-label="Sort by">${Object.entries(specs).map(([k,v])=>`<option value="${k}" ${k===cur?'selected':''}>${v[0]}</option>`).join('')}</select></label>
   <button class="dirbtn" data-hdir="${kind}" aria-label="Reverse order">${d===1?'Low to high':'High to low'}</button></div>`;
}
function archiveCards(){
  const all=[...PASTS,...Object.values(HC)];
  const lng=topBy(all,p=>p.years),law=topBy(all,p=>p.laws);
  const rej=APPS.filter(a=>a.rejected&&a.off?.length).sort((a,b)=>(b.vote?.d||'').localeCompare(a.vote?.d||''));
  const tie=APPS.filter(a=>a.vote&&a.vote.y===a.vote.nn).sort((a,b)=>b.vote.d.localeCompare(a.vote.d));
  const cards=[];
  if(lng)cards.push({p:lng,cat:'votes',kick:'Longest in Congress, ever',big:lng.years+' years',text:`${lng.n} served from ${lng.firstY} to ${lng.lastY>2026?'today':lng.lastY}.`});
  if(law)cards.push({p:law,cat:'confirm',kick:'Most bills made law',big:ord(law.laws),text:`bills written by ${law.n} became law, the most of anyone since 1947.`});
  if(rej[0])cards.push({a:rej[0],cat:'ethics',kick:'Turned down by the Senate',big:`${rej[0].vote.y}–${rej[0].vote.nn}`,text:`${rej[0].n} was rejected for ${rej[0].vote.pos} in ${rej[0].vote.d.slice(0,4)}. ${rej.length} top nominees have been voted down.`});
  if(tie[0])cards.push({a:tie[0],cat:'confirm',kick:'Dead-even votes',big:`${tie.length}`,text:`nominations tied in the Senate since 1789. Most recent: ${tie[0].n}, ${tie[0].vote.d.slice(0,4)}.`});
  return cards;
}
function archiveCarousel(){
  if(!H)return '';
  return `<section class="sec"><div class="sh"><h2>From the archives</h2><button data-hist>Explore</button></div><div class="carousel">${archiveCards().map(c=>{const who=c.p||c.a;
   return `<button class="hcard c-${c.cat}" ${c.p?(HC[c.p.id]?`data-p="${c.p.id}"`:`data-hp="${c.p.id}"`):`data-ha="${c.a.id}"`}><div class="sk">${CAT[c.cat].icon}<span>${c.kick}</span></div><div class="sbig">${esc(c.big)}</div><p>${esc(c.text)}</p><div class="who">${hFace(who,40)}<span><b>${esc(who.n)}</b><br><span>${esc(c.p?((c.p.t.at(-1)||[])[5]||''):(who.ttl||''))}</span></span></div></button>`}).join('')}</div></section>`;
}
/* ---------- History filters: exact year range + segmented controls ---------- */
const HY_MIN=1789,HY_MAX=new Date().getFullYear();
const HY_PRESETS=[['All time',HY_MIN,HY_MAX],['Since 2000',2000,HY_MAX],['1950–1999',1950,1999],['1900–1949',1900,1949],['Civil War',1861,1865],['1850–1899',1850,1899],['1789–1849',HY_MIN,1849]];
const hyOn=()=>S.hy0>HY_MIN||S.hy1<HY_MAX;
const overlap=(a,b)=>(b??a)>=S.hy0&&a<=S.hy1;
/* Congress terms that fall inside the chosen years (and chamber) */
const memberIn=p=>(p.t||[]).some(t=>(t[0]==='H'||t[0]==='S')&&(S.hch==='All'||t[0]===S.hch)&&overlap(t[1],Math.min(t[2]||t[1],HY_MAX)));
const appIn=a=>!hyOn()||(a.fy?overlap(a.fy,a.ly||a.fy):false);
const execIn=p=>!hyOn()||(p.t||[]).some(t=>(t[0]==='P'||t[0]==='V')&&overlap(t[1],Math.min(t[2]||t[1],HY_MAX)));
const HYH={};
function yearHist(kind){
  if(HYH[kind])return HYH[kind];
  const lo=Math.floor(HY_MIN/10)*10,n=Math.floor(HY_MAX/10)-lo/10+1,c=new Array(n).fill(0);
  const add=(a,b)=>{if(!a)return;for(let d=Math.floor(Math.max(a,HY_MIN)/10);d<=Math.floor(Math.min(b||a,HY_MAX)/10);d++)c[d-lo/10]++};
  if(kind==='members')PASTS.forEach(p=>{if(!p.chambers.length)return;const sp=(p.t||[]).filter(t=>t[0]==='H'||t[0]==='S');if(sp.length)add(Math.min(...sp.map(t=>t[1])),Math.max(...sp.map(t=>t[2]||t[1])))});
  else if(kind==='apps')APPS.forEach(a=>add(a.fy,a.ly||a.fy));
  else EXEC.forEach(p=>p.t.filter(t=>t[0]==='P'||t[0]==='V').forEach(t=>add(t[1],t[2])));
  return HYH[kind]={lo,c};
}
function yearCard(kind){
  const {lo,c}=yearHist(kind),mx=Math.max(...c,1),span=HY_MAX-HY_MIN;
  const pc=y=>((y-HY_MIN)/span*100).toFixed(2);
  const bars=c.map((v,i)=>{const d=lo+i*10,inR=d+9>=S.hy0&&d<=S.hy1;return `<i class="${inR?'on':''}" data-d="${d}" style="height:${Math.max(4,v/mx*100).toFixed(1)}%"></i>`}).join('');
  const label=S.hy0===S.hy1?`${S.hy0}`:`${S.hy0} – ${S.hy1===HY_MAX?'today':S.hy1}`;
  return `<div class="yrcard" id="yrcard" style="--a:${pc(S.hy0)};--b:${pc(S.hy1)}">
   <div class="yrtop"><div><span class="yrk">In office during</span><b class="yrval" id="yrval">${hyOn()?label:'All years'}</b></div>${hyOn()?`<button class="yrclear" data-hyset="${HY_MIN},${HY_MAX}">Clear</button>`:''}</div>
   <div class="yrhist" aria-hidden="true">${bars}</div>
   <div class="yrslide"><span class="trk"></span><span class="rng"></span>
    <input type="range" id="hy0" min="${HY_MIN}" max="${HY_MAX}" value="${S.hy0}" aria-label="Start year">
    <input type="range" id="hy1" min="${HY_MIN}" max="${HY_MAX}" value="${S.hy1}" aria-label="End year"></div>
   <div class="yrins"><label><span>From</span><input id="hyf" inputmode="numeric" maxlength="4" value="${S.hy0}" aria-label="From year"></label><span class="yrdash">–</span><label><span>To</span><input id="hyt" inputmode="numeric" maxlength="4" value="${S.hy1}" aria-label="To year"></label></div>
   <div class="yrpre">${HY_PRESETS.map(([l,a,b])=>`<button data-hyset="${a},${b}" aria-pressed="${S.hy0===a&&S.hy1===b}">${l}</button>`).join('')}</div>
  </div>`;
}
const seg=(key,opts,cur)=>`<div class="segc" role="group">${opts.map(([k,l,dot])=>`<button data-${key}="${k}" aria-pressed="${k===cur}">${dot?`<i style="background:var(--${dot})"></i>`:''}${l}</button>`).join('')}</div>`;
function hSummary(n,noun,bits){
  const act=bits.filter(Boolean);
  return `<div class="hsum"><span><b>${ord(n)}</b> ${noun}${act.length?` · ${act.map(esc).join(' · ')}`:''}</span>${act.length?`<button data-hreset>Reset filters</button>`:''}</div>`;
}
function historyScreen(){
  const q=S.q.trim().toLowerCase();
  let h=searchHeader('Any past member, president or appointee')+(typeof scopeHero==='function'?scopeHero():'');
  if(!H)return `<div class="wrap">${h}<div class="calm" style="margin-top:14px">${LOADERR.hist?`Couldn't load the history records (${esc(LOADERR.hist)}). Try reloading.`:'Loading 236 years of records…'}</div></div>`;
  S.hk=S.hk||'members';
  if(S.hy0==null){S.hy0=HY_MIN;S.hy1=HY_MAX}
  S.hparty=S.hparty||'All';S.hch=S.hch||'All';
  const yrBit=hyOn()?(S.hy0===S.hy1?`in ${S.hy0}`:`${S.hy0}–${S.hy1===HY_MAX?'today':S.hy1}`):null;
  h+=`<div class="hseg" role="tablist">${[['members','Members',ord(PASTS.length)],['apps','Appointees',ord(APPS.length)],['exec','Presidents & VPs',EXEC.length]].map(([k,l,n])=>`<button role="tab" data-hk="${k}" aria-selected="${k===S.hk}">${l}<small>${n}</small></button>`).join('')}</div>`;
  h+=`<div class="hfilters">${yearCard(S.hk)}`;
  if(S.hk==='members'){
    S.hsort=S.hsort||'recent';
    h+=`<div class="hrow">${seg('hparty',[['All','All parties'],['D','Democrats',null,'D'],['R','Republicans',null,'R'],['I','Independents',null,'I'],['O','Other',null,'N']].map(([k,l,_,d])=>[k,l,d]),S.hparty)}${seg('hch',[['All','Both chambers'],['S','Senate'],['H','House']],S.hch)}</div></div>`;
    const pf=p=>S.hparty==='All'||(S.hparty==='O'?p.pc==='N':p.pc===S.hparty);
    const list=sortList(PASTS.filter(p=>p.chambers.length&&pf(p)&&((!hyOn()&&S.hch==='All')||memberIn(p))&&(!q||p.search.includes(q))),HSORT[S.hsort],S.hdir);
    const vf=HSORT[S.hsort][2];
    if(!q&&!hyOn()&&S.hparty==='All'&&S.hch==='All')h+=archiveCarousel();
    h+=`<div class="sec"><div class="sh"><h2>Former members of Congress</h2></div>${hSummary(list.length,'people',[yrBit,S.hparty!=='All'?{D:'Democrats',R:'Republicans',I:'Independents',O:'Other parties'}[S.hparty]:null,S.hch!=='All'?(S.hch==='S'?'Senate':'House'):null])}${hsortBar(HSORT,S.hsort,S.hdir,'h')}
     <div class="group" style="margin-top:10px">${list.slice(0,S.limit).map(p=>pastRow(p,vf?vf(p):null)).join('')||'<div class="empty">No one matches these filters.</div>'}</div>
     ${list.length>S.limit?`<button class="more" data-more>Show ${Math.min(list.length-S.limit,100)} more</button>`:''}
     <div class="cap">Everyone who has served in the House or Senate since 1789. The year filter matches anyone holding a seat at any point in that period. Bills are tracked from 1947, campaign money from 1980, individual stock trades from 2012.</div></div>`;
  }else if(S.hk==='apps'){
    S.asort=S.asort||'recent';S.acat=S.acat||'All';
    const cats=['All','Cabinet & top officials','Judges','Senate votes','Ethics filings'];
    h+=`<div class="hrow">${seg('acat',cats.map(c=>[c,c==='All'?'All types':c]),S.acat)}</div></div>`;
    let base=APPS.filter(a=>(S.acat==='All'||a.cat===S.acat)&&appIn(a)&&(!q||a.search.includes(q)));
    if(S.asort==='close')base=base.filter(a=>a.vote);
    const list=sortList(base,ASORT[S.asort],S.adir);const vf=ASORT[S.asort][2];
    if(!q&&!hyOn()&&S.acat==='All')h+=archiveCarousel();
    h+=`<div class="sec"><div class="sh"><h2>Past appointees</h2></div>${hSummary(list.length,'people',[yrBit,S.acat!=='All'?S.acat:null])}${hsortBar(ASORT,S.asort,S.adir,'a')}
     <div class="group" style="margin-top:10px">${list.slice(0,S.limit).map(a=>appRow(a,vf?vf(a):null)).join('')||'<div class="empty">No one matches these filters.</div>'}</div>
     ${list.length>S.limit?`<button class="more" data-more>Show ${Math.min(list.length-S.limit,100)} more</button>`:''}
     <div class="cap">Cabinet members and top officials since 1789, every federal judge, every nominee who got a recorded Senate vote, and officials who filed ethics reports since 2016.</div></div>`;
  }else{
    h+=`</div>`;
    const list=EXEC.filter(p=>execIn(p)&&(!q||p.search.includes(q)));
    h+=`<div class="sec"><div class="sh"><h2>Presidents & vice presidents</h2></div>${hSummary(list.length,'people',[yrBit])}<div class="group" style="margin-top:10px">${list.map(p=>{const ex=p.t.filter(t=>t[0]==='P'||t[0]==='V');const r=ex.map(t=>`${t[0]==='P'?'President':'VP'} ${t[1]}–${t[2]>2026?'now':t[2]}`);
      return `<button class="row" ${HC[p.id]?`data-p="${p.id}"`:`data-hp="${p.id}"`}>${hFace(p,44)}<span style="min-width:0"><span class="t">${esc(p.n)}</span><br><span class="s">${esc([...new Set(r)].slice(0,2).join(' · '))}${ex[0]?.[5]?' · '+esc(ex.at(-1)[5]):''}</span></span><span class="rr">${chev}</span></button>`}).join('')||'<div class="empty">No one matches these filters.</div>'}</div></div>`;
  }
  return `<div class="wrap">${h}</div>`;
}
/* live slider feedback without re-rendering; commit on release / Enter / blur */
function setHY(a,b){a=Math.round(+a);b=Math.round(+b);if(!isFinite(a))a=HY_MIN;if(!isFinite(b))b=HY_MAX;a=Math.min(Math.max(a,HY_MIN),HY_MAX);b=Math.min(Math.max(b,HY_MIN),HY_MAX);if(a>b)[a,b]=[b,a];
  if(a===S.hy0&&b===S.hy1)return;S.hy0=a;S.hy1=b;S.limit=60;const y=scrollY;render();scrollTo(0,y)}
function bindYearCard(){
  const card=$('#yrcard');if(!card)return;
  const r0=$('#hy0'),r1=$('#hy1'),f=$('#hyf'),t=$('#hyt'),val=$('#yrval'),span=HY_MAX-HY_MIN;
  const live=()=>{let a=+r0.value,b=+r1.value;if(a>b){if(document.activeElement===r0)r0.value=a=b;else r1.value=b=a}
    card.style.setProperty('--a',(a-HY_MIN)/span*100);card.style.setProperty('--b',(b-HY_MIN)/span*100);
    f.value=a;t.value=b;val.textContent=a===b?a:`${a} – ${b===HY_MAX?'today':b}`;
    card.querySelectorAll('.yrhist i').forEach(i=>{const d=+i.dataset.d;i.classList.toggle('on',d+9>=a&&d<=b)})};
  [r0,r1].forEach(r=>{r.addEventListener('input',live);r.addEventListener('change',()=>setHY(r0.value,r1.value))});
  const commit=()=>{const a=f.value.trim(),b=t.value.trim();setHY(/^\d{4}$/.test(a)?a:S.hy0,/^\d{4}$/.test(b)?b:S.hy1)};
  [f,t].forEach(i=>{i.addEventListener('input',()=>{i.value=i.value.replace(/\D/g,'').slice(0,4)});i.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();commit()}});i.addEventListener('blur',e=>{if(!e.relatedTarget||!e.relatedTarget.closest('.yrins'))commit()});i.addEventListener('focus',()=>i.select())});
}
function pastHits(q){
  if(!H||!q)return '';
  const bh=billHits(q);
  const pm=PASTS.filter(p=>p.chambers.length&&p.search.includes(q)).sort((a,b)=>(b.lastY||0)-(a.lastY||0)).slice(0,5);
  const am=APPS.filter(a=>a.search.includes(q)).slice(0,5);
  return `${pm.length?`<div class="sec"><div class="sh"><h2>Former members</h2><button data-f="History">See all</button></div><div class="group">${pm.map(p=>pastRow(p)).join('')}</div></div>`:''}
   ${am.length?`<div class="sec"><div class="sh"><h2>Past appointees</h2><button data-hkgo="apps">See all</button></div><div class="group">${am.map(a=>appRow(a)).join('')}</div></div>`:''}${bh}`;
}

/* ---------- bill pages ---------- */
const BTY={hr:'H.R.',s:'S.',hjres:'H.J.Res.',sjres:'S.J.Res.'};
const BURL={hr:'house-bill',s:'senate-bill',hjres:'house-joint-resolution',sjres:'senate-joint-resolution'};
const nth=n=>n+({1:'st',2:'nd',3:'rd'}[(n%100>10&&n%100<14)?0:n%10]||'th');
const bkParse=k=>{const [c,ty,n]=k.split('-');return {c:+c,ty,n:+n,label:`${BTY[ty]||ty} ${n}`,dk:ty.toUpperCase()+n}};
const key119=b=>{const m=billKey(b).match(/^(HR|S|HJRES|SJRES)(\d+)$/);return m?`119-${m[1].toLowerCase()}-${m[2]}`:null};
const hasBill=k=>!!(H&&k&&H.bills[k]);
const billTitle=k=>{const b=H.bills[k];return b?(b[1]||b[0]):''};
function billStatus(b,ty){
  const ms=b[10];if(ms.L||b[11])return ['Became law','Yes'];if(ms.V)return ['Vetoed','No'];if(ms.P)return ['Sent to President',''];
  if(ms.H&&ms.S)return ['Passed both chambers',''];if(ms.H)return ['Passed the House',''];if(ms.S)return ['Passed the Senate',''];return ['Introduced','off'];
}
function billRow(k,sub,right){
  const b=H&&H.bills[k],p=bkParse(k);
  const title=b?(b[1]||b[0]):sub;
  return `<button class="row plain" ${b?`data-bk="${k}"`:''} style="grid-template-columns:1fr auto auto;${b?'':'cursor:default'}"><span style="min-width:0"><span class="t clamp">${esc(title||p.label)}</span><span class="s">${esc(p.label)} · ${congLabel(p.c)}${b?' · '+billStatus(b,p.ty)[0]:''}</span></span>${right||''}${b?chev:''}</button>`;
}
function billPage(k){
  const b=H?.bills[k];if(!b)return `<div class="wrap"><div class="empty">Bill not found.</div></div>`;
  const p=bkParse(k),[title,short,spId,spn,intro,cos,cosp,pa,com,sum,ms,law,la,votes]=b;
  const [st,stc]=billStatus(b,p.ty);
  const sp=byId[spId]||HP[spId];
  const lob=p.c===119?DATA.bills[p.dk]:null;
  const senateFirst=p.ty[0]==='s';
  const steps=[['Introduced',intro],senateFirst?['Senate',ms.S]:['House',ms.H],senateFirst?['House',ms.H]:['Senate',ms.S],['President',ms.P||ms.L||ms.V],[ms.V&&!ms.L?'Vetoed':'Law',ms.L||(ms.V&&!ms.L?ms.V:'')]];
  const done=steps.filter(s=>s[1]).length;
  const cs=['D','R','I'].map(x=>[x,cosp[x]||0]).filter(x=>x[1]);
  const pb=(lbl,a)=>a&&a[0]+a[1]?`<div class="pbar"><span>${lbl}</span><span class="bar"><span style="width:${a[0]/(a[0]+a[1])*100}%;background:var(--yes)"></span><span style="width:${a[1]/(a[0]+a[1])*100}%;background:var(--no)"></span></span><span class="num">${a[0]}–${a[1]}</span></div>`:'';
  const spRow=sp?(byId[spId]?memRow(byId[spId],'Sponsor'):pastRow(sp,'Sponsor')):`<div class="row plain" style="cursor:default"><span class="t">${esc(spn)}</span></div>`;
  return `<header class="pnav" id="nav"><div class="in"><button data-back aria-label="Back">${ICONS.back}</button><span class="mid">${esc(p.label)}</span><button data-share aria-label="Share">${ICONS.share}</button></div></header>
  <section class="phero p-N bg-library"><div class="in"><span class="billno">${esc(p.label)}</span><h1 style="font-size:${(short||title).length>80?24:30}px">${esc(short||title)}</h1><div class="psub">${nth(p.c)} Congress · ${congLabel(p.c)}</div>
   <div class="pchips"><span>${esc(st)}</span>${pa?`<span>${esc(pa)}</span>`:''}${law?`<span>${esc(law)}</span>`:''}</div></div></section>
  <div class="wrap" data-cong="${p.c}" data-ch="${p.ty[0]==='s'?'S':'H'}">
   <div class="glance">${glance('Status',stc==='Yes'?'Law':stc==='No'?'Vetoed':done+'/5',esc(st),stc==='No')}${cos==null?glance('Topic',esc((pa||'—').split(' ')[0]),esc(pa||''),false):glance('Co-sponsors',ord(cos),cs.length?cs.map(x=>`${x[1]} ${x[0]}`).join(' · '):'none',false)}${lob?glance('Groups lobbied',ord(lob.n),'on this bill',false):votes.length||p.c>=108?glance('Roll calls',votes.length,'recorded votes',false):glance('Signed',ms.L?ms.L.slice(0,4):'—',law?esc(law.replace('Public Law ','P.L. ')):'',false)}</div>
   <div class="sec"><div class="sh"><h2>Where it stands</h2></div><div class="group pad"><div class="steps">${steps.map(([l,d],i)=>`<div class="step ${d?'on':''} ${l==='Vetoed'?'veto':''}"><i></i><b>${l}</b><span>${d==='?'?'Yes':d?fmtISO(d):'—'}</span></div>`).join('')}</div>
    ${la?.[1]?`<p class="s" style="margin:12px 0 0;font-size:14px;color:var(--soft)">Latest: ${esc(la[1])} (${fmtISO(la[0])})</p>`:''}</div></div>
   ${sum?`<div class="sec"><div class="sh"><h2>What it does</h2></div><div class="group pad"><p class="bio">${esc(sum)}</p></div><div class="cap">Summary by the nonpartisan Congressional Research Service, shortened.</div></div>`:''}
   ${short&&title!==short?`<div class="sec"><div class="sh"><h2>Official title</h2></div><div class="group pad"><p class="bio">${esc(title)}</p></div></div>`:''}
   <div class="sec"><div class="sh"><h2>Who's behind it</h2></div><div class="group">${spRow}</div>
    ${cs.length?`<div class="group pad" style="margin-top:10px"><div class="stack">${cs.map(([x,n])=>`<span style="width:${n/cos*100}%;background:var(--${x})"></span>`).join('')}</div><div class="mini-legend" style="margin-top:8px">${cs.map(([x,n])=>`<span><i style="background:var(--${x})"></i>${n} ${PN[x]}${n>1?'s':''}</span>`).join('')}</div></div><div class="cap">Co-sponsors by party.</div>`:''}</div>
   ${votes.length?`<div class="sec"><div class="sh"><h2>How Congress voted</h2></div><div class="group">${votes.map(v=>`<div class="item"><div style="display:flex;justify-content:space-between;gap:8px"><b>${esc(v[5])}</b><span class="cast ${(/fail|reject|not (agreed|sustained|passed)/i.test(v[4])?false:/pass|agreed|adopted|confirmed/i.test(v[4])?true:v[2]>v[3])?'Yes':'No'}">${v[2]}–${v[3]}</span></div><p class="s" style="color:var(--soft);font-size:14px;margin:4px 0 8px">${v[0]==='H'?'House':'Senate'} · ${fmtISO(v[1])}${v[4]?' · '+esc(v[4]):''}</p><div class="pbars">${pb('Republicans',v[6].R)}${pb('Democrats',v[6].D)}${pb('Independents',v[6].I)}</div></div>`).join('')}</div></div>`:''}
   ${lob?`<div class="sec"><div class="sh"><h2>Who lobbied on it</h2></div><div class="group pad"><div class="bigline"><b>${ord(lob.n)}</b><span>organizations named it in lobbying reports, ${esc(DATA.lobby.periods)}</span></div></div><div class="group" style="margin-top:10px">${lob.top.map((c,i)=>{const id=G&&clientId(c);return `<button class="row plain" ${id?`data-lob="${id}"`:''} style="${id?'':'cursor:default'}"><span class="rank" style="font-size:18px">${i+1}</span><span class="t">${esc(c)}</span>${id?chev:'<span></span>'}</button>`}).join('')}</div><div class="cap">Biggest spenders among them. Reports don't say which side a group was on.</div></div>`:''}
   ${com?.length?`<div class="sec"><div class="sh"><h2>Committees</h2></div><div class="group">${com.map(c=>{const id=commFor(c.replace(/ Committee$/,''),p.ty[0]==='s'?'S':'H');return id?`<button class="row plain" data-com="${id}" style="grid-template-columns:1fr auto"><span class="t">${esc(c)}</span>${chev}</button>`:`<div class="row kv"><span class="v" style="text-align:left">${esc(c)}</span></div>`}).join('')}</div></div>`:''}
   <div class="sec"><div class="group"><a class="row plain" style="grid-template-columns:1fr auto" href="https://www.congress.gov/bill/${nth(p.c)}-congress/${BURL[p.ty]}/${p.n}" target="_blank" rel="noopener"><span>Full text and every action on Congress.gov</span>${chev}</a></div></div>
   <div class="note">${p.c<108?'From the Congressional Bills Project (Adler and Wilkerson), which covers bills from 1947 to 2002.':`From GovInfo bill records, Congressional Research Service summaries, Voteview roll calls${lob?' and lobbying reports':''}.`}</div>
  </div>`;
}
function billHits(q){
  if(!H||q.length<3)return '';
  const m=q.replace(/[.\s]/g,'').match(/^(hr|s|hjres|sjres)(\d+)$/i);
  let ks=[];
  if(m)ks=Object.keys(H.bills).filter(k=>{const p=bkParse(k);return p.ty===m[1].toLowerCase()&&p.n===+m[2]}).sort((a,b)=>bkParse(b).c-bkParse(a).c);
  else if(q.length>=4)ks=Object.keys(H.bills).filter(k=>(H.bills[k][1]||'').toLowerCase().includes(q)).sort((a,b)=>bkParse(b).c-bkParse(a).c);
  ks=ks.slice(0,5);
  return ks.length?`<div class="sec"><div class="sh"><h2>Bills</h2></div><div class="group">${ks.map(k=>billRow(k)).join('')}</div></div>`:'';
}

function controlChart(p){
  if(!H?.control||(p!=='D'&&p!=='R'))return '';
  const rows=H.control;const W=320,h=150,n=rows.length,bw=W/n;
  const bar=(k,y0,hh)=>rows.map((r,i)=>{const t=r[k]+r[k+1]+r[k+2]||1;const d=r[k]/t,rr=r[k+1]/t;return `<rect x="${(i*bw).toFixed(2)}" y="${y0}" width="${(bw+.3).toFixed(2)}" height="${(hh*d).toFixed(1)}" style="fill:var(--D)"/><rect x="${(i*bw).toFixed(2)}" y="${(y0+hh*(1-rr)).toFixed(1)}" width="${(bw+.3).toFixed(2)}" height="${(hh*rr).toFixed(1)}" style="fill:var(--R)"/>`}).join('');
  const mine=rows.filter(r=>{const iH=p==='D'?1:2,oH=p==='D'?2:1;return r[iH]>r[oH]}).length;
  const ticks=[0,Math.floor(n/2),n-1].map(i=>`<text class="tl" x="${(i*bw+bw/2).toFixed(1)}" y="${h-4}" text-anchor="${i===0?'start':i===n-1?'end':'middle'}">${1787+2*rows[i][0]}</text>`).join('');
  return `<div class="sec"><div class="sh"><h2>Who has controlled Congress</h2></div><div class="group pad">
   <svg class="chart" viewBox="0 0 ${W} ${h}" role="img" aria-label="Share of seats by party since 1857"><text class="tl" x="0" y="10">House</text>${bar(1,14,52)}<text class="tl" x="0" y="82">Senate</text>${bar(4,86,46)}<line class="g" x1="0" x2="${W}" y1="40" y2="40" style="stroke-dasharray:2 3"/><line class="g" x1="0" x2="${W}" y1="109" y2="109" style="stroke-dasharray:2 3"/>${ticks}</svg>
   <div class="mini-legend" style="margin-top:8px"><span><i style="background:var(--D)"></i>Democrats</span><span><i style="background:var(--R)"></i>Republicans</span><span><i style="background:var(--seg)"></i>Others</span></div></div>
   <div class="cap">Share of seats in every Congress since 1857 (the first with both modern parties). ${PARTYNAME[p]} held a House majority in ${mine} of ${n} Congresses.</div></div>`;
}
