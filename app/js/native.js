/* ================= iPhone app support, and account deletion everywhere =================
In the iPhone app (Capacitor shell in ios-app/) the same web app runs with a few native features:
- Pro is bought with Apple in-app purchase (RevenueCat), with Restore purchases; no card checkout links in the app.
- Trade alerts arrive as push notifications (token saved to push_devices; send-alerts delivers them).
- Share uses the iPhone share sheet.
Everywhere (web and app): "Delete my account" in Account, which removes the account and its data (function 'account'). */
const NATIVE=!!(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform());
const plug=n=>{try{return (window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins[n])||(window.Capacitor&&window.Capacitor.registerPlugin&&window.Capacitor.registerPlugin(n))}catch(e){return null}};
// RevenueCat public iOS SDK key (safe to ship in an app; it can only read and buy for the signed-in user). Set when the RevenueCat project exists.
const RC_IOS_KEY='';
const IOS={offer:null,busy:false};
if(NATIVE)document.documentElement.classList.add('native');

/* ---------- account deletion ---------- */
function deleteSheet(){
  const apple=ACCT.plan&&ACCT.plan.source==='app_store'&&ACCT.plan.pro;
  openSheet('Delete your account',`<div class="sec"><div class="group pad">
   <p style="margin:0 0 10px">This permanently deletes your Capitol Receipts account and everything saved with it: your representatives, the people, stocks and bills you follow, your alert settings and alert history.</p>
   ${ACCT.plan&&ACCT.plan.pro&&!apple?'<p style="margin:0 0 10px">Your Pro subscription will be canceled right away and you won’t be charged again.</p>':''}
   ${apple?'<p style="margin:0 0 10px"><b>Your Pro subscription is billed by Apple.</b> Deleting your account doesn’t cancel it. Cancel it in Settings › your name › Subscriptions, or tap below.</p><button class="abtn sm ghost" data-applesubs style="margin-bottom:10px">Manage Apple subscriptions</button>':''}
   <p class="s" style="margin:0 0 14px">This can’t be undone. The public records on Capitol Receipts stay available without an account.</p>
   <button class="abtn" data-delacct style="background:#c8323a;width:100%">Delete my account</button>
   <div id="delmsg" class="s" role="status" style="margin-top:10px"></div></div></div>`);
}
async function deleteAccount(){
  const msg=$('#delmsg'),btn=document.querySelector('[data-delacct]');if(btn){btn.disabled=true;btn.textContent='Deleting…'}
  try{
    const {data:{session}}=await ACCT.client.auth.getSession();
    const r=await fetch(SB.url+'/functions/v1/account',{method:'POST',headers:{'Content-Type':'application/json',apikey:SB.key,Authorization:'Bearer '+session.access_token},body:JSON.stringify({action:'delete'})});
    const j=await r.json().catch(()=>({}));
    if(!j.ok)throw new Error(j.error||'failed');
    track('delete_account',{});
    try{await ACCT.client.auth.signOut()}catch(e){}
    if(typeof store!=='undefined'){['following','home','dist','zip'].forEach(k=>{try{store.set(k,k==='following'?[]:null)}catch(e){}})}
    location.href='/?deleted=1';
  }catch(e){if(btn){btn.disabled=false;btn.textContent='Delete my account'}if(msg)msg.textContent='We couldn’t delete your account just now. Try again, or email admin@squaredawaylabs.com and we’ll do it for you.'}
}
const _moreNative=more;
more=function(){
  let h=_moreNative();
  if(signedIn()){
    const rows=`<div class="sec"><div class="group">
      ${NATIVE?`<button class="row plain" data-pushon style="grid-template-columns:1fr auto"><span><span class="t">Alerts on this iPhone</span><br><span class="s">${IOS.push==='on'?'On':'Get a notification when someone you follow trades stock'}</span></span>${chev}</button>`:''}
      ${NATIVE?`<button class="row plain" data-restore style="grid-template-columns:1fr auto"><span class="t">Restore purchases</span>${chev}</button>`:''}
      ${NATIVE&&IOS.bio&&typeof isPro==='function'&&isPro()?`<button class="row plain" data-faceid style="grid-template-columns:1fr auto"><span><span class="t">Lock with ${IOS.bio==='touchID'?'Touch ID':'Face ID'}</span><br><span class="s">${lockOn()?'On: asks when you open the app':'Off'}</span></span>${chev}</button>`:''}
      <button class="row plain" data-delsheet style="grid-template-columns:1fr auto"><span class="t" style="color:#c8323a">Delete my account</span>${chev}</button></div></div>`;
    h=h.replace(/<\/div>\s*$/,rows+'</div>');
  }
  return h;
};
if(/[?&]deleted=1/.test(location.search))setTimeout(()=>{toast('Your account was deleted.');history.replaceState(null,'',location.pathname)},800);

