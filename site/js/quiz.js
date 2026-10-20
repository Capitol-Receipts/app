/* Quiz: tap an answer to see if it's right, then share your score. */
(function(){
  var cards=document.querySelectorAll('[data-quiz-q]');if(!cards.length)return;
  var done=0,right=0,total=cards.length,box=document.getElementById('quiz-score');
  function track(n,p){try{if(typeof gtag==='function')gtag('event',n,p||{})}catch(e){}}
  cards.forEach(function(card){
    var opts=card.querySelectorAll('[data-quiz-opt]');
    opts.forEach(function(o){
      o.setAttribute('role','button');o.setAttribute('tabindex','0');o.style.cursor='pointer';
      function pick(e){
        if(card.hasAttribute('data-answered'))return;
        e.preventDefault();e.stopPropagation();
        card.setAttribute('data-answered','');done++;
        var ok=o.hasAttribute('data-ok');if(ok)right++;
        opts.forEach(function(x){
          if(x.hasAttribute('data-ok')){x.style.borderColor='#1f8a4c';x.style.background='#e6f6ec'}
          else if(x===o){x.style.borderColor='#c8323a';x.style.background='#fdeaea'}
          x.style.cursor='default';x.removeAttribute('tabindex');
        });
        var d=card.querySelector('details');if(d)d.open=true;
        track('quiz_answer',{question:card.getAttribute('data-quiz-q'),correct:ok});
        if(done===total)finish();
      }
      o.addEventListener('click',pick,true);
      o.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' ')pick(e)});
    });
  });
  function finish(){
    if(!box)return;
    var url='https://www.capitolreceipts.com/quiz/score/'+right;
    var text='I got '+right+' of '+total+' on the Congress quiz from Capitol Receipts. How many can you get?';
    box.querySelector('[data-score]').textContent=right+' of '+total;
    box.querySelector('[data-x]').href='https://x.com/intent/post?text='+encodeURIComponent(text)+'&url='+encodeURIComponent(url);
    box.querySelector('[data-fb]').href='https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(url);
    var b=box.querySelector('[data-share]');
    b.onclick=function(){
      if(navigator.share){navigator.share({title:'Congress quiz',text:text,url:url}).catch(function(){});return}
      (navigator.clipboard?navigator.clipboard.writeText(text+' '+url):Promise.reject()).then(function(){b.textContent='Link copied'}).catch(function(){prompt('Copy this link',url)});
    };
    box.hidden=false;box.scrollIntoView({behavior:'smooth',block:'center'});
    track('quiz_complete',{score:right});
  }
})();
