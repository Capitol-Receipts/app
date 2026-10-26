/* ================= party summaries: identical measures for every party ================= */
const PARTYNAME={D:'Democrats',R:'Republicans',I:'Independents'};
const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
const sum=a=>a.reduce((x,y)=>x+y,0);
let PSTAT={};
function partyStats(p){
  if(PSTAT[p])return PSTAT[p];
  const ms=MEM.filter(m=>m.party===p),v=ms.filter(m=>!m.delegate);
  const att=v.filter(m=>m.elig>=50&&m.id!==SPEAKER),money=ms.filter(m=>m.money),big=money.filter(m=>m.money.rec>=50000);
  const mix={small:0,big:0,pac:0,party:0,self:0,other:0};
  money.forEach(m=>{const f=m.money,s=f.small||0,b=Math.max(0,f.indiv-s);mix.small+=s;mix.big+=b;mix.pac+=f.pac;mix.party+=f.party;mix.self+=f.self;mix.other+=Math.max(0,f.rec-s-b-f.pac-f.party-f.self)});
  return PSTAT[p]={p,ms,v,n:ms.length,sen:ms.filter(m=>m.chamber==='Senate').length,house:ms.filter(m=>m.chamber==='House'&&!m.delegate).length,del:ms.filter(m=>m.delegate).length,
    age:avg(ms.filter(m=>m.age).map(m=>m.age)),years:avg(ms.map(m=>m.years)),
    missed:avg(att.map(m=>m.missed)),missedMed:att.length?median(att.map(m=>m.missed)):null,
    unity:avg(v.filter(m=>m.unity!=null&&m.unityN>=50).map(m=>m.unity)),
    raisedTot:sum(money.map(m=>m.money.rec)),raised:avg(money.map(m=>m.money.rec)),raisedMed:money.length?median(money.map(m=>m.money.rec)):null,
    small:avg(big.filter(m=>m.smallShare!=null).map(m=>m.smallShare)),pac:avg(big.map(m=>m.pacShare)),cash:avg(money.map(m=>m.money.coh)),mix,
    traders:v.filter(m=>m.tradeN>0).length,trades:sum(v.map(m=>m.tradeN)),tradesAvg:avg(v.map(m=>m.tradeN)),tradesMed:v.length?median(v.map(m=>m.tradeN)):0,
    comm:sum(v.map(m=>m.commTrades)),rev:sum(v.map(m=>m.revN)),revAvg:avg(v.map(m=>m.revN)),eth:ms.filter(m=>m.ethN).length,agg:DATA.parties?.[p]||{}};
}
const topIn=(list,f,n=5)=>[...list].filter(m=>f(m)!=null&&f(m)>0).sort((a,b)=>f(b)-f(a)).slice(0,n);
function partyPage(p){
  if(typeof PARTYNAME==='undefined'||!PARTYNAME[p])return `<div class="wrap"><div class="empty" style="padding-top:calc(var(--navh) + 24px)"><p>We couldn’t find that party.</p><button class="abtn sm" data-guardhome>Go to the home screen</button></div></div>`;
  const s=partyStats(p),o=['D','R','I'].filter(x=>x!==p),main=o.find(x=>x!=='I');
  const os=partyStats(main||'D');
  const mixParts=[['Small donors',s.mix.small,'var(--c-money)'],['Big donors',s.mix.big,'color-mix(in srgb,var(--c-money) 55%,var(--surface))'],['PACs',s.mix.pac,'var(--ink)'],['Party, self & other',s.mix.party+s.mix.self+s.mix.other,'var(--fill3)']].filter(x=>x[1]>0);
  const ind=(s.agg.industries||[]).filter(r=>!/^(Other or not listed|Not employed|Retired|Other business|Politicians|Party committees)/.test(r[0])).slice(0,3);
  const cmp=(label,a,b,fmt)=>a==null||b==null?'':`<div class="cmprow"><span>${label}</span><b class="pc-${p}">${fmt(a)}</b><b class="pc-${main}">${fmt(b)}</b></div>`;
  return `<header class="pnav" id="nav"><div class="in"><button data-back aria-label="Back">${ICONS.back}</button><span class="mid">${PARTYNAME[p]}</span><span style="width:36px"></span></div></header>
  <section class="phero p-${p} bg-capfull"><div class="in">
    <div class="pbadge">${p}</div><h1>${PARTYNAME[p]} in Congress</h1>
    <div class="psub">${s.sen} senator${s.sen===1?'':'s'} · ${s.house} House member${s.house===1?'':'s'}${s.del?` · ${s.del} delegate${s.del>1?'s':''}`:''}</div>
    <div class="pchips"><span>Average age ${Math.round(s.age)}</span><span>Average ${Math.round(s.years)} years in Congress</span></div>
    <button class="follow" data-plist="${p}">See all ${s.n} members</button>
  </div></section>
  <div class="wrap">
   <div class="glance">${glance('Avg votes missed',pct(s.missed,1),`Typical ${pct(s.missedMed,1)}`)}${glance('Avg raised',M(s.raised),`Typical ${M(s.raisedMed)}`)}${glance('Avg stock trades',s.tradesAvg.toFixed(1),`Typical ${s.tradesMed}`)}</div>
   ${p==='I'?'<div class="calm" style="margin-top:14px">With only a few independents, one person can swing these averages a lot.</div>':''}
   ${main?`<section class="sec"><div class="sh"><h2>Side by side</h2><button data-compare>All parties</button></div><div class="group pad cmp">
     <div class="cmprow head"><span></span><b class="pc-${p}">${PARTYNAME[p]}</b><b class="pc-${main}">${PARTYNAME[main]}</b></div>
     ${cmp('Votes missed',s.missed,os.missed,x=>pct(x,1))}${cmp('Votes with own party',s.unity,os.unity,x=>pct(x,1))}${cmp('Raised per member',s.raised,os.raised,M)}${cmp('From small donors',s.small,os.small,x=>pct(x))}${cmp('From PACs',s.pac,os.pac,x=>pct(x))}${cmp('Members who trade stocks',s.traders/s.v.length,os.traders/os.v.length,x=>pct(x))}${cmp('Stock trades per member',s.tradesAvg,os.tradesAvg,x=>x.toFixed(1))}${cmp('Ex-staff lobbyists per member',s.revAvg,os.revAvg,x=>x.toFixed(1))}
     </div><div class="cap">Averages across each party's members. Same formulas for both.</div></section>`:''}
   <section class="sec"><div class="topics">
    ${topicCard('money','Who funds them',`Raised <b>${M(s.raisedTot)}</b> together for 2026.${ind.length?` Biggest industries: <b>${ind.map(r=>esc(r[0].toLowerCase())).join(', ')}</b>.`:''}`,
      `<div class="stack">${mixParts.map(x=>`<span style="width:${(x[1]/s.raisedTot*100).toFixed(1)}%;background:${x[2]}"></span>`).join('')}</div><div class="mini-legend">${mixParts.map(x=>`<span><i style="background:${x[2]}"></i>${x[0]} ${pct(x[1]/s.raisedTot)}</span>`).join('')}</div>`,'p-money')}
    ${topicCard('stocks','Stock trades',`<b>${s.traders}</b> of ${s.v.length} members reported trades, <b>${ord(s.trades)}</b> in all. <b class="hl">${ord(s.comm)}</b> were in industries their committees oversee.`,
      (s.agg.ticks||[]).length?`<div class="names">${s.agg.ticks.slice(0,3).map(t=>`<span>${esc(t[0])} <em>${t[1]} trades</em></span>`).join('')}</div>`:'','p-stocks')}
    ${topicCard('votes','Voting',`Members showed up for <b>${pct(1-s.missed,1)}</b> of votes on average and sided with their party <b>${pct(s.unity,0)}</b> of the time when the parties split.`,
      `<div class="meter"><span class="mf" style="width:${((s.unity||0)*100).toFixed(1)}%"></span></div><div class="sparkl"><span>Party loyalty</span><span>${pct(s.unity,1)}</span></div>`,'p-votes')}
    ${topicCard('influence','Lobbying & ethics',`<b>${ord(s.rev)}</b> former staffers of these members are now lobbyists. <b>${s.eth}</b> member${s.eth===1?' has':'s have'} House Ethics Committee statements since 2025.`,'','p-influence')}
   </div></section>
   ${typeof controlChart==='function'?controlChart(p):''}
   <div class="note">Averages include every current member with data. "Typical" is the middle member, which is less affected by a few extreme cases.</div>
  </div>`;
}
function partyTopic(topic,p){
  const s=partyStats(p),list=(title,ms,f)=>`<div class="sec"><div class="sh"><h2>${title}</h2></div><div class="group">${ms.map(m=>memRow(m,f(m))).join('')||'<div class="empty">None</div>'}</div></div>`;
  const a=s.agg;
  if(topic==='p-money')openSheet(`${PARTYNAME[p]}: money`,`
    <div class="group"><div class="tiles"><div><b>${M(s.raisedTot)}</b><span>Raised together</span></div><div><b>${M(s.raised)}</b><span>Average per member</span></div><div><b>${pct(s.small)}</b><span>Avg from small donors</span></div><div><b>${pct(s.pac)}</b><span>Avg from PACs</span></div></div></div>
    ${a.industries?.length?`<div class="sec"><div class="sh"><h2>Money by industry</h2></div><div class="group pad">${hbars(a.industries.filter(r=>!/^(Other or not listed|Not employed)$/.test(r[0])).slice(0,10))}</div><div class="cap">Gifts over $200 plus PAC money to all ${PARTYNAME[p].toLowerCase()} in Congress.</div></div>`:''}
    ${a.pacs?.length?`<div class="sec"><div class="sh"><h2>Biggest PAC donors</h2></div><div class="group">${a.pacs.map(([n,v,c],i)=>`<div class="row plain" style="cursor:default"><span class="rank">${i+1}</span><span style="min-width:0"><span class="t">${esc(n)}</span><br><span class="s">${esc(c)}</span></span><span class="val">${M(v)}</span></div>`).join('')}</div></div>`:''}
    ${list('Top fundraisers',topIn(s.ms,m=>m.money?.rec),m=>M(m.money.rec))}${list('Most small-donor backed',topIn(s.ms.filter(m=>m.money?.rec>=50000),m=>m.smallShare),m=>pct(m.smallShare))}${list('Most PAC-funded',topIn(s.ms.filter(m=>m.money?.rec>=50000),m=>m.pacShare),m=>pct(m.pacShare))}`);
  if(topic==='p-stocks')openSheet(`${PARTYNAME[p]}: stock trades`,`
    <div class="group"><div class="tiles"><div><b>${s.traders}</b><span>Members who traded</span></div><div><b>${ord(s.trades)}</b><span>Trades in all</span></div><div><b>${s.tradesAvg.toFixed(1)}</b><span>Average per member</span></div><div><b>${ord(s.comm)}</b><span>Tied to their committees</span></div></div></div>
    ${a.ticks?.length?`<div class="sec"><div class="sh"><h2>Most traded stocks</h2></div><div class="group pad">${hbars(a.ticks.map(t=>[`${t[0]} · ${(t[2]||'').replace(/\b(INC|CORP|CO|LTD)\b\.?/gi,'').trim()}`,t[1]]),v=>v+' trades')}</div></div>`:''}
    ${a.sectors?.length?`<div class="sec"><div class="sh"><h2>By industry</h2></div><div class="group pad">${hbars(a.sectors,v=>v+' trades')}</div></div>`:''}
    ${list('Most active traders',topIn(s.v,m=>m.tradeN),m=>ord(m.tradeN))}${list('Most trades tied to committees',topIn(s.v,m=>m.commTrades),m=>m.commTrades)}`);
  if(topic==='p-votes')openSheet(`${PARTYNAME[p]}: voting`,`
    <div class="group"><div class="tiles"><div><b>${pct(s.missed,1)}</b><span>Avg votes missed</span></div><div><b>${pct(s.unity,1)}</b><span>Avg party loyalty</span></div></div></div>
    ${list('Most votes missed',topIn(s.v.filter(m=>m.elig>=100),m=>m.missed),m=>pct(m.missed,1))}${list('Most likely to break with the party',topIn(s.v.filter(m=>m.unityN>=100),m=>m.breaks),m=>pct(m.breaks,1))}`);
  if(topic==='p-influence')openSheet(`${PARTYNAME[p]}: lobbying & ethics`,`
    <div class="group"><div class="tiles"><div><b>${ord(s.rev)}</b><span>Ex-staff now lobbyists</span></div><div><b>${s.revAvg.toFixed(1)}</b><span>Average per member</span></div></div></div>
    ${list('Most former staff lobbying',topIn(s.v,m=>m.revN),m=>m.revN)}${list('House Ethics Committee statements',s.ms.filter(m=>m.ethN),m=>`<span class="tag off" style="font-family:var(--ui);font-size:12px">${esc(m.ethics[0][1])}</span>`)}`);
}
var comparePage=function(){
  const P=['D','R','I'].map(partyStats);
  const row=(label,f,fmt,note)=>{const vals=P.map(f),mx=Math.max(...vals.filter(x=>x!=null))||1;return `<div class="crow"><div class="cl">${label}${note?`<span>${note}</span>`:''}</div>${P.map((s,i)=>vals[i]==null?'':`<div class="cb"><span class="cn">${s.p}</span><span class="ct"><span class="pf-${s.p}" style="width:${(vals[i]/mx*100).toFixed(1)}%"></span></span><b>${fmt(vals[i])}</b></div>`).join('')}</div>`};
  return `<header class="pnav scrolled" id="nav"><div class="in"><button data-back aria-label="Back">${ICONS.back}</button><span class="mid" style="opacity:1">Compare the parties</span><span style="width:36px"></span></div></header>
  <div class="wrap" style="padding-top:calc(var(--navh) + env(safe-area-inset-top,0px) + 6px)">
   <div class="lbanner bg-old pghero"><h1>Side by side</h1></div>
   <div class="ptiles" style="margin-top:16px">${P.map(s=>`<button class="ptile p-${s.p}" data-party-page="${s.p}"><span class="pbadge sm">${s.p}</span><b>${s.n}</b><span>${PARTYNAME[s.p]}</span></button>`).join('')}</div>
   <section class="sec"><div class="sh"><h2>Votes</h2></div><div class="group pad">${row('Votes missed',s=>s.missed,x=>pct(x,1),'average')}${row('Votes with own party',s=>s.unity,x=>pct(x,1),'when parties split')}</div></section>
   <section class="sec"><div class="sh"><h2>Money</h2></div><div class="group pad">${row('Raised per member',s=>s.raised,M,'2025–26')}${row('From small donors',s=>s.small,x=>pct(x),'average share')}${row('From PACs',s=>s.pac,x=>pct(x),'average share')}${row('Cash on hand',s=>s.cash,M,'average')}</div></section>
   <section class="sec"><div class="sh"><h2>Stocks</h2></div><div class="group pad">${row('Members who trade',s=>s.traders/s.v.length,x=>pct(x),'share of members')}${row('Trades per member',s=>s.tradesAvg,x=>x.toFixed(1),'average')}${row('Tied to committees',s=>s.comm/s.v.length,x=>x.toFixed(2),'per member')}</div></section>
   <section class="sec"><div class="sh"><h2>Lobbying & people</h2></div><div class="group pad">${row('Ex-staff now lobbyists',s=>s.revAvg,x=>x.toFixed(1),'per member')}${row('Age',s=>s.age,x=>Math.round(x),'average')}${row('Years in Congress',s=>s.years,x=>x.toFixed(1),'average')}</div></section>
   <div class="note">Every party is measured with the same formulas. Independents are only ${partyStats('I').n} people, so their averages move a lot with one person.</div>
  </div>`;
};

/* ================= compare v2: visual, story-first ================= */
function statsFor(p,ch){
  const ms=MEM.filter(m=>m.party===p&&!m.delegate&&(ch==='All'||m.chamber===ch));
  const att=ms.filter(m=>m.elig>=50&&m.id!==SPEAKER),money=ms.filter(m=>m.money),big=money.filter(m=>m.money.rec>=50000);
  const mix={small:0,big:0,pac:0,other:0};
  money.forEach(m=>{const f=m.money,s=f.small||0,b=Math.max(0,f.indiv-s);mix.small+=s;mix.big+=b;mix.pac+=f.pac;mix.other+=Math.max(0,f.rec-s-b-f.pac)});
  const ind={};ms.forEach(m=>(m.industries||[]).forEach(([k,a,b])=>{ind[k]=(ind[k]||0)+a+Math.max(0,b)}));
  const tk={};ms.forEach(m=>(m.tradeStats?.ticks||[]).forEach(([t,n])=>{tk[t]=(tk[t]||0)+n}));
  return {p,ms,n:ms.length,ages:ms.filter(m=>m.age).map(m=>m.age),age:avg(ms.filter(m=>m.age).map(m=>m.age)),
    present:avg(att.map(m=>m.present)),unity:avg(ms.filter(m=>m.unity!=null&&m.unityN>=50).map(m=>m.unity)),
    raised:avg(money.map(m=>m.money.rec)),small:avg(big.filter(m=>m.smallShare!=null).map(m=>m.smallShare)),pac:avg(big.map(m=>m.pacShare)),mix,
    traderShare:ms.length?ms.filter(m=>m.tradeN>0).length/ms.length:0,trades:avg(ms.map(m=>m.tradeN)),tradesMed:ms.length?median(ms.map(m=>m.tradeN)):0,topTrader:[...ms].sort((x,y)=>y.tradeN-x.tradeN)[0],comm:avg(ms.map(m=>m.commTrades)),
    rev:avg(ms.map(m=>m.revN)),years:avg(ms.map(m=>m.years)),ind,tk};
}
function hemicycle(counts,total){
  /* seats arranged in semicircle rows, left to right: D, I, R */
  const rows=total>200?12:6,W=340,H=180,cx=W/2,cy=H-6,R0=48,R1=164;
  const radii=Array.from({length:rows},(_,i)=>R0+(R1-R0)*i/(rows-1)),tot=radii.reduce((a,b)=>a+b,0);
  let per=radii.map(r=>Math.round(total*r/tot));let diff=total-per.reduce((a,b)=>a+b,0);per[per.length-1]+=diff;
  const seats=[];radii.forEach((r,i)=>{const n=per[i];for(let k=0;k<n;k++){const a=Math.PI-(n===1?Math.PI/2:Math.PI*k/(n-1));seats.push({a,x:cx+r*Math.cos(a),y:cy-r*Math.sin(a)})}});
  seats.sort((s,t)=>t.a-s.a);
  const order=[];['D','I','R'].forEach(p=>{for(let i=0;i<(counts[p]||0);i++)order.push(p)});
  const rad=total>200?5.4:9;
  return `<svg class="hemi" viewBox="0 0 ${W} ${H}" role="img" aria-label="Seats by party">${seats.map((s,i)=>`<circle cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" r="${rad}" class="seat s-${order[i]||'V'}"/>`).join('')}</svg>`;
}
function donut(parts,total,label){
  const r=42,C=2*Math.PI*r;let off=0;
  return `<svg class="donut" viewBox="0 0 110 110" role="img">${parts.map(([k,v,col])=>{const len=v/total*C,s=`<circle cx="55" cy="55" r="${r}" fill="none" stroke="${col}" stroke-width="16" stroke-dasharray="${len.toFixed(2)} ${(C-len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 55 55)"/>`;off+=len;return s}).join('')}<text x="55" y="52" text-anchor="middle" class="dn1">${label[0]}</text><text x="55" y="68" text-anchor="middle" class="dn2">${label[1]}</text></svg>`;
}
function waffle(share,p){const n=Math.round(share*100);return `<div class="waffle">${Array.from({length:100},(_,i)=>`<i class="${i<n?'w-'+p:''}"></i>`).join('')}</div>`}
function gauge(v,p,label){const a=Math.PI*(1-v),x=60+46*Math.cos(a),y=58-46*Math.sin(a);
  return `<div class="gauge"><svg viewBox="0 0 120 66"><path d="M14 58 A46 46 0 0 1 106 58" class="gtr"/><path d="M14 58 A46 46 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)}" class="gf-${p}"/></svg><b>${pct(v,1)}</b><span>${label}</span></div>`}
function agePyramid(A,B){
  const lo=25,hi=95,bw=5,bins=[];for(let a=lo;a<hi;a+=bw)bins.push(a);
  const cnt=(ages)=>bins.map(b=>ages.filter(x=>x>=b&&x<b+bw).length);
  const ca=cnt(A.ages),cb=cnt(B.ages),mx=Math.max(...ca,...cb,1);
  return `<div class="pyr">${bins.map((b,i)=>`<div class="pr"><span class="pl"><i class="bar-${A.p}" style="width:${ca[i]/mx*100}%"></i></span><em>${b}s</em><span class="pr2"><i class="bar-${B.p}" style="width:${cb[i]/mx*100}%"></i></span></div>`).filter((_,i)=>ca[i]||cb[i]).join('')}</div>
   <div class="pyrlab"><span class="pc-${A.p}">${PARTYNAME[A.p]} · avg ${Math.round(A.age)}</span><span class="pc-${B.p}">${PARTYNAME[B.p]} · avg ${Math.round(B.age)}</span></div>`;
}
function butterfly(A,B){
  const skip=/^(Other or not listed|Not employed|Other business|Retired)$/;
  const ta=Object.values(A.ind).reduce((a,b)=>a+b,0)||1,tb=Object.values(B.ind).reduce((a,b)=>a+b,0)||1;
  const keys=[...new Set([...Object.keys(A.ind),...Object.keys(B.ind)])].filter(k=>!skip.test(k)).sort((x,y)=>((B.ind[y]||0)/tb+(A.ind[y]||0)/ta)-((B.ind[x]||0)/tb+(A.ind[x]||0)/ta)).slice(0,9);
  const sa=k=>(A.ind[k]||0)/ta,sb=k=>(B.ind[k]||0)/tb,mx=Math.max(...keys.map(k=>Math.max(sa(k),sb(k))),.01);
  return `<div class="bfly">${keys.map(k=>`<div class="bf"><span class="bl"><b>${pct(sa(k))}</b><i class="bar-${A.p}" style="width:${sa(k)/mx*100}%"></i></span><em>${esc(k)}</em><span class="br"><i class="bar-${B.p}" style="width:${sb(k)/mx*100}%"></i><b>${pct(sb(k))}</b></span></div>`).join('')}</div>`;
}
function diffStories(A,B){
  const items=[
    ['money',A.small,B.small,'Average share of campaign money from small donors',x=>pct(x),'pts',H=>`${H} get more of their money from small donors`],
    ['money',A.pac,B.pac,'Average share of campaign money from PACs',x=>pct(x),'pts',H=>`${H} lean more on PAC money`],
    ['money',A.raised,B.raised,'Average raised per member, 2025–26',M,'x',(H,r)=>`${H} raise ${r}× as much per member`],
    ['stocks',A.trades,B.trades,`Average stock trades per member since January 2025. A few heavy traders drive this: the typical member made ${A.tradesMed} (D) and ${B.tradesMed} (R), and the busiest was ${(A.topTrader?.tradeN||0)>(B.topTrader?.tradeN||0)?A.topTrader.name+' with '+ord(A.topTrader.tradeN):(B.topTrader?.name||'')+' with '+ord(B.topTrader?.tradeN||0)}`,x=>x.toFixed(1),'x',(H,r)=>`${H} make ${r}× as many stock trades`],
    ['stocks',A.traderShare,B.traderShare,'Share of members who reported any trade',x=>pct(x),'pts',H=>`More ${H.toLowerCase()} trade stocks`],
    ['stocks',A.comm,B.comm,'Average trades per member in industries their committees oversee',x=>x.toFixed(2),'x',(H,r)=>`${H} make ${r}× as many trades tied to their committees`],
    ['influence',A.rev,B.rev,'Average former staffers now registered as lobbyists',x=>x.toFixed(1),'x',(H,r)=>`${H} have ${r}× as many ex-staff lobbying`],
    ['votes',1-A.present,1-B.present,'Average share of votes missed',x=>pct(x,1),'pts',H=>`${H} miss more votes`],
    ['votes',A.age,B.age,'Average age',x=>Math.round(x),'x',H=>`${H} are older on average`]
  ].filter(r=>r[1]!=null&&r[2]!=null&&(r[1]||r[2]));
  items.forEach(r=>{const[a,b]=[r[1],r[2]];r.score=r[5]==='pts'?Math.abs(a-b)*3:Math.abs(Math.log((a+1e-9)/(b+1e-9)))});
  return items.sort((x,y)=>y.score-x.score).slice(0,3).map(([cat,a,b,label,fmt,kind,head])=>{
    const hiP=a>=b?A.p:B.p,hi=Math.max(a,b),lo=Math.min(a,b),r=lo>0?(hi/lo).toFixed(1).replace(/\.0$/,''):'many';
    return `<div class="dstory c-${cat}"><div class="sk">${CAT[cat].icon}<span>${CAT[cat].name}</span></div>
      <div class="dhead">${head(PARTYNAME[hiP],r)}</div>
      <div class="dbars"><div><span class="pc-${A.p}">${PARTYNAME[A.p]}</span><i class="bar-${A.p}" style="width:${(a/hi*100).toFixed(1)}%"></i><b>${fmt(a)}</b></div><div><span class="pc-${B.p}">${PARTYNAME[B.p]}</span><i class="bar-${B.p}" style="width:${(b/hi*100).toFixed(1)}%"></i><b>${fmt(b)}</b></div></div>
      <p>${esc(label)}.</p></div>`});
}
comparePage=function(){
  const ch=S.cmpCh||'All';
  const A=statsFor('D',ch),B=statsFor('R',ch),I=statsFor('I',ch);
  const seats=ch==='All'?null:{D:A.n,R:B.n,I:I.n};
  const mixParts=s=>[['Small donors',s.mix.small,'var(--c-money)'],['Big donors',s.mix.big,'color-mix(in srgb,var(--c-money) 50%,var(--surface))'],['PACs',s.mix.pac,'var(--ink)'],['Other',s.mix.other,'var(--fill3)']];
  const tot=s=>s.mix.small+s.mix.big+s.mix.pac+s.mix.other||1;
  const ticks=s=>Object.entries(s.tk).sort((a,b)=>b[1]-a[1]).slice(0,6);
  return `<header class="pnav scrolled" id="nav"><div class="in"><button data-back aria-label="Back">${ICONS.back}</button><span class="mid" style="opacity:1">Compare the parties</span><span style="width:36px"></span></div></header>
  <div class="wrap" style="padding-top:calc(var(--navh) + env(safe-area-inset-top,0px) + 4px)">
   <div class="vs"><button class="vsb p-D" data-party-page="D"><span>D</span><b>${A.n}</b><em>Democrats</em></button><div class="vsx">vs</div><button class="vsb p-R" data-party-page="R"><span>R</span><b>${B.n}</b><em>Republicans</em></button></div>
   <div class="seg" role="group">${['All','Senate','House'].map(c=>`<button data-cmpch="${c}" aria-pressed="${c===ch}">${c==='All'?'All of Congress':c}</button>`).join('')}</div>
   ${seats?`<section class="sec"><div class="sh"><h2>Who holds the seats</h2></div><div class="group pad">${hemicycle(seats,A.n+B.n+I.n)}<div class="hemil"><span class="pc-D">● ${A.n} Democrats</span>${I.n?`<span class="pc-I">● ${I.n} Independent${I.n>1?'s':''}</span>`:''}<span class="pc-R">● ${B.n} Republicans</span></div></div></section>`:''}
   <section class="sec"><div class="sh"><h2>Biggest differences</h2></div><div class="dstories">${diffStories(A,B).join('')}</div></section>
   <section class="sec"><div class="sh"><h2>Where the money comes from</h2></div><div class="group pad"><div class="donuts">
     <div>${donut(mixParts(A),tot(A),[M(A.raised),'avg raised'])}<span class="pc-D">Democrats</span></div>
     <div>${donut(mixParts(B),tot(B),[M(B.raised),'avg raised'])}<span class="pc-R">Republicans</span></div></div>
     <div class="mini-legend" style="justify-content:center">${mixParts(A).map(x=>`<span><i style="background:${x[2]}"></i>${x[0]}</span>`).join('')}</div></div></section>
   <section class="sec"><div class="sh"><h2>What their donors do</h2></div><div class="group pad"><div class="bflyh"><span class="pc-D">Democrats</span><span class="pc-R">Republicans</span></div>${butterfly(A,B)}</div><div class="cap">Share of each party's money from donors (and PACs) in each industry.</div></section>
   <section class="sec"><div class="sh"><h2>Who trades stocks</h2></div><div class="group pad"><div class="waffles">
     <div>${waffle(A.traderShare,'D')}<b class="pc-D">${pct(A.traderShare)}</b><span>of Democrats</span></div>
     <div>${waffle(B.traderShare,'R')}<b class="pc-R">${pct(B.traderShare)}</b><span>of Republicans</span></div></div>
     <div class="tickers"><div>${ticks(A).map(([t,n])=>`<span class="tk tk-D">${esc(t)}<em>${n}</em></span>`).join('')}</div><div>${ticks(B).map(([t,n])=>`<span class="tk tk-R">${esc(t)}<em>${n}</em></span>`).join('')}</div></div>
     <div class="cap" style="padding:10px 0 0;text-align:center">Each square is 1% of members. Chips show their most-traded stocks.</div></div></section>
   <section class="sec"><div class="sh"><h2>Showing up and sticking together</h2></div><div class="group pad"><div class="gauges">
     ${gauge(A.present||0,'D','Dems show up')}${gauge(B.present||0,'R','GOP shows up')}${gauge(A.unity||0,'D','Dems vote together')}${gauge(B.unity||0,'R','GOP votes together')}</div>
     <div class="cap" style="padding:8px 0 0;text-align:center">Voting together counts only votes where most of each party voted opposite ways.</div></div></section>
   <section class="sec"><div class="sh"><h2>How old they are</h2></div><div class="group pad">${agePyramid(A,B)}</div></section>
   ${I.n?`<button class="calm" data-party-page="I" style="width:100%;text-align:left;border:0;margin-top:20px;cursor:pointer"><b>Plus ${I.n} independent${I.n>1?'s':''}.</b> Too few for fair averages, so they have their own page ›</button>`:''}
   <div class="note">Same formulas for both parties. Averages across current members${ch==='All'?'':' of the '+ch}.</div>
  </div>`;
};
