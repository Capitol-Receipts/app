/* ================= Accounts: sign in to follow people and save your representatives ================= */
const ACCT={user:null,ready:false,client:null,saveT:null,msg:''};
const USER_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c1.2-3.8 4.2-5.6 7.5-5.6s6.3 1.8 7.5 5.6"/></svg>';
const signedIn=()=>!!ACCT.user;

function loadSupabaseLib(){
  if(window.supabase)return Promise.resolve();
  return new Promise((ok,fail)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';s.onload=ok;s.onerror=fail;document.head.appendChild(s)});
}
async function acctInit(){
  try{await loadSupabaseLib()}catch(e){console.warn('Sign-in unavailable',e);ACCT.ready=true;return}
  ACCT.client=window.supabase.createClient(SB.url,SB.key,{auth:{persistSession:true,autoRefreshToken:true,storageKey:'cr_auth',detectSessionInUrl:true}});
  const {data}=await ACCT.client.auth.getSession();
  await acctSet(data.session?.user||null);
  ACCT.client.auth.onAuthStateChange((_ev,session)=>{const u=session?.user||null;if((u&&u.id)!==(ACCT.user&&ACCT.user.id))acctSet(u)});
  ACCT.ready=true;render();
}
/* while signed out, follows and saved reps aren't shown; signing in restores the account's own */
async function acctSet(u){
  ACCT.user=u;
  try{gtag('set',{user_id:u?u.id:null})}catch(e){}
  if(!u){S.following=new Set();render();return}
  let row=null;
  try{const r=await ACCT.client.from('user_prefs').select('zip,home,dist,following').eq('user_id',u.id).maybeSingle();row=r.data}catch(e){console.warn(e)}
  const localFollow=store.get('following',[]);
  if(row){
    S.following=new Set([...(row.following||[]),...localFollow]);
    if(row.home&&!S.home){S.home=row.home;S.dist=row.dist||null;S.zip=row.zip||'';store.set('home',S.home);store.set('dist',S.dist);store.set('zip',S.zip)}
  }else S.following=new Set(localFollow);
  _storeSet('following',[]);               // the account is now the only copy
  acctSave(true);render();
}
function acctSave(now){
  if(!ACCT.user||!ACCT.client)return;
  clearTimeout(ACCT.saveT);
  ACCT.saveT=setTimeout(()=>{ACCT.client.from('user_prefs').upsert({user_id:ACCT.user.id,zip:S.zip||null,home:S.home||null,dist:S.dist&&S.dist.length?S.dist:null,following:[...S.following],updated_at:new Date().toISOString()}).then(({error})=>{if(error)console.warn(error)})},now?0:600);
}
/* keep follows in the account rather than this browser */
const _storeSet=store.set.bind(store);
store.set=function(k,v){
  if(k==='following'&&ACCT.user){acctSave();return}
  if(k==='following'&&!ACCT.user)return;
  _storeSet(k,v);
  if(['home','dist','zip'].includes(k)&&ACCT.user)acctSave();
};

/* ---------- sign-in sheet ---------- */
function authSheet(mode,reason){
  mode=mode||'in';ACCT.mode=mode;
  const title=mode==='up'?'Create your free account':mode==='reset'?'Reset your password':'Sign in';
  const why=reason?`<p class="authwhy">${reason}</p>`:'';
  const pw=mode==='reset'?'':`<label class="af">Password<input id="apw" type="password" autocomplete="${mode==='up'?'new-password':'current-password'}" minlength="8" required></label>`;
  openSheet(title,`<form class="authform" id="authform" novalidate>${why}
    <label class="af">Email<input id="aem" type="email" autocomplete="email" required></label>${pw}
    <div id="amsg" class="amsg" role="status"></div>
    <button class="abtn" type="submit">${mode==='up'?'Create account':mode==='reset'?'Email me a reset link':'Sign in'}</button>
    <div class="aswitch">${mode==='in'?`New here? <button type="button" data-auth="up">Create a free account</button><br><button type="button" data-auth="reset">Forgot your password?</button>`:`Already have an account? <button type="button" data-auth="in">Sign in</button>`}</div>
    <p class="afine">A free account saves your representatives and the people you follow, on any device.</p></form>`);
  setTimeout(()=>$('#aem')?.focus(),60);
}
async function authSubmit(){
  const em=($('#aem')?.value||'').trim(),pw=$('#apw')?.value||'',msg=$('#amsg'),btn=$('#authform .abtn');
  const say=(t,ok)=>{msg.textContent=t;msg.className='amsg'+(ok?' ok':'')};
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em))return say('Enter a valid email address.');
  if(ACCT.mode!=='reset'&&pw.length<8)return say('Passwords need at least 8 characters.');
  if(!ACCT.client)return say('Sign-in isn’t available right now. Try again in a moment.');
  btn.disabled=true;say('One moment…',true);
  const back=location.origin+'/'; /* email links return to the app home (record addresses redirect to www) */
  try{
    if(ACCT.mode==='up'){
      const {data,error}=await ACCT.client.auth.signUp({email:em,password:pw,options:{emailRedirectTo:back}});
      if(error)throw error;
      track('sign_up',{method:'email'});
      if(data.session){$('#sheet').hidden=true;return}
      say('Almost done. We sent a link to '+em+'. Open it to confirm your email, then sign in here.',true);
    }else if(ACCT.mode==='reset'){
      const {error}=await ACCT.client.auth.resetPasswordForEmail(em,{redirectTo:back});
      if(error)throw error;
      say('If there’s an account for '+em+', a reset link is on its way.',true);
    }else{
      const {error}=await ACCT.client.auth.signInWithPassword({email:em,password:pw});
      if(error)throw error;
      track('login',{method:'email'});
      $('#sheet').hidden=true;
    }
  }catch(e){
    const m=String(e.message||e);
    say(/Invalid login/i.test(m)?'That email and password don’t match.':/not confirmed/i.test(m)?'Confirm your email first. Check your inbox for the link we sent.':/already registered/i.test(m)?'There’s already an account with that email. Sign in instead.':/rate limit/i.test(m)?'Too many tries. Wait a few minutes and try again.':m);
  }finally{btn.disabled=false}
}
async function signOut(){if(ACCT.client)await ACCT.client.auth.signOut();ACCT.user=null;S.following=new Set();if(S.tab==='following')S.tab='home';render()}

