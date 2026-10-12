/* ================= Desktop: side-rail logo and two balanced columns ================= */
const WIDE=matchMedia('(min-width:1180px)');
const SPAN_SEL='.homehero,.fakesearch,.shead,.scopes,.lhero,.lbanner,.glance,.note,.boot,.pnav,.phero';
(function railExtras(){
  const bar=document.querySelector('nav.tabbar');if(!bar||bar.querySelector('.raillogo'))return;
  bar.insertAdjacentHTML('afterbegin','<button class="raillogo notr" data-tab="home" aria-label="Capitol Receipts home"><span>Capitol</span>Receipts</button>');
  bar.insertAdjacentHTML('beforeend','<div class="railfoot">Nonpartisan. Built on public records.<br><a href="https://www.capitolreceipts.com/how-it-works" target="_blank" rel="noopener">How it works</a> · <a href="https://www.capitolreceipts.com" target="_blank" rel="noopener">About</a></div>');
})();
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
render=function(){_renderDesk();try{twoColumns()}catch(e){console.warn(e)}};
WIDE.addEventListener('change',()=>render());
render();
