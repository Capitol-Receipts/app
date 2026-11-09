/* ================= Cross-linking: anything mentioned in text links to its page ================= */
const cnorm=s=>(s||'').toLowerCase().replace(/^(the )?(house|senate|joint|u\.s\. senate|united states senate)\s+/,'').replace(/\b(permanent |special )?(select )?committee( on)?\b/g,'').replace(/^\s*(permanent |special )?select\s+/,'').replace(/^ *(the|on) /,'').replace(/[^a-z]/g,'');
let COMMIDX=null,CLIENTKEYS=null,PRESIDX=null;
function commIdx(){if(COMMIDX||!G)return COMMIDX;COMMIDX={};Object.values(G.comm).forEach(c=>{const k=cnorm(c.short);(COMMIDX[k]=COMMIDX[k]||{})[c.ch[0].toUpperCase()]=c.id});return COMMIDX}
function commFor(name,ch){const ix=commIdx();if(!ix)return null;const m=ix[cnorm(name)];if(!m)return null;
  const low=(name||'').toLowerCase();const pref=low.startsWith('senate')?'S':low.startsWith('house')?'H':low.startsWith('joint')?'J':ch;return m[pref]||m.H||m.S||m.J}
function clientFor(name){
  if(!G||!name)return null;let id=clientId(name);if(id)return id;
  const k=ckey(name.replace(/\b(employees?|political action committee|pac|good government fund|federal pac|fund|committee|inc|corp|corporation|company|co|llc|the|class [a-z]|common stock|ordinary shares|ads|adr|stock)\b/gi,' '));
  if(k.length<4)return null;
  if(!CLIENTKEYS)CLIENTKEYS=Object.keys(CLIENT_BY).filter(x=>x.length>=5).sort((a,b)=>b.length-a.length);
  const hit=CLIENTKEYS.find(c=>k.startsWith(c)&&(k.length-c.length)<=12);return hit?CLIENT_BY[hit]:null;
}
function presFor(name){
  if(!H)return null;if(!PRESIDX){PRESIDX={};EXEC.forEach(p=>{const l=normN(p.l||p.n.split(' ').pop());(PRESIDX[l]=PRESIDX[l]||[]).push(p)})}
  const parts=name.replace(/[,.]/g,' ').split(/\s+/).filter(Boolean);const l=normN(parts.filter(w=>!/^(jr|sr|ii|iii)$/i.test(w)).pop());
  const c=PRESIDX[l];if(!c)return null;if(c.length===1)return c[0];const f=normN(parts[0]);return c.find(p=>normN(p.f||p.n.split(' ')[0]).startsWith(f.slice(0,3))||normN(p.n).startsWith(f))||null;
}
const BILLRX=/\b(H\.\s?R\.|S\.|H\.\s?J\.\s?Res\.|S\.\s?J\.\s?Res\.|HR|HJRES|SJRES)\s?(\d{1,5})\b/g;
const TYMAP={hr:'hr',s:'s',hjres:'hjres',sjres:'sjres'};
function linkifyText(node,ctx){
  const t=node.nodeValue;if(!t||t.length<3)return;
  const parts=[];let last=0;
  const push=(i,len,html)=>{if(i<last)return;parts.push(esc(t.slice(last,i)),html);last=i+len};
  const hits=[];
  // bills
  t.replace(BILLRX,(m,pre,num,i)=>{const ty=TYMAP[pre.replace(/[.\s]/g,'').toLowerCase()];if(!ty)return m;
    if(ty==='s'&&!/\.\s?$/.test(pre))return m;
    const k=`${ctx.cong||119}-${ty}-${+num}`;if(hasBill(k))hits.push([i,m.length,`<button class="link inl" data-bk="${k}">${esc(m)}</button>`]);return m});
  // committees (full names)
  t.replace(/\b(?:(?:House|Senate|Joint)\s+)?(?:Permanent Select |Select |Special )?Committee on (?:the )?[A-Z][A-Za-z,&' ]+?(?=[.;:)]|$| and the| and Representative|,? which|,? \d)/g,(m,i)=>{const id=commFor(m.trim(),ctx.ch);if(id)hits.push([i,m.length,`<button class="link inl" data-com="${id}">${esc(m)}</button>`]);return m});
  // presidents
  t.replace(/(Appointed by|appointed by|nominated by|Nominated by)\s+((?:President\s+)?[A-Z][\w.]*(?:\s+[A-Z][\w.]*){0,3})/g,(m,lead,name,i)=>{const p=presFor(name.replace(/^President\s+/,''));if(p)hits.push([i+lead.length+1,name.length,`<button class="link inl" ${HC[p.id]?`data-p="${p.id}"`:`data-hp="${p.id}"`}>${esc(name)}</button>`]);return m});
  if(!hits.length)return;
  hits.sort((a,b)=>a[0]-b[0]).forEach(h=>push(...h));
  parts.push(esc(t.slice(last)));
  const span=document.createElement('span');span.innerHTML=parts.join('');node.replaceWith(span);
}
function linkify(root){
  if(!root||!G)return;
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>{const p=n.parentElement;if(!p||p.closest('button,a,input,select,textarea,svg,script,style,.nolink'))return NodeFilter.FILTER_REJECT;return /\d|Committee|ppointed|ominated/.test(n.nodeValue)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT}});
  const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
  nodes.forEach(n=>{const c=n.parentElement.closest('[data-cong],[data-ch]');linkifyText(n,{cong:c?.dataset.cong?+c.dataset.cong:null,ch:c?.dataset.ch||null})});
  // explicit marks: committee short names, company names
  root.querySelectorAll('.cm:not([data-done])').forEach(el=>{el.dataset.done=1;const ch=el.closest('[data-ch]')?.dataset.ch;el.innerHTML=el.textContent.split(/,\s*/).map(n=>{const id=commFor(n,ch);return id?`<button class="link inl" data-com="${id}">${esc(n)}</button>`:esc(n)}).join(', ')});
  root.querySelectorAll('.co:not([data-done])').forEach(el=>{el.dataset.done=1;if(el.closest('button,a'))return;const id=clientFor(el.dataset.name||el.textContent);if(id)el.innerHTML=`<button class="link inl" data-lob="${id}">${esc(el.textContent)}</button>`});
  // donor employers, PAC donors and traded companies inside known sections
  root.querySelectorAll('.sec').forEach(sec=>{const h=sec.querySelector('h2')?.textContent||'';
    if(/Where donors work|Most traded/.test(h))sec.querySelectorAll('.hbar>span:first-child, .row .t').forEach(el=>{if(el.dataset.done||el.closest('button,a'))return;el.dataset.done=1;const txt=el.childNodes[0]?.nodeValue||el.textContent;const id=clientFor(txt);if(id){const b=document.createElement('button');b.className='link inl';b.dataset.lob=id;b.textContent=txt;if(el.childNodes[0]&&el.childNodes[0].nodeType===3)el.childNodes[0].replaceWith(b);else{el.textContent='';el.append(b)}}});
    if(/Every trade|Every past trade|Biggest trades/.test(h))sec.querySelectorAll('.vote .vt').forEach(el=>{if(el.dataset.done)return;el.dataset.done=1;const tn=[...el.childNodes].filter(n=>n.nodeType===3).pop();if(!tn)return;const nm=tn.nodeValue.replace(/^\s*·?\s*/,'').replace(/\s*-\s*(common|class|ordinary|series|ads|adr|sponsored|preferred).*$/i,'').replace(/\(.*$/,'').trim();const id=clientFor(nm);if(id){const pre=tn.nodeValue.match(/^\s*·?\s*/)[0];const b=document.createElement('button');b.className='link inl';b.dataset.lob=id;b.textContent=tn.nodeValue.slice(pre.length);tn.replaceWith(document.createTextNode(pre),b)}});
  });
}
/* run after every render and every sheet */
const _render4=render;
render=function(){_render4();try{linkify($('#app'))}catch(e){console.warn(e)}};
const _openSheet=openSheet;
openSheet=function(t,h){_openSheet(t,h);try{linkify($('#panel'))}catch(e){console.warn(e)}};