/* ---------- share sheet ---------- */
if(NATIVE)addEventListener('load',()=>{if(typeof shareLink!=='function')return; // routes.js defines shareLink after this file
  const Share=plug('Share');
  if(Share)shareLink=function(){const url=shareUrl(),title=shareTitle();try{if(typeof gtag==='function')gtag('event','share',{method:'ios',item_id:url})}catch(e){}Share.share({title,url,dialogTitle:'Share'}).catch(()=>{})};
});

/* ---------- push alerts ---------- */
async function pushOn(ask){
  const P=plug('PushNotifications');if(!NATIVE||!P||!signedIn())return;
  try{
    let st=await P.checkPermissions();
    if(st.receive!=='granted'&&ask)st=await P.requestPermissions();
    if(st.receive!=='granted'){IOS.push='off';if(ask)toast('Turn on notifications for Capitol Receipts in Settings.');return}
    await P.register();
  }catch(e){console.warn('push',e)}
}
if(NATIVE){
  const P=plug('PushNotifications');
  if(P){
    P.addListener('registration',async t=>{
      try{const uid=ACCT.user&&ACCT.user.id;if(!uid)return;
        IOS.token=t.value;try{localStorage.setItem('cr_push_token',t.value)}catch(e){}
        await ACCT.client.from('push_devices').upsert({token:t.value,user_id:uid,platform:'ios',updated_at:new Date().toISOString()},{onConflict:'token'});
        IOS.push='on';store.set('pushAsked',true);}catch(e){console.warn('push save',e)}});
    P.addListener('registrationError',e=>console.warn('push reg',e));
    // tapping an alert opens the member or the trade feed
    P.addListener('pushNotificationActionPerformed',a=>{const d=(a.notification&&a.notification.data)||{};
      if(d.member&&typeof byId!=='undefined'&&byId[d.member]){S.tab='search';S.stack=[d.member];render();scrollTo(0,0)}else if(typeof navGo==='function')navGo('radar')});
  }
  // already allowed: refresh the token quietly after sign-in
  setTimeout(()=>{if(signedIn())pushOn(false)},2500);
}

// signing out stops this phone's alerts for that account and signs RevenueCat out, so the next person doesn't get them
if(NATIVE&&typeof signOut==='function'){
  const _signOutNative=signOut;
  signOut=async function(){
    let tok=IOS.token;try{tok=tok||localStorage.getItem('cr_push_token')}catch(e){}
    try{if(tok&&ACCT.client)await ACCT.client.from('push_devices').delete().eq('token',tok)}catch(e){console.warn('push remove',e)}
    try{const RC=plug('Purchases');if(RC&&IOS.configured)await RC.logOut()}catch(e){}
    IOS.push='off';IOS.offer=null;
    return _signOutNative.apply(this,arguments);
  };
}

