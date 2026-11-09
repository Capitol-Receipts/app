/* ================= Sign in with Apple and Google =================
Website: Supabase's own Apple and Google sign-in pages (signInWithOAuth), back to the app signed in.
iPhone app: the native Apple and Google sheets (@capgo/capacitor-social-login), whose ID token Supabase accepts with
signInWithIdToken. After an Apple sign-in in the app, its one-time code goes to the 'apple-token' function so
"Delete my account" can revoke it with Apple.
Each button shows only when that provider is switched on in Supabase (Authentication › Providers). In the app, Google
also needs its iOS client ID below, and Apple is always offered next to Google, as the App Store requires. */
const SOC={apple:false,google:false,inited:false};
// Google OAuth client IDs (public by design; set when the Google Cloud project exists)
const GOOGLE_WEB_CLIENT_ID='37666810110-kd1vc52i3qpeq1rt3gkba3rmhrfqm07h.apps.googleusercontent.com';
const GOOGLE_IOS_CLIENT_ID='37666810110-g2jmvu9tfn58qr1hhb448mvghmefce2j.apps.googleusercontent.com';
const APPLE_ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.37 12.6c-.02-2.1 1.72-3.11 1.8-3.16-.98-1.43-2.5-1.63-3.04-1.65-1.29-.13-2.52.76-3.18.76-.66 0-1.67-.74-2.75-.72-1.41.02-2.72.82-3.45 2.09-1.47 2.55-.38 6.32 1.06 8.39.7 1.01 1.53 2.15 2.62 2.11 1.05-.04 1.45-.68 2.72-.68 1.27 0 1.63.68 2.74.66 1.13-.02 1.85-1.03 2.54-2.05.8-1.17 1.13-2.31 1.15-2.37-.03-.01-2.2-.84-2.21-3.38ZM14.29 6.44c.58-.7.97-1.68.86-2.65-.83.03-1.84.55-2.44 1.25-.53.62-1 1.61-.88 2.56.93.07 1.88-.47 2.46-1.16Z"/></svg>';
const GOOGLE_ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.56-5.17 3.56-8.81Z"/><path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3.01c-1.07.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.95H1.27v3.11A12 12 0 0 0 12 24Z"/><path fill="#FBBC05" d="M5.28 14.28A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.38-2.28V6.61H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.39l4.01-3.11Z"/><path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.61l4.01 3.11C6.22 6.88 8.87 4.77 12 4.77Z"/></svg>';
fetch(SB.url+'/auth/v1/settings',{headers:{apikey:SB.key}}).then(r=>r.json()).then(s=>{const x=(s&&s.external)||{};SOC.apple=!!x.apple;SOC.google=!!x.google}).catch(()=>{});
const socNative=()=>typeof NATIVE!=='undefined'&&NATIVE;
function socShow(){
  // Android: Google only (Apple sign-in isn't required on Google Play); iPhone: Google only next to Apple (App Store rule 4.8)
  const droid=socNative()&&typeof ANDROID!=='undefined'&&ANDROID;
  const apple=SOC.apple&&!droid,google=SOC.google&&(!socNative()||(droid?!!GOOGLE_WEB_CLIENT_ID:(GOOGLE_IOS_CLIENT_ID&&SOC.apple)));
  return {apple,google};
}
const _authSheetSoc=authSheet;
authSheet=function(mode,reason){
  _authSheetSoc(mode,reason);
  if(mode==='reset')return;
  const {apple,google}=socShow();if(!apple&&!google)return;
  const f=$('#authform');if(!f)return;
  const why=f.querySelector('.authwhy');
  const html=`<div class="socbtns">${apple?`<button type="button" class="socbtn soc-apple" data-soc="apple">${APPLE_ICON}<span>Continue with Apple</span></button>`:''}${google?`<button type="button" class="socbtn soc-google" data-soc="google">${GOOGLE_ICON}<span>Continue with Google</span></button>`:''}</div><div class="socor"><span>or use your email</span></div>`;
  if(why)why.insertAdjacentHTML('afterend',html);else f.insertAdjacentHTML('afterbegin',html);
};
const rnd=()=>{const a=new Uint8Array(32);crypto.getRandomValues(a);return [...a].map(b=>b.toString(16).padStart(2,'0')).join('')};
const sha256=async s=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(b=>b.toString(16).padStart(2,'0')).join('');
async function socNativeLogin(provider){
  const SL=plug('SocialLogin');if(!SL)throw new Error('unavailable');
  if(!SOC.inited&&typeof ANDROID!=='undefined'&&ANDROID){await SL.initialize({google:{webClientId:GOOGLE_WEB_CLIENT_ID,mode:'online'}});SOC.inited=true}
  if(!SOC.inited){await SL.initialize({apple:{clientId:'com.capitolreceipts.app',redirectUrl:''},...(GOOGLE_IOS_CLIENT_ID?{google:{iOSClientId:GOOGLE_IOS_CLIENT_ID,iOSServerClientId:GOOGLE_WEB_CLIENT_ID||undefined,mode:'online'}}:{})});SOC.inited=true}
  const raw=rnd(),hashed=await sha256(raw);
  const r=await SL.login({provider,options:provider==='apple'?{scopes:['email','name'],nonce:hashed}:{scopes:['email','profile'],nonce:hashed}});
  const res=r&&r.result||{};
  const token=res.idToken;if(!token)throw new Error('no token');
  const {error}=await ACCT.client.auth.signInWithIdToken({provider,token,nonce:raw});
  if(error)throw error;
  // Apple shares a name only the first time; keep it on the account
  const nm=res.profile&&[res.profile.givenName,res.profile.familyName].filter(Boolean).join(' ');
  if(nm)ACCT.client.auth.updateUser({data:{full_name:nm}}).catch(()=>{});
  if(provider==='apple'){const code=res.authorizationCode||(res.accessToken&&res.accessToken.token);
    if(code)try{const {data:{session}}=await ACCT.client.auth.getSession();
      fetch(SB.url+'/functions/v1/apple-token',{method:'POST',headers:{'Content-Type':'application/json',apikey:SB.key,Authorization:'Bearer '+session.access_token},body:JSON.stringify({code,client_id:'com.capitolreceipts.app'})}).catch(()=>{})}catch(e){}}
}
async function socLogin(provider,btn){
  const msg=$('#amsg');const say=t=>{if(msg){msg.textContent=t;msg.className='amsg'}};
  if(!ACCT.client)return say('Sign-in isn’t available right now. Try again in a moment.');
  if(btn)btn.disabled=true;
  try{
    if(socNative()){await socNativeLogin(provider);track('login',{method:provider});$('#sheet').hidden=true;return}
    track('login_start',{method:provider});
    const back=location.origin+location.pathname+(location.search||'');
    const {error}=await ACCT.client.auth.signInWithOAuth({provider,options:{redirectTo:back}});
    if(error)throw error; // otherwise the page goes to Apple or Google and comes back signed in
  }catch(e){
    const m=String((e&&(e.message||e.code))||e);
    if(!/cancel/i.test(m))say(`Couldn’t sign in with ${provider==='apple'?'Apple':'Google'}. Try again, or use your email.`);
  }finally{if(btn)btn.disabled=false}
}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-soc]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();socLogin(b.dataset.soc,b)},true);
document.head.insertAdjacentHTML('beforeend',`<style>
.socbtns{display:grid;gap:10px;margin:4px 0 6px}
.socbtn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;min-height:48px;border-radius:12px;font:inherit;font-weight:650;font-size:17px;cursor:pointer;padding:0 16px}
.socbtn svg{width:20px;height:20px;flex:none}
.soc-apple{background:#000;color:#fff;border:1px solid #000}
.soc-google{background:#fff;color:#1f1f1f;border:1px solid #dadce0}
@media (prefers-color-scheme:dark){.soc-apple{background:#fff;color:#000;border-color:#fff}}
.socbtn:disabled{opacity:.6}
.socor{display:flex;align-items:center;gap:10px;margin:12px 0 4px;color:var(--soft,#6b7280);font-size:14px}
.socor::before,.socor::after{content:"";flex:1;height:1px;background:var(--line,#e3e6ec)}
</style>`);
