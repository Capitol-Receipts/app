/* ================= Desktop: full menu in the side rail and two balanced columns ================= */
const WIDE=matchMedia('(min-width:1240px)');
const RAIL=matchMedia('(min-width:1024px)');
/* desktop: the full site menu lives in the side rail */
function railMenu(){
  let m=document.querySelector('aside.railmenu');
  if(!RAIL.matches){if(m)m.innerHTML='';return}
  if(!m){m=document.createElement('aside');m.className='railmenu';m.setAttribute('aria-label','Site menu');document.body.appendChild(m)}
  const st=m.scrollTop;
  m.innerHTML=drawerHtml();
  m.scrollTop=st;
  const logo=m.querySelector('.dtop .logo');if(logo){logo.setAttribute('data-go','home');logo.setAttribute('role','button');logo.tabIndex=0}
  const cur=S.stack.length?null:S.tab;
  m.querySelectorAll('[data-go]').forEach(b=>{if(b.dataset.go===cur&&!b.closest('.dtop'))b.setAttribute('aria-current','page')});
}
/* Only content sections go into columns; headers, controls and wide carousels stay full width,
   so a page reads in order: [full] [two columns] [full] [two columns] ... */
const COL_OK=e=>(e.matches('section.sec,div.sec,section.pe-card'))&&!e.querySelector('.carousel,.chipsrow,.seg,.sortbar')&&!e.matches('.rsec,.dash,.wide');
function twoColumns(){
  document.body.classList.remove('two');
  const w=document.querySelector('#app > .wrap');if(!w)return;
  w.classList.remove('two');
  if(!WIDE.matches)return;
  if(w.querySelector(':scope > .shead')&&S.q)return;      // search results stay one list
  const kids=[...w.children];
  const runs=[];let cur=[];
  for(const k of kids){if(COL_OK(k))cur.push(k);else{if(cur.length)runs.push(cur);cur=[]}}
  if(cur.length)runs.push(cur);
  let made=0;
  for(const items of runs){
    if(items.length<2)continue;
    const box=document.createElement('div');box.className='dcols';
    const a=document.createElement('div'),b=document.createElement('div');a.className=b.className='dcol';
    box.append(a,b);items[0].before(box);
    items.forEach(el=>a.appendChild(el));                 // measure at final column width
    const hs=items.map(el=>el.getBoundingClientRect().height+28);
    let ha=0,hb=0;
    items.forEach((el,i)=>{if(ha<=hb){a.appendChild(el);ha+=hs[i]}else{b.appendChild(el);hb+=hs[i]}});
    made++;
  }
  w.classList.add('two');document.body.classList.add('two');
  // long lists that run the full width get two columns of rows
  w.querySelectorAll('.group').forEach(g=>{if(g.closest('.dcol'))return;const rows=[...g.children].filter(r=>r.classList.contains('row')&&!r.classList.contains('kv'));if(rows.length>=8&&rows.length===g.children.length)g.classList.add('biglist')});
}
const _renderDesk=render;
render=function(){_renderDesk();try{railMenu();if(S.lang==='es')translateAll();twoColumns()}catch(e){console.warn(e)}};
WIDE.addEventListener('change',()=>render());
RAIL.addEventListener('change',()=>render());
render();
/* links from alert emails: app.capitolreceipts.com/#p=<member id> opens that profile */
(function(){const m=location.hash.match(/^#p=([A-Za-z0-9:_-]{3,60})$/);if(!m)return;
  const t=setInterval(()=>{if(typeof byId!=='undefined'&&byId&&byId[m[1]]){clearInterval(t);S.tab='search';S.stack=[m[1]];render();scrollTo(0,0);history.replaceState(null,'',location.pathname)}},300);
  setTimeout(()=>clearInterval(t),30000)})();
/* iPhone and Android apps: coming soon note on the More screen */
const _moreSoon=more;
more=function(){
  const card=`<section class="sec"><div class="soon"><span class="soonic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="6" y="2" width="12" height="20" rx="3"/><circle cx="12" cy="18" r="1" fill="currentColor"/></svg></span><span><b>iPhone and Android apps are coming soon</b><span>Capitol Receipts already works in your phone’s browser. To open it like an app: on iPhone, tap Share, then Add to Home Screen. On Android, tap the menu, then Add to Home screen. Your account and Pro plan will carry over to the apps.</span></span></div></section>`;
  return _moreSoon().replace(/<\/div>\s*$/,card+'</div>');
};
