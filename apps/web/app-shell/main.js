
/* Supabase: public, read-only access (publishable key; tables are protected by row-level security) */
window.SB={url:'https://hxgckcriehvrolwnabpd.supabase.co',key:'sb_publishable_jiwF5q1sFMuaGXLKg6FKAQ_3rCjcZ1J'};
SB.req=async(path,opt={},tries=3)=>{
  for(let i=0;;i++){
    let r;
    try{r=await fetch(SB.url+'/rest/v1/'+path,{method:opt.method||'GET',headers:Object.assign({apikey:SB.key,Accept:'application/json'},opt.body?{'Content-Type':'application/json'}:{},opt.headers||{}),body:opt.body})}
    catch(e){if(i+1<tries){await new Promise(f=>setTimeout(f,600*(i+1)));continue}throw e}
    if(r.ok)return r.json();
    if(r.status>=500&&i+1<tries){await new Promise(f=>setTimeout(f,600*(i+1)));continue}
    throw new Error(path.split('?')[0]+' '+r.status);
  }
};
/* public reads go through our CDN cache (/api/db) so traffic spikes don't land on the database; falls back to direct */
SB.PUB=/^(members|nominations|roll_calls|photos|app_meta|people|careers|appointees|bills|pacs|lobby_clients|committees|zip_districts|corrections|races|outside_groups|congress_votes|companies|member_extras|caucuses|judges|rpc\/get_light|rpc\/vote_slice)\?/;
SB.pub=async(path,tries=3)=>{
  const pre=window.__PRE&&window.__PRE[path];if(pre){delete window.__PRE[path];const v=await pre;if(v)return v}
  for(let i=0;;i++){
    let r;
    try{r=await fetch('/api/db?q='+encodeURIComponent(path),{headers:{Accept:'application/json'}})}catch(e){r=null}
    if(r&&r.ok){try{return await r.json()}catch(e){r=null}}
    if(r&&r.status>=400&&r.status<500&&r.status!==429)return SB.req(path);
    if(i+1<tries){await new Promise(f=>setTimeout(f,600*(i+1)));continue}
    return SB.req(path);
  }
};
SB.get=path=>SB.PUB.test(path)?SB.pub(path):SB.req(path);
/* page through tables bigger than the API's 1,000-row limit */
SB.all=async(path,size=1000)=>{let out=[],from=0;for(;;){const rows=await SB.get(path+`&limit=${size}&offset=${from}`);out=out.concat(rows);if(rows.length<size)return out;from+=size}};
SB.rpc=(fn,args)=>fn==='get_light'?SB.get('rpc/get_light?kind='+encodeURIComponent(args.kind)):SB.req('rpc/'+fn,{method:'POST',body:JSON.stringify(args||{})});
SB.meta=async keys=>Object.fromEntries((await SB.get('app_meta?select=key,value&key=in.('+keys.join(',')+')')).map(r=>[r.key,r.value]));

