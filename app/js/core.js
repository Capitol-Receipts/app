if(typeof window.track!=="function")window.track=function(){};
const DATA=window.__DATA;
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const M=n=>{n=+n||0;const a=Math.abs(n);return (n<0?'-':'')+(a>=1e9?'$'+(a/1e9).toFixed(1).replace(/\.0$/,'')+'B':a>=1e6?'$'+(a/1e6).toFixed(1).replace(/\.0$/,'')+'M':a>=1e3?'$'+Math.round(a/1e3)+'K':'$'+Math.round(a))};
const pct=(x,d=0)=>x==null||isNaN(x)?'—':(x*100).toFixed(d)+'%';
const PN={R:'Republican',D:'Democrat',I:'Independent'};
const ST={AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',DC:'District of Columbia',PR:'Puerto Rico',GU:'Guam',VI:'Virgin Islands',AS:'American Samoa',MP:'Northern Mariana Islands'};
const chev='<svg class="chev" viewBox="0 0 8 13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 1.5 6.5 6.5 1.5 11.5"/></svg>';
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
/* newest date any source was refreshed (votes can sit still while Congress is out) */
const lastUpdated=()=>Object.values(DATA.asOf||{}).filter(v=>/^\d{4}-\d\d-\d\d/.test(v||'')).sort().pop();
const fmtISO=d=>{if(!d)return '—';const[y,m,dd]=d.split('-');return `${MON[+m-1]} ${+dd}, ${y}`};
const fmtUS=d=>{if(!d)return '—';const[m,dd,y]=d.split('/');return `${MON[+m-1]} ${+dd}, ${y}`};
const usToISO=d=>{const[m,dd,y]=d.split('/');return `${y}-${m.padStart(2,'0')}-${dd.padStart(2,'0')}`};
const rangeTxt=(lo,hi)=>lo==null?'—':hi?`${M(lo)}–${M(hi)}`:`Over ${M(lo)}`;
const SPEAKER='J000299';

/* ---------- members ---------- */
const MEM=DATA.members;
MEM.forEach(m=>{
  m.kind='member';
  m.title=m.chamber==='Senate'?'Sen.':m.delegate?'Del.':'Rep.';
  m.full=`${m.title} ${m.name}`;
  m.stateName=ST[m.state]||m.state;
  m.where=m.chamber==='Senate'?m.stateName:(m.district?`${m.stateName} · District ${m.district}`:`${m.stateName} · At large`);
  m.pacShare=m.money&&m.money.rec>0?m.money.pac/m.money.rec:null;
  m.missed=m.elig&&m.id!==SPEAKER?1-m.present:null;
  m.breaks=m.unity!=null&&m.unityN>=50?1-m.unity:null;
  m.revN=m.revolving?m.revolving.length:(m.revN||0);
  m.tradeN=m.tradeN||0;m.commTrades=m.commTrades||0;m.ethN=(m.ethics||[]).length;
  m.topInd=(m.industries||[]).filter(r=>!/^(Other or not listed|Retired|Not employed|Other business|Politicians|Party committees)/.test(r[0]))[0]?.[0]||null;
  m.years=2026-m.since;
  m.initials=(m.first[0]+m.last.replace(/^(Mc|Mac|De|Van|Von|La|Le)(?=[A-Z])/,'')[0]).toUpperCase();
  m.search=(m.full+' '+m.state+' '+m.stateName+' '+m.partyName+' '+(m.district||'')).toLowerCase();
});
const byId=Object.fromEntries(MEM.map(m=>[m.id,m]));
const POOL={};
['Senate','House'].forEach(ch=>{const g=MEM.filter(m=>m.chamber===ch&&!m.delegate),big=g.filter(m=>m.money&&m.money.rec>=50000);POOL[ch]={
  present:g.filter(m=>m.elig>=50&&m.id!==SPEAKER).map(m=>m.present),
  unity:g.filter(m=>m.unity!=null&&m.unityN>=50).map(m=>m.unity),
  small:big.filter(m=>m.smallShare!=null).map(m=>m.smallShare),
  pacShare:big.map(m=>m.pacShare),
  trades:g.map(m=>m.tradeN),
  rev:g.map(m=>m.revN),comm:g.map(m=>m.commTrades)}});
const below=(arr,v)=>arr.filter(x=>x<v).length/arr.length;
const median=a=>{const s=[...a].sort((x,y)=>x-y);return s[Math.floor(s.length/2)]};

/* ---------- nominees ---------- */
const NOM=DATA.noms;
const CABINET=/^(Secretary of (State|the Treasury|Defense|War|the Interior|Agriculture|Commerce|Labor|Health and Human Services|Housing and Urban Development|Transportation|Energy|Education|Veterans Affairs|Homeland Security)|Attorney General|Director of National Intelligence|Administrator of the Environmental Protection Agency|United States Trade Representative|Director of the Office of Management and Budget|Administrator of the Small Business Administration|Director of the Central Intelligence Agency|Representative of the United States of America to the United Nations)$/;
NOM.forEach(n=>{
  n.kind='nominee';n.waivers=n.oge?.waivers||0;
  n.cat=CABINET.test(n.pos)?'Cabinet':/Judge|Justice/.test(n.pos)?'Judges':/Ambassador|Representative of the United States/.test(n.pos)?'Ambassadors':/United States (Attorney|Marshal)/.test(n.pos)?'Prosecutors & marshals':'Agency leaders';
  n.initials=n.name.split(/\s+/).filter(w=>/^[A-Z]/.test(w)).map(w=>w[0]).filter((_,i,a)=>i===0||i===a.length-1).join('');
  n.search=(n.name+' '+n.pos+' '+n.from_).toLowerCase();
  n.crossN=n.cross.length; n.margin=n.y-n.n;
});
const nomById=Object.fromEntries(NOM.map(n=>[n.id,n]));
const billKey=b=>(b||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const billName=b=>{const k=billKey(b),m=k.match(/^([A-Z]+)(\d+)$/);if(!m)return b;return ({HR:'H.R.',S:'S.',HJRES:'H.J.Res.',SJRES:'S.J.Res.',HCONRES:'H.Con.Res.',SCONRES:'S.Con.Res.',HRES:'H.Res.',SRES:'S.Res.'}[m[1]]||m[1])+' '+m[2]};

/* ---------- sorting ---------- */
const MSORT={
  name:['Name',m=>m.last,null,1],
  missed:['Votes missed',m=>m.missed,m=>pct(m.missed,1),-1],
  raised:['Money raised',m=>m.money?.rec,m=>M(m.money?.rec),-1],
  trades:['Stock trades',m=>m.tradeN,m=>m.tradeN.toLocaleString(),-1],
  comm:['Trades tied to committees',m=>m.commTrades,m=>m.commTrades,-1],
  ethics:['Ethics statements',m=>m.ethN,m=>m.ethN,-1],
  small:['Small-donor share',m=>m.smallShare,m=>pct(m.smallShare),-1],
  pac:['PAC share',m=>m.pacShare,m=>pct(m.pacShare),-1],
  breaks:['Breaks with party',m=>m.breaks,m=>pct(m.breaks,1),-1],
  rev:['Former staff lobbying',m=>m.revN,m=>m.revN,-1],
  cash:['Cash on hand',m=>m.money?.coh,m=>M(m.money?.coh),-1],
  years:['Years in Congress',m=>m.years,m=>m.years+' yrs',-1],
  age:['Age',m=>m.age,m=>m.age,-1]
};
const NSORT={waivers:['Conflict waivers',n=>n.waivers,n=>n.waivers+(n.waivers===1?' waiver':' waivers'),-1],newest:['Newest',n=>n.d,null,-1],oldest:['Oldest',n=>n.d,null,1],close:['Closest vote',n=>n.margin,n=>`${n.y}–${n.n}`,1],cross:['Most crossovers',n=>n.crossN,n=>n.crossN+' crossed',-1],name:['Name',n=>n.name.split(' ').pop(),null,1]};
function sortList(list,spec,dir){
  const [,f,,def]=spec,d=dir??def;
  return [...list].sort((a,b)=>{const x=f(a),y=f(b);if(x==null&&y==null)return 0;if(x==null)return 1;if(y==null)return -1;return (typeof x==='string'?x.localeCompare(y):x-y)*d});
}

/* ---------- state ---------- */
const store={get(k,d){try{const v=localStorage.getItem('pt_'+k);return v==null?d:JSON.parse(v)}catch(_){return d}},set(k,v){try{localStorage.setItem('pt_'+k,JSON.stringify(v))}catch(_){}}};
const S={tab:'home',stack:[],ptab:'overview',filter:'All',party:'All',ncat:'All',q:'',limit:60,msort:'name',mdir:null,nsort:'newest',ndir:null,following:new Set(store.get('following',[])),home:store.get('home',''),seen:store.get('seen',''),scrolled:false};

/* ---------- feed ---------- */
const FEED=[];
NOM.slice(0,40).forEach(n=>FEED.push({d:n.d,kind:'nom',id:n.id,txt:`Senate confirmed <b>${esc(n.name)}</b> as ${esc(n.pos)}, ${n.y}–${n.n}.`}));
MEM.forEach(m=>(m.ptrFiles||[]).slice(0,3).forEach(f=>{if(f[0])FEED.push({d:f[0],kind:'trade',id:m.id,txt:`<b>${esc(m.full)}</b> filed a stock trade report${f[3]?' on paper':f[2]?` listing ${f[2]} trade${f[2]>1?'s':''}`:''}.`})}));
FEED.sort((a,b)=>b.d.localeCompare(a.d));
const FEEDTOP=FEED.slice(0,50);
const newCount=()=>FEEDTOP.filter(f=>f.d>(S.seen||'0')).length;

const ICONS={
 trade:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg>',
 nom:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12l5 5L20 6"/></svg>',
 back:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4l-8 8 8 8"/></svg>',
 share:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5M6 11H5v10h14V11h-1"/></svg>',
 sort:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4"/></svg>'
};
const TABS=[
 ['explore','Explore','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path class="f" d="M12 3l9 4H3z"/><path d="M5 9v8M9.5 9v8M14.5 9v8M19 9v8M3 20h18"/></svg>'],
 ['following','My Reps','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path class="f" d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z"/></svg>'],
 ['latest','Latest','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round"><path class="f" d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/></svg>'],
 ['account','Account','<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle class="f" cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>']
];

/* ---------- charts ---------- */
function colChart(rows,{h=150,fmt=v=>v,ref,showVals=true,every=1,flagIdx}={}){
  const W=320,pt=20,pb=22,n=rows.length;
  let max=Math.max(...rows.map(r=>r[1]),ref?ref.v:0)||1;max*=1.1;
  const cw=W/n,bw=Math.min(34,cw*.66),y=v=>pt+(1-v/max)*(h-pt-pb);
  let s=`<svg class="chart" viewBox="0 0 ${W} ${h}" role="img"><line class="g" x1="0" x2="${W}" y1="${h-pb}" y2="${h-pb}"/>`;
  rows.forEach((r,i)=>{const x=i*cw+(cw-bw)/2,v=r[1];
    if(v>0)s+=`<rect class="${flagIdx&&flagIdx(r)?'bf':'b'}" x="${x.toFixed(1)}" y="${y(v).toFixed(1)}" width="${bw.toFixed(1)}" height="${(h-pb-y(v)).toFixed(1)}" rx="2"/>`;
    if(showVals&&v>0)s+=`<text class="tv" x="${(x+bw/2).toFixed(1)}" y="${(y(v)-5).toFixed(1)}" text-anchor="middle">${fmt(v)}</text>`;
    if(i%every===0)s+=`<text class="tl" x="${(x+bw/2).toFixed(1)}" y="${h-6}" text-anchor="middle">${r[0]}</text>`;});
  if(ref){const yy=y(ref.v);s+=`<line class="ref" x1="0" x2="${W}" y1="${yy.toFixed(1)}" y2="${yy.toFixed(1)}"/>`;
    // put the label where the bars are lowest so it never sits on top of one
    const k=Math.max(1,Math.ceil(n*.35)),lo=Math.max(0,...rows.slice(0,k).map(r=>r[1])),hi=Math.max(0,...rows.slice(-k).map(r=>r[1]));
    const right=hi<=lo,peak=right?hi:lo,above=y(peak)>yy-16,ty=above?yy-5:Math.min(h-pb-4,yy+13);
    s+=`<text class="reft" x="${right?W:0}" y="${ty.toFixed(1)}" text-anchor="${right?'end':'start'}" style="paint-order:stroke;stroke:var(--surface,#fff);stroke-width:4px;stroke-linejoin:round">${ref.label}</text>`}
  return s+'</svg>';
}
const SC=['var(--fill)','var(--fill2)','var(--fill3)','var(--fill4)','var(--flag)','var(--soft)','var(--yes)','var(--no)'];
function stackBar(parts,total){
  parts=parts.filter(p=>p[1]>0);
  return `<div class="stack">${parts.map((p,i)=>`<span style="width:${(p[1]/total*100).toFixed(2)}%;background:${SC[i%SC.length]}"></span>`).join('')}</div>
  <div class="legend">${parts.map((p,i)=>`<div><i style="background:${SC[i%SC.length]}"></i><span>${esc(p[0])}</span><b>${M(p[1])}</b><em>${pct(p[1]/total)}</em></div>`).join('')}</div>`;
}
function hbars(rows,fmt=M,sub){const mx=Math.max(...rows.map(r=>r[1]))||1;return rows.map(r=>`<div class="hbar"><span>${esc(r[0])}${sub?`<br><span class="s">${sub(r)}</span>`:''}</span><b class="num" style="font-size:17px">${fmt(r[1])}</b><div class="tr"><span style="width:${(r[1]/mx*100).toFixed(1)}%"></span></div></div>`).join('')}
const mlabel=mo=>MON[+mo.slice(5)-1][0];

/* ---------- scores ---------- */
function scoreRow(label,display,arr,v,peers,note=''){
  if(v==null||!arr.length)return '';
  const P=Math.round(below(arr,v)*100);
  const sent=P>=50?`Higher than ${P}% of ${peers}`:`Lower than ${100-P}% of ${peers}`;
  const vd=P>=85?['Among the highest','hi2']:P>=60?['Above average','hi']:P>15&&P<40?['Below average','lo']:P<=15?['Among the lowest','lo2']:['About average','mid'];
  return `<div class="score"><div class="top"><span class="lbl">${label}</span><span class="big">${display}</span></div><span class="verdict v-${vd[1]}">${vd[0]}</span>
   <div class="track"><span class="sf" style="width:${P}%"></span><span class="med"></span><span class="dot" style="left:${Math.min(98,Math.max(2,P))}%"></span></div>
   <div class="why">${sent}${note?' · '+note:''}</div></div>`;
}
function scorecard(m){
  const P=POOL[m.chamber],peers=m.chamber==='Senate'?'senators':'House members';
  if(m.delegate)return `<div class="empty">Delegates can't vote on final passage of bills, so we don't rank them against voting members.</div>`;
  return (m.id===SPEAKER?`<div class="empty">The Speaker of the House rarely votes by tradition, so attendance isn't scored.</div>`:scoreRow('Shows up to vote',pct(m.present,1),P.present,m.present,peers,`${m.voted} of ${m.elig} recorded votes`))+
   scoreRow('Votes with their party',pct(m.unity,1),P.unity,m.unity,peers,`when the parties split`)+
   scoreRow('Money from small donors',pct(m.smallShare),P.small,m.smallShare,peers,'gifts under $200, 2025–26')+
   scoreRow('Money from PACs and groups',pct(m.pacShare),P.pacShare,m.pacShare,peers,'2025–26')+
   scoreRow('Stock trades reported',String(m.tradeN),P.trades,m.tradeN,peers,'since Jan 2025')+
   scoreRow('Trades tied to their committees',String(m.commTrades),P.comm,m.commTrades,peers,'companies their committees oversee')+
   scoreRow('Former staff now lobbying',String(m.revN),P.rev,m.revN,peers,'registered lobbyists');
}

/* ---------- rows ---------- */
function memRow(m,right){
  return `<button class="row" data-p="${m.id}"><span class="av ${m.party}">${m.initials}</span>
   <span style="min-width:0"><span class="t">${esc(m.full)}</span><br><span class="s"><span class="pty ${m.party}">${m.party}</span>${esc(m.where)}</span></span>
   <span style="display:flex;gap:10px;align-items:center">${right!=null?`<span class="val" style="font-size:18px">${right}</span>`:''}${chev}</span></button>`;
}
function nomRow(n,right){
  return `<button class="row" data-n="${n.id}"><span class="av N">${esc(n.initials)}</span>
   <span style="min-width:0"><span class="t">${esc(n.name)}</span><br><span class="s">${esc(n.pos)}</span></span>
   <span style="display:flex;gap:10px;align-items:center"><span class="val" style="font-size:17px">${right??`${n.y}–${n.n}`}</span>${chev}</span></button>`;
}
function board(title,list,valFn,note,key){
  return `<div class="sec"><div class="sh"><h2>${title}</h2>${key?`<button data-seeall="${key}">See all</button>`:''}</div><div class="group">${list.map((m,i)=>`<button class="row" data-p="${m.id}"><span class="rank">${i+1}</span>
   <span style="min-width:0"><span class="t">${esc(m.full)}</span><br><span class="s"><span class="pty ${m.party}">${m.party}</span>${esc(m.stateName)}</span></span><span class="val">${valFn(m)}</span></button>`).join('')}</div>${note?`<div class="cap">${note}</div>`:''}</div>`;
}
function sortBar(specs,cur,dir,kind){
  const d=dir??specs[cur][3];
  return `<div class="sortbar"><label class="sortsel">${ICONS.sort}<select id="${kind}sort" aria-label="Sort by">${Object.entries(specs).map(([k,v])=>`<option value="${k}" ${k===cur?'selected':''}>${v[0]}</option>`).join('')}</select></label>
   <button class="dirbtn" data-dir="${kind}" aria-label="Reverse order">${d===1?'Low to high':'High to low'}</button></div>`;
}

/* ---------- screens ---------- */
function scopeHero(){
  const n=MEM.length,sen=MEM.filter(m=>m.chamber==='Senate').length,hou=n-sen;
  const H2={Congress:['Everyone in Congress',`${n} members · ${sen} senators and ${hou} in the House`,'bg-capitol'],Senate:['The Senate',`${sen} senators, two from each state`,'bg-capfull'],House:['The House',`${hou} members, each representing a district`,'bg-house'],Appointees:['Appointees',`${NOM.length} people the Senate confirmed since January 2025`,'bg-white'],History:['History','Every member since 1789, every president, and their appointees','bg-old']}[S.filter];
  return H2?`<div class="lbanner ${H2[2]} pghero" style="margin-top:12px"><h1>${H2[0]}</h1><span>${H2[1]}</span></div>`:'';
}
function explore(){
  if(S.filter==='History')return historyScreen();
  const q=S.q.trim().toLowerCase();
  const voting=MEM.filter(m=>!m.delegate);
  const top=(arr,f,n=5)=>[...arr].filter(m=>f(m)!=null).sort((a,b)=>f(b)-f(a)).slice(0,n);
  let h=searchHeader('Name, state, party or job')+scopeHero();
  if(S.filter==='Appointees'){
    const cats=['All','Cabinet','Agency leaders','Judges','Ambassadors','Prosecutors & marshals'];
    const list=sortList(NOM.filter(n=>(S.ncat==='All'||n.cat===S.ncat)&&(!q||fz(n.search,q))),NSORT[S.nsort],S.ndir);
    const vf=NSORT[S.nsort][2];
    h+=`<div class="chipsrow">${cats.map(c=>`<button data-nc="${c}" aria-pressed="${c===S.ncat}">${c}</button>`).join('')}</div>${sortBar(NSORT,S.nsort,S.ndir,'n')}
    <div class="sec" style="margin-top:14px"><div class="sh"><h2>Confirmed by the Senate</h2><span class="cap" style="padding:0">${list.length}</span></div>
    <div class="group">${list.slice(0,S.limit).map(n=>nomRow(n,vf?vf(n):null)).join('')||'<div class="empty">No one matches that search.</div>'}</div>
    ${list.length>S.limit?`<button class="more" data-more>Show more</button>`:''}
    <div class="cap">Everyone the Senate confirmed by recorded vote since January 2025. Many lower-level posts are approved without a recorded vote and aren't listed.</div></div>`;
    return `<div class="wrap">${h}</div>`;
  }
  h+=`<div class="chipsrow">${[['All','All parties'],['D','Democrats'],['R','Republicans'],['I','Independents']].map(([k,l])=>`<button data-party="${k}" aria-pressed="${k===S.party}">${l}</button>`).join('')}</div>`;
  const browsing=false;
  if(browsing){
    h+=board('Most votes missed',top(voting,m=>m.elig>=100?m.missed:null),m=>pct(m.missed,1),'Share of roll-call votes they didn’t cast, Jan 2025 – Sep 2026.','missed');
    h+=board('Most stock trades',top(voting,m=>m.tradeN),m=>m.tradeN,'Individual trades listed in their reports since January 2025, both chambers. Trading is legal; reports are required.','trades');
    h+=board('Most trades tied to their committees',top(voting,m=>m.commTrades),m=>m.commTrades,'Trades in companies from industries their committees oversee, like an Energy Committee member trading oil stocks.','comm');
    const eth=MEM.filter(m=>m.ethN).sort((a,b)=>b.ethics[0][0].localeCompare(a.ethics[0][0])).slice(0,6);
    if(eth.length)h+=`<div class="sec"><div class="sh"><h2>House Ethics Committee actions</h2><button data-seeall="ethics">See all</button></div><div class="group">${eth.map(m=>memRow(m,`<span class="tag off" style="font-family:var(--ui);font-size:12px">${esc(m.ethics[0][1])}</span>`)).join('')}</div><div class="cap">Public statements by the House Ethics Committee since January 2025. A review is not a finding of wrongdoing.</div></div>`;
    h+=board('Most former staff now lobbying',top(voting,m=>m.revN),m=>m.revN,'People who list a job in this member’s office on a current lobbying registration.','rev');
    h+=board('Biggest fundraisers',top(voting,m=>m.money?.rec),m=>M(m.money.rec),'Raised for the 2025–26 election cycle.','raised');
    h+=board('Most likely to break with their party',top(voting,m=>m.unityN>=100?m.breaks:null),m=>pct(m.breaks,1),'Share of party-split votes where they sided against their own party.','breaks');
    const bills=Object.entries(DATA.bills).sort((a,b)=>b[1].n-a[1].n).slice(0,5);
    h+=`<div class="sec"><div class="sh"><h2>Most-lobbied bills with votes</h2></div><div class="group">${bills.map(([b,x],i)=>{const r=Object.values(DATA.rc).find(r=>billKey(r.b)===b&&r.s);return `<button class="row" data-bill="${b}"><span class="rank">${i+1}</span><span style="min-width:0"><span class="t">${esc(r?.s||billName(b))}</span><br><span class="s">${billName(b)}</span></span><span class="val">${x.n}</span></button>`}).join('')}</div><div class="cap">Number of organizations whose lobbying reports name the bill, ${esc(DATA.lobby?.periods||'')}.</div></div>`;
    h+=`<div class="sec"><div class="sh"><h2>Biggest lobbying spenders</h2></div><div class="group pad">${hbars((DATA.lobby?.topClients||[]).slice(0,8))}</div><div class="cap">Reported lobbying spending, ${esc(DATA.lobby?.periods||'')}.</div></div>`;
    h+=`<div class="sec"><div class="sh"><h2>Latest confirmations</h2><button data-f="Appointees">See all</button></div><div class="group">${NOM.slice(0,4).map(n=>nomRow(n)).join('')}</div></div>`;
  }
  const flt={All:()=>true,Congress:()=>true,Senate:m=>m.chamber==='Senate',House:m=>m.chamber==='House'}[S.filter]||(()=>true);
  const list=sortList(MEM.filter(flt).filter(m=>S.party==='All'||m.party===S.party).filter(m=>!q||fz(m.search,q)),MSORT[S.msort],S.mdir);
  const vf=MSORT[S.msort][2];
  const nomHits=q?NOM.filter(n=>fz(n.search,q)).slice(0,5):[];
  if(typeof partyCompare==='function'&&S.party==='All'&&(!S.msort||S.msort==='name'))h+=partyCompare(list,S.filter==='Senate'?'Senate: Democrats vs Republicans':S.filter==='House'?'House: Democrats vs Republicans':q?'Democrats vs Republicans in these results':'Congress: Democrats vs Republicans');
  h+=`<div class="sec" id="listtop"><div class="sh"><h2>${q?'Members of Congress':S.filter==='All'||S.filter==='Congress'?'All of Congress':S.filter==='Senate'?'Senators':'House members'}</h2><span class="cap" style="padding:0">${list.length}</span></div>
   ${sortBar(MSORT,S.msort,S.mdir,'m')}
   <div class="group" style="margin-top:10px">${list.slice(0,S.limit).map(m=>memRow(m,vf?vf(m):null)).join('')||'<div class="empty">No one matches that search.</div>'}</div>
   ${list.length>S.limit?`<button class="more" data-more>Show ${Math.min(list.length-S.limit,100)} more</button>`:''}</div>`;
  if(nomHits.length)h+=`<div class="sec"><div class="sh"><h2>Appointees</h2></div><div class="group">${nomHits.map(n=>nomRow(n)).join('')}</div></div>`;
  if(q&&S.filter==='All')h+=pastHits(q);
  return `<div class="wrap">${h}</div>`;
}

function navBand(color,short,head,body){
  return `<header class="nav ${S.scrolled?'scrolled':''}" id="nav" style="background:${color}"><div class="in">
    <button data-back aria-label="Back">${ICONS.back}<span>${S.stack.length>1?'Back':{explore:'Explore',following:'My Reps',latest:'Latest',account:'Account'}[S.tab]}</span></button>
    <span class="mid">${esc(short)}</span><button data-share aria-label="Share">${ICONS.share}</button></div></header>
  <section class="band" style="background:${color}"><div class="in">${head}</div></section><div class="wrap">${body}</div>`;
}
function memberProfile(m){
  const on=S.following.has(m.id);
  const strip=[[m.since,'In Congress since'],[m.missed==null?'—':pct(m.missed,1),'Votes missed'],[m.money?M(m.money.rec):'—','Raised 2025–26'],[m.tradeN,'Stock trades']];
  const tabs=[['overview','Overview'],['money','Money'],['votes','Votes'],['stocks','Trades'],['influence','Influence']];
  if(!tabs.some(t=>t[0]===S.ptab))S.ptab='overview';
  const body={overview:mOverview,money:mMoney,votes:mVotes,stocks:mStocks,influence:mInfluence}[S.ptab](m);
  return navBand(`var(--${m.party})`,m.last,`
    <div class="idrow"><span class="av">${m.initials}</span><div style="min-width:0"><h1 class="pname">${esc(m.first)}<br>${esc(m.last)}</h1>
      <div class="prole">${m.chamber==='Senate'?'U.S. Senator':m.delegate?'Delegate':'U.S. Representative'} · ${esc(m.where)}</div></div>
      <button class="follow ${on?'on':''}" data-follow="${m.id}">${on?'Following':'Follow'}</button></div>
    <div class="chips"><span class="chip">${esc(m.partyName)}${m.caucus!==m.party?` · caucuses with ${PN[m.caucus]}s`:''}</span><span class="chip">Next election ${m.next}</span>${m.age?`<span class="chip">Age ${m.age}</span>`:''}</div>
    <div class="strip">${strip.map(([a,b])=>`<div><b>${a}</b><span>${b}</span></div>`).join('')}</div>`,
   `<div class="ptabs"><div class="seg" role="tablist">${tabs.map(([k,l])=>`<button data-pt="${k}" aria-pressed="${k===S.ptab}">${l}</button>`).join('')}</div></div>${body}
   <div class="note">All numbers come from public government records. <button class="link" data-how style="font-size:13px;text-decoration:underline">How we score</button> · <button class="link" data-sources style="font-size:13px;text-decoration:underline">Sources</button></div>`);
}
function mOverview(m){
  const com=m.committees.map(([c,t])=>esc(c.replace(/^the /,'').replace(/^Joint of /,'Joint Committee of '))+(t?` <span class="s">(${esc(t)})</span>`:'')).join('<br>')||'—';
  const ind=(m.industries||[]).filter(r=>!/^(Other or not listed|Not employed)/.test(r[0])).slice(0,4);
  return `${m.ethN?`<div class="sec"><div class="sh"><h2>Ethics Committee</h2></div><div class="group">${ethicsItems(m.ethics.slice(0,2))}</div>${m.ethN>2?`<div class="cap">${m.ethN} statements since 2025. All are listed under Influence.</div>`:''}</div>`:''}
  <div class="sec"><div class="sh"><h2>Scorecard</h2><button data-how>How it works</button></div>
   <div class="group">${scorecard(m)}</div>
   <div class="cap">Compared with every other ${m.chamber==='Senate'?'senator':'House member'}. The line in the middle is the typical member. There's no overall grade.</div></div>
  ${ind.length?`<div class="sec"><div class="sh"><h2>Who funds them</h2><button data-pt="money">More</button></div><div class="group pad">${hbars(ind.map(r=>[r[0],r[1]+r[2]]))}</div><div class="cap">2025–26 gifts over $200 plus PAC money, grouped by industry.</div></div>`:''}
  <div class="sec"><div class="sh"><h2>About</h2></div><div class="group">
   <div class="row kv"><span class="k">Party</span><span class="v">${esc(m.partyName)}</span></div>
   <div class="row kv"><span class="k">${m.chamber==='Senate'?'State':'District'}</span><span class="v">${esc(m.where)}</span></div>
   <div class="row kv"><span class="k">In ${m.chamber} since</span><span class="v">${m.chamberSince}</span></div>
   <div class="row kv"><span class="k">Committees</span><span class="v">${com}</span></div>
   ${m.phone?`<div class="row kv"><span class="k">Office phone</span><span class="v" style="user-select:all">${esc(m.phone)}</span></div>`:''}
   ${m.url?`<a class="row plain" style="grid-template-columns:1fr auto" href="${esc(m.url)}" target="_blank" rel="noopener"><span>Official website</span>${chev}</a>`:''}
  </div></div>`;
}
function mMoney(m){
  const f=m.money;
  if(!f)return `<div class="sec"><div class="group"><div class="empty">No 2025–26 campaign reports on file with the FEC.</div></div></div>`;
  const big=Math.max(0,f.indiv-(f.small||0));
  const parts=f.small!=null?[['Small donors (under $200)',f.small],['Larger individual gifts',big]]:[['Individual donors',f.indiv]];
  parts.push(['PACs and other groups',f.pac],['Political party',f.party],['Their own money',f.self],['Transfers from other campaigns',f.xfer],['Other (interest, refunds, loans)',f.other]);
  const hist=(m.raisedHist||[]).map(([y,v])=>[`${y-1}–${String(y).slice(2)}`,v]);
  return `<div class="sec"><div class="sh"><h2>2025–26 campaign</h2></div><div class="group">
    <div style="padding:14px 16px"><div class="bigline"><b>${M(f.rec)}</b><span>raised through ${fmtUS(f.thru)}</span></div></div>
    <div class="tiles"><div><b>${M(f.spent)}</b><span>Spent</span></div><div><b>${M(f.coh)}</b><span>Cash on hand</span></div><div><b>${M(f.debt)}</b><span>Debts owed</span></div><div><b>${(m.donations||0).toLocaleString()}</b><span>Itemized gifts ($200+)</span></div></div></div></div>
  <div class="sec"><div class="sh"><h2>Where the money came from</h2></div><div class="group pad">${stackBar(parts,f.rec||1)}</div>
   <div class="cap">Small-donor money is total individual giving minus gifts over $200, which must be listed by name.</div></div>
  ${m.industries?.length?`<div class="sec"><div class="sh"><h2>Money by industry</h2></div><div class="group pad">${hbars(m.industries.filter(r=>!/^(Other or not listed|Not employed)$/.test(r[0])).slice(0,10).map(r=>[r[0],r[1]+r[2],r[1],r[2]]),M,r=>[r[2]?`${M(r[2])} from people`:'',r[3]?`${M(r[3])} from PACs`:''].filter(Boolean).join(' · '))}</div><div class="cap">Grouped by each donor's employer and job, and each PAC's sponsor, using the same rules for everyone. ${(()=>{const o=m.industries.find(r=>r[0]==='Other or not listed');const ne=m.industries.find(r=>r[0]==='Not employed');return (o?`${M(o[1]+o[2])} couldn't be grouped. `:'')+(ne?`${M(ne[1])} came from donors who listed no employer.`:'')})()}</div></div>`:''}
  ${m.employers?.length?`<div class="sec"><div class="sh"><h2>Where donors work</h2></div><div class="group pad">${hbars(m.employers.slice(0,8),M,r=>`${r[2]} gift${r[2]>1?'s':''}`)}</div><div class="cap">Gifts over $200 from people who list this employer. Companies can't give directly.</div></div>`:''}
  ${m.pacs?.length?`<div class="sec"><div class="sh"><h2>Top PAC donors</h2></div><div class="group">${m.pacs.slice(0,8).map(([n,v,c],i)=>`<div class="row plain" style="cursor:default"><span class="rank">${i+1}</span><span style="min-width:0"><span class="t">${esc(n)}</span><br><span class="s">${esc(c)}</span></span><span class="val">${M(v)}</span></div>`).join('')}</div></div>
    <div class="sec"><div class="sh"><h2>PAC money by type</h2></div><div class="group pad">${hbars(m.pacCats)}</div></div>`:''}
  ${m.outside?`<div class="sec"><div class="sh"><h2>Outside spending</h2></div><div class="group"><div class="tiles"><div><b>${M(m.outside[0])}</b><span>Spent to help them</span></div><div><b>${M(m.outside[1])}</b><span>Spent against them</span></div></div></div><div class="cap">Independent spending by PACs, reported to the FEC. Campaigns can't coordinate with it.</div></div>`:''}
  ${hist.length>1?`<div class="sec"><div class="sh"><h2>Raised each election cycle</h2></div><div class="group pad">${colChart(hist,{fmt:M})}</div><div class="cap">2025–26 is still in progress.</div></div>`:''}
  ${m.fecId?`<div class="sec"><div class="group"><a class="row plain" style="grid-template-columns:1fr auto" href="https://www.fec.gov/data/candidate/${m.fecId}/" target="_blank" rel="noopener"><span>See every filing on FEC.gov</span>${chev}</a></div></div>`:''}`;
}
function lobbiedVotes(m){
  const ids=DATA.passage[m.chamber]||[];const pv=m.pv||'';const out=[];const seen=new Set();
  ids.forEach((rid,i)=>{const r=DATA.rc[rid];const b=billKey(r.b);const lb=DATA.bills[b];const c=pv[i];if(!lb||!c||c==='.')return;out.push({rid,r,b,n:lb.n,c})});
  out.sort((a,b)=>b.n-a.n||b.r.d.localeCompare(a.r.d));
  return out.filter(x=>{if(seen.has(x.b))return false;seen.add(x.b);return true}).slice(0,8);
}
function mVotes(m){
  if(!m.elig)return `<div class="sec"><div class="group"><div class="empty">No recorded votes yet.</div></div></div>`;
  const P=POOL[m.chamber],typ=1-median(P.present);
  const mon=m.missedM.map(([mo,miss,el])=>[mlabel(mo),el?miss/el:0,mo]);
  const word={Y:'Yes',N:'No',M:'Missed'};
  const lv=lobbiedVotes(m);
  return `<div class="sec"><div class="sh"><h2>Attendance</h2></div><div class="group pad">
    <div class="bigline"><b>${m.elig-m.voted}</b><span>votes missed out of ${m.elig}</span></div>
    <div style="margin-top:12px">${colChart(mon,{showVals:false,every:3,h:130,ref:{v:typ,label:'Typical: '+pct(typ,1)},flagIdx:r=>r[1]>.2})}</div>
    <div class="cap" style="padding:6px 0 0">Share of votes missed each month, Jan 2025 – Sep 2026. Orange: missed more than 1 in 5.</div></div>
    ${m.id===SPEAKER?'<div class="cap">The Speaker rarely votes by tradition.</div>':''}</div>
  ${lv.length?`<div class="sec"><div class="sh"><h2>Most-lobbied bills they voted on</h2></div><div class="group">${lv.map(x=>`<button class="vote" data-bill="${x.b}" style="all:unset;box-sizing:border-box;display:grid;gap:4px;padding:12px 16px;cursor:pointer;width:100%;position:relative"><div class="vt">${esc(x.r.s||x.r.q)}</div><div class="vm"><span>${billName(x.b)} · ${x.n} groups lobbied · ${fmtISO(x.r.d)}</span><span class="cast ${word[x.c]}">${word[x.c]}</span></div></button>`).join('')}</div><div class="cap">Tap a bill to see who lobbied on it. Final passage votes only.</div></div>`:''}
  <div class="sec"><div class="sh"><h2>Recent votes</h2></div><div class="group">${(m.recent||[]).map(([rid,cast,withP])=>{const r=DATA.rc[rid];if(!r)return '';
    return `<div class="vote"><div class="vt">${esc(r.s||r.q)}</div><div class="vm"><span>${r.b?(/^(HR|S|HJRES|SJRES)\d+$/.test(billKey(r.b))?`<button class="link" data-bill="${billKey(r.b)}" style="font-size:inherit;text-decoration:underline">${esc(billName(r.b))}</button>`:esc(billName(r.b)))+' · ':''}${fmtISO(r.d)} · ${esc(r.res)} ${r.y}–${r.n}${r.lob?` · ${r.lob} groups lobbied`:''}</span><span style="display:flex;gap:8px;align-items:center">${withP===false?'<span class="tag off">Broke with party</span>':''}<span class="cast ${cast}">${cast}</span></span></div></div>`}).join('')}</div>
   <div class="cap">Their last 10 roll-call votes, newest first.</div></div>
  <div class="sec"><div class="sh"><h2>Party loyalty</h2></div><div class="group pad"><div class="bigline"><b>${pct(m.unity,1)}</b><span>sided with ${PN[m.caucus]}s on ${m.unityN} votes where the parties split</span></div></div></div>`;
}
function mStocks(m){
  const st=m.tradeStats, link=m.chamber==='Senate'?'https://efdsearch.senate.gov/search/':'https://disclosures-clerk.house.gov/FinancialDisclosure';
  if(!m.ptr)return `<div class="sec"><div class="group pad"><div style="font-weight:600">No stock trade reports since January 2025</div><p class="s" style="margin:6px 0 0">Members must report trades over $1,000 within 45 days. ${esc(m.last)} hasn't filed any trade reports in this period.</p></div></div>`;
  const rows=(m.tradeByMonth||[]).map(([mo,c])=>[mlabel(mo),c]);
  return `<div class="sec"><div class="sh"><h2>Stock trades</h2></div><div class="group">
    <div style="padding:14px 16px"><div class="bigline"><b>${m.tradeN}</b><span>trades in ${m.ptr} report${m.ptr>1?'s':''} since Jan 2025</span></div></div>
    ${st?`<div class="tiles"><div><b>${st.buys}</b><span>Buys</span></div><div><b>${st.sells}</b><span>Sells</span></div><div><b>${M(st.lo)}–${M(st.hi)}</b><span>Total value (range)</span></div><div><b>${st.big}</b><span>Trades over $100K</span></div><div><b>${m.commTrades}</b><span>Tied to their committees</span></div><div><b>${(st.sectors||[]).length?esc(st.sectors[0][0]):'—'}</b><span>Most-traded industry</span></div></div>`:''}</div>
    ${m.ptrPaper?`<div class="cap">${m.ptrPaper} report${m.ptrPaper>1?'s were':' was'} filed on paper and isn't itemized here yet.</div>`:''}</div>
  ${rows.some(r=>r[1])?`<div class="sec"><div class="sh"><h2>Trades by month</h2></div><div class="group pad">${colChart(rows,{every:3,h:120})}</div></div>`:''}
  ${Object.keys(m.oversees||{}).length?`<div class="sec"><div class="sh"><h2>What their committees oversee</h2></div><div class="group" data-ch="${m.chamber[0]}">${Object.entries(m.oversees).map(([sec,cs])=>`<div class="row kv"><span class="k">${esc(sec)}</span><span class="v cm">${esc([...new Set(cs)].map(c=>c.replace(/^the /,'')).join(', '))}</span></div>`).join('')}</div><div class="cap">Trades in these industries are flagged below. Industry comes from each company's SEC filings.</div></div>`:''}
  ${st?.ticks?.length?`<div class="sec"><div class="sh"><h2>Most traded</h2></div><div class="group pad">${hbars(st.ticks,v=>v+' trades')}</div></div>`:''}
  ${m.trades?.length?`<div class="sec"><div class="sh"><h2>Every trade</h2><span class="cap" style="padding:0">${m.trades.length<m.tradeN?`latest ${m.trades.length}`:''}</span></div><div class="group">${m.trades.slice(0,S.tlimit||15).map(t=>`<div class="vote"><div class="vt">${t[2]?`<span class="num" style="font-size:17px">${esc(t[2])}</span> · `:''}${esc(t[3])}</div>${t[7]?`<div><span class="tag off">Their committee oversees ${esc(t[7].toLowerCase())}</span></div>`:''}<div class="vm"><span>${fmtISO(t[0])} · ${esc(t[6])} · ${rangeTxt(t[4],t[5])}</span><span class="cast ${t[1]==='Buy'?'Yes':t[1].startsWith('Sell')?'No':'Present'}">${esc(t[1])}</span></div></div>`).join('')}</div>
    ${m.trades.length>(S.tlimit||15)?`<button class="more" data-tmore>Show more trades</button>`:''}<div class="cap">Amounts are reported as ranges. "Spouse" and "Joint" trades are by family members.</div></div>`:''}
  <div class="sec"><div class="sh"><h2>Original reports</h2></div><div class="group">${(m.ptrFiles||[]).slice(0,8).map(f=>`<a class="row plain" style="grid-template-columns:1fr auto auto" href="${esc(f[1])}" target="_blank" rel="noopener"><span>Filed ${fmtISO(f[0])}</span><span class="s">${f[3]?'Paper':f[2]+' trades'}</span>${chev}</a>`).join('')}
   <a class="row plain" style="grid-template-columns:1fr auto" href="${link}" target="_blank" rel="noopener"><span>Search all ${m.chamber==='Senate'?'Senate':'House'} disclosures</span>${chev}</a></div></div>`;
}
function ethicsItems(list){return list.map(([d,st,txt,url])=>`<div class="item"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><span class="kind" style="font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--soft)">${fmtISO(d)}</span><span class="tag off">${esc(st)}</span></div><p>${esc(txt)}</p><button class="link" data-eth="e${normEth(url)}" style="font-size:14px;text-decoration:underline">Full statement and documents</button></div>`).join('')}
const normEth=u=>(u||'').replace(/\/$/,'').split('/').pop().toLowerCase().replace(/[^a-z0-9]/g,'');
function mInfluence(m){
  const rev=m.revolving||[];
  const lv=lobbiedVotes(m).slice(0,3);
  return `${m.chamber==='House'?`<div class="sec"><div class="sh"><h2>House Ethics Committee</h2><span class="cap" style="padding:0">${m.ethN}</span></div><div class="group">${m.ethN?ethicsItems(m.ethics):'<div class="empty">No public Ethics Committee statements about this member since January 2025.</div>'}</div><div class="cap">In the committee's own words. A review is not a finding of wrongdoing.</div></div>`:`<div class="sec"><div class="sh"><h2>Senate Ethics Committee</h2></div><div class="group"><div class="empty">The Senate Ethics Committee rarely publishes actions about individual senators. None are on record for this senator since January 2025.</div></div></div>`}
  <div class="sec"><div class="sh"><h2>Former staff now lobbying</h2><span class="cap" style="padding:0">${rev.length}</span></div><div class="group">${rev.length?rev.slice(0,S.rlimit||12).map(([n,pos,firm,cl])=>`<div class="item"><h3>${esc(n)}</h3><p class="s" style="color:var(--soft);font-size:13px">Past job: ${esc(pos)}</p><p>Lobbies for ${cl.map(c=>typeof G!=='undefined'&&G?lobLink(c):esc(c)).join(', ')}${firm&&!cl.some(c=>c.toUpperCase()===firm.toUpperCase())?` <span class="s" style="color:var(--soft)">(via ${esc(firm.toLowerCase().replace(/\b\w/g,c=>c.toUpperCase()))})</span>`:''}</p></div>`).join(''):'<div class="empty">No current lobbyists list a job in this member’s office.</div>'}</div>
   ${rev.length>(S.rlimit||12)?`<button class="more" data-rmore>Show all ${rev.length}</button>`:''}
   <div class="cap">Lobbyists must list government jobs they held in the past 20 years. This is legal, and common. We match the member's full name in that job description.</div></div>
  ${lv.length?`<div class="sec"><div class="sh"><h2>Heavily lobbied votes</h2><button data-pt="votes">See more</button></div><div class="group">${lv.map(x=>`<button class="row plain" data-bill="${x.b}" style="grid-template-columns:1fr auto auto"><span style="min-width:0"><span class="t">${esc(x.r.s||billName(x.b))}</span><br><span class="s">${billName(x.b)} · ${x.n} groups lobbied</span></span><span class="cast ${{Y:'Yes',N:'No',M:'Missed'}[x.c]}">${{Y:'Yes',N:'No',M:'Missed'}[x.c]}</span>${chev}</button>`).join('')}</div></div>`:''}`;
}

function nomProfile(n){
  const tot=(n.y+n.n)||1;
  const pb=(lbl,[y,no])=>y+no?`<div class="pbar"><span>${lbl}</span><span class="bar"><span style="width:${y/(y+no)*100}%;background:var(--yes)"></span><span style="width:${no/(y+no)*100}%;background:var(--no)"></span></span><span class="num" style="font-size:16px">${y}–${no}</span></div>`:'';
  const pnum=(n.pn.match(/\d+/)||[''])[0];
  return navBand('var(--N)',n.name,`
    <div class="idrow"><span class="av">${esc(n.initials)}</span><div style="min-width:0"><h1 class="pname" style="font-size:30px">${esc(n.name)}</h1><div class="prole">${esc(n.pos)}</div></div></div>
    <div class="chips"><span class="chip">${esc(n.cat)}</span><span class="chip">From ${esc(n.from_)}</span><span class="chip">Confirmed ${fmtISO(n.d)}</span></div>
    <div class="strip"><div><b>${n.y}–${n.n}</b><span>Senate vote</span></div><div><b>${pct(n.y/tot)}</b><span>Voted yes</span></div><div><b>${n.crossN}</b><span>Crossed party</span></div><div><b>${n.batch>1?n.batch:'1'}</b><span>${n.batch>1?'In group vote':'Solo vote'}</span></div></div>`,
   `<div class="sec"><div class="sh"><h2>How each party voted</h2></div><div class="group pad">${pb('Republicans',n.br.R)}${pb('Democrats',n.br.D)}${pb('Independents',n.br.I)}
     <div class="legend" style="grid-template-columns:1fr 1fr"><div><i style="background:var(--yes)"></i>Yes</div><div><i style="background:var(--no)"></i>No</div></div></div>
     ${n.y===n.n?'<div class="cap">Tied in the Senate. The Vice President cast the deciding vote.</div>':''}${n.batch>1?`<div class="cap">Confirmed together with ${n.batch-1} other nominees in a single vote.</div>`:''}</div>
   ${n.oge?ogeSections(n):`<div class="sec"><div class="group"><div class="empty">We couldn't match this nominee to Office of Government Ethics filings yet.</div></div></div>`}
   <div class="sec"><div class="sh"><h2>Senators who broke with their party</h2></div><div class="group">${n.cross.length?n.cross.map(([id,v])=>{const m=byId[id];return m?memRow(m,`<span class="cast ${v}">${v}</span>`):''}).join(''):'<div class="empty">Every senator voted with their party.</div>'}</div></div>
   <div class="sec"><div class="sh"><h2>Details</h2></div><div class="group">
     <div class="row kv"><span class="k">Position</span><span class="v">${esc(n.pos)}</span></div>
     <div class="row kv"><span class="k">Home state</span><span class="v">${esc(n.from_)}</span></div>
     <div class="row kv"><span class="k">Nomination</span><span class="v">${esc(n.pn)}</span></div>
     <a class="row plain" style="grid-template-columns:1fr auto" href="https://www.congress.gov/nomination/119th-congress/${pnum}" target="_blank" rel="noopener"><span>Nomination record on Congress.gov</span>${chev}</a>
     <a class="row plain" style="grid-template-columns:1fr auto" href="https://www.oge.gov/web/OGE.nsf/Officials%20Individual%20Disclosures%20Search%20Collection?OpenForm" target="_blank" rel="noopener"><span>Financial disclosures (Office of Government Ethics)</span>${chev}</a></div></div>
   `);
}

function ogeSections(n){const o=n.oge;let h='';
  if(o.positions?.length)h+=`<div class="sec"><div class="sh"><h2>Jobs before government</h2></div><div class="group">${o.positions.map(([org,pos,yrs])=>`<div class="row kv" style="grid-template-columns:1fr auto"><span><span class="t">${esc(org)}</span><br><span class="s">${esc(pos)}</span></span><span class="s">${esc(yrs)}</span></div>`).join('')}</div><div class="cap">From the nominee's financial disclosure.</div></div>`;
  if(o.pay?.length)h+=`<div class="sec"><div class="sh"><h2>Paid by before joining</h2></div><div class="group pad">${hbars(o.pay.map(p=>[p[0].replace(/\s+-\s.*$|\s+-$/,'').replace(/,$/,''),p[2],p[1]]),M,r=>esc(r[2]))}</div><div class="cap">Salary, bonuses, fees and similar income reported for the year before nomination.</div></div>`;
  if(o.divest?.length||o.resign?.length)h+=`<div class="sec"><div class="sh"><h2>Ethics agreement promises</h2></div><div class="group">${o.divest?.length?`<div class="item"><h3>Will sell</h3><p>${o.divest.map(esc).join(' · ')}</p></div>`:''}${o.resign?.length?`<div class="item"><h3>Will step down from</h3><p>${o.resign.map(esc).join(' · ')}</p></div>`:''}</div><div class="cap">Read from the signed ethics agreement. Check the original for the full terms.</div></div>`;
  h+=`<div class="sec"><div class="sh"><h2>Ethics filings</h2><span class="cap" style="padding:0">${o.waivers?`${o.waivers} conflict waiver${o.waivers>1?'s':''}`:''}</span></div><div class="group">${o.docs.slice().reverse().map(([d,k,u])=>u?`<a class="row plain" style="grid-template-columns:1fr auto auto" href="${esc(u)}" target="_blank" rel="noopener"><span>${esc(k)}</span><span class="s">${fmtISO(d)}</span>${chev}</a>`:`<div class="row plain" style="grid-template-columns:1fr auto;cursor:default"><span>${esc(k)}</span><span class="s">${fmtISO(d)} · by request</span></div>`).join('')}</div><div class="cap">Office of Government Ethics. Some reports are only released on request.</div></div>`;
  return h}
function following(){
  const states=Object.entries(ST).sort((a,b)=>a[1].localeCompare(b[1]));
  const mine=S.home?MEM.filter(m=>m.state===S.home).sort((a,b)=>(a.chamber===b.chamber?(+a.district||0)-(+b.district||0):a.chamber==='Senate'?-1:1)):[];
  const fol=[...S.following].map(id=>byId[id]).filter(Boolean);
  return `<div class="wrap"><div class="lbanner bg-capfull pghero"><h1>My Reps</h1></div>
   <select class="select" id="home" aria-label="Your state"><option value="">Choose your state</option>${states.map(([k,v])=>`<option value="${k}" ${k===S.home?'selected':''}>${v}</option>`).join('')}</select>
   ${S.home?`<div class="sec"><div class="sh"><h2>${ST[S.home]}</h2><span class="cap" style="padding:0">${mine.length}</span></div><div class="group">${mine.map(m=>memRow(m)).join('')}</div></div>`:'<div class="cap">Pick your state to see your two senators and your House members.</div>'}
   <div class="sec"><div class="sh"><h2>Following</h2></div><div class="group">${fol.map(m=>memRow(m)).join('')||'<div class="empty">Tap Follow on any profile to keep them here.</div>'}</div></div></div>`;
}
function latest(){
  const days=[...new Set(FEEDTOP.map(f=>f.d))];
  return `<div class="wrap"><div class="lbanner bg-dusk pghero"><h1>Latest</h1></div><div class="cap" style="padding-top:4px">New confirmations and stock trade reports, from public filings.</div>
  ${days.map(d=>`<div class="sec" style="margin-top:18px"><div class="sh"><h2 style="font-size:15px;color:var(--soft);font-weight:600">${fmtISO(d)}</h2></div><div class="group">${FEEDTOP.filter(f=>f.d===d).map(f=>`<button class="row feedrow" ${f.kind==='nom'?`data-n="${f.id}"`:`data-p="${f.id}"`}><span class="ic ${f.kind==='trade'?'flagged':''}">${ICONS[f.kind]}</span><span style="min-width:0"><span class="t">${f.txt}</span></span>${chev}</button>`).join('')}</div></div>`).join('')}</div>`;
}
function account(){
  const sw=[['al-votes','Votes by people I follow',1],['al-trades','New stock trade reports',1],['al-noms','New confirmations',1],['al-elect','Election reminders',1]];
  return `<div class="wrap"><div class="lbanner bg-white pghero"><h1>Account</h1></div>
   <div class="sec" style="margin-top:16px"><div class="plan"><span style="opacity:.75;font-size:14px">Free plan</span><b>Capitol Receipts Pro · $4.99/mo</b><span style="opacity:.85;font-size:15px">Instant alerts for anyone you follow, full trade histories, and state lawmakers.</span><button id="pro">Start 7-day free trial</button><span id="proNote" hidden style="font-size:13px;opacity:.85">Payments aren't connected in this prototype.</span></div></div>
   <div class="sec"><div class="sh"><h2>Notify me about</h2></div><div class="group">${sw.map(([id,l,c])=>`<label class="row plain" for="${id}" style="grid-template-columns:1fr auto"><span>${l}</span><input class="sw" type="checkbox" id="${id}" ${c?'checked':''}></label>`).join('')}</div></div>
   <div class="sec"><div class="group"><button class="row plain" data-how style="grid-template-columns:1fr auto"><span>How we score officials</span>${chev}</button><button class="row plain" data-sources style="grid-template-columns:1fr auto"><span>Where our data comes from</span>${chev}</button><button class="row plain" data-next style="grid-template-columns:1fr auto"><span>What's coming next</span>${chev}</button></div>
   <div class="cap">Capitol Receipts is nonpartisan. Every official is measured with the same formulas, using public records only.</div></div></div>`;
}

/* ---------- sheets ---------- */
function openSheet(title,html){$('#panel').innerHTML=`<div class="grab"></div><div class="ptop"><h3>${title}</h3><button class="done" id="done">Done</button></div>${html}`;$('#sheet').hidden=false}
function billSheet(b){
  const x=DATA.bills[b];if(!x)return;
  const rs=Object.entries(DATA.rc).filter(([,r])=>billKey(r.b)===b).sort((a,c)=>c[1].d.localeCompare(a[1].d));
  const title=rs.find(([,r])=>r.s)?.[1].s||billName(b);
  const cong=b.match(/^([A-Z]+)(\d+)$/),typ={HR:'house-bill',S:'senate-bill',HJRES:'house-joint-resolution',SJRES:'senate-joint-resolution',HCONRES:'house-concurrent-resolution',SCONRES:'senate-concurrent-resolution'}[cong?.[1]];
  openSheet(billName(b),`<div class="group pad"><div style="font-size:19px;font-weight:700">${esc(title)}</div><div class="bigline" style="margin-top:10px"><b>${x.n}</b><span>organizations lobbied on it, ${esc(DATA.lobby.periods)}</span></div></div>
   <div class="sec" style="margin-top:16px"><div class="sh"><h2 style="font-size:15px;color:var(--soft)">Biggest spenders among them</h2></div><div class="group">${x.top.map((c,i)=>{const id=typeof G!=='undefined'&&G&&clientId(c);return `<button class="row plain" ${id?`data-lob="${id}"`:''} style="${id?'':'cursor:default'}"><span class="rank" style="font-size:18px">${i+1}</span><span class="t">${esc(c)}</span>${id?chev:'<span></span>'}</button>`}).join('')}</div>
   <div class="cap">Ranked by each group's total reported lobbying spending in quarters where it named this bill. Reports don't say which side they were on.</div></div>
   <div class="sec"><div class="sh"><h2 style="font-size:15px;color:var(--soft)">Votes</h2></div><div class="group">${rs.slice(0,6).map(([,r])=>`<div class="vote"><div class="vt">${esc(r.q)}</div><div class="vm"><span>${fmtISO(r.d)} · ${esc(r.res)}</span><span class="num" style="font-size:16px;color:var(--ink)">${r.y}–${r.n}</span></div></div>`).join('')}</div></div>
   ${typ?`<div class="group" style="margin-top:14px"><a class="row plain" style="grid-template-columns:1fr auto" href="https://www.congress.gov/bill/119th-congress/${typ}/${cong[2]}" target="_blank" rel="noopener"><span>Full bill on Congress.gov</span>${chev}</a></div>`:''}`);
}
function shareSheet(){
  const id=S.stack.at(-1);
  if(byId[id]){const m=byId[id];
    const lines=[['Votes missed',pct(m.missed,1)],['Voted with own party',pct(m.unity,1)],['Raised 2025–26',m.money?M(m.money.rec):'—'],['From small donors',pct(m.smallShare)],['Stock trades since 2025',String(m.tradeN)],['Ex-staff now lobbying',String(m.revN)]];
    const cap=`${m.full} (${m.party}-${m.state}): missed ${pct(m.missed,1)} of votes, ${m.tradeN} stock trades since 2025, ${m.revN} former staff now lobbying. Sources: Voteview, FEC, congressional disclosures, LDA.`;
    openSheet('Share',`<div class="card"><div class="top" style="background:var(--${m.party})"><div style="font-size:12px;font-weight:700;letter-spacing:.08em;opacity:.8">CAPITOL RECEIPTS</div><div class="pname">${esc(m.first)} ${esc(m.last)}</div><div class="prole">${esc(m.partyName)} · ${esc(m.where)}</div></div>
     <div class="mid">${lines.map(([a,b])=>`<div class="line"><span>${a}</span><b>${b}</b></div>`).join('')}</div><div class="foot">Public records · votes through ${fmtISO(DATA.asOf.votes)}</div></div>
     <button class="btn" id="copy">Copy caption</button><div class="note" id="capline">${esc(cap)}</div><div class="note" id="copied" hidden>Copied.</div>`);
  } else {const n=nomById[id];
    const cap=`${n.name} was confirmed as ${n.pos} on ${fmtISO(n.d)}, ${n.y}–${n.n}. Republicans ${n.br.R[0]}–${n.br.R[1]}, Democrats ${n.br.D[0]}–${n.br.D[1]}.`;
    openSheet('Share',`<div class="card"><div class="top" style="background:var(--N)"><div style="font-size:12px;font-weight:700;letter-spacing:.08em;opacity:.8">CAPITOL RECEIPTS · CONFIRMED</div><div class="pname" style="font-size:30px">${esc(n.name)}</div><div class="prole">${esc(n.pos)}</div></div>
     <div class="mid"><div class="line"><span>Senate vote</span><b>${n.y}–${n.n}</b></div><div class="line"><span>Republicans</span><b>${n.br.R[0]}–${n.br.R[1]}</b></div><div class="line"><span>Democrats</span><b>${n.br.D[0]}–${n.br.D[1]}</b></div><div class="line"><span>Crossed party lines</span><b>${n.crossN}</b></div></div><div class="foot">Source: Senate roll call, ${fmtISO(n.d)}</div></div>
     <button class="btn" id="copy">Copy caption</button><div class="note" id="capline">${esc(cap)}</div><div class="note" id="copied" hidden>Copied.</div>`);}
}
function howSheet(){
  openSheet('How we score',`<div class="group">${[
   ['Same rules for everyone','Every senator is compared with other senators, and every House member with other House members. Party is never part of the math.'],
   ['No overall grade','We show each measure on its own so you can decide what matters to you.'],
   ['The middle line','The line in the middle of each bar is the typical member. The dot shows where this person falls.'],
   ['Shows up to vote','Roll-call votes they cast, divided by the votes held while they were in office.'],
   ['Votes with their party','Only counts votes where most Democrats and most Republicans voted opposite ways. Independents are compared with the party they caucus with.'],
   ['Small donors','Total money from individuals minus gifts over $200 (which must be itemized). Campaigns that raised under $50,000 aren’t ranked.'],
   ['Stock trades','Individual trades listed in required reports since January 2025, for the member, their spouse and dependents. Paper filings aren’t counted yet. Trading is legal.'],
   ['Trades tied to committees','Each traded company gets its industry from its SEC filings. A trade is flagged when that industry falls under a committee the member sits on (for example, energy companies and the Energy Committee).'],
   ['Money by industry','Each donor is grouped by the employer and job they report, and each PAC by its sponsor, using one fixed set of keyword rules. Some gifts can\u2019t be grouped and are shown as such.'],
   ['Former staff lobbying','Lobbyists must list past government jobs. We count people whose listed job names this member. It’s legal and common, and shows who has access.']
  ].map(([a,b])=>`<div class="item"><h3>${a}</h3><p>${b}</p></div>`).join('')}</div>`);
}
function sourcesSheet(){
  const a=DATA.asOf;
  openSheet('Our data',`<div class="group">${[
   ['Members, parties, committees','congress-legislators project',`Checked ${fmtISO(a.roster)}`],
   ['Roll-call votes and confirmations','Voteview (UCLA)',`Through ${fmtISO(a.votes)}`],
   ['Campaign money','FEC candidate summaries, itemized individual gifts, PAC contributions','2025–26 cycle, latest reports through '+fmtUS(a.fec)],
   ['House stock trades','House Clerk periodic transaction reports (PDF)',`Checked ${fmtISO(a.ptr)}`],
   ['Senate stock trades','Senate electronic financial disclosures',`Checked ${fmtISO(a.ptr)}`],
   ['Lobbying','Lobbying Disclosure Act reports (lda.gov)',DATA.lobby?.periods||''],
   ['Company industries','SEC company filings (industry codes)','Checked '+fmtISO(a.roster)],
   ['Ethics','House Ethics Committee public statements','Since January 2025'],
   ['Appointee finances','Office of Government Ethics disclosures and ethics agreements','Checked '+fmtISO(a.roster)]
  ].map(([x,y,z])=>`<div class="item"><h3>${x}</h3><p>${y}</p><p style="color:var(--soft);font-size:13px">${z}</p></div>`).join('')}</div>
  <div class="sec"><div class="sh"><h2 style="font-size:15px;color:var(--soft)">Header photos</h2></div><div class="group">${[['U.S. Capitol, west front','United_States_Capitol_-_west_front.jpg'],['U.S. Capitol, full view','Capitol_Building_Full_View.jpg'],['U.S. Capitol at dusk','Capitol_at_Dusk_2.jpg'],['U.S. Capitol at night','US_Capitol_Building_at_night_Jan_2006.jpg'],['House chamber','United_States_House_of_Representatives_chamber.jpg'],['Supreme Court','US_Supreme_Court.JPG'],['Supreme Court at dusk','Panorama_of_United_States_Supreme_Court_Building_at_Dusk.jpg'],['White House','WhiteHouseSouthFacade.JPG'],['Library of Congress','Library_of_Congress_Great_Hall_-_Jan_2006.jpg']].map(([t,f])=>`<a class="row plain" style="grid-template-columns:1fr auto" href="https://commons.wikimedia.org/wiki/File:${f}" target="_blank" rel="noopener"><span>${t}<br><span class="s">Wikimedia Commons · photographer and license</span></span>${chev}</a>`).join('')}</div></div>
  <div class="note">Everything here is public record. We leave out a small number of filings with clearly implausible amounts. Each profile links to the original filings.</div>`);
}
function nextSheet(){
  openSheet('Coming next',`<div class="group">${[
   ['Live updates','Moving this data into a database that refreshes every day, with push alerts.'],
   ['State lawmakers','The same profiles for state legislatures.'],
   ['Paper trade reports','About 150 trade reports were handwritten on paper. We link to each one but can\u2019t itemize them reliably yet.'],
   ['Senate ethics and inspector general reports','Adding these as they\u2019re published in a consistent format.']
  ].map(([a,b])=>`<div class="item"><h3>${a}</h3><p>${b}</p></div>`).join('')}</div>`);
}
