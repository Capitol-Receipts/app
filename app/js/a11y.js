/* ================= Keyboard and screen reader support (loaded last) =================
- The pop-up panel (#sheet) is a proper dialog: it gets a name, takes focus when it opens, keeps Tab inside it,
  closes with Escape, and gives focus back to whatever opened it.
- Moving to a new screen moves focus to that screen's heading, updates the page title and announces it.
  Redrawing the same screen (data arriving, a filter changing) keeps focus on the control that had it.
- #app is the main landmark, with a "Skip to content" link before it. */
(function(){
  const app=document.getElementById('app'),sheet=document.getElementById('sheet'),panel=document.getElementById('panel');
  if(!app||!sheet||!panel)return;
  app.setAttribute('role','main');app.setAttribute('tabindex','-1');
  if(!document.getElementById('skipmain')){
    const a=document.createElement('a');a.id='skipmain';a.href='#app';a.className='skiplink';a.textContent='Skip to content';
    a.addEventListener('click',e=>{e.preventDefault();focusHeading(true)});
    document.body.insertBefore(a,document.body.firstChild);
  }
  const live=document.createElement('div');live.id='srlive';live.setAttribute('aria-live','polite');live.className='sronly';document.body.appendChild(live);
  const say=t=>{live.textContent='';setTimeout(()=>{live.textContent=t},60)};
  const FOCUSABLE='a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  const visible=el=>!!(el.offsetWidth||el.offsetHeight||el.getClientRects().length);

  /* ---------- the pop-up panel ---------- */
  let opener=null,wasOpen=false;
  function onSheet(){
    const open=!sheet.hidden;
    if(open&&!wasOpen){
      opener=document.activeElement&&document.activeElement!==document.body?document.activeElement:null;
      const h=panel.querySelector('.ptop h3');if(h){h.id='sheettitle';panel.setAttribute('aria-labelledby','sheettitle')}
      if(!panel.hasAttribute('tabindex'))panel.setAttribute('tabindex','-1');
      setTimeout(()=>{if(sheet.hidden)return;if(panel.contains(document.activeElement))return;
        const f=[...panel.querySelectorAll('input,select,textarea')].find(visible)||panel;f.focus({preventScroll:true})},80);
    }else if(!open&&wasOpen){
      const o=opener;opener=null;
      setTimeout(()=>{try{if(o&&document.contains(o)&&!panel.contains(o)&&visible(o))o.focus({preventScroll:true});else focusHeading(false)}catch(e){}},0);
    }
    wasOpen=open;
  }
  new MutationObserver(onSheet).observe(sheet,{attributes:true,attributeFilter:['hidden']});
  // content swapped while open (e.g. sign in → create account): name the new dialog and keep focus inside it
  new MutationObserver(()=>{if(sheet.hidden)return;const h=panel.querySelector('.ptop h3');if(h&&!h.id){h.id='sheettitle';panel.setAttribute('aria-labelledby','sheettitle')}
    if(!panel.contains(document.activeElement))panel.focus({preventScroll:true})}).observe(panel,{childList:true});
  document.addEventListener('keydown',e=>{
    if(sheet.hidden||e.key!=='Tab')return;
    const f=[...panel.querySelectorAll(FOCUSABLE)].filter(visible);if(!f.length){e.preventDefault();panel.focus();return}
    const first=f[0],last=f[f.length-1];
    if(e.shiftKey&&(document.activeElement===first||document.activeElement===panel)){e.preventDefault();last.focus()}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
  },true);

  /* ---------- screen changes ---------- */
  function heading(){return app.querySelector('h1')||app.querySelector('.pnav .mid')||app.querySelector('h2')}
  function focusHeading(force){
    const h=heading();if(!h)return app.focus({preventScroll:true});
    if(!h.hasAttribute('tabindex'))h.setAttribute('tabindex','-1');
    h.focus({preventScroll:!force});
  }
  // remember which control had focus by something stable across a redraw
  function key(el){
    if(!el||el===document.body||!app.contains(el))return null;
    for(const a of el.getAttributeNames())if(a.startsWith('data-')&&a!=='data-v')return `[${a}="${CSS.escape(el.getAttribute(a))}"]`;
    if(el.id)return '#'+CSS.escape(el.id);
    if(el.name)return `[name="${CSS.escape(el.name)}"]`;
    return null;
  }
  let lastRoute=null;
  const _renderA11y=render;
  render=function(){
    const k=key(document.activeElement),hadFocusInApp=app.contains(document.activeElement)&&document.activeElement!==app;
    const r=_renderA11y.apply(this,arguments);
    try{
      const route=(S.tab||'')+'|'+S.stack.join('>');
      const h=heading(),t=h?h.textContent.replace(/\s+/g,' ').trim().slice(0,80):'';
      const changed=route!==lastRoute;
      if(changed){
        const first=lastRoute===null;lastRoute=route;
        document.title=t&&route!=='home|'?t+' · Capitol Receipts':'Capitol Receipts: Who Funds Congress, Their Stock Trades & Votes';
        if(!first){if(sheet.hidden)focusHeading(false);if(t)say(t)}
      }else if(t&&route!=='home|'&&!document.title.startsWith(t)){document.title=t+' · Capitol Receipts'}
      if(!changed&&k&&hadFocusInApp&&sheet.hidden){
        const el=app.querySelector(k);if(el&&el!==document.activeElement)el.focus({preventScroll:true});
      }
    }catch(e){}
    return r;
  };
})();
