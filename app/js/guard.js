/* ================= Safety net (loaded last, wraps everything) =================
- Any error while drawing a screen shows a short message with a way home, instead of a blank or frozen screen.
- A screen that is still "Loading…" after 20 seconds (an unknown link, or data that never arrived) says so and
  offers to try again or go home.
- Script errors are counted in Google Analytics as "exception" events (message and file only, no personal data),
  so problems show up in reporting. */
(function(){
  const app=document.getElementById('app');if(!app)return;
  const sent=new Set();
  function report(msg,where){
    const d=(String(msg||'error').replace(/https?:\/\/\S+/g,'').slice(0,120)+(where?' @'+where:'')).trim();
    if(sent.has(d)||sent.size>20)return;sent.add(d);
    try{if(typeof gtag==='function')gtag('event','exception',{description:d,fatal:false})}catch(e){}
  }
  addEventListener('error',e=>{if(e.message)report(e.message,(String(e.filename||'').split('/').pop().split('?')[0])+':'+e.lineno)});
  addEventListener('unhandledrejection',e=>{const r=e.reason;report('promise: '+((r&&r.message)||r))});
  window.reportError=report;

  /* real-visitor speed (Core Web Vitals) to Google Analytics, once per page view when the page is hidden:
     LCP (largest paint), CLS (layout shift) and INP (slowest interaction, approximated from event timing). */
  try{
    const v={lcp:0,cls:0,inp:0};
    new PerformanceObserver(l=>{for(const e of l.getEntries())v.lcp=e.startTime}).observe({type:'largest-contentful-paint',buffered:true});
    new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)v.cls+=e.value}).observe({type:'layout-shift',buffered:true});
    new PerformanceObserver(l=>{for(const e of l.getEntries())if(e.interactionId)v.inp=Math.max(v.inp,e.duration)}).observe({type:'event',buffered:true,durationThreshold:40});
    let done=false;
    addEventListener('visibilitychange',()=>{if(done||document.visibilityState!=='hidden'||typeof gtag!=='function')return;done=true;
      const rate=(x,g,p)=>x<=g?'good':x<=p?'needs_improvement':'poor';
      const send=(n,x,g,p,u)=>{if(x>0||n==='CLS')gtag('event','web_vitals',{metric_name:n,metric_value:Math.round(x*u)/u,metric_rating:rate(x,g,p),transport_type:'beacon',non_interaction:true})};
      send('LCP',v.lcp,2500,4000,1);send('CLS',v.cls,0.1,0.25,1000);send('INP',v.inp,200,500,1);
    });
  }catch(e){}

  const msgScreen=(title,body,retry)=>`<div class="wrap"><div class="empty" role="alert" style="padding-top:calc(var(--navh) + 24px)">
    <p style="font-weight:700;font-size:18px;margin:0 0 6px">${title}</p><p style="margin:0 0 16px">${body}</p>
    <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">${retry?'<button class="abtn sm ghost" data-guardretry>Try again</button>':''}<button class="abtn sm" data-guardhome>Go to the home screen</button></div></div></div>`;
  const route=()=>{try{return (S.tab||'')+'|'+S.stack.join('>')}catch(e){return ''}};
  let stuckT=null;
  const _renderGuard=render;
  render=function(){
    let r;
    try{r=_renderGuard.apply(this,arguments)}
    catch(err){
      console.error(err);report('render: '+(err&&err.message),String((S.stack&&S.stack.at(-1))||S.tab||'').split(':')[0]);
      app.innerHTML=msgScreen('Something went wrong on this page.','You can try again or go back to the home screen.',true);
      return;
    }
    clearTimeout(stuckT);
    if(/^\s*Loading…?\s*$/.test(app.innerText||'')){
      const at=route();
      stuckT=setTimeout(()=>{if(route()!==at||!/^\s*Loading…?\s*$/.test(app.innerText||''))return;
        report('stuck loading',at.split('|')[1].split(':')[0]);
        app.innerHTML=msgScreen(navigator.onLine===false?'You’re offline.':'We couldn’t open this page.',
          navigator.onLine===false?'Reconnect and try again.':'The link may be out of date, or the records didn’t load.',true)},20000);
    }
    return r;
  };
  document.addEventListener('click',e=>{
    const t=e.target.closest&&e.target.closest('[data-guardhome],[data-guardretry]');if(!t)return;
    e.preventDefault();e.stopImmediatePropagation();
    if(t.hasAttribute('data-guardretry')){location.reload();return}
    S.stack=[];S.tab='home';render();scrollTo(0,0);
  },true);
})();
