/* ================= Smart search matching =================
   Forgiving matching used by every search box: ignores case, accents and punctuation, word order, middle initials and
   suffixes (Jr., III), accepts nicknames (Bernie → Bernard, Chuck → Charles), partial words while typing, words run
   together or split ("Mc Connell", "desantis"), and small typos ("Pelosy", "Schummer", "Ocasio Cortes"). */
const FZ_NICK=(()=>{const g=[['william','bill','will','billy','willie'],['robert','bob','rob','bobby','robbie'],['michael','mike','mikey'],['james','jim','jimmy','jamie'],['thomas','tom','tommy'],['richard','dick','rick','rich','ricky'],['charles','chuck','charlie','chas'],['joseph','joe','joey'],['edward','ed','eddie','ted','ned'],['theodore','ted','teddy'],['elizabeth','liz','beth','betsy','lizzie','eliza','betty'],['katherine','kate','kathy','katie','kat'],['catherine','cathy','cate','cat'],['daniel','dan','danny'],['david','dave'],['steven','steve'],['stephen','steve'],['anthony','tony'],['christopher','chris'],['matthew','matt'],['patrick','pat'],['patricia','pat','patty','trish'],['nicholas','nick'],['andrew','andy','drew'],['gregory','greg'],['jeffrey','jeff'],['jonathan','jon'],['benjamin','ben'],['samuel','sam'],['alexander','alex'],['alexandria','alex','alexa'],['bernard','bernie'],['mitchell','mitch'],['ronald','ron','ronnie'],['donald','don','donnie'],['kenneth','ken','kenny'],['lawrence','larry'],['gerald','jerry'],['eugene','gene'],['henry','hank','harry'],['john','jack','johnny'],['susan','sue','susie'],['deborah','debbie','deb'],['jennifer','jen','jenny'],['victoria','vicky','tori'],['timothy','tim'],['frederick','fred'],['raymond','ray'],['phillip','phil'],['philip','phil'],['douglas','doug'],['francis','frank'],['abigail','abby'],['cynthia','cindy'],['martin','marty'],['margaret','maggie','peggy','meg'],['rebecca','becky'],['nancy','nan'],['thaddeus','thad'],['leonard','len','lenny'],['gerard','gerry'],['valerie','val'],['randall','randy'],['raphael','rafael','rafa'],['zachary','zach','zack'],['jacob','jake'],['joshua','josh'],['nathaniel','nate','nathan'],['albert','al'],['alan','al'],['vincent','vince'],['jerrold','jerry'],['gwendolyn','gwen'],['madeleine','maddie'],['suzanne','suzy'],['carolyn','carol'],['dorothy','dot'],['marjorie','margie'],['lisa','liz']];
  const m={};g.forEach(set=>set.forEach(a=>{(m[a]=m[a]||new Set);set.forEach(b=>b!==a&&m[a].add(b))}));return m})();
