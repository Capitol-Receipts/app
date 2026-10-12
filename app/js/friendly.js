/* ================= Friendly: plain-English explanations for political jargon ================= */
const GLOSS=[
 ['pac',/\b(?:super PACs?|PACs?)\b/,'PAC','A political action committee. It pools money from a company, union or interest group and gives it to candidates. A super PAC can raise unlimited money but can’t give directly to candidates or coordinate with them.'],
 ['small',/\bsmall donors?\b/i,'Small donors','People who give a campaign $200 or less in total. Campaigns don’t have to name them, so they show up as one lump sum.'],
 ['big',/\bbig donors?\b/i,'Big donors','People who give a campaign more than $200. Their name, job and employer must be reported to the Federal Election Commission.'],
 ['outside',/\boutside spending\b/i,'Outside spending','Money spent by groups that aren’t the campaign itself, like super PACs and nonprofits, to support or attack a candidate.'],
 ['rollcall',/\broll[- ]calls?\b/i,'Roll call','A vote where each member’s yes or no is recorded by name. Many routine decisions are made by voice vote instead, which isn’t recorded per person.'],
 ['partysplit',/\bwhen the parties split\b/i,'Votes with their party','We only count votes where most Democrats and most Republicans voted opposite ways. Then we check how often this person sided with their own party.'],
 ['cosp',/\bco-?sponsors?\b/i,'Co-sponsor','A member who formally signs on to support a bill someone else introduced. More co-sponsors usually means more support.'],
 ['sponsor',/(?<![-\w])sponsor(?!s?hip)\b/i,'Sponsor','The member who introduced the bill and is its main champion.'],
 ['cloture',/\bcloture\b/i,'Cloture','A Senate vote to end debate and move to a final vote. It needs 60 votes, which is how the filibuster works in practice.'],
 ['filibuster',/\bfilibuster\b/i,'Filibuster','Senate rules let a minority keep debate going on most bills unless 60 senators vote to end it.'],
 ['ranking',/\branking member\b/i,'Ranking member','The top member of the minority party on a committee. The chair comes from the majority party.'],
 ['chair',/\bcommittee chairs?\b/i,'Committee chair','The member who runs a committee and decides which bills get hearings and votes. Always from the majority party.'],
 ['subc',/\bsubcommittees?\b/i,'Subcommittee','A smaller group inside a committee that handles one slice of its work, like a single agency’s budget.'],
 ['juris',/\bjurisdiction\b/i,'Jurisdiction','The topics and agencies a committee is in charge of. Bills on those topics are sent to that committee first.'],
 ['approp',/\bappropriations?\b/i,'Appropriations','The yearly spending bills that fund government agencies. Without them, parts of the government shut down.'],
 ['cr',/\bcontinuing resolutions?\b/i,'Continuing resolution','A stopgap bill that keeps the government funded at current levels when the yearly spending bills aren’t finished.'],
 ['recon',/\breconciliation\b/i,'Reconciliation','A budget process that lets some tax and spending bills pass the Senate with 51 votes instead of 60.'],
 ['publaw',/\bpublic law\b/i,'Public law','A bill that passed both chambers and was signed by the President (or passed over a veto). It’s now federal law.'],
 ['veto',/\bveto(?:ed|es)?\b/i,'Veto','When the President rejects a bill. Congress can override it with a two-thirds vote in both chambers.'],
 ['jres',/\bjoint resolutions?\b/i,'Joint resolution','Works like a bill and can become law. Also used to propose constitutional amendments and to overturn agency rules.'],
 ['sres',/\b(?:simple|concurrent) resolutions?\b/i,'Resolution','A statement by one or both chambers. It doesn’t go to the President and doesn’t become law.'],
 ['impeach',/\bimpeach(?:ment|ed)?\b/i,'Impeachment','The House votes to charge an official. The Senate then holds a trial, and two-thirds of senators must vote to convict to remove them.'],
 ['lobbyist',/\b(?:registered )?lobbyists?\b/i,'Lobbyist','Someone paid to try to influence Congress or federal agencies. Anyone who spends enough time doing it must register and report who pays them.'],
 ['lobfirm',/\blobbying firms?\b/i,'Lobbying firm','A company hired by outside clients to lobby for them. Big organizations also employ their own in-house lobbyists.'],
 ['revolving',/\brevolving door\b/i,'Revolving door','People moving between government jobs and jobs lobbying the government they used to work in.'],
 ['ptr',/\b(?:periodic transaction reports?|trade reports?)\b/i,'Trade reports','Members must report stock trades by themselves, their spouse or dependent children within 45 days. Amounts are given as ranges, not exact figures.'],
 ['committeetrade',/\btied to (?:their|its|the member’s) committees?\b/i,'Trades tied to committees','A trade in a company whose industry falls under a committee the member sits on. This isn’t illegal, but it’s where conflicts of interest are most likely.'],
 ['networth',/\bnet worth\b/i,'Net worth','Members report assets and debts in ranges (for example, $1M to $5M). We show the middle of the reported range, so the real figure can be higher or lower.'],
 ['confirm',/\b(?:Senate[- ]confirmed|confirmation vote)\b/i,'Senate confirmation','Top officials, ambassadors and federal judges must be approved by a majority vote of the Senate before taking the job.'],
 ['ethicsag',/\bethics (?:agreement|pledge)s?\b/i,'Ethics agreement','A written promise new officials make before starting, such as selling certain stocks or stepping away from matters involving an old employer.'],
 ['waiver',/\b(?:ethics )?waivers?\b/i,'Ethics waiver','Official permission to work on something that would normally be off-limits because of a conflict of interest.'],
 ['recuse',/\brecus(?:e|al|ed)\b/i,'Recusal','Stepping away from a decision because of a personal or financial conflict of interest.'],
 ['divest',/\bdivest(?:ed|iture|ment)?\b/i,'Divest','To sell off investments, usually to avoid a conflict of interest with a new job.'],
 ['oce',/\bOffice of Congressional (?:Ethics|Conduct)\b/,'Office of Congressional Conduct','An independent office (formerly the Office of Congressional Ethics) that reviews complaints about House members and refers serious cases to the House Ethics Committee.'],
 ['crs',/\bCongressional Research Service\b/,'Congressional Research Service','Congress’s own nonpartisan research staff. They write the official plain-language summaries of bills.'],
 ['delegate',/\bdelegates?\b/i,'Delegate','A House member from a territory or D.C. They can join committees and debate but can’t vote on final passage of bills.'],
 ['atlarge',/\bat-large\b/i,'At-large','A state with only one House seat. Its representative covers the whole state.'],
 ['ideology',/\bideology\b/i,'Ideology score','A measure from Voteview (UCLA) based on every vote a member cast. It places members from most liberal to most conservative, compared with everyone who has served.'],
 ['whip',/\bwhips?\b/,'Whip','A party leader who counts votes and works to keep members voting with the party.'],
 ['quarter',/\bper quarter\b|\bquarterly\b/i,'Quarterly reports','Lobbyists file reports every three months showing who paid them, how much and what issues they worked on.'],
];
const GLOSS_EN=GLOSS;const GLOSS_BY=Object.fromEntries(GLOSS.map(g=>[g[0],g]));
function glossify(root){
  if(!root)return;const GLOSS=S.lang==='es'&&typeof GLOSS_ES!=='undefined'?GLOSS_ES:GLOSS_EN;
  const used=new Set([...root.querySelectorAll('.gterm')].map(e=>e.dataset.gl));
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>{const p=n.parentElement;if(!p||n.nodeValue.length<4||p.closest('button,a,input,select,textarea,svg,script,style,h1,.nolink,.gterm,.phero,.hero,.pnav,.glance,.big,.lbl,.pname,.tabbar,.drawer'))return NodeFilter.FILTER_REJECT;return NodeFilter.FILTER_ACCEPT}});
  const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
  for(const node of nodes){
    if(used.size>=GLOSS.length)break;
    const t=node.nodeValue;let best=null;
    for(const g of GLOSS){if(used.has(g[0]))continue;const m=g[1].exec(t);if(m&&(!best||m.index<best.i))best={i:m.index,len:m[0].length,k:g[0]}}
    if(!best)continue;
    used.add(best.k);
    const span=document.createElement('span');
    span.innerHTML=esc(t.slice(0,best.i))+`<span class="gterm" role="button" tabindex="0" data-gl="${best.k}">${esc(t.substr(best.i,best.len))}</span>`+esc(t.slice(best.i+best.len));
    node.replaceWith(span);
  }
}
function showGloss(k){
  const g=(S.lang==='es'&&typeof GLOSS_ES!=='undefined'?Object.fromEntries(GLOSS_ES.map(x=>[x[0],x])):GLOSS_BY)[k];if(!g)return;
  let el=document.getElementById('gloss');
  if(!el){el=document.createElement('div');el.id='gloss';el.setAttribute('role','dialog');document.body.appendChild(el)}
  el.innerHTML=`<div class="gin"><div class="gtop"><span class="gq">?</span><b>${esc(g[2])}</b><button class="gx" data-glx aria-label="Close">×</button></div><p>${esc(g[3])}</p></div>`;
  el.hidden=false;requestAnimationFrame(()=>el.classList.add('in'));
}
function hideGloss(){const el=document.getElementById('gloss');if(el){el.classList.remove('in');el.hidden=true}}
window.addEventListener('click',e=>{
  const g=e.target.closest('[data-gl]');
  if(g){e.preventDefault();e.stopPropagation();showGloss(g.dataset.gl);return}
  if(e.target.closest('[data-glx]')||!e.target.closest('#gloss'))hideGloss();
},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape')hideGloss();if((e.key==='Enter'||e.key===' ')&&e.target.matches?.('.gterm')){e.preventDefault();showGloss(e.target.dataset.gl)}});
/* run after every render and every sheet (after cross-links) */
/* insert the summary card right after the glance tiles on profile pages */
function placePlain(){const app=$('#app');if(!app||app.querySelector('.pe-card'))return;const top=S.stack.at(-1)||'';let html='';
  if(top.startsWith('hp:'))html=plainPast(typeof HP!=='undefined'&&(HP[top.slice(3)]||HC[top.slice(3)]));
  else if(nomById[top])html=plainNom(nomById[top]);
  if(!html)return;const g=app.querySelector('.wrap > .glance');if(g)g.insertAdjacentHTML('afterend',html)}
const _render5=render;
render=function(){hideGloss();_render5();try{placePlain()}catch(e){console.warn(e)}try{placeRepVotes()}catch(e){console.warn(e)}try{if(S.lang!=='es')glossify($('#app'))}catch(e){console.warn(e)}};
const _openSheet2=openSheet;
openSheet=function(t,h){hideGloss();_openSheet2(t,h);try{if(S.lang!=='es')glossify($('#panel'))}catch(e){console.warn(e)}};

/* ================= "In plain English" summaries at the top of profiles ================= */
const PADJ={D:'Democratic',R:'Republican',I:'independent'};
const plainCard=txt=>txt?`<section class="pe-card"><div class="pe-h">In plain English</div><p>${txt}</p></section>`:'';
function plainMember(m){
  try{
    const P=POOL[m.chamber],peers=m.chamber==='Senate'?'senators':'House members',c=(typeof HC!=='undefined'&&HC[m.id])||null,L=esc(m.last),out=[];
    const seat=m.chamber==='Senate'?`senator from ${esc(m.stateName)}`:m.delegate?`delegate from ${esc(m.stateName)}`:!m.district?`representative for all of ${esc(m.stateName)}`:`representative for ${esc(m.stateName)}’s ${nth(m.district)} district`;
    const role=(c?.lr||[]).filter(r=>(r[2]||0)>=2026).map(r=>r[0])[0];
    out.push(`${esc(m.first)} ${L} is ${m.party==='I'?'an':'a'} ${PADJ[m.party]||''} ${seat}${role?` and ${esc(role)}`:''}, in Congress since ${m.since}.`);
    if(m.id!==SPEAKER&&!m.delegate&&m.missed!=null&&P.present.length){
      const mp=share(P.present.map(x=>1-x),m.missed);
      out.push(mp>=.75?`${L} misses more votes than ${Math.round(mp*100)}% of ${peers}.`:mp<=.25?`${L} almost never misses a vote.`:`${L} shows up for votes about as often as most ${peers}.`);
      if(m.unity!=null&&share(P.unity,m.unity)<=.1)out.push(`${L} breaks with ${m.party==='I'?'the party they caucus with':'their party'} more often than almost any other member.`);
    }
    const f=m.money;
    if(f&&f.rec>0){
      const sm=m.smallShare||0,pc=m.pacShare||0,bg=Math.max(0,(f.indiv-(f.small||0))/f.rec);
      const top=sm>=bg&&sm>=pc?'small donors giving $200 or less':pc>=bg?'PACs and other groups':'donors giving more than $200';
      const ind=(m.industries||[]).filter(r=>!/^(Other or not listed|Not employed|Retired|Other business|Politicians|Party committees)/.test(r[0]))[0];
      out.push(`${L} raised ${M(f.rec)} in the <span style="white-space:nowrap">2025\u201326</span> election cycle, mostly from ${top}${ind?`; the biggest industry giving is ${esc(ind[0].toLowerCase())}`:''}.`);
    }
    if(!m.tradeN)out.push(`No stock trades reported since January 2025.`);
    else{const tp=share(P.trades,m.tradeN);out.push(`${tp>=.9?`${L} is one of Congress’s most active stock traders, with`:`${L} reported`} ${ord(m.tradeN)} stock trade${m.tradeN>1?'s':''} since January 2025${m.commTrades?`, ${m.commTrades} in industries their committees oversee`:''}.`)}
    if(c&&c.laws)out.push(`Over their career, ${ord(c.laws)} bill${c.laws>1?'s':''} they wrote became law.`);
    return plainCard(out.join(' '));
  }catch(e){console.warn(e);return ''}
}
function plainPast(p){
  try{
    if(!p||!p.t?.length)return '';
    const last=p.t[p.t.length-1],cur=(last[2]||0)>2026,out=[];
    const roles=[...new Set(p.t.map(t=>t[0]))];
    const what=roles.map(r=>r==='H'?'representative':r==='S'?'senator':r==='P'?'president':'vice president');
    const states=[...new Set(p.t.map(t=>t[3]).filter(Boolean))].map(s=>ST[s]||s);
    const party=({Democrat:'Democratic',Independent:'independent'})[p.lp||last[5]]||p.lp||last[5]||'';
    const span=p.firstY&&p.lastY?`${p.firstY} to ${Math.min(p.lastY,2026)}`:'';
    out.push(`${esc(p.n)} ${cur?'is':'was'} ${/^[aeiou]/i.test(party)?'an':'a'} ${esc(party)} ${what.join(' and ')}${states.length?` from ${esc(states.join(' and '))}`:''}${span?`, serving ${cur?'since '+p.firstY:span}`:''}.`);
    if(p.missRate!=null&&p.elig>50)out.push(p.missRate>=.2?`Missed ${pct(p.missRate,0)} of recorded votes, which was common in an era of slow travel and long recesses.`.replace(/, which was common.*$/,p.firstY<1950?', which was common in an era of slow travel and long recesses.':'.'):p.missRate<=.03?`Almost never missed a vote.`:`Missed ${pct(p.missRate,0)} of recorded votes.`);
    if(p.loyal!=null&&p.pvN>30)out.push(p.loyal>=.9?`Voted with their party ${pct(p.loyal,0)} of the time when the parties split.`:p.loyal<=.7?`Often broke with their party, siding with it only ${pct(p.loyal,0)} of the time when the parties split.`:'');
    if(p.laws)out.push(`${ord(p.laws)} bill${p.laws>1?'s':''} they wrote became law.`);
    if(p.raisedAll)out.push(`Raised ${M(p.raisedAll)} across all campaigns on record.`);
    return plainCard(out.filter(Boolean).join(' '));
  }catch(e){console.warn(e);return ''}
}
function plainNom(n){
  try{
    const out=[`${esc(n.name)} was confirmed as ${esc(n.pos)} on ${fmtISO(n.d)} by a Senate vote of ${n.y}–${n.n}.`];
    const gap=n.y-n.n;
    out.push(n.n===0?'Not a single senator voted no.':gap<=3?'That’s one of the closest confirmation votes.':gap>=40?'That’s a wide, bipartisan margin.':'');
    if(n.crossN)out.push(`${n.crossN} senator${n.crossN>1?'s':''} crossed party lines on the vote.`);
    const o=n.oge||{};
    if(o.divest?.length)out.push(`Promised to sell ${o.divest.length} holding${o.divest.length>1?'s':''} to avoid conflicts of interest.`);
    if(o.waivers)out.push(`Has ${o.waivers} ethics waiver${o.waivers>1?'s':''} on file.`);
    return plainCard(out.filter(Boolean).join(' '));
  }catch(e){console.warn(e);return ''}
}

/* ================= "How your reps voted" on bill pages ================= */
function repVotesBlock(key){
  const reps=typeof myReps==='function'?myReps():[];
  const head=`<div class="sh"><h2>How your reps voted</h2>${reps.length?'<button data-tab="following">Change</button>':''}</div>`;
  if(!reps.length)return `<section class="sec yrv">${head}<div class="calm">Add your ZIP code to see how your senators and representative voted on bills like this one. <button class="link inl" data-tab="following">Add ZIP code</button></div></section>`;
  if(!key.startsWith('119-'))return `<section class="sec yrv">${head}<div class="calm">Your reps’ individual votes are shown for bills in the current Congress (2025–26). This bill is from an earlier Congress.</div></section>`;
  const word={Y:'Yes',N:'No',M:'Didn’t vote'};
  const blocks=[];
  ['House','Senate'].forEach(ch=>{
    const ids=DATA.passage[ch]||[];
    ids.forEach((rid,i)=>{const r=DATA.rc[rid];if(!r||key119(billKey(r.b))!==key)return;
      const mine=reps.filter(m=>m.chamber===ch);if(!mine.length)return;
      const rows=mine.map(m=>{const c=(m.pv||'')[i];if(!c||c==='.')return '';return `<button class="row" data-p="${m.id}" style="grid-template-columns:auto 1fr auto">${face(m,40)}<span style="min-width:0"><span class="t">${esc(m.name)}</span><br><span class="s">${esc(partyLine(m))}</span></span><span class="vchip v${c}">${word[c]||c}</span></button>`}).join('');
      if(rows)blocks.push(`<div class="yrvh">${ch} vote · ${fmtISO(r.d)} · ${esc(r.res||r.q||'')}${r.y!=null?` (${r.y}–${r.n})`:''}</div><div class="group">${rows}</div>`);
    });
  });
  if(!blocks.length)return `<section class="sec yrv">${head}<div class="calm">Your reps haven’t cast a recorded vote on this bill. Many bills never get a recorded vote in one or both chambers.</div></section>`;
  return `<section class="sec yrv">${head}${blocks.join('')}</section>`;
}
function placeRepVotes(){
  const top=S.stack.at(-1)||'';if(!top.startsWith('bill:'))return;
  const app=$('#app');if(!app||app.querySelector('.yrv'))return;
  const key=top.slice(5);let html='';try{html=repVotesBlock(key)}catch(e){console.warn(e);return}
  const secs=[...app.querySelectorAll('.wrap > .sec, .wrap > section.sec')];
  const after=secs.find(s=>/Where it stands/.test(s.querySelector('h2')?.textContent||''))||secs[0];
  if(after)after.insertAdjacentHTML('afterend',html);
}

/* ================= "This week in Congress" digest on the home screen ================= */
function weekDigest(){
  try{
    const end=DATA.asOf.votes;const back=n=>new Date(new Date(end+'T12:00:00Z')-n*864e5).toISOString().slice(0,10);
    let days=7,from=back(7);
    const collect=()=>{
      const laws=typeof H!=='undefined'&&H?Object.entries(H.bills).filter(([k,b])=>{const L=b[10]?.L||'';return L>from&&L<=end}).sort((a,b)=>(b[1][10].L).localeCompare(a[1][10].L)):[];
      const votes=Object.entries(DATA.rc).filter(([k,r])=>r.d>from&&r.d<=end&&r.y!=null&&r.n!=null&&r.y+r.n>20&&!/Nomination/.test(r.q||'')).sort((a,b)=>Math.abs(a[1].y-a[1].n)-Math.abs(b[1].y-b[1].n));
      const trades=[];MEM.forEach(m=>(m.trades||[]).forEach(t=>{if(t[0]>from&&t[0]<=end)trades.push([m,t])}));trades.sort((a,b)=>(b[1][5]||b[1][4]||0)-(a[1][5]||a[1][4]||0));
      const noms=DATA.noms.filter(n=>n.d>from&&n.d<=end).sort((a,b)=>b.d.localeCompare(a.d));
      return {laws,votes,trades,noms};
    };
    let c=collect();
    if(c.laws.length+c.votes.length+c.trades.length+c.noms.length<4){days=14;from=back(14);c=collect()}
    const rows=[];
    c.laws.slice(0,3).forEach(([k,b])=>rows.push(`<button class="row dg" data-bk="${k}"><span class="dgi c-law">✓</span><span style="min-width:0"><span class="t clamp">${esc(billTitle(k))}</span><span class="s">Became law ${fmtISO(b[10].L)}</span></span>${chev}</button>`));
    c.votes.slice(0,2).forEach(([k,r])=>{const bk=key119(billKey(r.b));const t=r.s||billName(billKey(r.b));rows.push(`<button class="row dg" ${bk&&H&&H.bills[bk]?`data-bk="${bk}"`:''}><span class="dgi c-votes">⚖</span><span style="min-width:0"><span class="t clamp">${esc(t)}</span><span class="s">${k[0]==='S'?'Senate':'House'} vote, ${r.y}–${r.n} · ${esc(r.res||'')}</span></span>${chev}</button>`)});
    c.trades.slice(0,2).forEach(([m,t])=>rows.push(`<button class="row dg" data-p="${m.id}"><span class="dgi c-stocks">$</span><span style="min-width:0"><span class="t clamp">${esc(m.name)} ${/sale|sell/i.test(t[1])?'sold':'bought'} ${esc(String(t[3]||t[2]||'stock').replace(/\s*-?\s*Common Stock.*$/i,''))}</span><span class="s">Up to ${M(t[5]||t[4])} · ${fmtISO(t[0])}${(()=>{const o=({SP:'spouse',JT:'joint account',DC:'child',SPOUSE:'spouse',JOINT:'joint account','DEPENDENT CHILD':'child'})[String(t[6]||'').toUpperCase()];return o?` · ${o}`:''})()}</span></span>${chev}</button>`));
    c.noms.slice(0,1).forEach(n=>rows.push(`<button class="row dg" data-n="${n.id}"><span class="dgi c-confirm">★</span><span style="min-width:0"><span class="t clamp">${esc(n.name)} confirmed</span><span class="s">${esc(n.pos)} · ${n.y}–${n.n}</span></span>${chev}</button>`));
    if(!rows.length)return '';
    const totals=[c.laws.length&&`${c.laws.length} new law${c.laws.length>1?'s':''}`,c.votes.length&&`${c.votes.length} recorded vote${c.votes.length>1?'s':''}`,c.trades.length&&`${c.trades.length} stock trade${c.trades.length>1?'s':''}`,c.noms.length&&`${c.noms.length} confirmation${c.noms.length>1?'s':''}`].filter(Boolean).join(' · ');
    return `<section class="sec digest"><div class="sh"><h2>${days===7?'This week':'The last two weeks'} in Congress</h2></div><div class="dgsub">${fmtISO(back(days-1))} – ${fmtISO(end)} · ${totals}</div><div class="group">${rows.join('')}</div></section>`;
  }catch(e){console.warn(e);return ''}
}

/* ================= Spanish versions of the generated summaries ================= */
const trx=s=>{try{i18nCompile();const v=i18nStr(s);return v==null?s:v.trim()}catch(e){return s}};
const _plainMemberEN=plainMember,_plainPastEN=plainPast,_plainNomEN=plainNom;
const plainCardES=txt=>txt?`<section class="pe-card"><div class="pe-h">En pocas palabras</div><p>${txt}</p></section>`:'';
const esN=n=>ord(n);
plainMember=function(m){
  if(S.lang!=='es')return _plainMemberEN(m);
  try{
    const P=POOL[m.chamber],c=(typeof HC!=='undefined'&&HC[m.id])||null,F=(c?.g||'')==='F',L=esc(m.last),out=[];
    const peers=m.chamber==='Senate'?'los senadores':'los miembros de la Cámara';
    const pad={D:'demócrata',R:F?'republicana':'republicano',I:'independiente'}[m.party]||'';
    const seat=m.chamber==='Senate'?`${F?'una senadora':'un senador'} ${pad} por ${esc(m.stateName)}`:m.delegate?`${F?'una delegada':'un delegado'} ${pad} por ${esc(m.stateName)}`:!m.district?`${F?'una representante':'un representante'} ${pad} por todo el estado de ${esc(m.stateName)}`:`${F?'una representante':'un representante'} ${pad} por el distrito ${m.district} de ${esc(m.stateName)}`;
    out.push(`${esc(m.first)} ${L} es ${seat} y está en el Congreso desde ${m.since}.`);
    if(m.id!==SPEAKER&&!m.delegate&&m.missed!=null&&P.present.length){
      const mp=share(P.present.map(x=>1-x),m.missed);
      out.push(mp>=.75?`${L} falta a más votaciones que el ${Math.round(mp*100)}% de ${peers}.`:mp<=.25?`${L} casi nunca falta a una votación.`:`${L} asiste a las votaciones con la misma frecuencia que la mayoría de ${peers}.`);
      if(m.unity!=null&&share(P.unity,m.unity)<=.1)out.push(`${L} vota en contra de su partido más que casi cualquier otro miembro.`);
    }
    const f=m.money;
    if(f&&f.rec>0){
      const sm=m.smallShare||0,pc=m.pacShare||0,bg=Math.max(0,(f.indiv-(f.small||0))/f.rec);
      const top=sm>=bg&&sm>=pc?'pequeños donantes que dan $200 o menos':pc>=bg?'PAC y otros grupos':'donantes que dan más de $200';
      const ind=(m.industries||[]).filter(r=>!/^(Other or not listed|Not employed|Retired|Other business|Politicians|Party committees)/.test(r[0]))[0];
      out.push(`${L} recaudó ${M(f.rec)} en el ciclo electoral <span style="white-space:nowrap">2025–26</span>, sobre todo de ${top}${ind?`; la industria que más aporta es ${esc(trx(ind[0]).toLowerCase())}`:''}.`);
    }
    if(!m.tradeN)out.push(`No ha reportado operaciones de acciones desde enero de 2025.`);
    else{const tp=share(P.trades,m.tradeN);out.push(`${tp>=.9?`${L} es ${F?'una':'uno'} de los miembros del Congreso que más acciones compran y venden, con`:`${L} reportó`} ${esN(m.tradeN)} ${m.tradeN>1?'operaciones':'operación'} de acciones desde enero de 2025${m.commTrades?`, ${m.commTrades} en industrias que supervisan sus comités`:''}.`)}
    if(c&&c.laws)out.push(`A lo largo de su carrera, ${esN(c.laws)} ${c.laws>1?'proyectos de ley que presentó se convirtieron':'proyecto de ley que presentó se convirtió'} en ley.`);
    return plainCardES(out.join(' '));
  }catch(e){console.warn(e);return _plainMemberEN(m)}
};
plainPast=function(p){
  if(S.lang!=='es')return _plainPastEN(p);
  try{
    if(!p||!p.t?.length)return '';
    const last=p.t[p.t.length-1],cur=(last[2]||0)>2026,F=p.g==='F',out=[];
    const roles=[...new Set(p.t.map(t=>t[0]))];
    const what=roles.map(r=>r==='H'?(F?'representante':'representante'):r==='S'?(F?'senadora':'senador'):r==='P'?(F?'presidenta':'presidente'):(F?'vicepresidenta':'vicepresidente'));
    const states=[...new Set(p.t.map(t=>t[3]).filter(Boolean))].map(s=>ST[s]||s);
    const pr=p.lp||last[5]||'';
    const party=({Democrat:'demócrata',Republican:F?'republicana':'republicano',Independent:'independiente',Whig:'whig',Federalist:F?'federalista':'federalista'})[pr]||pr;
    const span=p.firstY&&p.lastY?(cur?`desde ${p.firstY}`:`de ${p.firstY} a ${Math.min(p.lastY,2026)}`):'';
    out.push(`${esc(p.n)} ${cur?'es':'fue'} ${F?'una':'un'} ${what.join(' y ')} ${esc(party)}${states.length?` por ${esc(states.join(' y '))}`:''}${span?`, en el cargo ${span}`:''}.`);
    if(p.missRate!=null&&p.elig>50)out.push(p.missRate>=.2?`Faltó al ${pct(p.missRate,0)} de las votaciones registradas${p.firstY<1950?', algo común en una época de viajes lentos y largos recesos':''}.`:p.missRate<=.03?`Casi nunca faltó a una votación.`:`Faltó al ${pct(p.missRate,0)} de las votaciones registradas.`);
    if(p.loyal!=null&&p.pvN>30)out.push(p.loyal>=.9?`Votó con su partido el ${pct(p.loyal,0)} de las veces cuando los partidos se dividieron.`:p.loyal<=.7?`A menudo votó en contra de su partido; lo apoyó solo el ${pct(p.loyal,0)} de las veces cuando los partidos se dividieron.`:'');
    if(p.laws)out.push(`${esN(p.laws)} ${p.laws>1?'proyectos de ley que presentó se convirtieron':'proyecto de ley que presentó se convirtió'} en ley.`);
    if(p.raisedAll)out.push(`Recaudó ${M(p.raisedAll)} en todas sus campañas registradas.`);
    return plainCardES(out.filter(Boolean).join(' '));
  }catch(e){console.warn(e);return _plainPastEN(p)}
};
plainNom=function(n){
  if(S.lang!=='es')return _plainNomEN(n);
  try{
    const out=[`${esc(n.name)} fue confirmado como ${esc(trx(n.pos))} el ${esDate(fmtISO(n.d))} con una votación del Senado de ${n.y}–${n.n}.`];
    const gap=n.y-n.n;
    out.push(n.n===0?'Ningún senador votó en contra.':gap<=3?'Es una de las confirmaciones más reñidas.':gap>=40?'Fue un margen amplio y bipartidista.':'');
    if(n.crossN)out.push(`${n.crossN} ${n.crossN>1?'senadores votaron':'senador votó'} en contra de la línea de su partido.`);
    const o=n.oge||{};
    if(o.divest?.length)out.push(`Prometió vender ${o.divest.length} ${o.divest.length>1?'inversiones':'inversión'} para evitar conflictos de interés.`);
    if(o.waivers)out.push(`Tiene ${o.waivers} ${o.waivers>1?'exenciones':'exención'} de ética registradas.`);
    return plainCardES(out.filter(Boolean).join(' '));
  }catch(e){console.warn(e);return _plainNomEN(n)}
};
/* "See all" buttons on leaderboards */
window.addEventListener('click',e=>{const b=e.target.closest('[data-seeall]');if(!b)return;e.preventDefault();e.stopPropagation();const k=b.dataset.seeall;$('#sheet').hidden=true;if(k==='ethics'){S.stack=[];S.tab='search';go('ethics')}else navGo('rank:'+k)},true);
