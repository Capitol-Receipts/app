/* ================= Desktop: full menu in the side rail and two balanced columns ================= */
const WIDE=matchMedia('(min-width:1240px)');
const SPAN_SEL='.homehero,.fakesearch,.shead,.scopes,.lhero,.lbanner,.glance,.note,.boot,.pnav,.phero';
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
function twoColumns(){
  document.body.classList.remove('two');
  const w=document.querySelector('#app > .wrap');if(!w)return;
  w.classList.remove('two');
  if(!WIDE.matches)return;
  const items=[...w.children].filter(c=>!c.matches(SPAN_SEL));
  if(items.length<3)return;
  const box=document.createElement('div');box.className='dcols';
  const a=document.createElement('div'),b=document.createElement('div');a.className=b.className='dcol';
  box.append(a,b);
  w.classList.add('two');document.body.classList.add('two');
  items[0].before(box);
  items.forEach(el=>a.appendChild(el));               // measure at final column width
  const hs=items.map(el=>el.getBoundingClientRect().height+28);
  let ha=0,hb=0;
  items.forEach((el,i)=>{if(ha<=hb){a.appendChild(el);ha+=hs[i]}else{b.appendChild(el);hb+=hs[i]}});
}
const _renderDesk=render;
render=function(){_renderDesk();try{twoColumns();railMenu()}catch(e){console.warn(e)}};
WIDE.addEventListener('change',()=>render());
RAIL.addEventListener('change',()=>render());
render();