const APP_VER='202611090939'; /* bump on every release so browsers and the CDN fetch fresh files */
const APP_SCRIPTS=['fuzzy','core','party','hist','ui','nav','pages','search','leaders','linkify','pacs','elections','companies','friendly','votes','places','extras','glossary_es','es_dict','i18n','db','account','trust','pro','pro2','exec','simple','native','social','desktop','support','routes','a11y','guard'];
async function boot(){
  const msg=document.getElementById('bootmsg');
  /* start downloading the app's code while the data loads */
  const esPre=(()=>{try{return JSON.parse(localStorage.getItem('pt_lang'))==='es'}catch(e){return false}})()||/[?&]lang=es/.test(location.search);
  for(const n of APP_SCRIPTS){if(!esPre&&(n==='es_dict'||n==='glossary_es'))continue;const l=document.createElement('link');l.rel='preload';l.as='script';l.href='/app/js/'+n+'.js?v='+APP_VER;document.head.appendChild(l)}
  try{
    /* portraits load one by one as faces appear on screen; faces show initials until the list of portraits arrives */
    window.__PHOTOS={};
    const [members,noms,rc,meta]=await Promise.all([
      SB.all('members?select=lite&order=ord'),SB.all('nominations?select=data&order=ord'),SB.all('roll_calls?select=id,data&order=ord'),
      SB.meta(['asOf','months','passage','lobby','parties','lobbied_bills'])]);
    /* profile detail (vote history by month, donor employers, ex-staff lobbyists, recent votes...) loads next;
       a profile opened before it lands waits a moment (see routes.js) */
    window.__FULL=false;
    window.__FULLP=SB.all('members?select=id,missedM:data->missedM,employers:data->employers,revolving:data->revolving,pv:data->pv,pacCats:data->pacCats,recent:data->recent,ptrFiles:data->ptrFiles,tradeByMonth:data->tradeByMonth,raisedHist:data->raisedHist&order=ord').then(rows=>{
      const go=()=>{if(typeof byId==='undefined'){setTimeout(go,100);return}
        for(const r of rows){const m=byId[r.id];if(!m)continue;const id=r.id;delete r.id;Object.assign(m,r);m.revN=(m.revolving||[]).length}
        window.__FULL=true;
        if(typeof render==='function'&&typeof S!=='undefined'&&!window.__HOLD&&!/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement||{}).tagName||'')){const y=scrollY;render();scrollTo(0,y)}};go();
    }).catch(e=>{console.warn('detail',e);window.__FULLERR=true;if(typeof render==='function')render()});
    /* which members have a portrait (a few KB); each face then loads as its own image only when it's on screen */
    SB.all('photos?select=id&order=id').then(rows=>{
      for(const r of rows)window.__PHOTOS[r.id]=1;
      const draw=()=>{const typing=/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement||{}).tagName||'');if(typeof render==='function'&&typeof S!=='undefined'&&!window.__HOLD&&!typing){const y=scrollY;render();scrollTo(0,y)}else setTimeout(draw,typing?1500:200)};draw();
    }).catch(e=>console.warn('photos',e));
    window.__DATA={asOf:meta.asOf,months:meta.months,members:members.map(r=>r.lite),rc:Object.fromEntries(rc.map(r=>[r.id,r.data])),
      noms:noms.map(r=>r.data),passage:meta.passage,lobby:meta.lobby,bills:meta.lobbied_bills,parties:meta.parties};
  }catch(e){
    console.error(e);
    msg.innerHTML='Couldn’t reach the database. Check your connection.<br><button onclick="location.reload()">Try again</button>';
    return;
  }
  /* if a file fails to download (a dropped connection on a phone), reload once instead of leaving a broken screen */
  const failed=()=>{let tried=false;try{tried=sessionStorage.getItem('cr_retry')==='1';sessionStorage.setItem('cr_retry','1')}catch(e){}
    if(!tried){location.reload();return}
    const t='The page didn’t finish loading. Check your connection.<br><button onclick="location.reload()">Try again</button>';
    if(document.contains(msg))msg.innerHTML=t;else if(!document.getElementById('loadfail')){const d=document.createElement('div');d.id='loadfail';d.setAttribute('role','alert');d.style.cssText='position:fixed;left:12px;right:12px;top:calc(env(safe-area-inset-top) + 12px);z-index:200;background:#14274e;color:#fff;padding:14px 16px;border-radius:14px;font-size:15px;text-align:center';d.innerHTML=t;document.body.appendChild(d)}};
  const isEs=(()=>{try{return JSON.parse(localStorage.getItem('pt_lang'))==='es'}catch(e){return false}})()||/[?&]lang=es/.test(location.search);
  for(const n of APP_SCRIPTS){if(!isEs&&(n==='es_dict'||n==='glossary_es'))continue;const s=document.createElement('script');s.src='/app/js/'+n+'.js?v='+APP_VER;s.async=false;s.onerror=failed;
    if(n==='routes')s.onload=()=>{try{sessionStorage.removeItem('cr_retry')}catch(e){}};document.body.appendChild(s)}
}
boot();