/* ---------- links that open the app (capitolreceipts.com pages, alert emails) ---------- */
if(NATIVE){
  const A=plug('App');
  if(A)A.addListener('appUrlOpen',ev=>{try{const u=new URL(ev.url);if(!/capitolreceipts\.com$/.test(u.hostname))return;
    const rec=/^\/(member|past-member|appointee|nominee|judge|bill|vote|pac|lobbying|company|committee|race|state|district|stock|official-trades)\//.test(u.pathname);
    location.href='https://app.capitolreceipts.com'+u.pathname+(rec?'?app=1':u.search)}catch(e){}});
  try{const SP=plug('SplashScreen');SP&&setTimeout(()=>SP.hide&&SP.hide(),300)}catch(e){}
}

/* ---------- Pro with Apple in-app purchase ---------- */
async function iosConfigure(){
  const RC=plug('Purchases');if(!RC||!RC_IOS_KEY)return null;
  if(!IOS.configured){await RC.configure({apiKey:RC_IOS_KEY,appUserID:ACCT.user?ACCT.user.id:undefined});IOS.configured=true}
  else if(ACCT.user)try{await RC.logIn({appUserID:ACCT.user.id})}catch(e){}
  return RC;
}
async function iosOffer(){
  if(IOS.offer)return IOS.offer;
  try{const RC=await iosConfigure();if(!RC)return null;const o=await RC.getOfferings();const c=o&&o.current;if(!c)return null;
    const pk=c.availablePackages||[];IOS.offer={m:pk.find(p=>p.packageType==='MONTHLY'),y:pk.find(p=>p.packageType==='ANNUAL')};return IOS.offer}catch(e){console.warn('offerings',e);return null}
}
async function iosBuy(){
  if(!signedIn())return authSheet('up','Create a free account first. Pro is tied to your account so it works on the website too.');
  const msg=$('#promsg');if(IOS.busy)return;IOS.busy=true;if(msg)msg.textContent='Opening the App Store…';
  try{const RC=await iosConfigure();const o=await iosOffer();const pk=o&&(PRO.cycle==='m'?o.m:o.y);
    if(!RC||!pk){if(msg)msg.textContent='Purchases aren’t available right now. Try again soon.';return}
    track('begin_checkout',{currency:'USD',value:PRO.cycle==='m'?PRO.price.m:PRO.price.y,items:[{item_id:'pro_ios_'+(PRO.cycle==='m'?'monthly':'yearly'),item_name:'Capitol Receipts Pro',quantity:1}]});
    const r=await RC.purchasePackage({aPackage:pk});
    if(r&&r.customerInfo&&r.customerInfo.entitlements&&r.customerInfo.entitlements.active&&r.customerInfo.entitlements.active.pro){if(msg)msg.textContent='You’re on Pro. Unlocking…';await waitPro();}
  }catch(e){if(!(e&&(e.userCancelled||/cancel/i.test(e.message||e.code||''))))if(msg)msg.textContent='The purchase didn’t go through. You haven’t been charged.';else if(msg)msg.textContent=''}
  finally{IOS.busy=false}
}
async function waitPro(){ // the App Store confirms through RevenueCat to our server; give it a few seconds
  for(let i=0;i<12;i++){await loadPlan();if(ACCT.plan&&ACCT.plan.pro){toast('Welcome to Pro');render();return true}await new Promise(r=>setTimeout(r,1500))}
  toast('Your purchase went through. Pro will switch on in a minute.');return false;
}
async function iosRestore(){
  if(!signedIn())return authSheet('in','Sign in to the account you bought Pro with.');
  try{const RC=await iosConfigure();if(!RC){toast('Purchases aren’t available right now.');return}
    const r=await RC.restorePurchases();const on=r&&r.customerInfo&&r.customerInfo.entitlements&&r.customerInfo.entitlements.active&&r.customerInfo.entitlements.active.pro;
    if(on){toast('Restoring Pro…');await waitPro()}else toast('No Pro purchase found for this Apple ID.')}catch(e){toast('Couldn’t restore purchases. Try again.')}
}
if(NATIVE&&typeof planPicker==='function'){
  // in the app the plan picker buys with Apple; App Store rules require the terms and a restore button right here
  planPicker=function(){
    const p=ACCT.plan||{},y=PRO.cycle==='y',o=IOS.offer;
    if(!o)iosOffer().then(x=>{if(x&&document.querySelector('.ppick'))render()});
    const price=c=>o&&o[c]&&o[c].product?o[c].product.priceString:'$'+(c==='m'?PRO.price.m:PRO.price.y);
    if(p.pro&&p.source!=='app_store')return `<div class="ppick"><div class="pfine">Your Pro subscription is billed through capitolreceipts.com. It works here too.</div></div>`;
    if(p.pro)return `<div class="ppick"><div class="pfine">You have Pro through the App Store.</div><button class="abtn sm ghost" data-applesubs>Manage subscription</button></div>`;
    return `<div class="ppick"><div class="pplans" role="radiogroup" aria-label="Billing">
      <button role="radio" data-cycle="y" aria-checked="${y}"><span class="pn">Yearly</span><b>${price('y')}<small>/year</small></b></button>
      <button role="radio" data-cycle="m" aria-checked="${!y}"><span class="pn">Monthly</span><b>${price('m')}<small>/month</small></b></button></div>
     <button class="pcta" data-iosbuy>Subscribe · ${price(y?'y':'m')}${y?'/year':'/month'}</button>
     <div class="pfine" id="promsg" role="status"></div>
     <p class="pfine" style="margin-top:8px">Payment is charged to your Apple ID. The subscription renews automatically at the same price each ${y?'year':'month'} unless canceled at least 24 hours before the end of the period. Manage or cancel any time in Settings › your name › Subscriptions.
      <a href="https://www.capitolreceipts.com/terms" target="_blank" rel="noopener">Terms of Use</a> · <a href="https://www.capitolreceipts.com/privacy" target="_blank" rel="noopener">Privacy Policy</a></p>
     <button class="link" data-restore style="margin-top:6px">Restore purchases</button></div>`;
  };
}
document.addEventListener('click',e=>{
  const g=s=>e.target.closest&&e.target.closest(s);let el;
  if(g('[data-delsheet]')){e.preventDefault();e.stopImmediatePropagation();deleteSheet();return}
  if(g('[data-delacct]')){e.preventDefault();e.stopImmediatePropagation();deleteAccount();return}
  if(g('[data-applesubs]')){e.preventDefault();e.stopImmediatePropagation();window.open('https://apps.apple.com/account/subscriptions','_blank');return}
  if(NATIVE&&g('[data-iosbuy]')){e.preventDefault();e.stopImmediatePropagation();iosBuy();return}
  if(NATIVE&&g('[data-restore]')){e.preventDefault();e.stopImmediatePropagation();iosRestore();return}
  if(NATIVE&&g('[data-pushon]')){e.preventDefault();e.stopImmediatePropagation();pushOn(true);return}
  // no card checkout or billing portal inside the iPhone app
  if(NATIVE&&(el=g('[data-billing],[data-protrial]'))){e.preventDefault();e.stopImmediatePropagation();
    if(ACCT.plan&&ACCT.plan.pro){if(ACCT.plan.source==='app_store')window.open('https://apps.apple.com/account/subscriptions','_blank');else toast('Your plan is billed through capitolreceipts.com. Manage it there from a browser.');return}
    iosBuy();return}
},true);
document.head.insertAdjacentHTML('beforeend',`<style>
#app > .pnav + .wrap{margin-top:env(safe-area-inset-top,0px)}
.mtabs{top:calc(var(--navh,50px) + env(safe-area-inset-top,0px))!important}
.native .pfine a{color:inherit;text-decoration:underline}
</style>`);


