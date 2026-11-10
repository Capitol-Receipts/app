(function(){
  /* cookie choice for visitors in Europe and the UK (Google Analytics and PostHog; the site works either way) */
  var choice=null;try{choice=localStorage.getItem('cr_consent')}catch(e){}
  var tz='';try{tz=Intl.DateTimeFormat().resolvedOptions().timeZone||''}catch(e){}
  if(choice||!/^(Europe\/|Atlantic\/(Reykjavik|Canary|Madeira|Faroe|Azores))/.test(tz))return;
  function show(){if(document.getElementById('crconsent'))return;
    var d=document.createElement('div');d.id='crconsent';d.setAttribute('role','dialog');d.setAttribute('aria-label','Cookie choice');
    d.style.cssText='position:fixed;left:12px;right:12px;bottom:calc(env(safe-area-inset-bottom) + 12px);z-index:9999;max-width:560px;margin:0 auto;background:#14274e;color:#fff;border-radius:14px;padding:14px 16px;font:15px/1.45 -apple-system,Segoe UI,Arial,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.25)';
    d.innerHTML='<p style="margin:0 0 10px">We use Google Analytics and PostHog to count visits and see which pages help people. The site works the same if you say no. <a href="https://www.capitolreceipts.com/privacy" style="color:#fff">Privacy</a></p><div style="display:flex;gap:8px;justify-content:flex-end"><button data-c="denied" style="font:inherit;font-weight:600;padding:8px 14px;border-radius:10px;border:1px solid rgba(255,255,255,.6);background:transparent;color:#fff;cursor:pointer">No thanks</button><button data-c="granted" style="font:inherit;font-weight:700;padding:8px 14px;border-radius:10px;border:0;background:#fff;color:#14274e;cursor:pointer">Accept</button></div>';
    d.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-c]');if(!b)return;var v=b.getAttribute('data-c');
      try{localStorage.setItem('cr_consent',v)}catch(x){}
      if(v==='granted'&&typeof gtag==='function')gtag('consent','update',{analytics_storage:'granted'});d.remove();if(v==='granted'&&window.__phStart)window.__phStart()});
    document.body.appendChild(d)}
  if(document.body)show();else document.addEventListener('DOMContentLoaded',show);
})();