const FZ_SKIP=new Set(['jr','sr','ii','iii','iv','md','phd','esq','dr','mr','mrs','ms','rep','sen','hon']);
const FZ_STOP=new Set(['the','of','and','for','a','an','to','in','on','at','by','with','bill','bills','law','laws']);
const fzFold=s=>String(s??'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[’'`]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const FZ_CACHE=new Map();
function fzWords(s){
  let c=FZ_CACHE.get(s);if(c)return c;
  const all=fzFold(s).split(' ').filter(Boolean);
  const w=all.filter(x=>!FZ_SKIP.has(x));
  for(let i=0;i<all.length;i++){let j=i;while(j<all.length&&all[j].length===1)j++;if(j-i>=2){w.push(all.slice(i,j).join(''));i=j}}   // "J. D." also matches "jd"
  c={w:w.length?w:all,j:all.join('')};
  if(FZ_CACHE.size>250000)FZ_CACHE.clear();
  FZ_CACHE.set(s,c);return c;
}
/* edit distance with adjacent swaps, giving up once it passes k */
function fzDist(a,b,k){
  const la=a.length,lb=b.length;if(Math.abs(la-lb)>k)return k+1;
  let p2=null,p=Array.from({length:lb+1},(_,i)=>i);
  for(let i=1;i<=la;i++){
    const c=[i];let best=i;
    for(let j=1;j<=lb;j++){
      let v=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));
      if(p2&&i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])v=Math.min(v,p2[j-2]+1);
      c[j]=v;if(v<best)best=v;
    }
    if(best>k)return k+1;p2=p;p=c;
  }
  return p[lb];
}
/* how well one query word matches one word of the text: 1 exact … 0 no match (t = prepared query word) */
function fzTok(t,w,typo){
  const q=t.s;
  if(w===q)return 1;
  if(w.length>q.length&&w.startsWith(q))return t.p;
  if(t.n&&t.n.has(w))return .9;
  if(!typo||!t.k)return 0;
  const d0=w.charCodeAt(0),d1=w.charCodeAt(1);
  if(d0!==t.c0&&d1!==t.c1&&d0!==t.c1)return 0;   // keep typo checks cheap: most typos keep an early letter
  const lw=w.length;
  const k=t.k===2&&d0!==t.c0?1:t.k;
  if(lw-q.length<=k&&q.length-lw<=k){const d=fzDist(q,w,k);if(d<=k)return d===1?.75:.65}
  if(lw>q.length&&q.length>=5&&fzDist(q,w.slice(0,q.length),1)<=1)return .62;   // still typing, with a typo
  return 0;
}
function fzPrep(x){const num=/\d/.test(x);return {s:x,p:x.length>=3?.9:x.length===2?.75:.55,n:FZ_NICK[x]||null,k:num||x.length<4?0:x.length>=7?2:1,c0:x.charCodeAt(0),c1:x.charCodeAt(1)}}
function fzQuery(q){
  if(q&&q.main)return q;
  const all=fzFold(q).split(' ').filter(Boolean);
  let main=all.filter(x=>x.length>1||/\d/.test(x));
  if(!main.length)main=all;
  const content=main.filter(x=>!FZ_STOP.has(x));
  if(content.length)main=content;
  return {all,main,mt:main.map(fzPrep),inits:all.filter(x=>x.length===1&&!/\d/.test(x)),j:all.join(''),full:all.join(' ')};
}
/* 0..1: every meaningful query word must match some word in the text. typo=false gives exact/partial-word matches only */
function fzScore(text,q,typo=true){
  const Q=fzQuery(q);if(!Q.main.length)return 0;
  const T=fzWords(text);let sum=0;
  for(const t of Q.mt){let b=0;for(const w of T.w){const v=fzTok(t,w,typo);if(v>b){b=v;if(b===1)break}}if(!b){sum=-1;break}sum+=b}
  let s=sum<0?0:sum/Q.main.length;
  if(Q.j.length>=4&&T.j.includes(Q.j))s=Math.max(s,T.j===Q.j?1:.85);   // "mc connell", "desantis", "o rourke"
  if(!s&&Q.all.length===1&&Q.j.length>=3&&Q.j.length<=4&&T.w.length>=Q.j.length&&T.w.length<=Q.j.length+1){   // initials: "aoc", "jfk", "mtg"
    const ini=T.w.map(w=>w[0]).join('');
    if(ini===Q.j)s=.8;
    else if(ini.length===Q.j.length+1)for(let i=0;i<ini.length;i++)if(ini.slice(0,i)+ini.slice(i+1)===Q.j){s=.7;break}
  }
  if(s&&Q.inits.length)s=Math.min(1,s+(Q.inits.every(i=>T.w.some(w=>w[0]===i))?.02:-.04));   // middle initials only nudge the order
  return s;
}
/* ---- word index: for big collections, match against each distinct word once instead of every record ---- */
const FZ_IDX=new Map();
function fzIndex(key,items,fields){
  let X=FZ_IDX.get(key);if(X&&X.items===items&&X.n===items.length)return X;
  const vocab=new Map(),names=[],inits=[];
  items.forEach((it,i)=>{const nm=[],ini=[];
    for(const [text,wt] of fields(it)){if(!text)continue;const T=fzWords(text);
      if(wt===1){nm.push(fzFold(text));ini.push(T.w.map(w=>w[0]).join(''))}
      for(const w of T.w){let m=vocab.get(w);if(!m)vocab.set(w,m=new Map());if((m.get(i)||0)<wt)m.set(i,wt)}}
    names[i]=nm;inits[i]=ini});
  X={items,n:items.length,vocab,words:[...vocab.keys()],names,inits};FZ_IDX.set(key,X);return X;
}
function fzTokenHits(X,t,typo){
  const hits=new Map();
  for(const w of X.words){const v=fzTok(t,w,typo);if(!v)continue;for(const [i,wt] of X.vocab.get(w)){const s=v*wt;const o=hits.get(i);if(!o||o.s<s)hits.set(i,{s,named:wt===1})}}
  return hits;
}
function fzRun(X,Q,typo){
  const variants=[Q.mt];
  for(let i=0;i+1<Q.main.length;i++){const j=Q.main.slice(0,i).concat([Q.main[i]+Q.main[i+1]],Q.main.slice(i+2));variants.push(j.map(fzPrep))}   // "mc connell" → "mcconnell"
  const out=new Map();
  for(const toks of variants){
    const per=toks.map(t=>fzTokenHits(X,t,typo));
    per.sort((a,b)=>a.size-b.size);
    for(const [i,first] of per[0]){
      let sum=first.s,named=first.named,ok=true;
      for(let k=1;k<per.length;k++){const h=per[k].get(i);if(!h){ok=false;break}sum+=h.s;named=named||h.named}
      if(!ok)continue;let s=sum/per.length;if(!named)s=Math.min(.45,s);
      if(s>(out.get(i)||0))out.set(i,s);
    }
  }
  return out;
}
/* ranked [item, score 0..1] for a collection; typo:'always' (names) or 'fallback' (titles: only when nothing matches exactly) */
function fzSearch(key,items,fields,q,typo='fallback'){
  const Q=fzQuery(q);if(!Q.main.length)return [];
  const X=fzIndex(key,items,fields);
  let hits=fzRun(X,Q,typo==='always');
  if(!hits.size&&typo==='fallback')hits=fzRun(X,Q,true);
  if(Q.all.length===1&&Q.j.length>=3&&Q.j.length<=4)X.inits.forEach((list,i)=>{for(const ini of list){   // initials: "aoc", "mtg", "jfk"
    let ok=ini===Q.j;if(!ok&&ini.length===Q.j.length+1)for(let p=0;p<ini.length;p++)if(ini.slice(0,p)+ini.slice(p+1)===Q.j){ok=true;break}
    if(ok&&(hits.get(i)||0)<.8)hits.set(i,.8)}});
  if(Q.inits.length)for(const [i,s] of hits){const ws=X.names[i].join(' ').split(' ');hits.set(i,Math.min(1,s+(Q.inits.every(c=>ws.some(w=>w[0]===c))?.02:-.04)))}
  for(const [i,s] of hits)if(s>=.9&&X.names[i].includes(Q.full))hits.set(i,1.12);   // exact full name
  return [...hits].map(([i,s])=>[X.items[i],s]);
}
/* for long lists of titles: strict matches first; typo-tolerant matching only when nothing matches strictly */
function fzRank(items,textOf,q,tie,key){
  return fzSearch(key||'t:'+items.length,items,it=>[[textOf(it),1]],q,'fallback').sort((a,b)=>b[1]-a[1]||(tie?tie(a[0],b[0]):0)).map(x=>x[0]);
}
/* yes/no set for list filters over big collections */
const FZ_SETS=new Map();
function fzSet(key,items,textOf,q,typo='always'){const c=FZ_SETS.get(key);if(c&&c.q===q&&c.items===items)return c.set;const set=new Set(fzSearch(key,items,it=>[[textOf(it),1]],q,typo).map(x=>x[0]));FZ_SETS.set(key,{q,items,set});return set}
const fz=(text,q)=>fzScore(text,q)>0;   // simple yes/no for list filters
/* 0..100 for a person's name (with optional extra words like state and party that count for less) */
const FZ_PEOPLE=new Map();
function fzName(names,q,extra){
  const Q=fzQuery(q);if(!Q.main.length)return 0;
  let best=0;
  for(const n of names){if(!n)continue;const s=fzScore(n,Q);if(s>best)best=s}
  if(best>=.9){for(const n of names)if(n&&fzFold(n)===Q.full)return 100}
  if(extra&&best<1){
    const key=names.join('|')+'#'+extra;let P=FZ_PEOPLE.get(key);
    if(!P){P={w:[...new Set(names.filter(Boolean).flatMap(n=>fzWords(n).w))],e:fzWords(extra).w};if(FZ_PEOPLE.size>60000)FZ_PEOPLE.clear();FZ_PEOPLE.set(key,P)}
    let sum=0,named=0;
    for(const t of Q.mt){let b=0;for(const w of P.w){const v=fzTok(t,w,true);if(v>b)b=v}if(b)named++;for(const w of P.e){const v=fzTok(t,w,true)*.5;if(v>b)b=v}if(!b){sum=-1;break}sum+=b}
    if(sum>0&&named)best=Math.max(best,sum/Q.main.length*.95);
    else if(sum>0)best=Math.max(best,Math.min(.45,sum/Q.main.length));
  }
  return Math.round(best*90);
}
/* highlight: exact text first, otherwise every word that matched */
function fzMark(t,q){
  t=String(t??'');if(!q)return esc(t);
  const ql=String(q).toLowerCase().trim(),i=ql?t.toLowerCase().indexOf(ql):-1;
  if(i>=0)return esc(t.slice(0,i))+'<mark>'+esc(t.slice(i,i+ql.length))+'</mark>'+esc(t.slice(i+ql.length));
  const Q=fzQuery(q);if(!Q.main.length)return esc(t);
  return t.split(/(\s+)/).map(part=>{const f=fzFold(part);if(f&&Q.mt.some(qt=>f.split(' ').some(w=>fzTok(qt,w,true)>=.62)))return '<mark>'+esc(part)+'</mark>';return esc(part)}).join('');
}
