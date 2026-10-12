/* ================= Capitol Receipts UI: lead with what stands out, details one tap away ================= */
const PHOTOS=window.__PHOTOS||{};
const CAT={
  money:{name:'Money',icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 3v18M16.5 7.5c-.6-1.4-2.2-2.3-4.3-2.3-2.6 0-4.4 1.3-4.4 3.2 0 4.6 9 2.4 9 7 0 2-1.9 3.4-4.6 3.4-2.3 0-4-1-4.6-2.6"/></svg>'},
  stocks:{name:'Stocks',icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg>'},
  votes:{name:'Votes',icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M9 10V5h6v5M9 14h6"/></svg>'},
  influence:{name:'Lobbying',icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="3"/><circle cx="17" cy="15" r="3"/><path d="M10.5 10l4 3M3 20c.6-3 2.6-5 5-5M20.5 4l-4 4"/></svg>'},
  ethics:{name:'Ethics',icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M5 21h14M6 7h12M6 7l-3 7h6zM18 7l-3 7h6z"/></svg>'},
  confirm:{name:'Appointees',icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12l5 5L20 6"/></svg>'}
};
const share=(arr,v)=>arr.length?arr.filter(x=>x<v).length/arr.length:0;
const chamberWord=m=>m.chamber==='Senate'?'the Senate':'the House';
const ord=n=>n.toLocaleString();
function face(m,size=44,ring=true){
  const src=PHOTOS[m.id];
  return src?`<img class="face ${ring?'ring-'+m.party:''}" style="width:${size}px;height:${size}px" src="data:image/webp;base64,${src}" alt="">`:`<span class="face fb ring-${m.party}" style="width:${size}px;height:${size}px;font-size:${Math.round(size*.36)}px">${m.initials}</span>`;
}
const nomFace=(n,size=44)=>`<span class="face fb nomf" style="width:${size}px;height:${size}px;font-size:${Math.round(size*.34)}px">${esc(n.initials)}</span>`;
const partyLine=m=>`${m.partyName} · ${m.chamber==='Senate'?'Senator':m.delegate?'Delegate':'Rep.'} · ${m.chamber==='Senate'?m.stateName:m.state+(m.district?'-'+m.district:'')}`;

/* rows with faces */
memRow=function(m,right){
  return `<button class="row" data-p="${m.id}">${face(m,44)}
   <span style="min-width:0"><span class="t">${esc(m.name)}</span><br><span class="s">${esc(partyLine(m))}</span></span>
   <span class="rr">${right!=null?`<span class="val">${right}</span>`:''}${chev}</span></button>`;
};
nomRow=function(n,right){
  return `<button class="row" data-n="${n.id}">${nomFace(n,44)}
   <span style="min-width:0"><span class="t">${esc(n.name)}</span><br><span class="s">${esc(n.pos)}</span></span>
   <span class="rr"><span class="val">${right??`${n.y}–${n.n}`}</span>${chev}</span></button>`;
};

/* ---------- what stands out (same rules for everyone) ---------- */
function standouts(m){
  if(m.delegate)return [];
  const P=POOL[m.chamber],out=[],peers=chamberWord(m),she=m.chamber==='Senate'?'senators':'House members';
  const top=p=>Math.floor(p*100);
  const vs=(p,who)=>p>=.995?`The most among ${who}.`:`More than ${top(p)}% of ${who}.`;
  if(m.missed!=null&&m.elig>=50){const p=share(P.present.map(x=>1-x),m.missed);if(p>=.9)out.push({cat:'votes',big:pct(m.missed,1),text:`of votes missed. ${vs(p,she)}`,w:p});}
  if(m.tradeN){const p=share(POOL.House.trades.concat(POOL.Senate.trades),m.tradeN);if(p>=.9)out.push({cat:'stocks',big:ord(m.tradeN),text:`stock trades since January 2025. ${vs(p,'Congress')}`,w:p+.01});}
  if(m.commTrades>=3){out.push({cat:'stocks',big:ord(m.commTrades),text:`trades in industries ${m.her||'their'} committees oversee, like ${Object.keys(m.oversees||{}).slice(0,2).map(s=>s.toLowerCase()).join(' and ')}.`,w:.97});}
  if(m.breaks!=null){const p=share(P.unity.map(x=>1-x),m.breaks);if(p>=.9)out.push({cat:'votes',big:pct(m.breaks,0),text:`of the time voted against ${PN[m.caucus]}s when the parties split. More independent than ${top(p)}% of ${she}.`,w:p});}
  if(m.smallShare!=null&&m.money?.rec>=50000){const p=share(P.small,m.smallShare);if(p>=.9)out.push({cat:'money',big:pct(m.smallShare),text:`of campaign money came from small donors giving under $200. Higher than ${top(p)}% of ${she}.`,w:p-.02});else if(p<=.1)out.push({cat:'money',big:pct(m.smallShare),text:`of campaign money came from small donors. Lower than ${100-top(p)}% of ${she}.`,w:1-p-.02});}
  if(m.pacShare!=null&&m.money?.rec>=50000){const p=share(P.pacShare,m.pacShare);if(p>=.9)out.push({cat:'money',big:pct(m.pacShare),text:`of campaign money came from PACs, which are funded by companies, unions and interest groups. Higher than ${top(p)}% of ${she}.`,w:p-.02});}
  if(m.money?.rec){const arr=MEM.filter(x=>x.chamber===m.chamber&&x.money).map(x=>x.money.rec);const p=share(arr,m.money.rec);if(p>=.95)out.push({cat:'money',big:M(m.money.rec),text:`raised for the 2026 election cycle. More than ${top(p)}% of ${she}.`,w:p-.03});}
  if(m.revN>=3){const p=share(P.rev,m.revN);if(p>=.85)out.push({cat:'influence',big:m.revN,text:`people who once worked for ${m.last} are now registered lobbyists.`,w:p-.01});}
  if(m.ethN){const e=m.ethics[0];out.unshift({cat:'ethics',big:e[1],text:`House Ethics Committee, ${fmtISO(e[0])}. A review is not a finding of wrongdoing.`,w:2,small:true});}
  return out.sort((a,b)=>b.w-a.w).slice(0,4);
}
function storyCard(s,extra=''){
  return `<div class="story c-${s.cat}"><div class="sk">${CAT[s.cat].icon}<span>${CAT[s.cat].name}</span></div><div class="sbig ${s.small?'sm':''}">${esc(String(s.big))}</div><p>${s.text}</p>${extra}</div>`;
}

/* ---------- home ---------- */
function topBy(list,f){let best=null,bv=-Infinity;list.forEach(x=>{const v=f(x);if(v!=null&&v>bv){bv=v;best=x}});return best}
let HOMESTORIES=null;
function homeStories(){
  if(HOMESTORIES)return HOMESTORIES;
  const v=MEM.filter(m=>!m.delegate),st=[];
  const t=topBy(v,m=>m.tradeN);if(t)st.push({m:t,cat:'stocks',kick:'Most active trader',big:ord(t.tradeN),text:'stock trades reported since January 2025, the most in Congress.'});
  const c=topBy(v,m=>m.commTrades);if(c)st.push({m:c,cat:'stocks',kick:'Trading close to home',big:ord(c.commTrades),text:`trades in industries ${c.her||'their'} own committees oversee.`});
  const mi=topBy(v.filter(m=>m.elig>=100),m=>m.missed);if(mi)st.push({m:mi,cat:'votes',kick:'Most votes missed',big:pct(mi.missed,1),text:`of votes missed this Congress. The typical member misses about ${pct(1-median(POOL.House.present),1)}.`});
  const b=topBy(v.filter(m=>m.unityN>=100),m=>m.breaks);if(b)st.push({m:b,cat:'votes',kick:'Breaks with the party most',big:pct(b.breaks,0),text:`of party-line votes cast against ${b.her||'their'} own party.`});
  const r=topBy(v,m=>m.revN);if(r)st.push({m:r,cat:'influence',kick:'Staff turned lobbyists',big:r.revN,text:'former staffers are now registered lobbyists, the most in Congress.'});
  const sm=topBy(v.filter(m=>m.money?.rec>=1e6),m=>m.smallShare);if(sm)st.push({m:sm,cat:'money',kick:'Powered by small donors',big:pct(sm.smallShare),text:`of ${M(sm.money.rec)} raised came from donors giving under $200.`});
  const pc=topBy(v.filter(m=>m.money?.rec>=5e5),m=>m.pacShare);if(pc)st.push({m:pc,cat:'money',kick:'Leans on PAC money',big:pct(pc.pacShare),text:`of campaign money came from PACs, the highest share among big fundraisers.`});
  const e=MEM.filter(m=>m.ethN).sort((a,b)=>b.ethics[0][0].localeCompare(a.ethics[0][0]))[0];if(e)st.push({m:e,cat:'ethics',kick:'Latest ethics action',big:e.ethics[0][1],small:true,text:`House Ethics Committee, ${fmtISO(e.ethics[0][0])}. A review is not a finding of wrongdoing.`});
  const n=[...NOM].sort((a,b)=>(a.y-a.n)-(b.y-b.n)||b.d.localeCompare(a.d))[0];if(n)st.push({n,cat:'confirm',kick:'Closest confirmation',big:`${n.y}–${n.n}`,text:`Senate vote to confirm ${n.name} as ${n.pos}.${n.y===n.n?' The Vice President broke the tie.':''}`});
  return HOMESTORIES=st;
}
/* ---------- your reps: ZIP code or state ---------- */
S.dist=store.get('dist',null);S.zip=store.get('zip','');
async function zipLookup(z){
  const r=await SB.get(`zip_districts?zip=eq.${encodeURIComponent(z)}&select=state,districts`);
  if(r[0])return {st:r[0].state,d:r[0].districts};
  /* ZIP codes with no homes (PO boxes, big offices) aren't in the Census table: fall back to the state for that ZIP prefix */
  const near=await SB.get(`zip_districts?zip=like.${encodeURIComponent(z.slice(0,3))}*&select=state&limit=300`);
  const c={};near.forEach(x=>c[x.state]=(c[x.state]||0)+1);
  const st=Object.entries(c).sort((a,b)=>b[1]-a[1])[0];return st?{st:st[0],d:null,approx:true}:null;
}
const distOf=m=>+m.district||0;
function myReps(){
  if(!S.home)return [];
  const d=S.dist&&S.dist.length?S.dist:null;
  return MEM.filter(m=>m.state===S.home&&(m.chamber==='Senate'||!d||d.includes(distOf(m)))).sort((a,b)=>(a.chamber===b.chamber?distOf(a)-distOf(b):a.chamber==='Senate'?-1:1));
}
function repWhere(){
  if(!S.home)return '';
  const d=S.dist&&S.dist.length?S.dist:null;
  const one=MEM.filter(m=>m.state===S.home&&m.chamber==='House').length===1;
  return `${S.zip?`ZIP ${esc(S.zip)} · `:''}${esc(ST[S.home]||S.home)}${d?one||d[0]===0?' · At-large':` · District${d.length>1?'s':''} ${d.join(' & ')}`:''}`;
}
function repPicker(full){
  const states=Object.entries(ST).sort((a,b)=>a[1].localeCompare(b[1]));
  return `<div class="pick">${full?'':`<div><b>Who represents you?</b><span>Enter your ZIP code to see your two senators and your member of the House.</span></div>`}
   <div class="ziprow"><input id="zip" class="zipin" type="text" inputmode="numeric" maxlength="5" autocomplete="postal-code" placeholder="Your ZIP code" value="${esc(S.zip||'')}" aria-label="ZIP code"><button class="zipgo" data-zipgo>Find</button></div>
   <div id="zipmsg" class="zipmsg" role="status"></div>
   <details class="orstate"${!S.zip&&S.home?' open':''}><summary>Or pick your state instead</summary><select class="select" id="home" aria-label="Your state"><option value="">Choose state</option>${states.map(([k,v])=>`<option value="${k}" ${k===S.home&&!S.zip?'selected':''}>${v}</option>`).join('')}</select></details></div>`;
}
async function setZip(v){
  const msg=$('#zipmsg');if(msg)msg.textContent='Looking up '+v+'…';
  let r=null;try{r=await zipLookup(v)}catch(e){if(msg)msg.textContent='Couldn’t reach the server. Check your connection and try again.';return}
  if(msg)msg.textContent='';
  if(!r){if(msg)msg.textContent='We couldn’t find that ZIP code. Check it, or pick your state below.';return}
  S.home=r.st;S.dist=r.d;S.zip=v;S.zipApprox=!!r.approx;store.set('home',S.home);store.set('dist',S.dist);store.set('zip',S.zip);
  if(S.tab==='home'||S.tab==='following'){render()}
}
document.addEventListener('click',e=>{if(e.target.closest('[data-zipgo]')){const v=($('#zip')?.value||'').replace(/\D/g,'');if(v.length===5)setZip(v);else{const msg=$('#zipmsg');if(msg)msg.textContent='Enter all 5 digits of your ZIP code.'}}});
function home(){
  const mine=myReps();
  const st=homeStories();
  const bills=Object.entries(DATA.bills).sort((a,b)=>b[1].n-a[1].n).slice(0,3);
  const feed=FEEDTOP.slice(0,5);
  return `<div class="wrap home">
   <div class="homehero bg-capfull"><header class="brandbar"><div class="logo"><span>Capitol</span>Receipts</div><span class="asof">Updated ${fmtISO(DATA.asOf.votes)}</span></header>
   <h1 class="hello">Who's in Congress, who pays them, and how they vote.</h1><button class="langbtn notr" data-lang="${S.lang==='es'?'en':'es'}">${S.lang==='es'?'English':'Español'}</button></div>
   <button class="fakesearch" data-tab="search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>Search any lawmaker or appointee</button>
   ${mine.length?`<section class="sec"><div class="sh"><h2>Your representatives</h2><button data-tab="following">Change</button></div><div class="repwhere">${repWhere()}</div><div class="reps">${mine.map(m=>`<button class="rep" data-p="${m.id}">${face(m,64)}<span class="rn">${esc(m.last)}</span><span class="rs">${m.chamber==='Senate'?'Senator':'House · '+(distOf(m)?'District '+distOf(m):'At-large')}</span></button>`).join('')}</div></section>`
    :`<section class="sec">${repPicker(false)}</section>`}
   ${typeof weekDigest==='function'?weekDigest():''}
   <section class="sec"><div class="sh"><h2>Stories from the data</h2></div>
    <div class="carousel">${st.map(s=>`<button class="hcard c-${s.cat}" ${s.m?`data-p="${s.m.id}"`:`data-n="${s.n.id}"`}>
      <div class="sk">${CAT[s.cat].icon}<span>${s.kick}</span></div>
      <div class="sbig ${s.small?'sm':''}">${esc(String(s.big))}</div><p>${esc(s.text)}</p>
      <div class="who">${s.m?face(s.m,40):nomFace(s.n,40)}<span><b>${esc(s.m?s.m.name:s.n.name)}</b><br><span>${esc(s.m?partyLine(s.m):s.n.pos)}</span></span></div></button>`).join('')}</div></section>
   ${archiveCarousel()}
   <section class="sec"><div class="sh"><h2>The parties</h2><button data-compare>Compare</button></div><div class="ptiles">${['D','R','I'].map(p=>{const s=partyStats(p);return `<button class="ptile p-${p}" data-party-page="${p}"><span class="pbadge sm">${p}</span><b>${s.n}</b><span>${PARTYNAME[p]}</span><em>avg ${M(s.raised)} raised</em></button>`}).join('')}</div></section>
   <section class="sec"><div class="sh"><h2>Rankings</h2><button data-tab="search">All</button></div>
    <div class="rgrid">${[['trades','stocks','Stock traders'],['comm','stocks','Trades tied to committees'],['missed','votes','Missed votes'],['breaks','votes','Party rebels'],['raised','money','Top fundraisers'],['small','money','Small-donor backed'],['pac','money','PAC-funded'],['rev','influence','Ex-staff lobbying']].map(([k,c,l])=>`<button class="rk c-${c}" data-rank="${k}">${CAT[c].icon}<span>${l}</span></button>`).join('')}</div></section>
   <section class="sec"><div class="sh"><h2>Most-lobbied bills</h2></div><div class="group">${bills.map(([b,x])=>{const r=Object.values(DATA.rc).find(r=>billKey(r.b)===b&&r.s);return `<button class="row plain" data-bill="${b}" style="grid-template-columns:1fr auto auto"><span style="min-width:0"><span class="t clamp">${esc(r?.s||billName(b))}</span><span class="s">${billName(b)}</span></span><span class="val">${ord(x.n)}<small> groups</small></span>${chev}</button>`}).join('')}</div></section>
   <section class="sec"><div class="sh"><h2>Just in</h2><button data-feed>See all</button></div><div class="group">${feed.map(feedRow).join('')}</div></section>
  </div>`;
}
const feedRow=f=>{const m=byId[f.id],n=nomById[f.id];return `<button class="row feedrow" ${f.kind==='nom'?`data-n="${f.id}"`:`data-p="${f.id}"`}>${m?face(m,40):n?nomFace(n,40):''}<span style="min-width:0"><span class="t">${f.txt}</span><br><span class="s">${fmtISO(f.d)}</span></span>${chev}</button>`};

/* ---------- member profile ---------- */
function glance(label,val,sub,flag){return `<div class="gl ${flag?'hot':''}"><span class="gk">${label}</span><b>${val}</b><span class="gs">${sub}</span></div>`}
function topicCard(cat,title,summary,body,topic){
  return `<button class="topic c-${cat}" data-topic="${topic}"><div class="th"><span class="ti">${CAT[cat].icon}</span><span class="tt">${title}</span><span class="tm">Details ${chev}</span></div><p class="tsum">${summary}</p>${body}</button>`;
}
function memberProfile(m){
  const on=S.following.has(m.id),P=POOL[m.chamber];
  const so=standouts(m);
  const typMiss=1-median(P.present);
  const f=m.money;
  const g=`<div class="glance">
    ${glance('Votes missed',m.missed==null?'—':pct(m.missed,1),`Typical ${pct(typMiss,1)}`,m.missed!=null&&share(P.present.map(x=>1-x),m.missed)>=.9)}
    ${glance('Raised for 2026',f?M(f.rec):'—',f?`${pct(m.smallShare)} small donors`:'No reports',false)}
    ${glance('Stock trades',ord(m.tradeN),m.commTrades?`${m.commTrades} tied to committees`:'since Jan 2025',m.commTrades>=3)}</div>`;
  /* topic summaries */
  const big=f?Math.max(0,f.indiv-(f.small||0)):0;
  const mparts=f?[['Small donors',f.small||0,'var(--c-money)'],['Big donors',big,'color-mix(in srgb,var(--c-money) 55%,var(--surface))'],['PACs',f.pac,'var(--ink)'],['Other',Math.max(0,f.rec-(f.small||0)-big-f.pac),'var(--fill3)']].filter(p=>p[1]>0):[];
  const ind=(m.industries||[]).filter(r=>!/^(Other or not listed|Not employed|Retired|Other business|Politicians|Party committees)/.test(r[0]))[0];
  const moneyCard=f?topicCard('money','Who funds them',`Raised <b>${M(f.rec)}</b>${ind?`. Biggest industry: <b>${esc(ind[0].toLowerCase())}</b>`:''}.`,
    `<div class="stack">${mparts.map(p=>`<span style="width:${(p[1]/f.rec*100).toFixed(1)}%;background:${p[2]}"></span>`).join('')}</div><div class="mini-legend">${mparts.map(p=>`<span><i style="background:${p[2]}"></i>${p[0]} ${pct(p[1]/f.rec)}</span>`).join('')}</div>`,'money'):'';
  const months=(m.tradeByMonth||[]).map(r=>r[1]),mx=Math.max(1,...months);
  const stockCard=topicCard('stocks','Stock trades',m.tradeN?`<b>${ord(m.tradeN)}</b> trades since January 2025${m.tradeStats?`: ${ord(m.tradeStats.buys)} buys, ${ord(m.tradeStats.sells)} sells`:''}.${m.commTrades?` <b class="hl">${m.commTrades}</b> were in industries ${m.her||'their'} committees oversee.`:''}`:`No stock trades reported since January 2025.${m.ptrPaper?' Some reports were filed on paper.':''}`,
    m.tradeN?`<div class="spark">${months.map(v=>`<span style="height:${Math.max(2,v/mx*100)}%"></span>`).join('')}</div><div class="sparkl"><span>Jan 2025</span><span>Sep 2026</span></div>`:'','stocks');
  const voteCard=m.elig?topicCard('votes','Voting record',m.id===SPEAKER?'The Speaker rarely votes by tradition.':`Showed up for <b>${pct(m.present,m.present>=.99?1:0)}</b> of votes. Sided with ${PN[m.caucus]}s on <b>${pct(m.unity,0)}</b> of party-line votes.`,
    `<div class="meter"><span class="mf" style="width:${(m.present*100).toFixed(1)}%"></span><span class="mt" style="left:${(1-typMiss)*100}%"></span></div><div class="sparkl"><span>Attendance</span><span>Line = typical member</span></div>`,'votes'):'';
  const rev=m.revolving||[];
  const lv=lobbiedVotes(m);
  const inflCard=topicCard('influence','Lobbying & ethics',`${rev.length?`<b>${rev.length}</b> former staffer${rev.length>1?'s are':' is'} now a lobbyist.`:'No former staff registered as lobbyists.'}${m.ethN?` <b class="hl">${m.ethN}</b> Ethics Committee statement${m.ethN>1?'s':''}.`:''}${lv[0]?` Voted on bills lobbied by up to <b>${ord(lv[0].n)}</b> groups.`:''}`,
    rev.length?`<div class="names">${rev.slice(0,3).map(r=>`<span>${esc(r[0])} <em>→ ${esc(r[3][0]||r[2]||'')}</em></span>`).join('')}</div>`:'','influence');
  const com=m.committees.filter(c=>!/^Joint|Select Subcommittee/.test(c[0])).slice(0,4).map(([c])=>esc(c.replace(/^the /,'').replace(/^Select the /,'Select Committee on the ')));
  return `<header class="pnav" id="nav"><div class="in"><button data-back aria-label="Back">${ICONS.back}</button><span class="mid">${esc(m.name)}</span><button data-share aria-label="Share">${ICONS.share}</button></div></header>
  <section class="phero p-${m.party} ${m.chamber==='Senate'?'bg-dusk':'bg-house'}"><div class="in">
    ${face(m,92,false)}
    <h1>${esc(m.first)} ${esc(m.last)}</h1>
    <div class="psub">${esc(partyLine(m))} · <button class="plink" data-party-page="${m.party}">All ${PARTYNAME[m.party].toLowerCase()} ›</button></div>
    <div class="pchips"><span>${m.chamber==='House'?'Up for reelection':'Next election'} ${m.next}</span><span>In Congress since ${m.since}</span></div>
    <button class="follow ${on?'on':''}" data-follow="${m.id}">${on?'Following':'Follow'}</button>
  </div></section>
  <div class="wrap">
   ${g}${plainMember(m)}
   <section class="sec"><div class="sh"><h2>What stands out</h2><button data-topic="compare">Compare</button></div>
    ${so.length?`<div class="stories">${so.map(s=>storyCard(s)).join('')}</div>`:`<div class="calm"><b>Nothing unusual.</b> ${esc(m.last)} is close to typical on every measure we track.</div>`}
   </section>
   <section class="sec"><div class="topics">${moneyCard}${stockCard}${voteCard}${inflCard}</div></section>
   ${careerSection(m)}
   <section class="sec"><div class="sh"><h2>About</h2></div><div class="group">
    ${HC[m.id]?.b?`<div class="row kv"><span class="k">Born</span><span class="v">${fmtISO(HC[m.id].b)}</span></div>`:''}
    ${G&&G.mc[m.id]?.length?`<div class="row kv"><span class="k">Committees</span><span class="v">${G.mc[m.id].map(([tid,t])=>`<button class="link inl" data-com="${tid}">${esc(G.comm[tid].short)}</button>${t?` <span class="s">(${esc(t)})</span>`:''}`).join('<br>')}</span></div>`:com.length?`<div class="row kv"><span class="k">Committees</span><span class="v">${com.join('<br>')}</span></div>`:''}
    ${m.age?`<div class="row kv"><span class="k">Age</span><span class="v">${m.age}</span></div>`:''}
    ${m.phone?`<div class="row kv"><span class="k">Office phone</span><span class="v" style="user-select:all">${esc(m.phone)}</span></div>`:''}
    ${m.url?`<a class="row plain" style="grid-template-columns:1fr auto" href="${esc(m.url)}" target="_blank" rel="noopener"><span>Official website</span>${chev}</a>`:''}
   </div></section>
   ${HC[m.id]?linksBlock(HC[m.id]):''}
   <div class="note">From public records: FEC, House and Senate disclosures, roll-call votes and lobbying reports. <button class="link" data-how>How we measure</button></div>
  </div>`;
}

/* ---------- appointee profile ---------- */
function nomProfile(n){
  const o=n.oge||{},tot=(n.y+n.n)||1,so=[];
  if(n.y-n.n<=3)so.push({cat:'confirm',big:`${n.y}–${n.n}`,text:n.y===n.n?'A tie in the Senate. The Vice President cast the deciding vote.':`One of the closest confirmation votes. A swing of ${Math.ceil((n.y-n.n+1)/2)} vote${n.y-n.n>1?'s':''} would have changed the result.`});
  if(o.pay?.length)so.push({cat:'money',big:M(o.pay[0][2]),text:`paid by ${esc(o.pay[0][0].replace(/\s+-\s.*$|\s+-$/,'').replace(/,$/,''))} (${esc(o.pay[0][1].toLowerCase())}) before joining government.`});
  if(o.divest?.length)so.push({cat:'stocks',big:o.divest.length,text:`holding${o.divest.length>1?'s':''} promised to be sold to avoid conflicts, including ${esc(o.divest[0])}.`});
  if(o.waivers)so.push({cat:'ethics',big:o.waivers,text:`conflict-of-interest waiver${o.waivers>1?'s':''} on file, which let an official work on matters that would otherwise be off limits.`});
  if(n.crossN)so.push({cat:'votes',big:n.crossN,text:`senator${n.crossN>1?'s':''} broke with their party on this vote.`});
  const pb=(lbl,[y,no])=>y+no?`<div class="pbar"><span>${lbl}</span><span class="bar"><span style="width:${y/(y+no)*100}%;background:var(--yes)"></span><span style="width:${no/(y+no)*100}%;background:var(--no)"></span></span><span class="num">${y}–${no}</span></div>`:'';
  return `<header class="pnav" id="nav"><div class="in"><button data-back aria-label="Back">${ICONS.back}</button><span class="mid">${esc(n.name)}</span><button data-share aria-label="Share">${ICONS.share}</button></div></header>
  <section class="phero p-N ${n.cat==='Judges'?'bg-court':'bg-white'}"><div class="in">${nomFace(n,92)}<h1>${esc(n.name)}</h1><div class="psub">${esc(n.pos)}</div>
   <div class="pchips"><span>${esc(n.cat)}</span><span>Confirmed ${fmtISO(n.d)}</span><span>From ${esc(n.from_)}</span></div></div></section>
  <div class="wrap">
   <div class="glance">${glance('Senate vote',`${n.y}–${n.n}`,`${pct(n.y/tot)} yes`,n.y-n.n<=3)}${glance('Crossed party',n.crossN,'senators',n.crossN>0)}${glance('Ethics waivers',o.waivers??'—',o.docs?`${o.docs.length} filings`:'no filings matched',o.waivers>0)}</div>
   <section class="sec"><div class="sh"><h2>What stands out</h2></div>${so.length?`<div class="stories">${so.slice(0,4).map(s=>storyCard(s)).join('')}</div>`:'<div class="calm"><b>Nothing unusual</b> in the vote or the filings we could read.</div>'}</section>
   <section class="sec"><div class="topics">
    ${topicCard('votes','How the Senate voted',`Confirmed <b>${n.y}–${n.n}</b>${n.batch>1?` in a group vote with ${n.batch-1} other nominees`:''}.`,`<div class="pbars">${pb('Republicans',n.br.R)}${pb('Democrats',n.br.D)}${pb('Independents',n.br.I)}</div>`,'nvote')}
    ${o.docs?topicCard('money','Money & past jobs',o.positions?.length?`Before government: <b>${esc(o.positions[0][0])}</b>${o.positions.length>1?` and ${o.positions.length-1} more`:''}.`:'Financial disclosures on file with the Office of Government Ethics.',o.pay?.length?`<div class="names">${o.pay.slice(0,3).map(p=>`<span>${esc(p[0].replace(/\s+-\s.*$|\s+-$/,'').replace(/,$/,''))} <em>${M(p[2])}</em></span>`).join('')}</div>`:'','oge'):''}
   </div></section>
   ${curAppExtras(n)}
   <div class="note">From Senate roll-call votes and Office of Government Ethics filings${HCX[n.id]?.pos?', the Federal Judicial Center':''}${HCX[n.id]?.wx?' and Wikipedia':''}.</div>
  </div>`;
}

/* ---------- other screens ---------- */
function searchScreen(){return explore()}
function following(){
  const mine=myReps();
  const fol=[...S.following].map(id=>byId[id]).filter(Boolean);
  return `<div class="wrap"><div class="lt"><h1>My Reps</h1></div>
   <section class="sec">${repPicker(true)}</section>
   ${S.home?`<div class="sec"><div class="sh"><h2>Your representatives</h2></div><div class="repwhere">${repWhere()}</div><div class="group">${mine.map(m=>memRow(m)).join('')}</div>${S.zip&&!S.dist?`<div class="cap">We couldn\u2019t match ZIP ${esc(S.zip)} to one House district, so we\u2019re showing everyone from ${esc(ST[S.home]||S.home)}.</div>`:''}${S.dist&&S.dist.length>1?`<div class="cap">Your ZIP code crosses more than one House district, so we’re showing each of them. Your exact address decides which one is yours.</div>`:''}</div>`:''}
   <div class="sec"><div class="sh"><h2>Following</h2></div><div class="group">${fol.map(m=>memRow(m)).join('')||'<div class="empty">Tap Follow on any profile to keep them here.</div>'}</div></div></div>`;
}
function more(){return account().replace('<h1>Account</h1>','<h1>More</h1>')}

/* ---------- detail sheets ---------- */
function topicSheet(topic){
  if(topic.startsWith('p-')){$('#panel').className='panel c-'+topic.slice(2);partyTopic(topic,S.stack.at(-1).slice(6));return}
  const id=S.stack.at(-1),m=byId[id],n=nomById[id];S.sheetTopic=topic;
  $('#panel').className='panel c-'+({money:'money',stocks:'stocks',votes:'votes',influence:'influence',compare:'votes',nvote:'confirm',oge:'money',feed:'confirm'}[topic]||'confirm');
  if(topic==='money')openSheet('Who funds them',mMoney(m));
  else if(topic==='stocks')openSheet('Stock trades',mStocks(m));
  else if(topic==='votes')openSheet('Voting record',mVotes(m));
  else if(topic==='influence')openSheet('Lobbying & ethics',mInfluence(m));
  else if(topic==='compare')openSheet('How they compare',`<div class="group">${scorecard(m)}</div><div class="cap">Compared with every other ${m.chamber==='Senate'?'senator':'House member'}. The line marks the typical member. No overall grade, by design.</div>`);
  else if(topic==='nvote')openSheet('The vote',`<div class="group">${n.cross.length?n.cross.map(([id,v])=>{const mm=byId[id];return mm?memRow(mm,`<span class="cast ${v}">${v}</span>`):''}).join(''):'<div class="empty">Every senator voted with their party.</div>'}</div><div class="cap">Senators who voted differently from most of their party.</div>
    <div class="group" style="margin-top:14px"><a class="row plain" style="grid-template-columns:1fr auto" href="https://www.congress.gov/nomination/119th-congress/${(n.pn.match(/\d+/)||[''])[0]}" target="_blank" rel="noopener"><span>Nomination record on Congress.gov</span>${chev}</a></div>`);
  else if(topic==='oge')openSheet('Money & past jobs',ogeSections(n));
  else if(topic==='career')openSheet('Whole career',careerSheet(m));
  else if(topic==='feed')openSheet('Just in',`<div class="group">${FEEDTOP.map(feedRow).join('')}</div>`);
}

/* ---------- render + events ---------- */
const TABS2=[
 ['home','Home','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path class="f" d="M4 10.5 12 4l8 6.5V20h-5v-6H9v6H4z"/></svg>'],
 ['search','Search','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle class="f" cx="11" cy="11" r="6.5"/><path d="m20 20-4-4"/></svg>'],
 ['following','My Reps','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path class="f" d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z"/></svg>'],
 ['more','More','<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>']
];
function render(){
  const cur=S.stack.at(-1);if($('#sheet').hidden)$('#panel').className='panel';
  $('#app').innerHTML=cur?(cur==='compare'?comparePage():cur.startsWith('hp:')?pastProfile(HP[cur.slice(3)]||HC[cur.slice(3)]):cur.startsWith('ha:')?appProfile(HA[cur.slice(3)]):cur.startsWith('bill:')?billPage(cur.slice(5)):cur.startsWith('party:')?partyPage(cur.slice(6)):byId[cur]?memberProfile(byId[cur]):nomProfile(nomById[cur])):{home,search:searchScreen,following,more}[S.tab]();
  $('#tabbar').innerHTML=TABS2.map(([k,l,svg])=>`<button data-tab="${k}" aria-current="${k===S.tab?'page':'false'}">${svg}${l}</button>`).join('');
  const qi=$('#q');if(qi){qi.addEventListener('input',e=>{S.q=e.target.value;S.limit=60;const pos=qi.selectionStart;render();const n=$('#q');n.focus();n.setSelectionRange(pos,pos)});if(S.focusSearch){qi.focus();S.focusSearch=false}}
  document.querySelectorAll('#home').forEach(hs=>hs.addEventListener('change',e=>{S.home=e.target.value;S.dist=null;S.zip='';store.set('home',S.home);store.set('dist',null);store.set('zip','');render()}));
  const zi=$('#zip');if(zi){zi.addEventListener('input',e=>{const v=e.target.value.replace(/\D/g,'').slice(0,5);e.target.value=v;const m=$('#zipmsg');if(m)m.textContent='';if(v.length===5)setZip(v)});zi.addEventListener('keydown',e=>{if(e.key==='Enter'){const v=zi.value.replace(/\D/g,'');if(v.length===5)setZip(v)}})}
  const ms=$('#msort');if(ms)ms.addEventListener('change',e=>{S.msort=e.target.value;S.mdir=null;S.limit=60;render()});
  const hs=$('#hsort');if(hs)hs.addEventListener('change',e=>{S.hsort=e.target.value;S.hdir=null;S.limit=60;render()});
  const as=$('#asort');if(as)as.addEventListener('change',e=>{S.asort=e.target.value;S.adir=null;S.limit=60;render()});
  const ns=$('#nsort');if(ns)ns.addEventListener('change',e=>{S.nsort=e.target.value;S.ndir=null;S.limit=60;render()});
}
addEventListener('scroll',()=>{const n=$('#nav');if(!n)return;n.classList.toggle('scrolled',scrollY>150)},{passive:true});
function selectCap(){const r=document.createRange();r.selectNodeContents($('#capline'));const s=getSelection();s.removeAllRanges();s.addRange(r)}
const go=id=>{S.stack.push(id);S.tlimit=15;S.rlimit=12;$('#sheet').hidden=true;render();scrollTo(0,0)};
document.addEventListener('click',e=>{
  const g=s=>e.target.closest(s);let el;
  if(el=g('[data-tab]')){const t=el.dataset.tab;S.stack=[];if(t==='search'&&S.tab!=='search')S.focusSearch=el.classList.contains('fakesearch');S.tab=t;S.limit=60;$('#sheet').hidden=true;render();scrollTo(0,0);return}
  if(el=g('[data-rank]')){S.stack=[];S.tab='search';S.filter='Congress';S.party='All';S.q='';S.msort=el.dataset.rank;S.mdir=null;S.limit=60;render();scrollTo(0,0);return}
  if(el=g('[data-bk]')){go('bill:'+el.dataset.bk);return}
  if(el=g('[data-bill]')){const k=key119(el.dataset.bill);if(hasBill(k)){go('bill:'+k);return}billSheet(el.dataset.bill);return}
  if(g('[data-feed]')){topicSheet('feed');return}
  if(el=g('[data-party-page]')){go('party:'+el.dataset.partyPage);return}
  if(g('[data-compare]')){go('compare');return}
  if(el=g('[data-cmpch]')){S.cmpCh=el.dataset.cmpch;render();return}
  if(el=g('[data-plist]')){S.stack=[];S.tab='search';S.filter='Congress';S.party=el.dataset.plist;S.q='';S.msort='name';S.limit=60;$('#sheet').hidden=true;render();scrollTo(0,0);return}
  if(el=g('[data-p]')){go(el.dataset.p);return}
  if(el=g('[data-hp]')){go('hp:'+el.dataset.hp);return}
  if(el=g('[data-ha]')){go('ha:'+el.dataset.ha);return}
  if(el=g('[data-hk]')){S.hk=el.dataset.hk;S.limit=60;render();return}
  if(el=g('[data-hkgo]')){S.filter='History';S.hk=el.dataset.hkgo;S.limit=60;render();scrollTo(0,0);return}
  if(g('[data-hist]')){S.stack=[];S.tab='search';S.filter='History';S.hk='members';S.limit=60;render();scrollTo(0,0);return}
  if(el=g('[data-hera]')){S.hera=el.dataset.hera;S.limit=60;render();return}
  if(el=g('[data-hparty]')){S.hparty=el.dataset.hparty;S.limit=60;render();return}
  if(el=g('[data-hch]')){S.hch=el.dataset.hch;S.limit=60;render();return}
  if(el=g('[data-acat]')){S.acat=el.dataset.acat;S.limit=60;render();return}
  if(el=g('[data-hdir]')){const k=el.dataset.hdir;if(k==='h')S.hdir=-(S.hdir??HSORT[S.hsort][3]);else S.adir=-(S.adir??ASORT[S.asort][3]);render();return}
  if(el=g('[data-n]')){go(el.dataset.n);return}
  if(g('[data-back]')){S.stack.pop();render();scrollTo(0,0);return}
  if(el=g('[data-topic]')){topicSheet(el.dataset.topic);return}
  if(el=g('[data-pt]')){topicSheet(el.dataset.pt==='stocks'?'stocks':el.dataset.pt);return}
  if(el=g('[data-f]')){S.filter=el.dataset.f;S.limit=60;render();return}
  if(el=g('[data-party]')){S.party=el.dataset.party;S.limit=60;render();return}
  if(el=g('[data-nc]')){S.ncat=el.dataset.nc;S.limit=60;render();return}
  if(el=g('[data-dir]')){const k=el.dataset.dir;if(k==='m'){S.mdir=-(S.mdir??MSORT[S.msort][3])}else{S.ndir=-(S.ndir??NSORT[S.nsort][3])}render();return}
  if(g('[data-more]')){S.limit+=100;render();return}
  if(g('[data-tmore]')){S.tlimit=(S.tlimit||15)+40;topicSheet('stocks');return}
  if(g('[data-rmore]')){S.rlimit=999;topicSheet('influence');return}
  if(el=g('[data-follow]')){const id=el.dataset.follow;S.following.has(id)?S.following.delete(id):S.following.add(id);store.set('following',[...S.following]);render();return}
  if(g('[data-share]')){shareSheet();return}
  if(g('[data-how]')){howSheet();return}
  if(g('[data-sources]')){sourcesSheet();return}
  if(g('[data-next]')){nextSheet();return}
  if(e.target.id==='done'||e.target.id==='sheet'){$('#sheet').hidden=true;return}
  if(e.target.id==='pro'){$('#proNote').hidden=false;return}
  if(e.target.id==='copy'){try{navigator.clipboard.writeText($('#capline').textContent).then(()=>{$('#copied').hidden=false},selectCap)}catch(_){selectCap()}}
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')$('#sheet').hidden=true});
MEM.forEach(m=>{const nm=(m.name||'').split(' ')[0];m.her=null});
render();
loadHist();
