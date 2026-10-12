/* ================= Vote pages: every recorded vote since 1789, member by member ================= */
const CV={};
const VWORD={Y:'Yes',N:'No',P:'Present','.':'Didn’t vote'};
const VPARTY={D:'Democrats',R:'Republicans',I:'Independents',O:'Other parties'};
function loadCV(id){
  if(CV[id])return CV[id]==='loading'?null:CV[id];
  CV[id]='loading';
  SB.get('congress_votes?select=data&id=eq.'+id).then(r=>{CV[id]=r[0]?.data||'missing';render()}).catch(()=>{CV[id]='error';render()});
  return null;
}
const congressYears=c=>`${1787+2*c}–${(1788+2*c)%100<10?'0':''}${(1788+2*c)%100}`;
const ordn=n=>n+(['th','st','nd','rd'][(n%100-20)%10]||['th','st','nd','rd'][n%100]||'th');
function voteKey(c,ch,roll){return `${c}-${ch}-${roll}`}
function billCodeToKey(c,code){const m=(code||'').match(/^([A-Z]+?)(\d+)$/);if(!m)return null;return `${c}-${m[1].toLowerCase()}-${+m[2]}`}
function memberIdx(d,bg){for(let i=0;i<d.m.length;i++)if(d.m[i][0]===bg)return i;return -1}
function votePage(key){
  const [c,ch,roll]=key.split('-');const id=`${c}-${ch}`;
  const d=loadCV(id);
  if(!d)return CV[id]==='loading'||!CV[id]?loading('the vote'):`<div class="wrap"><div class="empty">Vote not found.</div></div>`;
  if(typeof d!=='object')return `<div class="wrap"><div class="empty">Couldn’t load this vote.</div></div>`;
  const ri=d.rc.findIndex(r=>r[0]===+roll);if(ri<0)return `<div class="wrap"><div class="empty">Vote not found.</div></div>`;
  const [rn,date,bill,q,res,yea,nay,desc]=d.rc[ri];
  const by={};const counts={Y:0,N:0,P:0,'.':0};
  d.m.forEach((m,i)=>{const v=d.v[i][ri];if(!v)return;counts[v]++;(by[m[2]]=by[m[2]]||{Y:[],N:[],P:[],'.':[]})[v].push(i)});
  const mine=(typeof myReps==='function'?myReps():[]).map(m=>m.id);
  const bk=bill&&!/^PN/.test(bill)?billCodeToKey(c,bill):null;
  const filt=S.vfilt||'all';
  const parties=Object.keys(by).sort((a,b)=>({D:0,R:1,I:2,O:3}[a]-({D:0,R:1,I:2,O:3}[b])));
  const pRow=i=>{const m=d.m[i];const v=d.v[i][ri];const cur=byId[m[0]];const hp=typeof HP!=='undefined'&&(HP[m[0]]||HC[m[0]]);const attr=cur?`data-p="${m[0]}"`:hp?`data-hp="${m[0]}"`:'';
    return `<button class="row plain vrow ${mine.includes(m[0])?'mine':''}" ${attr} style="grid-template-columns:1fr auto auto"><span style="min-width:0"><span class="t">${esc(m[1])}${mine.includes(m[0])?' <em class="yourrep">your rep</em>':''}</span><br><span class="s">${esc(m[3])}${ch==='H'&&m[4]?'-'+m[4]:''}</span></span><span class="cast ${v==='Y'?'Yes':v==='N'?'No':''}">${VWORD[v]}</span>${attr?chev:'<span></span>'}</button>`};
  const myRows=d.m.map((m,i)=>i).filter(i=>mine.includes(d.m[i][0]));
  return `${pageHead((ch==='H'?'House':'Senate')+' vote '+rn)}
  <section class="phero p-N bg-capitol"><div class="in" style="padding-top:calc(var(--navh) + 18px)"><span class="billno">${ch==='H'?'House':'Senate'} roll call ${rn} · ${ordn(+c)} Congress</span><h1 style="font-size:${(desc||q).length>90?22:28}px">${esc(desc||q||'Recorded vote')}</h1><div class="psub">${esc([q,res].filter(Boolean).join(' · '))} · ${fmtISO(date)}</div></div></section>
  <div class="wrap">
   <div class="glance">${glance('Yes',ord(counts.Y),'votes',false)}${glance('No',ord(counts.N),'votes',false)}${glance('Didn’t vote',ord(counts['.']+counts.P),counts.P?`${counts.P} present`:'absent or not voting',false)}</div>
   ${bk?`<section class="sec"><div class="group"><button class="row plain" data-billkey="${bk}" style="grid-template-columns:1fr auto"><span><span class="t">${esc(billName(bill))}</span><br><span class="s">See the bill</span></span>${chev}</button></div></section>`:''}
   ${myRows.length?`<section class="sec"><div class="sh"><h2>Your reps</h2></div><div class="group">${myRows.map(pRow).join('')}</div></section>`:''}
   <section class="sec"><div class="sh"><h2>By party</h2></div><div class="group pad">${parties.map(p=>{const b=by[p];const t=b.Y.length+b.N.length+b.P.length+b['.'].length||1;return `<div class="vbar"><span class="mn">${VPARTY[p]}</span><span class="vt"><span class="vy" style="width:${(b.Y.length/t*100).toFixed(1)}%"></span><span class="vn" style="width:${(b.N.length/t*100).toFixed(1)}%"></span></span><b>${b.Y.length}–${b.N.length}</b></div>`}).join('')}</div><div class="cap"><span class="key vy"></span> Yes <span class="key vn"></span> No. Bars are the share of each party's members.</div></section>
   <section class="sec"><div class="sh"><h2>Every member's vote</h2></div>
    <div class="seg">${[['all','All'],['Y','Yes'],['N','No'],['.','Didn’t vote']].map(([k,l])=>`<button data-vfilt="${k}" aria-pressed="${filt===k}">${l}</button>`).join('')}</div>
    ${parties.map(p=>{const ids=filt==='all'?[...by[p].Y,...by[p].N,...by[p].P,...by[p]['.']]:filt==='.'?[...by[p].P,...by[p]['.']]:by[p][filt];if(!ids.length)return '';return `<div class="yrvh">${VPARTY[p]} · ${ids.length}</div><div class="group">${ids.map(pRow).join('')}</div>`}).join('')}
   </section>
   <div class="note">From Voteview (UCLA), which compiles every recorded vote in the House and Senate since 1789.</div>
  </div>`;
}
/* a current member's votes this Congress */
function memberVotesPage(bg){
  const m=byId[bg];if(!m)return `<div class="wrap"><div class="empty">Not found.</div></div>`;
  const id=`119-${m.chamber==='Senate'?'S':'H'}`;const d=loadCV(id);
  if(!d||typeof d!=='object')return loading('their votes');
  const i=memberIdx(d,bg);if(i<0)return `<div class="wrap"><div class="empty">No recorded votes found.</div></div>`;
  const q=(S.mvq||'').toLowerCase();
  const rows=d.rc.map((r,ri)=>[r,ri]).reverse().filter(([r])=>!q||(r[7]+' '+r[2]+' '+r[3]).toLowerCase().includes(q));
  const shown=rows.slice(0,S.limit||60);
  const v=d.v[i];const cnt={Y:0,N:0,P:0,'.':0};for(const ch of v)cnt[ch]++;
  return `${pageHead(m.name)}<div class="wrap" style="padding-top:calc(var(--navh) + 10px)">
   <div class="lt"><h1>${esc(m.name)}'s votes</h1></div><p class="cap">Every recorded ${m.chamber} vote in the 119th Congress (2025–26), newest first.</p>
   <div class="glance">${glance('Yes',ord(cnt.Y),'votes',false)}${glance('No',ord(cnt.N),'votes',false)}${glance('Missed',ord(cnt['.']+cnt.P),`of ${ord(v.length)}`,false)}</div>
   <div class="sfield" style="margin-top:14px"><input id="mvq" class="search" type="search" placeholder="Search votes by topic or bill" value="${esc(S.mvq||'')}" aria-label="Search votes"></div>
   <section class="sec"><div class="group">${shown.map(([r,ri])=>`<button class="row plain" data-vote="${voteKey(119,id.slice(-1),r[0])}" style="grid-template-columns:1fr auto auto"><span style="min-width:0"><span class="t clamp">${esc(r[7]||r[3])}</span><span class="s">${fmtISO(r[1])} · ${esc([r[2]&&!/^PN/.test(r[2])?billName(r[2]):'',r[3]].filter(Boolean).join(' · '))}</span></span><span class="cast ${v[ri]==='Y'?'Yes':v[ri]==='N'?'No':''}">${VWORD[v[ri]]}</span>${chev}</button>`).join('')||'<div class="empty">No votes match.</div>'}</div>
   ${rows.length>shown.length?`<button class="more" data-cmore>Show more</button>`:''}</section></div>`;
}
/* bill pages: how your reps voted, for bills in any Congress */
repVotesBlock=function(key){
  const reps=typeof myReps==='function'?myReps():[];
  const head=`<div class="sh"><h2>How your reps voted</h2></div>`;
  const [c,type,num]=key.split('-');const code=(type+num).toUpperCase();
  const blocks=[];let pending=false;const all=[];
  ['H','S'].forEach(ch=>{
    const d=loadCV(`${c}-${ch}`);if(!d){pending=true;return}if(typeof d!=='object')return;
    const ris=d.rc.map((r,i)=>[r,i]).filter(([r])=>r[2]===code);
    ris.forEach(([r])=>all.push([ch,r]));
    if(!reps.length)return;
    ris.slice(-6).reverse().forEach(([r,ri])=>{
      const rows=reps.map(m=>{const i=memberIdx(d,m.id);if(i<0)return '';const v=d.v[i][ri];return `<button class="row" data-p="${m.id}" style="grid-template-columns:auto 1fr auto">${face(m,40)}<span style="min-width:0"><span class="t">${esc(m.name)}</span><br><span class="s">${esc(partyLine(m))}</span></span><span class="cast ${v==='Y'?'Yes':v==='N'?'No':''}">${VWORD[v]||'—'}</span></button>`}).join('');
      if(rows)blocks.push(`<button class="yrvh linkish" data-vote="${voteKey(c,ch,r[0])}">${ch==='H'?'House':'Senate'} vote · ${fmtISO(r[1])} · ${esc(r[3]||r[4]||'')} (${r[5]}–${r[6]}) ›</button><div class="group">${rows}</div>`);
    });
  });
  const allVotes=all.length?`<div class="sh" style="margin-top:14px"><h3 style="margin:0;font-size:16px">Every recorded vote on this bill</h3></div><div class="group">${all.slice(-15).reverse().map(([ch,r])=>`<button class="row plain" data-vote="${voteKey(c,ch,r[0])}" style="grid-template-columns:1fr auto auto"><span style="min-width:0"><span class="t">${esc(r[3]||'Vote')}</span><br><span class="s">${ch==='H'?'House':'Senate'} · ${fmtISO(r[1])}${r[4]?' · '+esc(r[4]):''}</span></span><span class="val">${r[5]}–${r[6]}</span>${chev}</button>`).join('')}</div>`:'';
  if(pending)return `<section class="sec yrv">${head}<div class="calm">Loading votes…</div></section>`;
  if(!reps.length)return `<section class="sec yrv">${head}<div class="calm">Add your ZIP code on the Search page to see how your senators and representative voted on bills like this one.</div>${allVotes}</section>`;
  if(!blocks.length)return `<section class="sec yrv">${head}<div class="calm">${all.length?'Your current reps weren’t in office for the recorded votes on this bill.':'This bill never got a recorded vote. Many bills pass by voice vote or never reach a vote.'}</div>${allVotes}</section>`;
  return `<section class="sec yrv">${head}${blocks.join('')}${allVotes}</section>`;
};
/* ---------- routing ---------- */
const _renderV=render;
render=function(){
  const cur=S.stack.at(-1)||'';
  if(!(cur.startsWith('vote:')||cur.startsWith('mvotes:')))return _renderV();
  if($('#sheet').hidden)$('#panel').className='panel';
  $('#app').innerHTML=cur.startsWith('vote:')?votePage(cur.slice(5)):memberVotesPage(cur.slice(7));
  $('#tabbar').innerHTML=TABS2.map(([k,l,svg])=>`<button data-tab="${k}" aria-current="${k===S.tab?'page':'false'}">${svg}${l}</button>`).join('');
  const pn=document.querySelector('#app .pnav .in');
  if(pn&&!pn.querySelector('[data-menu]')){const b=document.createElement('span');b.className='pright';b.innerHTML=`<button data-menu aria-label="Menu">${MENU_ICON}</button>`;pn.appendChild(b)}
  const mq=$('#mvq');if(mq)mq.addEventListener('input',e=>{S.mvq=e.target.value;S.limit=60;const p=mq.selectionStart;render();const n=$('#mvq');n.focus();n.setSelectionRange(p,p)});
};
/* member profiles: link to every vote */
const _renderV2=render;
render=function(){
  _renderV2();
  try{
    const cur=S.stack.at(-1);const m=cur&&byId[cur];
    if(m&&!document.querySelector('#app [data-mvotes]')){
      const sec=[...document.querySelectorAll('#app .topic')].find(t=>t.dataset.topic==='votes');
      if(sec)sec.insertAdjacentHTML('afterend',`<button class="row plain allvotes" data-mvotes="${m.id}" style="grid-template-columns:1fr auto"><span><span class="t">Every vote they cast this Congress</span></span>${chev}</button>`);
    }
  }catch(e){console.warn(e)}
};
window.addEventListener('click',e=>{
  const g=s=>e.target.closest(s);let el;
  if(el=g('[data-vote]')){e.preventDefault();e.stopPropagation();$('#sheet').hidden=true;go('vote:'+el.dataset.vote);return}
  if(el=g('[data-mvotes]')){e.preventDefault();e.stopPropagation();S.mvq='';S.limit=60;go('mvotes:'+el.dataset.mvotes);return}
  if(el=g('[data-vfilt]')){e.preventDefault();e.stopPropagation();S.vfilt=el.dataset.vfilt;render();return}
},true);
/* older bills: when there's no official summary, show what the recorded votes were about */
const _renderV3=render;
render=function(){
  _renderV3();
  try{
    const cur=S.stack.at(-1)||'';if(!cur.startsWith('bill:'))return;
    const app=$('#app');if(!app||app.querySelector('[data-voteabout]'))return;
    const hasSummary=[...app.querySelectorAll('h2')].some(h=>/What it does/.test(h.textContent));
    if(hasSummary)return;
    const [c,type,num]=cur.slice(5).split('-');const code=(type+num).toUpperCase();
    const descs=[];['H','S'].forEach(ch=>{const d=CV[`${c}-${ch}`];if(d&&typeof d==='object')d.rc.forEach(r=>{if(r[2]===code&&r[7]&&!descs.some(x=>x[1]===r[7]))descs.push([ch,r[7],r[1]])})});
    if(!descs.length)return;
    const anchor=app.querySelector('.yrv')||app.querySelector('.wrap .sec');
    if(anchor)anchor.insertAdjacentHTML('beforebegin',`<section class="sec" data-voteabout><div class="sh"><h2>What the votes were about</h2></div><div class="group">${descs.slice(0,4).map(([ch,t,d])=>`<div class="row plain" style="grid-template-columns:1fr;cursor:default"><span><span class="s">${ch==='H'?'House':'Senate'} · ${fmtISO(d)}</span><br><span>${esc(t.charAt(0)+t.slice(1).toLowerCase())}</span></span></div>`).join('')}</div><div class="cap">There's no official summary for this older bill, so these are the descriptions recorded with its votes.</div></section>`);
  }catch(e){console.warn(e)}
};