window.addEventListener('submit',e=>{if(e.target.id==='authform'){e.preventDefault();authSubmit()}},true);
window.addEventListener('click',e=>{
  const g=s=>e.target.closest(s);let el;
  if(el=g('[data-auth]')){e.preventDefault();e.stopImmediatePropagation();closeDrawer?.();authSheet(el.dataset.auth);return}
  if(g('[data-signout]')){e.preventDefault();e.stopImmediatePropagation();signOut();return}
  if(!signedIn()&&(el=g('[data-follow]'))){e.preventDefault();e.stopImmediatePropagation();authSheet('in','Sign in to follow people. You’ll see everyone you follow in one place, on any device.');return}
  if(!signedIn()&&(g('[data-tab="following"]')||g('[data-go="following"]'))){e.preventDefault();e.stopImmediatePropagation();closeDrawer?.();authSheet('in','Sign in to save your representatives and the people you follow.');return}
},true);

/* ---------- navigation: My Reps only for signed-in accounts ---------- */
const TAB_REPS=TABS2.find(t=>t[0]==='following');
function syncTabs(){
  const i=TABS2.findIndex(t=>t[0]==='following'||t[0]==='signin');if(i<0)return;
  TABS2[i]=signedIn()?TAB_REPS:['signin','Sign in',USER_ICON];
}
const _drawerAcct=drawerHtml;
drawerHtml=function(){
  let h=_drawerAcct();
  if(!signedIn())h=h.replace(/<button class="ditem big" data-go="following">[\s\S]*?<\/button>/,`<button class="ditem big" data-auth="in">${USER_ICON}<span>Sign in</span><em>Free</em></button>`);
  else h=h.replace('<div class="dfoot">',`<div class="dsec"><div class="dlabel">Signed in</div><div class="ditem slim acctline"><span>${esc(ACCT.user.email||'')}</span></div><button class="ditem slim" data-signout><span>Sign out</span></button></div><div class="dfoot">`);
  return h;
};
const _moreAcct=more;
more=function(){
  const top=signedIn()?`<div class="sec"><div class="group"><div class="row plain" style="grid-template-columns:1fr auto;cursor:default"><span><span class="s">Signed in as</span><br><span class="t">${esc(ACCT.user.email||'')}</span></span><button class="link" data-signout>Sign out</button></div></div></div>`
   :`<div class="sec"><div class="signin-card"><b>Save your reps and follow people</b><span>Create a free account to keep your representatives and everyone you follow, on any device.</span><div><button class="abtn sm" data-auth="up">Create free account</button><button class="link" data-auth="in">Sign in</button></div></div></div>`;
  return _moreAcct().replace('<div class="sec" style="margin-top:16px">',top+'<div class="sec" style="margin-top:16px">');
};
const _renderAcct=render;
render=function(){
  syncTabs();
  if(!signedIn()&&S.tab==='following')S.tab='home';
  _renderAcct();
  if(!signedIn()){const tb=$('#tabbar');if(tb)tb.querySelectorAll('[data-tab="signin"]').forEach(b=>{b.removeAttribute('data-tab');b.setAttribute('data-auth','in')})}
};
acctInit();
