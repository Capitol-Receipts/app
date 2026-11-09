/* Google Analytics events: sign-ups, clicks into the app, Pro interest, quiz answers */
(function(){
  function track(n,p){try{if(typeof gtag==='function')gtag('event',n,p||{})}catch(e){}}
  window.crTrack=track;
  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('a,button');if(!a)return;
    var href=a.getAttribute('href')||'',text=(a.textContent||'').trim().slice(0,60),page=location.pathname;
    if(/app\.capitolreceipts\.com/.test(href)){
      track(/go=pro|pro/i.test(href+' '+text)?'select_promotion':'open_app',{link_text:text,page:page,promotion_id:'pro'});
    }else if(/^\/pricing/.test(href)){track('view_pricing_click',{link_text:text,page:page})}
    else if(/receipt/i.test(text)&&a.tagName==='BUTTON'&&/quiz/.test(page)){track('quiz_answer',{page:page})}
  },true);
})();
/* Sign-up forms: save to Supabase (insert only; nobody can read the list from the browser). */
(function(){
  var URL='https://hxgckcriehvrolwnabpd.supabase.co/rest/v1/signups';
  var KEY='sb_publishable_jiwF5q1sFMuaGXLKg6FKAQ_3rCjcZ1J';
  function msg(form,text,ok){
    var m=form.querySelector('.cr-msg');
    if(!m){m=document.createElement('p');m.className='cr-msg';m.setAttribute('role','status');form.appendChild(m)}
    m.style.gridColumn='1 / -1';m.style.color=ok?'inherit':'#ffd0d0';
    if(form.dataset.signup==='newsroom'&&!ok)m.style.color='#c8323a';
    m.textContent=text;
  }
  document.querySelectorAll('form[data-signup]').forEach(function(form){
    form.addEventListener('submit',function(e){
      e.preventDefault();
      var btn=form.querySelector('button[type=submit]');var fd=new FormData(form);
      var row={kind:form.dataset.signup};
      ['email','name','org','team_size','note'].forEach(function(k){var v=(fd.get(k)||'').toString().trim();if(v)row[k]=v});
      if(btn){btn.disabled=true;btn.style.opacity=.7}
      fetch(URL,{method:'POST',headers:{'apikey':KEY,'Authorization':'Bearer '+KEY,'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify(row)})
        .then(function(r){
          if(!r.ok)throw new Error(r.status);
          form.reset();
          if(window.crTrack)window.crTrack('generate_lead',{form:form.dataset.signup});
          msg(form,form.dataset.signup==='newsroom'?'Thanks! We’ll be in touch within two business days.':'You’re on the list. Watch your inbox.',true);
        })
        .catch(function(){msg(form,'That didn’t go through. Check the email address and try again.',false)})
        .then(function(){if(btn){btn.disabled=false;btn.style.opacity=''}});
    });
  });
})();
/* Menu button on smaller screens */
(function(){
  var b=document.querySelector('.menu-btn');if(!b)return;
  b.addEventListener('click',function(){var n=b.closest('nav');var o=n.classList.toggle('open');b.setAttribute('aria-expanded',o);b.textContent=o?'Close':'Menu'});
})();