/* ---------- home-screen widget: share who you follow with it ---------- */
const CRN=NATIVE?plug('CRNative'):null;
let _widgetSent='';
function syncWidget(){
  if(!CRN||!CRN.setWidgetData)return;
  const ids=signedIn()?[...(S.following||[])].filter(id=>typeof byId!=='undefined'&&byId[id]).slice(0,200):[];
  const key=(signedIn()?'1':'0')+ids.join(',');if(key===_widgetSent)return;_widgetSent=key;
  CRN.setWidgetData({signedIn:signedIn(),follows:ids.map(id=>({id,name:byId[id].full||byId[id].name}))}).catch(()=>{_widgetSent=''});
}
if(CRN){const _renderW=render;render=function(){const r=_renderW.apply(this,arguments);try{syncWidget()}catch(e){}return r}}

/* ---------- optional Face ID / Touch ID lock (Pro) ---------- */
const lockOn=()=>{try{return localStorage.getItem('cr_lock')==='1'}catch(e){return false}};
if(CRN&&CRN.biometricStatus)CRN.biometricStatus().then(r=>{if(r&&r.available){IOS.bio=r.type;if(!$('#sheet').hidden)return;render()}}).catch(()=>{});
function lockScreen(){
  if(document.getElementById('applock'))return;
  const d=document.createElement('div');d.id='applock';d.setAttribute('role','dialog');d.setAttribute('aria-label','App locked');
  d.style.cssText='position:fixed;inset:0;z-index:10000;background:#14274e;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:24px;text-align:center';
  d.innerHTML='<b style="font-size:22px"><span style="background:#c8323a;padding:2px 7px;border-radius:5px">Capitol</span> Receipts</b><p style="margin:0;opacity:.85">Locked</p><button class="abtn" data-unlock style="background:#fff;color:#14274e">Unlock</button>';
  document.body.appendChild(d);unlock();
}
async function unlock(){
  if(!CRN)return;try{const r=await CRN.authenticate({reason:'Unlock Capitol Receipts'});if(r&&r.ok){const d=document.getElementById('applock');if(d)d.remove()}}catch(e){}
}
if(CRN){
  if(lockOn())lockScreen();
  let away=0;const A=plug('App');
  if(A)A.addListener('appStateChange',st=>{if(!st.isActive){away=Date.now();return}if(lockOn()&&away&&Date.now()-away>60000)lockScreen()});
}
document.addEventListener('click',async e=>{
  const g=s=>e.target.closest&&e.target.closest(s);
  if(g('[data-unlock]')){e.preventDefault();unlock();return}
  if(g('[data-faceid]')){e.preventDefault();e.stopImmediatePropagation();
    if(lockOn()){try{localStorage.removeItem('cr_lock')}catch(x){}toast('App lock is off.');render();return}
    try{const r=await CRN.authenticate({reason:'Turn on the app lock'});if(r&&r.ok){try{localStorage.setItem('cr_lock','1')}catch(x){}toast('App lock is on. You’ll be asked when you open the app.');render()}}catch(x){}
    return}
},true);

/* ---------- offline: say so, and keep the people you follow ready to read ---------- */
function offlineNote(){if(navigator.onLine===false&&typeof toast==='function')toast('You’re offline. Showing records saved on this device.')}
addEventListener('offline',offlineNote);
addEventListener('online',()=>{if(typeof toast==='function')toast('Back online.')});
if(navigator.onLine===false)setTimeout(offlineNote,1500);
/* once a day, open-and-cache the photos and pages of followed members so they read offline (the data itself is
   already cached by the service worker when the app loads) */
setTimeout(()=>{try{
  if(!navigator.onLine||!signedIn()||typeof byId==='undefined')return;
  const last=+(localStorage.getItem('cr_offline_at')||0);if(Date.now()-last<864e5)return;localStorage.setItem('cr_offline_at',String(Date.now()));
  [...(S.following||[])].slice(0,50).forEach(id=>{if(byId[id]&&window.__PHOTOS&&window.__PHOTOS[id])fetch(faceSrc(id)).catch(()=>{})});
}catch(e){}},8000);
