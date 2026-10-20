/* Live numbers: swaps the latest figures from /pulse.json into [data-live] and [data-live-block] elements.
The HTML already carries the figures from the last build, so nothing jumps if this fails. */
(function(){
  var els=document.querySelectorAll('[data-live],[data-live-block]');if(!els.length)return;
  fetch('/pulse.json').then(function(r){return r.ok?r.json():null}).then(function(d){
    if(!d)return;
    document.querySelectorAll('[data-live]').forEach(function(el){var v=d.nums&&d.nums[el.getAttribute('data-live')];if(v&&el.textContent!==v)el.textContent=v});
    document.querySelectorAll('[data-live-block]').forEach(function(el){var v=d.blocks&&d.blocks[el.getAttribute('data-live-block')];if(v&&el.innerHTML!==v)el.innerHTML=v});
  }).catch(function(){});
})();
